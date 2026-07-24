import { motion, useMotionValue, useTransform } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, RadarChart as ReRadar } from 'recharts';
import CountUp from 'react-countup';

// 1. 3D Tilt Effect Wrapper
export const TiltCard = ({ children }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - (rect.left + rect.width / 2));
        y.set(e.clientY - (rect.top + rect.height / 2));
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, perspective: 1000 }}
      className="transition-all duration-200 ease-out"
    >
      {children}
    </motion.div>
  );
};

// 2. Power Radar Chart
export const PowerRadar = ({ stats }) => {
  // Defensive check: if stats is missing, use an empty object
  const s = stats || {};

  const data = [
    { name: "STR", val: s.strength?.value || 0 },
    { name: "AGI", val: s.agility?.value || 0 },
    { name: "INT", val: s.intelligence?.value || 0 },
    { name: "VIT", val: s.vitality?.value || 0 },
    { name: "SEN", val: s.sense?.value || 0 },
    { name: "DIS", val: s.discipline?.value || 0 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
          />
          <Radar
            dataKey="val"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Glitch Text Effect
export const GlitchText = ({ text }) => (
  <div className="relative inline-block">
    <span className="relative z-10">{text}</span>
    <motion.span 
      animate={{ opacity: [0, 1, 0], x: [-2, 2, -2] }}
      transition={{ repeat: Infinity, duration: 0.2 }}
      className="absolute top-0 left-0 text-red-500/30 z-0"
    >
      {text}
    </motion.span>
    </div>
);

export const SystemLog = ({ events }) => {
  return (
    <div className="font-mono text-[10px] space-y-1 bg-black/40 p-4 rounded-lg border border-slate-800 h-40 overflow-y-auto custom-scrollbar">
      <div className="text-cyan-500 mb-2 border-b border-cyan-900 pb-1">-- SYSTEM ACTIVITY LOG --</div>
      {events.map((log, i) => (
        <motion.div 
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          key={i} 
          className="flex gap-2"
        >
          <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
          <span className={log.type === 'gain' ? 'text-green-400' : 'text-blue-400'}>
            {log.text}
          </span>
        </motion.div>
      ))}
      <motion.div 
        animate={{ opacity: [0, 1] }} 
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="w-2 h-3 bg-cyan-500 inline-block ml-1"
      />
    </div>
  );
};