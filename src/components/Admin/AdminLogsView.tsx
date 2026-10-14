import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  UserX,
  UserCheck,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  Info,
  Clock,
  Download,
  Flame,
  Plus,
  Trash2,
  Edit3,
  Check,
  Crosshair,
  Navigation,
  Compass,
  Radio,
  Eye,
  Flag,
  MapPin,
  Users,
  Target,
  Phone,
  Battery,
  Zap,
  Tag,
  Hash,
  UserPlus,
  Lock,
  Key,
  Shield,
} from "lucide-react";
import {
  SystemAuditLog,
  UserRecord,
  GlobalMarker,
  UserAssignment,
  ProtestGroup,
  UserRole,
  MovementStatus,
} from "../../types";

interface AdminLogsViewProps {
  currentUser: UserRecord | null;
  users: UserRecord[];
  logs: SystemAuditLog[];
  globalMarker: GlobalMarker | null;
  assignments: UserAssignment[];
  groups: ProtestGroup[];
  availableTags?: string[];
  onBanUser: (targetUserId: string, reason: string) => Promise<void>;
  onUnbanUser: (targetUserId: string) => Promise<void>;
  onRefreshLogs: () => void;
  onSetGlobalMarker: (data: {
    title: string;
    description: string;
    lat: number;
    lng: number;
    radius?: number;
    targetTime?: string;
  }) => Promise<void>;
  onClearGlobalMarker: () => Promise<void>;
  onAssignUserMarker: (
    targetUserId: string,
    data: { title: string; instructions: string; lat: number; lng: number }
  ) => Promise<void>;
  onClearUserAssignment: (userId: string) => Promise<void>;
  onCreateGroup: (data: {
    name: string;
    description: string;
    color: string;
    icon?: string;
    leaderUserId?: string;
    rallyPoint?: { lat: number; lng: number; label: string };
    memberIds?: string[];
  }) => Promise<void>;
  onUpdateGroup: (groupId: string, data: any) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onUpdateGroupMembers: (groupId: string, memberIds: string[]) => Promise<void>;
  onCreateUser?: (data: {
    displayName: string;
    username?: string;
    password?: string;
    role: UserRole;
    tags?: string[];
    description?: string;
    phoneOrContact?: string;
  }) => Promise<any>;
  onStartCall: (user: UserRecord) => void;
  onStartGroupCall?: (group: ProtestGroup) => void;
  onLocateOnMap: (lat: number, lng: number) => void;
  onCreateTag?: (tag: string) => Promise<void>;
  onDeleteTag?: (tag: string) => Promise<void>;
  onAddUserTag?: (userId: string, tag: string) => Promise<void>;
  onRemoveUserTag?: (userId: string, tag: string) => Promise<void>;
}

const VIOLATION_REASONS = [
  "GPS Teleportation & Location Spoofing Violation",
  "Harassment or Abusive Broadcast Communication",
  "Spamming Emergency Alert / False SOS Signal",
  "Community Guidelines Safety Breach",
  "Unauthorized Area Trespass / Geofence Breach",
];

const PRESET_SQUAD_COLORS = [
  "#dc2626", // Red / First Aid
  "#ea580c", // Orange / Marshals
  "#d97706", // Amber / Logistics
  "#059669", // Emerald / Legal
  "#0284c7", // Sky Blue / Comms
  "#4f46e5", // Indigo / Core
  "#7c3aed", // Violet / Media
  "#db2777", // Pink / Peace Keepers
];

const SUGGESTED_PROTEST_TAGS = [
  "First Aid",
  "Marshal",
  "Legal Observer",
  "Medic",
  "Food & Water",
  "Peacekeeper",
  "Media",
  "Bicycle Scout",
  "Tech & Comms",
  "De-escalation",
  "Banner Lead",
  "Logistics",
];

export const AdminLogsView: React.FC<AdminLogsViewProps> = ({
  currentUser,
  users,
  logs,
  globalMarker,
  assignments,
  groups,
  availableTags = [],
  onBanUser,
  onUnbanUser,
  onRefreshLogs,
  onSetGlobalMarker,
  onClearGlobalMarker,
  onAssignUserMarker,
  onClearUserAssignment,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateGroupMembers,
  onCreateUser,
  onStartCall,
  onStartGroupCall,
  onLocateOnMap,
  onCreateTag,
  onDeleteTag,
  onAddUserTag,
  onRemoveUserTag,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "oversight" | "markers" | "groups" | "tags" | "logs" | "users"
  >("oversight");
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [newCustomTag, setNewCustomTag] = useState("");
  const [selectedTagForAssign, setSelectedTagForAssign] = useState<string | null>(null);
  const [userTagSearch, setUserTagSearch] = useState("");

  // Create User / Provision Account Modal State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createUserName, setCreateUserName] = useState("");
  const [createUserUsername, setCreateUserUsername] = useState("");
  const [createUserPassword, setCreateUserPassword] = useState("");
  const [createUserRole, setCreateUserRole] = useState<UserRole>("participant");
  const [createUserTags, setCreateUserTags] = useState<string[]>([]);
  const [createUserDesc, setCreateUserDesc] = useState("");
  const [createUserContact, setCreateUserContact] = useState("");
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

  // Global Marker Form Modal
  const [isGlobalMarkerModalOpen, setIsGlobalMarkerModalOpen] = useState(false);
  const [gmTitle, setGmTitle] = useState(globalMarker?.title || "Central Protest Assembly Point");
  const [gmDesc, setGmDesc] = useState(
    globalMarker?.description || "All marching contingents assemble here by designated target time."
  );
  const [gmLat, setGmLat] = useState(globalMarker?.lat ? String(globalMarker.lat) : "25.5645");
  const [gmLng, setGmLng] = useState(globalMarker?.lng ? String(globalMarker.lng) : "84.8560");
  const [gmRadius, setGmRadius] = useState(globalMarker?.radius ? String(globalMarker.radius) : "150");
  const [gmTargetTime, setGmTargetTime] = useState(globalMarker?.targetTime || "15:30 PM");

  // Keep modal inputs in sync whenever globalMarker updates from server/WS
  useEffect(() => {
    if (globalMarker) {
      setGmTitle(globalMarker.title);
      setGmDesc(globalMarker.description || "");
      setGmLat(String(globalMarker.lat));
      setGmLng(String(globalMarker.lng));
      setGmRadius(String(globalMarker.radius || 150));
      setGmTargetTime(globalMarker.targetTime || "15:30 PM");
    }
  }, [globalMarker]);

  // User Assignment Form Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignInstructions, setAssignInstructions] = useState("");
  const [assignLat, setAssignLat] = useState("25.5645");
  const [assignLng, setAssignLng] = useState("84.8560");

  // Create Group Modal
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupColor, setGroupColor] = useState(PRESET_SQUAD_COLORS[0]);
  const [groupLeaderId, setGroupLeaderId] = useState("");
  const [groupRallyLabel, setGroupRallyLabel] = useState("");
  const [groupRallyLat, setGroupRallyLat] = useState("25.5645");
  const [groupRallyLng, setGroupRallyLng] = useState("84.8560");

  // Manage Group Members Modal
  const [managingGroup, setManagingGroup] = useState<ProtestGroup | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // Ban Modal State
  const [banModalTarget, setBanModalTarget] = useState<UserRecord | null>(null);
  const [customBanReason, setCustomBanReason] = useState(VIOLATION_REASONS[0]);
  const [banLoading, setBanLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const isSuperAdmin = currentUser?.role === "superadmin";
  const isAdminOrSuperAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    if (selectedLogLevel !== "all" && log.level !== selectedLogLevel) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchUser = log.username?.toLowerCase().includes(q);
      if (!matchAction && !matchDetails && !matchUser) return false;
    }
    return true;
  });

  // Filtered Users for Personnel Radar
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (groupFilter !== "all") {
      if (!u.groupIds || !u.groupIds.includes(groupFilter)) return false;
    }
    if (searchFilter.trim()) {
      const rawQ = searchFilter.trim().toLowerCase();
      const q = rawQ.startsWith("#") ? rawQ.substring(1).trim() : rawQ;
      const matchName = u.displayName.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchRole = u.role.toLowerCase().includes(q);
      const matchPost = u.assignedPost?.title.toLowerCase().includes(q);
      const matchTags = u.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchUser && !matchRole && !matchPost && !matchTags) return false;
    }
    return true;
  });

  // Handlers
  const handleSaveGlobalMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(gmLat);
    const lng = parseFloat(gmLng);
    const radius = parseFloat(gmRadius) || 120;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setActionFeedback({ message: "Please enter valid numeric latitude and longitude coordinates.", isError: true });
      return;
    }
    await onSetGlobalMarker({
      title: gmTitle.trim() || "Global Assembly Point",
      description: gmDesc.trim(),
      lat,
      lng,
      radius,
      targetTime: gmTargetTime.trim() || undefined,
    });
    setIsGlobalMarkerModalOpen(false);
    setActionFeedback({ message: `Global Assembly Point "${gmTitle.trim() || "Assembly Point"}" established successfully.` });
  };

  const handleSaveUserAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      setActionFeedback({ message: "Please select a target user to assign.", isError: true });
      return;
    }
    const lat = parseFloat(assignLat);
    const lng = parseFloat(assignLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setActionFeedback({ message: "Please enter valid numeric coordinates for this waypoint.", isError: true });
      return;
    }
    await onAssignUserMarker(targetUserId, {
      title: assignTitle.trim() || "Field Post",
      instructions: assignInstructions.trim() || "Report to this position.",
      lat,
      lng,
    });
    setIsAssignModalOpen(false);
    setAssignTitle("");
    setAssignInstructions("");
    setActionFeedback({ message: "Tactical post assigned successfully." });
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setCreateUserSuccess(null);

    if (!createUserName.trim()) {
      setCreateUserError("Full Display Name is required.");
      return;
    }
    if (!createUserPassword.trim() || createUserPassword.length < 4) {
      setCreateUserError("Password must be at least 4 characters.");
      return;
    }

    setCreateUserLoading(true);
    try {
      if (onCreateUser) {
        await onCreateUser({
          displayName: createUserName.trim(),
          username: createUserUsername.trim() || undefined,
          password: createUserPassword.trim(),
          role: createUserRole,
          tags: createUserTags,
          description: createUserDesc.trim() || undefined,
          phoneOrContact: createUserContact.trim() || undefined,
        });
        setCreateUserSuccess(`Account for "${createUserName}" created successfully!`);
        setTimeout(() => {
          setIsCreateUserModalOpen(false);
          setCreateUserName("");
          setCreateUserUsername("");
          setCreateUserPassword("");
          setCreateUserRole("participant");
          setCreateUserTags([]);
          setCreateUserDesc("");
          setCreateUserContact("");
          setCreateUserSuccess(null);
          setCreateUserError(null);
        }, 1200);
      }
    } catch (err: any) {
      setCreateUserError(err.message || "Failed to create user account.");
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleToggleCreateUserTag = (tag: string) => {
    setCreateUserTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleOpenAssignModalForUser = (user: UserRecord) => {
    setTargetUserId(user.id);
    setAssignTitle(user.assignedPost?.title || `Station Post: ${user.displayName.split(" ")[0]}`);
    setAssignInstructions(user.assignedPost?.instructions || "Maintain station and provide telemetry updates.");
    setAssignLat(String(user.assignedPost?.lat ?? user.location.lat));
    setAssignLng(String(user.assignedPost?.lng ?? user.location.lng));
    setIsAssignModalOpen(true);
  };

  const handleSaveCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setActionFeedback({ message: "Group name is required.", isError: true });
      return;
    }
    const rLat = parseFloat(groupRallyLat);
    const rLng = parseFloat(groupRallyLng);
    const hasRally = Number.isFinite(rLat) && Number.isFinite(rLng) && groupRallyLabel.trim();

    await onCreateGroup({
      name: groupName.trim(),
      description: groupDesc.trim(),
      color: groupColor,
      leaderUserId: groupLeaderId || undefined,
      rallyPoint: hasRally
        ? {
            lat: rLat,
            lng: rLng,
            label: groupRallyLabel.trim(),
          }
        : undefined,
    });
    setIsCreateGroupModalOpen(false);
    setGroupName("");
    setGroupDesc("");
    setGroupLeaderId("");
    setGroupRallyLabel("");
    setActionFeedback({ message: `Squad "${groupName.trim()}" created successfully.` });
  };

  const handleOpenManageMembers = (group: ProtestGroup) => {
    setManagingGroup(group);
    setSelectedMemberIds([...group.memberIds]);
    setMemberSearch("");
  };

  const handleToggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveGroupMembers = async () => {
    if (!managingGroup) return;
    await onUpdateGroupMembers(managingGroup.id, selectedMemberIds);
    setManagingGroup(null);
    setActionFeedback({ message: `Squad membership for "${managingGroup.name}" updated.` });
  };

  const handleConfirmBan = async () => {
    if (!banModalTarget) return;
    setBanLoading(true);
    try {
      await onBanUser(banModalTarget.id, customBanReason);
      setBanModalTarget(null);
      setActionFeedback({ message: `User ${banModalTarget.displayName} has been suspended.` });
    } catch (err: any) {
      setActionFeedback({ message: err.message || "Failed to ban user", isError: true });
    } finally {
      setBanLoading(false);
    }
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system_audit_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogLevelBadge = (level: SystemAuditLog["level"]) => {
    switch (level) {
      case "emergency":
        return "bg-rose-600 text-white font-bold animate-pulse";
      case "violation":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "warning":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Metrics
  const onlineCount = users.filter((u) => u.isOnline).length;
  const sosCount = users.filter((u) => u.movementStatus === "sos").length;
  const movingCount = users.filter(
    (u) =>
      u.isOnline &&
      (u.movementStatus === "walking" ||
        u.movementStatus === "running" ||
        u.movementStatus === "in_transit")
  ).length;
  const assignedCount = users.filter((u) => !!u.assignedPost).length;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-3 sm:p-6 pb-12">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between shadow-sm animate-in fade-in ${
              actionFeedback.isError
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <span className="font-semibold">{actionFeedback.message}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-700 ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Title & Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-sm">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{isSuperAdmin ? "Protest Command Center (Super Admin)" : "Admin Dispatch Center"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Oversight 100%
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time participant radar, global assembly beacons, squad management, and field assignments.
                </p>
              </div>
            </div>
          </div>

          {/* Sub Navigation Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar max-w-full shrink-0">
            <button
              id="admin-subtab-oversight"
              onClick={() => setActiveSubTab("oversight")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                activeSubTab === "oversight"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>All Users Radar ({users.length})</span>
            </button>

            <button
              id="admin-subtab-markers"
              onClick={() => setActiveSubTab("markers")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                activeSubTab === "markers"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span>Assembly & Markers</span>
              {globalMarker && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
            </button>

            <button
              id="admin-subtab-groups"
              onClick={() => setActiveSubTab("groups")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                activeSubTab === "groups"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Squads ({groups.length})</span>
            </button>

            <button
              id="admin-subtab-tags"
              onClick={() => setActiveSubTab("tags")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                activeSubTab === "tags"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tags ({availableTags.length})</span>
            </button>

            <button
              id="admin-subtab-logs"
              onClick={() => setActiveSubTab("logs")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                activeSubTab === "logs"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Logs</span>
            </button>

            <button
              id="admin-subtab-users"
              onClick={() => setActiveSubTab("users")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                activeSubTab === "users"
                  ? "bg-white text-rose-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-rose-500" />
              <span>Bans ({users.filter((u) => u.isBanned).length})</span>
            </button>

            {isSuperAdmin && (
              <button
                id="admin-subtab-register"
                onClick={() => {
                  setIsCreateUserModalOpen(true);
                  setCreateUserError(null);
                  setCreateUserSuccess(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Register User (Super Admin)</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Key Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Registered Units</div>
              <div className="text-lg font-extrabold text-slate-900 leading-tight">
                {users.length} <span className="text-xs font-normal text-slate-400">({onlineCount} live)</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Units In Movement</div>
              <div className="text-lg font-extrabold text-slate-900 leading-tight">
                {movingCount}
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Assigned Waypoints</div>
              <div className="text-lg font-extrabold text-slate-900 leading-tight">
                {assignedCount}
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Active SOS Alerts</div>
              <div className="text-lg font-extrabold text-rose-600 leading-tight">
                {sosCount}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SUBTAB 1: COMPLETE FIELD PERSONNEL RADAR (ALL USERS) */}
        {/* ======================================================== */}
        {activeSubTab === "oversight" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
            {/* Oversight Reassurance Banner */}
            <div className="p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold">Command Radar Oversight Active:</span>
                <span className="text-slate-300">
                  You are viewing all {users.length} registered field units with real-time GPS telemetry and battery status.
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Lat/Lng bounds synchronized with map engine
              </div>
            </div>

            {/* Filter Bar for Personnel */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search name, role, squad, post..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="all">All Roles</option>
                  <option value="superadmin">Super Admins</option>
                  <option value="admin">Admins</option>
                  <option value="dispatcher">Dispatchers</option>
                  <option value="volunteer">Responders</option>
                  <option value="participant">Participants</option>
                </select>

                {/* Group Filter */}
                {groups.length > 0 && (
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium"
                  >
                    <option value="all">All Protest Squads</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <strong className="text-slate-900">{filteredUsers.length}</strong> of {users.length} units
                </div>

                {isSuperAdmin && (
                  <button
                    id="open-create-user-modal-btn"
                    onClick={() => {
                      setIsCreateUserModalOpen(true);
                      setCreateUserError(null);
                      setCreateUserSuccess(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register New Account</span>
                  </button>
                )}
              </div>
            </div>

            {/* Personnel List */}
            <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  No participants matching current search parameters.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const userSquads = groups.filter((g) => u.groupIds?.includes(g.id));
                  const isSos = u.movementStatus === "sos";

                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 hover:bg-slate-50/90 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs ${
                        isSos ? "bg-rose-50/50" : u.isBanned ? "bg-slate-100/60 opacity-60" : ""
                      }`}
                    >
                      {/* User Info & Identity */}
                      <div className="flex items-start sm:items-center gap-3 min-w-[260px]">
                        <div className="relative shrink-0">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xs border-2 border-white"
                            style={{ backgroundColor: u.avatarColor || "#4f46e5" }}
                          >
                            {u.displayName.charAt(0)}
                          </div>
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                              u.isOnline ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                            title={u.isOnline ? "Online (Live Telemetry)" : "Offline"}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                              {u.displayName}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-extrabold">
                                YOU
                              </span>
                            )}
                            {isSos && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-600 text-white animate-pulse">
                                SOS
                              </span>
                            )}
                            {u.isBanned && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-700 text-white">
                                BANNED
                              </span>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[11px]">
                            <span className="px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                              {u.role}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium text-slate-600 capitalize flex items-center gap-1">
                              {u.movementStatus === "walking" && "🚶 Walking"}
                              {u.movementStatus === "running" && "🏃 Running"}
                              {u.movementStatus === "in_transit" && "🚗 In-Transit"}
                              {u.movementStatus === "stationary" && "🛑 Stationary"}
                              {u.movementStatus === "sos" && "🚨 SOS Alert"}
                              {u.location.speed ? `(${(u.location.speed).toFixed(1)} km/h)` : ""}
                            </span>
                            {u.batteryLevel !== undefined && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500 font-mono text-[10px] flex items-center gap-0.5">
                                  <Battery className="w-3 h-3 text-slate-400" />
                                  <span>{u.batteryLevel}%</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Squads & Assignment Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs flex-1 px-1">
                        {/* Squads */}
                        <div className="min-w-[130px]">
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                            Assigned Squad
                          </div>
                          {userSquads.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {userSquads.map((g) => (
                                <span
                                  key={g.id}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-2xs flex items-center gap-1"
                                  style={{ backgroundColor: g.color }}
                                >
                                  <span>{g.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No squad assigned</span>
                          )}
                        </div>

                        {/* Individual Waypoint Assignment */}
                        <div className="min-w-[180px]">
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                            Assigned Post Marker
                          </div>
                          {u.assignedPost ? (
                            <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg px-2 py-1 text-[11px]">
                              <div className="font-bold text-amber-900 flex items-center gap-1">
                                <Target className="w-3 h-3 text-amber-600" />
                                <span>{u.assignedPost.title}</span>
                              </div>
                              <div className="text-[10px] text-amber-700 capitalize flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                    u.assignedPost.status === "reached"
                                      ? "bg-emerald-600 text-white"
                                      : u.assignedPost.status === "acknowledged"
                                      ? "bg-blue-600 text-white"
                                      : "bg-amber-200 text-amber-800"
                                  }`}
                                >
                                  {u.assignedPost.status}
                                </span>
                                <span>by {u.assignedPost.assignedBy}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                          )}
                        </div>

                        {/* Assigned Tags */}
                        <div className="min-w-[150px] max-w-xs">
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center justify-between">
                            <span>Tags & Roles</span>
                            {isSuperAdmin && (
                              <button
                                onClick={() => {
                                  setSelectedTagForAssign(selectedTagForAssign === u.id ? null : u.id);
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5"
                                title="Manage user tags"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {u.tags && u.tags.length > 0 ? (
                              u.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                >
                                  <span>#{tag}</span>
                                  {isSuperAdmin && onRemoveUserTag && (
                                    <button
                                      onClick={() => onRemoveUserTag(u.id, tag)}
                                      className="hover:text-rose-600 transition"
                                      title={`Remove #${tag}`}
                                    >
                                      ×
                                    </button>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No tags</span>
                            )}
                          </div>

                          {/* Quick Tag Selector for Super Admin */}
                          {isSuperAdmin && selectedTagForAssign === u.id && (
                            <div className="mt-1.5 p-2 bg-white rounded-lg border border-indigo-200 shadow-sm space-y-1.5 z-10">
                              <div className="text-[10px] font-bold text-slate-600">Assign Tag to {u.displayName.split(" ")[0]}:</div>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                {availableTags.map((tag) => {
                                  const hasTag = u.tags?.includes(tag);
                                  return (
                                    <button
                                      key={tag}
                                      onClick={() => {
                                        if (hasTag) {
                                          onRemoveUserTag?.(u.id, tag);
                                        } else {
                                          onAddUserTag?.(u.id, tag);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                                        hasTag
                                          ? "bg-indigo-600 text-white"
                                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      #{tag} {hasTag ? "✓" : "+"}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Coordinates & Radar Lock */}
                        <div className="text-[11px] text-slate-500 font-mono shrink-0">
                          <div className="text-[10px] uppercase font-bold text-slate-400 font-sans mb-0.5">
                            Live Coordinates
                          </div>
                          <div>
                            {u.location.lat.toFixed(5)}, {u.location.lng.toFixed(5)}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end lg:self-center shrink-0">
                        {/* Direct Voice Call */}
                        <button
                          id={`call-user-${u.id}`}
                          onClick={() => onStartCall(u)}
                          disabled={isSelf || u.isBanned}
                          title="Start real-time voice call"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition disabled:opacity-30"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>

                        {/* Locate on Map */}
                        <button
                          id={`locate-user-${u.id}`}
                          onClick={() => onLocateOnMap(u.location.lat, u.location.lng)}
                          title="Locate unit on satellite map"
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>

                        {/* Assign Post Marker */}
                        {isAdminOrSuperAdmin && (
                          <button
                            id={`assign-marker-user-${u.id}`}
                            onClick={() => handleOpenAssignModalForUser(u)}
                            title="Assign individual waypoint marker to this unit"
                            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Target className="w-3.5 h-3.5 text-amber-600" />
                            <span>{u.assignedPost ? "Edit Post" : "Assign Post"}</span>
                          </button>
                        )}

                        {/* Super Admin Ban / Unban */}
                        {isSuperAdmin && !isSelf && u.role !== "superadmin" && (
                          u.isBanned ? (
                            <button
                              onClick={() => onUnbanUser(u.id)}
                              className="px-2 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-bold shadow-xs hover:bg-emerald-700"
                            >
                              Lift Ban
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanModalTarget(u)}
                              className="px-2 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold hover:bg-rose-100"
                            >
                              Ban
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBTAB 2: GLOBAL ASSEMBLY POINT & INDIVIDUAL WAYPOINTS */}
        {/* ======================================================== */}
        {activeSubTab === "markers" && (
          <div className="space-y-6">
            {/* Section A: Global Assembly Point (Super Admin Feature) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md">
                    🚩
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      Global Protest Assembly Point
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Super Admin marker visible to all units. Displays designated rally location and target assemble time.
                    </p>
                  </div>
                </div>

                {isAdminOrSuperAdmin && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      id="set-global-marker-btn"
                      onClick={() => setIsGlobalMarkerModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-200 transition cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{globalMarker ? "Update Assembly Point" : "Set Assembly Point"}</span>
                    </button>

                    {globalMarker && (
                      <button
                        id="clear-global-marker-btn"
                        onClick={async () => {
                          await onClearGlobalMarker();
                          setActionFeedback({ message: "Global Assembly Point cleared." });
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {globalMarker ? (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-amber-950">{globalMarker.title}</span>
                      {globalMarker.targetTime && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-600 text-white shadow-2xs">
                          ⏰ Assemble by {globalMarker.targetTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                      {globalMarker.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-amber-900/80 pt-1 font-medium">
                      <span>Coordinates: <strong className="font-mono">{globalMarker.lat.toFixed(5)}, {globalMarker.lng.toFixed(5)}</strong></span>
                      <span>•</span>
                      <span>Perimeter: <strong>{globalMarker.radius || 120}m</strong></span>
                      <span>•</span>
                      <span>Updated by: <strong>{globalMarker.updatedBy}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onLocateOnMap(globalMarker.lat, globalMarker.lng)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold border border-amber-300 shadow-xs flex items-center gap-1.5 transition"
                    >
                      <Navigation className="w-3.5 h-3.5 text-amber-600" />
                      <span>View on Satellite Map</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-6 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">No Global Assembly Point currently active.</p>
                  <p className="text-slate-400">
                    {isSuperAdmin
                      ? "Click 'Set Assembly Point' above to establish the central protest meeting location."
                      : "The Super Admin has not yet announced a central assembly point."}
                  </p>
                </div>
              )}
            </div>

            {/* Section B: Individual User Waypoint Assignments */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span>Individual User Waypoint Postings ({assignments.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Admins can dispatch specific markers, patrol routes, or station duties to individual users.
                  </p>
                </div>

                {isAdminOrSuperAdmin && (
                  <button
                    id="assign-new-user-btn"
                    onClick={() => {
                      const firstEligible = users.find((u) => !u.isBanned && u.id !== currentUser?.id);
                      if (firstEligible) {
                        handleOpenAssignModalForUser(firstEligible);
                      } else {
                        setIsAssignModalOpen(true);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-200 transition self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Waypoint to Unit</span>
                  </button>
                )}
              </div>

              {/* Assignments Table */}
              <div className="divide-y divide-slate-100 mt-2">
                {assignments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active individual waypoint assignments. Admins can assign target posts from here or directly on the map.
                  </div>
                ) : (
                  assignments.map((asg) => {
                    const assignedUser = users.find((u) => u.id === asg.userId);
                    return (
                      <div
                        key={asg.id || asg.userId}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition px-2 rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs mt-0.5"
                            style={{ backgroundColor: assignedUser?.avatarColor || "#4f46e5" }}
                          >
                            {assignedUser ? assignedUser.displayName.charAt(0) : "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                                {assignedUser?.displayName || "Unknown User"}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                @{assignedUser?.username}
                              </span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase ${
                                  asg.status === "reached"
                                    ? "bg-emerald-600 text-white"
                                    : asg.status === "acknowledged"
                                    ? "bg-blue-600 text-white"
                                    : "bg-amber-100 text-amber-800 border border-amber-300"
                                }`}
                              >
                                {asg.status}
                              </span>
                            </div>

                            <div className="text-xs text-slate-800 font-semibold mt-1">
                              Post: {asg.title}
                            </div>
                            <div className="text-[11px] text-slate-500">{asg.instructions}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Target: {asg.lat.toFixed(5)}, {asg.lng.toFixed(5)} • Assigned by: {asg.assignedBy}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => onLocateOnMap(asg.lat, asg.lng)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 border border-blue-200 transition"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                            <span>Locate Post</span>
                          </button>

                          {isAdminOrSuperAdmin && (
                            <>
                              {assignedUser && (
                                <button
                                  onClick={() => handleOpenAssignModalForUser(assignedUser)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              )}
                              <button
                                onClick={() => onClearUserAssignment(asg.userId)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 border border-rose-200 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Clear</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBTAB 3: PROTEST SQUADS & GROUPS MANAGEMENT */}
        {/* ======================================================== */}
        {activeSubTab === "groups" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Protest Squads & Operational Teams ({groups.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organize participants into specialized squads (e.g. Legal Observers, First Aid, Peace Marshals, Logistics).
                </p>
              </div>

              {isAdminOrSuperAdmin && (
                <button
                  id="create-group-btn"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-200 transition self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Squad</span>
                </button>
              )}
            </div>

            {/* Squads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.length === 0 ? (
                <div className="md:col-span-2 p-10 text-center text-slate-400 text-xs">
                  No squads created yet. Click "Create New Squad" to organize participants.
                </div>
              ) : (
                groups.map((group) => {
                  const leader = users.find((u) => u.id === group.leaderUserId);
                  const memberUsers = users.filter((u) => group.memberIds.includes(u.id));

                  return (
                    <div
                      key={group.id}
                      className="border border-slate-200 rounded-2xl p-4 bg-white hover:shadow-md transition space-y-3 relative overflow-hidden"
                    >
                      {/* Top Color Accent Line */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{ backgroundColor: group.color }}
                      />

                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            <h4 className="font-bold text-sm text-slate-900">{group.name}</h4>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {group.memberIds.length} Members
                            </span>
                          </div>
                          {group.description && (
                            <p className="text-xs text-slate-500 mt-1">{group.description}</p>
                          )}
                        </div>

                        {isAdminOrSuperAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onDeleteGroup(group.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete squad"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Leader & Rally Point */}
                      <div className="text-xs space-y-1 text-slate-600 pt-1">
                        {leader && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-slate-400 font-medium">Squad Lead:</span>
                            <strong className="text-slate-800">{leader.displayName}</strong>
                          </div>
                        )}
                        {group.rallyPoint && (
                          <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-1 text-slate-700 font-medium">
                              <MapPin className="w-3 h-3 text-indigo-600" />
                              <span>Rally: {group.rallyPoint.label}</span>
                            </div>
                            <button
                              onClick={() => onLocateOnMap(group.rallyPoint!.lat, group.rallyPoint!.lng)}
                              className="text-[10px] font-bold text-indigo-600 hover:underline"
                            >
                              Locate
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Member Avatars & Manage Members Button */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {memberUsers.slice(0, 5).map((m) => (
                            <div
                              key={m.id}
                              title={m.displayName}
                              className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-2xs"
                              style={{ backgroundColor: m.avatarColor || "#4f46e5" }}
                            >
                              {m.displayName.charAt(0)}
                            </div>
                          ))}
                          {memberUsers.length > 5 && (
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                              +{memberUsers.length - 5}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {onStartGroupCall && (
                            <button
                              id={`call-group-btn-${group.id}`}
                              onClick={() => onStartGroupCall(group)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 border border-emerald-200 transition cursor-pointer"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>Call Squad</span>
                            </button>
                          )}

                          {isAdminOrSuperAdmin && (
                            <button
                              id={`manage-members-btn-${group.id}`}
                              onClick={() => handleOpenManageMembers(group)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Users className="w-3 h-3 text-indigo-600" />
                              <span>Add / Remove Users</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBTAB 4: TAGS & ROLE DESCRIPTORS MANAGEMENT */}
        {/* ======================================================== */}
        {activeSubTab === "tags" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <span>Protest Tags & Role Descriptors ({availableTags.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super Admins can create functional tags (e.g. #FirstAid, #Marshal, #LegalObserver, #Medic) and assign them to personnel for instant tactical searching and radar filtering.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {users.reduce((acc, u) => acc + (u.tags?.length || 0), 0)} Total Assignments
                </span>
              </div>
            </div>

            {/* Create Tag Section (Super Admin Only) */}
            {isSuperAdmin && (
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Create New Functional Tag</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Prefix "#" is auto-formatted
                  </span>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const cleanTag = newCustomTag.replace(/^#/, "").trim();
                    if (!cleanTag) return;
                    if (onCreateTag) {
                      await onCreateTag(cleanTag);
                      setNewCustomTag("");
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1 max-w-md">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      #
                    </span>
                    <input
                      id="create-custom-tag-input"
                      type="text"
                      value={newCustomTag}
                      onChange={(e) => setNewCustomTag(e.target.value)}
                      placeholder="e.g. FirstAid, PeaceMarshal, WaterSupply, LegalObserver"
                      className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                  <button
                    id="create-custom-tag-submit"
                    type="submit"
                    disabled={!newCustomTag.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tag</span>
                  </button>
                </form>

                {/* Suggested Tag Quick-Add Bank */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                    <span>Quick Suggested Protest Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_PROTEST_TAGS.map((tag) => {
                      const exists = availableTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          disabled={exists}
                          onClick={() => {
                            if (!exists && onCreateTag) {
                              onCreateTag(tag);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                            exists
                              ? "bg-slate-200/70 text-slate-500 border border-slate-200 cursor-default"
                              : "bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 shadow-2xs"
                          }`}
                        >
                          <span>#{tag}</span>
                          {exists ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Plus className="w-3 h-3 text-indigo-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tags Grid & Assigned Personnel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Active Protest Tags & Assigned Field Units ({availableTags.length})</span>
              </div>

              {availableTags.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <Tag className="w-8 h-8 text-slate-300 mx-auto" />
                  <div>No tags created yet. Use the form above to add tags or click suggested presets.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTags.map((tag) => {
                    const taggedUsers = users.filter((u) => u.tags?.includes(tag));
                    const unassignedUsers = users.filter((u) => !u.tags?.includes(tag) && !u.isBanned);

                    return (
                      <div
                        key={tag}
                        className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition space-y-3 flex flex-col justify-between"
                      >
                        {/* Tag Card Top */}
                        <div>
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                                <Hash className="w-3 h-3 text-indigo-600" />
                                <span>{tag}</span>
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {taggedUsers.length} {taggedUsers.length === 1 ? "unit" : "units"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSearchFilter(`#${tag}`);
                                  setActiveSubTab("oversight");
                                }}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition flex items-center gap-1"
                                title="Filter users in radar"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Radar</span>
                              </button>

                              {isSuperAdmin && onDeleteTag && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete the tag "#${tag}"? This will remove it from all users.`)) {
                                      onDeleteTag(tag);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Delete tag"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Tagged Personnel List */}
                          <div className="pt-3 space-y-2">
                            <div className="text-[11px] uppercase font-bold text-slate-400">
                              Assigned Personnel:
                            </div>

                            {taggedUsers.length === 0 ? (
                              <div className="text-[11px] text-slate-400 italic py-1">
                                No personnel assigned to this tag yet.
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                {taggedUsers.map((u) => (
                                  <span
                                    key={u.id}
                                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                                  >
                                    <span
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                      style={{ backgroundColor: u.avatarColor || "#4f46e5" }}
                                    >
                                      {u.displayName.charAt(0)}
                                    </span>
                                    <span>{u.displayName}</span>
                                    {isSuperAdmin && onRemoveUserTag && (
                                      <button
                                        onClick={() => onRemoveUserTag(u.id, tag)}
                                        className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 text-xs transition"
                                        title={`Remove #${tag} from ${u.displayName}`}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Assign Dropdown for Super Admin */}
                        {isSuperAdmin && onAddUserTag && unassignedUsers.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                            <select
                              id={`assign-tag-select-${tag}`}
                              defaultValue=""
                              onChange={(e) => {
                                const targetId = e.target.value;
                                if (targetId) {
                                  onAddUserTag(targetId, tag);
                                  e.target.value = "";
                                }
                              }}
                              className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="" disabled>
                                + Assign user to #{tag}...
                              </option>
                              {unassignedUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.displayName} (@{u.username}) - {u.role}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBTAB 5: SYSTEM AUDIT LOGS */}
        {/* ======================================================== */}
        {activeSubTab === "logs" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-logs-search"
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search logs by action, username, or message..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <select
                  id="admin-logs-level-select"
                  value={selectedLogLevel}
                  onChange={(e) => setSelectedLogLevel(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                >
                  <option value="all">All Severity Levels</option>
                  <option value="emergency">🚨 Emergency</option>
                  <option value="violation">⚠️ Violation</option>
                  <option value="warning">⚡ Warning</option>
                  <option value="info">ℹ️ Info</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="admin-export-logs-btn"
                  onClick={handleExportLogs}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No audit log entries matching your current filters.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 hover:bg-slate-50/80 transition flex items-start gap-3 text-xs"
                  >
                    <div className="mt-0.5 shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getLogLevelBadge(
                          log.level
                        )}`}
                      >
                        {log.level}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-900 font-mono text-[11px]">
                          {log.action}
                        </span>
                        {log.username && (
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            @{log.username}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed">{log.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUBTAB 5: COMMUNITY GUIDELINES & BAN MANAGEMENT */}
        {/* ======================================================== */}
        {activeSubTab === "users" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Community Guidelines & Suspensions
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Super Admin can suspend disruptive accounts to maintain field safety.
                </p>
              </div>

              <div className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                {users.filter((u) => u.isBanned).length} Suspended Accounts
              </div>
            </div>

            {/* Users List */}
            <div className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const canBan = isSuperAdmin && !isSelf && u.role !== "superadmin";

                return (
                  <div
                    key={u.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      u.isBanned ? "bg-rose-50/40" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 border-2 border-indigo-600"
                        style={{ backgroundColor: u.avatarColor || "#4f46e5" }}
                      >
                        {u.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                            {u.displayName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                          {u.isBanned && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                              BANNED
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 capitalize flex items-center gap-2 mt-0.5">
                          <span className="font-medium">{u.role}</span>
                          <span>•</span>
                          <span>{u.movementStatus}</span>
                          {u.isBanned && u.banReason && (
                            <span className="text-rose-600 font-medium text-[11px]">
                              Reason: {u.banReason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {u.isBanned ? (
                        <button
                          id={`unban-btn-${u.id}`}
                          onClick={() => onUnbanUser(u.id)}
                          disabled={!isSuperAdmin}
                          className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Lift Ban</span>
                        </button>
                      ) : (
                        <button
                          id={`ban-btn-${u.id}`}
                          onClick={() => setBanModalTarget(u)}
                          disabled={!canBan}
                          className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Ban User</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 1: SET GLOBAL ASSEMBLY POINT (SUPER ADMIN) */}
        {/* ======================================================== */}
        {isGlobalMarkerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in zoom-in-95 my-auto max-h-[92dvh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                  🚩
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Set Global Protest Assembly Point
                  </h3>
                  <p className="text-xs text-slate-500">
                    Broadcast central rally point and assemble time to all participants.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGlobalMarker} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assembly Title</label>
                  <input
                    type="text"
                    required
                    value={gmTitle}
                    onChange={(e) => setGmTitle(e.target.value)}
                    placeholder="e.g. Central Rally Square / Devi Asthan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assemble By Time</label>
                    <input
                      type="text"
                      value={gmTargetTime}
                      onChange={(e) => setGmTargetTime(e.target.value)}
                      placeholder="e.g. 15:30 PM"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Perimeter Radius (meters)</label>
                    <input
                      type="number"
                      value={gmRadius}
                      onChange={(e) => setGmRadius(e.target.value)}
                      min="20"
                      max="2000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Target Coordinates</label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentUser?.location) {
                            setGmLat(currentUser.location.lat.toFixed(6));
                            setGmLng(currentUser.location.lng.toFixed(6));
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                      >
                        📍 Use My GPS
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setGmLat("25.564500");
                          setGmLng("84.856000");
                        }}
                        className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                      >
                        🏛️ Devi Asthan
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        required
                        value={gmLat}
                        onChange={(e) => setGmLat(e.target.value)}
                        placeholder="Latitude"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        value={gmLng}
                        onChange={(e) => setGmLng(e.target.value)}
                        placeholder="Longitude"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Directives & Instructions</label>
                  <textarea
                    rows={3}
                    value={gmDesc}
                    onChange={(e) => setGmDesc(e.target.value)}
                    placeholder="Provide arrival instructions, safety guidelines, and marshaling details..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                  {globalMarker ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await onClearGlobalMarker();
                        setIsGlobalMarkerModalOpen(false);
                        setActionFeedback({ message: "Global Assembly Point cleared." });
                      }}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Assembly</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsGlobalMarkerModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-200 cursor-pointer"
                    >
                      Broadcast Assembly Point
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 2: ASSIGN USER WAYPOINT POST (ADMIN) */}
        {/* ======================================================== */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in zoom-in-95 my-auto max-h-[92dvh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Individual Waypoint Marker
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dispatch an objective or station marker specifically for this field unit.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveUserAssignment} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Participant</label>
                  <select
                    value={targetUserId}
                    onChange={(e) => {
                      setTargetUserId(e.target.value);
                      const u = users.find((x) => x.id === e.target.value);
                      if (u) {
                        setAssignLat(String(u.assignedPost?.lat ?? u.location.lat));
                        setAssignLng(String(u.assignedPost?.lng ?? u.location.lng));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="">-- Select Field Participant --</option>
                    {users
                      .filter((u) => !u.isBanned)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} (@{u.username}) • {u.role}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Waypoint Title / Post Name</label>
                  <input
                    type="text"
                    required
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="e.g. First Aid Station West Gate / Sector 4 Marshal"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Waypoint Latitude</label>
                    <input
                      type="text"
                      required
                      value={assignLat}
                      onChange={(e) => setAssignLat(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Waypoint Longitude</label>
                    <input
                      type="text"
                      required
                      value={assignLng}
                      onChange={(e) => setAssignLng(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specific Field Instructions</label>
                  <textarea
                    rows={3}
                    value={assignInstructions}
                    onChange={(e) => setAssignInstructions(e.target.value)}
                    placeholder="Specify role expectations, supplies required, or rendezvous instructions..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200"
                  >
                    Dispatch Waypoint Marker
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 3: CREATE NEW PROTEST SQUAD */}
        {/* ======================================================== */}
        {isCreateGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in zoom-in-95 my-auto max-h-[92dvh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Create New Protest Squad / Group
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set up an operational division with color badge and assigned members.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveCreateGroup} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Squad Name</label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Medical & First Aid / Peace Marshals / Legal Observers"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Squad Theme Color</label>
                  <div className="flex items-center gap-2">
                    {PRESET_SQUAD_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setGroupColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition ${
                          groupColor === c ? "border-slate-900 scale-110 shadow-sm" : "border-white"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Squad Leader (Optional)</label>
                  <select
                    value={groupLeaderId}
                    onChange={(e) => setGroupLeaderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Assign a Squad Leader --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Squad Description & Responsibilities</label>
                  <textarea
                    rows={2}
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Explain the role and objectives of this team during the protest..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Squad Rally Point Name (Optional)</label>
                  <input
                    type="text"
                    value={groupRallyLabel}
                    onChange={(e) => setGroupRallyLabel(e.target.value)}
                    placeholder="e.g. West Hydration Station"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateGroupModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200"
                  >
                    Create Squad
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 4: MANAGE GROUP MEMBERS (ADD / REMOVE USERS) */}
        {/* ======================================================== */}
        {managingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in zoom-in-95 flex flex-col my-auto max-h-[92dvh] overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: managingGroup.color }}
                  />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Manage {managingGroup.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select or deselect users to add or remove them from this squad.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 shrink-0">
                  {selectedMemberIds.length} Selected
                </span>
              </div>

              {/* Member Search */}
              <div className="py-3 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search users by name or role..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* User Selection List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                {users
                  .filter((u) => {
                    if (u.isBanned) return false;
                    if (memberSearch.trim()) {
                      const q = memberSearch.toLowerCase();
                      return (
                        u.displayName.toLowerCase().includes(q) ||
                        u.username.toLowerCase().includes(q) ||
                        u.role.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((u) => {
                    const isSelected = selectedMemberIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleToggleMemberSelection(u.id)}
                        className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between text-xs ${
                          isSelected ? "bg-indigo-50/70 border border-indigo-200" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                            style={{ backgroundColor: u.avatarColor || "#4f46e5" }}
                          >
                            {u.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.displayName}</div>
                            <div className="text-[10px] text-slate-500 capitalize">
                              @{u.username} • {u.role}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setManagingGroup(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGroupMembers}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200"
                >
                  Save Squad Roster
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 5: BAN USER CONFIRMATION MODAL */}
        {/* ======================================================== */}
        {banModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in zoom-in-95 my-auto max-h-[92dvh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ban {banModalTarget.displayName}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    This will immediately disconnect the user and prevent GPS broadcast.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Community Guideline Violation:
                </label>
                <div className="space-y-1.5">
                  {VIOLATION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        customBanReason === reason
                          ? "bg-rose-50 border-rose-300 text-rose-900 font-semibold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="violation_reason"
                        checked={customBanReason === reason}
                        onChange={() => setCustomBanReason(reason)}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  id="cancel-ban-modal-btn"
                  onClick={() => setBanModalTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-ban-modal-btn"
                  onClick={handleConfirmBan}
                  disabled={banLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-200 transition disabled:opacity-50"
                >
                  {banLoading ? "Banning..." : "Confirm Ban & Terminate Session"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 6: PROVISION / CREATE USER ACCOUNT (RBAC CONTROLLED) */}
        {/* ======================================================== */}
        {isCreateUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 animate-in zoom-in-95 flex flex-col my-auto max-h-[92dvh] overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-xs">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Super Admin User Registration Console
                    </h3>
                    <p className="text-xs text-slate-500">
                      Super Admin Authority: Register &amp; provision Admins, Dispatchers, Responders, or Participants with verified credentials.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Feedback messages */}
              {createUserError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createUserError}</span>
                </div>
              )}
              {createUserSuccess && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold shrink-0">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{createUserSuccess}</span>
                </div>
              )}

              {/* Form Body */}
              <form onSubmit={handleCreateUserSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-xs">
                {/* Full Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Display Name *
                    </label>
                    <input
                      id="create-user-displayname"
                      type="text"
                      required
                      value={createUserName}
                      onChange={(e) => {
                        setCreateUserName(e.target.value);
                        if (!createUserUsername) {
                          setCreateUserUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                        }
                      }}
                      placeholder="e.g. Maya Chen"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Username (Login ID) *
                    </label>
                    <input
                      id="create-user-username"
                      type="text"
                      required
                      value={createUserUsername}
                      onChange={(e) => setCreateUserUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="e.g. maya_c"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-mono text-slate-800"
                    />
                  </div>
                </div>

                {/* Password with generator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Initial Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomPass = "protest" + Math.floor(100 + Math.random() * 900);
                        setCreateUserPassword(randomPass);
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Generate Secure Password
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="create-user-password"
                      type="text"
                      required
                      value={createUserPassword}
                      onChange={(e) => setCreateUserPassword(e.target.value)}
                      placeholder="e.g. march2026 or protest123"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-mono text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    User will log in using this password. No public sign-up registration is required.
                  </p>
                </div>

                {/* Role Assignment */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign Role & Permissions *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Super Admin option (Only visible if superadmin) */}
                    {isSuperAdmin && (
                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          createUserRole === "admin"
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="create_role"
                          value="admin"
                          checked={createUserRole === "admin"}
                          onChange={() => setCreateUserRole("admin")}
                          className="mt-0.5 text-amber-600"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                            <span>Administrator</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Can dispatch users, assign reaching posts, manage squads.
                          </div>
                        </div>
                      </label>
                    )}

                    {isSuperAdmin && (
                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          createUserRole === "dispatcher"
                            ? "bg-blue-50 border-blue-300 text-blue-900"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="create_role"
                          value="dispatcher"
                          checked={createUserRole === "dispatcher"}
                          onChange={() => setCreateUserRole("dispatcher")}
                          className="mt-0.5 text-blue-600"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <Radio className="w-3.5 h-3.5 text-blue-600" />
                            <span>Dispatcher</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Can coordinate field communication and view full radar.
                          </div>
                        </div>
                      </label>
                    )}

                    <label
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                        createUserRole === "volunteer"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="create_role"
                        value="volunteer"
                        checked={createUserRole === "volunteer"}
                        onChange={() => setCreateUserRole("volunteer")}
                        className="mt-0.5 text-emerald-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Volunteer / Responder</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Field marshal, medic, first responder or coordinator.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                        createUserRole === "participant"
                          ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="create_role"
                        value="participant"
                        checked={createUserRole === "participant"}
                        onChange={() => setCreateUserRole("participant")}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Participant / Citizen</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Normal attendee: sees mob density, rally beacons, messages.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Tag Selection (From tags created by Super Admin) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Select Protest Tags (Created by Super Admin)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {createUserTags.length} selected
                    </span>
                  </div>
                  {availableTags.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      No custom tags created yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 max-h-28 overflow-y-auto">
                      {availableTags.map((tag) => {
                        const isSelected = createUserTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleCreateUserTag(tag)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white text-slate-700 border border-slate-300 hover:border-indigo-300"
                            }`}
                          >
                            <span>#{tag}</span>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Description / Field Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Description & Tactical Instructions
                  </label>
                  <textarea
                    id="create-user-description"
                    rows={2}
                    value={createUserDesc}
                    onChange={(e) => setCreateUserDesc(e.target.value)}
                    placeholder="e.g. Lead marshal for Sector 4, carrying medical kit and backup megaphone."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800 font-medium"
                  />
                </div>

                {/* Phone / Contact (Optional) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Emergency Phone / Radio Frequency (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="create-user-contact"
                      type="text"
                      value={createUserContact}
                      onChange={(e) => setCreateUserContact(e.target.value)}
                      placeholder="e.g. +1 (555) 019-2834 or Ch 4 (462.5625 MHz)"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800 font-medium"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateUserModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="submit-create-user-btn"
                    disabled={createUserLoading || !createUserName.trim() || !createUserPassword.trim()}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {createUserLoading ? (
                      <span>Creating Account...</span>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Provision Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
