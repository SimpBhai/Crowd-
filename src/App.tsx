import React, { useState, useEffect, useRef, useCallback } from "react";
import { TopHeader } from "./components/Navigation/TopHeader";
import { BottomBar } from "./components/Navigation/BottomBar";
import { LoginModal } from "./components/Auth/LoginModal";
import { LeafletCrowdMap } from "./components/Map/LeafletCrowdMap";
import { FilterPanel } from "./components/Map/FilterPanel";
import { ChatView } from "./components/Messages/ChatView";
import { AdminLogsView } from "./components/Admin/AdminLogsView";
import { AboutView } from "./components/About/AboutView";
import { UserProfileView } from "./components/User/UserProfileView";
import { DirectCallModal } from "./components/Calling/DirectCallModal";
import {
  UserRecord,
  ChatMessage,
  SystemAuditLog,
  ActiveCall,
  FilterOptions,
  TabType,
  MovementStatus,
} from "./types";
import { audioCallManager } from "./utils/audioCall";
import { AlertCircle, Ban, ShieldAlert } from "lucide-react";

export default function App() {
  // Authentication & Current User
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Navigation Tabs
  const [currentTab, setCurrentTab] = useState<TabType>("home");

  // Real-time State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Active Calling State
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const callTimerRef = useRef<number | null>(null);

  // Simulation & GPS state
  const [isSimulatingMovement, setIsSimulatingMovement] = useState(false);
  const simAngleRef = useRef(0);

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    selectedRoles: [],
    selectedStatuses: [],
    onlyActive: false,
    hasSosOnly: false,
  });

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // ---------------- AUTHENTICATION INITIALIZATION ----------------
  useEffect(() => {
    const savedToken = localStorage.getItem("crowd_auth_token");
    if (savedToken) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setCurrentUser(data.user);
            setAuthToken(savedToken);
          } else {
            setIsLoginModalOpen(true);
          }
        })
        .catch(() => {
          setIsLoginModalOpen(true);
        });
    } else {
      // Default: show login modal or automatically provide preview login
      setIsLoginModalOpen(true);
    }
  }, []);

  // ---------------- INITIAL FETCHES ----------------
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.warn("Failed to fetch users:", e);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (e) {
      console.warn("Failed to fetch messages:", e);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.warn("Failed to fetch logs:", e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchMessages();
    fetchLogs();
  }, [fetchUsers, fetchMessages, fetchLogs]);

  // ---------------- WEBSOCKET CLIENT & SIGNALING ----------------
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(
        JSON.stringify({
          type: "auth:identify",
          userId: currentUser.id,
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        switch (payload.type) {
          case "init:snapshot": {
            if (payload.users) setUsers(payload.users);
            if (payload.messages) setMessages(payload.messages);
            break;
          }

          case "crowd:positions": {
            if (payload.users) {
              setUsers((prev) => {
                const map = new Map(prev.map((u) => [u.id, u]));
                payload.users.forEach((updatedUser: UserRecord) => {
                  // Keep self location if currently broadcasting local GPS
                  if (updatedUser.id === currentUser.id && isSimulatingMovement) return;
                  map.set(updatedUser.id, updatedUser);
                });
                return Array.from(map.values());
              });
            }
            break;
          }

          case "user:location_update": {
            if (payload.user) {
              setUsers((prev) =>
                prev.map((u) => (u.id === payload.user.id ? payload.user : u))
              );
            }
            break;
          }

          case "chat:new_message": {
            if (payload.message) {
              setMessages((prev) => [...prev, payload.message]);
              if (currentTab !== "messages" && payload.message.senderId !== currentUser.id) {
                setUnreadMessagesCount((c) => c + 1);
              }
            }
            break;
          }

          case "sos:alert": {
            if (payload.message) {
              setMessages((prev) => [...prev, payload.message]);
            }
            if (payload.user) {
              setUsers((prev) =>
                prev.map((u) => (u.id === payload.user.id ? payload.user : u))
              );
            }
            break;
          }

          case "log:new": {
            if (payload.log) {
              setLogs((prev) => [payload.log, ...prev]);
            }
            break;
          }

          case "user:banned": {
            if (payload.user) {
              setUsers((prev) =>
                prev.map((u) => (u.id === payload.user.id ? payload.user : u))
              );
              if (payload.user.id === currentUser.id) {
                setCurrentUser((curr) => (curr ? { ...curr, isBanned: true } : null));
              }
            }
            break;
          }

          case "account:banned": {
            setCurrentUser((curr) =>
              curr ? { ...curr, isBanned: true, banReason: payload.reason } : null
            );
            break;
          }

          case "user:unbanned": {
            if (payload.user) {
              setUsers((prev) =>
                prev.map((u) => (u.id === payload.user.id ? payload.user : u))
              );
              if (payload.user.id === currentUser.id) {
                setCurrentUser((curr) =>
                  curr ? { ...curr, isBanned: false, banReason: undefined } : null
                );
              }
            }
            break;
          }

          // ---------------- DIRECT CALLING SIGNALING ----------------
          case "call:incoming": {
            audioCallManager.startIncomingRingtone();
            setActiveCall({
              callId: `call-${Date.now()}`,
              otherUserId: payload.callerId,
              otherUserName: payload.callerName,
              otherUserRole: payload.callerRole,
              isIncoming: true,
              status: "ringing",
              duration: 0,
              isMuted: false,
              isSpeakerOn: true,
            });
            break;
          }

          case "call:accepted": {
            audioCallManager.playConnectChime();
            setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
            break;
          }

          case "call:rejected": {
            audioCallManager.playEndChime();
            setActiveCall(null);
            break;
          }

          case "call:ended": {
            audioCallManager.playEndChime();
            audioCallManager.cleanupCall();
            setActiveCall(null);
            break;
          }

          case "call:unavailable": {
            audioCallManager.playEndChime();
            alert(payload.reason || "User is currently unreachable.");
            setActiveCall(null);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("Error processing websocket message:", err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [currentUser, currentTab, isSimulatingMovement]);

  // Call duration timer
  useEffect(() => {
    if (activeCall?.status === "connected") {
      callTimerRef.current = window.setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCall?.status]);

  // ---------------- REAL BROWSER GPS TRACKING ----------------
  useEffect(() => {
    if (!currentUser || currentUser.isBanned || isSimulatingMovement) return;

    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const speed = pos.coords.speed !== null ? pos.coords.speed * 3.6 : undefined; // m/s to km/h
          const heading = pos.coords.heading !== null ? pos.coords.heading : undefined;
          const altitude = pos.coords.altitude !== null ? pos.coords.altitude : undefined;
          const accuracy = pos.coords.accuracy;

          // Update local state
          setCurrentUser((curr) =>
            curr
              ? {
                  ...curr,
                  location: {
                    ...curr.location,
                    lat,
                    lng,
                    speed,
                    heading,
                    altitude,
                    accuracy,
                    lastUpdated: new Date().toISOString(),
                  },
                }
              : null
          );

          // Broadcast via WS
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "gps:update",
                lat,
                lng,
                speed,
                heading,
                altitude,
                accuracy,
              })
            );
          }
        },
        (err) => {
          console.warn("Geolocation watchPosition notice:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [currentUser?.id, currentUser?.isBanned, isSimulatingMovement]);

  // ---------------- SIMULATED PATROL WALK LOOP ----------------
  useEffect(() => {
    if (!isSimulatingMovement || !currentUser) return;

    const centerLat = 40.768;
    const centerLng = -73.978;
    const radius = 0.0035; // ~400m walk loop

    const interval = setInterval(() => {
      simAngleRef.current = (simAngleRef.current + 0.08) % (2 * Math.PI);
      const lat = centerLat + Math.sin(simAngleRef.current) * radius;
      const lng = centerLng + Math.cos(simAngleRef.current) * radius;
      const heading = Math.round((((simAngleRef.current + Math.PI / 2) * 180) / Math.PI) % 360);
      const speed = 4.6 + Math.random() * 0.8; // ~5 km/h walking speed

      setCurrentUser((curr) =>
        curr
          ? {
              ...curr,
              movementStatus: "walking",
              location: {
                ...curr.location,
                lat,
                lng,
                heading,
                speed,
                lastUpdated: new Date().toISOString(),
              },
            }
          : null
      );

      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? {
                ...u,
                movementStatus: "walking",
                location: {
                  ...u.location,
                  lat,
                  lng,
                  heading,
                  speed,
                  lastUpdated: new Date().toISOString(),
                },
              }
            : u
        )
      );

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "gps:update",
            lat,
            lng,
            heading,
            speed,
            movementStatus: "walking",
          })
        );
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [isSimulatingMovement, currentUser?.id]);

  // ---------------- USER ACTIONS ----------------

  const handleLoginSuccess = (user: UserRecord, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem("crowd_auth_token", token);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("crowd_auth_token");
    setCurrentUser(null);
    setAuthToken(null);
    setIsLoginModalOpen(true);
    audioCallManager.cleanupCall();
    setActiveCall(null);
  };

  const handleTriggerSos = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          lat: currentUser.location.lat,
          lng: currentUser.location.lng,
          note: "Emergency signal broadcast from mobile navigation client",
        }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("SOS trigger error:", err);
    }
  };

  const handleSendMessage = async (
    recipientId: string,
    content: string,
    isSosAlert?: boolean,
    attachedLocation?: { lat: number; lng: number }
  ) => {
    if (!currentUser) return;
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          recipientId,
          content,
          isSosAlert,
          attachedLocation,
        }),
      });
    } catch (e) {
      console.error("Send message error:", e);
    }
  };

  const handleUpdateStatus = async (status: MovementStatus) => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, movementStatus: status });

    try {
      await fetch("/api/users/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          lat: currentUser.location.lat,
          lng: currentUser.location.lng,
          movementStatus: status,
        }),
      });
    } catch (err) {
      console.warn("Status update error:", err);
    }
  };

  // Direct Audio Calling Handlers (No Phone Number Needed!)
  const handleStartCall = async (targetUser: UserRecord) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id) return;

    await audioCallManager.requestMicrophone();
    audioCallManager.startOutgoingRingtone();

    setActiveCall({
      callId: `call-${Date.now()}`,
      otherUserId: targetUser.id,
      otherUserName: targetUser.displayName,
      otherUserRole: targetUser.role,
      isIncoming: false,
      status: "calling",
      duration: 0,
      isMuted: false,
      isSpeakerOn: true,
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call:initiate",
          callerId: currentUser.id,
          targetUserId: targetUser.id,
        })
      );
    }
  };

  const handleAcceptCall = async () => {
    if (!activeCall || !currentUser) return;
    await audioCallManager.requestMicrophone();
    audioCallManager.playConnectChime();

    setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call:accept",
          callerId: activeCall.otherUserId,
          targetUserId: currentUser.id,
        })
      );
    }
  };

  const handleRejectCall = () => {
    if (!activeCall || !currentUser) return;
    audioCallManager.playEndChime();
    audioCallManager.cleanupCall();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call:reject",
          callerId: activeCall.otherUserId,
          targetUserId: currentUser.id,
        })
      );
    }
    setActiveCall(null);
  };

  const handleEndCall = () => {
    if (!activeCall || !currentUser) return;
    audioCallManager.playEndChime();
    audioCallManager.cleanupCall();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call:end",
          targetUserId: activeCall.otherUserId,
          byUserId: currentUser.id,
        })
      );
    }
    setActiveCall(null);
  };

  const handleToggleMute = () => {
    if (!activeCall) return;
    const newMute = !activeCall.isMuted;
    audioCallManager.setMuted(newMute);
    setActiveCall({ ...activeCall, isMuted: newMute });
  };

  const handleToggleSpeaker = () => {
    if (!activeCall) return;
    setActiveCall({ ...activeCall, isSpeakerOn: !activeCall.isSpeakerOn });
  };

  // Super Admin Ban Actions
  const handleBanUser = async (targetUserId: string, reason: string) => {
    if (!currentUser) return;
    const res = await fetch("/api/admin/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminUserId: currentUser.id,
        targetUserId,
        reason,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to ban user");
    fetchUsers();
    fetchLogs();
  };

  const handleUnbanUser = async (targetUserId: string) => {
    if (!currentUser) return;
    const res = await fetch("/api/admin/unban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminUserId: currentUser.id,
        targetUserId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to unban user");
    fetchUsers();
    fetchLogs();
  };

  // Switch to messages tab and select user
  const handleStartChatWithUser = (user: UserRecord) => {
    setCurrentTab("messages");
    setSelectedUser(user);
  };

  // Jump from chat coordinate chip to map
  const handleViewLocationOnMap = (lat: number, lng: number) => {
    setCurrentTab("home");
    // Center map on coordinates
    if ((window as any).L && selectedUser) {
      setSelectedUser({
        ...selectedUser,
        location: { ...selectedUser.location, lat, lng },
      });
    }
  };

  // Summary Metrics
  const activeSosCount = users.filter((u) => u.movementStatus === "sos").length;
  const movingUsersCount = users.filter(
    (u) =>
      u.isOnline &&
      (u.movementStatus === "walking" ||
        u.movementStatus === "running" ||
        u.movementStatus === "in_transit")
  ).length;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <TopHeader
        currentUser={currentUser}
        isConnected={isConnected}
        activeSosCount={activeSosCount}
        totalUsersCount={users.length}
        movingUsersCount={movingUsersCount}
        onTriggerSos={handleTriggerSos}
        onOpenSosDetails={() => {
          setFilters((f) => ({ ...f, hasSosOnly: true }));
          setCurrentTab("home");
        }}
      />

      {/* Banned User Alert Shield */}
      {currentUser?.isBanned && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-center text-xs flex items-center justify-center gap-2 shadow-md">
          <Ban className="w-4 h-4" />
          <span>
            <strong>Account Suspended:</strong> {currentUser.banReason || "Violation of Community Guidelines"}. GPS broadcast disabled.
          </span>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Tab 1: Home Map View */}
        {currentTab === "home" && (
          <div className="flex flex-col h-full">
            <FilterPanel
              filters={filters}
              onUpdateFilters={(newFilters) => setFilters((f) => ({ ...f, ...newFilters }))}
              onResetFilters={() =>
                setFilters({
                  searchQuery: "",
                  selectedRoles: [],
                  selectedStatuses: [],
                  onlyActive: false,
                  hasSosOnly: false,
                })
              }
              totalFilteredCount={users.length}
            />

            <div className="flex-1 relative">
              <LeafletCrowdMap
                users={users}
                currentUser={currentUser}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                filters={filters}
                isSimulatingMovement={isSimulatingMovement}
                onToggleSimulatedMovement={() =>
                  setIsSimulatingMovement(!isSimulatingMovement)
                }
                onCenterOnUser={() => {}}
                onStartCall={handleStartCall}
                onStartChat={handleStartChatWithUser}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Messages & Calling */}
        {currentTab === "messages" && (
          <ChatView
            currentUser={currentUser}
            users={users}
            messages={messages}
            onSendMessage={handleSendMessage}
            onStartCall={handleStartCall}
            onViewLocationOnMap={handleViewLocationOnMap}
            initialRecipientId={selectedUser ? selectedUser.id : "all"}
          />
        )}

        {/* Tab 3: Admin & System Logs */}
        {currentTab === "admin" && (
          <AdminLogsView
            currentUser={currentUser}
            users={users}
            logs={logs}
            onBanUser={handleBanUser}
            onUnbanUser={handleUnbanUser}
            onRefreshLogs={fetchLogs}
          />
        )}

        {/* Tab 4: About View */}
        {currentTab === "about" && <AboutView />}

        {/* Tab 5: User Profile View */}
        {currentTab === "user" && (
          <UserProfileView
            currentUser={currentUser}
            onUpdateStatus={handleUpdateStatus}
            onLogout={handleLogout}
            isSimulatingMovement={isSimulatingMovement}
            onToggleSimulatedMovement={() =>
              setIsSimulatingMovement(!isSimulatingMovement)
            }
            onSwitchUserPrompt={() => setIsLoginModalOpen(true)}
          />
        )}
      </main>

      {/* Online Voice Calling Modal (Zero Phone Number) */}
      {activeCall && (
        <DirectCallModal
          call={activeCall}
          onAcceptCall={handleAcceptCall}
          onRejectCall={handleRejectCall}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          onToggleSpeaker={handleToggleSpeaker}
        />
      )}

      {/* Bottom Bar for Mobile & Desktop Navigation */}
      <BottomBar
        currentTab={currentTab}
        onTabChange={(t) => {
          setCurrentTab(t);
          if (t === "messages") setUnreadMessagesCount(0);
        }}
        currentUser={currentUser}
        unreadMessagesCount={unreadMessagesCount}
        hasActiveCall={activeCall !== null && activeCall.status === "connected"}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
