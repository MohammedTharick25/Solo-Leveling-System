// ── Page transitions ──────────────────────────────────────────────────────
export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// ── Fade in up ────────────────────────────────────────────────────────────
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: "easeOut" },
};

// ── Stagger container ─────────────────────────────────────────────────────
export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ── Scale in ──────────────────────────────────────────────────────────────
export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { type: "spring", stiffness: 300, damping: 24 },
};

// ── Slide in from right ───────────────────────────────────────────────────
export const slideInRight = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
  transition: { duration: 0.3, ease: "easeOut" },
};

// ── Slide in from left ────────────────────────────────────────────────────
export const slideInLeft = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.3, ease: "easeOut" },
};

// ── Level-up cinematic ────────────────────────────────────────────────────
export const levelUpOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.5 } },
};

export const levelUpContent = {
  initial: { scale: 0.4, opacity: 0, rotate: -10 },
  animate: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 220, damping: 18, delay: 0.2 },
  },
  exit: { scale: 1.1, opacity: 0, transition: { duration: 0.4 } },
};

export const levelUpNumber = {
  initial: { opacity: 0, y: 30, scale: 0.5 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.6, duration: 0.5, ease: "easeOut" },
  },
};

// ── Rank-up cinematic ─────────────────────────────────────────────────────
export const rankUpOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.6 } },
};

export const rankUpBadge = {
  initial: { scale: 0, rotate: -20, opacity: 0 },
  animate: {
    scale: [0, 1.3, 1],
    rotate: [-20, 5, 0],
    opacity: 1,
    transition: { delay: 0.3, duration: 0.7, ease: "easeOut" },
  },
};

export const rankUpText = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { delay: 0.9, duration: 0.5 } },
};

// ── System notification ───────────────────────────────────────────────────
export const notifVariants = {
  initial: { opacity: 0, x: 60, scale: 0.95 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
  exit: { opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } },
};

// ── Pulse glow (for repeated calls) ──────────────────────────────────────
export const pulseGlow = {
  animate: {
    boxShadow: [
      "0 0 8px rgba(34,211,238,0.2)",
      "0 0 24px rgba(34,211,238,0.6)",
      "0 0 8px rgba(34,211,238,0.2)",
    ],
    transition: { duration: 2, repeat: Infinity },
  },
};

// ── Card hover ────────────────────────────────────────────────────────────
export const cardHover = {
  rest: { scale: 1, transition: { duration: 0.2 } },
  hover: { scale: 1.015, transition: { duration: 0.2 } },
};

// ── Modal backdrop + panel ────────────────────────────────────────────────
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const modalPanel = {
  initial: { opacity: 0, scale: 0.93, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
};
