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
import { CallInitiatePromptModal } from "./components/Calling/CallInitiatePromptModal";
import {
  UserRecord,
  UserRole,
  ChatMessage,
  SystemAuditLog,
  ActiveCall,
  FilterOptions,
  TabType,
  MovementStatus,
  GlobalMarker,
  UserAssignment,
  ProtestGroup,
  InspectionPoint,
} from "./types";
import { audioCallManager } from "./utils/audioCall";
import { apiFetch, getWebSocketUrl } from "./utils/api";
import { gpsEngine, GpsTelemetryFix, GpsEngineStatus } from "./utils/gpsTracker";
import { AlertCircle, Ban, ShieldAlert, CheckCircle, Info, X } from "lucide-react";

export default function App() {
  // Authentication & Current User
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const currentUserRef = useRef<UserRecord | null>(null);
  currentUserRef.current = currentUser;
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Navigation Tabs
  const [currentTab, setCurrentTab] = useState<TabType>("home");
  const currentTabRef = useRef<TabType>(currentTab);
  currentTabRef.current = currentTab;

  // Real-time State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Protest Assembly Markers, Assignments, & Squads
  const [globalMarker, setGlobalMarker] = useState<GlobalMarker | null>(null);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [groups, setGroups] = useState<ProtestGroup[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [inspectionPoints, setInspectionPoints] = useState<InspectionPoint[]>([]);

  // Active Calling State & Tactical Prompt
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [pendingCallTarget, setPendingCallTarget] = useState<
    { type: "user"; user: UserRecord } | { type: "group"; group: ProtestGroup } | null
  >(null);
  const [isCallPromptOpen, setIsCallPromptOpen] = useState(false);
  const activeCallRef = useRef<ActiveCall | null>(null);
  activeCallRef.current = activeCall;
  const callTimerRef = useRef<number | null>(null);

  // Real Device GPS Telemetry
  const [isRealGpsActive, setIsRealGpsActive] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatusText, setGpsStatusText] = useState<string>("Initializing GPS...");
  const [tacticalNotice, setTacticalNotice] = useState<{
    id: string;
    type: "info" | "warning" | "success" | "emergency";
    message: string;
  } | null>(null);

  const showTacticalNotice = useCallback((message: string, type: "info" | "warning" | "success" | "emergency" = "info") => {
    const id = `notice-${Date.now()}`;
    setTacticalNotice({ id, type, message });
    setTimeout(() => {
      setTacticalNotice((current) => (current?.id === id ? null : current));
    }, 4500);
  }, []);
  const [activeChatRecipientId, setActiveChatRecipientId] = useState<string>("all");
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    timestamp: number;
  } | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    selectedRoles: [],
    selectedStatuses: [],
    onlyActive: false,
    hasSosOnly: false,
    selectedGroupId: undefined,
    selectedTags: [],
    showAllUnitsAdminOverride: false,
  });

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // ---------------- AUTHENTICATION INITIALIZATION ----------------
  useEffect(() => {
    const savedToken = localStorage.getItem("crowd_auth_token");
    if (savedToken) {
      apiFetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setCurrentUser(data.user);
            setAuthToken(savedToken);
            gpsEngine.setUserId(data.user.id);
            try {
              localStorage.setItem("crowd_user_id", data.user.id);
            } catch (_) {}
          } else {
            setIsLoginModalOpen(true);
          }
        })
        .catch(() => {
          setIsLoginModalOpen(true);
        });
    } else {
      setIsLoginModalOpen(true);
    }
  }, []);

  // ---------------- INITIAL FETCHES ----------------
  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.warn("Failed to fetch users:", e);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const res = await apiFetch("/api/tags");
      const data = await res.json();
      if (data.tags) setAvailableTags(data.tags);
    } catch (e) {
      console.warn("Failed to fetch tags:", e);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiFetch("/api/messages");
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (e) {
      console.warn("Failed to fetch messages:", e);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/logs");
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.warn("Failed to fetch logs:", e);
    }
  }, []);

  const fetchGlobalMarker = useCallback(async () => {
    try {
      const res = await apiFetch("/api/global-marker");
      const data = await res.json();
      if (data.marker !== undefined) setGlobalMarker(data.marker);
    } catch (e) {
      console.warn("Failed to fetch global marker:", e);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await apiFetch("/api/assignments");
      const data = await res.json();
      if (data.assignments) setAssignments(data.assignments);
    } catch (e) {
      console.warn("Failed to fetch assignments:", e);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await apiFetch("/api/groups");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch (e) {
      console.warn("Failed to fetch groups:", e);
    }
  }, []);

  const fetchInspectionPoints = useCallback(async () => {
    try {
      const res = await apiFetch("/api/inspection-points");
      const data = await res.json();
      if (data.inspectionPoints) setInspectionPoints(data.inspectionPoints);
    } catch (e) {
      console.warn("Failed to fetch inspection points:", e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTags();
    fetchMessages();
    fetchLogs();
    fetchGlobalMarker();
    fetchAssignments();
    fetchGroups();
    fetchInspectionPoints();
  }, [fetchUsers, fetchTags, fetchMessages, fetchLogs, fetchGlobalMarker, fetchAssignments, fetchGroups, fetchInspectionPoints]);

  // ---------------- WEBSOCKET CLIENT & SIGNALING ----------------
  useEffect(() => {
    if (!currentUser) return;

    const wsUrl = getWebSocketUrl();
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
            if (payload.logs) setLogs(payload.logs);
            if (payload.globalMarker !== undefined) setGlobalMarker(payload.globalMarker);
            if (payload.assignments) setAssignments(payload.assignments);
            if (payload.groups) setGroups(payload.groups);
            if (payload.availableTags) setAvailableTags(payload.availableTags);
            if (payload.inspectionPoints) setInspectionPoints(payload.inspectionPoints);
            break;
          }

          case "user:joined": {
            if (payload.user) {
              setUsers((prev) => {
                const map = new Map(prev.map((u) => [u.id, u]));
                map.set(payload.user.id, payload.user);
                return Array.from(map.values());
              });
            }
            break;
          }

          case "crowd:positions": {
            if (payload.users) {
              setUsers((prev) => {
                const map = new Map(prev.map((u) => [u.id, u]));
                payload.users.forEach((updatedUser: UserRecord) => {
                  if (currentUserRef.current && updatedUser.id === currentUserRef.current.id && isRealGpsActive) return;
                  map.set(updatedUser.id, updatedUser);
                });
                return Array.from(map.values());
              });
            }
            break;
          }

          case "user:location_update": {
            if (payload.user) {
              setUsers((prev) => {
                const map = new Map(prev.map((u) => [u.id, u]));
                map.set(payload.user.id, payload.user);
                return Array.from(map.values());
              });
            }
            break;
          }

          case "chat:new_message": {
            if (payload.message) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.message.id)) return prev;
                return [...prev, payload.message];
              });
              if (currentTabRef.current !== "messages" && payload.message.senderId !== currentUserRef.current?.id) {
                setUnreadMessagesCount((c) => c + 1);
              }
            }
            break;
          }

          case "sos:alert": {
            if (payload.message) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.message.id)) return prev;
                return [...prev, payload.message];
              });
            }
            if (payload.user) {
              setUsers((prev) =>
                prev.map((u) => (u.id === payload.user.id ? payload.user : u))
              );
            }
            audioCallManager.playSosAlarm();
            break;
          }

          case "user:banned": {
            if (payload.targetUserId === currentUser.id) {
              setCurrentUser((curr) =>
                curr
                  ? {
                      ...curr,
                      isBanned: true,
                      banReason: payload.reason,
                    }
                  : null
              );
              showTacticalNotice(
                `Account Warning: You have been suspended by Administration. Reason: ${payload.reason}`,
                "warning"
              );
            }
            setUsers((prev) =>
              prev.map((u) =>
                u.id === payload.targetUserId
                  ? { ...u, isBanned: true, banReason: payload.reason, isOnline: false }
                  : u
              )
            );
            fetchLogs();
            break;
          }

          case "user:unbanned": {
            if (payload.targetUserId === currentUser.id) {
              setCurrentUser((curr) =>
                curr
                  ? {
                      ...curr,
                      isBanned: false,
                      banReason: undefined,
                    }
                  : null
              );
              showTacticalNotice("Your account suspension has been lifted by Administration.", "success");
            }
            setUsers((prev) =>
              prev.map((u) =>
                u.id === payload.targetUserId
                  ? { ...u, isBanned: false, banReason: undefined }
                  : u
              )
            );
            fetchLogs();
            break;
          }

          // ---------------- GLOBAL MARKER SIGNALING ----------------
          case "global_marker:updated": {
            setGlobalMarker(payload.marker);
            break;
          }

          case "global_marker:cleared": {
            setGlobalMarker(null);
            break;
          }

          // ---------------- INDIVIDUAL USER ASSIGNMENT SIGNALING ----------------
          case "assignment:updated": {
            if (payload.assignment) {
              setAssignments((prev) => {
                const filtered = prev.filter((a) => a.userId !== payload.assignment.userId);
                return [...filtered, payload.assignment];
              });
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === payload.assignment.userId
                    ? { ...u, assignedPost: payload.assignment }
                    : u
                )
              );
              if (currentUser.id === payload.assignment.userId) {
                setCurrentUser((u) => (u ? { ...u, assignedPost: payload.assignment } : null));
              }
            }
            break;
          }

          case "assignment:deleted": {
            setAssignments((prev) => prev.filter((a) => a.userId !== payload.userId));
            setUsers((prev) =>
              prev.map((u) => (u.id === payload.userId ? { ...u, assignedPost: undefined } : u))
            );
            if (currentUser.id === payload.userId) {
              setCurrentUser((u) => (u ? { ...u, assignedPost: undefined } : null));
            }
            break;
          }

          case "assignment:status_change": {
            setAssignments((prev) =>
              prev.map((a) => (a.userId === payload.userId ? { ...a, status: payload.status } : a))
            );
            setUsers((prev) =>
              prev.map((u) =>
                u.id === payload.userId && u.assignedPost
                  ? { ...u, assignedPost: { ...u.assignedPost, status: payload.status } }
                  : u
              )
            );
            if (currentUser.id === payload.userId) {
              setCurrentUser((u) =>
                u && u.assignedPost
                  ? { ...u, assignedPost: { ...u.assignedPost, status: payload.status } }
                  : u
              );
            }
            break;
          }

          // ---------------- PROTEST SQUADS SIGNALING ----------------
          case "group:created": {
            if (payload.group) {
              setGroups((prev) => [...prev.filter((g) => g.id !== payload.group.id), payload.group]);
            }
            break;
          }

          case "group:updated": {
            if (payload.group) {
              setGroups((prev) =>
                prev.map((g) => (g.id === payload.group.id ? payload.group : g))
              );
            }
            break;
          }

          case "group:deleted": {
            setGroups((prev) => prev.filter((g) => g.id !== payload.groupId));
            break;
          }

          case "group:members_changed": {
            if (payload.group) {
              setGroups((prev) =>
                prev.map((g) => (g.id === payload.group.id ? payload.group : g))
              );
              fetchUsers();
            }
            break;
          }

          // ---------------- INSPECTION POINTS SIGNALING ----------------
          case "inspection_point:updated": {
            if (payload.points) {
              setInspectionPoints(payload.points);
            } else if (payload.point) {
              setInspectionPoints((prev) => {
                const filtered = prev.filter((p) => p.id !== payload.point.id);
                return [...filtered, payload.point];
              });
            }
            break;
          }

          case "inspection_point:deleted": {
            if (payload.points) {
              setInspectionPoints(payload.points);
            } else if (payload.pointId) {
              setInspectionPoints((prev) => prev.filter((p) => p.id !== payload.pointId));
            }
            break;
          }

          // ---------------- DIRECT & GROUP CALLING SIGNALING ----------------
          case "call:incoming": {
            const isAutoAnswer = !!payload.autoAnswer;
            if (isAutoAnswer) {
              // Tactical Intercom Auto-Pickup!
              audioCallManager.playConnectChime();
              setActiveCall({
                callId: `call-${Date.now()}`,
                callType: payload.callType || "direct",
                groupId: payload.groupId,
                groupName: payload.groupName,
                otherUserId: payload.callerId,
                otherUserName: payload.callerName,
                otherUserRole: payload.callerRole,
                isIncoming: true,
                autoAnswer: true,
                status: "connected",
                duration: 0,
                isMuted: false,
                isSpeakerOn: true,
                participantCount: payload.participantCount,
              });

              audioCallManager.requestMicrophone().then(() => {
                audioCallManager.startAudioStreamBroadcast((chunk, sampleRate) => {
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    if (payload.callType === "group" && payload.groupId) {
                      wsRef.current.send(
                        JSON.stringify({
                          type: "call:audio_data",
                          callType: "group",
                          groupId: payload.groupId,
                          audioChunk: chunk,
                          sampleRate,
                        })
                      );
                    } else {
                      wsRef.current.send(
                        JSON.stringify({
                          type: "call:audio_data",
                          targetUserId: payload.callerId,
                          audioChunk: chunk,
                          sampleRate,
                        })
                      );
                    }
                  }
                });
              });

              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: "call:accept",
                    callerId: payload.callerId,
                    targetUserId: currentUser.id,
                  })
                );
              }
              break;
            }

            // Normal Ringing Mode (User must approve)
            audioCallManager.startIncomingRingtone();

            // Mobile hardware vibration for incoming voice call
            if ("vibrate" in navigator) {
              try {
                navigator.vibrate([400, 150, 400, 150, 600, 200, 600]);
              } catch (_) {}
            }

            // System Web Push Notification
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.ready.then((reg) => {
                    const notifyOpts: any = {
                      body: `Direct Voice Channel from ${payload.callerRole.toUpperCase()} — Tap to Answer`,
                      icon: "/manifest-icon.png",
                      badge: "/manifest-icon.png",
                      tag: "incoming-call",
                      requireInteraction: true,
                      vibrate: [400, 150, 400, 150, 600, 200, 600],
                      data: { isCall: true, callerId: payload.callerId, callerName: payload.callerName, callerRole: payload.callerRole },
                      actions: [
                        { action: "answer", title: "📞 Answer Call" },
                        { action: "dismiss", title: "✕ Decline" }
                      ]
                    };
                    reg.showNotification(`📞 Incoming Call: ${payload.callerName}`, notifyOpts);
                  });
                } else {
                  new Notification(`📞 Incoming Call: ${payload.callerName}`, {
                    body: `Direct Voice Channel from ${payload.callerRole.toUpperCase()}`,
                    requireInteraction: true,
                  });
                }
              } catch (err) {
                console.warn("Notification notice:", err);
              }
            }

            setActiveCall({
              callId: `call-${Date.now()}`,
              callType: payload.callType || "direct",
              groupId: payload.groupId,
              groupName: payload.groupName,
              otherUserId: payload.callerId,
              otherUserName: payload.callerName,
              otherUserRole: payload.callerRole,
              isIncoming: true,
              autoAnswer: false,
              status: "ringing",
              duration: 0,
              isMuted: false,
              isSpeakerOn: true,
              participantCount: payload.participantCount,
            });
            break;
          }

          case "call:group_started": {
            audioCallManager.playConnectChime();
            setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
            audioCallManager.startAudioStreamBroadcast((chunk, sampleRate) => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: "call:audio_data",
                    callType: "group",
                    groupId: payload.groupId,
                    audioChunk: chunk,
                    sampleRate,
                  })
                );
              }
            });
            break;
          }

          case "call:accepted": {
            audioCallManager.playConnectChime();
            const targetId = payload.targetUserId || activeCallRef.current?.otherUserId;
            setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));

            if (targetId) {
              audioCallManager.startAudioStreamBroadcast((chunk, sampleRate) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: "call:audio_data",
                      targetUserId: targetId,
                      audioChunk: chunk,
                      sampleRate,
                    })
                  );
                }
              });
            }
            break;
          }

          case "call:audio_data": {
            if (payload.audioChunk) {
              audioCallManager.playAudioChunk(payload.audioChunk, payload.sampleRate);
            }
            break;
          }

          case "call:rejected": {
            audioCallManager.playEndChime();
            audioCallManager.cleanupCall();
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
            audioCallManager.cleanupCall();
            showTacticalNotice(payload.reason || "User is currently unreachable.", "warning");
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
  }, [currentUser?.id, fetchLogs, fetchUsers]);

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

  // ---------------- PWA SERVICE WORKER & WAKE-LOCK ----------------
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    // 1. Service Worker Registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration note:", err);
        });

      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === "NOTIFICATION_CALL_ANSWER") {
          handleAcceptCall();
        }
      };
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    // 2. Web Screen Wake Lock to prevent phone screen from sleeping during marches
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch (e) {
        console.warn("Screen wake lock note:", e);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUserRef.current) {
          try {
            wsRef.current.send(
              JSON.stringify({
                type: "auth:identify",
                userId: currentUserRef.current.id,
              })
            );
          } catch (_) {}
        }
        gpsEngine.requestDirectFix().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. BeforeInstallPrompt for 1-tap PWA Install Banner
    const installHandler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwaInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", installHandler);

    // 4. Request Notification Permission if default
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", installHandler);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsPwaInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // ---------------- 100% REAL DEVICE BROWSER & HARDWARE GPS TELEMETRY ----------------
  useEffect(() => {
    const userId = currentUser?.id;
    const isBanned = currentUser?.isBanned;
    if (!userId || isBanned) return;

    // Start continuous multi-tier hardware positioning
    gpsEngine.startContinuousWatching();

    const unsubscribe = gpsEngine.subscribe(
      (fix) => {
        setIsRealGpsActive(fix.source !== "ip_network");
        if (fix.accuracy !== undefined) setGpsAccuracy(fix.accuracy);
        if (fix.statusText) setGpsStatusText(fix.statusText);

        setCurrentUser((curr) =>
          curr
            ? {
                ...curr,
                location: {
                  ...curr.location,
                  lat: fix.lat,
                  lng: fix.lng,
                  speed: fix.speed,
                  heading: fix.heading,
                  accuracy: fix.accuracy,
                  lastUpdated: new Date(fix.timestamp).toISOString(),
                },
              }
            : null
        );

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  location: {
                    ...u.location,
                    lat: fix.lat,
                    lng: fix.lng,
                    speed: fix.speed,
                    heading: fix.heading,
                    accuracy: fix.accuracy,
                    lastUpdated: new Date(fix.timestamp).toISOString(),
                  },
                  isOnline: true,
                }
              : u
          )
        );

        const gpsPayload = {
          userId,
          lat: fix.lat,
          lng: fix.lng,
          speed: fix.speed,
          heading: fix.heading,
          accuracy: fix.accuracy,
        };

        // Forward to real-time WebSocket mesh network
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "gps:update",
              ...gpsPayload,
            })
          );
        } else {
          // Robust background HTTP Keep-Alive transmission when WebSocket is suspended in background
          fetch("/api/gps/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(gpsPayload),
            keepalive: true,
          }).catch(() => {
            if ("sendBeacon" in navigator) {
              navigator.sendBeacon("/api/gps/beacon", JSON.stringify(gpsPayload));
            }
          });
        }
      },
      (status, message) => {
        setGpsStatusText(message);
        if (status === "permission_denied") {
          setIsRealGpsActive(false);
          showTacticalNotice("Location permission denied. Using network approximation.", "warning");
        } else if (status === "high_accuracy_locked") {
          setIsRealGpsActive(true);
        }
      }
    );

    return () => {
      unsubscribe();
      gpsEngine.stopContinuousWatching();
    };
  }, [currentUser?.id, currentUser?.isBanned, showTacticalNotice]);

  // Trigger manual high-precision GPS refresh
  const handleRefreshGps = useCallback(async () => {
    showTacticalNotice("Re-locking high precision GPS satellites...", "info");
    try {
      const fix = await gpsEngine.requestDirectFix();
      if (fix) {
        showTacticalNotice(
          `GPS Lock Established (±${Math.round(fix.accuracy || 5)}m)`,
          "success"
        );
      }
    } catch (e) {
      console.warn("Manual GPS fix notice:", e);
    }
  }, [showTacticalNotice]);

  // Update coordinates manually (e.g. tap on map)
  const handleUpdateCoordinates = useCallback(
    (lat: number, lng: number) => {
      if (!currentUser) return;
      const validLat = Number(lat);
      const validLng = Number(lng);
      if (!Number.isFinite(validLat) || !Number.isFinite(validLng)) return;

      setCurrentUser((curr) =>
        curr
          ? {
              ...curr,
              location: {
                ...curr.location,
                lat: validLat,
                lng: validLng,
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
                location: {
                  ...u.location,
                  lat: validLat,
                  lng: validLng,
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
            lat: validLat,
            lng: validLng,
          })
        );
      }
    },
    [currentUser]
  );

  // ---------------- USER ACTIONS ----------------

  const handleLoginSuccess = (user: UserRecord, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    gpsEngine.setUserId(user.id);
    try {
      localStorage.setItem("crowd_auth_token", token);
      localStorage.setItem("crowd_user_id", user.id);
    } catch (_) {}
    setIsLoginModalOpen(false);
    showTacticalNotice(`Authenticated as ${user.displayName} (${user.role.toUpperCase()})`, "success");
  };

  const handleLogout = () => {
    const loggingOutUserId = currentUser?.id;
    const currentToken = authToken;
    gpsEngine.setUserId(null);
    try {
      localStorage.removeItem("crowd_auth_token");
      localStorage.removeItem("crowd_user_id");
    } catch (_) {}

    // Explicitly notify server that user voluntarily logged out
    if (loggingOutUserId) {
      apiFetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: currentToken ? `Bearer ${currentToken}` : "",
        },
        body: JSON.stringify({ userId: loggingOutUserId }),
      }).catch(() => {});
    }

    setCurrentUser(null);
    setAuthToken(null);
    setIsLoginModalOpen(true);
    if (wsRef.current) wsRef.current.close();
  };

  const handleUpdateStatus = async (status: MovementStatus) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch("/api/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, movementStatus: status }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const handleTriggerSos = async (customNote?: string) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch("/api/users/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          note: customNote || "SOS! Immediate field assistance requested.",
        }),
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
      }
    } catch (e) {
      console.error("Failed to trigger SOS:", e);
    }
  };

  const handleSendMessage = async (
    recipientId: string = "all",
    content: string,
    isSos?: boolean,
    location?: { lat: number; lng: number }
  ) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!content || !content.trim()) return;
    try {
      const res = await apiFetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken || localStorage.getItem("crowd_auth_token") || ""}`,
        },
        body: JSON.stringify({
          senderId: currentUser.id,
          recipientId: recipientId || "all",
          content: content.trim(),
          isSosAlert: !!isSos,
          attachedLocation: location || (isSos ? currentUser.location : undefined),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn("Message broadcast warning:", data.error || "Failed to broadcast message.");
        return;
      }
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  // ---------------- DIRECT & GROUP ONLINE VOICE CALLING ----------------

  const handleStartCall = (targetUser: UserRecord) => {
    if (!currentUser || targetUser.isBanned || targetUser.id === currentUser.id) return;
    setPendingCallTarget({ type: "user", user: targetUser });
    setIsCallPromptOpen(true);
  };

  const handleStartGroupCall = (targetGroup: ProtestGroup) => {
    if (!currentUser) return;
    setPendingCallTarget({ type: "group", group: targetGroup });
    setIsCallPromptOpen(true);
  };

  const handleConfirmCall = async (autoAnswer: boolean) => {
    if (!pendingCallTarget || !currentUser) return;
    setIsCallPromptOpen(false);

    await audioCallManager.requestMicrophone();

    if (autoAnswer) {
      // Bypassing consent (Tactical Intercom / Radio): NO ringtone, immediate radio chirp
      audioCallManager.stopRingtone();
      audioCallManager.playConnectChime();
    } else {
      // Normal call with consent: play ringing tone until recipient answers
      audioCallManager.startOutgoingRingtone();
    }

    if (pendingCallTarget.type === "user") {
      const targetUser = pendingCallTarget.user;
      setActiveCall({
        callId: `call-${Date.now()}`,
        callType: "direct",
        otherUserId: targetUser.id,
        otherUserName: targetUser.displayName,
        otherUserRole: targetUser.role,
        isIncoming: false,
        autoAnswer,
        status: autoAnswer ? "connected" : "calling",
        duration: 0,
        isMuted: false,
        isSpeakerOn: true,
      });

      if (autoAnswer) {
        // Start streaming voice immediately for intercom
        audioCallManager.startAudioStreamBroadcast((chunk, sampleRate) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "call:audio_data",
                targetUserId: targetUser.id,
                audioChunk: chunk,
                sampleRate,
              })
            );
          }
        });
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "call:initiate",
            callerId: currentUser.id,
            targetUserId: targetUser.id,
            autoAnswer,
          })
        );
      }
    } else {
      const targetGroup = pendingCallTarget.group;
      setActiveCall({
        callId: `call-${Date.now()}`,
        callType: "group",
        groupId: targetGroup.id,
        groupName: targetGroup.name,
        otherUserId: targetGroup.id,
        otherUserName: targetGroup.name,
        otherUserRole: "admin",
        isIncoming: false,
        autoAnswer,
        status: autoAnswer ? "connected" : "calling",
        duration: 0,
        isMuted: false,
        isSpeakerOn: true,
        participantCount: targetGroup.memberIds.length,
      });

      if (autoAnswer) {
        // Start streaming voice immediately to group
        audioCallManager.startAudioStreamBroadcast((chunk, sampleRate) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "call:audio_data",
                callType: "group",
                groupId: targetGroup.id,
                audioChunk: chunk,
                sampleRate,
              })
            );
          }
        });
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "call:group_initiate",
            groupId: targetGroup.id,
            autoAnswer,
          })
        );
      }
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
          callType: activeCall.callType,
          groupId: activeCall.groupId,
        })
      );
    }

    // Start streaming real-time mic packets to caller or group
    audioCallManager.startAudioStreamBroadcast((chunk, sampleRate) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (activeCall.callType === "group" && activeCall.groupId) {
          wsRef.current.send(
            JSON.stringify({
              type: "call:audio_data",
              callType: "group",
              groupId: activeCall.groupId,
              audioChunk: chunk,
              sampleRate,
            })
          );
        } else {
          wsRef.current.send(
            JSON.stringify({
              type: "call:audio_data",
              targetUserId: activeCall.otherUserId,
              audioChunk: chunk,
              sampleRate,
            })
          );
        }
      }
    });
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
          callType: activeCall.callType,
          groupId: activeCall.groupId,
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
    setActiveCall((prev) => (prev ? { ...prev, isMuted: newMute } : null));
  };

  const handleToggleSpeaker = () => {
    if (!activeCall) return;
    setActiveCall((prev) => (prev ? { ...prev, isSpeakerOn: !prev.isSpeakerOn } : null));
  };

  // ---------------- GLOBAL MARKER, INSPECTION, ASSIGNMENT & GROUP HANDLERS ----------------

  const handleAddInspectionPoint = async (data: {
    title: string;
    notes?: string;
    type: InspectionPoint["type"];
    lat: number;
    lng: number;
  }) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch("/api/inspection-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken ? `Bearer ${authToken}` : "",
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.points) setInspectionPoints(resData.points);
      else if (resData.point) setInspectionPoints((prev) => [...prev, resData.point]);
    } catch (e) {
      console.warn("Failed to add inspection point:", e);
    }
  };

  const handleMoveInspectionPoint = async (id: string, lat: number, lng: number) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/api/inspection-points/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken ? `Bearer ${authToken}` : "",
        },
        body: JSON.stringify({ lat, lng }),
      });
      const resData = await res.json();
      if (resData.points) setInspectionPoints(resData.points);
      else if (resData.point) {
        setInspectionPoints((prev) => prev.map((p) => (p.id === id ? resData.point : p)));
      }
    } catch (e) {
      console.warn("Failed to move inspection point:", e);
    }
  };

  const handleDeleteInspectionPoint = async (id: string) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/api/inspection-points/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : "",
        },
      });
      const resData = await res.json();
      if (resData.points) setInspectionPoints(resData.points);
      else setInspectionPoints((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.warn("Failed to delete inspection point:", e);
    }
  };

  const handleAssignGroupDestination = async (
    groupId: string,
    data: { label: string; lat: number; lng: number; assignAllMembers?: boolean }
  ) => {
    if (!currentUser) return;
    try {
      const res = await apiFetch(`/api/groups/${groupId}/rally-point`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken ? `Bearer ${authToken}` : "",
        },
        body: JSON.stringify({
          lat: data.lat,
          lng: data.lng,
          label: data.label,
        }),
      });
      const resData = await res.json();
      if (resData.group) {
        setGroups((prev) => prev.map((g) => (g.id === groupId ? resData.group : g)));
      }

      if (data.assignAllMembers) {
        const group = groups.find((g) => g.id === groupId);
        if (group) {
          for (const memberId of group.memberIds) {
            await handleAssignUserMarker(memberId, {
              title: `${data.label} (Squad)`,
              instructions: `Converge with ${group.name} at designated waypoint.`,
              lat: data.lat,
              lng: data.lng,
            });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to assign group destination:", e);
    }
  };

  const handleSetGlobalMarker = async (data: {
    title: string;
    description: string;
    lat: number;
    lng: number;
    radius?: number;
    targetTime?: string;
  }) => {
    // Optimistic instantaneous UI update so the user immediately sees the beacon
    const optimisticMarker: GlobalMarker = {
      id: globalMarker?.id || `gm-${Date.now()}`,
      title: data.title,
      description: data.description,
      lat: data.lat,
      lng: data.lng,
      radius: data.radius || 150,
      targetTime: data.targetTime,
      updatedBy: currentUser?.displayName || "System Commander",
      updatedAt: new Date().toISOString(),
    };
    setGlobalMarker(optimisticMarker);
    showTacticalNotice(`Assembly Point Beacon Set: ${data.title}`, "success");

    try {
      const token = authToken || localStorage.getItem("crowd_auth_token") || "";
      const effectiveUserId = currentUser?.id || "usr-superadmin";
      const res = await apiFetch(`/api/global-marker?userId=${encodeURIComponent(effectiveUserId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...data,
          adminUserId: effectiveUserId,
          userId: effectiveUserId,
          updatedBy: currentUser?.displayName || "Command Lead",
        }),
      });
      const result = await res.json();
      if (result.marker) {
        setGlobalMarker(result.marker);
      }
    } catch (err) {
      console.warn("Global marker sync notice:", err);
    }
  };

  const handleClearGlobalMarker = async () => {
    // Instantaneous optimistic removal
    setGlobalMarker(null);
    showTacticalNotice("Global Assembly Point cleared", "info");

    try {
      const token = authToken || localStorage.getItem("crowd_auth_token") || "";
      const effectiveUserId = currentUser?.id || "usr-superadmin";
      const res = await apiFetch(`/api/global-marker?userId=${encodeURIComponent(effectiveUserId)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          adminUserId: effectiveUserId,
          userId: effectiveUserId,
        }),
      });
      if (!res.ok) {
        console.warn("Server reported notice clearing assembly point:", res.status);
      }
    } catch (err) {
      console.warn("Global marker clear notice:", err);
    }
  };

  const handleAssignUserMarker = async (
    targetUserId: string,
    data: { title: string; instructions: string; lat: number; lng: number }
  ) => {
    if (!currentUser) return;
    const res = await apiFetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: targetUserId,
        ...data,
        assignedBy: currentUser.displayName,
      }),
    });
    const result = await res.json();
    if (result.assignment) {
      setAssignments((prev) => [
        ...prev.filter((a) => a.userId !== targetUserId),
        result.assignment,
      ]);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, assignedPost: result.assignment } : u))
      );
    }
  };

  const handleClearUserAssignment = async (targetUserId: string) => {
    const res = await fetch(`/api/assignments/${targetUserId}`, { method: "DELETE" });
    if (res.ok) {
      setAssignments((prev) => prev.filter((a) => a.userId !== targetUserId));
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, assignedPost: undefined } : u))
      );
    }
  };

  const handleUpdateAssignmentStatus = async (status: "pending" | "acknowledged" | "reached") => {
    if (!currentUser) return;
    const res = await fetch(`/api/assignments/${currentUser.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await res.json();
    if (result.assignment) {
      setAssignments((prev) =>
        prev.map((a) => (a.userId === currentUser.id ? result.assignment : a))
      );
      setCurrentUser((u) => (u ? { ...u, assignedPost: result.assignment } : null));
    }
  };

  const handleCreateGroup = async (groupData: {
    name: string;
    description: string;
    color: string;
    icon?: string;
    leaderUserId?: string;
    rallyPoint?: { lat: number; lng: number; label: string };
    memberIds?: string[];
  }) => {
    const res = await apiFetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupData),
    });
    const result = await res.json();
    if (result.group) {
      setGroups((prev) => [...prev, result.group]);
      fetchUsers();
    }
  };

  const handleUpdateGroup = async (groupId: string, groupData: any) => {
    const res = await apiFetch(`/api/groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupData),
    });
    const result = await res.json();
    if (result.group) {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? result.group : g)));
      fetchUsers();
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const res = await apiFetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      fetchUsers();
    }
  };

  const handleUpdateGroupMembers = async (groupId: string, memberIds: string[]) => {
    const res = await apiFetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds }),
    });
    const result = await res.json();
    if (result.group) {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? result.group : g)));
      fetchUsers();
    }
  };

  // ---------------- TAG ACTIONS (SUPER ADMIN & SEARCH) ----------------

  const handleCreateTag = async (tag: string) => {
    try {
      const res = await apiFetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      const data = await res.json();
      if (data.tags) setAvailableTags(data.tags);
    } catch (e) {
      console.warn("Failed to create tag:", e);
    }
  };

  const handleDeleteTag = async (tag: string) => {
    try {
      const res = await apiFetch(`/api/tags/${encodeURIComponent(tag)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.tags) setAvailableTags(data.tags);
      fetchUsers();
    } catch (e) {
      console.warn("Failed to delete tag:", e);
    }
  };

  const handleAddUserTag = async (targetUserId: string, tag: string) => {
    try {
      const res = await apiFetch(`/api/users/${targetUserId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      const data = await res.json();
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === targetUserId ? data.user : u)));
        if (currentUser?.id === targetUserId) {
          setCurrentUser(data.user);
        }
      }
      if (data.availableTags) setAvailableTags(data.availableTags);
    } catch (e) {
      console.warn("Failed to add user tag:", e);
    }
  };

  const handleRemoveUserTag = async (targetUserId: string, tag: string) => {
    try {
      const res = await apiFetch(`/api/users/${targetUserId}/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.user) {
        setUsers((prev) => prev.map((u) => (u.id === targetUserId ? data.user : u)));
        if (currentUser?.id === targetUserId) {
          setCurrentUser(data.user);
        }
      }
    } catch (e) {
      console.warn("Failed to remove user tag:", e);
    }
  };

  const handleFilterByTag = (tag: string) => {
    setFilters((prev) => {
      const selected = prev.selectedTags || [];
      if (selected.includes(tag)) return prev;
      return { ...prev, selectedTags: [...selected, tag] };
    });
  };

  // ---------------- ADMIN ACTIONS ----------------

  const handleBanUser = async (targetUserId: string, reason: string) => {
    if (!currentUser) return;
    const res = await apiFetch("/api/admin/ban", {
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
    const res = await apiFetch("/api/admin/unban", {
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

  const handleCreateUser = async (userData: {
    displayName: string;
    username?: string;
    password?: string;
    role: UserRole;
    tags?: string[];
    description?: string;
    phoneOrContact?: string;
  }) => {
    if (!currentUser) return;
    const res = await apiFetch("/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken || localStorage.getItem("crowd_auth_token") || ""}`,
      },
      body: JSON.stringify({
        adminUserId: currentUser.id,
        ...userData,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create user account");
    fetchUsers();
    fetchLogs();
    return data.user;
  };

  // Switch to messages tab and select user
  const handleStartChatWithUser = (user: UserRecord) => {
    if (currentUser && user.id === currentUser.id) {
      setActiveChatRecipientId("all");
    } else {
      setActiveChatRecipientId(user.id);
    }
    setCurrentTab("messages");
    setUnreadMessagesCount(0);
    setSelectedUser(user);
  };

  // Jump from search, chat, or admin coordinate chip to map
  const handleViewLocationOnMap = (lat: number, lng: number, targetUser?: UserRecord) => {
    const validLat = Number(lat);
    const validLng = Number(lng);
    if (!Number.isFinite(validLat) || !Number.isFinite(validLng)) return;

    setCurrentTab("home");
    const matched =
      targetUser ||
      users.find(
        (u) =>
          Math.abs(u.location.lat - validLat) < 0.0001 &&
          Math.abs(u.location.lng - validLng) < 0.0001
      ) ||
      null;

    if (matched) {
      setSelectedUser(matched);
    }
    setFlyToTarget({ lat: validLat, lng: validLng, zoom: 18, timestamp: Date.now() });
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
    <div className="fixed inset-0 flex flex-col h-[100dvh] w-full bg-slate-50 text-slate-900 overflow-hidden font-sans select-none overscroll-none">
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
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Floating Tactical Notice Notification Banner */}
      {tacticalNotice && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between shadow-md transition-all animate-in slide-in-from-top-2 z-50 ${
            tacticalNotice.type === "warning"
              ? "bg-amber-600 text-white"
              : tacticalNotice.type === "success"
              ? "bg-emerald-600 text-white"
              : tacticalNotice.type === "emergency"
              ? "bg-rose-600 text-white font-bold"
              : "bg-slate-900 text-slate-100"
          }`}
        >
          <div className="flex items-center gap-2 max-w-3xl mx-auto flex-1">
            {tacticalNotice.type === "warning" && <AlertCircle className="w-4 h-4 shrink-0" />}
            {tacticalNotice.type === "success" && <CheckCircle className="w-4 h-4 shrink-0" />}
            {tacticalNotice.type === "info" && <Info className="w-4 h-4 shrink-0" />}
            {tacticalNotice.type === "emergency" && <ShieldAlert className="w-4 h-4 shrink-0" />}
            <span className="font-medium">{tacticalNotice.message}</span>
          </div>
          <button
            onClick={() => setTacticalNotice(null)}
            className="p-1 hover:bg-white/20 rounded-md transition cursor-pointer text-white"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
      <main className="flex-1 min-h-0 relative overflow-hidden w-full">
        {/* Tab 1: Home Satellite Map View */}
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
                  selectedGroupId: undefined,
                  selectedTags: [],
                  showAllUnitsAdminOverride: false,
                })
              }
              totalFilteredCount={users.length}
              users={users}
              onSelectUser={setSelectedUser}
              onLocateUser={handleViewLocationOnMap}
              groups={groups}
              availableTags={availableTags}
              isSuperAdminOrAdmin={currentUser?.role === "admin" || currentUser?.role === "superadmin"}
            />

            <div className="flex-1 relative">
              <LeafletCrowdMap
                users={users}
                currentUser={currentUser}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                filters={filters}
                onStartCall={handleStartCall}
                onStartChat={handleStartChatWithUser}
                onStartGroupCall={handleStartGroupCall}
                onUpdateCoordinates={handleUpdateCoordinates}
                isRealGpsActive={isRealGpsActive}
                onRefreshGps={handleRefreshGps}
                gpsAccuracy={gpsAccuracy}
                gpsStatusText={gpsStatusText}
                globalMarker={globalMarker}
                assignments={assignments}
                groups={groups}
                availableTags={availableTags}
                inspectionPoints={inspectionPoints}
                onFilterByTag={handleFilterByTag}
                onAddUserTag={handleAddUserTag}
                onRemoveUserTag={handleRemoveUserTag}
                onSetGlobalMarker={handleSetGlobalMarker}
                onClearGlobalMarker={handleClearGlobalMarker}
                onAssignUserMarker={handleAssignUserMarker}
                onClearUserAssignment={handleClearUserAssignment}
                onUpdateAssignmentStatus={handleUpdateAssignmentStatus}
                onAddInspectionPoint={handleAddInspectionPoint}
                onMoveInspectionPoint={handleMoveInspectionPoint}
                onDeleteInspectionPoint={handleDeleteInspectionPoint}
                onAssignGroupDestination={handleAssignGroupDestination}
                onUpdateFilters={(newFilters) => setFilters((f) => ({ ...f, ...newFilters }))}
                flyToTarget={flyToTarget}
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
            groups={groups}
            onSendMessage={handleSendMessage}
            onStartCall={handleStartCall}
            onStartGroupCall={handleStartGroupCall}
            onViewLocationOnMap={handleViewLocationOnMap}
            initialRecipientId={activeChatRecipientId}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onClearUnreadBadge={() => setUnreadMessagesCount(0)}
          />
        )}

        {/* Tab 3: Admin & System Logs */}
        {currentTab === "admin" && (
          <AdminLogsView
            currentUser={currentUser}
            users={users}
            logs={logs}
            globalMarker={globalMarker}
            assignments={assignments}
            groups={groups}
            availableTags={availableTags}
            onCreateTag={handleCreateTag}
            onDeleteTag={handleDeleteTag}
            onAddUserTag={handleAddUserTag}
            onRemoveUserTag={handleRemoveUserTag}
            onBanUser={handleBanUser}
            onUnbanUser={handleUnbanUser}
            onRefreshLogs={fetchLogs}
            onSetGlobalMarker={handleSetGlobalMarker}
            onClearGlobalMarker={handleClearGlobalMarker}
            onAssignUserMarker={handleAssignUserMarker}
            onClearUserAssignment={handleClearUserAssignment}
            onCreateGroup={handleCreateGroup}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onUpdateGroupMembers={handleUpdateGroupMembers}
            onCreateUser={handleCreateUser}
            onStartCall={handleStartCall}
            onStartGroupCall={handleStartGroupCall}
            onLocateOnMap={handleViewLocationOnMap}
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
            isRealGpsActive={isRealGpsActive}
            onRefreshGps={handleRefreshGps}
            onSwitchUserPrompt={() => setIsLoginModalOpen(true)}
            gpsAccuracy={gpsAccuracy}
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

      {/* Tactical Audio Dispatch Ring Mode Prompt (Auto-Pickup vs Direct Ring) */}
      <CallInitiatePromptModal
        isOpen={isCallPromptOpen}
        target={pendingCallTarget}
        onConfirmCall={handleConfirmCall}
        onClose={() => {
          setIsCallPromptOpen(false);
          setPendingCallTarget(null);
        }}
      />

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

      {/* Login & Unit Registration Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
