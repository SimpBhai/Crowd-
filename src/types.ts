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
  title: string; // e.g. "North Sector Safety Marshal", "First Aid Station A"
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
  radius?: number; // assembly perimeter in meters, default 100
  targetTime?: string; // e.g. "14:00 PM"
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
  assignedPost?: UserAssignment;
  groupIds?: string[];
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string; // 'all' or specific user id or 'admin_channel' or group id
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

export interface ActiveCall {
  callId: string;
  callType: "direct" | "group";
  groupId?: string;
  groupName?: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: UserRole;
  isIncoming: boolean;
  autoAnswer: boolean; // true = tactical auto-pickup, false = manual approval
  status: "calling" | "ringing" | "connected" | "ended";
  duration: number; // in seconds
  isMuted: boolean;
  isSpeakerOn: boolean;
  participantCount?: number;
}

export interface FilterOptions {
  searchQuery: string;
  selectedRoles: UserRole[];
  selectedStatuses: MovementStatus[];
  selectedGroupId?: string;
  selectedTags?: string[];
  onlyActive: boolean;
  hasSosOnly: boolean;
  showAllAdminOversight?: boolean;
}

export type TabType = "home" | "messages" | "admin" | "about" | "user";

