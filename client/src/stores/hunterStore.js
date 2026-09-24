import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

let toastIdCounter = 0;

export const useHunterStore = create(
  persist(
    (set, get) => ({
      // ── Auth ─────────────────────────────────────────────────────────
      token: null,
      user: null,
      settings: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user, ...(user?.settings ? { settings: user.settings } : {}) }),
      setSettings: (settings) => set({ settings }),

      // ── Hunter ───────────────────────────────────────────────────────
      hunter: null,
      stats: null,
      setHunter: (hunter) => set({ hunter }),
      setStats: (stats) => set({ stats }),

      // ── Bell panel notifications (all, from server) ───────────────────
      // These are fetched from the API and shown in the bell dropdown
      notifications: [],
      unreadCount: 0,

      setNotifications: (notifications, unreadCount) =>
        set({ notifications, unreadCount }),

      setUnreadCount: (unreadCount) => set({ unreadCount }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications.filter((n) => n._id !== notification._id)].slice(0, 50),
          unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
        })),

      markNotifRead: (id) =>
        set((state) => {
          const notif = state.notifications.find((n) => n._id === id);
          if (!notif || notif.isRead) return {};
          return {
            notifications: state.notifications.map((n) =>
              n._id === id ? { ...n, isRead: true } : n,
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        }),

      clearUnread: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
          })),
          unreadCount: 0,
        })),

      // ── Toast queue (real-time socket events only) ────────────────────
      // These are ephemeral — only shown in the bottom-right overlay
      // They are NOT stored in the bell panel
      toastQueue: [],

      pushToast: (type, title, message, options = {}) =>
        set((state) => ({
          toastQueue: [
            {
              id: ++toastIdCounter,
              type,
              title,
              message,
              createdAt: Date.now(),
            },
            ...state.toastQueue,
          ].slice(0, 5),
          // Toasts are ephemeral UI. Server notifications are responsible for unread counts.
          unreadCount: state.unreadCount + (options.incrementUnread === true ? 1 : 0),
        })),

      removeToast: (id) =>
        set((state) => ({
          toastQueue: state.toastQueue.filter((t) => t.id !== id),
        })),

      // ── Level-up / Rank-up cinematics ─────────────────────────────────
      levelUpData: null,
      rankUpData: null,
      triggerLevelUp: (data) => set({ levelUpData: data }),
      clearLevelUp: () => set({ levelUpData: null }),
      triggerRankUp: (data) => set({ rankUpData: data }),
      clearRankUp: () => set({ rankUpData: null }),

      // ── Clear all on logout ───────────────────────────────────────────
      clearAuth: () =>
        set({
          token: null,
          user: null,
          settings: null,
          hunter: null,
          stats: null,
          notifications: [],
          unreadCount: 0,
          toastQueue: [],
          levelUpData: null,
          rankUpData: null,
        }),
    }),
    {
      name: "solo-leveling-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user, settings: state.settings }),
    },
  ),
);
