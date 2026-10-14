import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import { UserRecord, FilterOptions, GlobalMarker, UserAssignment, ProtestGroup, InspectionPoint } from "../../types";
import {
  Locate,
  Navigation,
  Layers,
  Phone,
  MessageSquare,
  Search,
  Mic,
  X,
  Compass,
  MapPin,
  Route as RouteIcon,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Check,
  Radio,
  Eye,
  Crosshair,
  Shield,
  ArrowRight,
  ExternalLink,
  Flag,
  Target,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  Tag,
  Plus,
  HeartPulse,
} from "lucide-react";
import { searchPlaces, reverseGeocode, GeocodeResult } from "../../utils/geocoding";
import { fetchRoute, RouteResult, formatDistance, formatDuration } from "../../utils/routing";
import { TacticalMapDispatcherModal } from "./TacticalMapDispatcherModal";
import { gpsEngine } from "../../utils/gpsTracker";

// Supported Tile Layer Presets
export type MapLayerType = "satellite_hybrid" | "satellite_clean" | "streets" | "dark";

const MAP_LAYERS: {
  id: MapLayerType;
  name: string;
  desc: string;
  url: string;
  subdomains?: string[];
  maxZoom: number;
}[] = [
  {
    id: "satellite_hybrid",
    name: "Satellite Hybrid",
    desc: "Google Satellite with Roads & Places",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 20,
  },
  {
    id: "satellite_clean",
    name: "Clean Satellite",
    desc: "Pure Earth Aerial Photography",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 20,
  },
  {
    id: "streets",
    name: "Standard Street",
    desc: "OpenStreetMap Vector Roads",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
  },
  {
    id: "dark",
    name: "Tactical Dark",
    desc: "CartoDB High-Contrast Night Map",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    maxZoom: 19,
  },
];

interface LeafletCrowdMapProps {
  users: UserRecord[];
  currentUser: UserRecord | null;
  selectedUser: UserRecord | null;
  onSelectUser: (user: UserRecord | null) => void;
  filters: FilterOptions;
  onStartCall: (user: UserRecord) => void;
  onStartChat: (user: UserRecord) => void;
  onUpdateCoordinates?: (lat: number, lng: number) => void;
  isRealGpsActive?: boolean;
  onRefreshGps?: () => void;
  gpsAccuracy?: number | null;
  gpsStatusText?: string;
  globalMarker?: GlobalMarker | null;
  assignments?: UserAssignment[];
  groups?: ProtestGroup[];
  availableTags?: string[];
  inspectionPoints?: InspectionPoint[];
  onSetGlobalMarker?: (data: {
    title: string;
    description: string;
    lat: number;
    lng: number;
    radius?: number;
    targetTime?: string;
  }) => Promise<void>;
  onClearGlobalMarker?: () => Promise<void>;
  onAssignUserMarker?: (
    targetUserId: string,
    data: { title: string; instructions: string; lat: number; lng: number }
  ) => Promise<void>;
  onClearUserAssignment?: (userId: string) => Promise<void>;
  onUpdateAssignmentStatus?: (
    status: "pending" | "acknowledged" | "reached"
  ) => Promise<void>;
  onAddInspectionPoint?: (data: {
    title: string;
    notes?: string;
    type: InspectionPoint["type"];
    lat: number;
    lng: number;
  }) => Promise<void>;
  onMoveInspectionPoint?: (id: string, lat: number, lng: number) => Promise<void>;
  onDeleteInspectionPoint?: (id: string) => Promise<void>;
  onAssignGroupDestination?: (
    groupId: string,
    data: {
      label: string;
      lat: number;
      lng: number;
      assignAllMembers?: boolean;
    }
  ) => Promise<void>;
  onStartGroupCall?: (group: ProtestGroup) => void;
  onFilterByTag?: (tag: string) => void;
  onAddUserTag?: (userId: string, tag: string) => Promise<void>;
  onRemoveUserTag?: (userId: string, tag: string) => Promise<void>;
  onUpdateFilters?: (filters: Partial<FilterOptions>) => void;
  flyToTarget?: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
}

export const LeafletCrowdMap: React.FC<LeafletCrowdMapProps> = ({
  users,
  currentUser,
  selectedUser,
  onSelectUser,
  filters,
  onStartCall,
  onStartChat,
  onStartGroupCall,
  onUpdateCoordinates,
  isRealGpsActive = false,
  onRefreshGps,
  gpsAccuracy = null,
  gpsStatusText = "",
  globalMarker = null,
  assignments = [],
  groups = [],
  availableTags = [],
  inspectionPoints = [],
  onSetGlobalMarker,
  onClearGlobalMarker,
  onAssignUserMarker,
  onClearUserAssignment,
  onUpdateAssignmentStatus,
  onAddInspectionPoint,
  onMoveInspectionPoint,
  onDeleteInspectionPoint,
  onAssignGroupDestination,
  onFilterByTag,
  onAddUserTag,
  onRemoveUserTag,
  onUpdateFilters,
  flyToTarget = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const circlesRef = useRef<Map<string, L.Circle>>(new Map());
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const searchPinMarkerRef = useRef<L.Marker | null>(null);
  const clickedPinMarkerRef = useRef<L.Marker | null>(null);

  // Global, Assignment & Inspection Map Refs
  const globalMarkerRef = useRef<L.Marker | null>(null);
  const globalMarkerCircleRef = useRef<L.Circle | null>(null);
  const postMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const postLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const groupRallyMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const inspectionMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const longHoldMarkerRef = useRef<L.Marker | null>(null);

  // UI States
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>("satellite_hybrid");
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isRouteDrawerOpen, setIsRouteDrawerOpen] = useState(false);
  const [isRouteCalculating, setIsRouteCalculating] = useState(false);
  const [routeStepsExpanded, setRouteStepsExpanded] = useState(false);
  const [clickedLocation, setClickedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [isSituationBannerOpen, setIsSituationBannerOpen] = useState(true);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  // Long-Hold Tactical Dispatcher & Inspection Point States
  const [isTacticalDispatcherOpen, setIsTacticalDispatcherOpen] = useState(false);
  const [longHoldLocation, setLongHoldLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [selectedInspectionPoint, setSelectedInspectionPoint] = useState<InspectionPoint | null>(null);

  // Modal States
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [isGlobalMarkerDetailsOpen, setIsGlobalMarkerDetailsOpen] = useState(false);
  const [isQuickSetGlobalModalOpen, setIsQuickSetGlobalModalOpen] = useState(false);
  const [isQuickAssignModalOpen, setIsQuickAssignModalOpen] = useState(false);
  const [assignUserTarget, setAssignUserTarget] = useState<UserRecord | null>(null);

  // Quick form states
  const [quickPostTitle, setQuickPostTitle] = useState("");
  const [quickPostInstructions, setQuickPostInstructions] = useState("");
  const [quickGmTitle, setQuickGmTitle] = useState("Central Protest Assembly Point");
  const [quickGmDesc, setQuickGmDesc] = useState("All contingents assemble at this rally beacon.");
  const [quickGmTime, setQuickGmTime] = useState("15:30 PM");

  const isSuperAdmin = currentUser?.role === "superadmin";
  const isAdminOrSuperAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  // Filter users based on query and attributes
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filters.searchQuery.trim()) {
        const rawQ = filters.searchQuery.trim().toLowerCase();
        const q = rawQ.startsWith("#") ? rawQ.substring(1).trim() : rawQ;
        const matchName = u.displayName.toLowerCase().includes(q);
        const matchUsername = u.username.toLowerCase().includes(q);
        const matchRole = u.role.toLowerCase().includes(q);
        const matchPost = u.assignedPost?.title.toLowerCase().includes(q);
        const matchTags = u.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchUsername && !matchRole && !matchPost && !matchTags) return false;
      }
      if (filters.selectedTags && filters.selectedTags.length > 0) {
        const hasTag = filters.selectedTags.some((selectedTag) =>
          u.tags?.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
        );
        if (!hasTag) return false;
      }
      if (filters.selectedRoles.length > 0 && !filters.selectedRoles.includes(u.role)) {
        return false;
      }
      if (filters.selectedStatuses.length > 0 && !filters.selectedStatuses.includes(u.movementStatus)) {
        return false;
      }
      if (filters.selectedGroupId && (!u.groupIds || !u.groupIds.includes(filters.selectedGroupId))) {
        return false;
      }
      if (filters.onlyActive && !u.isOnline) {
        return false;
      }
      if (filters.hasSosOnly && u.movementStatus !== "sos") {
        return false;
      }
      return true;
    });
  }, [users, filters]);

  // 1. Initialize Map with Google Satellite Hybrid Layer
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered at Devi Asthan / Bihta area (25.5645, 84.8560) as in screenshot
    const userLat = Number(currentUser?.location?.lat);
    const userLng = Number(currentUser?.location?.lng);
    const initialLat = Number.isFinite(userLat) ? userLat : 25.5645;
    const initialLng = Number.isFinite(userLng) ? userLng : 84.8560;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
    });

    // Custom bottom-right zoom control
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add Default Google Satellite Hybrid Tile Layer
    const layerConfig = MAP_LAYERS.find((l) => l.id === "satellite_hybrid")!;
    const tileLayer = L.tileLayer(layerConfig.url, {
      maxZoom: layerConfig.maxZoom,
      subdomains: layerConfig.subdomains || ["a", "b", "c"],
      attribution: "&copy; Google Maps / OpenStreetMap contributors",
    }).addTo(map);

    activeTileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Tactical Long-Hold State Machine (Desktop Mouse & Mobile Touch)
    let longHoldTimer: any = null;
    let touchStartPoint: L.Point | null = null;
    let didTriggerLongHold = false;

    const cancelLongHold = () => {
      if (longHoldTimer) {
        clearTimeout(longHoldTimer);
        longHoldTimer = null;
      }
    };

    const triggerLongHold = async (lat: number, lng: number) => {
      didTriggerLongHold = true;
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(50);
        } catch (_) {}
      }

      // Drop tactical crosshair indicator
      const crosshairIcon = L.divIcon({
        className: "custom-longhold-crosshair",
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="absolute -inset-6 rounded-full bg-indigo-500/30 animate-ping"></div>
            <div class="w-10 h-10 rounded-full border-2 border-indigo-400 bg-indigo-950/90 flex items-center justify-center text-white text-base shadow-2xl ring-4 ring-indigo-500/40">
              🎯
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (longHoldMarkerRef.current) {
        longHoldMarkerRef.current.setLatLng([lat, lng]);
      } else {
        longHoldMarkerRef.current = L.marker([lat, lng], {
          icon: crosshairIcon,
          zIndexOffset: 3000,
        }).addTo(map);
      }

      setLongHoldLocation({ lat, lng, address: "Resolving tactical location..." });
      setIsTacticalDispatcherOpen(true);
      const address = await reverseGeocode(lat, lng);
      setLongHoldLocation({ lat, lng, address });
    };

    // Mouse Listeners (Desktop)
    map.on("mousedown", (e: L.LeafletMouseEvent) => {
      cancelLongHold();
      didTriggerLongHold = false;
      touchStartPoint = e.containerPoint;
      longHoldTimer = setTimeout(() => {
        triggerLongHold(e.latlng.lat, e.latlng.lng);
      }, 450);
    });

    map.on("mouseup", () => {
      cancelLongHold();
    });

    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      if (touchStartPoint && touchStartPoint.distanceTo(e.containerPoint) > 10) {
        cancelLongHold();
      }
    });

    map.on("contextmenu", (e: L.LeafletMouseEvent) => {
      cancelLongHold();
      L.DomEvent.preventDefault(e.originalEvent);
      triggerLongHold(e.latlng.lat, e.latlng.lng);
    });

    // Touch Listeners (Mobile Phones & Tablets)
    const mapDom = map.getContainer();
    let touchStartClientCoord: { x: number; y: number } | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartClientCoord = { x: touch.clientX, y: touch.clientY };
        cancelLongHold();
        didTriggerLongHold = false;
        longHoldTimer = setTimeout(() => {
          const rect = mapDom.getBoundingClientRect();
          const point = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
          const latlng = map.containerPointToLatLng(point);
          triggerLongHold(latlng.lat, latlng.lng);
        }, 450);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartClientCoord && e.touches.length > 0) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartClientCoord.x);
        const dy = Math.abs(touch.clientY - touchStartClientCoord.y);
        if (dx > 12 || dy > 12) {
          cancelLongHold();
        }
      }
    };

    const handleTouchEnd = () => {
      cancelLongHold();
    };

    mapDom.addEventListener("touchstart", handleTouchStart, { passive: true });
    mapDom.addEventListener("touchmove", handleTouchMove, { passive: true });
    mapDom.addEventListener("touchend", handleTouchEnd, { passive: true });
    mapDom.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    // Click on map event -> drops inspection pin and reverse geocodes
    map.on("click", async (e: L.LeafletMouseEvent) => {
      if (didTriggerLongHold) {
        didTriggerLongHold = false;
        return;
      }

      const lat = Number(e.latlng?.lat);
      const lng = Number(e.latlng?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      if (clickedPinMarkerRef.current) {
        clickedPinMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const pinIcon = L.divIcon({
          className: "custom-click-pin",
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
              <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold animate-bounce">
                📍
              </div>
              <div class="absolute -bottom-1 w-2 h-2 rounded-full bg-rose-950/60 blur-[1px]"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        clickedPinMarkerRef.current = L.marker([lat, lng], {
          icon: pinIcon,
          zIndexOffset: 1500,
        }).addTo(map);
      }

      setClickedLocation({ lat, lng, address: "Resolving address..." });
      const address = await reverseGeocode(lat, lng);
      setClickedLocation({ lat, lng, address });
    });

    return () => {
      cancelLongHold();
      mapDom.removeEventListener("touchstart", handleTouchStart);
      mapDom.removeEventListener("touchmove", handleTouchMove);
      mapDom.removeEventListener("touchend", handleTouchEnd);
      mapDom.removeEventListener("touchcancel", handleTouchEnd);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Change Tile Layer dynamically
  const handleSelectLayer = (layerId: MapLayerType) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layerConfig = MAP_LAYERS.find((l) => l.id === layerId);
    if (!layerConfig) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const tileLayer = L.tileLayer(layerConfig.url, {
      maxZoom: layerConfig.maxZoom,
      subdomains: layerConfig.subdomains || ["a", "b", "c"],
      attribution: "&copy; Google Maps / OpenStreetMap contributors",
    }).addTo(map);

    activeTileLayerRef.current = tileLayer;
    setCurrentLayer(layerId);
    setIsLayerMenuOpen(false);
  };

  // 3. Render Field Unit Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkerIds = new Set<string>();

    filteredUsers.forEach((user) => {
      const lat = Number(user?.location?.lat);
      const lng = Number(user?.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      currentMarkerIds.add(user.id);
      const isSelected = selectedUser?.id === user.id;
      const isMe = currentUser?.id === user.id;
      const latLng: [number, number] = [lat, lng];

      // Custom marker HTML & click handler based on role permissions
      let markerHtml = "";
      const isTargetAdmin = user.role === "superadmin" || user.role === "admin" || user.role === "dispatcher";

      if (isMe) {
        // High-precision Blue GPS Location Dot with pulsing radar waves for Current User
        markerHtml = `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <div class="absolute -inset-4 rounded-full bg-blue-500/25 animate-ping" style="animation-duration: 2.2s;"></div>
            <div class="absolute -inset-2.5 rounded-full bg-blue-400/30 animate-pulse"></div>
            
            <div class="relative w-7 h-7 rounded-full bg-blue-600 border-[3px] border-white shadow-xl flex items-center justify-center text-white text-[11px] font-extrabold ring-2 ring-blue-500/60">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>

            ${
              user.location.speed && user.location.speed > 1.2
                ? `
              <div class="absolute -top-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-600 drop-shadow-md" style="transform: rotate(${
                user.location.heading || 0
              }deg); transform-origin: center 18px;"></div>
            `
                : ""
            }

            <div class="absolute top-8 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-slate-950/90 text-white text-[10px] font-bold border border-blue-400/50 shadow-md pointer-events-none flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span>You (${user.displayName.split(" ")[0]})</span>
            </div>
          </div>
        `;
      } else if (!isAdminOrSuperAdmin && !isTargetAdmin) {
        // NORMAL USER VIEW: Anonymous Crowd Gathering Dot (No name, profile, contact info or tags exposed)
        const isSos = user.movementStatus === "sos";
        if (isSos) {
          markerHtml = `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
              <div class="absolute -inset-3 rounded-full bg-rose-600/40 animate-ping"></div>
              <div class="w-5 h-5 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[9px] font-black animate-pulse">
                !
              </div>
            </div>
          `;
        } else {
          // Clean anonymous crowd gathering dot showing crowd movement
          const isMoving = user.location.speed && user.location.speed > 1.5;
          markerHtml = `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-default group">
              ${isMoving ? `<div class="absolute -inset-1 rounded-full bg-emerald-400/30 animate-pulse"></div>` : ""}
              <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-md transition-transform group-hover:scale-125"></div>
            </div>
          `;
        }
      } else if (!isAdminOrSuperAdmin && isTargetAdmin) {
        // NORMAL USER VIEW: Command & Dispatch Hub Marker for Official Contact
        markerHtml = `
          <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-1/2">
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg bg-amber-500 border-2 border-white text-white text-xs font-bold transition-transform group-hover:scale-110">
              🛡️
            </div>
            <div class="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-900/90 text-amber-300 text-[10px] font-bold shadow-md pointer-events-none">
              Command Dispatch
            </div>
          </div>
        `;
      } else {
        // ADMIN & SUPER ADMIN VIEW: Full Tactical Detail (100% Visibility, Names, Roles, Speed, Heading, SOS)
        let roleColor = "#4f46e5";
        if (user.role === "superadmin") roleColor = "#e11d48";
        else if (user.role === "admin") roleColor = "#d97706";
        else if (user.role === "dispatcher") roleColor = "#0284c7";
        else if (user.role === "volunteer") roleColor = "#10b981";

        const isSos = user.movementStatus === "sos";
        let statusEmoji = "•";
        if (user.movementStatus === "walking") statusEmoji = "🚶";
        else if (user.movementStatus === "running") statusEmoji = "🏃";
        else if (user.movementStatus === "in_transit") statusEmoji = "🚗";
        else if (user.movementStatus === "sos") statusEmoji = "🚨";

        markerHtml = `
          <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-1/2">
            ${
              isSos
                ? `
              <div class="absolute -inset-4 rounded-full bg-rose-600/40 animate-ping"></div>
              <div class="absolute -inset-7 rounded-full border-2 border-rose-500/70 animate-pulse"></div>
            `
                : ""
            }

            <div class="relative flex items-center justify-center w-9 h-9 rounded-full shadow-lg transition-transform duration-200 ${
              isSelected ? "scale-125 ring-4 ring-indigo-400 z-50" : "hover:scale-110"
            }" style="background-color: ${roleColor}; border: 2.5px solid white;">
              
              ${
                user.location.speed && user.location.speed > 1.2
                  ? `
                <div class="absolute -top-2.5 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-slate-900" style="transform: rotate(${
                  user.location.heading || 0
                }deg); transform-origin: center bottom;"></div>
              `
                  : ""
              }

              <span class="text-white text-xs font-bold leading-none">
                ${isSos ? "SOS" : user.displayName.charAt(0)}
              </span>

              <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-[9px] shadow-xs flex items-center justify-center border border-slate-300">
                ${statusEmoji}
              </span>
            </div>

            <div class="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[10px] font-semibold shadow-md pointer-events-none transition-opacity ${
              isSelected ? "opacity-100 ring-2 ring-indigo-400" : "opacity-90 group-hover:opacity-100"
            }">
              ${user.displayName.split(" ")[0]} ${user.location.speed ? `• ${(user.location.speed).toFixed(1)}k` : ""}
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: "custom-crowd-unit-marker",
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (markersRef.current.has(user.id)) {
        const marker = markersRef.current.get(user.id)!;
        marker.setLatLng(latLng);
        marker.setIcon(customIcon);
        marker.setZIndexOffset(isSelected || isMe || user.movementStatus === "sos" ? 1000 : 100);
      } else {
        const marker = L.marker(latLng, {
          icon: customIcon,
          zIndexOffset: isSelected || isMe || user.movementStatus === "sos" ? 1000 : 100,
        }).addTo(map);

        marker.on("click", () => {
          onSelectUser(user);
        });

        markersRef.current.set(user.id, marker);
      }

      // Accuracy or SOS circle
      if (isMe && gpsAccuracy && Number.isFinite(gpsAccuracy) && gpsAccuracy < 300) {
        const radius = Math.max(15, gpsAccuracy);
        if (!circlesRef.current.has(user.id)) {
          const circle = L.circle(latLng, {
            radius,
            color: "#3b82f6",
            fillColor: "#60a5fa",
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(map);
          circlesRef.current.set(user.id, circle);
        } else {
          const circle = circlesRef.current.get(user.id)!;
          circle.setLatLng(latLng);
          circle.setRadius(radius);
        }
      } else if (user.movementStatus === "sos") {
        if (!circlesRef.current.has(user.id)) {
          const circle = L.circle(latLng, {
            radius: 80,
            color: "#dc2626",
            fillColor: "#ef4444",
            fillOpacity: 0.25,
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

    // Cleanup stale markers
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
  }, [filteredUsers, selectedUser, currentUser, gpsAccuracy]);

  // 4. Render Global Protest Assembly Marker (Super Admin Broadcast Beacon)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (globalMarker && Number.isFinite(globalMarker.lat) && Number.isFinite(globalMarker.lng)) {
      const latLng: [number, number] = [globalMarker.lat, globalMarker.lng];
      const radius = globalMarker.radius || 120;

      // Marker Icon
      const gmIcon = L.divIcon({
        className: "custom-global-assembly-beacon",
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <div class="absolute -inset-6 rounded-full bg-amber-500/25 animate-ping" style="animation-duration: 2.5s;"></div>
            <div class="absolute -inset-3 rounded-full bg-amber-400/40 animate-pulse"></div>

            <div class="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 border-[3px] border-white shadow-2xl flex items-center justify-center text-white text-xl font-black ring-4 ring-amber-400/60 transition-transform group-hover:scale-115">
              <span>🚩</span>
            </div>

            <div class="absolute top-12 whitespace-nowrap px-3 py-1 rounded-xl bg-slate-950/95 text-amber-300 text-[11px] font-extrabold border border-amber-400/70 shadow-2xl flex items-center gap-1.5 pointer-events-none">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>${globalMarker.title}</span>
              ${globalMarker.targetTime ? `<span class="text-white opacity-80">(${globalMarker.targetTime})</span>` : ""}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      if (!globalMarkerRef.current) {
        const marker = L.marker(latLng, { icon: gmIcon, zIndexOffset: 2500 }).addTo(map);
        marker.on("click", () => {
          setIsGlobalMarkerDetailsOpen(true);
        });
        globalMarkerRef.current = marker;
      } else {
        globalMarkerRef.current.setLatLng(latLng);
        globalMarkerRef.current.setIcon(gmIcon);
      }

      // Perimeter Circle
      if (!globalMarkerCircleRef.current) {
        const circle = L.circle(latLng, {
          radius,
          color: "#d97706",
          fillColor: "#f59e0b",
          fillOpacity: 0.12,
          weight: 2,
          dashArray: "6, 6",
        }).addTo(map);
        globalMarkerCircleRef.current = circle;
      } else {
        globalMarkerCircleRef.current.setLatLng(latLng);
        globalMarkerCircleRef.current.setRadius(radius);
      }
    } else {
      if (globalMarkerRef.current) {
        globalMarkerRef.current.remove();
        globalMarkerRef.current = null;
      }
      if (globalMarkerCircleRef.current) {
        globalMarkerCircleRef.current.remove();
        globalMarkerCircleRef.current = null;
      }
    }
  }, [globalMarker]);

  // 5. Render Individual User Post Waypoints & Directive Lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentPostIds = new Set<string>();

    filteredUsers.forEach((user) => {
      const post = user.assignedPost;
      if (!post || !Number.isFinite(post.lat) || !Number.isFinite(post.lng)) return;

      const postId = `post-${user.id}`;
      currentPostIds.add(postId);

      const userLatLng: [number, number] = [user.location.lat, user.location.lng];
      const postLatLng: [number, number] = [post.lat, post.lng];
      const isMe = currentUser?.id === user.id;

      // Waypoint Marker Icon
      const postIcon = L.divIcon({
        className: "custom-user-post-waypoint",
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <div class="w-8 h-8 rounded-xl ${
              post.status === "reached"
                ? "bg-emerald-600 ring-emerald-300"
                : "bg-indigo-600 ring-indigo-300"
            } border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold ring-2 transition-transform group-hover:scale-110">
              🎯
            </div>

            <div class="absolute top-9 whitespace-nowrap px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-[10px] font-bold shadow-md border border-slate-700 pointer-events-none">
              ${post.title} (${user.displayName.split(" ")[0]})
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (!postMarkersRef.current.has(postId)) {
        const marker = L.marker(postLatLng, { icon: postIcon, zIndexOffset: 1200 }).addTo(map);
        marker.on("click", () => {
          onSelectUser(user);
        });
        postMarkersRef.current.set(postId, marker);
      } else {
        const marker = postMarkersRef.current.get(postId)!;
        marker.setLatLng(postLatLng);
        marker.setIcon(postIcon);
      }

      // Directive Line from User to Post
      if (Number.isFinite(userLatLng[0]) && Number.isFinite(userLatLng[1])) {
        if (!postLinesRef.current.has(postId)) {
          const line = L.polyline([userLatLng, postLatLng], {
            color: isMe ? "#2563eb" : "#f59e0b",
            weight: isMe ? 3 : 2,
            dashArray: "6, 8",
            opacity: 0.8,
          }).addTo(map);
          postLinesRef.current.set(postId, line);
        } else {
          const line = postLinesRef.current.get(postId)!;
          line.setLatLngs([userLatLng, postLatLng]);
        }
      }
    });

    // Cleanup stale post markers and lines
    postMarkersRef.current.forEach((marker, id) => {
      if (!currentPostIds.has(id)) {
        marker.remove();
        postMarkersRef.current.delete(id);
      }
    });

    postLinesRef.current.forEach((line, id) => {
      if (!currentPostIds.has(id)) {
        line.remove();
        postLinesRef.current.delete(id);
      }
    });
  }, [filteredUsers, currentUser]);

  // 6. Turn-by-Turn Route Polyline Drawer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeRoute && Array.isArray(activeRoute.coordinates) && activeRoute.coordinates.length > 0) {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
      }

      const validCoords = activeRoute.coordinates.filter(
        (coord) =>
          Array.isArray(coord) &&
          coord.length >= 2 &&
          Number.isFinite(coord[0]) &&
          Number.isFinite(coord[1])
      );

      if (validCoords.length > 0) {
        const polyline = L.polyline(validCoords, {
          color: "#2563eb",
          weight: 6,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        routePolylineRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [60, 60], maxZoom: 18 });
      }
    } else if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
  }, [activeRoute]);

  // 7. Fly to Target Coordinates from Search, Logs, Waypoints, or Crosshair Locate Buttons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToTarget) return;

    const lat = Number(flyToTarget.lat);
    const lng = Number(flyToTarget.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    map.flyTo([lat, lng], flyToTarget.zoom || 18, { duration: 1.2 });

    // Animated target radar beacon on the targeted coordinate
    if (searchPinMarkerRef.current) {
      searchPinMarkerRef.current.remove();
    }
    const beaconIcon = L.divIcon({
      className: "custom-target-beacon",
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div class="w-20 h-20 rounded-full border-2 border-indigo-500 bg-indigo-500/25 animate-ping"></div>
          <div class="absolute w-10 h-10 rounded-full border-2 border-indigo-400 bg-indigo-400/40 animate-pulse"></div>
        </div>
      `,
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    });
    searchPinMarkerRef.current = L.marker([lat, lng], {
      icon: beaconIcon,
      zIndexOffset: 2500,
    }).addTo(map);

    setTimeout(() => {
      if (searchPinMarkerRef.current) {
        searchPinMarkerRef.current.remove();
        searchPinMarkerRef.current = null;
      }
    }, 4500);
  }, [flyToTarget]);

  // 8. Render Multiple Inspection & Checkpoint Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentInspIds = new Set<string>();

    inspectionPoints.forEach((point) => {
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
      currentInspIds.add(point.id);

      const latLng: [number, number] = [point.lat, point.lng];
      let iconColor = "bg-indigo-600 ring-indigo-300";
      let iconEmoji = "🛡️";

      if (point.type === "medical") {
        iconColor = "bg-rose-600 ring-rose-300";
        iconEmoji = "🩺";
      } else if (point.type === "safe_corridor") {
        iconColor = "bg-emerald-600 ring-emerald-300";
        iconEmoji = "🚶";
      } else if (point.type === "inspection") {
        iconColor = "bg-amber-600 ring-amber-300";
        iconEmoji = "👁️";
      }

      const inspIcon = L.divIcon({
        className: "custom-inspection-marker",
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <div class="w-8 h-8 rounded-xl ${iconColor} border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold ring-2 transition-transform group-hover:scale-120">
              ${iconEmoji}
            </div>
            <div class="absolute top-9 whitespace-nowrap px-2 py-0.5 rounded-lg bg-slate-950/90 text-white text-[10px] font-bold shadow-md border border-slate-700 pointer-events-none">
              ${point.title}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (!inspectionMarkersRef.current.has(point.id)) {
        const marker = L.marker(latLng, { icon: inspIcon, zIndexOffset: 1350 }).addTo(map);
        marker.on("click", () => {
          setSelectedInspectionPoint(point);
          setClickedLocation(null);
          onSelectUser(null);
        });
        inspectionMarkersRef.current.set(point.id, marker);
      } else {
        const marker = inspectionMarkersRef.current.get(point.id)!;
        marker.setLatLng(latLng);
        marker.setIcon(inspIcon);
      }
    });

    inspectionMarkersRef.current.forEach((marker, id) => {
      if (!currentInspIds.has(id)) {
        marker.remove();
        inspectionMarkersRef.current.delete(id);
      }
    });
  }, [inspectionPoints]);

  // 9. Render Group / Squad Rally Point Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentRallyIds = new Set<string>();

    groups.forEach((group) => {
      if (!group.rallyPoint || !Number.isFinite(group.rallyPoint.lat) || !Number.isFinite(group.rallyPoint.lng)) return;
      currentRallyIds.add(group.id);

      const latLng: [number, number] = [group.rallyPoint.lat, group.rallyPoint.lng];
      const rallyIcon = L.divIcon({
        className: "custom-group-rally-beacon",
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <div class="w-8 h-8 rounded-xl border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold ring-2 transition-transform group-hover:scale-120" style="background-color: ${group.color || '#4f46e5'}">
              👥
            </div>
            <div class="absolute top-9 whitespace-nowrap px-2 py-0.5 rounded-lg bg-slate-950/90 text-white text-[10px] font-bold shadow-md border border-slate-700 pointer-events-none">
              ${group.rallyPoint.label || `${group.name} Rally`}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (!groupRallyMarkersRef.current.has(group.id)) {
        const marker = L.marker(latLng, { icon: rallyIcon, zIndexOffset: 1250 }).addTo(map);
        marker.on("click", () => {
          setClickedLocation({
            lat: group.rallyPoint!.lat,
            lng: group.rallyPoint!.lng,
            address: `${group.name} Rally Point: ${group.rallyPoint!.label}`,
          });
        });
        groupRallyMarkersRef.current.set(group.id, marker);
      } else {
        const marker = groupRallyMarkersRef.current.get(group.id)!;
        marker.setLatLng(latLng);
        marker.setIcon(rallyIcon);
      }
    });

    groupRallyMarkersRef.current.forEach((marker, id) => {
      if (!currentRallyIds.has(id)) {
        marker.remove();
        groupRallyMarkersRef.current.delete(id);
      }
    });
  }, [groups]);

  // Fast Autocomplete / Search Computations for Tags, Users, Groups, Places
  const matchingSearchUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const rawQ = searchQuery.trim().toLowerCase();
    const q = rawQ.startsWith("#") ? rawQ.substring(1).trim() : rawQ;
    if (!q) return [];
    return users
      .filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.assignedPost?.title.toLowerCase().includes(q) ||
          u.customStatus?.toLowerCase().includes(q) ||
          u.tags?.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [users, searchQuery]);

  const matchingSearchTags = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const rawQ = searchQuery.trim().toLowerCase();
    const q = rawQ.startsWith("#") ? rawQ.substring(1).trim() : rawQ;
    if (!q) return [];
    return availableTags.filter((t) => t.toLowerCase().includes(q)).slice(0, 6);
  }, [availableTags, searchQuery]);

  const matchingSearchGroups = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return groups
      .filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [groups, searchQuery]);

  // Debounced Place Search (Only if not already matching a unit or tag)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3 || searchQuery.startsWith("#")) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchPlaces(searchQuery).then((results) => {
        setSearchResults(results.slice(0, 4));
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search Submit: Prioritize Users First, then Tags, Squads, Places
  const handlePerformSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    const lowerQ = q.toLowerCase();
    const cleanQ = lowerQ.startsWith("#") ? lowerQ.substring(1).trim() : lowerQ;

    // 1. Check if it matches a user/personnel first!
    const matchedUser = users.find(
      (u) =>
        u.displayName.toLowerCase() === lowerQ ||
        u.username.toLowerCase() === lowerQ ||
        u.displayName.toLowerCase().includes(cleanQ) ||
        u.username.toLowerCase().includes(cleanQ)
    );

    if (matchedUser && Number.isFinite(matchedUser.location.lat) && Number.isFinite(matchedUser.location.lng)) {
      handleSelectUserFromSearch(matchedUser);
      return;
    }

    // 2. Check if it matches a tag
    const matchedTag = availableTags.find(
      (t) => t.toLowerCase() === cleanQ || t.toLowerCase().includes(cleanQ)
    );
    if (matchedTag) {
      handleSelectTagFromSearch(matchedTag);
      return;
    }

    // 3. Check if it matches a squad
    const matchedSquad = groups.find((g) => g.name.toLowerCase().includes(lowerQ));
    if (matchedSquad) {
      handleSelectGroupFromSearch(matchedSquad);
      return;
    }

    // 4. Otherwise search places via OpenStreetMap Nominatim geocoding
    setIsSearching(true);
    const results = await searchPlaces(query);
    setSearchResults(results);
    setIsSearching(false);
    if (results.length > 0) {
      handleSelectSearchResult(results[0]);
    }
  };

  const handleSelectUserFromSearch = (user: UserRecord) => {
    const map = mapInstanceRef.current;
    const lat = Number(user?.location?.lat);
    const lng = Number(user?.location?.lng);

    if (map && Number.isFinite(lat) && Number.isFinite(lng)) {
      map.flyTo([lat, lng], 18, { duration: 1.0 });

      // Highlight user with an animated visual target beacon
      if (searchPinMarkerRef.current) {
        searchPinMarkerRef.current.remove();
      }
      const beaconIcon = L.divIcon({
        className: "custom-target-beacon",
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div class="w-20 h-20 rounded-full border-2 border-indigo-500 bg-indigo-500/20 animate-ping"></div>
            <div class="absolute w-9 h-9 rounded-full border-2 border-indigo-400 bg-indigo-400/40 animate-pulse"></div>
          </div>
        `,
        iconSize: [80, 80],
        iconAnchor: [40, 40],
      });
      searchPinMarkerRef.current = L.marker([lat, lng], {
        icon: beaconIcon,
        zIndexOffset: 2000,
      }).addTo(map);

      setTimeout(() => {
        if (searchPinMarkerRef.current) {
          searchPinMarkerRef.current.remove();
          searchPinMarkerRef.current = null;
        }
      }, 4500);
    }

    onSelectUser(user);
    setSearchQuery(user.displayName);
    setSearchResults([]);
    if (onUpdateFilters) {
      onUpdateFilters({ searchQuery: "" });
    }
  };

  const handleSelectTagFromSearch = (tag: string) => {
    if (onFilterByTag) {
      onFilterByTag(tag);
    }
    setSearchQuery(`#${tag}`);
    setSearchResults([]);
    const taggedUsers = users.filter((u) =>
      u.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
    if (taggedUsers.length > 0) {
      const map = mapInstanceRef.current;
      if (map) {
        const coords = taggedUsers
          .map((u) => [Number(u.location.lat), Number(u.location.lng)] as [number, number])
          .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
        if (coords.length > 0) {
          map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 18 });
        }
      }
    }
  };

  const handleSelectGroupFromSearch = (group: ProtestGroup) => {
    if (group.rallyPoint && Number.isFinite(group.rallyPoint.lat) && Number.isFinite(group.rallyPoint.lng)) {
      const map = mapInstanceRef.current;
      if (map) {
        map.flyTo([group.rallyPoint.lat, group.rallyPoint.lng], 17, { duration: 1.0 });
      }
    }
    setSearchQuery(group.name);
    setSearchResults([]);
  };

  const handleSelectSearchResult = (item: GeocodeResult) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setSearchResults([]);
    setSearchQuery(item.displayName.split(",")[0]);

    if (searchPinMarkerRef.current) {
      searchPinMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const pinIcon = L.divIcon({
        className: "custom-search-pin",
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full">
            <div class="w-9 h-9 rounded-2xl bg-indigo-600 border-2 border-white shadow-2xl flex items-center justify-center text-white text-base font-bold animate-bounce">
              📍
            </div>
            <div class="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-slate-900/60 blur-[1px]"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      searchPinMarkerRef.current = L.marker([lat, lng], {
        icon: pinIcon,
        zIndexOffset: 2000,
      }).addTo(map);
    }

    map.flyTo([lat, lng], 17, { duration: 1.2 });
    setClickedLocation({ lat, lng, address: item.displayName });
  };

  // Center on My Location with real direct GPS query and high accuracy
  const handleCenterOnMyLocation = async () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setIsAcquiringGps(true);

    // 1. Instantly center on last known or current user coordinates
    const cachedFix = gpsEngine.getLastFix();
    const immediateLat = Number(cachedFix?.lat ?? currentUser?.location?.lat);
    const immediateLng = Number(cachedFix?.lng ?? currentUser?.location?.lng);

    if (Number.isFinite(immediateLat) && Number.isFinite(immediateLng)) {
      map.flyTo([immediateLat, immediateLng], 18, { duration: 0.8 });
    }

    if (onRefreshGps) onRefreshGps();

    // 2. Perform precision multi-tier hardware GPS lock
    try {
      const freshFix = await gpsEngine.requestDirectFix();
      if (freshFix && Number.isFinite(freshFix.lat) && Number.isFinite(freshFix.lng)) {
        if (onUpdateCoordinates) {
          onUpdateCoordinates(freshFix.lat, freshFix.lng);
        }
        map.flyTo([freshFix.lat, freshFix.lng], 18, { duration: 1.0 });
      }
    } catch (err: any) {
      console.warn("Direct positioning fix error:", err?.message);
    } finally {
      setIsAcquiringGps(false);
    }
  };

  // Fit all tracked crowd units
  const handleFitAllUnits = () => {
    const map = mapInstanceRef.current;
    if (!map || filteredUsers.length === 0) return;

    const validCoords: [number, number][] = filteredUsers
      .map((u) => [Number(u?.location?.lat), Number(u?.location?.lng)] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (validCoords.length === 0) return;
    const bounds = L.latLngBounds(validCoords);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    }
  };

  // Calculate Real Route from My GPS Location
  const handleCalculateRouteTo = async (destLat: number, destLng: number) => {
    const validDestLat = Number(destLat);
    const validDestLng = Number(destLng);
    if (!Number.isFinite(validDestLat) || !Number.isFinite(validDestLng)) return;

    const originLat = Number(currentUser?.location?.lat) || 25.5645;
    const originLng = Number(currentUser?.location?.lng) || 84.8560;

    setIsRouteCalculating(true);
    setIsRouteDrawerOpen(true);

    try {
      const route = await fetchRoute(originLat, originLng, validDestLat, validDestLng);
      setActiveRoute(route);
    } catch (err) {
      console.warn("Route calculation issue:", err);
    } finally {
      setIsRouteCalculating(false);
    }
  };

  const handleClearRoute = () => {
    setActiveRoute(null);
    setIsRouteDrawerOpen(false);
  };

  // Fly to Global Assembly Marker
  const handleFlyToGlobalMarker = () => {
    const map = mapInstanceRef.current;
    if (!map || !globalMarker) return;
    map.flyTo([globalMarker.lat, globalMarker.lng], 17, { duration: 1.2 });
    setIsGlobalMarkerDetailsOpen(true);
  };

  // Quick Assign Post Handlers
  const handleOpenAssignModal = (user: UserRecord, initialLat?: number, initialLng?: number) => {
    setAssignUserTarget(user);
    setQuickPostTitle(user.assignedPost?.title || `Station: ${user.displayName.split(" ")[0]}`);
    setQuickPostInstructions(user.assignedPost?.instructions || "Maintain station and support field march.");
    setIsQuickAssignModalOpen(true);
  };

  const handleSubmitQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserTarget || !onAssignUserMarker) return;

    const lat = clickedLocation ? clickedLocation.lat : assignUserTarget.location.lat;
    const lng = clickedLocation ? clickedLocation.lng : assignUserTarget.location.lng;

    await onAssignUserMarker(assignUserTarget.id, {
      title: quickPostTitle.trim() || "Field Post",
      instructions: quickPostInstructions.trim() || "Report here.",
      lat,
      lng,
    });
    setIsQuickAssignModalOpen(false);
    setClickedLocation(null);
  };

  const handleSubmitQuickGlobalMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSetGlobalMarker) return;

    const center = mapInstanceRef.current?.getCenter();
    const lat = clickedLocation ? Number(clickedLocation.lat) : (center ? center.lat : (Number(currentUser?.location?.lat) || 25.5645));
    const lng = clickedLocation ? Number(clickedLocation.lng) : (center ? center.lng : (Number(currentUser?.location?.lng) || 84.8560));

    await onSetGlobalMarker({
      title: quickGmTitle.trim() || "Central Assembly Point",
      description: quickGmDesc.trim(),
      lat,
      lng,
      radius: 150,
      targetTime: quickGmTime.trim() || undefined,
    });
    setIsQuickSetGlobalModalOpen(false);
    setClickedLocation(null);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* 1. Leaflet Interactive Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 2. Top Google Maps Search Bar & Quick Categories */}
      <div className="absolute top-3 left-2 sm:left-4 right-14 sm:right-auto sm:w-96 md:max-w-md z-30 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-1.5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <Search className="w-4 h-4" />
          </div>

          <input
            id="gmaps-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePerformSearch(searchQuery)}
            placeholder="Search by tag (#First Aid), personnel, squad, landmark..."
            className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none placeholder-slate-400 font-medium"
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            id="gmaps-search-submit-btn"
            onClick={() => handlePerformSearch(searchQuery)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
          >
            {isSearching ? "..." : "Go"}
          </button>
        </div>

        {/* Autocomplete & Search Results Dropdown */}
        {searchQuery.trim().length > 0 && (
          <div className="mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 p-1">
            {/* Matching Tags */}
            {matchingSearchTags.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-indigo-500" />
                  <span>Matching User Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchingSearchTags.map((tag) => {
                    const tagCount = users.filter((u) =>
                      u.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
                    ).length;
                    return (
                      <button
                        key={tag}
                        onClick={() => handleSelectTagFromSearch(tag)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>#{tag}</span>
                        <span className="text-[10px] opacity-75 font-normal">({tagCount} on map)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matching Users / Personnel */}
            {matchingSearchUsers.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-500" />
                  <span>Protest Personnel ({matchingSearchUsers.length})</span>
                </div>
                <div className="space-y-1">
                  {matchingSearchUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUserFromSearch(u)}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-100 transition flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0"
                          style={{ backgroundColor: u.avatarColor || "#4f46e5" }}
                        >
                          {u.displayName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                            <span>{u.displayName}</span>
                            <span className="text-[10px] font-normal text-slate-400">@{u.username}</span>
                          </div>
                          {u.tags && u.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {u.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                        {u.role}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Squads */}
            {matchingSearchGroups.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Flag className="w-3 h-3 text-amber-500" />
                  <span>Squads & Contingents</span>
                </div>
                <div className="space-y-1">
                  {matchingSearchGroups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleSelectGroupFromSearch(g)}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-100 transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: g.color }}
                        />
                        <span className="text-xs font-bold text-slate-800">{g.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {g.memberIds.length} members
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Geocoded Places */}
            {searchResults.length > 0 && (
              <div className="p-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>Places & Landmarks</span>
                </div>
                <div className="space-y-1">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-100 transition flex items-start gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {item.displayName.split(",")[0]}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {item.displayName}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchingSearchTags.length === 0 &&
              matchingSearchUsers.length === 0 &&
              matchingSearchGroups.length === 0 &&
              searchResults.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-500">
                  {isSearching ? "Searching locations & map entities..." : "No units, tags, or places found matching query."}
                </div>
              )}
          </div>
        )}

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
          {globalMarker && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleFlyToGlobalMarker}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-extrabold shadow-md hover:bg-amber-600 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>🚩 {globalMarker.title}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </button>
              {isAdminOrSuperAdmin && onClearGlobalMarker && (
                <button
                  onClick={async () => {
                    await onClearGlobalMarker();
                  }}
                  title="Remove Current Assembly Point"
                  className="p-1.5 rounded-full bg-white/95 text-rose-600 hover:bg-rose-50 border border-rose-200 shadow-md transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {isAdminOrSuperAdmin && !globalMarker && (
            <button
              onClick={() => {
                if (!clickedLocation) {
                  const center = mapInstanceRef.current?.getCenter();
                  const lat = center ? center.lat : (Number(currentUser?.location?.lat) || 25.5645);
                  const lng = center ? center.lng : (Number(currentUser?.location?.lng) || 84.8560);
                  setClickedLocation({ lat, lng, address: "Selected Central Coordinate" });
                }
                setIsQuickSetGlobalModalOpen(true);
              }}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-amber-600 text-white text-xs font-extrabold shadow-md hover:bg-amber-700 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Set Assembly Point</span>
            </button>
          )}

          <button
            onClick={() => {
              const map = mapInstanceRef.current;
              if (map) map.flyTo([25.5645, 84.8560], 17, { duration: 1.0 });
            }}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-xs font-bold text-slate-800 shadow-md hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center gap-1.5 shrink-0"
          >
            <span>🏛️ Devi Asthan</span>
          </button>

          <button
            onClick={handleFitAllUnits}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-xs font-bold text-slate-800 shadow-md hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center gap-1.5 shrink-0"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>All Units ({filteredUsers.length})</span>
          </button>
        </div>
      </div>

      {/* 3. Floating Action Controls (Right Column) */}
      <div className="absolute top-3 right-2 sm:right-3 z-30 flex flex-col gap-2 pointer-events-auto">
        <button
          id="gmaps-layer-switcher-btn"
          onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
          title="Change Map Layers"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition active:scale-95"
        >
          <Layers className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </button>

        <button
          id="gmaps-fit-all-btn"
          onClick={handleFitAllUnits}
          title="Fit All Units on Map"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition active:scale-95"
        >
          <Eye className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </button>

        <button
          id="gmaps-my-location-target-btn"
          onClick={handleCenterOnMyLocation}
          title="Re-center on My Real GPS Location"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 active:scale-95 transition group"
        >
          <Crosshair className="w-4.5 h-4.5 sm:w-5 sm:h-5 group-hover:rotate-45 transition-transform duration-300" />
        </button>

        <button
          id="gmaps-directions-diamond-btn"
          onClick={() => setIsRouteDrawerOpen(!isRouteDrawerOpen)}
          title="Open Turn-by-Turn Navigation & Routes"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white shadow-xl shadow-teal-500/30 flex items-center justify-center active:scale-95 transition hover:scale-105"
        >
          <Navigation className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-white" />
        </button>
      </div>

      {/* 4. Map Layer Selector Modal */}
      {isLayerMenuOpen && (
        <div className="absolute top-14 right-2 sm:right-3 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-3 w-[calc(100vw-20px)] max-w-xs sm:w-64 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Map Style & Imagery</span>
            </span>
            <button onClick={() => setIsLayerMenuOpen(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {MAP_LAYERS.map((layer) => {
              const isSelected = currentLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => handleSelectLayer(layer.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 leading-tight">{layer.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </div>
                  <span className="text-[9px] text-slate-500 leading-tight line-clamp-2">{layer.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Turn-by-Turn Route Navigation Drawer */}
      {isRouteDrawerOpen && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-6 sm:right-auto sm:w-96 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-3.5 sm:p-4 max-h-[72dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <RouteIcon className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Real Turn-by-Turn Navigation</h4>
            </div>
            <button
              onClick={handleClearRoute}
              className="text-slate-400 hover:text-slate-700 text-sm p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 mt-3">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span className="truncate">
                  {currentUser ? `Your Location (${currentUser.displayName})` : "Current GPS"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                <span className="truncate">
                  {selectedUser
                    ? `${selectedUser.displayName} (${selectedUser.role})`
                    : clickedLocation
                    ? clickedLocation.address
                    : "Target Coordinates"}
                </span>
              </div>
            </div>

            {isRouteCalculating ? (
              <div className="p-4 text-center text-xs text-slate-500 animate-pulse">
                Calculating fastest path via OpenStreetMap road network...
              </div>
            ) : activeRoute ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                  <div>
                    <div className="text-lg font-black text-blue-900">
                      {formatDuration(activeRoute.duration)}
                    </div>
                    <div className="text-xs text-blue-700 font-medium">
                      {formatDistance(activeRoute.distance)} via ground routing
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                    Optimal Route
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                Tap on any participant, marker, or assembly point to get direct road directions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Clicked Map Coordinate Inspection Card */}
      {clickedLocation && !isRouteDrawerOpen && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-6 sm:right-auto sm:w-96 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-3.5 sm:p-4 max-h-[72dvh] overflow-y-auto animate-in slide-in-from-bottom duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Inspection Pin</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-snug">{clickedLocation.address}</p>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                {clickedLocation.lat.toFixed(5)}, {clickedLocation.lng.toFixed(5)}
              </div>
            </div>

            <button
              onClick={() => setClickedLocation(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => handleCalculateRouteTo(clickedLocation.lat, clickedLocation.lng)}
              className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-200 transition cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Route Here</span>
            </button>

            {/* Tactical Dispatcher Button */}
            <button
              onClick={() => {
                setLongHoldLocation(clickedLocation);
                setIsTacticalDispatcherOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200 transition cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Dispatch Options</span>
            </button>

            {isAdminOrSuperAdmin && (
              <button
                onClick={() => {
                  setQuickGmTitle(globalMarker?.title || "Central Assembly Point");
                  setQuickGmDesc(globalMarker?.description || "All protest units and marchers converge here.");
                  setQuickGmTime(globalMarker?.targetTime || "15:30 PM");
                  setIsQuickSetGlobalModalOpen(true);
                }}
                className="col-span-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-200 transition cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{globalMarker ? "Move Assembly Point Here" : "Set Assembly Point Here"}</span>
              </button>
            )}

            {onUpdateCoordinates && (
              <button
                onClick={() => {
                  onUpdateCoordinates(clickedLocation.lat, clickedLocation.lng);
                  setClickedLocation(null);
                }}
                className="col-span-2 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Move My GPS Here (Testing)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. Selected Crowd User Card */}
      {selectedUser &&
        !clickedLocation &&
        !isRouteDrawerOpen && (
          <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-6 sm:right-auto sm:w-96 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3.5 sm:p-4 max-h-[60dvh] sm:max-h-[72dvh] overflow-y-auto animate-in slide-in-from-bottom duration-150 space-y-2.5 sm:space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0 border-2 border-indigo-500"
                  style={{ backgroundColor: selectedUser.avatarColor || "#4f46e5" }}
                >
                  {selectedUser.displayName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">
                      {!isAdminOrSuperAdmin &&
                      (selectedUser.role === "superadmin" ||
                        selectedUser.role === "admin" ||
                        selectedUser.role === "dispatcher")
                        ? "Command & Dispatch Hub"
                        : selectedUser.displayName}
                    </h4>
                    {selectedUser.movementStatus === "sos" && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-600 text-white animate-pulse">
                        SOS ALERT
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 capitalize flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-slate-700">
                      {!isAdminOrSuperAdmin &&
                      (selectedUser.role === "superadmin" ||
                        selectedUser.role === "admin" ||
                        selectedUser.role === "dispatcher")
                        ? "Official Coordination"
                        : selectedUser.role}
                    </span>
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
                onClick={() => onSelectUser(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Assigned Squad Badges (Visible to Admins or Self) */}
            {(isAdminOrSuperAdmin || currentUser?.id === selectedUser.id) &&
              selectedUser.groupIds &&
              selectedUser.groupIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {groups
                    .filter((g) => selectedUser.groupIds?.includes(g.id))
                    .map((g) => (
                      <span
                        key={g.id}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: g.color }}
                      >
                        {g.name}
                      </span>
                    ))}
                </div>
              )}

            {/* User Tags Display & Super Admin Quick Tag Toggles */}
            {isAdminOrSuperAdmin && (
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-indigo-500" />
                    <span>Assigned Tags</span>
                  </div>
                  {selectedUser.tags && selectedUser.tags.length > 0 && (
                    <span className="text-slate-400">({selectedUser.tags.length})</span>
                  )}
                </div>

                {selectedUser.tags && selectedUser.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200"
                      >
                        <span>#{tag}</span>
                        {isSuperAdmin && onRemoveUserTag && (
                          <button
                            onClick={() => onRemoveUserTag(selectedUser.id, tag)}
                            className="hover:text-rose-600 ml-0.5"
                            title="Remove tag"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No tags assigned yet.</p>
                )}

                {/* Super Admin Quick Add Available Tags */}
                {isSuperAdmin && availableTags.length > 0 && onAddUserTag && (
                  <div className="pt-1 border-t border-slate-200/60">
                    <span className="text-[9px] text-slate-400 block mb-1 font-medium">Quick add global tag:</span>
                    <div className="flex flex-wrap gap-1">
                      {availableTags
                        .filter((t) => !selectedUser.tags?.includes(t))
                        .map((tag) => (
                          <button
                            key={tag}
                            onClick={() => onAddUserTag(selectedUser.id, tag)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 text-[10px] font-medium transition"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>#{tag}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Assigned Post Objective Display */}
            {selectedUser.assignedPost && (isAdminOrSuperAdmin || currentUser?.id === selectedUser.id) && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-600" />
                    <span>Post: {selectedUser.assignedPost.title}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                      selectedUser.assignedPost.status === "reached"
                        ? "bg-emerald-600 text-white"
                        : selectedUser.assignedPost.status === "acknowledged"
                        ? "bg-blue-600 text-white"
                        : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {selectedUser.assignedPost.status}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800">{selectedUser.assignedPost.instructions}</p>

                {/* Status Update for Current User */}
                {currentUser?.id === selectedUser.id && onUpdateAssignmentStatus && (
                  <div className="pt-2 flex items-center gap-1.5">
                    {selectedUser.assignedPost.status === "pending" && (
                      <button
                        onClick={() => onUpdateAssignmentStatus("acknowledged")}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
                      >
                        Acknowledge Post
                      </button>
                    )}
                    {selectedUser.assignedPost.status !== "reached" && (
                      <button
                        onClick={() => onUpdateAssignmentStatus("reached")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mark as Reached</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions: Call, Message, and Route */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-slate-100">
              <button
                id="map-call-user-btn"
                onClick={() => onStartCall(selectedUser)}
                disabled={selectedUser.id === currentUser?.id || selectedUser.isBanned}
                className="py-2 px-1.5 sm:px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 shadow-md shadow-emerald-200 transition disabled:opacity-40 min-w-0"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{!isAdminOrSuperAdmin ? "Call Dispatch" : "Voice Call"}</span>
              </button>

              <button
                id="map-chat-user-btn"
                onClick={() => onStartChat(selectedUser)}
                className="py-2 px-1.5 sm:px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 shadow-md shadow-indigo-200 transition min-w-0"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Message</span>
              </button>

              <button
                id="map-route-user-btn"
                onClick={() =>
                  handleCalculateRouteTo(selectedUser.location.lat, selectedUser.location.lng)
                }
                className="py-2 px-1.5 sm:px-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 shadow-md shadow-blue-200 transition min-w-0"
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Route</span>
              </button>
            </div>

          {/* Admin: Assign Post Marker / Clear Post */}
          {isAdminOrSuperAdmin && (
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => handleOpenAssignModal(selectedUser)}
                className="flex-1 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 flex items-center justify-center gap-1 transition"
              >
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span>{selectedUser.assignedPost ? "Edit Post Marker" : "Assign Post Marker"}</span>
              </button>

              {selectedUser.assignedPost && onClearUserAssignment && (
                <button
                  onClick={() => onClearUserAssignment(selectedUser.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition"
                  title="Clear post assignment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 8. Global Assembly Point Details Card */}
      {isGlobalMarkerDetailsOpen && globalMarker && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-6 sm:right-auto sm:w-96 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-300 p-3.5 sm:p-4 max-h-[72dvh] overflow-y-auto animate-in slide-in-from-bottom duration-150 space-y-2.5 sm:space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md">
                🚩
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                  Global Assembly Beacon
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug mt-0.5">
                  {globalMarker.title}
                </h4>
              </div>
            </div>

            <button
              onClick={() => setIsGlobalMarkerDetailsOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70">
            {globalMarker.description}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-600 font-medium pt-1">
            {globalMarker.targetTime && (
              <span className="flex items-center gap-1 text-amber-800 font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Assemble by {globalMarker.targetTime}</span>
              </span>
            )}
            <span>Perimeter: {globalMarker.radius || 120}m</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                handleCalculateRouteTo(globalMarker.lat, globalMarker.lng);
                setIsGlobalMarkerDetailsOpen(false);
              }}
              className="col-span-2 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-200 transition"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Route to Assembly Point</span>
            </button>

            {isAdminOrSuperAdmin && (
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setClickedLocation({
                      lat: globalMarker.lat,
                      lng: globalMarker.lng,
                      address: globalMarker.title,
                    });
                    setQuickGmTitle(globalMarker.title);
                    setQuickGmDesc(globalMarker.description || "");
                    setQuickGmTime(globalMarker.targetTime || "");
                    setIsGlobalMarkerDetailsOpen(false);
                    setIsQuickSetGlobalModalOpen(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Edit Assembly Details</span>
                </button>

                {onClearGlobalMarker && (
                  <button
                    onClick={async () => {
                      await onClearGlobalMarker();
                      setIsGlobalMarkerDetailsOpen(false);
                    }}
                    className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Remove Global Assembly Point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Precision GPS Telemetry HUD */}
      <div className="absolute bottom-3 left-3 sm:left-4 z-20 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md text-slate-200 px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-[11px] font-mono flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isRealGpsActive
                ? (gpsAccuracy && gpsAccuracy < 10 ? "bg-emerald-400 animate-pulse" : "bg-cyan-400")
                : "bg-amber-400"
            }`}
          />
          <span className="font-semibold text-white">
            {isAcquiringGps
              ? "Locking GNSS..."
              : isRealGpsActive
              ? `GPS ±${Math.round(gpsAccuracy || 5)}m`
              : "Network Pos"}
          </span>
          {currentUser?.location?.speed !== undefined && currentUser.location.speed > 0.5 && (
            <>
              <span className="text-white/30">·</span>
              <span>{Math.round(currentUser.location.speed)} km/h</span>
            </>
          )}
          <button
            onClick={handleCenterOnMyLocation}
            disabled={isAcquiringGps}
            title="Force GNSS Satellite Re-lock & Center"
            className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 ml-1 transition cursor-pointer"
          >
            {isAcquiringGps ? "..." : "Sync"}
          </button>
        </div>
      </div>

      {/* 10. Situation Banner */}
      {isSituationBannerOpen &&
        !selectedUser &&
        !clickedLocation &&
        !isRouteDrawerOpen &&
        !isGlobalMarkerDetailsOpen && (
          <div className="absolute bottom-12 sm:bottom-4 left-2 right-2 sm:left-auto sm:right-4 sm:max-w-md z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3 sm:p-3.5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 leading-snug">
                    Protest Command Radar Active • Devi Asthan & Bihta Sectors
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                    {globalMarker
                      ? `Central assembly point active at ${globalMarker.title}. Tap beacon to view routes.`
                      : "Admins can tap any point or use top button to set assembly beacons."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSituationBannerOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      {/* MODAL: QUICK SET GLOBAL ASSEMBLY POINT */}
      {isQuickSetGlobalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-5 max-h-[92dvh] overflow-y-auto animate-in zoom-in-95 my-auto">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-md">
                🚩
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Set Global Protest Assembly Point
                </h3>
                <p className="text-[11px] text-slate-500">
                  Broadcast this map location as the central meeting point to all units.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitQuickGlobalMarker} className="space-y-3 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 flex items-center justify-between">
                <span>Coordinates:</span>
                <span className="font-bold text-slate-900">
                  {(clickedLocation?.lat ?? mapInstanceRef.current?.getCenter()?.lat ?? 25.5645).toFixed(5)},{" "}
                  {(clickedLocation?.lng ?? mapInstanceRef.current?.getCenter()?.lng ?? 84.8560).toFixed(5)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assembly Title</label>
                <input
                  type="text"
                  required
                  value={quickGmTitle}
                  onChange={(e) => setQuickGmTitle(e.target.value)}
                  placeholder="e.g. Central Rally Square"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assemble Time Target</label>
                <input
                  type="text"
                  value={quickGmTime}
                  onChange={(e) => setQuickGmTime(e.target.value)}
                  placeholder="e.g. 15:30 PM"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions for Units</label>
                <textarea
                  rows={2}
                  value={quickGmDesc}
                  onChange={(e) => setQuickGmDesc(e.target.value)}
                  placeholder="Arrival instructions, marshaling notes..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickSetGlobalModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-200 cursor-pointer"
                >
                  Broadcast Assembly
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK ASSIGN USER POST WAYPOINT (ADMIN) */}
      {isQuickAssignModalOpen && assignUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-5 max-h-[92dvh] overflow-y-auto animate-in zoom-in-95 my-auto">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base font-bold shadow-md">
                🎯
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Assign Post Marker to {assignUserTarget.displayName}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Set target post position and field instructions.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitQuickAssign} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Post / Objective Title</label>
                <input
                  type="text"
                  required
                  value={quickPostTitle}
                  onChange={(e) => setQuickPostTitle(e.target.value)}
                  placeholder="e.g. First Aid Station East Gate"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Field Directives</label>
                <textarea
                  rows={2}
                  value={quickPostInstructions}
                  onChange={(e) => setQuickPostInstructions(e.target.value)}
                  placeholder="e.g. Report to East Gate with medical kits and establish safe zone."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAssignModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200"
                >
                  Dispatch Post Marker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Selected Inspection Point Detail Card */}
      {selectedInspectionPoint && !isRouteDrawerOpen && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-6 sm:right-auto sm:w-96 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-3.5 sm:p-4 max-h-[72dvh] overflow-y-auto animate-in slide-in-from-bottom duration-150">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-base shadow-sm shrink-0 ${
                  selectedInspectionPoint.type === "medical"
                    ? "bg-rose-600"
                    : selectedInspectionPoint.type === "safe_corridor"
                    ? "bg-emerald-600"
                    : selectedInspectionPoint.type === "inspection"
                    ? "bg-amber-600"
                    : "bg-indigo-600"
                }`}
              >
                {selectedInspectionPoint.type === "medical"
                  ? "🩺"
                  : selectedInspectionPoint.type === "safe_corridor"
                  ? "🚶"
                  : selectedInspectionPoint.type === "inspection"
                  ? "👁️"
                  : "🛡️"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">
                    {selectedInspectionPoint.title}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">
                    {selectedInspectionPoint.type.replace("_", " ")}
                  </span>
                </div>
                {selectedInspectionPoint.notes && (
                  <p className="text-xs text-slate-600 mt-1 leading-snug">
                    {selectedInspectionPoint.notes}
                  </p>
                )}
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  Coords: {selectedInspectionPoint.lat.toFixed(5)}, {selectedInspectionPoint.lng.toFixed(5)}
                  {selectedInspectionPoint.createdBy && ` • By ${selectedInspectionPoint.createdBy}`}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedInspectionPoint(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={() =>
                handleCalculateRouteTo(selectedInspectionPoint.lat, selectedInspectionPoint.lng)
              }
              className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-200 transition cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Route Here</span>
            </button>

            <button
              onClick={() => {
                setLongHoldLocation({
                  lat: selectedInspectionPoint.lat,
                  lng: selectedInspectionPoint.lng,
                  address: selectedInspectionPoint.title,
                });
                setIsTacticalDispatcherOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200 transition cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Dispatcher Hub</span>
            </button>

            {onDeleteInspectionPoint && (
              <button
                onClick={async () => {
                  await onDeleteInspectionPoint(selectedInspectionPoint.id);
                  setSelectedInspectionPoint(null);
                }}
                className="col-span-2 py-1.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Inspection Checkpoint</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 9. TACTICAL MAP DISPATCHER MODAL (Long-Hold Menu) */}
      <TacticalMapDispatcherModal
        location={longHoldLocation}
        isOpen={isTacticalDispatcherOpen}
        onClose={() => {
          setIsTacticalDispatcherOpen(false);
          if (longHoldMarkerRef.current) {
            longHoldMarkerRef.current.remove();
            longHoldMarkerRef.current = null;
          }
        }}
        currentUser={currentUser}
        users={users}
        groups={groups}
        globalMarker={globalMarker}
        inspectionPoints={inspectionPoints}
        onSetGlobalMarker={onSetGlobalMarker || (async () => {})}
        onClearGlobalMarker={onClearGlobalMarker || (async () => {})}
        onAddInspectionPoint={onAddInspectionPoint || (async () => {})}
        onMoveInspectionPoint={onMoveInspectionPoint || (async () => {})}
        onDeleteInspectionPoint={onDeleteInspectionPoint || (async () => {})}
        onAssignUserDestination={
          onAssignUserMarker ||
          (async () => {})
        }
        onAssignGroupDestination={
          onAssignGroupDestination ||
          (async () => {})
        }
        onStartCallWithUser={onStartCall}
        onStartCallWithGroup={onStartGroupCall}
        onCalculateRouteHere={handleCalculateRouteTo}
      />
    </div>
  );
};
