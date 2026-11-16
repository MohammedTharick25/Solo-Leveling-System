import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { PALETTES, getPalette, setPalette } from "../../lib/palette.js";

export default function PaletteSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(getPalette);
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onChange = (e) => setActive(e.detail);
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("sl-palette-change", onChange);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("sl-palette-change", onChange);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change color palette"
        aria-haspopup="menu"
        aria-expanded={open}
        className="press relative rounded-xl p-2 text-slate-400 transition-colors duration-200 hover:bg-white/5 hover:text-slate-100"
      >
        <Palette size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute right-0 top-full z-[300] mt-2 w-56 origin-top-right p-1.5 shadow-lg"
          >
            {PALETTES.map((p) => (
              <button
                key={p.id}
                role="menuitemradio"
                aria-checked={active === p.id}
                type="button"
                onClick={() => { setPalette(p.id); setOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
              >
                <span
                  aria-hidden="true"
                  className="h-6 w-6 shrink-0 rounded-full ring-1 ring-white/20"
                  style={{ background: `linear-gradient(135deg, ${p.swatch[0]} 50%, ${p.swatch[1]} 50%)` }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-sm font-medium text-slate-100">{p.name}</span>
                  <span className="block text-xs text-slate-500">{p.hint}</span>
                </span>
                {active === p.id && <Check size={15} className="text-cyan-300" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
