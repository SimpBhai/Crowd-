import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Default environment variables & credentials
const PORT = 3000;
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || "superadmin";
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "superadmin123";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword123";
const USER_USERNAME = process.env.USER_USERNAME || "user";
const USER_PASSWORD = process.env.USER_PASSWORD || "userpassword123";

// User types
export type UserRole = "superadmin" | "admin" | "dispatcher" | "volunteer" | "participant";
export type MovementStatus = "stationary" | "walking" | "running" | "in_transit" | "sos";

export interface UserLocation {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number; // km/h
  lastUpdated: string;
}

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  movementStatus: MovementStatus;
  location: UserLocation;
  isOnline: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  batteryLevel?: number;
  avatarColor: string;
  customStatus?: string;
  phoneOrContact?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string; // 'all' or 'admin_channel' or specific user id
  content: string;
  timestamp: string;
  isSosAlert?: boolean;
  attachedLocation?: { lat: number; lng: number };
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "violation" | "emergency";
  action: string;
  userId?: string;
  username?: string;
  details: string;
  ip?: string;
}

// Initial mock crowd dataset centered in a vibrant urban venue (e.g. Central Park / Columbus Circle area, NYC)
// Coords: ~40.7680, -73.9780
const INITIAL_USERS: UserRecord[] = [
  {
    id: "usr-superadmin",
    username: SUPERADMIN_USERNAME,
    displayName: "Commander Sarah (Super Admin)",
    role: "superadmin",
    movementStatus: "stationary",
    location: {
      lat: 40.7690,
      lng: -73.9770,
      altitude: 28,
      accuracy: 5,
      heading: 0,
      speed: 0,
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 98,
    avatarColor: "#dc2626",
    customStatus: "Incident Command Center Active",
  },
  {
    id: "usr-admin-1",
    username: ADMIN_USERNAME,
    displayName: "Officer Dave (Admin)",
    role: "admin",
    movementStatus: "walking",
    location: {
      lat: 40.7665,
      lng: -73.9795,
      altitude: 24,
      accuracy: 6,
      heading: 45,
      speed: 4.8,
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 84,
    avatarColor: "#ea580c",
    customStatus: "Patrolling South Perimeter",
  },
  {
    id: "usr-dispatch-1",
    username: "dispatcher_emma",
    displayName: "Emma Watson (Dispatch)",
    role: "dispatcher",
    movementStatus: "stationary",
    location: {
      lat: 40.7712,
      lng: -73.9740,
      altitude: 35,
      accuracy: 4,
      heading: 180,
      speed: 0,
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 92,
    avatarColor: "#0284c7",
    customStatus: "Radio & GPS Monitor Live",
  },
  {
    id: "usr-resp-1",
    username: "medic_marcus",
    displayName: "Marcus Ray (First Responder)",
    role: "volunteer",
    movementStatus: "running",
    location: {
      lat: 40.7650,
      lng: -73.9730,
      altitude: 20,
      accuracy: 8,
      heading: 120,
      speed: 11.4,
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 67,
    avatarColor: "#16a34a",
    customStatus: "Rapid medical response en route",
  },
  {
    id: "usr-resp-2",
    username: "transit_unit4",
    displayName: "Safety Vehicle 04",
    role: "volunteer",
    movementStatus: "in_transit",
    location: {
      lat: 40.7735,
      lng: -73.9810,
      altitude: 18,
      accuracy: 10,
      heading: 260,
      speed: 34.2,
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 99,
    avatarColor: "#9333ea",
    customStatus: "North Avenue Transit Route",
  },
  {
    id: "usr-cit-1",
    username: USER_USERNAME,
    displayName: "Citizen Alex (Standard User)",
    role: "participant",
    movementStatus: "walking",
    location: {
      lat: 40.7682,
      lng: -73.9760,
      altitude: 22,
      accuracy: 7,
      heading: 85,
      speed: 3.6,
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 79,
    avatarColor: "#4f46e5",
    customStatus: "Attending Community Festival",
  },
  {
    id: "usr-cit-2",
    username: "elena_runner",
    displayName: "Elena Rostova",
    role: "participant",
    movementStatus: "running",
    location: {
      lat: 40.7698,
      lng: -73.9790,
      altitude: 26,
      accuracy: 5,
      heading: 315,
      speed: 9.8,
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 55,
    avatarColor: "#db2777",
    customStatus: "Marathon 5K Loop",
  },
  {
    id: "usr-cit-3",
    username: "spoof_bot_99",
    displayName: "Flagged Bot Node",
    role: "participant",
    movementStatus: "sos",
    location: {
      lat: 40.7640,
      lng: -73.9780,
      altitude: 15,
      accuracy: 12,
      heading: 0,
      speed: 0,
      lastUpdated: new Date().toISOString(),
    },
    isOnline: false,
    isBanned: true,
    banReason: "GPS Teleport Spoofing & Automated Broadcast Spam",
    bannedAt: new Date(Date.now() - 3600000).toISOString(),
    batteryLevel: 12,
    avatarColor: "#64748b",
    customStatus: "Account Suspended by Super Admin",
  },
];

// In-Memory Database Store
const usersMap = new Map<string, UserRecord>();
INITIAL_USERS.forEach((u) => usersMap.set(u.id, { ...u }));

const chatMessages: ChatMessage[] = [
  {
    id: "msg-1",
    senderId: "usr-superadmin",
    senderName: "Commander Sarah (Super Admin)",
    senderRole: "superadmin",
    recipientId: "all",
    content: "Welcome all field units and participants. GPS tracking and audio dispatch is active.",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: "msg-2",
    senderId: "usr-admin-1",
    senderName: "Officer Dave (Admin)",
    senderRole: "admin",
    recipientId: "all",
    content: "Perimeter check normal at South Gate. All teams please keep broadcast GPS on.",
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: "msg-3",
    senderId: "usr-resp-1",
    senderName: "Marcus Ray (First Responder)",
    senderRole: "volunteer",
    recipientId: "admin_channel",
    content: "Medical station 2 fully staffed. Water points distributed along track.",
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    attachedLocation: { lat: 40.7650, lng: -73.9730 },
  },
];

const auditLogs: SystemAuditLog[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    level: "info",
    action: "SYSTEM_INITIALIZED",
    details: "Crowd GPS Tracker server initialized with OpenStreetMap tile provider.",
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    level: "info",
    action: "SUPERADMIN_AUTHENTICATED",
    userId: "usr-superadmin",
    username: SUPERADMIN_USERNAME,
    details: "Super Administrator session established via secure environment credentials.",
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    level: "violation",
    action: "USER_BANNED",
    userId: "usr-cit-3",
    username: "spoof_bot_99",
    details: "User banned by Super Admin. Violation: GPS Teleport Spoofing & Spam.",
  },
  {
    id: "log-4",
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    level: "warning",
    action: "PERIMETER_DENSITY_ALERT",
    details: "Elevated crowd concentration detected in Section B (28 nodes / 200m).",
  },
];

function addAuditLog(
  level: "info" | "warning" | "violation" | "emergency",
  action: string,
  details: string,
  userId?: string,
  username?: string,
  ip?: string
) {
  const log: SystemAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    action,
    details,
    userId,
    username,
    ip,
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 500) auditLogs.pop();

  // Broadcast to all WebSocket clients (especially superadmins listening)
  broadcastWS({
    type: "log:new",
    log,
  });
  return log;
}

// Active WebSocket connections mapped by user ID
const clientConnections = new Map<string, WebSocket>();

function broadcastWS(payload: any, excludeUserId?: string) {
  const data = JSON.stringify(payload);
  clientConnections.forEach((ws, uid) => {
    if (uid !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

// Gentle realistic crowd drift simulation for background units so the map is alive and dynamic
setInterval(() => {
  const now = new Date().toISOString();
  usersMap.forEach((user) => {
    if (user.isBanned || !user.isOnline) return;

    // Simulate slight movement for users in motion
    if (user.movementStatus === "walking" || user.movementStatus === "running" || user.movementStatus === "in_transit") {
      const speedMult =
        user.movementStatus === "in_transit"
          ? 0.0003
          : user.movementStatus === "running"
          ? 0.00012
          : 0.00005;

      const angleRad = ((user.location.heading || 45) * Math.PI) / 180;
      // Slight jitter in heading
      const jitter = (Math.random() - 0.5) * 20;
      const newHeading = ((user.location.heading || 0) + jitter + 360) % 360;

      const dLat = Math.cos(angleRad) * speedMult;
      const dLng = Math.sin(angleRad) * speedMult;

      user.location.lat += dLat;
      user.location.lng += dLng;
      user.location.heading = Math.round(newHeading);
      user.location.lastUpdated = now;

      // Keep within Central Park boundary bounds (40.75 - 40.79, -73.99 - -73.96)
      if (user.location.lat > 40.785) user.location.lat = 40.760;
      if (user.location.lat < 40.755) user.location.lat = 40.780;
      if (user.location.lng > -73.960) user.location.lng = -73.985;
      if (user.location.lng < -73.990) user.location.lng = -73.965;
    }
  });

  // Broadcast crowd positions update
  broadcastWS({
    type: "crowd:positions",
    users: Array.from(usersMap.values()),
  });
}, 2500);

async function startServer() {
  const app = express();
  app.use(express.json());

  // CORS / headers
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // ---------------- API ROUTES ----------------

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      activeUsers: usersMap.size,
    });
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    let authenticatedUser: UserRecord | null = null;

    // Check credentials against environment configuration
    if (username === SUPERADMIN_USERNAME && password === SUPERADMIN_PASSWORD) {
      let superUser = usersMap.get("usr-superadmin");
      if (!superUser) {
        superUser = INITIAL_USERS[0];
        usersMap.set(superUser.id, superUser);
      }
      authenticatedUser = superUser;
    } else if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      let adminUser = usersMap.get("usr-admin-1");
      if (!adminUser) {
        adminUser = INITIAL_USERS[1];
        usersMap.set(adminUser.id, adminUser);
      }
      authenticatedUser = adminUser;
    } else if (username === USER_USERNAME && password === USER_PASSWORD) {
      let citizenUser = usersMap.get("usr-cit-1");
      if (!citizenUser) {
        citizenUser = INITIAL_USERS[5];
        usersMap.set(citizenUser.id, citizenUser);
      }
      authenticatedUser = citizenUser;
    } else {
      // Check other pre-seeded users
      const found = Array.from(usersMap.values()).find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );
      if (found && password === "userpassword123") {
        authenticatedUser = found;
      }
    }

    if (!authenticatedUser) {
      addAuditLog("warning", "AUTH_FAILED", `Failed login attempt for username: ${username}`, undefined, username, clientIp);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (authenticatedUser.isBanned) {
      addAuditLog("violation", "BANNED_USER_LOGIN_BLOCKED", `Banned user ${username} attempted login`, authenticatedUser.id, username, clientIp);
      return res.status(403).json({
        error: "Your account is suspended for guideline violations.",
        banReason: authenticatedUser.banReason || "Violation of Community Guidelines",
      });
    }

    // Mark online
    authenticatedUser.isOnline = true;
    usersMap.set(authenticatedUser.id, authenticatedUser);

    addAuditLog("info", "USER_LOGIN", `User ${authenticatedUser.displayName} (${authenticatedUser.role}) logged in.`, authenticatedUser.id, authenticatedUser.username, clientIp);

    // Simple auth token simulation for session
    const token = `token_${authenticatedUser.id}_${Date.now()}`;

    res.json({
      success: true,
      token,
      user: authenticatedUser,
    });
  });

  // Auth: Get Current User
  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization token" });

    const parts = authHeader.replace("Bearer ", "").split("_");
    const userId = parts[1];
    const user = usersMap.get(userId);

    if (!user) return res.status(401).json({ error: "User session not found" });
    if (user.isBanned) {
      return res.status(403).json({
        error: "Account is banned",
        banReason: user.banReason,
      });
    }

    res.json({ user });
  });

  // Get all users
  app.get("/api/users", (_req, res) => {
    res.json({
      users: Array.from(usersMap.values()),
    });
  });

  // Update user GPS location & movement status
  app.post("/api/users/location", (req, res) => {
    const { userId, lat, lng, altitude, accuracy, heading, speed, movementStatus } = req.body;
    if (!userId || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Invalid location parameters" });
    }

    const user = usersMap.get(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.isBanned) {
      return res.status(403).json({ error: "Cannot broadcast location: user is banned" });
    }

    user.location = {
      lat,
      lng,
      altitude: altitude ?? user.location.altitude,
      accuracy: accuracy ?? user.location.accuracy,
      heading: heading ?? user.location.heading,
      speed: speed ?? user.location.speed,
      lastUpdated: new Date().toISOString(),
    };

    if (movementStatus) {
      user.movementStatus = movementStatus;
    }

    user.isOnline = true;
    usersMap.set(userId, user);

    // Broadcast location update
    broadcastWS({
      type: "user:location_update",
      user,
    });

    res.json({ success: true, user });
  });

  // Super Admin: Ban user
  app.post("/api/admin/ban", (req, res) => {
    const { adminUserId, targetUserId, reason } = req.body;
    const admin = usersMap.get(adminUserId);

    if (!admin || admin.role !== "superadmin") {
      return res.status(403).json({ error: "Only Super Admin can ban users." });
    }

    const targetUser = usersMap.get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: "Target user not found" });

    if (targetUser.role === "superadmin") {
      return res.status(400).json({ error: "Cannot ban another Super Administrator" });
    }

    targetUser.isBanned = true;
    targetUser.banReason = reason || "Violation of Community Safety Guidelines";
    targetUser.bannedAt = new Date().toISOString();
    targetUser.isOnline = false;
    usersMap.set(targetUserId, targetUser);

    addAuditLog(
      "violation",
      "USER_BANNED",
      `Super Admin ${admin.displayName} banned user ${targetUser.displayName} (${targetUser.username}). Reason: ${targetUser.banReason}`,
      admin.id,
      admin.username
    );

    // If target user is connected to WebSocket, disconnect and notify
    const targetWs = clientConnections.get(targetUserId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(
        JSON.stringify({
          type: "account:banned",
          reason: targetUser.banReason,
        })
      );
      targetWs.close();
      clientConnections.delete(targetUserId);
    }

    broadcastWS({
      type: "user:banned",
      user: targetUser,
    });

    res.json({ success: true, message: `User ${targetUser.username} banned successfully`, user: targetUser });
  });

  // Super Admin: Unban user
  app.post("/api/admin/unban", (req, res) => {
    const { adminUserId, targetUserId } = req.body;
    const admin = usersMap.get(adminUserId);

    if (!admin || admin.role !== "superadmin") {
      return res.status(403).json({ error: "Only Super Admin can unban users." });
    }

    const targetUser = usersMap.get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: "Target user not found" });

    targetUser.isBanned = false;
    delete targetUser.banReason;
    delete targetUser.bannedAt;
    usersMap.set(targetUserId, targetUser);

    addAuditLog(
      "info",
      "USER_UNBANNED",
      `Super Admin ${admin.displayName} restored account access for ${targetUser.displayName}.`,
      admin.id,
      admin.username
    );

    broadcastWS({
      type: "user:unbanned",
      user: targetUser,
    });

    res.json({ success: true, message: `User ${targetUser.username} unbanned successfully`, user: targetUser });
  });

  // Get audit logs (Super Admin & Admin)
  app.get("/api/admin/logs", (req, res) => {
    const level = req.query.level as string;
    let filtered = auditLogs;
    if (level && level !== "all") {
      filtered = auditLogs.filter((l) => l.level === level);
    }
    res.json({ logs: filtered });
  });

  // Get chat messages
  app.get("/api/messages", (_req, res) => {
    res.json({ messages: chatMessages });
  });

  // Send message
  app.post("/api/messages", (req, res) => {
    const { senderId, recipientId, content, isSosAlert, attachedLocation } = req.body;
    const sender = usersMap.get(senderId);
    if (!sender) return res.status(404).json({ error: "Sender not found" });
    if (sender.isBanned) return res.status(403).json({ error: "Banned users cannot send messages" });
    if (!content || !content.trim()) return res.status(400).json({ error: "Message content cannot be empty" });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: sender.id,
      senderName: sender.displayName,
      senderRole: sender.role,
      recipientId: recipientId || "all",
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isSosAlert: !!isSosAlert,
      attachedLocation,
    };

    chatMessages.push(newMsg);
    if (chatMessages.length > 200) chatMessages.shift();

    if (isSosAlert) {
      addAuditLog(
        "emergency",
        "SOS_MESSAGE_ALERT",
        `Emergency distress signal broadcast from ${sender.displayName}: "${newMsg.content}"`,
        sender.id,
        sender.username
      );
    }

    broadcastWS({
      type: "chat:new_message",
      message: newMsg,
    });

    res.json({ success: true, message: newMsg });
  });

  // Trigger SOS Distress Alert
  app.post("/api/sos", (req, res) => {
    const { userId, lat, lng, note } = req.body;
    const user = usersMap.get(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.movementStatus = "sos";
    if (typeof lat === "number" && typeof lng === "number") {
      user.location.lat = lat;
      user.location.lng = lng;
    }
    user.location.lastUpdated = new Date().toISOString();
    usersMap.set(userId, user);

    const sosMsg: ChatMessage = {
      id: `sos-${Date.now()}`,
      senderId: user.id,
      senderName: user.displayName,
      senderRole: user.role,
      recipientId: "all",
      content: `🚨 SOS EMERGENCY ALERT: Distress call triggered! ${note || "Immediate assistance requested at coordinates."}`,
      timestamp: new Date().toISOString(),
      isSosAlert: true,
      attachedLocation: { lat: user.location.lat, lng: user.location.lng },
    };
    chatMessages.push(sosMsg);

    addAuditLog(
      "emergency",
      "SOS_TRIGGERED",
      `EMERGENCY ALERT: ${user.displayName} initiated SOS distress beacon at (${user.location.lat.toFixed(5)}, ${user.location.lng.toFixed(5)})`,
      user.id,
      user.username
    );

    broadcastWS({
      type: "sos:alert",
      user,
      message: sosMsg,
    });

    res.json({ success: true, user, message: sosMsg });
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Create HTTP server
  const server = http.createServer(app);

  // Setup WebSocket Server for Real-Time Crowd Tracking, Messaging & Direct Calling Signaling
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    let authenticatedUserId: string | null = null;

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        switch (data.type) {
          case "auth:identify": {
            authenticatedUserId = data.userId;
            if (authenticatedUserId) {
              clientConnections.set(authenticatedUserId, ws);
              const user = usersMap.get(authenticatedUserId);
              if (user) {
                user.isOnline = true;
                usersMap.set(authenticatedUserId, user);
                broadcastWS({ type: "user:status_change", userId: user.id, isOnline: true });
              }
            }
            // Send initial state snapshot
            ws.send(
              JSON.stringify({
                type: "init:snapshot",
                users: Array.from(usersMap.values()),
                messages: chatMessages.slice(-50),
              })
            );
            break;
          }

          case "gps:update": {
            if (!authenticatedUserId) return;
            const user = usersMap.get(authenticatedUserId);
            if (!user || user.isBanned) return;

            user.location = {
              lat: data.lat,
              lng: data.lng,
              altitude: data.altitude ?? user.location.altitude,
              accuracy: data.accuracy ?? user.location.accuracy,
              heading: data.heading ?? user.location.heading,
              speed: data.speed ?? user.location.speed,
              lastUpdated: new Date().toISOString(),
            };
            if (data.movementStatus) {
              user.movementStatus = data.movementStatus;
            }
            user.isOnline = true;
            usersMap.set(authenticatedUserId, user);

            broadcastWS(
              {
                type: "user:location_update",
                user,
              },
              authenticatedUserId
            );
            break;
          }

          // Direct Online Calling Signaling (No phone numbers required!)
          case "call:initiate": {
            const targetWs = clientConnections.get(data.targetUserId);
            const caller = usersMap.get(data.callerId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(
                JSON.stringify({
                  type: "call:incoming",
                  callerId: data.callerId,
                  callerName: caller?.displayName || "Unknown Dispatcher",
                  callerRole: caller?.role || "participant",
                  offer: data.offer,
                })
              );
              addAuditLog("info", "ONLINE_CALL_INITIATED", `Direct voice call requested by ${caller?.displayName} to user ${data.targetUserId}`);
            } else {
              ws.send(
                JSON.stringify({
                  type: "call:unavailable",
                  targetUserId: data.targetUserId,
                  reason: "Target user is currently unreachable or offline.",
                })
              );
            }
            break;
          }

          case "call:accept": {
            const callerWs = clientConnections.get(data.callerId);
            if (callerWs && callerWs.readyState === WebSocket.OPEN) {
              callerWs.send(
                JSON.stringify({
                  type: "call:accepted",
                  answer: data.answer,
                  targetUserId: data.targetUserId,
                })
              );
              addAuditLog("info", "ONLINE_CALL_CONNECTED", `Call connected between ${data.callerId} and ${data.targetUserId}`);
            }
            break;
          }

          case "call:reject": {
            const callerWs = clientConnections.get(data.callerId);
            if (callerWs && callerWs.readyState === WebSocket.OPEN) {
              callerWs.send(
                JSON.stringify({
                  type: "call:rejected",
                  targetUserId: data.targetUserId,
                })
              );
            }
            break;
          }

          case "call:end": {
            const targetWs = clientConnections.get(data.targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(
                JSON.stringify({
                  type: "call:ended",
                  byUserId: data.byUserId,
                })
              );
            }
            break;
          }

          case "call:ice_candidate": {
            const targetWs = clientConnections.get(data.targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(
                JSON.stringify({
                  type: "call:ice_candidate",
                  candidate: data.candidate,
                  fromUserId: authenticatedUserId,
                })
              );
            }
            break;
          }

          // Direct Audio Stream Packets fallback (ensures audio works seamlessly even if STUN/WebRTC p2p is restricted in iframe!)
          case "call:audio_data": {
            const targetWs = clientConnections.get(data.targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(
                JSON.stringify({
                  type: "call:audio_data",
                  audioChunk: data.audioChunk,
                  fromUserId: authenticatedUserId,
                })
              );
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("WS error parsing message:", err);
      }
    });

    ws.on("close", () => {
      if (authenticatedUserId) {
        clientConnections.delete(authenticatedUserId);
        const user = usersMap.get(authenticatedUserId);
        if (user) {
          user.isOnline = false;
          usersMap.set(authenticatedUserId, user);
          broadcastWS({ type: "user:status_change", userId: user.id, isOnline: false });
        }
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Crowd GPS Tracking Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
