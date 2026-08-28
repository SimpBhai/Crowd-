import React, { useState } from "react";
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
} from "lucide-react";
import { SystemAuditLog, UserRecord } from "../../types";

interface AdminLogsViewProps {
  currentUser: UserRecord | null;
  users: UserRecord[];
  logs: SystemAuditLog[];
  onBanUser: (targetUserId: string, reason: string) => Promise<void>;
  onUnbanUser: (targetUserId: string) => Promise<void>;
  onRefreshLogs: () => void;
}

const VIOLATION_REASONS = [
  "GPS Teleportation & Location Spoofing Violation",
  "Harassment or Abusive Broadcast Communication",
  "Spamming Emergency Alert / False SOS Signal",
  "Community Guidelines Safety Breach",
  "Unauthorized Area Trespass / Geofence Breach",
];

export const AdminLogsView: React.FC<AdminLogsViewProps> = ({
  currentUser,
  users,
  logs,
  onBanUser,
  onUnbanUser,
  onRefreshLogs,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"logs" | "users">("logs");
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");

  // Ban Modal State
  const [banModalTarget, setBanModalTarget] = useState<UserRecord | null>(null);
  const [customBanReason, setCustomBanReason] = useState(VIOLATION_REASONS[0]);
  const [banLoading, setBanLoading] = useState(false);

  const isSuperAdmin = currentUser?.role === "superadmin";

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

  const filteredUsers = users.filter((u) => {
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleConfirmBan = async () => {
    if (!banModalTarget) return;
    setBanLoading(true);
    try {
      await onBanUser(banModalTarget.id, customBanReason);
      setBanModalTarget(null);
    } catch (err: any) {
      alert(err.message || "Failed to ban user");
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

  return (
    <div className="h-[calc(100vh-144px)] overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title & Subnav */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {isSuperAdmin ? "Super Admin Command Center" : "Administrative Console"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isSuperAdmin
                ? "Full oversight of real-time audit logs, community guidelines enforcement, and ban controls."
                : "Real-time logs monitoring and field unit status."}
            </p>
          </div>

          {/* Sub Navigation Switcher */}
          <div className="flex items-center gap-2">
            <button
              id="admin-subtab-logs"
              onClick={() => setActiveSubTab("logs")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === "logs"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>System Logs ({logs.length})</span>
            </button>

            <button
              id="admin-subtab-users"
              onClick={() => setActiveSubTab("users")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                activeSubTab === "users"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <UserX className="w-4 h-4 text-rose-300" />
              <span>User Ban & Guidelines ({users.filter((u) => u.isBanned).length} Banned)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: System Audit Logs Stream */}
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

                {/* Level selector */}
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

            {/* Logs Table / List */}
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

        {/* Tab 2: User Moderation & Ban Management */}
        {activeSubTab === "users" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Community Guidelines Enforcement
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Super Admin can instantly ban bad actors who spoof GPS, harass channels, or
                  violate safety guidelines.
                </p>
              </div>

              <div className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                {users.filter((u) => u.isBanned).length} Suspended Accounts
              </div>
            </div>

            {/* Users List */}
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
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

                    {/* Action buttons */}
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

        {/* Ban User Confirmation Modal */}
        {banModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95">
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
      </div>
    </div>
  );
};
