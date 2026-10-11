import React, { useState } from "react";
import {
  Lock,
  User,
  KeyRound,
  AlertCircle,
  Radio,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { UserRecord } from "../../types";
import { apiFetch } from "../../utils/api";

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserRecord, token: string) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess, onClose }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please verify your credentials.");
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to sign in. Please check your username and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto relative">
        {/* Close / Observer option */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition"
            title="Continue as Guest Observer"
          >
            ✕
          </button>
        )}

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-50/60 border-b border-slate-100 text-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto shadow-md mb-3 border border-slate-200 bg-white flex items-center justify-center p-1">
            <img src="/rha-logo.png" alt="RHA-volunteers" className="w-full h-full object-contain rounded-xl" />
          </div>
          <h2 className="text-2xl font-black tracking-tight leading-none text-slate-900 select-none">
            RHA-volunteers
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto">
            Authorized sign-in for RHA Leads, Dispatchers, Food Drives &amp; Field Volunteers
          </p>
        </div>

        {/* Quick Demo Credentials */}
        <div className="px-5 pt-3 pb-0">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Quick Pre-Set Logins:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill("superadmin", "superadmin123")}
              className="px-2 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition text-center"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("admin", "adminpassword123")}
              className="px-2 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-700 text-[11px] font-bold transition text-center"
            >
              Admin Lead
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("user", "userpassword123")}
              className="px-2 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition text-center"
            >
              Participant
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Notice: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition"
                  placeholder="Enter your username..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition"
                  placeholder="Enter your password..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? "Authenticating..." : "Sign In to Tactical Radar"}
            </button>
          </form>

          {/* Registration Notice: Restricted to Super Admin Only */}
          <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-slate-800">Super Admin Provisioning Only:</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                New user accounts and role registrations are strictly authorized by the Super Administrator account for event safety and tactical verification.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-slate-400 text-[11px] text-center">
            Tactical field oversight with end-to-end encrypted GPS telemetry.
          </div>
        </div>
      </div>
    </div>
  );
};
