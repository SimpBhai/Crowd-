import React, { useState } from "react";
import { ShieldCheck, Lock, User, KeyRound, AlertCircle, Sparkles } from "lucide-react";
import { UserRecord } from "../../types";

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserRecord, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [username, setUsername] = useState("superadmin");
  const [password, setPassword] = useState("superadmin123");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to sign in. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-b from-indigo-50/70 to-white border-b border-slate-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Crowd GPS Portal</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Authorized sign-in for real-time crowd dispatch, GPS telemetry & online voice communications
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Sign in error: </span>
                {errorMessage}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition"
                placeholder="Enter username..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition"
                placeholder="Enter password..."
              />
            </div>
          </div>

          <button
            id="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            {loading ? "Authenticating..." : "Sign In"}
          </button>

          {/* Quick-fill presets from env */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Environment Credentials
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                .env Configured
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="preset-superadmin"
                onClick={() => setPreset("superadmin", "superadmin123")}
                className="text-left px-2.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-slate-800 transition shadow-xs"
              >
                <div className="text-[11px] font-bold text-rose-700">Super Admin</div>
                <div className="text-[10px] text-slate-500 font-mono">superadmin</div>
              </button>

              <button
                type="button"
                id="preset-admin"
                onClick={() => setPreset("admin", "adminpassword123")}
                className="text-left px-2.5 py-2 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-slate-800 transition shadow-xs"
              >
                <div className="text-[11px] font-bold text-amber-700">Field Admin</div>
                <div className="text-[10px] text-slate-500 font-mono">admin</div>
              </button>

              <button
                type="button"
                id="preset-dispatcher"
                onClick={() => setPreset("dispatcher_emma", "userpassword123")}
                className="text-left px-2.5 py-2 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100 text-slate-800 transition shadow-xs"
              >
                <div className="text-[11px] font-bold text-cyan-700">Dispatcher</div>
                <div className="text-[10px] text-slate-500 font-mono">dispatcher_emma</div>
              </button>

              <button
                type="button"
                id="preset-user"
                onClick={() => setPreset("user", "userpassword123")}
                className="text-left px-2.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-slate-800 transition shadow-xs"
              >
                <div className="text-[11px] font-bold text-indigo-700">Citizen Alex</div>
                <div className="text-[10px] text-slate-500 font-mono">user</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
