import React from "react";
import { Phone, Zap, Shield, Users, User, X, Radio } from "lucide-react";
import { UserRecord, ProtestGroup } from "../../types";

interface CallInitiatePromptModalProps {
  target: { type: "user"; user: UserRecord } | { type: "group"; group: ProtestGroup } | null;
  isOpen: boolean;
  onConfirmCall: (autoAnswer: boolean) => void;
  onClose: () => void;
}

export const CallInitiatePromptModal: React.FC<CallInitiatePromptModalProps> = ({
  target,
  isOpen,
  onConfirmCall,
  onClose,
}) => {
  if (!isOpen || !target) return null;

  const isUser = target.type === "user";
  const user = isUser ? target.user : null;
  const group = !isUser ? target.group : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">Initiate Voice Channel</h3>
              <p className="text-xs text-indigo-200">Select Audio Transmission Protocol</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Profile Card */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3.5">
          {isUser && user ? (
            <>
              <div
                className="w-12 h-12 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: user.avatarColor || "#4f46e5" }}
              >
                {user.displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                    {user.displayName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                  <span>{user.isOnline ? "Online & Ready" : "Offline / Standby"}</span>
                  {user.customStatus && <span className="truncate">• {user.customStatus}</span>}
                </p>
              </div>
            </>
          ) : group ? (
            <>
              <div
                className="w-12 h-12 rounded-2xl border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: group.color || "#10b981" }}
              >
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                    {group.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                    Squad Call
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Broadcasts to <strong>{group.memberIds.length}</strong> registered squad units
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Calling Options */}
        <div className="p-4 sm:p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Choose Dispatch Ring Mode:
          </p>

          {/* Option 1: Tactical Auto-Pickup */}
          <button
            onClick={() => onConfirmCall(true)}
            className="w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 transition group shadow-sm flex items-start gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200 group-hover:scale-105 transition">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-extrabold text-sm text-emerald-950">
                  ⚡ Tactical Auto-Pickup (Intercom)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-200 text-emerald-800 uppercase shrink-0">
                  Auto-Answer
                </span>
              </div>
              <p className="text-xs text-emerald-800/80 mt-1 leading-snug">
                Audio channel opens <strong>automatically</strong> on target device without requiring recipient to manually approve or tap answer.
              </p>
              <div className="text-[10px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Urgent Marshal Orders & Immediate Field Dispatch</span>
              </div>
            </div>
          </button>

          {/* Option 2: Direct Ring (Standard Approval) */}
          <button
            onClick={() => onConfirmCall(false)}
            className="w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 transition group shadow-sm flex items-start gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 group-hover:scale-105 transition">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-extrabold text-sm text-slate-900">
                  📞 Direct Ring (Standard Call)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-700 uppercase shrink-0">
                  Requires Approval
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Recipient receives an incoming ringing chime with caller details. The user must <strong>manually approve</strong> and tap "Accept".
              </p>
              <div className="text-[10px] text-slate-500 font-semibold mt-1.5 flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-500" />
                <span>Standard voice inquiry & non-urgent coordination</span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
