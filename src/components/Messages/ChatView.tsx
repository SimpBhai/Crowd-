import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Phone,
  MapPin,
  AlertTriangle,
  Users,
  Shield,
  Search,
  MessageSquare,
  Radio,
} from "lucide-react";
import { ChatMessage, UserRecord, UserRole } from "../../types";

interface ChatViewProps {
  currentUser: UserRecord | null;
  users: UserRecord[];
  messages: ChatMessage[];
  onSendMessage: (recipientId: string, content: string, isSos?: boolean, location?: { lat: number; lng: number }) => void;
  onStartCall: (user: UserRecord) => void;
  onViewLocationOnMap?: (lat: number, lng: number) => void;
  initialRecipientId?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  users,
  messages,
  onSendMessage,
  onStartCall,
  onViewLocationOnMap,
  initialRecipientId = "all",
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>(initialRecipientId);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannelId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(selectedChannelId, inputText.trim());
    setInputText("");
  };

  const handleSendLocation = () => {
    if (!currentUser?.location) return;
    const { lat, lng } = currentUser.location;
    onSendMessage(
      selectedChannelId,
      `📍 Shared my current GPS coordinates: (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      false,
      { lat, lng }
    );
  };

  const handleSendEmergencySos = () => {
    if (!currentUser?.location) return;
    const { lat, lng } = currentUser.location;
    onSendMessage(
      "all",
      `🚨 EMERGENCY DISTRESS BEACON: Assistance required immediately!`,
      true,
      { lat, lng }
    );
  };

  // Channels list
  const standardChannels = [
    { id: "all", name: "Crowd Broadcast", role: "all", icon: Users, desc: "Public channel for all tracked units" },
    ...(currentUser?.role === "admin" || currentUser?.role === "superadmin" || currentUser?.role === "dispatcher"
      ? [{ id: "admin_channel", name: "Command & Dispatch", role: "command", icon: Shield, desc: "Confidential administration channel" }]
      : []),
  ];

  // Direct users list (exclude self)
  const directUsers = users.filter((u) => u.id !== currentUser?.id && !u.isBanned);

  const filteredDirectUsers = directUsers.filter((u) =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter messages for current channel
  const activeMessages = messages.filter((m) => {
    if (selectedChannelId === "all") return m.recipientId === "all";
    if (selectedChannelId === "admin_channel") return m.recipientId === "admin_channel";
    // Direct chat
    return (
      (m.senderId === currentUser?.id && m.recipientId === selectedChannelId) ||
      (m.senderId === selectedChannelId && m.recipientId === currentUser?.id)
    );
  });

  const selectedDirectUser = users.find((u) => u.id === selectedChannelId);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "superadmin":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "admin":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "dispatcher":
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
      case "volunteer":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
    }
  };

  return (
    <div className="flex h-[calc(100vh-144px)] bg-slate-50 overflow-hidden">
      {/* Channels / Users Sidebar */}
      <div className="w-full sm:w-80 md:w-88 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Search & Channel Header */}
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Channels & Direct Calls</span>
            </h3>
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="chat-user-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people to call or text..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
            />
          </div>
        </div>

        {/* Channels List Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Main Channels */}
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Broadcast Channels
          </div>

          {standardChannels.map((ch) => {
            const Icon = ch.icon;
            const isSelected = selectedChannelId === ch.id;
            return (
              <button
                key={ch.id}
                id={`chat-channel-${ch.id}`}
                onClick={() => setSelectedChannelId(ch.id)}
                className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "hover:bg-slate-100 text-slate-800"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs truncate leading-tight">{ch.name}</div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isSelected ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    {ch.desc}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Direct Users List */}
          <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Direct Users ({filteredDirectUsers.length})</span>
            <span className="text-[9px] text-emerald-600 font-bold">Direct Audio</span>
          </div>

          {filteredDirectUsers.map((u) => {
            const isSelected = selectedChannelId === u.id;
            return (
              <button
                key={u.id}
                id={`chat-user-item-${u.id}`}
                onClick={() => setSelectedChannelId(u.id)}
                className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "hover:bg-slate-100 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 border border-white/50"
                      style={{ backgroundColor: u.avatarColor || "#4f46e5" }}
                    >
                      {u.displayName.charAt(0)}
                    </div>
                    {u.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs truncate leading-tight flex items-center gap-1.5">
                      <span>{u.displayName}</span>
                      {u.movementStatus === "sos" && (
                        <span className="px-1 py-0.2 rounded text-[8px] bg-rose-600 text-white font-bold animate-pulse">
                          SOS
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] capitalize truncate mt-0.5 ${
                        isSelected ? "text-indigo-100" : "text-slate-500"
                      }`}
                    >
                      {u.role} • {u.movementStatus}
                    </div>
                  </div>
                </div>

                {/* Quick Call icon on user item */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCall(u);
                  }}
                  title="Direct Voice Call (No Phone #)"
                  className={`p-1.5 rounded-lg transition ${
                    isSelected
                      ? "hover:bg-indigo-700 text-emerald-300"
                      : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Conversation Pane */}
      <div className="hidden sm:flex flex-1 flex-col bg-white">
        {/* Chat Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-indigo-600 text-white shadow-sm">
          <div className="flex items-center gap-2.5">
            {selectedDirectUser ? (
              <>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 border-2 border-white/40"
                  style={{ backgroundColor: selectedDirectUser.avatarColor || "#4f46e5" }}
                >
                  {selectedDirectUser.displayName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white leading-tight">
                      {selectedDirectUser.displayName}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase">
                      {selectedDirectUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-100 flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="capitalize">{selectedDirectUser.movementStatus}</span>
                    {selectedDirectUser.location?.speed !== undefined && (
                      <span>• {selectedDirectUser.location.speed.toFixed(1)} km/h</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-indigo-700 flex items-center justify-center text-white shadow-sm">
                  <Radio className="w-5 h-5 text-emerald-300 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white leading-tight">
                    {selectedChannelId === "admin_channel"
                      ? "Command & Dispatch Center"
                      : "Crowd Broadcast Channel"}
                  </h4>
                  <div className="text-[11px] text-indigo-100 mt-0.5">
                    {selectedChannelId === "admin_channel"
                      ? "Restricted to Dispatchers and Administrators"
                      : "Open to all field participants and responder nodes"}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Header Actions: Call directly button */}
          <div className="flex items-center gap-2">
            {selectedDirectUser && (
              <button
                id="chat-header-call-btn"
                onClick={() => onStartCall(selectedDirectUser)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/30 transition active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Voice Call</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <MessageSquare className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No messages in this channel yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Send a real-time dispatch, share GPS, or trigger an online voice call.
              </p>
            </div>
          ) : (
            activeMessages.map((msg) => {
              const isMine = msg.senderId === currentUser?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-700">
                      {isMine ? "You" : msg.senderName}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase border ${getRoleBadge(
                        msg.senderRole
                      )}`}
                    >
                      {msg.senderRole}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-md px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                      msg.isSosAlert
                        ? "bg-rose-600 text-white font-bold rounded-2xl shadow-rose-200 animate-pulse"
                        : isMine
                        ? "bg-indigo-600 text-white rounded-2xl rounded-br-none shadow-md shadow-indigo-100"
                        : "bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-bl-none"
                    }`}
                  >
                    <div>{msg.content}</div>

                    {/* Attached GPS coordinate chip */}
                    {msg.attachedLocation && (
                      <div className="mt-2 pt-2 border-t border-current/20 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>
                            {msg.attachedLocation.lat.toFixed(5)}, {msg.attachedLocation.lng.toFixed(5)}
                          </span>
                        </div>
                        {onViewLocationOnMap && (
                          <button
                            onClick={() =>
                              onViewLocationOnMap(
                                msg.attachedLocation!.lat,
                                msg.attachedLocation!.lng
                              )
                            }
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black underline cursor-pointer ${
                              isMine || msg.isSosAlert ? "text-white hover:bg-white/10" : "text-indigo-600 hover:bg-indigo-50"
                            }`}
                          >
                            View on Radar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            {/* Share GPS button */}
            <button
              type="button"
              id="chat-share-gps-btn"
              onClick={handleSendLocation}
              title="Share My Current GPS Coordinates"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition"
            >
              <MapPin className="w-4 h-4 text-indigo-600" />
            </button>

            {/* Quick SOS alert */}
            <button
              type="button"
              id="chat-sos-distress-btn"
              onClick={handleSendEmergencySos}
              title="Broadcast Emergency SOS Message"
              className="w-9 h-9 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 transition"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>

            <input
              id="chat-message-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                selectedDirectUser
                  ? `Message ${selectedDirectUser.displayName}...`
                  : "Type a broadcast message..."
              }
              className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-xs border-none focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
            />

            <button
              type="submit"
              id="chat-send-btn"
              disabled={!inputText.trim()}
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 transition disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
