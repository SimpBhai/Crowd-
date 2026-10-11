import React, { useState } from "react";
import { Radio, AlertTriangle, Shield, Wifi, WifiOff, BellRing } from "lucide-react";
import { UserRecord } from "../../types";

interface TopHeaderProps {
  currentUser: UserRecord | null;
  isConnected: boolean;
  activeSosCount: number;
  totalUsersCount: number;
  movingUsersCount: number;
  onTriggerSos: () => void;
  onOpenSosDetails: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  isConnected,
  activeSosCount,
  totalUsersCount,
  movingUsersCount,
  onTriggerSos,
  onOpenSosDetails,
}) => {
  const [showSosConfirm, setShowSosConfirm] = useState(false);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "superadmin":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      case "admin":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "dispatcher":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/30";
      case "volunteer":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
      default:
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/30";
    }
  };

  return (
    <header className="flex-none shrink-0 w-full z-40 bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand & System Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-200 bg-white flex items-center justify-center p-0.5">
            <img src="/rha-logo.png" alt="RHA-volunteers" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-base sm:text-xl tracking-tight leading-none text-slate-900 select-none">
                RHA-volunteers
              </span>
              <span
                className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border shrink-0 ${
                  isConnected
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-rose-50 text-rose-600 border-rose-200"
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-2.5 h-2.5" />
                    <span>ONLINE</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-2.5 h-2.5" />
                    <span>OFFLINE</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <p className="hidden xs:block text-[9px] sm:text-[10px] uppercase tracking-widest text-emerald-600 font-semibold truncate">
                Robin Hood Army GPS Radar
              </p>
              <span className="hidden xs:inline text-slate-300">•</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                <strong className="text-emerald-600 font-bold">{totalUsersCount}</strong> volunteers (
                <strong className="text-cyan-500 font-bold">{movingUsersCount}</strong> live)
              </span>
            </div>
          </div>
        </div>

        {/* SOS Alert Banner or Trigger Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeSosCount > 0 && (
            <button
              id="header-sos-active-badge"
              onClick={onOpenSosDetails}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold animate-bounce shadow-lg shadow-rose-200 hover:bg-rose-700 transition"
              title="Active Emergency Beacon Detected"
            >
              <BellRing className="w-4 h-4" />
              <span>{activeSosCount} SOS ALERT</span>
            </button>
          )}

          {/* Quick SOS Trigger Button */}
          {currentUser && !currentUser.isBanned && (
            <div>
              {!showSosConfirm ? (
                <button
                  id="header-sos-trigger-btn"
                  onClick={() => setShowSosConfirm(true)}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden xs:inline">Distress</span> SOS
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-rose-600 p-1.5 rounded-xl text-white text-xs shadow-lg shadow-rose-200 animate-in fade-in">
                  <span className="px-1 text-[11px] font-semibold">Broadcast SOS?</span>
                  <button
                    id="confirm-sos-yes"
                    onClick={() => {
                      onTriggerSos();
                      setShowSosConfirm(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white text-rose-700 font-bold hover:bg-slate-100 text-[11px] shadow-sm"
                  >
                    YES
                  </button>
                  <button
                    id="confirm-sos-no"
                    onClick={() => setShowSosConfirm(false)}
                    className="px-2 py-1 rounded-lg text-white hover:bg-rose-700 text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Current User Role Pill */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-bold leading-none text-slate-900">
                  {currentUser.displayName}
                </p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">
                  {currentUser.role.replace("_", " ")} ONLINE
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-indigo-600 p-0.5 shrink-0 shadow-sm flex items-center justify-center">
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-black shadow-inner"
                  style={{ backgroundColor: currentUser.avatarColor || "#4f46e5" }}
                >
                  {currentUser.displayName.charAt(0)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
