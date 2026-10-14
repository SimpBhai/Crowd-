import React, { useState, useEffect } from "react";
import {
  MapPin,
  Flag,
  Search,
  Navigation,
  Shield,
  Users,
  User,
  Crosshair,
  CheckCircle2,
  Trash2,
  Phone,
  Radio,
  X,
  Plus,
  ArrowRight,
  HeartPulse,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  UserRecord,
  ProtestGroup,
  GlobalMarker,
  InspectionPoint,
  UserAssignment,
} from "../../types";

interface TacticalMapDispatcherModalProps {
  location: {
    lat: number;
    lng: number;
    address: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserRecord | null;
  users: UserRecord[];
  groups: ProtestGroup[];
  globalMarker: GlobalMarker | null;
  inspectionPoints: InspectionPoint[];
  onSetGlobalMarker: (data: {
    title: string;
    description: string;
    lat: number;
    lng: number;
    radius?: number;
    targetTime?: string;
  }) => Promise<void>;
  onClearGlobalMarker: () => Promise<void>;
  onAddInspectionPoint: (data: {
    title: string;
    notes?: string;
    type: InspectionPoint["type"];
    lat: number;
    lng: number;
  }) => Promise<void>;
  onMoveInspectionPoint: (id: string, lat: number, lng: number) => Promise<void>;
  onDeleteInspectionPoint: (id: string) => Promise<void>;
  onAssignUserDestination: (
    userId: string,
    data: {
      title: string;
      instructions: string;
      lat: number;
      lng: number;
    }
  ) => Promise<void>;
  onAssignGroupDestination: (
    groupId: string,
    data: {
      label: string;
      lat: number;
      lng: number;
      assignAllMembers?: boolean;
    }
  ) => Promise<void>;
  onStartCallWithUser?: (user: UserRecord) => void;
  onStartCallWithGroup?: (group: ProtestGroup) => void;
  onCalculateRouteHere?: (lat: number, lng: number) => void;
}

type DispatchTab = "assembly" | "inspections" | "destination";

export const TacticalMapDispatcherModal: React.FC<TacticalMapDispatcherModalProps> = ({
  location,
  isOpen,
  onClose,
  currentUser,
  users,
  groups,
  globalMarker,
  inspectionPoints,
  onSetGlobalMarker,
  onClearGlobalMarker,
  onAddInspectionPoint,
  onMoveInspectionPoint,
  onDeleteInspectionPoint,
  onAssignUserDestination,
  onAssignGroupDestination,
  onStartCallWithUser,
  onStartCallWithGroup,
  onCalculateRouteHere,
}) => {
  const [activeTab, setActiveTab] = useState<DispatchTab>("assembly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Assembly Form State
  const [assemblyTitle, setAssemblyTitle] = useState(globalMarker?.title || "Main Protest Assembly Point");
  const [assemblyDesc, setAssemblyDesc] = useState(globalMarker?.description || "All protest units and marchers converge at this central hub.");
  const [assemblyRadius, setAssemblyRadius] = useState(globalMarker?.radius || 150);
  const [assemblyTime, setAssemblyTime] = useState(globalMarker?.targetTime || "15:00 PM");

  useEffect(() => {
    if (globalMarker) {
      setAssemblyTitle(globalMarker.title);
      setAssemblyDesc(globalMarker.description || "All protest units and marchers converge at this central hub.");
      setAssemblyRadius(globalMarker.radius || 150);
      setAssemblyTime(globalMarker.targetTime || "15:00 PM");
    }
  }, [globalMarker]);

  // 2. Inspection Points State
  const [inspectionTitle, setInspectionTitle] = useState("North Checkpoint Alpha");
  const [inspectionType, setInspectionType] = useState<InspectionPoint["type"]>("checkpoint");
  const [inspectionNotes, setInspectionNotes] = useState("Monitor perimeter entry and ensure peace.");
  const [selectedExistingPointId, setSelectedExistingPointId] = useState<string>(
    inspectionPoints[0]?.id || ""
  );

  // 3. User & Group Destination State
  const [destTargetMode, setDestTargetMode] = useState<"user" | "group">("user");
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users.find((u) => u.id !== currentUser?.id)?.id || users[0]?.id || ""
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || "");
  const [destTitle, setDestTitle] = useState("Designated Tactical Waypoint");
  const [destInstructions, setDestInstructions] = useState("Proceed immediately to this designated coordinate.");
  const [assignAllSquadMembers, setAssignAllSquadMembers] = useState(true);

  if (!isOpen || !location) return null;

  const lat = location.lat;
  const lng = location.lng;

  // Handlers
  const handleMoveAssemblyPoint = async () => {
    setIsSubmitting(true);
    try {
      await onSetGlobalMarker({
        title: assemblyTitle.trim() || "Main Protest Assembly Point",
        description: assemblyDesc.trim(),
        lat,
        lng,
        radius: Number(assemblyRadius) || 120,
        targetTime: assemblyTime.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewInspection = async () => {
    setIsSubmitting(true);
    try {
      await onAddInspectionPoint({
        title: inspectionTitle.trim() || "Inspection Post",
        notes: inspectionNotes.trim(),
        type: inspectionType,
        lat,
        lng,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveExistingInspection = async () => {
    if (!selectedExistingPointId) return;
    setIsSubmitting(true);
    try {
      await onMoveInspectionPoint(selectedExistingPointId, lat, lng);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinDestination = async () => {
    setIsSubmitting(true);
    try {
      if (destTargetMode === "user") {
        if (!selectedUserId) return;
        await onAssignUserDestination(selectedUserId, {
          title: destTitle.trim() || "Designated Post",
          instructions: destInstructions.trim() || "Report to designated waypoint.",
          lat,
          lng,
        });
      } else {
        if (!selectedGroupId) return;
        await onAssignGroupDestination(selectedGroupId, {
          label: destTitle.trim() || "Squad Waypoint",
          lat,
          lng,
          assignAllMembers: assignAllSquadMembers,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetUserObj = users.find((u) => u.id === selectedUserId);
  const targetGroupObj = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 flex flex-col max-h-[92dvh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-2">
                <span>Tactical Map Dispatcher</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  Long-Hold
                </span>
              </h3>
              <p className="text-xs text-slate-300 truncate max-w-xs sm:max-w-md">
                📍 {location.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Coordinates Sub-bar */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="font-bold text-slate-900">COORDS:</span>
            <span>{lat.toFixed(6)}, {lng.toFixed(6)}</span>
          </div>
          {onCalculateRouteHere && (
            <button
              onClick={() => {
                onCalculateRouteHere(lat, lng);
                onClose();
              }}
              className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold flex items-center gap-1 transition"
            >
              <Navigation className="w-3 h-3" />
              <span>Route Here</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="p-2 sm:p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("assembly")}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "assembly"
                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="truncate">1. Assembly Point</span>
          </button>

          <button
            onClick={() => setActiveTab("inspections")}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "inspections"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="truncate">2. Inspection Points</span>
          </button>

          <button
            onClick={() => setActiveTab("destination")}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === "destination"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">3. Pin Destination</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: MAIN SINGLE ASSEMBLY POINT */}
          {activeTab === "assembly" && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <h4 className="font-extrabold text-amber-950 text-sm">
                      Main Single Assembly Hub
                    </h4>
                    <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                      Move the primary rally point to these held coordinates. All participants and field squads receive updated convergence coordinates in real-time.
                    </p>
                    {globalMarker ? (
                      <div className="mt-2 text-[11px] font-semibold text-amber-900 bg-white/80 p-2 rounded-xl border border-amber-200">
                        Current: <strong>{globalMarker.title}</strong> ({globalMarker.lat.toFixed(4)}, {globalMarker.lng.toFixed(4)})
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-amber-700 italic">
                        No active assembly point currently configured.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assembly Point Title
                  </label>
                  <input
                    type="text"
                    value={assemblyTitle}
                    onChange={(e) => setAssemblyTitle(e.target.value)}
                    placeholder="e.g. Central Rally Plaza / Main Stage"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description & Instructions for Marchers
                  </label>
                  <textarea
                    rows={2}
                    value={assemblyDesc}
                    onChange={(e) => setAssemblyDesc(e.target.value)}
                    placeholder="e.g. Converge peacefully, keep emergency medical lane open along the west sidewalk."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Perimeter Radius (Meters)
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={2000}
                      step={25}
                      value={assemblyRadius}
                      onChange={(e) => setAssemblyRadius(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Assembly Time
                    </label>
                    <input
                      type="text"
                      value={assemblyTime}
                      onChange={(e) => setAssemblyTime(e.target.value)}
                      placeholder="e.g. 14:30 PM"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleMoveAssemblyPoint}
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-amber-200 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Flag className="w-4 h-4" />
                    <span>{globalMarker ? "Move Assembly Point Here" : "Set Assembly Point Here"}</span>
                  </button>

                  {globalMarker && (
                    <button
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          await onClearGlobalMarker();
                          onClose();
                        } catch (e) {
                          console.warn("Failed clearing assembly point:", e);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      className="py-3 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Clear Assembly Point"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTIPLE INSPECTION POINTS */}
          {activeTab === "inspections" && (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 rounded-2xl border border-indigo-200 p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <h4 className="font-extrabold text-indigo-950 text-sm">
                      Multiple Inspection Points & Checkpoints
                    </h4>
                    <p className="text-indigo-800/90 mt-0.5 leading-relaxed">
                      Deploy multiple checkpoints, medical stations, or safe exit corridors across the tactical map, or move existing points to this held location.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action 1: Add New Inspection Point */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Pin New Inspection Point Here</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectionType("checkpoint")}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      inspectionType === "checkpoint"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Checkpoint</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectionType("medical")}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      inspectionType === "medical"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Medical Aid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectionType("safe_corridor")}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      inspectionType === "safe_corridor"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Safe Corridor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectionType("inspection")}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      inspectionType === "inspection"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Observation Post</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Inspection Point Title
                  </label>
                  <input
                    type="text"
                    value={inspectionTitle}
                    onChange={(e) => setInspectionTitle(e.target.value)}
                    placeholder="e.g. East Gate Checkpoint"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Notes / Instructions
                  </label>
                  <input
                    type="text"
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="e.g. Inspect banner poles, verify first-aid supplies"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <button
                  onClick={handleAddNewInspection}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Pin New Inspection Point Here</span>
                </button>
              </div>

              {/* Action 2: Move Existing Inspection Point (if any) */}
              {inspectionPoints.length > 0 && (
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Or Move An Existing Point Here:
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {inspectionPoints.length} active
                    </span>
                  </div>

                  <select
                    value={selectedExistingPointId}
                    onChange={(e) => setSelectedExistingPointId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium outline-none"
                  >
                    {inspectionPoints.map((ip) => (
                      <option key={ip.id} value={ip.id}>
                        {ip.title} ({ip.type.toUpperCase()}) — at {ip.lat.toFixed(4)}, {ip.lng.toFixed(4)}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMoveExistingInspection}
                      disabled={isSubmitting || !selectedExistingPointId}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Move Selected Point Here</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (!selectedExistingPointId) return;
                        setIsSubmitting(true);
                        await onDeleteInspectionPoint(selectedExistingPointId);
                        setIsSubmitting(false);
                      }}
                      className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs transition"
                      title="Delete Selected Inspection Point"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EACH USER DESTINATION POINT OR GROUP DESTINATION POINT */}
          {activeTab === "destination" && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <h4 className="font-extrabold text-emerald-950 text-sm">
                      Pin Specific Destination Point
                    </h4>
                    <p className="text-emerald-800/90 mt-0.5 leading-relaxed">
                      Select any field user or entire squad/group and pin this specific destination waypoint for them on the tactical radar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode Toggle: User vs Group */}
              <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setDestTargetMode("user")}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                    destTargetMode === "user"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Specific User</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDestTargetMode("group")}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                    destTargetMode === "group"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Squad / Group</span>
                </button>
              </div>

              {/* User Selection */}
              {destTargetMode === "user" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Target Field User
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} ({u.role.toUpperCase()}) — {u.isOnline ? "🟢 Online" : "⚪ Standby"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetUserObj && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                          style={{ backgroundColor: targetUserObj.avatarColor || "#4f46e5" }}
                        >
                          {targetUserObj.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {targetUserObj.displayName}
                          </div>
                          <div className="text-[10px] text-slate-500 capitalize">
                            Current: {targetUserObj.location.lat.toFixed(4)}, {targetUserObj.location.lng.toFixed(4)}
                          </div>
                        </div>
                      </div>

                      {onStartCallWithUser && targetUserObj.id !== currentUser?.id && (
                        <button
                          onClick={() => {
                            onStartCallWithUser(targetUserObj);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call User</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Group Selection */}
              {destTargetMode === "group" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Target Squad / Group
                    </label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.memberIds.length} members)
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetGroupObj && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs"
                          style={{ backgroundColor: targetGroupObj.color || "#10b981" }}
                        >
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {targetGroupObj.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {targetGroupObj.memberIds.length} registered units
                          </div>
                        </div>
                      </div>

                      {onStartCallWithGroup && (
                        <button
                          onClick={() => {
                            onStartCallWithGroup(targetGroupObj);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call Squad</span>
                        </button>
                      )}
                    </div>
                  )}

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignAllSquadMembers}
                      onChange={(e) => setAssignAllSquadMembers(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Also update individual waypoint assignments for all squad members</span>
                  </label>
                </div>
              )}

              {/* Waypoint Title & Instructions */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination Waypoint Name
                  </label>
                  <input
                    type="text"
                    value={destTitle}
                    onChange={(e) => setDestTitle(e.target.value)}
                    placeholder="e.g. North Gate Standby Point"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tactical Instructions
                  </label>
                  <input
                    type="text"
                    value={destInstructions}
                    onChange={(e) => setDestInstructions(e.target.value)}
                    placeholder="e.g. Report here immediately and maintain safety line"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <button
                  onClick={handlePinDestination}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <MapPin className="w-4 h-4" />
                  <span>
                    Pin Destination for{" "}
                    {destTargetMode === "user"
                      ? targetUserObj?.displayName || "User"
                      : targetGroupObj?.name || "Squad"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-400">
            Click & Long-Hold anywhere on map to reposition
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
