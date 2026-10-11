// High-Precision Robust GPS Telemetry & Fallback Engine

export interface GpsTelemetryFix {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  speed?: number; // km/h
  heading?: number; // 0-359 deg
  timestamp: number;
  source: "high_accuracy_gps" | "standard_gps" | "ip_fallback" | "cached_last_known";
}

type GpsCallback = (fix: GpsTelemetryFix) => void;
type GpsStatusCallback = (status: "acquiring" | "active" | "denied" | "unavailable" | "fallback", message?: string) => void;

class GpsEngine {
  private watchId: number | null = null;
  private lastFix: GpsTelemetryFix | null = null;
  private fixCallbacks: Set<GpsCallback> = new Set();
  private statusCallbacks: Set<GpsStatusCallback> = new Set();
  private isWatching = false;
  private isHighAccuracy = true;
  private permissionState: PermissionState | "unknown" = "unknown";

  constructor() {
    // Load last known fix from cache
    try {
      const cached = localStorage.getItem("last_known_gps_fix");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
          this.lastFix = {
            ...parsed,
            source: "cached_last_known",
          };
        }
      }
    } catch (_) {}

    // Check Permissions API if available
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
          this.permissionState = status.state;
          status.onchange = () => {
            this.permissionState = status.state;
            if (status.state === "granted") {
              this.requestDirectFix();
            } else if (status.state === "denied") {
              this.notifyStatus("denied", "Location permission denied in browser settings.");
            }
          };
        }).catch(() => {});
      } catch (_) {}
    }
  }

  public subscribe(onFix: GpsCallback, onStatus?: GpsStatusCallback) {
    this.fixCallbacks.add(onFix);
    if (onStatus) this.statusCallbacks.add(onStatus);

    if (this.lastFix) {
      onFix(this.lastFix);
    }

    return () => {
      this.fixCallbacks.delete(onFix);
      if (onStatus) this.statusCallbacks.delete(onStatus);
    };
  }

  private notifyFix(fix: GpsTelemetryFix) {
    this.lastFix = fix;
    try {
      localStorage.setItem("last_known_gps_fix", JSON.stringify(fix));
    } catch (_) {}
    this.fixCallbacks.forEach((cb) => cb(fix));
  }

  private notifyStatus(status: "acquiring" | "active" | "denied" | "unavailable" | "fallback", message?: string) {
    this.statusCallbacks.forEach((cb) => cb(status, message));
  }

  public getLastFix(): GpsTelemetryFix | null {
    return this.lastFix;
  }

  /**
   * Request an immediate direct location fix using progressive multi-stage fallback.
   */
  public async requestDirectFix(): Promise<GpsTelemetryFix | null> {
    this.notifyStatus("acquiring", "Acquiring direct GPS lock...");

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      this.notifyStatus("unavailable", "Geolocation API not supported by this browser.");
      return this.fallbackIpLocation();
    }

    // Step 1: High Accuracy attempt
    try {
      const highAccFix = await this.getCurrentPositionPromise({
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 0,
      });
      this.notifyStatus("active", "High-accuracy GPS fix acquired");
      this.notifyFix(highAccFix);
      return highAccFix;
    } catch (highErr: any) {
      console.warn("[GPS] High-accuracy lock failed, trying standard fallback:", highErr?.message);
    }

    // Step 2: Standard Accuracy attempt (WiFi / Cellular / Cached GPS)
    try {
      const standardFix = await this.getCurrentPositionPromise({
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 30000,
      });
      this.notifyStatus("active", "Standard GPS fix acquired");
      this.notifyFix(standardFix);
      return standardFix;
    } catch (stdErr: any) {
      console.warn("[GPS] Standard geolocation failed:", stdErr?.message);
      if (stdErr?.code === 1) {
        // PERMISSION_DENIED
        this.notifyStatus("denied", "Location permission was denied. Please allow location access in your browser bar.");
      } else {
        this.notifyStatus("unavailable", "Device GPS signal unavailable. Using IP approximation.");
      }
    }

    // Step 3: IP Geolocation Fallback
    return this.fallbackIpLocation();
  }

  private getCurrentPositionPromise(options: PositionOptions): Promise<GpsTelemetryFix> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!pos || !pos.coords) {
            return reject(new Error("Empty position"));
          }
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return reject(new Error("Non-finite coordinates received"));
          }

          // Calculate speed in km/h if available, otherwise compute from last fix
          let speed: number | undefined = undefined;
          if (pos.coords.speed !== null && Number.isFinite(pos.coords.speed)) {
            speed = Math.max(0, pos.coords.speed * 3.6);
          } else if (this.lastFix) {
            const timeDeltaSec = (pos.timestamp - this.lastFix.timestamp) / 1000;
            if (timeDeltaSec > 1 && timeDeltaSec < 60) {
              const distKm = this.calculateDistanceKm(this.lastFix.lat, this.lastFix.lng, lat, lng);
              speed = Math.min(120, (distKm / timeDeltaSec) * 3600);
            }
          }

          // Calculate heading
          let heading: number | undefined = undefined;
          if (pos.coords.heading !== null && Number.isFinite(pos.coords.heading)) {
            heading = pos.coords.heading;
          } else if (this.lastFix && speed && speed > 1.5) {
            heading = this.calculateBearing(this.lastFix.lat, this.lastFix.lng, lat, lng);
          }

          const fix: GpsTelemetryFix = {
            lat,
            lng,
            altitude: pos.coords.altitude !== null && Number.isFinite(pos.coords.altitude) ? pos.coords.altitude : undefined,
            accuracy: pos.coords.accuracy !== null && Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : undefined,
            speed: speed !== undefined ? Math.round(speed * 10) / 10 : undefined,
            heading: heading !== undefined ? Math.round(heading) : undefined,
            timestamp: pos.timestamp || Date.now(),
            source: options.enableHighAccuracy ? "high_accuracy_gps" : "standard_gps",
          };

          resolve(fix);
        },
        (err) => reject(err),
        options
      );
    });
  }

  /**
   * Continuous background GPS watcher with automatic error recovery
   */
  public startContinuousWatching(): void {
    if (this.isWatching) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    this.isWatching = true;
    this.notifyStatus("acquiring", "Starting real-time continuous GPS tracking...");

    const startWatcher = (useHighAcc: boolean) => {
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      this.isHighAccuracy = useHighAcc;
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!pos || !pos.coords) return;
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          let speed: number | undefined = undefined;
          if (pos.coords.speed !== null && Number.isFinite(pos.coords.speed)) {
            speed = Math.max(0, pos.coords.speed * 3.6);
          } else if (this.lastFix) {
            const timeDeltaSec = (pos.timestamp - this.lastFix.timestamp) / 1000;
            if (timeDeltaSec > 1 && timeDeltaSec < 60) {
              const distKm = this.calculateDistanceKm(this.lastFix.lat, this.lastFix.lng, lat, lng);
              speed = Math.min(120, (distKm / timeDeltaSec) * 3600);
            }
          }

          let heading: number | undefined = undefined;
          if (pos.coords.heading !== null && Number.isFinite(pos.coords.heading)) {
            heading = pos.coords.heading;
          } else if (this.lastFix && speed && speed > 1.5) {
            heading = this.calculateBearing(this.lastFix.lat, this.lastFix.lng, lat, lng);
          }

          const fix: GpsTelemetryFix = {
            lat,
            lng,
            altitude: pos.coords.altitude !== null && Number.isFinite(pos.coords.altitude) ? pos.coords.altitude : undefined,
            accuracy: pos.coords.accuracy !== null && Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : undefined,
            speed: speed !== undefined ? Math.round(speed * 10) / 10 : undefined,
            heading: heading !== undefined ? Math.round(heading) : undefined,
            timestamp: pos.timestamp || Date.now(),
            source: useHighAcc ? "high_accuracy_gps" : "standard_gps",
          };

          this.notifyStatus("active", "Live GPS Telemetry Active");
          this.notifyFix(fix);
        },
        (err) => {
          console.warn(`[GPS Watcher] error (highAcc=${useHighAcc}):`, err.message);
          if (err.code === 1) {
            this.notifyStatus("denied", "Location permission was denied.");
          } else if (useHighAcc) {
            // Gracefully downgrade to standard accuracy watcher
            setTimeout(() => startWatcher(false), 2000);
          } else {
            this.notifyStatus("unavailable", "Live GPS signal weak.");
          }
        },
        {
          enableHighAccuracy: useHighAcc,
          maximumAge: useHighAcc ? 1500 : 10000,
          timeout: useHighAcc ? 10000 : 20000,
        }
      );
    };

    startWatcher(true);
  }

  public stopContinuousWatching(): void {
    if (this.watchId !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
  }

  /**
   * IP Geolocation fallback when GPS is not allowed or unavailable
   */
  private async fallbackIpLocation(): Promise<GpsTelemetryFix | null> {
    try {
      this.notifyStatus("fallback", "Retrieving network location approximation...");
      const res = await fetch("https://ipwho.is/", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
          const fix: GpsTelemetryFix = {
            lat: data.latitude,
            lng: data.longitude,
            accuracy: 5000,
            timestamp: Date.now(),
            source: "ip_fallback",
          };
          this.notifyFix(fix);
          this.notifyStatus("fallback", `Approximate Network Location: ${data.city || data.region || "Detected"}`);
          return fix;
        }
      }
    } catch (e) {
      console.warn("[GPS] IP fallback failed:", e);
    }
    return null;
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360;
  }
}

export const gpsEngine = new GpsEngine();
