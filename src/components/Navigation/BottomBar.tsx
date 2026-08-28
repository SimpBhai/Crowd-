import React from "react";
import { Home, MessageSquare, Shield, Info, User as UserIcon, PhoneCall } from "lucide-react";
import { TabType, UserRecord } from "../../types";

interface BottomBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  currentUser: UserRecord | null;
  unreadMessagesCount: number;
  hasActiveCall: boolean;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  unreadMessagesCount,
  hasActiveCall,
}) => {
  const isAdminOrSuper = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 h-20 bg-white border-t border-slate-200 px-4 shadow-xl flex items-center justify-center"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <div className="w-full max-w-lg flex items-center justify-around">
        {/* Home / Radar Map */}
        <button
          id="nav-tab-home"
          onClick={() => onTabChange("home")}
          className="flex flex-col items-center gap-1 group transition"
        >
          <div
            className={`p-2 rounded-xl transition-colors ${
              currentTab === "home"
                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                : "text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50"
            }`}
          >
            <Home className="w-5 h-5" />
          </div>
          <span
            className={`text-[10px] font-bold tracking-wider ${
              currentTab === "home" ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-600"
            }`}
          >
            HOME
          </span>
        </button>

        {/* Messages & Direct Call */}
        <button
          id="nav-tab-messages"
          onClick={() => onTabChange("messages")}
          className="relative flex flex-col items-center gap-1 group transition"
        >
          <div
            className={`p-2 rounded-xl transition-colors ${
              currentTab === "messages"
                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                : "text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50"
            }`}
          >
            {hasActiveCall ? (
              <PhoneCall className="w-5 h-5 text-emerald-500 animate-pulse" />
            ) : (
              <MessageSquare className="w-5 h-5" />
            )}
          </div>
          <span
            className={`text-[10px] font-bold tracking-wider ${
              currentTab === "messages"
                ? "text-indigo-600"
                : "text-slate-400 group-hover:text-indigo-600"
            }`}
          >
            MESSAGES
          </span>

          {unreadMessagesCount > 0 && !hasActiveCall && (
            <span className="absolute -top-1 right-0 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
              {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
            </span>
          )}

          {hasActiveCall && (
            <span className="absolute -top-0.5 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>

        {/* Admin & System Logs (Super Admin / Admin) */}
        {isAdminOrSuper && (
          <button
            id="nav-tab-admin"
            onClick={() => onTabChange("admin")}
            className="flex flex-col items-center gap-1 group transition"
          >
            <div
              className={`p-2 rounded-xl transition-colors ${
                currentTab === "admin"
                  ? "bg-indigo-50 text-indigo-600 shadow-sm"
                  : "text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50"
              }`}
            >
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <span
              className={`text-[10px] font-bold tracking-wider ${
                currentTab === "admin"
                  ? "text-indigo-600"
                  : "text-slate-400 group-hover:text-indigo-600"
              }`}
            >
              LOGS
            </span>
          </button>
        )}

        {/* About */}
        <button
          id="nav-tab-about"
          onClick={() => onTabChange("about")}
          className="flex flex-col items-center gap-1 group transition"
        >
          <div
            className={`p-2 rounded-xl transition-colors ${
              currentTab === "about"
                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                : "text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50"
            }`}
          >
            <Info className="w-5 h-5" />
          </div>
          <span
            className={`text-[10px] font-bold tracking-wider ${
              currentTab === "about"
                ? "text-indigo-600"
                : "text-slate-400 group-hover:text-indigo-600"
            }`}
          >
            ABOUT
          </span>
        </button>

        {/* User Page */}
        <button
          id="nav-tab-user"
          onClick={() => onTabChange("user")}
          className="flex flex-col items-center gap-1 group transition"
        >
          <div
            className={`p-2 rounded-xl transition-colors ${
              currentTab === "user"
                ? "bg-indigo-50 text-indigo-600 shadow-sm"
                : "text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50"
            }`}
          >
            <UserIcon className="w-5 h-5" />
          </div>
          <span
            className={`text-[10px] font-bold tracking-wider ${
              currentTab === "user" ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-600"
            }`}
          >
            USER
          </span>
        </button>
      </div>
    </nav>
  );
};
