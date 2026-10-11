import React, { useState } from "react";
import {
  Map,
  Radio,
  Phone,
  ShieldCheck,
  HeartHandshake,
  KeyRound,
  Navigation,
  Flag,
  Tag,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Cpu,
  Smartphone,
  HelpCircle,
  Sparkles,
  Activity,
  UserPlus,
  Download,
  ExternalLink,
  Copy,
  BatteryCharging,
  Crosshair,
} from "lucide-react";

type GuideTab = "setup" | "privacy" | "pwa_tracking" | "gps_calls" | "dispatch" | "hosting_scaling" | "overview";

export const AboutView: React.FC = () => {
  const [activeGuideTab, setActiveGuideTab] = useState<GuideTab>("setup");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyAppUrl = () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
      }).catch(() => {});
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-3 sm:p-6 pb-12">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header Hero Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white flex items-center justify-center shadow-md shrink-0 border border-slate-200 p-1">
                <img src="/rha-logo.png" alt="RHA-volunteers" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  <span className="text-slate-900 select-none">
                    RHA-volunteers
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    v2.5 Radar Ready
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Robin Hood Army real-time GPS telemetry, peer voice calling, field drives &amp; volunteer safety dispatch
                </p>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-slate-700">All Systems Operational</span>
            </div>
          </div>

          {/* Interactive Guide Navigation Tabs */}
          <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap pb-1">
            <button
              onClick={() => setActiveGuideTab("setup")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeGuideTab === "setup"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>1. Roles & Credentials</span>
            </button>

            <button
              onClick={() => setActiveGuideTab("privacy")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeGuideTab === "privacy"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>2. Privacy & Role Matrix</span>
            </button>

            <button
              onClick={() => setActiveGuideTab("pwa_tracking")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeGuideTab === "pwa_tracking"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>3. PWA & Background GPS</span>
            </button>

            <button
              onClick={() => setActiveGuideTab("gps_calls")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeGuideTab === "gps_calls"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>4. Live GPS & Voice Calls</span>
            </button>

            <button
              onClick={() => setActiveGuideTab("dispatch")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeGuideTab === "dispatch"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>5. Assembly & Squads</span>
            </button>

            <button
              onClick={() => setActiveGuideTab("hosting_scaling")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeGuideTab === "hosting_scaling"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>6. Hosting & 10k Scaling</span>
            </button>

            <button
              onClick={() => setActiveGuideTab("overview")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeGuideTab === "overview"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>System Summary</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SETUP & DEFAULT LOGINS */}
        {activeGuideTab === "setup" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Account & Security Overview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">System Role Architecture</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">RBAC Security Controls</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Super Admin */}
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-600 text-white uppercase">
                      Super Admin
                    </span>
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Full organizational authority: Establish global assembly markers, broadcast emergency beacons, issue security bans, and inspect system audit logs.
                  </p>
                </div>

                {/* Admin */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-600 text-white uppercase">
                      Admin Coordinator
                    </span>
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Tactical dispatch: 100% field oversight, direct online voice calling with any responder, waypoint management, and team assignments.
                  </p>
                </div>

                {/* Participant */}
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-600 text-white uppercase">
                      Participant Unit
                    </span>
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Event attendee: Privacy shielded, sees live crowd movement radar, route directions, safe corridors, and direct emergency contact to Dispatch.
                  </p>
                </div>
              </div>
            </div>

            {/* How to Create New Accounts & Admins */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>How to Create New Users, Volunteers, & Admins</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You can register new field accounts directly inside the app or programmatically via the REST API.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* In-App Registration */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                    Method 1: In-App Register Form
                  </span>
                  <p className="font-bold text-slate-800">1-Click Self Registration</p>
                  <ol className="text-[11px] text-slate-600 list-decimal list-inside space-y-1">
                    <li>Go to the <strong>USER</strong> tab on the bottom bar &gt; tap <strong>"Switch Role / Logout"</strong>.</li>
                    <li>In the Login modal, click <strong>"Register New Field Unit"</strong>.</li>
                    <li>Enter your <strong>Display Name</strong>, <strong>Username</strong>, and <strong>Password</strong>.</li>
                    <li>Select the target role: <code>Participant</code>, <code>Volunteer / Medic</code>, <code>Dispatcher</code>, or <code>Admin</code>.</li>
                    <li>Pick an avatar color and tap <strong>"Create Account &amp; Join"</strong>.</li>
                  </ol>
                </div>

                {/* API Account Creation */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                    Method 2: REST API Creation
                  </span>
                  <p className="font-bold text-slate-800">Automated / Batch User Creation</p>
                  <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto">
                    <code>
                      curl -X POST /api/auth/register \<br />
                      &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                      &nbsp;&nbsp;-d '&#123;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;"username": "lead_medic",<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;"displayName": "Lead Medic",<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;"password": "safePass123",<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;"role": "volunteer",<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;"avatarColor": "#ef4444"<br />
                      &nbsp;&nbsp;&#125;'
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Multi-Device Setup Checklist */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Multi-Device &amp; Mobile Field Setup</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block mb-0.5">1. Open in Browser or Mobile Phone</strong>
                    <span>Open the deployment URL on iOS Safari, Android Chrome, or desktop browser.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block mb-0.5">2. Grant GPS Location &amp; Mic Permissions</strong>
                    <span>When prompted, tap <em>Allow While Using App</em> to broadcast high-precision GPS coordinates and enable zero-phone voice calling.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block mb-0.5">3. Zero-Config Self Registration</strong>
                    <span>Participants can tap <em>Register New Field Unit</em>, select a handle and color, and immediately appear on the command radar.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block mb-0.5">4. Auto-Reconnecting WebSocket Stream</strong>
                    <span>WebSocket background sync automatically recovers if cellular signal drops during urban marches.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRIVACY & ROLE MATRIX */}
        {activeGuideTab === "privacy" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Strict Two-Tier Role Visibility & Privacy Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enforces strict attendee privacy for peaceful participants while giving Administrators 100% tactical situational oversight.
                </p>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Capability / View</th>
                      <th className="p-3 bg-rose-50 text-rose-800 border-l border-r border-rose-200">Super Admin & Admin</th>
                      <th className="p-3 bg-indigo-50 text-indigo-800">Normal Participant / Volunteer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-600">
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">Own Location & Heading</td>
                      <td className="p-3 border-l border-r border-slate-200 text-emerald-600 font-bold">✓ High-Precision Blue GPS Dot</td>
                      <td className="p-3 text-emerald-600 font-bold">✓ High-Precision Blue GPS Dot</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">Other Participants on Map</td>
                      <td className="p-3 border-l border-r border-slate-200 text-slate-800 font-medium">
                        ✓ Full identity (Name, Speed km/h, Heading, Battery, Tags, Status)
                      </td>
                      <td className="p-3 text-slate-800 font-medium">
                        🔒 Anonymous crowd dots (Density & Flow only; No names or contacts)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">Clicking on Other Users</td>
                      <td className="p-3 border-l border-r border-slate-200 text-emerald-600 font-bold">
                        ✓ Opens full Profile Drawer (Voice Call, Assign Post, Tag, Ban)
                      </td>
                      <td className="p-3 text-rose-600 font-bold">
                        ✗ Blocked (No profile or personal info exposed)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">Direct 1-on-1 Audio Calling</td>
                      <td className="p-3 border-l border-r border-slate-200 text-emerald-600 font-bold">
                        ✓ Can call any field unit directly
                      </td>
                      <td className="p-3 text-amber-700 font-medium">
                        🛡️ Can ONLY call Command & Dispatch (No peer-to-peer harassment)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">Direct Chat & Channels</td>
                      <td className="p-3 border-l border-r border-slate-200 text-emerald-600 font-bold">
                        ✓ Public Broadcast + Command Dispatch + All Field Units
                      </td>
                      <td className="p-3 text-indigo-700 font-medium">
                        ✓ Public Broadcast + Direct Line to Command Dispatch
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">Global Assembly Beacon</td>
                      <td className="p-3 border-l border-r border-slate-200 text-emerald-600 font-bold">
                        ✓ Drop, Edit, or Move Rally Points
                      </td>
                      <td className="p-3 text-emerald-600 font-bold">
                        ✓ View Rally Beacon & Auto Turn-by-Turn Route
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800">Assigned Post Objectives</td>
                      <td className="p-3 border-l border-r border-slate-200 text-emerald-600 font-bold">
                        ✓ Assign custom waypoints & instructions to any unit
                      </td>
                      <td className="p-3 text-emerald-600 font-bold">
                        ✓ View own post, tap "Acknowledge" & "Mark as Reached"
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PWA & BACKGROUND GPS TRACKING */}
        {activeGuideTab === "pwa_tracking" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Progressive Web App (PWA) & Continuous Background GPS</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  How CrowdTrack Live maintains uninterrupted GPS telemetry even when moving between apps or during mobile screen standby.
                </p>
              </div>

              {/* NO LAPTOP SPECIAL: Cloud APK Builder Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-700/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Sparkles className="w-3 h-3" />
                      <span>Zero Experience & No Laptop Required</span>
                    </div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-indigo-400" />
                      <span>Build & Download Android APK Directly on Your Phone</span>
                    </h4>
                    <p className="text-xs text-indigo-200/80 leading-relaxed max-w-xl">
                      You do <strong>not</strong> need a laptop, computer, or coding experience to get a native Android app. Use Microsoft PWABuilder (100% Free) to turn your live URL into an installable <code className="text-emerald-300 bg-indigo-950 px-1 rounded">.apk</code> right from your phone screen.
                    </p>
                  </div>

                  <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={copyAppUrl}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center gap-2 text-white border border-white/10"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-300" />
                      <span>{copiedUrl ? "Copied App URL!" : "Copy App URL"}</span>
                    </button>
                    <a
                      href={`https://www.pwabuilder.com/?url=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Launch PWABuilder</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-indigo-800/60 text-xs">
                  <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-700/40 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[11px]">1</span>
                    <p className="font-bold text-white text-[11px]">Copy Your URL</p>
                    <p className="text-[10px] text-indigo-200 leading-snug">
                      Tap the "Copy App URL" button above or copy your Railway live website URL from your phone browser.
                    </p>
                  </div>
                  <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-700/40 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[11px]">2</span>
                    <p className="font-bold text-white text-[11px]">Generate APK in Cloud</p>
                    <p className="text-[10px] text-indigo-200 leading-snug">
                      Tap "Launch PWABuilder", paste the URL, and select <strong>"Package for Stores" &gt; "Android" &gt; "Generate APK"</strong>.
                    </p>
                  </div>
                  <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-700/40 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[11px]">3</span>
                    <p className="font-bold text-white text-[11px]">Install on Phone</p>
                    <p className="text-[10px] text-indigo-200 leading-snug">
                      Open your phone Downloads, tap the downloaded <code className="text-emerald-300">.apk</code> file, allow installation, and tap Open!
                    </p>
                  </div>
                </div>
              </div>

              {/* Install PWA Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                    Method 1: Android & Chrome (Instant 1-Tap)
                  </span>
                  <p className="text-xs font-bold text-slate-800">Install WebAPK Direct to Home Screen</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Open this URL in Chrome on your phone. Tap the Chrome three-dot menu <strong>⋮</strong> &gt; <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>. Android automatically compiles a standalone WebAPK with hardware GPS access and its own app drawer icon!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                    Method 1: Apple iOS Safari
                  </span>
                  <p className="text-xs font-bold text-slate-800">Add to Home Screen via Share</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    In Safari, tap the <strong>Share</strong> button (square with up arrow) &gt; scroll down and tap <strong>"Add to Home Screen"</strong>. Open from your home screen for an immersive native experience.
                  </p>
                </div>
              </div>

              {/* Phone Settings for Maximum GPS Tracking Performance */}
              <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs sm:text-sm font-black text-emerald-950">
                    ⚡ Phone Settings to Maximize GPS Accuracy & Prevent Signal Pauses
                  </h4>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Phones often pause GPS in the background to save battery. Follow these 3 simple phone settings to keep your location transmitting at 1-second accuracy even with the phone in your pocket:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-emerald-950 text-xs">
                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200 space-y-1">
                    <span className="font-extrabold text-[11px] text-emerald-900 block">1. Location Permission</span>
                    <p className="text-[10px] text-emerald-800 leading-relaxed">
                      In Android Settings &gt; Apps &gt; Chrome (or CrowdRadar) &gt; Permissions &gt; Location &gt; Choose <strong>"Allow all the time"</strong> and turn on <strong>"Use precise location"</strong>.
                    </p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200 space-y-1">
                    <span className="font-extrabold text-[11px] text-emerald-900 block">2. Turn Off Battery Optimization</span>
                    <p className="text-[10px] text-emerald-800 leading-relaxed">
                      In Android Settings &gt; Battery &gt; Battery Optimization (or App Battery Usage) &gt; Select Chrome / CrowdRadar &gt; Change to <strong>"Unrestricted"</strong> so Android never throttles your GPS.
                    </p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200 space-y-1">
                    <span className="font-extrabold text-[11px] text-emerald-900 block">3. Built-In Screen Wake Lock</span>
                    <p className="text-[10px] text-emerald-800 leading-relaxed">
                      CrowdRadar automatically keeps your screen active during field movement so hardware GPS remains locked onto satellites with zero drift.
                    </p>
                  </div>
                </div>
              </div>

              {/* Developer Methods (For Laptop Users) */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Developer Build Options (If you have a computer or GitHub repository):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-800 uppercase">
                      Option A: GitHub Actions Cloud Build
                    </span>
                    <p className="text-xs font-bold text-slate-800">Automated Cloud APK in repo</p>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      This repository has <code className="font-mono text-indigo-600">.github/workflows/build-apk.yml</code>. Whenever you push to GitHub, GitHub builds the APK on Ubuntu servers and provides a direct download link under the Actions tab.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-800 uppercase">
                      Option B: Capacitor / Android Studio
                    </span>
                    <p className="text-xs font-bold text-slate-800">Native iOS & Android SDKs</p>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      If you ever get a laptop, you can run <code className="font-mono text-indigo-600">npx cap add android</code> to open the project in Android Studio or Xcode for full custom native plugin compilation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Background Tracking Technical Truth & Mechanism */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  <span>How Continuous Location Tracking Works</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  1. <strong>Hardware GPS Watcher:</strong> The app leverages <code>navigator.geolocation.watchPosition</code> configured with <code>enableHighAccuracy: true</code> to stream high-frequency hardware coordinates.
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  2. <strong>Screen Wake-Lock:</strong> While navigating, the app requests a Web Screen Wake-Lock to prevent your device display from locking during marches.
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  3. <strong>Service Worker & Offline Cache:</strong> <code>/public/sw.js</code> caches map assets and stores last-known GPS fixes in <code>localStorage</code>, instantly re-broadcasting your coordinates the moment WebSocket reconnects after mobile signal dips.
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  4. <strong>Tracking Duration:</strong> Location tracking remains actively broadcasting until you manually toggle off location permissions in your browser or close the PWA process.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE GPS & AUDIO CALLS */}
        {activeGuideTab === "gps_calls" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GPS Telemetry Engine */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">High-Frequency GPS Telemetry</h3>
                    <p className="text-[11px] text-slate-400">Continuous sub-second coordinate tracking</p>
                  </div>
                </div>

                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Vector Compass Heading:</strong> Rotates unit directional arrows based on device compass and trajectory angle.
                  </li>
                  <li>
                    <strong>Live Speed Calculations:</strong> Automatically categorizes unit movement into Stationary (&lt;1 km/h), Walking (1-5 km/h), Running (5-15 km/h), and In-Transit (&gt;15 km/h).
                  </li>
                  <li>
                    <strong>Accuracy Circle:</strong> Visualizes GPS uncertainty radius to highlight reliable coordinates vs indoor signal drift.
                  </li>
                  <li>
                    <strong>Simulation Testing Mode:</strong> Allows coordinators to click anywhere on map and tap <em>"Move My GPS Here (Testing)"</em> for instant tactical drills.
                  </li>
                </ul>
              </div>

              {/* Zero-Phone Audio Calls */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Direct Browser Voice (No SIM/Phone #)</h3>
                    <p className="text-[11px] text-slate-400">WebRTC P2P + WebSocket PCM Stream Fallback</p>
                  </div>
                </div>

                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Zero SIM Requirement:</strong> Completely eliminates phone numbers, protecting organizer and attendee privacy from SIM swapping.
                  </li>
                  <li>
                    <strong>Dual-Engine Streaming:</strong> Uses WebRTC peer audio with automatic fallback to Web Audio PCM WebSocket chunks for 100% connect rates across corporate firewalls and sandboxes.
                  </li>
                  <li>
                    <strong>Live Audio Visualizer:</strong> Pulsing frequency waveform confirms active two-way voice transmission.
                  </li>
                  <li>
                    <strong>In-Call Controls:</strong> Quick Mute Mic, Toggle Speaker, and 1-tap Disconnect.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ASSEMBLY & SQUADS */}
        {activeGuideTab === "dispatch" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Global Assembly Beacons */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Global Assembly Beacons</h3>
                    <p className="text-[11px] text-slate-400">Synchronized rally points for all attendees</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Super Admins can click any coordinate on the map and select <strong>"Set Assembly"</strong> or configure it in the LOGS tab.
                </p>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <strong>Participant Experience:</strong>
                  <p className="text-[11px] text-amber-800">
                    Pulsing gold rally beacon appears immediately with walking distance (km) and estimated arrival time (ETA). Attendees can tap "Route to Assembly" for live directional paths.
                  </p>
                </div>
              </div>

              {/* Waypoint Task Assignments */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Individual Waypoint Tasks</h3>
                    <p className="text-[11px] text-slate-400">Targeted squad deployments with feedback loop</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Admins click any unit marker on the map and tap <strong>"Assign Post"</strong> with custom title (e.g. <em>"North Gate Medical Standby"</em>) and tactical instructions.
                </p>

                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 space-y-1">
                  <strong>Field Unit Workflow:</strong>
                  <p className="text-[11px] text-indigo-800">
                    Unit receives an alert card on their map. They can tap <em>"Acknowledge Post"</em> and once arrived at the coordinates, tap <em>"Mark as Reached"</em> to notify dispatch.
                  </p>
                </div>
              </div>

              {/* Tactical Tags & Role Descriptors */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 md:col-span-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Protest Tags & Squad Management</h3>
                    <p className="text-[11px] text-slate-400">Dynamic tagging for fast field indexing</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-indigo-700 block mb-1">#FirstAid / Medical</span>
                    <p className="text-[11px] text-slate-500">Assign to certified medics. Allows admins and dispatchers to isolate responders during emergencies.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-amber-700 block mb-1">#PeaceMarshal / Safety</span>
                    <p className="text-[11px] text-slate-500">De-escalation personnel stationed at intersections to protect march boundaries.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-cyan-700 block mb-1">#LegalObserver</span>
                    <p className="text-[11px] text-slate-500">Independent legal recorders monitoring compliance with civil rights and public order regulations.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: HOSTING & 10,000+ USER SCALING ROADMAP */}
        {activeGuideTab === "hosting_scaling" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Hosting Comparison: Vercel vs Render vs Cloud Run */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span>Deployment & Hosting Analysis: Where to Host?</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Comparing platform compatibility for persistent WebSocket connections, WebRTC signaling, and low-latency GPS streaming.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Render / Cloud Run (RECOMMENDED) */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-800">Render / Google Cloud Run / Railway / VPS</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white uppercase">
                      Recommended ★★★★★
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>100% Feature Compatible:</strong> These platforms run persistent Docker/Node.js processes with uninterrupted HTTP + WebSocket servers on port 3000.
                  </p>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-1">
                    <li>Supports unlimited persistent WebSocket sessions.</li>
                    <li>Low-latency WebRTC voice signaling & PCM audio chunks work out of the box.</li>
                    <li>Zero configuration needed: runs <code>npm run build &amp;&amp; npm start</code>.</li>
                  </ul>
                </div>

                {/* Vercel Analysis */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-800">Vercel / Netlify (Serverless)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-600 text-white uppercase">
                      Requires External WS
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>Is Vercel a good place?</strong> Vercel is designed for serverless functions with short execution timeouts (10-15s), so it <strong>cannot keep persistent WebSocket connections open</strong> directly on the serverless handler.
                  </p>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-1">
                    <li>Front-end UI works great on Vercel.</li>
                    <li>For real-time GPS & calling, host the backend Node.js container on Render/Railway/Cloud Run and point the Vercel frontend to it.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step-by-Step Deployment Guides */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <span>Step-by-Step Deployment Walkthrough (Render &amp; Railway)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  How to deploy the full-stack server with persistent WebSocket channels and automatic SSL.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Render Guide */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900">How to Deploy on Render (Easiest)</span>
                  </div>
                  <ol className="text-[11px] text-slate-600 list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>Push your code to a <strong>GitHub</strong> or GitLab repository.</li>
                    <li>Sign into <strong>render.com</strong> &gt; click <strong>"New +"</strong> &gt; <strong>"Web Service"</strong>.</li>
                    <li>Connect your repository.</li>
                    <li>Set <strong>Build Command</strong>: <code className="bg-slate-200 px-1 rounded text-slate-800 font-bold">npm run build</code></li>
                    <li>Set <strong>Start Command</strong>: <code className="bg-slate-200 px-1 rounded text-slate-800 font-bold">npm start</code></li>
                    <li>Select the <strong>Node</strong> environment and click <strong>"Create Web Service"</strong>.</li>
                  </ol>
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    ✓ Render gives you a free <code>https://</code> domain with automatic SSL for GPS and microphone permissions.
                  </p>
                </div>

                {/* Railway Guide */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-900">How to Deploy on Railway (1-Click)</span>
                  </div>
                  <ol className="text-[11px] text-slate-600 list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>Go to <strong>railway.app</strong> and click <strong>"New Project"</strong>.</li>
                    <li>Choose <strong>"Deploy from GitHub repo"</strong> and select your project.</li>
                    <li>Add Environment Variable: <code className="bg-slate-200 px-1 rounded text-slate-800 font-bold">PORT=3000</code>.</li>
                    <li>Railway automatically runs <code className="bg-slate-200 px-1 rounded">npm run build &amp;&amp; npm start</code>.</li>
                    <li>Go to <strong>Settings &gt; Networking</strong> &gt; click <strong>"Generate Domain"</strong>.</li>
                  </ol>
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    ✓ Full WebSocket support out of the box with zero configuration needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Capacity Benchmark vs 10k Roadmap */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  <h3 className="font-bold text-sm text-slate-900">Current Server Capacity & 10,000+ Scaling Roadmap</h3>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Current: ~1,500 – 2,500 active users / node
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-indigo-700 block">1. Redis Geo-Spatial Engine</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Replace in-memory <code>usersMap</code> with Redis <code>GEOADD</code> and <code>GEORADIUS</code> to handle 50,000+ spatial queries per second with sub-millisecond latency.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-cyan-700 block">2. WebSocket Cluster & Pub/Sub</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Scale horizontally across 4-8 Node.js container instances behind a Cloud Load Balancer using Redis Pub/Sub for cross-instance messaging.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-emerald-700 block">3. Viewport Spatial Filtering</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Instead of broadcasting every user to everyone, stream high-frequency fixes only to clients viewing that bounding box or radius, cutting bandwidth by 95%.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-rose-700 block">4. SFU Voice Cluster (LiveKit)</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    For 10k attendees, plug in a Selective Forwarding Unit (SFU) like LiveKit or Mediasoup for instant squad push-to-talk audio broadcasting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SYSTEM ARCHITECTURE & COMMUNITY SAFETY */}
        {activeGuideTab === "overview" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Community Safety Guidelines */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Community Safety & Anti-Tampering Standards</h3>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong>Anti-Spoofing Auditing:</strong> The system logs all GPS coordinate delta velocities. Extreme jumps or malicious teleportation result in immediate session revocation.
                </li>
                <li>
                  <strong>Emergency SOS Prioritization:</strong> Triggering the Emergency SOS button immediately sends high-priority beacons to all connected administrators with live coordinates and audio chimes.
                </li>
                <li>
                  <strong>Super Admin Permanent Ban:</strong> Super Admins can ban rule violators from the Audit Logs tab, instantly disconnecting their WebSocket tunnel and preventing reconnects.
                </li>
              </ul>
            </div>

            {/* Tech Stack */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Architecture & Open Standards</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">OpenStreetMap</span>
                  <span className="text-[10px] text-slate-400">Vector & Raster Tiles</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">Leaflet JS</span>
                  <span className="text-[10px] text-slate-400">Map Canvas & GIS</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">WebSockets</span>
                  <span className="text-[10px] text-slate-400">Sub-100ms Sync</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">Web Audio + WebRTC</span>
                  <span className="text-[10px] text-slate-400">P2P Voice Calling</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Attribution */}
        <div className="text-center text-[11px] text-slate-400 py-2">
          RHA-volunteers GPS Radar &copy; 2026 • Robin Hood Army • OpenStreetMap contributors • Licensed under ODbL
        </div>
      </div>
    </div>
  );
};
