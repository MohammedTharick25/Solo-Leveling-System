import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useHunterStore } from "../stores/hunterStore.js";
import { queryClient } from "../lib/queryClient.js";

export const useSocket = () => {
  const socketRef = useRef(null);
  const { token, pushToast, triggerLevelUp, triggerRankUp } = useHunterStore();

  useEffect(() => {
    if (!token) return;

    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      },
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[SOCKET] Connected to The System");
    });

    socket.on("connect_error", (err) => {
      console.warn("[SOCKET] Connection error:", err.message);
    });

    // ── Level Up — triggers cinematic + toast ───────────────────────────
    socket.on("system:level-up", (data) => {
      triggerLevelUp(data);
      pushToast(
        "levelUp",
        `LEVEL UP — ${data.newLevel}`,
        `+${data.xpEarned} XP earned. Keep pushing.`,
      );
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    // ── Rank Up — triggers cinematic + toast ────────────────────────────
    socket.on("system:rank-up", (data) => {
      triggerRankUp(data);
      pushToast(
        "rankUp",
        `RANK PROMOTION — ${data.newRank}`,
        `You have ascended from ${data.previousRank} to ${data.newRank} Rank.`,
      );
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    // ── Quest events ────────────────────────────────────────────────────
    socket.on("system:quest-assigned", ({ count }) => {
      pushToast(
        "questAssigned",
        "DAILY QUESTS ASSIGNED",
        `${count} new quests assigned. Complete all 5 to maintain your streak.`,
      );
      queryClient.invalidateQueries({ queryKey: ["quests"] });
    });

    socket.on("system:daily-quests-complete", ({ total }) => {
      pushToast(
        "questCompleted",
        "🎉 ALL DAILY QUESTS COMPLETE",
        `All ${total} quests completed. Streak maintained!`,
      );
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    socket.on("system:streak-broken", ({ lostStreak, xpPenalty }) => {
      pushToast(
        "systemWarning",
        "⚠️ STREAK BROKEN",
        `Your ${lostStreak}-day streak has ended. −${xpPenalty} XP penalty.`,
      );
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    // ── Shadow events ───────────────────────────────────────────────────
    socket.on("system:shadow-unlocked", ({ shadow }) => {
      pushToast(
        "shadowUnlocked",
        "SHADOW UNLOCKED",
        `${shadow.name} has emerged from the abyss.`,
      );
      queryClient.invalidateQueries({ queryKey: ["shadows"] });
    });

    socket.on("system:shadow-evolved", ({ shadow }) => {
      pushToast(
        "shadowEvolved",
        "SHADOW EVOLUTION",
        `${shadow.name} has evolved to ${shadow.evolutionStage}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["shadows"] });
    });

    // ── Boss events ─────────────────────────────────────────────────────
    socket.on("system:boss-appeared", ({ boss }) => {
      pushToast(
        "bossAppeared",
        `⚠️ BOSS APPEARED`,
        `${boss.name} has manifested. Defeat it to claim rare rewards.`,
      );
      queryClient.invalidateQueries({ queryKey: ["boss"] });
    });

    socket.on("system:boss-defeated", ({ boss }) => {
      pushToast(
        "bossDefeated",
        "BOSS DEFEATED",
        `${boss.name} has been vanquished. "${boss.titleReward}" title unlocked.`,
      );
      queryClient.invalidateQueries({ queryKey: ["boss"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    });

    // ── Achievement ─────────────────────────────────────────────────────
    socket.on("system:achievement", ({ achievement }) => {
      pushToast(
        "achievementUnlocked",
        `ACHIEVEMENT — ${achievement.name}`,
        achievement.description,
      );
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    });

    // ── Dungeon completed ───────────────────────────────────────────────
    socket.on("dungeon:completed", ({ dungeon }) => {
      pushToast(
        "questCompleted",
        "DUNGEON CLEARED",
        `${dungeon.name} has been conquered.`,
      );
      queryClient.invalidateQueries({ queryKey: ["dungeons"] });
    });

    socket.on("disconnect", () => {
      console.log("[SOCKET] Disconnected from The System");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef.current;
};
