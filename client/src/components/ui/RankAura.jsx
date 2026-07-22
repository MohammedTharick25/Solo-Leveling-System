import { motion } from "framer-motion";

const RANK_CONFIGS = {
  S: { color: "rgba(6, 182, 212, 0.2)", particles: "❄️" },
  National: { color: "rgba(234, 179, 8, 0.2)", particles: "✨" },
  Monarch: { color: "rgba(168, 85, 247, 0.2)", particles: "🔥" },
  "Shadow Monarch": { color: "rgba(0, 0, 0, 0.4)", particles: "⬛" },
  default: { color: "rgba(71, 85, 105, 0.1)", particles: "🔹" },
};

export const RankAura = ({ rank }) => {
  const config = RANK_CONFIGS[rank] || RANK_CONFIGS.default;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Radiant Glow */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        style={{
          background: `radial-gradient(circle at 50% 50%, ${config.color} 0%, transparent 70%)`,
        }}
        className="absolute inset-0"
      />

      {/* Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: "110vh", x: Math.random() * 100 + "vw", opacity: 0 }}
          animate={{ y: "-10vh", opacity: [0, 0.8, 0] }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            delay: Math.random() * 10,
          }}
          className="absolute text-xs"
        >
          {config.particles}
        </motion.div>
      ))}
    </div>
  );
};
