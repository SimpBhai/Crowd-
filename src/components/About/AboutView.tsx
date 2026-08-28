import React from "react";
import { Map, Radio, Phone, ShieldCheck, HeartHandshake, Eye, ExternalLink } from "lucide-react";

export const AboutView: React.FC = () => {
  return (
    <div className="h-[calc(100vh-144px)] overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Map className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                About Crowd GPS Radar
              </h2>
              <p className="text-xs text-slate-500">
                OpenStreetMap real-time crowd tracking, direct audio calling & safety dispatch
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Crowd GPS Radar empowers event coordinators, first responders, and community
            participants to coordinate safely in dense urban settings. Equipped with live GPS telemetry,
            role-based filtering, peer-to-peer browser voice calls (requiring no phone numbers), and
            rigorous community guideline enforcement.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Map Technology */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Map className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">OpenStreetMap Engine</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Powered by OpenStreetMap raster tile providers and Leaflet mapping client. High-frequency
              vector coordinates, heading indicators, and dynamic crowd density circles with zero
              proprietary vendor lock-in.
            </p>
          </div>

          {/* Online Audio Calling */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Phone className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Online Voice (No Phone #)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Direct device-to-device audio communication powered by the Web Audio API and WebRTC
              signaling. Users and administrators can talk in real time without exchanging phone
              numbers or cellular SIM cards.
            </p>
          </div>

          {/* Real-Time GPS Telemetry */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
                <Radio className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">GPS & Movement Status</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tracks speed (km/h), heading direction (°), altitude, and status: Stationary, Walking,
              Running, In-Transit, and Emergency SOS distress beacons.
            </p>
          </div>

          {/* Community Guidelines & Moderation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Super Admin Audit Logs</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time audit log stream logging logins, GPS movements, SOS signals, and bans. Super
              Admins can immediately ban rule violators with permanent termination of active WebSocket
              sessions.
            </p>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Community Safety Guidelines</h3>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
            <li>
              <strong>No GPS Teleportation or Spoofing:</strong> Modifying coordinates to fabricate fake
              movement compromises public safety and triggers immediate suspension.
            </li>
            <li>
              <strong>Respectful Communication:</strong> Broadcast channels and online voice calls must
              remain respectful and constructive. Harassment is strictly prohibited.
            </li>
            <li>
              <strong>Responsible SOS Usage:</strong> The Emergency SOS Beacon triggers dispatch alerts
              to all active admins. False alarms are punishable by an account ban.
            </li>
          </ul>
        </div>

        {/* OpenStreetMap Attribution Footer */}
        <div className="text-center text-[11px] text-slate-400 py-3">
          Map data &copy;{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-indigo-600"
          >
            OpenStreetMap contributors
          </a>{" "}
          • Licensed under ODbL
        </div>
      </div>
    </div>
  );
};
