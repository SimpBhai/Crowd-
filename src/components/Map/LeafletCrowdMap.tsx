import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { UserRecord, FilterOptions } from "../../types";
import { Locate, Navigation, Layers, Phone, MessageSquare, AlertTriangle } from "lucide-react";

interface LeafletCrowdMapProps {
  users: UserRecord[];
  currentUser: UserRecord | null;
  selectedUser: UserRecord | null;
  onSelectUser: (user: UserRecord) => void;
  filters: FilterOptions;
  isSimulatingMovement: boolean;
  onToggleSimulatedMovement: () => void;
  onCenterOnUser: () => void;
  onStartCall: (user: UserRecord) => void;
  onStartChat: (user: UserRecord) => void;
}

export const LeafletCrowdMap: React.FC<LeafletCrowdMapProps> = ({
  users,
  currentUser,
  selectedUser,
  onSelectUser,
  filters,
  isSimulatingMovement,
  onToggleSimulatedMovement,
  onStartCall,
  onStartChat,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const circlesRef = useRef<Map<string, L.Circle>>(new Map());

  // Filter users based on selected filters
  const filteredUsers = users.filter((u) => {
    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchName = u.displayName.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchRole = u.role.toLowerCase().includes(q);
      if (!matchName && !matchUsername && !matchRole) return false;
    }

    // Roles filter
    if (filters.selectedRoles.length > 0 && !filters.selectedRoles.includes(u.role)) {
      return false;
    }

    // Status filter
    if (filters.selectedStatuses.length > 0 && !filters.selectedStatuses.includes(u.movementStatus)) {
      return false;
    }

    // Only active / online
    if (filters.onlyActive && !u.isOnline) {
      return false;
    }

    // Only SOS
    if (filters.hasSosOnly && u.movementStatus !== "sos") {
      return false;
    }

    return true;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered around urban venue (Central Park / Manhattan coordinates: 40.7680, -73.9780)
    const initialLat = currentUser?.location?.lat || 40.768;
    const initialLng = currentUser?.location?.lng || -73.978;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
    });

    // Add zoom control at bottom-right to keep clean UI
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // OpenStreetMap standard tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Helper to generate marker HTML based on user role & movement status
  const createMarkerHtml = (user: UserRecord, isSelected: boolean, isMe: boolean) => {
    let roleColor = "#4f46e5"; // indigo
    if (user.role === "superadmin") roleColor = "#e11d48"; // rose-600
    else if (user.role === "admin") roleColor = "#d97706"; // amber-600
    else if (user.role === "dispatcher") roleColor = "#0284c7"; // cyan-600
    else if (user.role === "volunteer") roleColor = "#10b981"; // emerald-500

    const isSos = user.movementStatus === "sos";
    const heading = user.location.heading || 0;

    // Movement status mini symbol
    let statusSymbol = "•";
    if (user.movementStatus === "walking") statusSymbol = "🚶";
    else if (user.movementStatus === "running") statusSymbol = "🏃";
    else if (user.movementStatus === "in_transit") statusSymbol = "🚗";
    else if (user.movementStatus === "sos") statusSymbol = "🚨";

    return `
      <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
        ${
          isSos
            ? `
          <div class="absolute -inset-3 rounded-full bg-rose-600/40 animate-ping"></div>
          <div class="absolute -inset-6 rounded-full border-2 border-rose-500/60 animate-pulse"></div>
        `
            : ""
        }
        
        ${
          isMe
            ? `
          <div class="absolute -inset-2 rounded-full border-2 border-dashed border-indigo-600 animate-spin" style="animation-duration: 6s;"></div>
        `
            : ""
        }

        <div class="relative flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-transform duration-300 ${
          isSelected ? "scale-125 ring-4 ring-indigo-600 z-50" : "hover:scale-110"
        }" style="background-color: ${roleColor}; border: 2.5px solid white;">
          
          <!-- Heading direction needle if moving -->
          ${
            user.location.speed && user.location.speed > 1
              ? `
            <div class="absolute -top-2.5 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-slate-900" style="transform: rotate(${heading}deg); transform-origin: center bottom;"></div>
          `
              : ""
          }

          <!-- User Initial / Status Symbol -->
          <span class="text-white text-xs font-bold leading-none">
            ${isSos ? "SOS" : user.displayName.charAt(0)}
          </span>

          <!-- Mini status badge -->
          <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-[9px] shadow-xs flex items-center justify-center border border-slate-200">
            ${statusSymbol}
          </span>
        </div>

        <!-- Floating Name Tag -->
        <div class="absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[10px] font-semibold shadow-md pointer-events-none transition-opacity ${
          isSelected ? "opacity-100 ring-2 ring-indigo-400" : "opacity-90 group-hover:opacity-100"
        }">
          ${user.displayName.split(" ")[0]} ${user.location.speed ? `(${user.location.speed.toFixed(1)}k)` : ""}
        </div>
      </div>
    `;
  };

  // Sync Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkerIds = new Set<string>();

    filteredUsers.forEach((user) => {
      currentMarkerIds.add(user.id);
      const isSelected = selectedUser?.id === user.id;
      const isMe = currentUser?.id === user.id;
      const latLng: [number, number] = [user.location.lat, user.location.lng];

      const customIcon = L.divIcon({
        className: "custom-crowd-marker",
        html: createMarkerHtml(user, isSelected, isMe),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (markersRef.current.has(user.id)) {
        const marker = markersRef.current.get(user.id)!;
        marker.setLatLng(latLng);
        marker.setIcon(customIcon);
        marker.setZIndexOffset(isSelected || user.movementStatus === "sos" ? 1000 : 100);
      } else {
        const marker = L.marker(latLng, {
          icon: customIcon,
          zIndexOffset: isSelected || user.movementStatus === "sos" ? 1000 : 100,
        }).addTo(map);

        marker.on("click", () => {
          onSelectUser(user);
        });

        markersRef.current.set(user.id, marker);
      }

      // Accuracy or SOS circle
      if (user.movementStatus === "sos") {
        if (!circlesRef.current.has(user.id)) {
          const circle = L.circle(latLng, {
            radius: 80,
            color: "#dc2626",
            fillColor: "#ef4444",
            fillOpacity: 0.2,
            weight: 2,
          }).addTo(map);
          circlesRef.current.set(user.id, circle);
        } else {
          const circle = circlesRef.current.get(user.id)!;
          circle.setLatLng(latLng);
        }
      } else if (circlesRef.current.has(user.id)) {
        circlesRef.current.get(user.id)!.remove();
        circlesRef.current.delete(user.id);
      }
    });

    // Cleanup removed markers
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    circlesRef.current.forEach((circle, id) => {
      if (!currentMarkerIds.has(id)) {
        circle.remove();
        circlesRef.current.delete(id);
      }
    });
  }, [filteredUsers, selectedUser, currentUser]);

  // Center on current user / selected user
  const handleCenterOnMe = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (currentUser?.location) {
      map.flyTo([currentUser.location.lat, currentUser.location.lng], 16, { duration: 0.8 });
    }
  };

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || filteredUsers.length === 0) return;
    const bounds = L.latLngBounds(filteredUsers.map((u) => [u.location.lat, u.location.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  };

  return (
    <div className="relative w-full h-[calc(100vh-144px)] overflow-hidden bg-slate-100">
      {/* Map Container */}
      <div ref={mapContainerRef} id="leaflet-map-element" className="w-full h-full z-10" />

      {/* Floating Map Action Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <button
          id="map-center-me-btn"
          onClick={handleCenterOnMe}
          title="Center on My GPS Location"
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition active:scale-95"
        >
          <Locate className="w-5 h-5 text-indigo-600" />
        </button>

        <button
          id="map-fit-all-btn"
          onClick={handleFitAll}
          title="Fit All Tracked Nodes"
          className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition active:scale-95"
        >
          <Layers className="w-5 h-5" />
        </button>

        <button
          id="map-sim-patrol-btn"
          onClick={onToggleSimulatedMovement}
          title={isSimulatingMovement ? "Stop Simulated Movement" : "Start Simulated Walk Patrol"}
          className={`w-10 h-10 rounded-xl backdrop-blur border shadow-md flex items-center justify-center transition active:scale-95 ${
            isSimulatingMovement
              ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-200 animate-pulse"
              : "bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Simulated Movement Floating Pill */}
      {isSimulatingMovement && (
        <div className="absolute top-3 left-3 z-20 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg shadow-indigo-200 flex items-center gap-2 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>GPS Walk Patrol Simulator Active</span>
          <button
            onClick={onToggleSimulatedMovement}
            className="text-[10px] bg-indigo-900/60 hover:bg-indigo-950 px-2 py-0.5 rounded-full ml-1 font-bold transition"
          >
            Stop
          </button>
        </div>
      )}

      {/* Quick Selected User Card (Bottom Float if user selected on map) */}
      {selectedUser && (
        <div className="absolute bottom-4 left-3 right-3 sm:left-6 sm:right-auto sm:w-96 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-4 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0 border-2 border-indigo-500"
                style={{ backgroundColor: selectedUser.avatarColor || "#4f46e5" }}
              >
                {selectedUser.displayName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 leading-tight">
                    {selectedUser.displayName}
                  </h4>
                  {selectedUser.movementStatus === "sos" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                      SOS ALERT
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 capitalize flex items-center gap-1.5 mt-0.5">
                  <span className="font-medium text-slate-700">{selectedUser.role}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-semibold">{selectedUser.movementStatus}</span>
                  {selectedUser.location.speed !== undefined && (
                    <>
                      <span>•</span>
                      <span>{selectedUser.location.speed.toFixed(1)} km/h</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              id="close-selected-user-card"
              onClick={() => onSelectUser(null as any)}
              className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 rounded-lg hover:bg-slate-100 transition"
            >
              &times;
            </button>
          </div>

          {/* Quick Action Buttons for Direct Calling & Messaging */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <button
              id="map-call-user-btn"
              onClick={() => onStartCall(selectedUser)}
              disabled={selectedUser.id === currentUser?.id}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition disabled:opacity-40"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Voice Call</span>
            </button>

            <button
              id="map-chat-user-btn"
              onClick={() => onStartChat(selectedUser)}
              className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
