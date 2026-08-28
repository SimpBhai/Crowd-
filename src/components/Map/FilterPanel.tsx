import React, { useState } from "react";
import { Filter, Search, RotateCcw, ChevronDown, ChevronUp, ShieldAlert, Check } from "lucide-react";
import { FilterOptions, UserRole, MovementStatus } from "../../types";

interface FilterPanelProps {
  filters: FilterOptions;
  onUpdateFilters: (newFilters: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
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
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const hasActiveFilters =
    filters.searchQuery !== "" ||
    filters.selectedRoles.length > 0 ||
    filters.selectedStatuses.length > 0 ||
    filters.onlyActive ||
    filters.hasSosOnly;

  return (
    <div className="w-full bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto">
        {/* Compact Quick Bar */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="filter-search-input"
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
              placeholder="Search user, role..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
            />
          </div>

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
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
            {/* Filter by Role */}
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

            {/* Filter by Movement Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Movement Status
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
