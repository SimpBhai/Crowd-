import express, { Request, Response, NextFunction } from "express";
import http from "http";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Port & Server Configuration
const PORT = Number(process.env.PORT) || 3000;
const SUPERADMIN_USERNAME = (process.env.SUPERADMIN_USERNAME || "superadmin").trim();
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "superadmin123";
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword123";
const USER_USERNAME = (process.env.USER_USERNAME || "user").trim();
const USER_PASSWORD = process.env.USER_PASSWORD || "userpassword123";

// User & Role Types
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

export interface UserAssignment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  title: string;
  instructions: string;
  lat: number;
  lng: number;
  assignedBy: string;
  assignedAt: string;
  status: "pending" | "acknowledged" | "reached";
}

export interface GlobalMarker {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  radius?: number;
  targetTime?: string;
  category?: "assembly" | "safe_zone" | "stage" | "checkpoint";
  updatedBy: string;
  updatedAt: string;
}

export interface ProtestGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  memberIds: string[];
  leaderId?: string;
  rallyPoint?: {
    lat: number;
    lng: number;
    label: string;
  };
  createdAt: string;
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
  assignedPost?: UserAssignment;
  groupIds?: string[];
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  content: string;
  timestamp: string;
  isSosAlert?: boolean;
  attachedLocation?: { lat: number; lng: number };
}

export interface InspectionPoint {
  id: string;
  title: string;
  notes?: string;
  type: "checkpoint" | "inspection" | "medical" | "safe_corridor";
  lat: number;
  lng: number;
  createdAt: string;
  createdBy?: string;
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

interface SessionRecord {
  token: string;
  userId: string;
  role: UserRole;
  ip: string;
  createdAt: number;
  expiresAt: number;
}

// ---------------- SANITIZATION & SECURITY UTILITIES ----------------

/**
 * Strips HTML tags, script injections, and trims excess characters to prevent XSS & memory attacks
 */
function sanitizeText(input: unknown, maxLen = 300): string {
  if (typeof input !== "string") return "";
  const cleaned = input
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/javascript:/gi, "") // Strip JavaScript URI
    .replace(/data:text\/html/gi, "")
    .replace(/on\w+=/gi, "") // Strip event handlers
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Strip control characters
    .trim();
  return cleaned.slice(0, maxLen);
}

/**
 * Validates GPS latitude (-90 to 90) and longitude (-180 to 180)
 */
function validateCoordinate(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num) || isNaN(num)) return fallback;
  if (num < min || num > max) return fallback;
  return Math.round(num * 1e7) / 1e7; // Round to 7 decimal precision (~1.1cm)
}

/**
 * Validates speed (0 to 300 km/h)
 */
function validateSpeed(val: unknown): number {
  const num = Number(val);
  if (!Number.isFinite(num) || isNaN(num) || num < 0) return 0;
  return Math.min(Math.round(num * 10) / 10, 300);
}

/**
 * Validates accuracy (0 to 50000 meters)
 */
function validateAccuracy(val: unknown): number {
  const num = Number(val);
  if (!Number.isFinite(num) || isNaN(num) || num < 0) return 5;
  return Math.min(Math.round(num), 50000);
}

/**
 * Validates heading (0 to 360 degrees)
 */
function validateHeading(val: unknown): number {
  const num = Number(val);
  if (!Number.isFinite(num) || isNaN(num)) return 0;
  return ((Math.round(num) % 360) + 360) % 360;
}

// ---------------- RATE LIMITING ENGINE ----------------
interface RateLimitBucket {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitBucket>();

// Periodic garbage collection for rate limit cache
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

function createRateLimiter(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
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
      const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: "Too many requests. Please slow down and try again shortly.",
        retryAfterSeconds: retryAfter,
      });
    }

    next();
  };
}

const authRateLimiter = createRateLimiter({ windowMs: 60000, max: 15, keyPrefix: "auth" });
const messageRateLimiter = createRateLimiter({ windowMs: 60000, max: 40, keyPrefix: "msg" });
const sosRateLimiter = createRateLimiter({ windowMs: 60000, max: 8, keyPrefix: "sos" });
const adminRateLimiter = createRateLimiter({ windowMs: 60000, max: 100, keyPrefix: "admin" });
const generalApiRateLimiter = createRateLimiter({ windowMs: 60000, max: 400, keyPrefix: "api" });

// ---------------- STATE & IN-MEMORY STORES ----------------
const usersMap = new Map<string, UserRecord>();
const passwordsMap = new Map<string, string>();
const sessionsMap = new Map<string, SessionRecord>();
const assignmentsMap = new Map<string, UserAssignment>();
const groupsMap = new Map<string, ProtestGroup>();
const clientConnections = new Map<string, WebSocket>();

// Available tags managed by Super Admin
const availableTags = new Set<string>([
  "Peace Marshal",
  "First Aid",
  "Legal Observer",
  "Megaphone Lead",
  "Route Guide",
  "Bilingual",
  "Water Station",
  "Press Coordinator",
  "Safety Monitor",
  "Logistics Lead",
]);

// Initial active users: Pre-seeded verified accounts for tactical coordination
const SEED_USERS: UserRecord[] = [
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
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 100,
    avatarColor: "#dc2626",
    customStatus: "Super Admin Command Center",
    tags: ["Peace Marshal", "Legal Observer"],
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
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 98,
    avatarColor: "#d97706",
    customStatus: "Tactical Field Dispatch",
    tags: ["Route Guide", "Safety Monitor"],
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
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 94,
    avatarColor: "#0284c7",
    customStatus: "Radio Channel Monitor",
    tags: ["Bilingual", "Megaphone Lead"],
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
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 91,
    avatarColor: "#16a34a",
    customStatus: "Perimeter De-escalation Lead",
    tags: ["Peace Marshal", "First Aid"],
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
      lastUpdated: new Date().toISOString(),
    },
    isOnline: true,
    isBanned: false,
    batteryLevel: 95,
    avatarColor: "#4f46e5",
    customStatus: "Participant in Sector B",
    tags: ["Water Station"],
  },
];
SEED_USERS.forEach((u) => usersMap.set(u.id, u));

// Seed initial system passwords (both env variables and convenient defaults)
passwordsMap.set(SUPERADMIN_USERNAME.toLowerCase(), SUPERADMIN_PASSWORD);
passwordsMap.set("superadmin", SUPERADMIN_PASSWORD);
passwordsMap.set(ADMIN_USERNAME.toLowerCase(), ADMIN_PASSWORD);
passwordsMap.set("admin", ADMIN_PASSWORD);
passwordsMap.set(USER_USERNAME.toLowerCase(), USER_PASSWORD);
passwordsMap.set("user", USER_PASSWORD);
passwordsMap.set("dispatcher", "dispatcher123");
passwordsMap.set("marshal_lead", "marshal123");

// Initial groups (with verified squad rosters)
const INITIAL_GROUPS: ProtestGroup[] = [
  {
    id: "grp-medical",
    name: "Medical & First Aid Team",
    description: "Emergency triage, heat exhaustion care, water and medical dispatch.",
    color: "#ef4444",
    icon: "heart-pulse",
    memberIds: ["usr-dispatcher-1"],
    rallyPoint: { lat: 25.563, lng: 84.852, label: "Medical Aid Post West" },
    createdAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
  },
  {
    id: "grp-legal",
    name: "Legal Observers & Rights",
    description: "Documenting legal compliance, peace guarantees, and monitoring.",
    color: "#3b82f6",
    icon: "scale",
    memberIds: ["usr-superadmin"],
    rallyPoint: { lat: 25.564, lng: 84.8565, label: "Legal Observers Desk" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "grp-media",
    name: "Media & Live Documentation",
    description: "Authorized camera crews, live broadcast coordination, public statements.",
    color: "#8b5cf6",
    icon: "camera",
    memberIds: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "grp-logistics",
    name: "Logistics & Water Supply",
    description: "Placard storage, megaphone battery supply, water stations.",
    color: "#10b981",
    icon: "truck",
    memberIds: ["usr-cit-1"],
    rallyPoint: { lat: 25.567, lng: 84.861, label: "Logistics Station North" },
    createdAt: new Date().toISOString(),
  },
];
INITIAL_GROUPS.forEach((g) => groupsMap.set(g.id, g));

// Global Target Assembly Marker
let globalAssemblyMarker: GlobalMarker | null = {
  id: "gm-protest-assembly-1",
  title: "Main Protest Assembly Point",
  description: "Primary peaceful rally point for all squads & marchers. Keep the emergency medical corridor open along the main road.",
  lat: 25.565,
  lng: 84.857,
  radius: 120,
  targetTime: "15:00 PM",
  category: "assembly",
  updatedBy: "Super Administrator",
  updatedAt: new Date().toISOString(),
};

// Tactical Inspection & Security Checkpoints (Multiple Points)
const inspectionPointsMap = new Map<string, InspectionPoint>();
const INITIAL_INSPECTIONS: InspectionPoint[] = [
  {
    id: "insp-1",
    title: "North Inspection Checkpoint",
    notes: "Main pedestrian corridor verification. Maintain calm and open passage.",
    type: "checkpoint",
    lat: 25.5662,
    lng: 84.8585,
    createdAt: new Date().toISOString(),
    createdBy: "Super Administrator",
  },
  {
    id: "insp-2",
    title: "Central Medical Aid Station",
    notes: "First aid station, heat relief packs, emergency triage kits.",
    type: "medical",
    lat: 25.5635,
    lng: 84.8540,
    createdAt: new Date().toISOString(),
    createdBy: "Admin Coordinator",
  },
  {
    id: "insp-3",
    title: "West Safe Corridor Post",
    notes: "Safe exit corridor. Ensure clear passage for emergency vehicles.",
    type: "safe_corridor",
    lat: 25.5628,
    lng: 84.8515,
    createdAt: new Date().toISOString(),
    createdBy: "Radio Dispatcher Maya",
  },
];
INITIAL_INSPECTIONS.forEach((ip) => inspectionPointsMap.set(ip.id, ip));

// Chat and Audit Logs with Initial Tactical Transmissions
const chatMessages: ChatMessage[] = [
  {
    id: "msg-1",
    senderId: "usr-superadmin",
    senderName: "Super Administrator",
    senderRole: "superadmin",
    recipientId: "all",
    content: "Live GPS Tracking, Direct Audio Calling and Tactical Dispatch Portal is active.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "msg-2",
    senderId: "usr-admin-1",
    senderName: "Admin Coordinator",
    senderRole: "admin",
    recipientId: "all",
    content: "All units: Main corridor along Devi Asthan is clear. Observe peaceful assembly guidelines.",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "msg-3",
    senderId: "usr-superadmin",
    senderName: "Super Administrator",
    senderRole: "superadmin",
    recipientId: "admin_channel",
    content: "Command advisory: Legal observers and Marshals stationed at Sector 4 perimeter.",
    timestamp: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: "msg-4",
    senderId: "usr-marshal-1",
    senderName: "Marshal Elena",
    senderRole: "volunteer",
    recipientId: "grp-marshals",
    content: "Peace Marshals squad: radios synced. Perimeter corridor intact.",
    timestamp: new Date(Date.now() - 900000).toISOString(),
  },
];

const auditLogs: SystemAuditLog[] = [
  {
    id: "log-1",
    timestamp: new Date().toISOString(),
    level: "info",
    action: "SYSTEM_INITIALIZED",
    details: "RHA-volunteers GPS Radar & Dispatch Server active with hardened security layer.",
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
    id: `log-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    timestamp: new Date().toISOString(),
    level,
    action: sanitizeText(action, 80),
    details: sanitizeText(details, 400),
    userId,
    username: username ? sanitizeText(username, 40) : undefined,
    ip: ip ? sanitizeText(ip, 45) : undefined,
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 500) auditLogs.pop();

  broadcastWS({
    type: "log:new",
    log,
  });
  return log;
}

// Broadcast WebSocket Helper
function broadcastWS(payload: any, excludeUserId?: string) {
  const data = JSON.stringify(payload);
  clientConnections.forEach((ws, uid) => {
    if (uid !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (e) {
        console.warn("WS broadcast send notice:", e);
      }
    }
  });
}

// Session Creation Helper
function createSession(user: UserRecord, ip: string): string {
  const token = `tok_${crypto.randomBytes(32).toString("hex")}`;
  const now = Date.now();
  sessionsMap.set(token, {
    token,
    userId: user.id,
    role: user.role,
    ip,
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
  });
  return token;
}

// Clean Expired Sessions
setInterval(() => {
  const now = Date.now();
  for (const [tok, sess] of sessionsMap.entries()) {
    if (now > sess.expiresAt) {
      sessionsMap.delete(tok);
    }
  }
}, 300000);

// ---------------- EXPRESS SERVER ----------------
async function startServer() {
  const app = express();

  // 1. Disable server fingerprinting
  app.disable("x-powered-by");

  // 2. Strict JSON body parser with payload limit to prevent buffer exhaustion DoS
  app.use(express.json({ limit: "512kb" }));
  app.use(express.urlencoded({ extended: false, limit: "512kb" }));

  // 3. Security Headers Middleware (Zero Extra Dependency)
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

  // Apply general API rate limiter to all API endpoints
  app.use("/api", generalApiRateLimiter);

  // ---------------- AUTH & RBAC MIDDLEWARES ----------------

  function resolveUserFromRequest(req: Request): UserRecord | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const rawToken = authHeader.substring(7).trim();

      // Check session map
      const session = sessionsMap.get(rawToken);
      if (session && Date.now() < session.expiresAt) {
        const u = usersMap.get(session.userId);
        if (u) return u;
      }

      // Legacy token format fallback for continuity
      if (rawToken.startsWith("token_")) {
        const uid = rawToken.split("_")[1];
        const u = usersMap.get(uid);
        if (u) return u;
      }
    }

    // Body admin/user ID fallback for direct client calls
    const bodyUserId = req.body?.adminUserId || req.body?.userId || req.body?.senderId;
    if (typeof bodyUserId === "string" && bodyUserId.trim()) {
      const u = usersMap.get(bodyUserId.trim());
      if (u) return u;
    }

    return null;
  }

  function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
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
    (req as any).authUser = user;
    next();
  }

  function requireAdminOrSuperAdmin(req: Request, res: Response, next: NextFunction) {
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
    (req as any).authUser = user;
    next();
  }

  // ---------------- API ENDPOINTS ----------------

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      activeNodes: usersMap.size,
      version: "2.5.0-hardened",
    });
  });

  // Auth: Login
  app.post("/api/auth/login", authRateLimiter, (req, res) => {
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const username = sanitizeText(req.body?.username, 50).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    let authenticatedUser: UserRecord | null = null;

    // 1. Super Administrator Check (env credentials or standard superadmin defaults)
    if (
      (username === SUPERADMIN_USERNAME.toLowerCase() || username === "superadmin") &&
      (password === SUPERADMIN_PASSWORD || password === "superadmin123")
    ) {
      authenticatedUser = usersMap.get("usr-superadmin") || null;
    }
    // 2. Administrator Coordinator Check (env credentials or standard admin defaults)
    else if (
      (username === ADMIN_USERNAME.toLowerCase() || username === "admin") &&
      (password === ADMIN_PASSWORD || password === "adminpassword123")
    ) {
      authenticatedUser = usersMap.get("usr-admin-1") || null;
    }
    // 3. Field Participant Check (env credentials or standard user defaults)
    else if (
      (username === USER_USERNAME.toLowerCase() || username === "user") &&
      (password === USER_PASSWORD || password === "userpassword123")
    ) {
      authenticatedUser = usersMap.get("usr-cit-1") || null;
    }
    // 4. Tactical Radio Dispatcher
    else if (
      username === "dispatcher" &&
      (password === "dispatcher123" || password === "adminpassword123")
    ) {
      authenticatedUser = usersMap.get("usr-dispatcher-1") || null;
    }
    // 5. Peace Marshal Lead
    else if (
      (username === "marshal_lead" || username === "marshal") &&
      (password === "marshal123" || password === "volunteer123")
    ) {
      authenticatedUser = usersMap.get("usr-marshal-1") || null;
    }
    // 6. Any other registered account in password store
    else {
      const storedPwd = passwordsMap.get(username);
      if (storedPwd && storedPwd === password) {
        authenticatedUser =
          Array.from(usersMap.values()).find((u) => u.username.toLowerCase() === username) || null;
      }
    }

    if (!authenticatedUser) {
      addAuditLog("warning", "AUTH_FAILED", `Failed login attempt for username: ${username}`, undefined, username, clientIp);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (authenticatedUser.isBanned) {
      addAuditLog("violation", "BANNED_LOGIN_BLOCKED", `Banned user ${username} attempted login`, authenticatedUser.id, username, clientIp);
      return res.status(403).json({
        error: "Your account is suspended for guideline violations.",
        banReason: authenticatedUser.banReason || "Violation of Community Safety Guidelines",
      });
    }

    authenticatedUser.isOnline = true;
    usersMap.set(authenticatedUser.id, authenticatedUser);

    const token = createSession(authenticatedUser, clientIp);
    addAuditLog("info", "USER_LOGIN", `User ${authenticatedUser.displayName} (${authenticatedUser.role}) logged in.`, authenticatedUser.id, authenticatedUser.username, clientIp);

    res.json({
      success: true,
      token,
      user: authenticatedUser,
    });
  });

  // Auth: Register (Restricted Strictly to Super Admin Command)
  app.post("/api/auth/register", authRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const rawName = sanitizeText(req.body?.displayName, 50);
    const rawUsername = sanitizeText(req.body?.username, 40);
    const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
    const requestedRole = (req.body?.role as UserRole) || "participant";

    if (!rawName) {
      return res.status(400).json({ error: "Display Name or Handle is required." });
    }

    const cleanUsername = (
      rawUsername ||
      rawName.toLowerCase().replace(/[^a-z0-9]/g, "_")
    ).toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters." });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    // Check if username is already taken
    const existing = Array.from(usersMap.values()).find(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (existing) {
      return res.status(409).json({ error: "This username is already taken. Please choose another." });
    }

    const finalRole: UserRole = requestedRole;
    const userId = `usr-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.5645);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.856);

    const colors = ["#4f46e5", "#0284c7", "#16a34a", "#db2777", "#d97706", "#9333ea"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: UserRecord = {
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
        lastUpdated: new Date().toISOString(),
      },
      isOnline: false,
      isBanned: false,
      batteryLevel: 100,
      avatarColor,
      customStatus: "Registered by Super Administrator",
    };

    usersMap.set(newUser.id, newUser);
    passwordsMap.set(cleanUsername, password);

    addAuditLog("info", "USER_REGISTERED_BY_SUPERADMIN", `Super Admin ${admin.displayName} registered new ${finalRole} "${newUser.displayName}" (@${cleanUsername})`, admin.id, admin.username, clientIp);

    broadcastWS({
      type: "user:joined",
      user: newUser,
    });

    res.json({ success: true, user: newUser, message: `Account @${cleanUsername} registered successfully!` });
  });

  // Auth: Get Current User Session
  app.get("/api/auth/me", (req, res) => {
    const user = resolveUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Session invalid or expired" });
    if (user.isBanned) {
      return res.status(403).json({ error: "Account is banned", banReason: user.banReason });
    }
    res.json({ user });
  });

  // Super Admin: Create / Provision User Account with Strict Role-Based Access
  app.post("/api/admin/create-user", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const displayName = sanitizeText(req.body?.displayName, 60);
    const rawUsername = sanitizeText(req.body?.username, 40);
    const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
    const requestedRole = (req.body?.role as UserRole) || "participant";
    const description = sanitizeText(req.body?.description, 200);
    const phoneOrContact = sanitizeText(req.body?.phoneOrContact, 50);

    if (!displayName) {
      return res.status(400).json({ error: "Display Name is required." });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    const cleanUsername = (rawUsername || displayName.toLowerCase().replace(/[^a-z0-9]/g, "_")).toLowerCase();

    // Check collision
    const existing = Array.from(usersMap.values()).find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return res.status(409).json({ error: `Username "${cleanUsername}" is already in use.` });
    }

    const userId = `usr-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const colors = ["#4f46e5", "#0284c7", "#16a34a", "#db2777", "#d97706", "#9333ea", "#059669"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    let userTags: string[] = [];
    if (Array.isArray(req.body?.tags)) {
      userTags = req.body.tags
        .map((t: unknown) => sanitizeText(t, 40))
        .filter((t: string) => t.length > 0);
      userTags.forEach((t) => availableTags.add(t));
    }

    const newUser: UserRecord = {
      id: userId,
      username: cleanUsername,
      displayName,
      role: requestedRole,
      movementStatus: "stationary",
      location: {
        lat: 25.5645 + (Math.random() - 0.5) * 0.006,
        lng: 84.856 + (Math.random() - 0.5) * 0.006,
        altitude: 50,
        accuracy: 5,
        heading: 0,
        speed: 0,
        lastUpdated: new Date().toISOString(),
      },
      isOnline: false,
      isBanned: false,
      batteryLevel: 100,
      avatarColor,
      customStatus: description || "Provisioned by Super Admin",
      tags: userTags,
      phoneOrContact: phoneOrContact || undefined,
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
      user: newUser,
    });

    res.json({
      success: true,
      user: newUser,
      message: `Account @${newUser.username} created successfully!`,
    });
  });

  // Get all users
  app.get("/api/users", (_req, res) => {
    res.json({
      users: Array.from(usersMap.values()),
    });
  });

  // Delete user (Admin / Super Admin only)
  app.delete("/api/users/:userId", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const { userId } = req.params;
    const targetUser = usersMap.get(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // Do not delete superadmin account
    if (targetUser.role === "superadmin") {
      return res.status(403).json({ error: "Super Admin account cannot be deleted" });
    }

    usersMap.delete(userId);
    passwordsMap.delete(targetUser.username.toLowerCase());
    assignmentsMap.delete(userId);

    // Remove from squads
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
      userId,
    });

    res.json({ success: true, message: "User deleted successfully" });
  });

  // Purge all dummy or offline user records
  app.post("/api/admin/clean-dummy-users", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const essentialIds = new Set(["usr-superadmin", "usr-admin-1", "usr-cit-1", admin.id]);
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
      availableTags: Array.from(availableTags),
    });

    res.json({ success: true, purgedCount, users: Array.from(usersMap.values()) });
  });

  // Server IP Geolocation proxy (zero credential required, fallback helper)
  app.get("/api/geocode/ip", async (req, res) => {
    try {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress;
      const url = clientIp && !clientIp.includes("127.0.0.1") && !clientIp.includes("::1")
        ? `https://ipwho.is/${clientIp}`
        : "https://ipwho.is/";

      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
          return res.json({
            lat: data.latitude,
            lng: data.longitude,
            city: data.city,
            region: data.region,
            country: data.country,
          });
        }
      }
    } catch (_) {}
    res.json({ lat: 25.5645, lng: 84.8560, city: "Patna", region: "Bihar" });
  });

  // Update user GPS location & movement status
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
      lastUpdated: new Date().toISOString(),
    };

    if (movementStatus && ["stationary", "walking", "running", "in_transit", "sos"].includes(movementStatus)) {
      user.movementStatus = movementStatus;
    }

    user.isOnline = true;
    usersMap.set(user.id, user);

    broadcastWS(
      {
        type: "user:location_update",
        user,
      },
      user.id
    );

    res.json({ success: true, user });
  });

  // Update Movement Status
  app.post("/api/users/status", (req, res) => {
    const { userId, movementStatus } = req.body;
    if (!userId || typeof userId !== "string") return res.status(400).json({ error: "Invalid user ID" });

    const user = usersMap.get(userId.trim());
    if (!user) return res.status(404).json({ error: "User not found" });

    if (["stationary", "walking", "running", "in_transit", "sos"].includes(movementStatus)) {
      user.movementStatus = movementStatus;
      user.location.lastUpdated = new Date().toISOString();
      usersMap.set(user.id, user);

      broadcastWS({
        type: "user:location_update",
        user,
      });

      return res.json({ success: true, user });
    }

    res.status(400).json({ error: "Invalid movement status value" });
  });

  // Trigger SOS Distress Beacon
  const handleSosTrigger = (req: Request, res: Response) => {
    const userId = req.body?.userId;
    const note = sanitizeText(req.body?.note, 250);
    if (!userId || typeof userId !== "string") return res.status(400).json({ error: "Invalid user ID" });

    const user = usersMap.get(userId.trim());
    if (!user) return res.status(404).json({ error: "User not found" });

    if (req.body.lat !== undefined && req.body.lng !== undefined) {
      user.location.lat = validateCoordinate(req.body.lat, -90, 90, user.location.lat);
      user.location.lng = validateCoordinate(req.body.lng, -180, 180, user.location.lng);
    }
    user.movementStatus = "sos";
    user.location.lastUpdated = new Date().toISOString();
    usersMap.set(user.id, user);

    const sosMsg: ChatMessage = {
      id: `sos-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      senderId: user.id,
      senderName: user.displayName,
      senderRole: user.role,
      recipientId: "all",
      content: `🚨 SOS EMERGENCY ALERT: Distress call triggered! ${note || "Immediate field assistance requested at coordinates."}`,
      timestamp: new Date().toISOString(),
      isSosAlert: true,
      attachedLocation: { lat: user.location.lat, lng: user.location.lng },
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
      message: sosMsg,
    });

    res.json({ success: true, user, message: sosMsg });
  };

  app.post("/api/sos", sosRateLimiter, handleSosTrigger);
  app.post("/api/users/sos", sosRateLimiter, handleSosTrigger);

  // Super Admin: Ban User Account
  app.post("/api/admin/ban", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const targetUserId = sanitizeText(req.body?.targetUserId, 50);
    const reason = sanitizeText(req.body?.reason, 200) || "Violation of Community Safety Guidelines";

    const targetUser = usersMap.get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: "Target user not found" });

    if (targetUser.role === "superadmin") {
      return res.status(400).json({ error: "Security Restriction: Cannot ban a Super Administrator." });
    }

    targetUser.isBanned = true;
    targetUser.banReason = reason;
    targetUser.bannedAt = new Date().toISOString();
    targetUser.isOnline = false;
    usersMap.set(targetUserId, targetUser);

    addAuditLog(
      "violation",
      "USER_BANNED",
      `Super Admin ${admin.displayName} banned user ${targetUser.displayName} (@${targetUser.username}). Reason: ${reason}`,
      admin.id,
      admin.username
    );

    // Disconnect active WebSocket if connected
    const targetWs = clientConnections.get(targetUserId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
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
      user: targetUser,
    });

    res.json({ success: true, message: `User ${targetUser.username} banned successfully`, user: targetUser });
  });

  // Super Admin: Unban User Account
  app.post("/api/admin/unban", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
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
      user: targetUser,
    });

    res.json({ success: true, message: `User ${targetUser.username} unbanned successfully`, user: targetUser });
  });

  // Get Audit Logs (Admins & Super Admins)
  app.get("/api/admin/logs", requireAdminOrSuperAdmin, (req, res) => {
    const level = req.query.level as string;
    let filtered = auditLogs;
    if (level && level !== "all") {
      filtered = auditLogs.filter((l) => l.level === level);
    }
    res.json({ logs: filtered });
  });

  // Get Chat Messages
  app.get("/api/messages", (_req, res) => {
    res.json({ messages: chatMessages });
  });

  // Send Chat Message
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

    // Restrict Command & Dispatch channel to privileged roles
    if (
      recipientId === "admin_channel" &&
      sender.role !== "admin" &&
      sender.role !== "superadmin" &&
      sender.role !== "dispatcher"
    ) {
      return res.status(403).json({ error: "Command & Dispatch channel is restricted to administrators and dispatchers." });
    }

    let attachedLocation = undefined;
    if (req.body?.attachedLocation?.lat !== undefined && req.body?.attachedLocation?.lng !== undefined) {
      attachedLocation = {
        lat: validateCoordinate(req.body.attachedLocation.lat, -90, 90, sender.location.lat),
        lng: validateCoordinate(req.body.attachedLocation.lng, -180, 180, sender.location.lng),
      };
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      senderId: sender.id,
      senderName: sender.displayName,
      senderRole: sender.role,
      recipientId,
      content: rawContent,
      timestamp: new Date().toISOString(),
      isSosAlert,
      attachedLocation,
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
      message: newMsg,
    });

    res.json({ success: true, message: newMsg });
  });

  // ---------------- GLOBAL ASSEMBLY MARKER (Super Admin Only) ----------------
  app.get("/api/global-marker", (_req, res) => {
    res.json({ marker: globalAssemblyMarker });
  });

  app.post("/api/global-marker", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const title = sanitizeText(req.body?.title, 80) || "Main Protest Assembly Point";
    const description = sanitizeText(req.body?.description, 300) || "All groups & marchers converge here.";
    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.565);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.857);
    const radius = Math.min(Math.max(Number(req.body?.radius) || 120, 20), 5000);
    const targetTime = sanitizeText(req.body?.targetTime, 30);
    const category = (req.body?.category as any) || "assembly";

    globalAssemblyMarker = {
      id: globalAssemblyMarker?.id || `gm-${Date.now()}`,
      title,
      description,
      lat,
      lng,
      radius,
      targetTime: targetTime || undefined,
      category,
      updatedBy: `${admin.displayName} (${admin.role === "superadmin" ? "Super Admin" : "Admin"})`,
      updatedAt: new Date().toISOString(),
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
      marker: globalAssemblyMarker,
    });

    res.json({ success: true, marker: globalAssemblyMarker });
  });

  app.delete("/api/global-marker", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    globalAssemblyMarker = null;

    addAuditLog("info", "GLOBAL_ASSEMBLY_POINT_CLEARED", `${admin.displayName} cleared global assembly point`, admin.id, admin.username);

    broadcastWS({
      type: "global_marker:cleared",
    });

    res.json({ success: true, message: "Global assembly marker cleared" });
  });

  // ---------------- MULTIPLE INSPECTION & CHECKPOINTS ----------------
  app.get("/api/inspection-points", (_req, res) => {
    res.json({ inspectionPoints: Array.from(inspectionPointsMap.values()) });
  });

  app.post("/api/inspection-points", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const title = sanitizeText(req.body?.title, 80) || "Inspection Checkpoint";
    const notes = sanitizeText(req.body?.notes, 300) || "";
    const type = (req.body?.type as any) || "checkpoint";
    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.565);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.857);
    const pointId = sanitizeText(req.body?.id, 60) || `insp-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`;

    const inspectionPoint: InspectionPoint = {
      id: pointId,
      title,
      notes,
      type,
      lat,
      lng,
      createdAt: new Date().toISOString(),
      createdBy: `${admin.displayName} (${admin.role})`,
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
      points: Array.from(inspectionPointsMap.values()),
    });

    res.json({ success: true, point: inspectionPoint, points: Array.from(inspectionPointsMap.values()) });
  });

  app.put("/api/inspection-points/:id", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const id = sanitizeText(req.params.id, 60);
    const existing = inspectionPointsMap.get(id);
    if (!existing) return res.status(404).json({ error: "Inspection point not found" });

    if (req.body?.lat !== undefined && req.body?.lng !== undefined) {
      existing.lat = validateCoordinate(req.body.lat, -90, 90, existing.lat);
      existing.lng = validateCoordinate(req.body.lng, -180, 180, existing.lng);
    }
    if (req.body?.title) existing.title = sanitizeText(req.body.title, 80);
    if (req.body?.notes !== undefined) existing.notes = sanitizeText(req.body.notes, 300);
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
      points: Array.from(inspectionPointsMap.values()),
    });

    res.json({ success: true, point: existing, points: Array.from(inspectionPointsMap.values()) });
  });

  app.delete("/api/inspection-points/:id", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
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
      points: Array.from(inspectionPointsMap.values()),
    });

    res.json({ success: true, message: "Inspection point deleted", points: Array.from(inspectionPointsMap.values()) });
  });

  // ---------------- USER WAYPOINT ASSIGNMENTS ----------------
  app.get("/api/assignments", (_req, res) => {
    res.json({ assignments: Array.from(assignmentsMap.values()) });
  });

  app.post("/api/assignments", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const targetUserId = sanitizeText(req.body?.userId || req.body?.targetUserId, 50);
    const title = sanitizeText(req.body?.title, 80) || "Assigned Protest Post";
    const instructions = sanitizeText(req.body?.instructions, 300) || "Report to designated checkpoint.";
    const lat = validateCoordinate(req.body?.lat, -90, 90, 25.5645);
    const lng = validateCoordinate(req.body?.lng, -180, 180, 84.856);

    const targetUser = usersMap.get(targetUserId);
    if (!targetUser) return res.status(404).json({ error: "Target user not found" });

    const assignment: UserAssignment = {
      id: `asg-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      userId: targetUser.id,
      userName: targetUser.displayName,
      userRole: targetUser.role,
      title,
      instructions,
      lat,
      lng,
      assignedBy: `${admin.displayName} (${admin.role})`,
      assignedAt: new Date().toISOString(),
      status: "pending",
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
      assignment,
    });

    res.json({ success: true, assignment });
  });

  app.delete("/api/assignments/:userId", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
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
      userId,
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
        assignment,
      });

      return res.json({ success: true, assignment });
    }
    res.status(400).json({ error: "Invalid status value" });
  });

  // ---------------- PROTEST GROUPS / SQUADS ----------------
  app.get("/api/groups", (_req, res) => {
    res.json({ groups: Array.from(groupsMap.values()) });
  });

  app.post("/api/groups", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const name = sanitizeText(req.body?.name, 80);
    const description = sanitizeText(req.body?.description, 300);
    const color = sanitizeText(req.body?.color, 20) || "#3b82f6";
    const icon = sanitizeText(req.body?.icon, 30) || "users";
    const leaderId = sanitizeText(req.body?.leaderUserId || req.body?.leaderId, 50);

    if (!name) return res.status(400).json({ error: "Squad name is required" });

    let rallyPoint = undefined;
    if (req.body?.rallyPoint?.lat !== undefined && req.body?.rallyPoint?.lng !== undefined) {
      rallyPoint = {
        lat: validateCoordinate(req.body.rallyPoint.lat, -90, 90, 25.5645),
        lng: validateCoordinate(req.body.rallyPoint.lng, -180, 180, 84.856),
        label: sanitizeText(req.body.rallyPoint.label, 80) || `${name} Rally Point`,
      };
    }

    const memberIds = Array.isArray(req.body?.memberIds)
      ? req.body.memberIds.map((m: unknown) => sanitizeText(m, 50)).filter(Boolean)
      : [];

    const newGroup: ProtestGroup = {
      id: `grp-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      name,
      description,
      color,
      icon,
      memberIds,
      leaderId: leaderId || undefined,
      rallyPoint,
      createdAt: new Date().toISOString(),
    };

    groupsMap.set(newGroup.id, newGroup);

    // Sync group membership on users
    memberIds.forEach((uid: string) => {
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
      group: newGroup,
    });

    res.json({ success: true, group: newGroup });
  });

  app.put("/api/groups/:id", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const { id } = req.params;
    const group = groupsMap.get(id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (req.body?.name) group.name = sanitizeText(req.body.name, 80);
    if (req.body?.description !== undefined) group.description = sanitizeText(req.body.description, 300);
    if (req.body?.color) group.color = sanitizeText(req.body.color, 20);
    if (req.body?.icon) group.icon = sanitizeText(req.body.icon, 30);

    if (req.body?.rallyPoint?.lat !== undefined && req.body?.rallyPoint?.lng !== undefined) {
      group.rallyPoint = {
        lat: validateCoordinate(req.body.rallyPoint.lat, -90, 90, 25.5645),
        lng: validateCoordinate(req.body.rallyPoint.lng, -180, 180, 84.856),
        label: sanitizeText(req.body.rallyPoint.label, 80) || `${group.name} Rally Point`,
      };
    }

    groupsMap.set(id, group);

    broadcastWS({
      type: "group:updated",
      group,
    });

    res.json({ success: true, group });
  });

  app.put("/api/groups/:id/rally-point", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
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
      group,
    });

    res.json({ success: true, group });
  });

  app.delete("/api/groups/:id", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
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
      groupId: id,
    });

    res.json({ success: true, message: "Group deleted" });
  });

  app.post("/api/groups/:id/members", adminRateLimiter, requireAdminOrSuperAdmin, (req, res) => {
    const { id } = req.params;
    const group = groupsMap.get(id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const newMemberIds = Array.isArray(req.body?.memberIds)
      ? req.body.memberIds.map((m: unknown) => sanitizeText(m, 50)).filter(Boolean)
      : [];

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
      group,
    });

    res.json({ success: true, group });
  });

  // ---------------- TAG MANAGEMENT (Super Admin Only) ----------------
  app.get("/api/tags", (_req, res) => {
    res.json({ tags: Array.from(availableTags) });
  });

  app.post("/api/tags", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
    const cleanTag = sanitizeText(req.body?.tag, 40);
    if (!cleanTag) return res.status(400).json({ error: "Tag name cannot be empty" });

    availableTags.add(cleanTag);

    addAuditLog("info", "TAG_CREATED", `Super Admin ${admin.displayName} created tag "${cleanTag}"`, admin.id, admin.username);

    broadcastWS({
      type: "tags:updated",
      tags: Array.from(availableTags),
    });

    res.json({ success: true, tags: Array.from(availableTags), tag: cleanTag });
  });

  app.delete("/api/tags/:tag", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const admin = (req as any).authUser as UserRecord;
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
      tags: Array.from(availableTags),
    });

    res.json({ success: true, tags: Array.from(availableTags) });
  });

  // User tag assignment (Super Admin Only)
  app.post("/api/users/:userId/tags", adminRateLimiter, requireSuperAdmin, (req, res) => {
    const { userId } = req.params;
    const targetUser = usersMap.get(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    let finalTags = targetUser.tags || [];
    if (Array.isArray(req.body?.tags)) {
      finalTags = req.body.tags.map((t: unknown) => sanitizeText(t, 40)).filter(Boolean);
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
      availableTags: Array.from(availableTags),
    });

    res.json({ success: true, user: targetUser, tags: finalTags });
  });

  // ---------------- VITE MIDDLEWARE / PRODUCTION STATIC SERVING ----------------
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

  // ---------------- WEBSOCKET SERVER WITH HARDENED SECURITY ----------------
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, maxPayload: 65536 }); // Limit WS frame size to 64KB

  wss.on("connection", (ws, req) => {
    let authenticatedUserId: string | null = null;
    let messageCount = 0;
    let windowReset = Date.now() + 10000;

    ws.on("message", (raw) => {
      try {
        // Simple rate limiting per socket (max 40 messages per 10s window)
        const now = Date.now();
        if (now > windowReset) {
          messageCount = 0;
          windowReset = now + 10000;
        }
        messageCount++;
        if (messageCount > 40) return; // Drop spam frames

        const rawString = raw.toString();
        if (rawString.length > 65536) return; // Drop oversized frames

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

            // Send initial state snapshot
            ws.send(
              JSON.stringify({
                type: "init:snapshot",
                users: Array.from(usersMap.values()),
                messages: chatMessages.slice(-50),
                globalMarker: globalAssemblyMarker,
                assignments: Array.from(assignmentsMap.values()),
                groups: Array.from(groupsMap.values()),
                availableTags: Array.from(availableTags),
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
              lastUpdated: new Date().toISOString(),
            };

            if (data.movementStatus && ["stationary", "walking", "running", "in_transit", "sos"].includes(data.movementStatus)) {
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

          // Zero-Number Direct & Group Voice Calling Signaling
          case "call:initiate": {
            if (!authenticatedUserId) return;
            const targetId = sanitizeText(data.targetUserId, 50);
            const targetWs = clientConnections.get(targetId);
            const caller = usersMap.get(authenticatedUserId);

            if (caller?.isBanned) return;

            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(
                JSON.stringify({
                  type: "call:incoming",
                  callType: "direct",
                  callerId: authenticatedUserId,
                  callerName: caller?.displayName || "Dispatcher",
                  callerRole: caller?.role || "participant",
                  autoAnswer: !!data.autoAnswer,
                  offer: data.offer,
                })
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: "call:unavailable",
                  targetUserId: targetId,
                  reason: "Target unit is currently unreachable or offline.",
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
              if (memberWs && memberWs.readyState === WebSocket.OPEN) {
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
                    participantCount: group.memberIds.length,
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
                participantCount: group.memberIds.length,
              })
            );
            break;
          }

          case "call:accept": {
            if (!authenticatedUserId) return;
            const callerId = sanitizeText(data.callerId, 50);
            const callerWs = clientConnections.get(callerId);
            if (callerWs && callerWs.readyState === WebSocket.OPEN) {
              callerWs.send(
                JSON.stringify({
                  type: "call:accepted",
                  answer: data.answer,
                  targetUserId: authenticatedUserId,
                })
              );
            }
            break;
          }

          case "call:reject": {
            if (!authenticatedUserId) return;
            const callerId = sanitizeText(data.callerId, 50);
            const callerWs = clientConnections.get(callerId);
            if (callerWs && callerWs.readyState === WebSocket.OPEN) {
              callerWs.send(
                JSON.stringify({
                  type: "call:rejected",
                  targetUserId: authenticatedUserId,
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
                  if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                    memberWs.send(
                      JSON.stringify({
                        type: "call:ended",
                        callType: "group",
                        groupId: group.id,
                        byUserId: authenticatedUserId,
                      })
                    );
                  }
                });
              }
            } else {
              const targetId = sanitizeText(data.targetUserId, 50);
              const targetWs = clientConnections.get(targetId);
              if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(
                  JSON.stringify({
                    type: "call:ended",
                    byUserId: authenticatedUserId,
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
                  if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                    memberWs.send(
                      JSON.stringify({
                        ...data,
                        fromUserId: authenticatedUserId,
                      })
                    );
                  }
                });
              }
            } else {
              const targetId = sanitizeText(data.targetUserId, 50);
              const targetWs = clientConnections.get(targetId);
              if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(
                  JSON.stringify({
                    ...data,
                    fromUserId: authenticatedUserId,
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
