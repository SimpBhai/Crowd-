// Real OSRM Routing Engine Utility for Turn-by-Turn Navigation

export interface RouteStep {
  instruction: string;
  distance: number; // in meters
  duration: number; // in seconds
  name: string;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] array for Leaflet polyline
  distance: number; // total distance in meters
  duration: number; // total duration in seconds
  steps: RouteStep[];
}

export async function fetchRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult | null> {
  if (
    !Number.isFinite(startLat) ||
    !Number.isFinite(startLng) ||
    !Number.isFinite(endLat) ||
    !Number.isFinite(endLng)
  ) {
    return null;
  }

  try {
    // OSRM requires coords in lng,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    // GeoJSON coordinates are [lng, lat], Leaflet needs [lat, lng]
    const rawCoords = route.geometry?.coordinates;
    if (!Array.isArray(rawCoords)) return null;

    const coordinates: [number, number][] = rawCoords
      .filter((coord: any) => Array.isArray(coord) && coord.length >= 2 && Number.isFinite(coord[0]) && Number.isFinite(coord[1]))
      .map((coord: [number, number]) => [coord[1], coord[0]]);

    if (coordinates.length === 0) return null;

    const steps: RouteStep[] = [];
    if (route.legs && route.legs[0]?.steps) {
      route.legs[0].steps.forEach((st: any) => {
        let instruction = st.maneuver?.type || "proceed";
        if (st.maneuver?.modifier) instruction += ` ${st.maneuver.modifier}`;
        if (st.name) instruction += ` onto ${st.name}`;
        
        steps.push({
          instruction: capitalize(instruction),
          distance: st.distance || 0,
          duration: st.duration || 0,
          name: st.name || "",
        });
      });
    }

    return {
      coordinates,
      distance: route.distance,
      duration: route.duration,
      steps,
    };
  } catch (err) {
    console.warn("Route calculation error:", err);
    return null;
  }
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours} hr ${remainingMins} min`;
}
