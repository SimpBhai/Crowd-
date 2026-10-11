import React, { useState, useMemo } from "react";
import { Filter, Search, RotateCcw, ChevronDown, ChevronUp, ShieldAlert, Check, Users, Eye, Tag, Crosshair, X } from "lucide-react";
import { FilterOptions, UserRole, MovementStatus, ProtestGroup, UserRecord } from "../../types";

interface FilterPanelProps {
  filters: FilterOptions;
  onUpdateFilters: (newFilters: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
  users?: UserRecord[];
  onSelectUser?: (user: UserRecord) => void;
  onLocateUser?: (lat: number, lng: number, user?: UserRecord) => void;
  groups?: ProtestGroup[];
  availableTags?: string[];
  isSuperAdminOrAdmin?: boolean;
}

const ROLES: { id: UserRole; label: string; color: string }[] = [
  { id: "superadmin", label: "Super Admin", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { id: "admin", label: "Admin", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "dispatcher", label: "Dispatcher", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "volunteer", label: "Responder", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "participant", label: "Participant", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
];

const STATUSES: { id: MovementStatus; label: string; icon: string }[] = [
  { id: "stationary", label: "Stationary", icon: "🛑" },
  { id: "walking", label: "Walking", icon: "🚶" },
  { id: "running", label: "Running", icon: "🏃" },
  { id: "in_transit", label: "In-Transit", icon: "🚗" },
  { id: "sos", label: "SOS Alert", icon: "🚨" },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  totalFilteredCount,
  users = [],
  onSelectUser,
  onLocateUser,
  groups = [],
  availableTags = [],
  isSuperAdminOrAdmin = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const matchingUsers = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    if (!q || !users || users.length === 0) return [];
    const cleanQ = q.startsWith("#") ? q.substring(1).trim() : q;
    if (!cleanQ) return [];

    return users
      .filter((u) => {
        const matchName = u.displayName.toLowerCase().includes(cleanQ);
        const matchUsername = u.username.toLowerCase().includes(cleanQ);
        const matchRole = u.role.toLowerCase().includes(cleanQ);
        const matchTag = u.tags?.some((t) => t.toLowerCase().includes(cleanQ));
        const matchStatus = u.movementStatus?.toLowerCase().includes(cleanQ);
        return matchName || matchUsername || matchRole || matchTag || matchStatus;
      })
      .slice(0, 6);
  }, [users, filters.searchQuery]);

  const toggleRole = (role: UserRole) => {
    const exists = filters.selectedRoles.includes(role);
    const updated = exists
      ? filters.selectedRoles.filter((r) => r !== role)
      : [...filters.selectedRoles, role];
    onUpdateFilters({ selectedRoles: updated });
  };

  const toggleStatus = (status: MovementStatus) => {
    const exists = filters.selectedStatuses.includes(status);
    const updated = exists
      ? filters.selectedStatuses.filter((s) => s !== status)
      : [...filters.selectedStatuses, status];
    onUpdateFilters({ selectedStatuses: updated });
  };

  const toggleGroup = (groupId: string) => {
    const isSelected = filters.selectedGroupId === groupId;
    onUpdateFilters({ selectedGroupId: isSelected ? undefined : groupId });
  };

  const toggleTag = (tag: string) => {
    const currentTags = filters.selectedTags || [];
    const exists = currentTags.some((t) => t.toLowerCase() === tag.toLowerCase());
    const updated = exists
      ? currentTags.filter((t) => t.toLowerCase() !== tag.toLowerCase())
      : [...currentTags, tag];
    onUpdateFilters({ selectedTags: updated });
  };

  const hasActiveFilters =
    filters.searchQuery !== "" ||
    filters.selectedRoles.length > 0 ||
    filters.selectedStatuses.length > 0 ||
    filters.selectedGroupId !== undefined ||
    (filters.selectedTags && filters.selectedTags.length > 0) ||
    filters.onlyActive ||
    filters.hasSosOnly;

  return (
    <div className="w-full bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 transition-all shadow-xs relative">
      <div className="max-w-7xl mx-auto">
        {/* Compact Quick Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[120px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="filter-search-input"
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matchingUsers.length > 0 && onLocateUser) {
                  const target = matchingUsers[0];
                  onLocateUser(target.location.lat, target.location.lng, target);
                  if (onSelectUser) onSelectUser(target);
                  setIsSearchFocused(false);
                }
              }}
              placeholder={
                isSuperAdminOrAdmin
                  ? "Search by name, tag (#First Aid), squad, role..."
                  : "Search map, tags (#FirstAid), squad teams..."
              }
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onUpdateFilters({ searchQuery: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Autocomplete Suggestions Dropdown */}
            {isSearchFocused && matchingUsers.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Personnel & Units ({matchingUsers.length})</span>
                  <span className="text-indigo-600 font-semibold">Press Enter to Jump</span>
                </div>
                {matchingUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-2 hover:bg-indigo-50/70 transition flex items-center justify-between gap-2"
                  >
                    <div
                      className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                      onClick={() => {
                        if (onLocateUser) onLocateUser(u.location.lat, u.location.lng, u);
                        if (onSelectUser) onSelectUser(u);
                        setIsSearchFocused(false);
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: u.avatarColor || "#4f46e5" }}
                      >
                        {u.displayName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{u.displayName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">@{u.username}</span>
                        </div>
                        {u.tags && u.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {u.tags.map((t) => (
                              <span key={t} className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onLocateUser) onLocateUser(u.location.lat, u.location.lng, u);
                        if (onSelectUser) onSelectUser(u);
                        setIsSearchFocused(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>Locate</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin Full Oversight Radar Indicator */}
          {isSuperAdminOrAdmin && (
            <button
              id="filter-admin-radar-toggle"
              onClick={() => {
                if (hasActiveFilters) {
                  onResetFilters();
                }
              }}
              title="Admin Radar: Full oversight of all registered users"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border shrink-0 ${
                !hasActiveFilters
                  ? "bg-slate-900 text-emerald-400 border-slate-800 shadow-sm"
                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {!hasActiveFilters ? "Radar: All Visible" : "Filtered (Click to View All)"}
              </span>
            </button>
          )}

          {/* SOS Quick Filter Toggle */}
          <button
            id="filter-sos-quick-toggle"
            onClick={() => onUpdateFilters({ hasSosOnly: !filters.hasSosOnly })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border shrink-0 ${
              filters.hasSosOnly
                ? "bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-200"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">SOS</span>
          </button>

          {/* Expand Advanced Filters */}
          <button
            id="filter-expand-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition shrink-0 ${
              isExpanded || hasActiveFilters
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            )}
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              id="filter-reset-btn"
              onClick={onResetFilters}
              title="Reset All Filters"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Match Count */}
          <div className="hidden md:block text-xs text-slate-500 font-medium whitespace-nowrap pl-1">
            <span className="text-indigo-600 font-bold">{totalFilteredCount}</span> on radar
          </div>
        </div>

        {/* Expanded Filter Panel Drawer */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-150 max-h-[55vh] overflow-y-auto pr-1">
            {/* Filter by User Tags */}
            {availableTags.length > 0 && (
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-indigo-500" />
                  <span>Filter by User Tags</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const isSelected = (filters.selectedTags || []).some(
                      (t) => t.toLowerCase() === tag.toLowerCase()
                    );
                    return (
                      <button
                        key={tag}
                        id={`filter-tag-${tag.replace(/\s+/g, "-")}`}
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected ? <Check className="w-3 h-3" /> : <span>#</span>}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter by Protest Squad / Group */}
            {groups.length > 0 && (
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-indigo-500" />
                  <span>Protest Squads & Teams</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((group) => {
                    const isSelected = filters.selectedGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        id={`filter-group-${group.id}`}
                        onClick={() => toggleGroup(group.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                          isSelected
                            ? "text-white shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                        style={{
                          backgroundColor: isSelected ? group.color : undefined,
                          borderColor: isSelected ? group.color : undefined,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: isSelected ? "white" : group.color }}
                        />
                        <span>{group.name}</span>
                        <span className="text-[10px] opacity-75 font-normal">
                          ({group.memberIds.length})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter by Role (Admins Only) */}
            {isSuperAdminOrAdmin && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Filter by Role
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((role) => {
                    const isSelected = filters.selectedRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        id={`filter-role-${role.id}`}
                        onClick={() => toggleRole(role.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter by Movement Status */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Movement Status & Connectivity
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((status) => {
                  const isSelected = filters.selectedStatuses.includes(status.id);
                  return (
                    <button
                      key={status.id}
                      id={`filter-status-${status.id}`}
                      onClick={() => toggleStatus(status.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{status.icon}</span>
                      <span>{status.label}</span>
                    </button>
                  );
                })}

                {/* Online only checkbox pill */}
                <button
                  id="filter-online-only-toggle"
                  onClick={() => onUpdateFilters({ onlyActive: !filters.onlyActive })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                    filters.onlyActive
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Online Only</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

