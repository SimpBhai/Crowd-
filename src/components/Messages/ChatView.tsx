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
  ArrowLeft,
  LogIn,
  Layers,
} from "lucide-react";
import { ChatMessage, ProtestGroup, UserRecord, UserRole } from "../../types";

interface ChatViewProps {
  currentUser: UserRecord | null;
  users: UserRecord[];
  messages: ChatMessage[];
  groups?: ProtestGroup[];
  onSendMessage: (
    recipientId: string,
    content: string,
    isSos?: boolean,
    location?: { lat: number; lng: number }
  ) => void;
  onStartCall: (user: UserRecord) => void;
  onStartGroupCall?: (group: ProtestGroup) => void;
  onViewLocationOnMap?: (lat: number, lng: number) => void;
  initialRecipientId?: string;
  onOpenLogin?: () => void;
  onClearUnreadBadge?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  users,
  messages,
  groups = [],
  onSendMessage,
  onStartCall,
  onStartGroupCall,
  onViewLocationOnMap,
  initialRecipientId = "all",
  onOpenLogin,
  onClearUnreadBadge,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>(initialRecipientId || "all");
  const [mobileView, setMobileView] = useState<"channels" | "chat">("chat");
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Per-channel last read timestamp tracking (persisted to localStorage)
  const [readTimestamps, setReadTimestamps] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("rha_chat_read_timestamps");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return { all: Date.now() };
  });

  // Mark currently active channel as read whenever viewing chat or when new messages arrive in active channel
  useEffect(() => {
    const now = Date.now();
    setReadTimestamps((prev) => {
      const updated = { ...prev, [selectedChannelId]: now };
      try {
        localStorage.setItem("rha_chat_read_timestamps", JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    if (onClearUnreadBadge) {
      onClearUnreadBadge();
    }
  }, [selectedChannelId, messages.length, onClearUnreadBadge]);

  // Sync state whenever initialRecipientId prop changes (e.g. user clicked Message on map)
  useEffect(() => {
    if (initialRecipientId) {
      setSelectedChannelId(initialRecipientId);
      setMobileView("chat");
    }
  }, [initialRecipientId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannelId, mobileView]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!currentUser) {
      setErrorMessage("Authentication required: Please sign in to broadcast messages or use the field radio.");
      if (onOpenLogin) onOpenLogin();
      return;
    }

    setErrorMessage(null);
    onSendMessage(selectedChannelId, inputText.trim());
    setInputText("");
  };

  const handleSendLocation = () => {
    if (!currentUser?.location) {
      setErrorMessage("GPS location unavailable. Please enable device location.");
      return;
    }
    const { lat, lng } = currentUser.location;
    onSendMessage(
      selectedChannelId,
      `📍 Shared my current GPS coordinates: (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      false,
      { lat, lng }
    );
  };

  const handleSendEmergencySos = () => {
    if (!currentUser) {
      setErrorMessage("Authentication required to broadcast emergency SOS.");
      if (onOpenLogin) onOpenLogin();
      return;
    }
    const loc = currentUser.location;
    onSendMessage(
      "all",
      `🚨 EMERGENCY DISTRESS BEACON: Immediate field assistance required!`,
      true,
      loc ? { lat: loc.lat, lng: loc.lng } : undefined
    );
  };

  const isAdminOrSuper =
    currentUser?.role === "admin" ||
    currentUser?.role === "superadmin" ||
    currentUser?.role === "dispatcher";

  // Standard channels
  const standardChannels = [
    {
      id: "all",
      name: "RHA Broadcast",
      role: "all",
      icon: Users,
      desc: "Open live channel for all RHA units & volunteers",
    },
    ...(isAdminOrSuper
      ? [
          {
            id: "admin_channel",
            name: "Command & Dispatch",
            role: "command",
            icon: Shield,
            desc: "Confidential coordinator & marshal channel",
          },
        ]
      : []),
  ];

  // Direct users list: All active units
  const directUsers = users.filter((u) => {
    if (u.id === currentUser?.id || u.isBanned) return false;
    return true;
  });

  const filteredDirectUsers = directUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDirectUser = users.find((u) => u.id === selectedChannelId);
  const selectedGroup = groups.find((g) => g.id === selectedChannelId);

  // Active messages filter
  const activeMessages = messages.filter((m) => {
    if (selectedChannelId === "all") return m.recipientId === "all";
    if (selectedChannelId === "admin_channel") return m.recipientId === "admin_channel";
    if (selectedGroup) return m.recipientId === selectedGroup.id;
    // Direct chat
    return (
      (m.senderId === currentUser?.id && m.recipientId === selectedChannelId) ||
      (m.senderId === selectedChannelId && m.recipientId === currentUser?.id)
    );
  });

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

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setMobileView("chat");
    setErrorMessage(null);
  };

  const currentChannelTitle = selectedDirectUser
    ? selectedDirectUser.displayName
    : selectedGroup
    ? selectedGroup.name
    : selectedChannelId === "admin_channel"
    ? "Command & Dispatch"
    : "RHA Broadcast";

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden relative">
      {/* Top Mobile View Switcher Tabs (Smartphone Only) */}
      <div className="sm:hidden flex items-center bg-slate-100 p-1.5 border-b border-slate-200 shrink-0 gap-1.5 z-20 shadow-xs">
        <button
          id="mobile-tab-chat"
          type="button"
          onClick={() => setMobileView("chat")}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mobileView === "chat"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[140px]">
            {currentChannelTitle}
          </span>
        </button>

        <button
          id="mobile-tab-channels"
          type="button"
          onClick={() => setMobileView("channels")}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition relative ${
            mobileView === "channels"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Channels & Squads</span>
        </button>
      </div>

      {/* Main Panes Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Channels / Users List Panel */}
        <div
          className={`${
            mobileView === "channels" ? "flex" : "hidden sm:flex"
          } w-full sm:w-80 md:w-88 bg-white border-r border-slate-200 flex-col shrink-0 h-full overflow-hidden`}
        >
          {/* Search & Channel Header */}
          <div className="p-3 border-b border-slate-200 shrink-0">
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
                placeholder="Search channels, squads, contacts..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>

          {/* Quick Jump Banner to Active Chat on Smartphone */}
          <div className="sm:hidden px-2 pt-2 pb-0 shrink-0">
            <button
              type="button"
              onClick={() => setMobileView("chat")}
              className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate">Open Active Chat ({currentChannelTitle})</span>
              </div>
              <span className="text-indigo-600 font-bold shrink-0">→</span>
            </button>
          </div>

          {/* Channels List Scrollable */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Main Broadcast Channels */}
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Broadcast Channels
          </div>

          {standardChannels.map((ch) => {
            const Icon = ch.icon;
            const isSelected = selectedChannelId === ch.id;
            const lastRead = readTimestamps[ch.id] || 0;
            const unreadCount = isSelected
              ? 0
              : messages.filter(
                  (m) =>
                    m.recipientId === ch.id &&
                    m.senderId !== currentUser?.id &&
                    new Date(m.timestamp).getTime() > lastRead
                ).length;

            return (
              <button
                key={ch.id}
                id={`chat-channel-${ch.id}`}
                onClick={() => handleSelectChannel(ch.id)}
                className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "hover:bg-slate-100 text-slate-800"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    isSelected ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate">{ch.name}</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] min-w-4 h-4 px-1 rounded-full font-bold bg-rose-600 text-white flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isSelected ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    {ch.desc}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Protest Squad Channels */}
          {filteredGroups.length > 0 && (
            <>
              <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Protest Squads</span>
                <span className="text-[10px] font-normal text-slate-400">
                  {filteredGroups.length}
                </span>
              </div>

              {filteredGroups.map((g) => {
                const isSelected = selectedChannelId === g.id;
                const lastRead = readTimestamps[g.id] || 0;
                const unreadCount = isSelected
                  ? 0
                  : messages.filter(
                      (m) =>
                        m.recipientId === g.id &&
                        m.senderId !== currentUser?.id &&
                        new Date(m.timestamp).getTime() > lastRead
                    ).length;

                return (
                  <button
                    key={g.id}
                    id={`chat-group-${g.id}`}
                    onClick={() => handleSelectChannel(g.id)}
                    className={`w-full p-2.5 rounded-xl text-left flex items-start gap-2.5 transition ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                        : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: g.color || "#4f46e5" }}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{g.name}</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] min-w-4 h-4 px-1 rounded-full font-bold bg-rose-600 text-white flex items-center justify-center shadow-xs">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? "text-indigo-100" : "text-slate-500"
                        }`}
                      >
                        {g.description || `${g.memberIds?.length || 0} squad members`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Direct Contacts List */}
          <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Direct Radio / Contacts</span>
            <span className="text-[10px] font-normal text-slate-400">
              {filteredDirectUsers.length} available
            </span>
          </div>

          {filteredDirectUsers.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              {searchQuery ? "No contacts match search" : "No other contacts online yet"}
            </div>
          ) : (
            filteredDirectUsers.map((u) => {
              const isSelected = selectedChannelId === u.id;
              const lastRead = readTimestamps[u.id] || 0;
              const unreadCount = isSelected
                ? 0
                : messages.filter(
                    (m) =>
                      m.senderId === u.id &&
                      m.recipientId === currentUser?.id &&
                      new Date(m.timestamp).getTime() > lastRead
                  ).length;

              return (
                <button
                  key={u.id}
                  id={`chat-user-${u.id}`}
                  onClick={() => handleSelectChannel(u.id)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: u.avatarColor || "#4f46e5" }}
                      >
                        {u.displayName.charAt(0)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          u.isOnline ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{u.displayName}</div>
                      <div
                        className={`text-[10px] capitalize truncate ${
                          isSelected ? "text-indigo-200" : "text-slate-500"
                        }`}
                      >
                        {u.role} • {u.movementStatus}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCount > 0 && (
                      <span className="text-[10px] min-w-4 h-4 px-1 rounded-full font-bold bg-rose-600 text-white flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}

                    {/* Quick Call icon */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCall(u);
                      }}
                      title="Direct Voice Call"
                      className={`p-1.5 rounded-lg transition ${
                        isSelected
                          ? "hover:bg-indigo-700 text-emerald-300"
                          : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Pane */}
      <div
        className={`${
          mobileView === "chat" ? "flex" : "hidden sm:flex"
        } flex-1 flex-col bg-white h-full overflow-hidden`}
      >
        {/* Chat Header */}
        <div className="p-3 sm:p-3.5 border-b border-slate-200 flex items-center justify-between bg-indigo-600 text-white shadow-sm shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {/* Mobile Back to Channels Button */}
            <button
              id="chat-mobile-back-btn"
              onClick={() => setMobileView("channels")}
              className="sm:hidden p-1.5 -ml-1 rounded-lg hover:bg-white/20 text-white transition shrink-0"
              title="Back to channels"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {selectedDirectUser ? (
              <>
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0 border-2 border-white/40"
                  style={{ backgroundColor: selectedDirectUser.avatarColor || "#4f46e5" }}
                >
                  {selectedDirectUser.displayName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                      {selectedDirectUser.displayName}
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-white/20 text-white uppercase shrink-0">
                      {selectedDirectUser.role}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-indigo-100 flex items-center gap-1.5 mt-0.5 truncate">
                    <span
                      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                        selectedDirectUser.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-300"
                      }`}
                    />
                    <span className="capitalize">{selectedDirectUser.movementStatus}</span>
                    {selectedDirectUser.location?.speed !== undefined && (
                      <span>• {selectedDirectUser.location.speed.toFixed(1)} km/h</span>
                    )}
                  </div>
                </div>
              </>
            ) : selectedGroup ? (
              <>
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs border border-white/30"
                  style={{ backgroundColor: selectedGroup.color || "#4f46e5" }}
                >
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                      {selectedGroup.name}
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-white/20 text-white uppercase shrink-0">
                      Squad Channel
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-indigo-100 truncate mt-0.5">
                    {selectedGroup.rallyPoint
                      ? `Rally Beacon: ${selectedGroup.rallyPoint.label}`
                      : `${selectedGroup.memberIds?.length || 0} assigned members`}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-700 flex items-center justify-center text-white shadow-sm shrink-0">
                  {selectedChannelId === "admin_channel" ? (
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                  ) : (
                    <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 animate-pulse" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                    {selectedChannelId === "admin_channel"
                      ? "Command & Dispatch Center"
                      : "RHA Broadcast Channel"}
                  </h4>
                  <div className="text-[10px] sm:text-[11px] text-indigo-100 truncate">
                    {selectedChannelId === "admin_channel"
                      ? "Restricted to Administrators & Dispatchers"
                      : "Open live channel for all RHA volunteers"}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {selectedDirectUser && (
              <button
                id="chat-header-call-btn"
                onClick={() => onStartCall(selectedDirectUser)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/30 transition active:scale-95 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Voice Call</span>
              </button>
            )}

            {selectedGroup && onStartGroupCall && (
              <button
                id="chat-header-group-call-btn"
                onClick={() => onStartGroupCall(selectedGroup)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/30 transition active:scale-95 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Call Squad</span>
              </button>
            )}

            {selectedGroup?.rallyPoint && onViewLocationOnMap && (
              <button
                id="chat-header-rally-btn"
                onClick={() =>
                  onViewLocationOnMap(selectedGroup.rallyPoint!.lat, selectedGroup.rallyPoint!.lng)
                }
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Rally Beacon</span>
              </button>
            )}
          </div>
        </div>

        {/* Unauthenticated Mode Notice Banner */}
        {!currentUser && (
          <div className="p-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Observation Mode:</strong> Sign in with verified credentials to transmit messages and initiate peer radio calls.
              </span>
            </div>
            {onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        )}

        {/* Temporary Error Feedback */}
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50">
          {activeMessages.length === 0 ? (
            <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <MessageSquare className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">
                {selectedGroup
                  ? `No transmissions in ${selectedGroup.name} squad yet.`
                  : selectedDirectUser
                  ? `No direct messages with ${selectedDirectUser.displayName} yet.`
                  : "No messages in this broadcast channel yet."}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                Send a real-time message, broadcast GPS coordinates, or initiate a voice radio call.
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
                              isMine || msg.isSosAlert
                                ? "text-white hover:bg-white/10"
                                : "text-indigo-600 hover:bg-indigo-50"
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
        <form
          onSubmit={handleSend}
          className="p-2.5 sm:p-3 border-t border-slate-200 bg-white shrink-0"
        >
          <div className="flex items-center gap-2">
            {/* Share GPS button */}
            <button
              type="button"
              id="chat-share-gps-btn"
              onClick={handleSendLocation}
              title="Share My Current GPS Coordinates"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-indigo-600" />
            </button>

            {/* Quick SOS alert */}
            <button
              type="button"
              id="chat-sos-distress-btn"
              onClick={handleSendEmergencySos}
              title="Broadcast Emergency SOS Message"
              className="w-9 h-9 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 transition cursor-pointer"
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
                  : selectedGroup
                  ? `Broadcast to ${selectedGroup.name} squad...`
                  : "Type a broadcast message..."
              }
              className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-xs border-none focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
            />

            <button
              type="submit"
              id="chat-send-btn"
              disabled={!inputText.trim()}
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 transition disabled:opacity-40 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
};
