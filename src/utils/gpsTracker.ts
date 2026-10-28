// High-Precision Robust GPS Telemetry & Progressive Multi-Tier Positioning Engine
// Crafted for mission-critical real-time crowd safety, field operations, and mobile devices.

export interface GpsTelemetryFix {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number; // In meters
  speed?: number; // In km/h
  heading?: number; // 0-359 degrees
  timestamp: number;
  source: "high_accuracy_gnss" | "standard_gps" | "ip_network" | "cached_last_known";
  statusText?: string;
}

export type GpsEngineStatus =
  | "idle"
  | "acquiring"
  | "high_accuracy_locked"
  | "standard_locked"
  | "cached"
  | "network_ip"
  | "permission_denied"
  | "unavailable";

export type GpsFixCallback = (fix: GpsTelemetryFix) => void;
export type GpsStatusCallback = (status: GpsEngineStatus, message: string) => void;

// Inaudible Audio Keep-Alive for continuous background execution on iOS Safari & Android Chrome
class BackgroundAudioKeepAlive {
  private audioCtx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isRunning: boolean = false;

  public start(): void {
    if (this.isRunning || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = new AudioCtx();
      this.osc = this.audioCtx.createOscillator();
      this.gain = this.audioCtx.createGain();
      // Near-zero inaudible volume to keep browser engine active in background
      this.gain.gain.value = 0.00001;
      this.osc.frequency.value = 25; // 25Hz inaudible sub-bass
      this.osc.connect(this.gain);
      this.gain.connect(this.audioCtx.destination);
      this.osc.start();
      this.isRunning = true;
    } catch (e) {
      console.warn("Background audio keep-alive note:", e);
    }
  }

  public stop(): void {
    if (!this.isRunning) return;
    try {
      this.osc?.stop();
      this.osc?.disconnect();
      this.gain?.disconnect();
      this.audioCtx?.close();
    } catch (_) {}
    this.isRunning = false;
  }
}

class GpsEngine {
  private watchId: number | null = null;
  private lastFix: GpsTelemetryFix | null = null;
  private fixCallbacks: Set<GpsFixCallback> = new Set();
  private statusCallbacks: Set<GpsStatusCallback> = new Set();
  private currentStatus: GpsEngineStatus = "idle";
  private isWatching = false;
  private lastStatusMessage: string = "GPS initialized";
  private retryUpgradeTimer: any = null;
  private backgroundAudio = new BackgroundAudioKeepAlive();
  private backgroundHeartbeatTimer: any = null;
  private activeUserId: string | null = null;

  constructor() {
    this.hydrateFromStorage();
    this.listenToPermissionChanges();
    this.startBackgroundHeartbeat();
  }

  public setUserId(id: string | null): void {
    this.activeUserId = id;
    if (id && typeof window !== "undefined") {
      try {
        localStorage.setItem("crowd_user_id", id);
      } catch (_) {}
    }
  }

  private startBackgroundHeartbeat(): void {
    if (typeof window === "undefined") return;
    if (this.backgroundHeartbeatTimer) clearInterval(this.backgroundHeartbeatTimer);
    this.backgroundHeartbeatTimer = setInterval(() => {
      if (document.visibilityState === "hidden" && this.lastFix) {
        this.transmitBackgroundPing(this.lastFix);
      }
    }, 25000);
  }

  /**
   * Hydrates the last known position from localStorage for instant 0-latency map rendering
   */
  private hydrateFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem("last_known_gps_fix");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
          this.lastFix = {
            ...parsed,
            source: "cached_last_known",
            statusText: "Loaded from device cache",
          };
          this.currentStatus = "cached";
        }
      }
    } catch (_) {}
  }

  /**
   * Monitor browser/WebView permission state changes
   */
  private listenToPermissionChanges(): void {
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions.query({ name: "geolocation" as PermissionName }).then((permissionStatus) => {
          permissionStatus.onchange = () => {
            if (permissionStatus.state === "granted") {
              this.requestDirectFix();
            } else if (permissionStatus.state === "denied") {
              this.setStatus("permission_denied", "Location permission denied in browser or system settings.");
            }
          };
        }).catch(() => {});
      } catch (_) {}
    }
  }

  public subscribe(onFix: GpsFixCallback, onStatus?: GpsStatusCallback): () => void {
    this.fixCallbacks.add(onFix);
    if (onStatus) {
      this.statusCallbacks.add(onStatus);
      onStatus(this.currentStatus, this.lastStatusMessage);
    }

    // Immediately replay cached or last known fix to new subscriber
    if (this.lastFix) {
      onFix(this.lastFix);
    }

    return () => {
      this.fixCallbacks.delete(onFix);
      if (onStatus) this.statusCallbacks.delete(onStatus);
    };
  }

  private setStatus(status: GpsEngineStatus, message: string): void {
    this.currentStatus = status;
    this.lastStatusMessage = message;
    this.statusCallbacks.forEach((cb) => cb(status, message));
  }

  private emitFix(fix: GpsTelemetryFix): void {
    // Coordinate filter: discard non-finite or impossible values
    if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return;
    if (fix.lat < -90 || fix.lat > 90 || fix.lng < -180 || fix.lng > 180) return;

    // Stationary smoothing filter: suppress micro-jitter when not moving
    let smoothedFix = { ...fix };
    if (this.lastFix && fix.accuracy && fix.accuracy > 5) {
      const distanceMovedMeters = this.calculateDistanceKm(
        this.lastFix.lat,
        this.lastFix.lng,
        fix.lat,
        fix.lng
      ) * 1000;

      // If moved less than 3 meters and speed is near zero, damp jitter
      if (distanceMovedMeters < 3 && (!fix.speed || fix.speed < 1.0)) {
        smoothedFix.lat = this.lastFix.lat * 0.75 + fix.lat * 0.25;
        smoothedFix.lng = this.lastFix.lng * 0.75 + fix.lng * 0.25;
      }
    }

    this.lastFix = smoothedFix;

    // Cache locally
    try {
      localStorage.setItem("last_known_gps_fix", JSON.stringify(smoothedFix));
    } catch (_) {}

    this.fixCallbacks.forEach((cb) => cb(smoothedFix));

    // Direct background continuous transmission (works while phone is locked or app is in pocket)
    this.transmitBackgroundPing(smoothedFix);
  }

  private transmitBackgroundPing(fix: GpsTelemetryFix): void {
    if (typeof window === "undefined") return;
    try {
      const targetUid = this.activeUserId || localStorage.getItem("crowd_user_id");
      if (!targetUid) return;

      const payload = JSON.stringify({
        userId: targetUid,
        lat: fix.lat,
        lng: fix.lng,
        altitude: fix.altitude,
        accuracy: fix.accuracy,
        speed: fix.speed,
        heading: fix.heading,
        movementStatus: (fix.speed || 0) > 12 ? "running" : (fix.speed || 0) > 2 ? "walking" : "stationary",
        timestamp: fix.timestamp,
      });

      // Transmit to background endpoint with keepalive: true so browser delivers it even if screen is off
      fetch("/api/gps/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        if ("sendBeacon" in navigator) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/gps/beacon", blob);
        }
      });
    } catch (_) {}
  }

  public getLastFix(): GpsTelemetryFix | null {
    return this.lastFix;
  }

  public getStatus(): { status: GpsEngineStatus; message: string } {
    return { status: this.currentStatus, message: this.lastStatusMessage };
  }

  /**
   * Progressive Multi-Tier Direct Fix:
   * Tier 1: Instant Cache (already active)
   * Tier 2: Fast Coarse Network/WiFi fix (<1s)
   * Tier 3: High Precision Satellite Lock (<10s)
   * Tier 4: Server IP Geolocation fallback
   */
  public async requestDirectFix(): Promise<GpsTelemetryFix | null> {
    this.setStatus("acquiring", "Establishing precision GPS fix...");

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      this.setStatus("unavailable", "HTML5 Geolocation not supported. Querying network location...");
      return this.fetchNetworkIpLocation();
    }

    // Step A: Fast coarse fix (WiFi / Cell towers) to get coordinates in <1.5s
    try {
      const coarseFix = await this.queryPositionPromise({
        enableHighAccuracy: false,
        timeout: 3500,
        maximumAge: 30000,
      });
      coarseFix.source = "standard_gps";
      coarseFix.statusText = `Standard Lock (±${Math.round(coarseFix.accuracy || 25)}m)`;
      this.setStatus("standard_locked", `Network fix acquired (±${Math.round(coarseFix.accuracy || 25)}m)`);
      this.emitFix(coarseFix);
    } catch (_) {
      // Coarse failed or timed out, proceed directly to high accuracy
    }

    // Step B: High-Accuracy GNSS/Satellite lock
    try {
      const satelliteFix = await this.queryPositionPromise({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      satelliteFix.source = "high_accuracy_gnss";
      satelliteFix.statusText = `High Precision Satellite Lock (±${Math.round(satelliteFix.accuracy || 4)}m)`;
      this.setStatus("high_accuracy_locked", `Satellite locked (±${Math.round(satelliteFix.accuracy || 4)}m)`);
      this.emitFix(satelliteFix);
      return satelliteFix;
    } catch (highErr: any) {
      if (highErr?.code === 1) {
        // PERMISSION_DENIED
        this.setStatus("permission_denied", "Location permission denied. Please allow location access.");
        return this.fetchNetworkIpLocation();
      }
      // If we already have a fix from Step A or cache, retain it
      if (this.lastFix && this.lastFix.source !== "cached_last_known") {
        return this.lastFix;
      }
    }

    // Step C: Fallback to server-side / public IP Geolocation
    return this.fetchNetworkIpLocation();
  }

  private queryPositionPromise(options: PositionOptions): Promise<GpsTelemetryFix> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!pos || !pos.coords) return reject(new Error("Empty coordinate payload"));
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return reject(new Error("Non-finite coordinates"));
          }

          let speed = pos.coords.speed !== null && Number.isFinite(pos.coords.speed) ? pos.coords.speed * 3.6 : undefined;
          let heading = pos.coords.heading !== null && Number.isFinite(pos.coords.heading) ? pos.coords.heading : undefined;

          // Estimate speed & heading if walking/driving and previous fix exists
          if (this.lastFix) {
            const timeDeltaSec = (pos.timestamp - this.lastFix.timestamp) / 1000;
            if (timeDeltaSec > 1 && timeDeltaSec < 45) {
              const distKm = this.calculateDistanceKm(this.lastFix.lat, this.lastFix.lng, lat, lng);
              if (speed === undefined) {
                speed = Math.min(130, (distKm / timeDeltaSec) * 3600);
              }
              if (heading === undefined && (speed || 0) > 2) {
                heading = this.calculateBearing(this.lastFix.lat, this.lastFix.lng, lat, lng);
              }
            }
          }

          const fix: GpsTelemetryFix = {
            lat,
            lng,
            altitude: pos.coords.altitude !== null && Number.isFinite(pos.coords.altitude) ? Math.round(pos.coords.altitude) : undefined,
            accuracy: pos.coords.accuracy !== null && Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy * 10) / 10 : undefined,
            speed: speed !== undefined ? Math.round(speed * 10) / 10 : undefined,
            heading: heading !== undefined ? Math.round(heading) : undefined,
            timestamp: pos.timestamp || Date.now(),
            source: options.enableHighAccuracy ? "high_accuracy_gnss" : "standard_gps",
          };

          resolve(fix);
        },
        (err) => reject(err),
        options
      );
    });
  }

  /**
   * Continuous background real-time GPS tracking with auto-recovery and graceful degradation
   */
  public startContinuousWatching(): void {
    if (this.isWatching) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    this.isWatching = true;
    this.setStatus("acquiring", "Live continuous positioning active");

    // Maintain background audio context so mobile OS does not pause geolocation when screen sleeps
    this.backgroundAudio.start();

    const launchWatcher = (highAccuracy: boolean) => {
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!pos || !pos.coords) return;
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          let speed = pos.coords.speed !== null && Number.isFinite(pos.coords.speed) ? pos.coords.speed * 3.6 : undefined;
          let heading = pos.coords.heading !== null && Number.isFinite(pos.coords.heading) ? pos.coords.heading : undefined;

          if (this.lastFix) {
            const timeDeltaSec = (pos.timestamp - this.lastFix.timestamp) / 1000;
            if (timeDeltaSec > 1 && timeDeltaSec < 45) {
              const distKm = this.calculateDistanceKm(this.lastFix.lat, this.lastFix.lng, lat, lng);
              if (speed === undefined) {
                speed = Math.min(130, (distKm / timeDeltaSec) * 3600);
              }
              if (heading === undefined && (speed || 0) > 1.5) {
                heading = this.calculateBearing(this.lastFix.lat, this.lastFix.lng, lat, lng);
              }
            }
          }

          const fix: GpsTelemetryFix = {
            lat,
            lng,
            altitude: pos.coords.altitude !== null && Number.isFinite(pos.coords.altitude) ? Math.round(pos.coords.altitude) : undefined,
            accuracy: pos.coords.accuracy !== null && Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy * 10) / 10 : undefined,
            speed: speed !== undefined ? Math.round(speed * 10) / 10 : undefined,
            heading: heading !== undefined ? Math.round(heading) : undefined,
            timestamp: pos.timestamp || Date.now(),
            source: highAccuracy ? "high_accuracy_gnss" : "standard_gps",
            statusText: highAccuracy ? "High-Accuracy GNSS Lock" : "Cellular/WiFi Position",
          };

          this.setStatus(
            highAccuracy ? "high_accuracy_locked" : "standard_locked",
            `Active telemetry (±${fix.accuracy || 10}m)`
          );
          this.emitFix(fix);
        },
        (err) => {
          if (err.code === 1) {
            this.setStatus("permission_denied", "Location permission denied in device settings.");
            this.stopContinuousWatching();
            this.fetchNetworkIpLocation();
          } else if (highAccuracy) {
            // High accuracy failed or timed out (e.g. indoors); gracefully degrade to standard accuracy
            this.setStatus("standard_locked", "Satellite signal weak. Switching to cellular/WiFi positioning.");
            launchWatcher(false);

            // Periodically attempt to re-upgrade to high-accuracy
            if (!this.retryUpgradeTimer) {
              this.retryUpgradeTimer = setTimeout(() => {
                this.retryUpgradeTimer = null;
                if (this.isWatching) launchWatcher(true);
              }, 30000);
            }
          } else {
            this.setStatus("unavailable", "GPS telemetry signal lost. Retrying...");
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: highAccuracy ? 1000 : 8000,
          timeout: highAccuracy ? 12000 : 20000,
        }
      );
    };

    launchWatcher(true);
  }

  public stopContinuousWatching(): void {
    this.backgroundAudio.stop();
    if (this.watchId !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.retryUpgradeTimer) {
      clearTimeout(this.retryUpgradeTimer);
      this.retryUpgradeTimer = null;
    }
    this.isWatching = false;
  }

  /**
   * Resilient IP Geolocation fallback:
   * First tries local server proxy /api/geo/ip-lookup (no CORS, works everywhere)
   * Fallback to direct public ipwho.is
   */
  private async fetchNetworkIpLocation(): Promise<GpsTelemetryFix | null> {
    try {
      this.setStatus("network_ip", "Resolving network location...");

      // Attempt 1: Server proxy
      try {
        const serverRes = await fetch("/api/geo/ip-lookup", { cache: "no-store" });
        if (serverRes.ok) {
          const sData = await serverRes.json();
          if (sData.success && Number.isFinite(sData.latitude) && Number.isFinite(sData.longitude)) {
            const fix: GpsTelemetryFix = {
              lat: sData.latitude,
              lng: sData.longitude,
              accuracy: 3500,
              timestamp: Date.now(),
              source: "ip_network",
              statusText: `Approximate: ${sData.city || "Network Region"}`,
            };
            this.setStatus("network_ip", `Network location: ${sData.city || "Approximate"}`);
            this.emitFix(fix);
            return fix;
          }
        }
      } catch (_) {}

      // Attempt 2: Direct public provider
      const pubRes = await fetch("https://ipwho.is/", { cache: "no-store" });
      if (pubRes.ok) {
        const pData = await pubRes.json();
        if (pData.success && Number.isFinite(pData.latitude) && Number.isFinite(pData.longitude)) {
          const fix: GpsTelemetryFix = {
            lat: pData.latitude,
            lng: pData.longitude,
            accuracy: 4500,
            timestamp: Date.now(),
            source: "ip_network",
            statusText: `Approximate: ${pData.city || pData.region || "Network"}`,
          };
          this.setStatus("network_ip", `Network location: ${pData.city || "Approximate"}`);
          this.emitFix(fix);
          return fix;
        }
      }
    } catch (e) {
      console.warn("[GPS] Network location lookup failed:", e);
    }
    return null;
  }

  // WGS-84 Great-Circle Haversine distance in kilometers
  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Initial azimuth bearing from point A to point B in degrees (0-360)
  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }
}

export const gpsEngine = new GpsEngine();
