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
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string; // 'all' or specific user id or 'admin_channel'
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

export interface ActiveCall {
  callId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: UserRole;
  isIncoming: boolean;
  status: "calling" | "ringing" | "connected" | "ended";
  duration: number; // in seconds
  isMuted: boolean;
  isSpeakerOn: boolean;
}

export interface FilterOptions {
  searchQuery: string;
  selectedRoles: UserRole[];
  selectedStatuses: MovementStatus[];
  onlyActive: boolean;
  hasSosOnly: boolean;
}

export type TabType = "home" | "messages" | "admin" | "about" | "user";
