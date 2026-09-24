import { useCallback } from "react";
import { useHunterStore } from "../stores/hunterStore.js";

// Synthesised sounds using Web Audio API — no external files needed
const createAudioContext = () => {
  if (typeof window === "undefined") return null;
  return new (window.AudioContext || window.webkitAudioContext)();
};

const playTone = (ctx, frequency, duration, type = "sine", gain = 0.15) => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

export const useAudio = () => {
  const soundEnabled = useHunterStore((state) => state.settings?.preferences?.soundEffects !== false);

  const playQuestComplete = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = createAudioContext();
      playTone(ctx, 523, 0.15, "sine", 0.12);
      setTimeout(() => playTone(ctx, 659, 0.15, "sine", 0.1), 150);
      setTimeout(() => playTone(ctx, 784, 0.3, "sine", 0.12), 300);
    } catch {}
  }, [soundEnabled]);

  const playLevelUp = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = createAudioContext();
      [523, 587, 659, 698, 784].forEach((freq, i) => {
        setTimeout(() => playTone(ctx, freq, 0.2, "sine", 0.1), i * 100);
      });
      setTimeout(() => playTone(ctx, 1047, 0.5, "sine", 0.15), 550);
    } catch {}
  }, [soundEnabled]);

  const playRankUp = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = createAudioContext();
      [392, 494, 587, 740, 988].forEach((freq, i) => {
        setTimeout(() => playTone(ctx, freq, 0.25, "triangle", 0.12), i * 120);
      });
      setTimeout(() => playTone(ctx, 1175, 0.8, "sine", 0.18), 650);
    } catch {}
  }, [soundEnabled]);

  const playNotification = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = createAudioContext();
      playTone(ctx, 800, 0.1, "sine", 0.08);
      setTimeout(() => playTone(ctx, 1000, 0.1, "sine", 0.07), 120);
    } catch {}
  }, [soundEnabled]);

  const playShadowEvolve = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = createAudioContext();
      [220, 277, 330, 415, 554].forEach((freq, i) => {
        setTimeout(() => playTone(ctx, freq, 0.3, "sawtooth", 0.06), i * 80);
      });
    } catch {}
  }, [soundEnabled]);

  const playClick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = createAudioContext();
      playTone(ctx, 600, 0.05, "square", 0.04);
    } catch {}
  }, [soundEnabled]);

  return {
    playQuestComplete,
    playLevelUp,
    playRankUp,
    playNotification,
    playShadowEvolve,
    playClick,
  };
};
