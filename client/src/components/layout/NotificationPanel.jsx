/**
 * NotificationPanel — Bell dropdown
 *
 * Shows ALL notifications fetched from server (read + unread).
 * Unread ones have a coloured dot + bold text.
 * Clicking any notification marks it as read on server + updates local state.
 * "Mark all read" clears the badge count.
 *
 * Completely separate from the bottom-right toast overlay.
 */
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";

const TYPE_ACCENT = {
  levelUp: "bg-yellow-400",
  rankUp: "bg-purple-400",
  questCompleted: "bg-emerald-400",
  questAssigned: "bg-indigo-400",
  bossAppeared: "bg-red-400",
  bossDefeated: "bg-yellow-400",
  shadowEvolved: "bg-cyan-400",
  shadowUnlocked: "bg-cyan-400",
  achievementUnlocked: "bg-yellow-400",
  streakMilestone: "bg-orange-400",
  systemAlert: "bg-cyan-400",
  systemWarning: "bg-red-400",
  weeklyReport: "bg-purple-400",
  dungeonCompleted: "bg-emerald-400",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function NotificationPanel({ onClose }) {
  const {
    markNotifRead,
    clearUnread,
    setNotifications,
    notifications,
    unreadCount,
  } = useHunterStore();
  const panelRef = useRef(null);

  // Fetch ALL notifications from server (read + unread, newest first)
  const { isLoading } = useQuery({
    queryKey: ["notifications-panel"],
    queryFn: async () => {
      const { data } = await api.get("/notifications?limit=50");
      setNotifications(data.data.notifications, data.data.unreadCount);
      return data.data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => clearUnread(),
  });

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    const timeout = setTimeout(
      () => document.addEventListener("mousedown", handler),
      150,
    );
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const handleMarkRead = (notif) => {
    if (notif.isRead) return;
    markNotifRead(notif._id);
    api.patch(`/notifications/${notif._id}/read`).catch(() => {});
  };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden
                 border border-slate-700/60
                 bg-slate-950/98 backdrop-blur-xl
                 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
      style={{ zIndex: 99999 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3
                      border-b border-slate-800/70 bg-slate-900/50"
      >
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-cyan-400" />
          <span className="font-heading font-semibold text-sm text-slate-100">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              className="min-w-[18px] h-[18px] px-1 rounded-full
                              bg-cyan-500/20 border border-cyan-500/40
                              text-cyan-400 text-[9px] font-bold font-display
                              flex items-center justify-center"
            >
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              title="Mark all as read"
              className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400
                         hover:bg-cyan-500/10 transition-all"
            >
              <CheckCheck size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200
                       hover:bg-slate-800 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Notification list — ALL notifications */}
      <div className="max-h-[440px] overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div
              className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50
                            flex items-center justify-center mb-3"
            >
              <Bell size={20} className="text-slate-600" />
            </div>
            <p className="font-heading font-semibold text-sm text-slate-400">
              No notifications yet
            </p>
            <p className="font-body text-xs text-slate-600 mt-1">
              Complete quests and level up to receive system alerts.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {notifications.map((notif) => (
              <button
                key={notif._id}
                onClick={() => handleMarkRead(notif)}
                className={`w-full text-left p-3 rounded-xl flex items-start gap-3
                            transition-all duration-200 group
                            ${
                              notif.isRead
                                ? "opacity-50 hover:opacity-70 hover:bg-slate-800/30"
                                : "hover:bg-slate-800/60 bg-slate-800/20"
                            }`}
              >
                {/* Unread dot / read indicator */}
                <div className="mt-1.5 shrink-0">
                  {notif.isRead ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  ) : (
                    <div
                      className={`w-1.5 h-1.5 rounded-full
                                      ${TYPE_ACCENT[notif.type] || "bg-cyan-400"}
                                      shadow-[0_0_4px_currentColor]`}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`font-heading text-xs font-semibold leading-snug
                                  ${notif.isRead ? "text-slate-500" : "text-slate-200"}`}
                  >
                    {notif.title}
                  </p>
                  <p
                    className={`font-body text-xs mt-0.5 leading-relaxed line-clamp-2
                                  ${notif.isRead ? "text-slate-600" : "text-slate-400"}`}
                  >
                    {notif.message}
                  </p>
                  <p className="font-body text-[10px] text-slate-700 mt-1">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>

                {/* "Mark read" hint for unread items */}
                {!notif.isRead && (
                  <span
                    className="font-body text-[9px] text-slate-600
                                   group-hover:text-slate-400 transition-colors
                                   shrink-0 mt-1"
                  >
                    tap
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-800/60 bg-slate-900/30">
          <p className="font-body text-[10px] text-slate-600 text-center">
            {unreadCount > 0
              ? `${unreadCount} unread · tap to mark as read`
              : "All notifications read"}
          </p>
        </div>
      )}
    </motion.div>
  );
}
