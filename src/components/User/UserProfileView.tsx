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
} from "lucide-react";
import { MovementStatus, UserRecord } from "../../types";
import { audioCallManager } from "../../utils/audioCall";

interface UserProfileViewProps {
  currentUser: UserRecord | null;
  onUpdateStatus: (status: MovementStatus) => void;
  onLogout: () => void;
  isSimulatingMovement: boolean;
  onToggleSimulatedMovement: () => void;
  onSwitchUserPrompt: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  onUpdateStatus,
  onLogout,
  isSimulatingMovement,
  onToggleSimulatedMovement,
  onSwitchUserPrompt,
}) => {
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

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

  if (!currentUser) return null;

  return (
    <div className="h-[calc(100vh-144px)] overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* User Card Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        {/* Live GPS Telemetry Dashboard */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">Live GPS Telemetry</h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Updated: {new Date(currentUser.location.lastUpdated).toLocaleTimeString()}
            </span>
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
                {currentUser.location.lng.toFixed(5)}° W
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
        </div>

        {/* Set Movement Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-900">Current Movement Status</h4>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Your movement status is broadcast to event administrators and participants on the map.
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

          {/* Movement Patrol Simulator */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                <span>Simulate Walking / Movement on Map</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Emulates continuous GPS walk loop so you can view live movement on the map.
              </p>
            </div>
            <button
              id="user-toggle-sim-btn"
              onClick={onToggleSimulatedMovement}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                isSimulatingMovement
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 animate-pulse"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isSimulatingMovement ? "Active (Stop)" : "Start Walk"}
            </button>
          </div>
        </div>

        {/* Audio / Calling Hardware Diagnostics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-sm text-slate-900">
                Online Calling Diagnostics (Zero Phone Number)
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
            Test your device microphone and audio level before initiating direct calls with other
            users or administrators.
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
      </div>
    </div>
  );
};
