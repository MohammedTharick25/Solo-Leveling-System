import { Link } from "react-router-dom";
import { ArrowLeft, Compass, Search } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4 py-12 text-center">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-60" />
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-3xl" />
      <section className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/75 p-7 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-12">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200"><Compass size={28} /></div>
        <p className="mt-7 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">System signal lost</p>
        <p className="mt-2 font-display text-6xl font-black tracking-tight text-white sm:text-7xl">404</p>
        <h1 className="mt-3 font-heading text-2xl font-bold text-white">This page isn’t on your map.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">The address may have changed or the page may no longer exist. Head back to your Command Center and continue your journey.</p>
        <Link to="/dashboard" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-200"><ArrowLeft size={16} /> Return to Command Center</Link>
        <div className="mt-7 flex items-center justify-center gap-2 text-[11px] text-slate-600"><Search size={13} /> Check the address and try again</div>
      </section>
    </main>
  );
}
