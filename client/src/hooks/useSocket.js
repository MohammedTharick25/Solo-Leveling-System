import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useHunterStore } from "../stores/hunterStore.js";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_BY_TYPE = {
  questAssigned: "questUpdates",
  questCompleted: "questUpdates",
  questFailed: "questUpdates",
  levelUp: "progression",
  rankUp: "progression",
  shadowUnlocked: "progression",
  shadowEvolved: "progression",
  bossAppeared: "progression",
  bossDefeated: "progression",
  dungeonCompleted: "progression",
  achievementUnlocked: "progression",
  streakMilestone: "progression",
  systemWarning: "progression",
  systemUpdate: "progression",
  weeklyReport: "weeklyReports",
  friendRequest: "social",
  friendAccepted: "social",
  guildInvite: "social",
  guildChallenge: "social",
};

const eventCategory = (event) => {
  if (event === "system:quest-assigned" || event === "system:daily-quests-complete") return "questUpdates";
  if (event === "system:level-up" || event === "system:rank-up" || event === "system:shadow-unlocked" || event === "system:shadow-evolved" || event === "system:boss-appeared" || event === "system:boss-defeated" || event === "system:achievement" || event === "system:streak-broken" || event === "dungeon:completed" || event === "dungeon:entered") return "progression";
  return "progression";
};

const canInApp = (category) => {
  const settings = useHunterStore.getState().settings?.notifications;
  if (!settings) return true;
  return settings.enabled !== false && settings.inApp !== false && settings[category] !== false;
};

const canDesktop = (category) => {
  const settings = useHunterStore.getState().settings?.notifications;
  return Boolean(settings?.enabled !== false && settings?.desktop && settings?.[category] !== false);
};

const showDesktopNotification = async (title, message, tag, category) => {
  if (!canDesktop(category || eventCategory(tag))) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, {
        body: message,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: `solo-${tag}`,
      });
    } else {
      new Notification(title, { body: message, icon: "/icon-192.png", tag: `solo-${tag}` });
    }
  } catch {}
};

const deliverSystemEvent = (event, title, message, pushToast) => {
  const category = eventCategory(event);
  if (canInApp(category)) pushToast(eventToToastType(event), title, message, { incrementUnread: false });
  if (canDesktop(category)) showDesktopNotification(title, message, event, category);
};

const eventToToastType = (event) => {
  const map = {
    "system:level-up": "levelUp",
    "system:rank-up": "rankUp",
    "system:shadow-unlocked": "shadowUnlocked",
    "system:shadow-evolved": "shadowEvolved",
    "system:boss-appeared": "bossAppeared",
    "system:boss-defeated": "bossDefeated",
    "system:achievement": "achievementUnlocked",
    "system:streak-broken": "systemWarning",
    "system:quest-assigned": "questAssigned",
    "system:daily-quests-complete": "questCompleted",
    "dungeon:completed": "questCompleted",
    "dungeon:entered": "questCompleted",
  };
  return map[event] || "systemAlert";
};

export const useSocket = () => {
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const token = useHunterStore((state) => state.token);

  useEffect(() => {
    if (!token) return undefined;

    const store = useHunterStore.getState();
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => console.log("[SOCKET] Connected to The System"));
    socket.on("connect_error", (err) => console.warn("[SOCKET] Connection error:", err.message));

    socket.on("notification:new", (notification) => {
      const category = notification.metadata?.event === "login" || notification.metadata?.event === "password-reset"
        ? "securityAlerts"
        : CATEGORY_BY_TYPE[notification.type] || "progression";
      const settings = useHunterStore.getState().settings?.notifications;
      const enabled = !settings || (settings.enabled !== false && settings[category] !== false);

      if (!enabled) return;

      if (settings?.inApp !== false) {
        useHunterStore.getState().addNotification(notification);
      }
      if (settings?.desktop) {
        showDesktopNotification(notification.title, notification.message, notification.type, category);
      }
      queryClient.invalidateQueries({ queryKey: ["notifications-badge"] });
    });

    socket.on("system:level-up", (data) => {
      if (canInApp("progression")) store.triggerLevelUp(data);
      deliverSystemEvent("system:level-up", `LEVEL UP — ${data.newLevel}`, `+${data.xpEarned} XP earned. Keep pushing.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    socket.on("system:rank-up", (data) => {
      if (canInApp("progression")) store.triggerRankUp(data);
      deliverSystemEvent("system:rank-up", `RANK PROMOTION — ${data.newRank}`, `You have ascended from ${data.previousRank} to ${data.newRank} Rank.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    socket.on("system:quest-assigned", ({ count }) => {
      deliverSystemEvent("system:quest-assigned", "DAILY QUESTS ASSIGNED", `${count} new quests assigned. Complete all 5 to maintain your streak.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["quests"] });
    });

    socket.on("system:streak-broken", ({ lostStreak, xpPenalty }) => {
      deliverSystemEvent("system:streak-broken", "⚠️ STREAK BROKEN", `Your ${lostStreak}-day streak has ended. −${xpPenalty} XP penalty.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    socket.on("system:shadow-unlocked", ({ shadow }) => {
      deliverSystemEvent("system:shadow-unlocked", "SHADOW UNLOCKED", `${shadow.name} has emerged from the abyss.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["shadows"] });
    });

    socket.on("system:shadow-evolved", ({ shadow }) => {
      deliverSystemEvent("system:shadow-evolved", "SHADOW EVOLUTION", `${shadow.name} has evolved to ${shadow.evolutionStage}.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["shadows"] });
    });

    socket.on("system:boss-appeared", ({ boss }) => {
      deliverSystemEvent("system:boss-appeared", "⚠️ BOSS APPEARED", `${boss.name} has manifested. Defeat it to claim rare rewards.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["boss"] });
    });

    socket.on("system:boss-defeated", ({ boss }) => {
      deliverSystemEvent("system:boss-defeated", "BOSS DEFEATED", `${boss.name} has been vanquished. "${boss.titleReward}" title unlocked.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["boss"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    socket.on("system:achievement", ({ achievement }) => {
      deliverSystemEvent("system:achievement", `ACHIEVEMENT — ${achievement.name}`, achievement.description, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    });

    socket.on("dungeon:completed", ({ dungeon }) => {
      deliverSystemEvent("dungeon:completed", "DUNGEON CLEARED", `${dungeon.name} has been conquered.`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["dungeons"] });
    });

    socket.on("system:daily-quests-complete", ({ total }) => {
      deliverSystemEvent("system:daily-quests-complete", "🎉 ALL DAILY QUESTS COMPLETE", `All ${total || "daily"} quests completed. Streak maintained!`, store.pushToast);
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-quests-today"] });
    });

    socket.on("disconnect", () => console.log("[SOCKET] Disconnected from The System"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, queryClient]);

  return socketRef.current;
};
