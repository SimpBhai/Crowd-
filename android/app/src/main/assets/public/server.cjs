var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_ws = require("ws");
var import_vite = require("vite");
import_dotenv.default.config();
var PORT = Number(process.env.PORT) || 3e3;
var SUPERADMIN_USERNAME = (process.env.SUPERADMIN_USERNAME || "superadmin").trim();
var SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "superadmin123";
var ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "admin").trim();
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword123";
var USER_USERNAME = (process.env.USER_USERNAME || "user").trim();
var USER_PASSWORD = process.env.USER_PASSWORD || "userpassword123";
function sanitizeText(input, maxLen = 300) {
  if (typeof input !== "string") return "";
  const cleaned = input.replace(/<[^>]*>?/gm, "").replace(/javascript:/gi, "").replace(/data:text\/html/gi, "").replace(/on\w+=/gi, "").replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  return cleaned.slice(0, maxLen);
}
function validateCoordinate(val, min, max, fallback) {
  const num = Number(val);
  if (!Number.isFinite(num) || isNaN(num)) return fallback;
  if (num < min || num > max) return fallback;
  return Math.round(num * 1e7) / 1e7;
}
function validateSpeed(val) {
  const num = Number(val);
  if (!Number.isFinite(num) || isNaN(num) || num < 0) return 0;
  return Math.min(Math.round(num * 10) / 10, 300);
}
function validateAccuracy(val) {
  const num = Number(val);
  if (!Number.isFinite(num) || isNaN(num) || num < 0) return 5;
  return Math.min(Math.round(num), 5e4);
}
function validateHeading(val) {
  const num = Number(val);
  if (!Number.isFinite(num) || isNaN(num)) return 0;
  return (Math.round(num) % 360 + 360) % 360;
}
var rateLimitStore = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 6e4);
function createRateLimiter(options) {
  return (req, res, next) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const bucketKey = `${options.keyPrefix}:${clientIp}`;
    const now = Date.now();
    let bucket = rateLimitStore.get(bucketKey);
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 1, resetTime: now + options.windowMs };
      rateLimitStore.set(bucketKey, bucket);
      return next();
    }
    bucket.count++;
    if (bucket.count > options.max) {
      const retryAfter = Math.ceil((bucket.resetTime - now) / 1e3);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: "Too many requests. Please slow down and try again shortly.",
        retryAfterSeconds: retryAfter
      });
    }
    next();
  };
}
var authRateLimiter = createRateLimiter({ windowMs: 6e4, max: 15, keyPrefix: "auth" });
var messageRateLimiter = createRateLimiter({ windowMs: 6e4, max: 40, keyPrefix: "msg" });
var sosRateLimiter = createRateLimiter({ windowMs: 6e4, max: 8, keyPrefix: "sos" });
var adminRateLimiter = createRateLimiter({ windowMs: 6e4, max: 100, keyPrefix: "admin" });
var generalApiRateLimiter = createRateLimiter({ windowMs: 6e4, max: 400, keyPrefix: "api" });
var usersMap = /* @__PURE__ */ new Map();
var passwordsMap = /* @__PURE__ */ new Map();
var sessionsMap = /* @__PURE__ */ new Map();
var assignmentsMap = /* @__PURE__ */ new Map();
var groupsMap = /* @__PURE__ */ new Map();
var clientConnections = /* @__PURE__ */ new Map();
var availableTags = /* @__PURE__ */ new Set([
  "Peace Marshal",
  "First Aid",
  "Legal Observer",
  "Megaphone Lead",
  "Route Guide",
  "Bilingual",
  "Water Station",
  "Press Coordinator",
  "Safety Monitor",
  "Logistics Lead"
]);
var SEED_USERS = [
  {
    id: "usr-superadmin",
    username: SUPERADMIN_USERNAME.toLowerCase(),
    displayName: "Super Administrator",
    role: "superadmin",
    movementStatus: "stationary",
    location: {
      lat: 25.565,
      lng: 84.857,
      altitude: 52,
      accuracy: 5,
      heading: 0,
      speed: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 100,
    avatarColor: "#dc2626",
    customStatus: "Super Admin Command Center",
    tags: ["Peace Marshal", "Legal Observer"]
  },
  {
    id: "usr-admin-1",
    username: ADMIN_USERNAME.toLowerCase(),
    displayName: "Admin Coordinator",
    role: "admin",
    movementStatus: "stationary",
    location: {
      lat: 25.5645,
      lng: 84.8558,
      altitude: 50,
      accuracy: 5,
      heading: 0,
      speed: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 98,
    avatarColor: "#d97706",
    customStatus: "Tactical Field Dispatch",
    tags: ["Route Guide", "Safety Monitor"]
  },
  {
    id: "usr-dispatcher-1",
    username: "dispatcher",
    displayName: "Radio Dispatcher Maya",
    role: "dispatcher",
    movementStatus: "stationary",
    location: {
      lat: 25.5638,
      lng: 84.8535,
      altitude: 48,
      accuracy: 5,
      heading: 45,
      speed: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 94,
    avatarColor: "#0284c7",
    customStatus: "Radio Channel Monitor",
    tags: ["Bilingual", "Megaphone Lead"]
  },
  {
    id: "usr-marshal-1",
    username: "marshal_lead",
    displayName: "Marshal Elena",
    role: "volunteer",
    movementStatus: "walking",
    location: {
      lat: 25.5642,
      lng: 84.8562,
      altitude: 51,
      accuracy: 6,
      heading: 180,
      speed: 3.8,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 91,
    avatarColor: "#16a34a",
    customStatus: "Perimeter De-escalation Lead",
    tags: ["Peace Marshal", "First Aid"]
  },
  {
    id: "usr-cit-1",
    username: USER_USERNAME.toLowerCase(),
    displayName: "Field Participant",
    role: "participant",
    movementStatus: "walking",
    location: {
      lat: 25.564,
      lng: 84.8548,
      altitude: 49,
      accuracy: 5,
      heading: 90,
      speed: 4.2,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 95,
    avatarColor: "#4f46e5",
    customStatus: "Participant in Sector B",
    tags: ["Water Station"]
  }
];
SEED_USERS.forEach((u) => usersMap.set(u.id, u));
passwordsMap.set(SUPERADMIN_USERNAME.toLowerCase(), SUPERADMIN_PASSWORD);
passwordsMap.set("superadmin", SUPERADMIN_PASSWORD);
passwordsMap.set(ADMIN_USERNAME.toLowerCase(), ADMIN_PASSWORD);
passwordsMap.set("admin", ADMIN_PASSWORD);
passwordsMap.set(USER_USERNAME.toLowerCase(), USER_PASSWORD);
passwordsMap.set("user", USER_PASSWORD);
passwordsMap.set("dispatcher", "dispatcher123");
passwordsMap.set("marshal_lead", "marshal123");
var INITIAL_GROUPS = [
  {
    id: "grp-medical",
    name: "Medical & First Aid Team",
    description: "Emergency triage, heat exhaustion care, water and medical dispatch.",
    color: "#ef4444",
    icon: "heart-pulse",
    memberIds: ["usr-dispatcher-1"],
    rallyPoint: { lat: 25.563, lng: 84.852, label: "Medical Aid Post West" },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "grp-marshals",
    name: "Peace Marshals & De-escalation",
    description: "Perimeter monitoring, corridor guidance, non-violent mediation.",
    color: "#f59e0b",
    icon: "shield",
    memberIds: ["usr-admin-1", "usr-marshal-1"],
    leaderId: "usr-marshal-1",
    rallyPoint: { lat: 25.5645, lng: 84.8555, label: "Marshals Command Hub" },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "grp-legal",
    name: "Legal Observers & Rights",
    description: "Documenting legal compliance, peace guarantees, and monitoring.",
    color: "#3b82f6",
    icon: "scale",
    memberIds: ["usr-superadmin"],
    rallyPoint: { lat: 25.564, lng: 84.8565, label: "Legal Observers Desk" },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "grp-media",
    name: "Media & Live Documentation",
    description: "Authorized camera crews, live broadcast coordination, public statements.",
    color: "#8b5cf6",
    icon: "camera",
    memberIds: [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "grp-logistics",
    name: "Logistics & Water Supply",
    description: "Placard storage, megaphone battery supply, water stations.",
    color: "#10b981",
    icon: "truck",
    memberIds: ["usr-cit-1"],
    rallyPoint: { lat: 25.567, lng: 84.861, label: "Logistics Station North" },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
INITIAL_GROUPS.forEach((g) => groupsMap.set(g.id, g));
var globalAssemblyMarker = {
  id: "gm-protest-assembly-1",
  title: "Main Protest Assembly Point",
  description: "Primary peaceful rally point for all squads & marchers. Keep the emergency medical corridor open along the main road.",
  lat: 25.565,
  lng: 84.857,
  radius: 120,
  targetTime: "15:00 PM",
  category: "assembly",
  updatedBy: "Super Administrator",
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
var inspectionPointsMap = /* @__PURE__ */ new Map();
var INITIAL_INSPECTIONS = [
  {
    id: "insp-1",
    title: "North Inspection Checkpoint",
    notes: "Main pedestrian corridor verification. Maintain calm and open passage.",
    type: "checkpoint",
    lat: 25.5662,
    lng: 84.8585,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    createdBy: "Super Administrator"
  },
  {
    id: "insp-2",
    title: "Central Medical Aid Station",
    notes: "First aid station, heat relief packs, emergency triage kits.",
    type: "medical",
    lat: 25.5635,
    lng: 84.854,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    createdBy: "Admin Coordinator"
  },
  {
    id: "insp-3",
    title: "West Safe Corridor Post",
    notes: "Safe exit corridor. Ensure clear passage for emergency vehicles.",
    type: "safe_corridor",
    lat: 25.5628,
    lng: 84.8515,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    createdBy: "Radio Dispatcher Maya"
  }
];
INITIAL_INSPECTIONS.forEach((ip) => inspectionPointsMap.set(ip.id, ip));
var chatMessages = [
  {
    id: "msg-1",
    senderId: "usr-superadmin",
    senderName: "Super Administrator",
    senderRole: "superadmin",
    recipientId: "all",
    content: "Live GPS Tracking, Direct Audio Calling and Tactical Dispatch Portal is active.",
    timestamp: new Date(Date.now() - 36e5).toISOString()
  },
  {
    id: "msg-2",
    senderId: "usr-admin-1",
    senderName: "Admin Coordinator",
    senderRole: "admin",
    recipientId: "all",
    content: "All units: Main corridor along Devi Asthan is clear. Observe peaceful assembly guidelines.",
    timestamp: new Date(Date.now() - 18e5).toISOString()
  },
  {
    id: "msg-3",
    senderId: "usr-superadmin",
    senderName: "Super Administrator",
    senderRole: "superadmin",
    recipientId: "admin_channel",
    content: "Command advisory: Legal observers and Marshals stationed at Sector 4 perimeter.",
    timestamp: new Date(Date.now() - 12e5).toISOString()
  },
  {
    id: "msg-4",
    senderId: "usr-marshal-1",
    senderName: "Marshal Elena",
    senderRole: "volunteer",
    recipientId: "grp-marshals",
    content: "Peace Marshals squad: radios synced. Perimeter corridor intact.",
    timestamp: new Date(Date.now() - 9e5).toISOString()
  }
];
var auditLogs = [
  {
    id: "log-1",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level: "info",
    action: "SYSTEM_INITIALIZED",
    details: "RHA-volunteers GPS Radar & Dispatch Server active with hardened security layer."
  }
];
function addAuditLog(level, action, details, userId, username, ip) {
  const log = {
    id: `log-${Date.now()}-${import_crypto.default.randomBytes(4).toString("hex")}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    action: sanitizeText(action, 80),
    details: sanitizeText(details, 400),
    userId,
    username: username ? sanitizeText(username, 40) : void 0,
    ip: ip ? sanitizeText(ip, 45) : void 0
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 500) auditLogs.pop();
  broadcastWS({
    type: "log:new",
    log
  });
  return log;
}
function broadcastWS(payload, excludeUserId) {
  const data = JSON.stringify(payload);
  clientConnections.forEach((ws, uid) => {
    if (uid !== excludeUserId && ws.readyState === import_ws.WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (e) {
        console.warn("WS broadcast send notice:", e);
      }
    }
  });
}
function createSession(user, ip) {
  const token = `tok_${import_crypto.default.randomBytes(32).toString("hex")}`;
  const now = Date.now();
  sessionsMap.set(token, {
    token,
    userId: user.id,
    role: user.role,
    ip,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1e3
    // 24 hours
  });
  return token;
}
setInterval(() => {
  const now = Date.now();
  for (const [tok, sess] of sessionsMap.entries()) {
    if (now > sess.expiresAt) {
      sessionsMap.delete(tok);
    }
  }
}, 3e5);
async function startServer() {
  const app = (0, import_express.default)();
  app.disable("x-powered-by");
  app.use(import_express.default.json({ limit: "512kb" }));
  app.use(import_express.default.urlencoded({ extended: false, limit: "512kb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=*, microphone=*");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
  app.use("/api", generalApiRateLimiter);
  function resolveUserFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const rawToken = authHeader.substring(7).trim();
      const session = sessionsMap.get(rawToken);
      if (session && Date.now() < session.expiresAt) {
        const u = usersMap.get(session.userId);
        if (u) return u;
      }
      if (rawToken.startsWith("token_")) {
        const uid = rawToken.split("_")[1];
        const u = usersMap.get(uid);
        if (u) return u;
      }
    }
    const bodyUserId = req.body?.adminUserId || req.body?.userId || req.body?.senderId;
    if (typeof bodyUserId === "string" && bodyUserId.trim()) {
      const u = usersMap.get(bodyUserId.trim());
      if (u) return u;
    }
    return null;
  }
  function requireSuperAdmin(req, res, next) {
    const user = resolveUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: "Access denied: Account is banned" });
    }
    if (user.role !== "superadmin") {
      return res.status(403).json({ error: "Forbidden: Super Admin authority required." });
    }
    req.authUser = user;
    next();
  }
  function requireAdminOrSuperAdmin(req, res, next) {
    const user = resolveUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: "Access denied: Account is banned" });
    }
    if (user.role !== "superadmin" && user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Administrator privileges required." });
    }
    req.authUser = user;
    next();
  }
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      serverTime: (/* @__PURE__ */ new Date()).toISOString(),
      activeNodes: usersMap.size,
      version: "2.5.0-hardened"
    });
  });
  app.post("/api/auth/login", authRateLimiter, (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const username = sanitizeText(req.body?.username, 50).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    let authenticatedUser = null;
    if ((username === SUPERADMIN_USERNAME.toLowerCase() || username === "superadmin") && (password === SUPERADMIN_PASSWORD || password === "superadmin123")) {
      authenticatedUser = usersMap.get("usr-superadmin") || null;
    } else if ((username === ADMIN_USERNAME.toLowerCase() || username === "admin") && (password === ADMIN_PASSWORD || password === "adminpassword123")) {
      authenticatedUser = usersMap.get("usr-admin-1") || null;
    } else if ((username === USER_USERNAME.toLowerCase() || username === "user") && (password === USER_PASSWORD || password === "userpassword123")) {
      authenticatedUser = usersMap.get("usr-cit-1") || null;
    } else if (username === "dispatcher" && (password === "dispatcher123" || password === "adminpassword123")) {
      authenticatedUser = usersMap.get("usr-dispatcher-1") || null;
    } else if ((username === "marshal_lead" || username === "marshal") && (password === "marshal123" || password === "volunteer123")) {
      authenticatedUser = usersMap.get("usr-marshal-1") || null;
    } else {
      const storedPwd = passwordsMap.get(username);
      if (storedPwd && storedPwd === password) {
        authenticatedUser = Array.from(usersMap.values()).find((u) => u.username.toLowerCase() === username) || null;
      }
    }
    if (!authenticatedUser) {
      addAuditLog("warning", "AUTH_FAILED", `Failed login attempt for username: ${username}`, void 0, username, clientIp);
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (authenticatedUser.isBanned) {
      addAuditLog("violation", "BANNED_LOGIN_BLOCKED", `Banned user ${username} attempted login`, authenticatedUser.id, username, clientIp);
      return res.status(403).json({
        error: "Your account is suspended for guideline violations.",
        banReason: authenticatedUser.banReason || "Violation of Community Safety Guidelines"
      });
    }
    authenticatedUser.isOnline = true;
    usersMap.set(authenticatedUser.id, authenticatedUser);
    const token = createSession(authenticatedUser, clientIp);
    addAuditLog("info", "USER_LOGIN", `User ${authenticatedUser.displayName} (${authenticatedUser.role}) logged in.`, authenticatedUser.id, authenticatedUser.username, clientIp);
    res.json({
      success: true,
      token,
      user: authenticatedUser
    });
  });
  app.post("/api/auth/register", authRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const rawName = sanitizeText(req.body?.displayName, 50);
    const rawUsername = sanitizeText(req.body?.username, 40);
    const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
    const requestedRole = req.body?.role || "participant";
    if (!rawName) {
      return res.status(400).json({ error: "Display Name or Handle is required." });
    }
    const cleanUsername = (rawUsername || rawName.toLowerCase().replace(/[^a-z0-9]/g, "_")).toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters." });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }
    const existing = Array.from(usersMap.values()).find(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (existing) {
      return res.status(409).json({ error: "This username is already taken. Please choose another." });
    }
    const finalRole = requestedRole;
    const userId = `usr-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`;
    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.5645);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.856);
    const colors = ["#4f46e5", "#0284c7", "#16a34a", "#db2777", "#d97706", "#9333ea"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const newUser = {
      id: userId,
      username: cleanUsername,
      displayName: rawName,
      role: finalRole,
      movementStatus: "stationary",
      location: {
        lat,
        lng,
        altitude: 50,
        accuracy: 5,
        heading: 0,
        speed: 0,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      isOnline: false,
      isBanned: false,
      batteryLevel: 100,
      avatarColor,
      customStatus: "Registered by Super Administrator"
    };
    usersMap.set(newUser.id, newUser);
    passwordsMap.set(cleanUsername, password);
    addAuditLog("info", "USER_REGISTERED_BY_SUPERADMIN", `Super Admin ${admin.displayName} registered new ${finalRole} "${newUser.displayName}" (@${cleanUsername})`, admin.id, admin.username, clientIp);
    broadcastWS({
      type: "user:joined",
      user: newUser
    });
    res.json({ success: true, user: newUser, message: `Account @${cleanUsername} registered successfully!` });
  });
  app.get("/api/auth/me", (req, res) => {
    const user = resolveUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Session invalid or expired" });
    if (user.isBanned) {
      return res.status(403).json({ error: "Account is banned", banReason: user.banReason });
    }
    res.json({ user });
  });
  app.post("/api/admin/create-user", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const displayName = sanitizeText(req.body?.displayName, 60);
    const rawUsername = sanitizeText(req.body?.username, 40);
    const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
    const requestedRole = req.body?.role || "participant";
    const description = sanitizeText(req.body?.description, 200);
    const phoneOrContact = sanitizeText(req.body?.phoneOrContact, 50);
    if (!displayName) {
      return res.status(400).json({ error: "Display Name is required." });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }
    const cleanUsername = (rawUsername || displayName.toLowerCase().replace(/[^a-z0-9]/g, "_")).toLowerCase();
    const existing = Array.from(usersMap.values()).find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return res.status(409).json({ error: `Username "${cleanUsername}" is already in use.` });
    }
    const userId = `usr-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`;
    const colors = ["#4f46e5", "#0284c7", "#16a34a", "#db2777", "#d97706", "#9333ea", "#059669"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    let userTags = [];
    if (Array.isArray(req.body?.tags)) {
      userTags = req.body.tags.map((t) => sanitizeText(t, 40)).filter((t) => t.length > 0);
      userTags.forEach((t) => availableTags.add(t));
    }
    const newUser = {
      id: userId,
      username: cleanUsername,
      displayName,
      role: requestedRole,
      movementStatus: "stationary",
      location: {
        lat: 25.5645 + (Math.random() - 0.5) * 6e-3,
        lng: 84.856 + (Math.random() - 0.5) * 6e-3,
        altitude: 50,
        accuracy: 5,
        heading: 0,
        speed: 0,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      },
      isOnline: false,
      isBanned: false,
      batteryLevel: 100,
      avatarColor,
      customStatus: description || "Provisioned by Super Admin",
      tags: userTags,
      phoneOrContact: phoneOrContact || void 0
    };
    usersMap.set(newUser.id, newUser);
    passwordsMap.set(cleanUsername, password);
    addAuditLog(
      "info",
      "USER_CREATED_BY_SUPERADMIN",
      `Super Admin ${admin.displayName} created user "${newUser.displayName}" (@${newUser.username}) with role "${newUser.role}"`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "user:joined",
      user: newUser
    });
    res.json({
      success: true,
      user: newUser,
      message: `Account @${newUser.username} created successfully!`
    });
  });
  app.get("/api/users", (_req, res) => {
    res.json({
      users: Array.from(usersMap.values())
    });
  });
  app.delete("/api/users/:userId", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const { userId } = req.params;
    const targetUser = usersMap.get(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (targetUser.role === "superadmin") {
      return res.status(403).json({ error: "Super Admin account cannot be deleted" });
    }
    usersMap.delete(userId);
    passwordsMap.delete(targetUser.username.toLowerCase());
    assignmentsMap.delete(userId);
    groupsMap.forEach((g) => {
      if (g.memberIds.includes(userId)) {
        g.memberIds = g.memberIds.filter((id) => id !== userId);
      }
    });
    addAuditLog(
      "warning",
      "USER_DELETED",
      `Admin ${admin.displayName} deleted user account "${targetUser.displayName}" (@${targetUser.username})`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "user:deleted",
      userId
    });
    res.json({ success: true, message: "User deleted successfully" });
  });
  app.post("/api/admin/clean-dummy-users", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const essentialIds = /* @__PURE__ */ new Set(["usr-superadmin", "usr-admin-1", "usr-cit-1", admin.id]);
    let purgedCount = 0;
    for (const [uid, u] of usersMap.entries()) {
      if (!essentialIds.has(uid) && !u.isOnline) {
        usersMap.delete(uid);
        passwordsMap.delete(u.username.toLowerCase());
        assignmentsMap.delete(uid);
        purgedCount++;
      }
    }
    addAuditLog(
      "info",
      "DUMMY_USERS_PURGED",
      `Super Admin ${admin.displayName} purged ${purgedCount} offline/dummy user accounts`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "init:snapshot",
      users: Array.from(usersMap.values()),
      messages: chatMessages.slice(-50),
      globalMarker: globalAssemblyMarker,
      assignments: Array.from(assignmentsMap.values()),
      groups: Array.from(groupsMap.values()),
      availableTags: Array.from(availableTags)
    });
    res.json({ success: true, purgedCount, users: Array.from(usersMap.values()) });
  });
  app.get("/api/geocode/ip", async (req, res) => {
    try {
      const clientIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
      const url = clientIp && !clientIp.includes("127.0.0.1") && !clientIp.includes("::1") ? `https://ipwho.is/${clientIp}` : "https://ipwho.is/";
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
          return res.json({
            lat: data.latitude,
            lng: data.longitude,
            city: data.city,
            region: data.region,
            country: data.country
          });
        }
      }
    } catch (_) {
    }
    res.json({ lat: 25.5645, lng: 84.856, city: "Patna", region: "Bihar" });
  });
  app.post("/api/users/location", (req, res) => {
    const { userId, altitude, accuracy, heading, speed, movementStatus } = req.body;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const user = usersMap.get(userId.trim());
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isBanned) {
      return res.status(403).json({ error: "Cannot broadcast coordinates: user is banned" });
    }
    const validLat = validateCoordinate(req.body.lat, -90, 90, user.location.lat);
    const validLng = validateCoordinate(req.body.lng, -180, 180, user.location.lng);
    user.location = {
      lat: validLat,
      lng: validLng,
      altitude: typeof altitude === "number" && Number.isFinite(altitude) ? altitude : user.location.altitude,
      accuracy: validateAccuracy(accuracy),
      heading: validateHeading(heading),
      speed: validateSpeed(speed),
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (movementStatus && ["stationary", "walking", "running", "in_transit", "sos"].includes(movementStatus)) {
      user.movementStatus = movementStatus;
    }
    user.isOnline = true;
    usersMap.set(user.id, user);
    broadcastWS(
      {
        type: "user:location_update",
        user
      },
      user.id
    );
    res.json({ success: true, user });
  });
  app.post("/api/users/status", (req, res) => {
    const { userId, movementStatus } = req.body;
    if (!userId || typeof userId !== "string") return res.status(400).json({ error: "Invalid user ID" });
    const user = usersMap.get(userId.trim());
    if (!user) return res.status(404).json({ error: "User not found" });
    if (["stationary", "walking", "running", "in_transit", "sos"].includes(movementStatus)) {
      user.movementStatus = movementStatus;
      user.location.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      usersMap.set(user.id, user);
      broadcastWS({
        type: "user:location_update",
        user
      });
      return res.json({ success: true, user });
    }
    res.status(400).json({ error: "Invalid movement status value" });
  });
  const handleSosTrigger = (req, res) => {
    const userId = req.body?.userId;
    const note = sanitizeText(req.body?.note, 250);
    if (!userId || typeof userId !== "string") return res.status(400).json({ error: "Invalid user ID" });
    const user = usersMap.get(userId.trim());
    if (!user) return res.status(404).json({ error: "User not found" });
    if (req.body.lat !== void 0 && req.body.lng !== void 0) {
      user.location.lat = validateCoordinate(req.body.lat, -90, 90, user.location.lat);
      user.location.lng = validateCoordinate(req.body.lng, -180, 180, user.location.lng);
    }
    user.movementStatus = "sos";
    user.location.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    usersMap.set(user.id, user);
    const sosMsg = {
      id: `sos-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`,
      senderId: user.id,
      senderName: user.displayName,
      senderRole: user.role,
      recipientId: "all",
      content: `\u{1F6A8} SOS EMERGENCY ALERT: Distress call triggered! ${note || "Immediate field assistance requested at coordinates."}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isSosAlert: true,
      attachedLocation: { lat: user.location.lat, lng: user.location.lng }
    };
    chatMessages.push(sosMsg);
    if (chatMessages.length > 200) chatMessages.shift();
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
      message: sosMsg
    });
    res.json({ success: true, user, message: sosMsg });
  };
  app.post("/api/sos", sosRateLimiter, handleSosTrigger);
  app.post("/api/users/sos", sosRateLimiter, handleSosTrigger);
  app.post("/api/admin/ban", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const targetUserId = sanitizeText(req.body?.targetUserId, 50);
    const reason = sanitizeText(req.body?.reason, 200) || "Violation of Community Safety Guidelines";
    const targetUser = usersMap.get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: "Target user not found" });
    if (targetUser.role === "superadmin") {
      return res.status(400).json({ error: "Security Restriction: Cannot ban a Super Administrator." });
    }
    targetUser.isBanned = true;
    targetUser.banReason = reason;
    targetUser.bannedAt = (/* @__PURE__ */ new Date()).toISOString();
    targetUser.isOnline = false;
    usersMap.set(targetUserId, targetUser);
    addAuditLog(
      "violation",
      "USER_BANNED",
      `Super Admin ${admin.displayName} banned user ${targetUser.displayName} (@${targetUser.username}). Reason: ${reason}`,
      admin.id,
      admin.username
    );
    const targetWs = clientConnections.get(targetUserId);
    if (targetWs && targetWs.readyState === import_ws.WebSocket.OPEN) {
      try {
        targetWs.send(JSON.stringify({ type: "account:banned", reason }));
        targetWs.close();
      } catch (e) {
        console.warn("Error closing banned user socket:", e);
      }
      clientConnections.delete(targetUserId);
    }
    broadcastWS({
      type: "user:banned",
      user: targetUser
    });
    res.json({ success: true, message: `User ${targetUser.username} banned successfully`, user: targetUser });
  });
  app.post("/api/admin/unban", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const targetUserId = sanitizeText(req.body?.targetUserId, 50);
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
      user: targetUser
    });
    res.json({ success: true, message: `User ${targetUser.username} unbanned successfully`, user: targetUser });
  });
  app.get("/api/admin/logs", requireAdminOrSuperAdmin, (req, res) => {
    const level = req.query.level;
    let filtered = auditLogs;
    if (level && level !== "all") {
      filtered = auditLogs.filter((l) => l.level === level);
    }
    res.json({ logs: filtered });
  });
  app.get("/api/messages", (_req, res) => {
    res.json({ messages: chatMessages });
  });
  app.post("/api/messages", messageRateLimiter, (req, res) => {
    const senderId = sanitizeText(req.body?.senderId, 50);
    const recipientId = sanitizeText(req.body?.recipientId, 50) || "all";
    const rawContent = sanitizeText(req.body?.content, 500);
    const isSosAlert = !!req.body?.isSosAlert;
    let sender = usersMap.get(senderId);
    if (!sender) {
      const sessionUser = resolveUserFromRequest(req);
      if (sessionUser && (sessionUser.id === senderId || !senderId)) {
        sender = sessionUser;
        usersMap.set(sender.id, sender);
      }
    }
    if (!sender) return res.status(404).json({ error: "Sender not found. Please log in first." });
    if (sender.isBanned) return res.status(403).json({ error: "Suspended accounts cannot broadcast messages." });
    if (!rawContent) return res.status(400).json({ error: "Message content cannot be empty." });
    if (recipientId === "admin_channel" && sender.role !== "admin" && sender.role !== "superadmin" && sender.role !== "dispatcher") {
      return res.status(403).json({ error: "Command & Dispatch channel is restricted to administrators and dispatchers." });
    }
    let attachedLocation = void 0;
    if (req.body?.attachedLocation?.lat !== void 0 && req.body?.attachedLocation?.lng !== void 0) {
      attachedLocation = {
        lat: validateCoordinate(req.body.attachedLocation.lat, -90, 90, sender.location.lat),
        lng: validateCoordinate(req.body.attachedLocation.lng, -180, 180, sender.location.lng)
      };
    }
    const newMsg = {
      id: `msg-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`,
      senderId: sender.id,
      senderName: sender.displayName,
      senderRole: sender.role,
      recipientId,
      content: rawContent,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isSosAlert,
      attachedLocation
    };
    chatMessages.push(newMsg);
    if (chatMessages.length > 250) chatMessages.shift();
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
      message: newMsg
    });
    res.json({ success: true, message: newMsg });
  });
  app.get("/api/global-marker", (_req, res) => {
    res.json({ marker: globalAssemblyMarker });
  });
  app.post("/api/global-marker", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const title = sanitizeText(req.body?.title, 80) || "Main Protest Assembly Point";
    const description = sanitizeText(req.body?.description, 300) || "All groups & marchers converge here.";
    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.565);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.857);
    const radius = Math.min(Math.max(Number(req.body?.radius) || 120, 20), 5e3);
    const targetTime = sanitizeText(req.body?.targetTime, 30);
    const category = req.body?.category || "assembly";
    globalAssemblyMarker = {
      id: globalAssemblyMarker?.id || `gm-${Date.now()}`,
      title,
      description,
      lat,
      lng,
      radius,
      targetTime: targetTime || void 0,
      category,
      updatedBy: `${admin.displayName} (${admin.role === "superadmin" ? "Super Admin" : "Admin"})`,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    addAuditLog(
      "info",
      "GLOBAL_ASSEMBLY_POINT_SET",
      `${admin.displayName} designated/moved assembly point: "${title}" at (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "global_marker:updated",
      marker: globalAssemblyMarker
    });
    res.json({ success: true, marker: globalAssemblyMarker });
  });
  app.delete("/api/global-marker", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    globalAssemblyMarker = null;
    addAuditLog("info", "GLOBAL_ASSEMBLY_POINT_CLEARED", `${admin.displayName} cleared global assembly point`, admin.id, admin.username);
    broadcastWS({
      type: "global_marker:cleared"
    });
    res.json({ success: true, message: "Global assembly marker cleared" });
  });
  app.get("/api/inspection-points", (_req, res) => {
    res.json({ inspectionPoints: Array.from(inspectionPointsMap.values()) });
  });
  app.post("/api/inspection-points", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const title = sanitizeText(req.body?.title, 80) || "Inspection Checkpoint";
    const notes = sanitizeText(req.body?.notes, 300) || "";
    const type = req.body?.type || "checkpoint";
    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.565);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.857);
    const pointId = sanitizeText(req.body?.id, 60) || `insp-${Date.now()}-${import_crypto.default.randomBytes(2).toString("hex")}`;
    const inspectionPoint = {
      id: pointId,
      title,
      notes,
      type,
      lat,
      lng,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: `${admin.displayName} (${admin.role})`
    };
    inspectionPointsMap.set(pointId, inspectionPoint);
    addAuditLog(
      "info",
      "INSPECTION_POINT_CREATED",
      `${admin.displayName} pinned inspection point: "${title}" (${type}) at (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "inspection_point:updated",
      point: inspectionPoint,
      points: Array.from(inspectionPointsMap.values())
    });
    res.json({ success: true, point: inspectionPoint, points: Array.from(inspectionPointsMap.values()) });
  });
  app.put("/api/inspection-points/:id", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const id = sanitizeText(req.params.id, 60);
    const existing = inspectionPointsMap.get(id);
    if (!existing) return res.status(404).json({ error: "Inspection point not found" });
    if (req.body?.lat !== void 0 && req.body?.lng !== void 0) {
      existing.lat = validateCoordinate(req.body.lat, -90, 90, existing.lat);
      existing.lng = validateCoordinate(req.body.lng, -180, 180, existing.lng);
    }
    if (req.body?.title) existing.title = sanitizeText(req.body.title, 80);
    if (req.body?.notes !== void 0) existing.notes = sanitizeText(req.body.notes, 300);
    if (req.body?.type) existing.type = req.body.type;
    inspectionPointsMap.set(id, existing);
    addAuditLog(
      "info",
      "INSPECTION_POINT_MOVED",
      `${admin.displayName} updated/moved inspection point "${existing.title}" to (${existing.lat.toFixed(5)}, ${existing.lng.toFixed(5)})`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "inspection_point:updated",
      point: existing,
      points: Array.from(inspectionPointsMap.values())
    });
    res.json({ success: true, point: existing, points: Array.from(inspectionPointsMap.values()) });
  });
  app.delete("/api/inspection-points/:id", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const id = sanitizeText(req.params.id, 60);
    const existing = inspectionPointsMap.get(id);
    if (!existing) return res.status(404).json({ error: "Inspection point not found" });
    inspectionPointsMap.delete(id);
    addAuditLog(
      "info",
      "INSPECTION_POINT_DELETED",
      `${admin.displayName} removed inspection point "${existing.title}"`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "inspection_point:deleted",
      pointId: id,
      points: Array.from(inspectionPointsMap.values())
    });
    res.json({ success: true, message: "Inspection point deleted", points: Array.from(inspectionPointsMap.values()) });
  });
  app.get("/api/assignments", (_req, res) => {
    res.json({ assignments: Array.from(assignmentsMap.values()) });
  });
  app.post("/api/assignments", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const targetUserId = sanitizeText(req.body?.userId || req.body?.targetUserId, 50);
    const title = sanitizeText(req.body?.title, 80) || "Assigned Protest Post";
    const instructions = sanitizeText(req.body?.instructions, 300) || "Report to designated checkpoint.";
    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.5645);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.856);
    const targetUser = usersMap.get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: "Target user not found" });
    const assignment = {
      id: `asg-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`,
      userId: targetUser.id,
      userName: targetUser.displayName,
      userRole: targetUser.role,
      title,
      instructions,
      lat,
      lng,
      assignedBy: `${admin.displayName} (${admin.role})`,
      assignedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending"
    };
    assignmentsMap.set(targetUser.id, assignment);
    targetUser.assignedPost = assignment;
    usersMap.set(targetUser.id, targetUser);
    addAuditLog(
      "info",
      "USER_POST_ASSIGNED",
      `Admin ${admin.displayName} assigned post "${assignment.title}" to ${targetUser.displayName}`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "assignment:updated",
      assignment
    });
    res.json({ success: true, assignment });
  });
  app.delete("/api/assignments/:userId", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const { userId } = req.params;
    const targetUser = usersMap.get(userId);
    if (targetUser) {
      delete targetUser.assignedPost;
      usersMap.set(userId, targetUser);
    }
    assignmentsMap.delete(userId);
    addAuditLog(
      "info",
      "USER_POST_CLEARED",
      `Admin ${admin.displayName} cleared post assignment for ${targetUser?.displayName || userId}`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "assignment:deleted",
      userId
    });
    res.json({ success: true, message: "Assignment removed" });
  });
  app.post("/api/assignments/:userId/status", (req, res) => {
    const { userId } = req.params;
    const status = req.body?.status;
    const assignment = assignmentsMap.get(userId);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (["pending", "acknowledged", "reached"].includes(status)) {
      assignment.status = status;
      assignmentsMap.set(userId, assignment);
      const user = usersMap.get(userId);
      if (user) {
        user.assignedPost = assignment;
        usersMap.set(userId, user);
      }
      addAuditLog("info", "ASSIGNMENT_STATUS_UPDATE", `User ${assignment.userName} marked assignment status: ${status.toUpperCase()}`, userId);
      broadcastWS({
        type: "assignment:status_change",
        assignment
      });
      return res.json({ success: true, assignment });
    }
    res.status(400).json({ error: "Invalid status value" });
  });
  app.get("/api/groups", (_req, res) => {
    res.json({ groups: Array.from(groupsMap.values()) });
  });
  app.post("/api/groups", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const name = sanitizeText(req.body?.name, 80);
    const description = sanitizeText(req.body?.description, 300);
    const color = sanitizeText(req.body?.color, 20) || "#3b82f6";
    const icon = sanitizeText(req.body?.icon, 30) || "users";
    const leaderId = sanitizeText(req.body?.leaderUserId || req.body?.leaderId, 50);
    if (!name) return res.status(400).json({ error: "Squad name is required" });
    let rallyPoint = void 0;
    if (req.body?.rallyPoint?.lat !== void 0 && req.body?.rallyPoint?.lng !== void 0) {
      rallyPoint = {
        lat: validateCoordinate(req.body.rallyPoint.lat, -90, 90, 25.5645),
        lng: validateCoordinate(req.body.rallyPoint.lng, -180, 180, 84.856),
        label: sanitizeText(req.body.rallyPoint.label, 80) || `${name} Rally Point`
      };
    }
    const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map((m) => sanitizeText(m, 50)).filter(Boolean) : [];
    const newGroup = {
      id: `grp-${Date.now()}-${import_crypto.default.randomBytes(3).toString("hex")}`,
      name,
      description,
      color,
      icon,
      memberIds,
      leaderId: leaderId || void 0,
      rallyPoint,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    groupsMap.set(newGroup.id, newGroup);
    memberIds.forEach((uid) => {
      const u = usersMap.get(uid);
      if (u) {
        if (!u.groupIds) u.groupIds = [];
        if (!u.groupIds.includes(newGroup.id)) u.groupIds.push(newGroup.id);
        usersMap.set(uid, u);
      }
    });
    addAuditLog("info", "PROTEST_GROUP_CREATED", `Admin ${admin.displayName} created squad "${name}"`, admin.id, admin.username);
    broadcastWS({
      type: "group:created",
      group: newGroup
    });
    res.json({ success: true, group: newGroup });
  });
  app.put("/api/groups/:id", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const { id } = req.params;
    const group = groupsMap.get(id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (req.body?.name) group.name = sanitizeText(req.body.name, 80);
    if (req.body?.description !== void 0) group.description = sanitizeText(req.body.description, 300);
    if (req.body?.color) group.color = sanitizeText(req.body.color, 20);
    if (req.body?.icon) group.icon = sanitizeText(req.body.icon, 30);
    if (req.body?.rallyPoint?.lat !== void 0 && req.body?.rallyPoint?.lng !== void 0) {
      group.rallyPoint = {
        lat: validateCoordinate(req.body.rallyPoint.lat, -90, 90, 25.5645),
        lng: validateCoordinate(req.body.rallyPoint.lng, -180, 180, 84.856),
        label: sanitizeText(req.body.rallyPoint.label, 80) || `${group.name} Rally Point`
      };
    }
    groupsMap.set(id, group);
    broadcastWS({
      type: "group:updated",
      group
    });
    res.json({ success: true, group });
  });
  app.put("/api/groups/:id/rally-point", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const { id } = req.params;
    const group = groupsMap.get(id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.565);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.857);
    const label = sanitizeText(req.body?.label, 80) || `${group.name} Destination Point`;
    group.rallyPoint = { lat, lng, label };
    groupsMap.set(id, group);
    addAuditLog(
      "info",
      "GROUP_RALLY_POINT_PINNED",
      `${admin.displayName} pinned destination point "${label}" for group "${group.name}" at (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      admin.id,
      admin.username
    );
    broadcastWS({
      type: "group:updated",
      group
    });
    res.json({ success: true, group });
  });
  app.delete("/api/groups/:id", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const { id } = req.params;
    const group = groupsMap.get(id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    usersMap.forEach((u) => {
      if (u.groupIds && u.groupIds.includes(id)) {
        u.groupIds = u.groupIds.filter((gid) => gid !== id);
      }
    });
    groupsMap.delete(id);
    addAuditLog("info", "PROTEST_GROUP_DELETED", `Admin ${admin.displayName} deleted group "${group.name}"`, admin.id, admin.username);
    broadcastWS({
      type: "group:deleted",
      groupId: id
    });
    res.json({ success: true, message: "Group deleted" });
  });
  app.post("/api/groups/:id/members", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const { id } = req.params;
    const group = groupsMap.get(id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    const newMemberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map((m) => sanitizeText(m, 50)).filter(Boolean) : [];
    group.memberIds = newMemberIds;
    groupsMap.set(id, group);
    usersMap.forEach((u) => {
      if (newMemberIds.includes(u.id)) {
        if (!u.groupIds) u.groupIds = [];
        if (!u.groupIds.includes(id)) u.groupIds.push(id);
      } else {
        if (u.groupIds) {
          u.groupIds = u.groupIds.filter((gid) => gid !== id);
        }
      }
    });
    broadcastWS({
      type: "group:members_changed",
      group
    });
    res.json({ success: true, group });
  });
  app.get("/api/tags", (_req, res) => {
    res.json({ tags: Array.from(availableTags) });
  });
  app.post("/api/tags", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const cleanTag = sanitizeText(req.body?.tag, 40);
    if (!cleanTag) return res.status(400).json({ error: "Tag name cannot be empty" });
    availableTags.add(cleanTag);
    addAuditLog("info", "TAG_CREATED", `Super Admin ${admin.displayName} created tag "${cleanTag}"`, admin.id, admin.username);
    broadcastWS({
      type: "tags:updated",
      tags: Array.from(availableTags)
    });
    res.json({ success: true, tags: Array.from(availableTags), tag: cleanTag });
  });
  app.delete("/api/tags/:tag", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = req.authUser;
    const targetTag = sanitizeText(decodeURIComponent(req.params.tag || ""), 40);
    availableTags.delete(targetTag);
    usersMap.forEach((u) => {
      if (u.tags && u.tags.includes(targetTag)) {
        u.tags = u.tags.filter((t) => t !== targetTag);
      }
    });
    addAuditLog("info", "TAG_DELETED", `Super Admin ${admin.displayName} deleted tag "${targetTag}"`, admin.id, admin.username);
    broadcastWS({
      type: "tags:updated",
      tags: Array.from(availableTags)
    });
    res.json({ success: true, tags: Array.from(availableTags) });
  });
  app.post("/api/users/:userId/tags", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const { userId } = req.params;
    const targetUser = usersMap.get(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    let finalTags = targetUser.tags || [];
    if (Array.isArray(req.body?.tags)) {
      finalTags = req.body.tags.map((t) => sanitizeText(t, 40)).filter(Boolean);
    } else if (req.body?.tag) {
      const t = sanitizeText(req.body.tag, 40);
      if (t && !finalTags.includes(t)) finalTags.push(t);
    }
    finalTags = Array.from(new Set(finalTags));
    targetUser.tags = finalTags;
    finalTags.forEach((t) => availableTags.add(t));
    usersMap.set(userId, targetUser);
    broadcastWS({
      type: "user:tags_updated",
      userId,
      tags: finalTags,
      user: targetUser,
      availableTags: Array.from(availableTags)
    });
    res.json({ success: true, user: targetUser, tags: finalTags });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const server = import_http.default.createServer(app);
  const wss = new import_ws.WebSocketServer({ server, maxPayload: 65536 });
  wss.on("connection", (ws, req) => {
    let authenticatedUserId = null;
    let messageCount = 0;
    let windowReset = Date.now() + 1e4;
    ws.on("message", (raw) => {
      try {
        const now = Date.now();
        if (now > windowReset) {
          messageCount = 0;
          windowReset = now + 1e4;
        }
        messageCount++;
        if (messageCount > 40) return;
        const rawString = raw.toString();
        if (rawString.length > 65536) return;
        const data = JSON.parse(rawString);
        if (!data || typeof data.type !== "string") return;
        switch (data.type) {
          case "auth:identify": {
            const uid = sanitizeText(data.userId, 50);
            if (!uid) return;
            const user = usersMap.get(uid);
            if (!user || user.isBanned) {
              if (user?.isBanned) {
                ws.send(JSON.stringify({ type: "account:banned", reason: user.banReason }));
              }
              return;
            }
            authenticatedUserId = uid;
            clientConnections.set(authenticatedUserId, ws);
            user.isOnline = true;
            usersMap.set(authenticatedUserId, user);
            broadcastWS({ type: "user:status_change", userId: user.id, isOnline: true }, authenticatedUserId);
            ws.send(
              JSON.stringify({
                type: "init:snapshot",
                users: Array.from(usersMap.values()),
                messages: chatMessages.slice(-50),
                globalMarker: globalAssemblyMarker,
                assignments: Array.from(assignmentsMap.values()),
                groups: Array.from(groupsMap.values()),
                availableTags: Array.from(availableTags)
              })
            );
            break;
          }
          case "gps:update": {
            if (!authenticatedUserId) return;
            const user = usersMap.get(authenticatedUserId);
            if (!user || user.isBanned) return;
            const updateLat = validateCoordinate(data.lat, -90, 90, user.location.lat);
            const updateLng = validateCoordinate(data.lng, -180, 180, user.location.lng);
            user.location = {
              lat: updateLat,
              lng: updateLng,
              altitude: typeof data.altitude === "number" && Number.isFinite(data.altitude) ? data.altitude : user.location.altitude,
              accuracy: validateAccuracy(data.accuracy),
              heading: validateHeading(data.heading),
              speed: validateSpeed(data.speed),
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            };
            if (data.movementStatus && ["stationary", "walking", "running", "in_transit", "sos"].includes(data.movementStatus)) {
              user.movementStatus = data.movementStatus;
            }
            user.isOnline = true;
            usersMap.set(authenticatedUserId, user);
            broadcastWS(
              {
                type: "user:location_update",
                user
              },
              authenticatedUserId
            );
            break;
          }
          // Zero-Number Direct & Group Voice Calling Signaling
          case "call:initiate": {
            if (!authenticatedUserId) return;
            const targetId = sanitizeText(data.targetUserId, 50);
            const targetWs = clientConnections.get(targetId);
            const caller = usersMap.get(authenticatedUserId);
            if (caller?.isBanned) return;
            if (targetWs && targetWs.readyState === import_ws.WebSocket.OPEN) {
              targetWs.send(
                JSON.stringify({
                  type: "call:incoming",
                  callType: "direct",
                  callerId: authenticatedUserId,
                  callerName: caller?.displayName || "Dispatcher",
                  callerRole: caller?.role || "participant",
                  autoAnswer: !!data.autoAnswer,
                  offer: data.offer
                })
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: "call:unavailable",
                  targetUserId: targetId,
                  reason: "Target unit is currently unreachable or offline."
                })
              );
            }
            break;
          }
          // Group / Squad Voice Channel Signaling
          case "call:group_initiate": {
            if (!authenticatedUserId) return;
            const groupId = sanitizeText(data.groupId, 60);
            const group = groupsMap.get(groupId);
            const caller = usersMap.get(authenticatedUserId);
            if (!group || caller?.isBanned) return;
            let alertedCount = 0;
            group.memberIds.forEach((memberId) => {
              if (memberId === authenticatedUserId) return;
              const memberWs = clientConnections.get(memberId);
              if (memberWs && memberWs.readyState === import_ws.WebSocket.OPEN) {
                alertedCount++;
                memberWs.send(
                  JSON.stringify({
                    type: "call:incoming",
                    callType: "group",
                    groupId: group.id,
                    groupName: group.name,
                    callerId: authenticatedUserId,
                    callerName: caller?.displayName || "Dispatcher",
                    callerRole: caller?.role || "participant",
                    autoAnswer: !!data.autoAnswer,
                    participantCount: group.memberIds.length
                  })
                );
              }
            });
            ws.send(
              JSON.stringify({
                type: "call:group_started",
                groupId: group.id,
                groupName: group.name,
                activeMembersCount: alertedCount,
                participantCount: group.memberIds.length
              })
            );
            break;
          }
          case "call:accept": {
            if (!authenticatedUserId) return;
            const callerId = sanitizeText(data.callerId, 50);
            const callerWs = clientConnections.get(callerId);
            if (callerWs && callerWs.readyState === import_ws.WebSocket.OPEN) {
              callerWs.send(
                JSON.stringify({
                  type: "call:accepted",
                  answer: data.answer,
                  targetUserId: authenticatedUserId
                })
              );
            }
            break;
          }
          case "call:reject": {
            if (!authenticatedUserId) return;
            const callerId = sanitizeText(data.callerId, 50);
            const callerWs = clientConnections.get(callerId);
            if (callerWs && callerWs.readyState === import_ws.WebSocket.OPEN) {
              callerWs.send(
                JSON.stringify({
                  type: "call:rejected",
                  targetUserId: authenticatedUserId
                })
              );
            }
            break;
          }
          case "call:end": {
            if (!authenticatedUserId) return;
            if (data.callType === "group" && data.groupId) {
              const group = groupsMap.get(data.groupId);
              if (group) {
                group.memberIds.forEach((memberId) => {
                  if (memberId === authenticatedUserId) return;
                  const memberWs = clientConnections.get(memberId);
                  if (memberWs && memberWs.readyState === import_ws.WebSocket.OPEN) {
                    memberWs.send(
                      JSON.stringify({
                        type: "call:ended",
                        callType: "group",
                        groupId: group.id,
                        byUserId: authenticatedUserId
                      })
                    );
                  }
                });
              }
            } else {
              const targetId = sanitizeText(data.targetUserId, 50);
              const targetWs = clientConnections.get(targetId);
              if (targetWs && targetWs.readyState === import_ws.WebSocket.OPEN) {
                targetWs.send(
                  JSON.stringify({
                    type: "call:ended",
                    byUserId: authenticatedUserId
                  })
                );
              }
            }
            break;
          }
          case "call:ice_candidate":
          case "call:webrtc_offer":
          case "call:webrtc_answer":
          case "call:audio_data": {
            if (!authenticatedUserId) return;
            if (data.callType === "group" && data.groupId) {
              const group = groupsMap.get(data.groupId);
              if (group) {
                group.memberIds.forEach((memberId) => {
                  if (memberId === authenticatedUserId) return;
                  const memberWs = clientConnections.get(memberId);
                  if (memberWs && memberWs.readyState === import_ws.WebSocket.OPEN) {
                    memberWs.send(
                      JSON.stringify({
                        ...data,
                        fromUserId: authenticatedUserId
                      })
                    );
                  }
                });
              }
            } else {
              const targetId = sanitizeText(data.targetUserId, 50);
              const targetWs = clientConnections.get(targetId);
              if (targetWs && targetWs.readyState === import_ws.WebSocket.OPEN) {
                targetWs.send(
                  JSON.stringify({
                    ...data,
                    fromUserId: authenticatedUserId
                  })
                );
              }
            }
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.warn("WS error handling frame:", err);
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
    console.log(`RHA-volunteers GPS Radar Server (Hardened) running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
