import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ShieldCheck, Radio } from "lucide-react";
import { ActiveCall } from "../../types";
import { audioCallManager } from "../../utils/audioCall";

interface DirectCallModalProps {
  call: ActiveCall | null;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

export const DirectCallModal: React.FC<DirectCallModalProps> = ({
  call,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
}) => {
  const [audioLevel, setAudioLevel] = useState(0);

  // Monitor audio wave levels during connected call
  useEffect(() => {
    if (!call || call.status !== "connected") return;

    const interval = setInterval(() => {
      const level = audioCallManager.getAudioLevel();
      setAudioLevel(level);
    }, 120);

    return () => clearInterval(interval);
  }, [call?.status]);

  if (!call) return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isIncomingRinging = call.status === "ringing" && call.isIncoming;
  const isOutgoingCalling = call.status === "calling" && !call.isIncoming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 p-6 text-center overflow-hidden relative">
        {/* Subtle background radar glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Security / No Phone Number Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-[11px] font-semibold mb-6 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Direct Peer Audio (No Phone #)</span>
        </div>

        {/* User Avatar with Pulsing Waves */}
        <div className="relative mx-auto w-28 h-28 mb-5 flex items-center justify-center">
          {call.status === "connected" && (
            <>
              <div
                className="absolute inset-0 rounded-full bg-emerald-500/20 transition-all duration-150"
                style={{
                  transform: `scale(${1 + (audioLevel / 100) * 0.45})`,
                  opacity: 0.3 + (audioLevel / 100) * 0.6,
                }}
              />
              <div
                className="absolute inset-2 rounded-full border border-emerald-400/40 transition-all duration-150"
                style={{
                  transform: `scale(${1 + (audioLevel / 100) * 0.25})`,
                }}
              />
            </>
          )}

          {(isIncomingRinging || isOutgoingCalling) && (
            <div className="absolute inset-0 rounded-full bg-indigo-500/25 animate-ping" />
          )}

          <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-800 to-indigo-600 border-2 border-indigo-400 flex items-center justify-center text-3xl font-bold shadow-xl">
            {call.otherUserName.charAt(0)}
          </div>
        </div>

        {/* User Info */}
        <h3 className="text-xl font-bold tracking-tight text-white mb-1 truncate">
          {call.otherUserName}
        </h3>
        <div className="text-xs text-indigo-200 capitalize font-medium mb-3">
          {call.otherUserRole} • Direct Voice Channel
        </div>

        {/* Status / Timer Indicator */}
        <div className="mb-8">
          {call.status === "connected" ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono text-sm font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatDuration(call.duration)}</span>
            </div>
          ) : isIncomingRinging ? (
            <div className="text-emerald-400 font-bold text-sm animate-pulse flex items-center justify-center gap-1.5">
              <Radio className="w-4 h-4" />
              <span>Incoming Voice Call...</span>
            </div>
          ) : (
            <div className="text-slate-400 font-medium text-sm flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Connecting Voice Channel...</span>
            </div>
          )}
        </div>

        {/* Controls */}
        {isIncomingRinging ? (
          // Accept or Reject Buttons
          <div className="flex items-center justify-center gap-6">
            <button
              id="call-reject-incoming-btn"
              onClick={onRejectCall}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition"
            >
              <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-lg active:scale-95 transition">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold">Decline</span>
            </button>

            <button
              id="call-accept-incoming-btn"
              onClick={onAcceptCall}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 active:scale-95 transition animate-bounce">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold">Accept</span>
            </button>
          </div>
        ) : (
          // Active Connected or Outgoing Controls
          <div className="flex items-center justify-center gap-4">
            {/* Mute Mic */}
            <button
              id="call-toggle-mute-btn"
              onClick={onToggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition border active:scale-95 ${
                call.isMuted
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              }`}
              title={call.isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {call.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* End Call */}
            <button
              id="call-end-active-btn"
              onClick={onEndCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-xl shadow-rose-950/60 active:scale-95 transition"
              title="End Voice Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            {/* Speaker Toggle */}
            <button
              id="call-toggle-speaker-btn"
              onClick={onToggleSpeaker}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition border active:scale-95 ${
                call.isSpeakerOn
                  ? "bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700"
                  : "bg-slate-800/50 text-slate-500 border-slate-800 hover:bg-slate-800"
              }`}
              title="Speaker output"
            >
              {call.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
