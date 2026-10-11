import React, { useState, useEffect } from "react";
import {
  User,
  MapPin,
  Compass,
  Gauge,
  Activity,
  Mic,
  Volume2,
  LogOut,
  Navigation,
  Shield,
  Smartphone,
  Crosshair,
  RefreshCw,
  Radio,
  CheckCircle2,
  LogIn,
  Server,
  Globe,
  Save,
  RotateCcw,
} from "lucide-react";
import { MovementStatus, UserRecord } from "../../types";
import { audioCallManager } from "../../utils/audioCall";
import { getEffectiveServerDisplay, setCustomServerUrl } from "../../utils/api";

interface UserProfileViewProps {
  currentUser: UserRecord | null;
  onUpdateStatus: (status: MovementStatus) => void;
  onLogout: () => void;
  isRealGpsActive?: boolean;
  onRefreshGps?: () => void;
  onSwitchUserPrompt: () => void;
  gpsAccuracy?: number | null;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  onUpdateStatus,
  onLogout,
  isRealGpsActive = false,
  onRefreshGps,
  onSwitchUserPrompt,
  gpsAccuracy = null,
}) => {
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [currentServerDisplay, setCurrentServerDisplay] = useState(getEffectiveServerDisplay());
  const [customServerInput, setCustomServerInput] = useState(() => {
    return (typeof window !== "undefined" && localStorage.getItem("custom_server_url")) || "";
  });
  const [serverSavedNote, setServerSavedNote] = useState<string | null>(null);

  const handleSaveCustomServer = () => {
    setCustomServerUrl(customServerInput);
    const updated = getEffectiveServerDisplay();
    setCurrentServerDisplay(updated);
    setServerSavedNote("Server URL updated! Reconnecting...");
    setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  const handleResetServer = () => {
    setCustomServerUrl(null);
    setCustomServerInput("");
    setCurrentServerDisplay(typeof window !== "undefined" ? window.location.origin : "");
    setServerSavedNote("Reset to automatic detection! Reconnecting...");
    setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  useEffect(() => {
    let interval: number;
    if (micTesting) {
      interval = window.setInterval(() => {
        const lvl = audioCallManager.getAudioLevel();
        setMicLevel(lvl);
      }, 100);
    } else {
      setMicLevel(0);
    }
    return () => clearInterval(interval);
  }, [micTesting]);

  const handleToggleMicTest = async () => {
    if (!micTesting) {
      await audioCallManager.requestMicrophone();
      setMicTesting(true);
    } else {
      audioCallManager.cleanupCall();
      setMicTesting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50 p-3 sm:p-6 pb-16">
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Guest Observer Mode</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              You are currently viewing live crowd telemetry as a guest observer. Sign in with verified credentials to broadcast messages, share real-time GPS telemetry, and participate in peer voice radio.
            </p>

            <button
              id="user-view-signin-btn"
              onClick={onSwitchUserPrompt}
              className="mt-5 w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Credentials</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Available Role Permissions</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 shrink-0">Super Admin</span>
                <span className="text-[11px] leading-relaxed">System-wide command, set global assembly beacons, provision users, assign squads.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">Admin Lead</span>
                <span className="text-[11px] leading-relaxed">Assign tactical waypoint posts, monitor all units, voice calls, broadcast notices.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 shrink-0">Participant</span>
                <span className="text-[11px] leading-relaxed">Broadcast crowd chat, share live GPS pin, send SOS distress beacons, acknowledge posts.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-3 sm:p-6 pb-12">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* User Card Header */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-200 shrink-0 border-2 border-indigo-500"
              style={{ backgroundColor: currentUser.avatarColor || "#4f46e5" }}
            >
              {currentUser.displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {currentUser.displayName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                  {currentUser.role}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                @{currentUser.username} • Node ID: {currentUser.id}
              </div>
              <div className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected to Real-time Dispatch Network</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2">
            <button
              id="user-switch-account-btn"
              onClick={onSwitchUserPrompt}
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              Switch Role
            </button>
            <button
              id="user-logout-btn"
              onClick={onLogout}
              className="flex-1 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Live GPS Telemetry Dashboard (100% REAL) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-900">Real Device GPS Telemetry</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {isRealGpsActive ? "GPS Active" : "Stationary"}
              </span>
            </div>
            {onRefreshGps && (
              <button
                onClick={onRefreshGps}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Fix</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Latitude
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {currentUser.location.lat.toFixed(5)}° N
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Longitude
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {currentUser.location.lng.toFixed(5)}° E
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-indigo-600" /> Speed
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {(currentUser.location.speed || 0).toFixed(1)} km/h
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Compass className="w-3 h-3 text-indigo-600" /> Heading
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {currentUser.location.heading || 0}°
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Precision Accuracy:{" "}
              <strong className="text-slate-800 font-mono">
                {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : `±${currentUser.location.accuracy || 5}m`}
              </strong>
            </span>
            <span className="font-mono text-[11px]">
              Last Fix: {new Date(currentUser.location.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Set Movement Status */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-900">Current Movement Status</h4>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Your status is broadcast to event administrators, first responders, and users on the satellite map in real time.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "stationary", label: "Stationary", icon: "🛑" },
              { id: "walking", label: "Walking", icon: "🚶" },
              { id: "running", label: "Running", icon: "🏃" },
              { id: "in_transit", label: "In-Transit", icon: "🚗" },
            ].map((st) => (
              <button
                key={st.id}
                id={`status-btn-${st.id}`}
                onClick={() => onUpdateStatus(st.id as MovementStatus)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  currentUser.movementStatus === st.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span>{st.icon}</span>
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audio / Calling Hardware Diagnostics */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">
                Online Calling Hardware (Zero Phone Number)
              </h4>
            </div>
            <button
              id="user-test-mic-btn"
              onClick={handleToggleMicTest}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                micTesting
                  ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
              }`}
            >
              {micTesting ? "Stop Test" : "Test Microphone"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Real WebRTC & AudioContext pipeline test for real-time voice streaming with zero phone numbers or cellular service.
          </p>

          {micTesting && (
            <div className="space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Input Speech Volume</span>
                <span className="font-mono font-semibold">{micLevel}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, micLevel)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Backend & Railway Server Connection Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">
                Backend Server & Railway Connection
              </h4>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Your mobile app connects to this server for real-time GPS telemetry, group calls, and messages.
          </p>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Currently Connected Server
            </span>
            <div className="font-mono text-xs text-slate-800 font-semibold break-all flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{currentServerDisplay}</span>
            </div>
          </div>

          {serverSavedNote && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{serverSavedNote}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Connect to Custom Railway URL (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. https://your-project.up.railway.app"
                value={customServerInput}
                onChange={(e) => setCustomServerInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                onClick={handleSaveCustomServer}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-200 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              {customServerInput && (
                <button
                  onClick={handleResetServer}
                  title="Reset to default detected server"
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              *By default, the app automatically detects your Railway domain. You only need to type a URL here if you want to point a standalone app to a different Railway server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
