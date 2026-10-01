import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, LockKeyhole, ShieldAlert } from "lucide-react";

export default function RestrictedPage() {
  const [params] = useSearchParams();
  const message = params.get("message");
  return (
    <main className="relative grid min-h-[65vh] place-items-center overflow-hidden px-2 py-8 sm:min-h-[72vh] sm:px-4">
      <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-amber-300/[0.07] blur-3xl" />
      <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-amber-200/15 bg-gradient-to-br from-slate-950 via-slate-950 to-amber-950/20 p-6 text-center shadow-2xl shadow-black/30 sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-amber-200/20 bg-amber-200/[0.08] text-amber-100"><LockKeyhole size={26} /></div>
        <p className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-200"><ShieldAlert size={13} /> Access restricted</p>
        <h1 className="mt-3 font-heading text-2xl font-black text-white sm:text-3xl">This area needs more access.</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">{message || "Your current plan does not include this feature. Compare plans to see which one unlocks it."}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/billing" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-200 px-5 text-sm font-black text-slate-950 transition hover:bg-amber-100">View plans <ArrowRight size={15} /></Link>
          <Link to="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.05]">Back to Command Center</Link>
        </div>
      </section>
    </main>
  );
}
