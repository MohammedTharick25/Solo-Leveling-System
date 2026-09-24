import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CalendarDays,
  Check,
  ChevronDown,
  Flame,
  Gamepad2,
  Github,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  Play,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: ListChecks,
    title: "Daily Quests",
    text: "Turn important work into clear missions. Complete quests, earn XP, and keep your momentum visible.",
    accent: "cyan",
  },
  {
    icon: Flame,
    title: "Build Habits",
    text: "Create streaks that compound. Track consistency without turning your routine into another chore.",
    accent: "purple",
  },
  {
    icon: BarChart3,
    title: "See Your Stats",
    text: "Understand your progress through XP, ranks, activity, analytics, and personal growth signals.",
    accent: "cyan",
  },
  {
    icon: Swords,
    title: "Fight Bosses",
    text: "Break intimidating goals into boss battles and raids so difficult work feels actionable.",
    accent: "purple",
  },
  {
    icon: Brain,
    title: "Build Your Brain",
    text: "Capture knowledge, connect ideas, and keep the things you learn inside your personal system.",
    accent: "cyan",
  },
  {
    icon: Trophy,
    title: "Unlock Achievements",
    text: "Celebrate milestones, rank up, and make progress rewarding enough to come back tomorrow.",
    accent: "purple",
  },
];

const steps = [
  ["01", "Create your Hunter", "Set up your profile and define the person you want to become."],
  ["02", "Accept your quests", "Add tasks, habits, focus sessions, and goals to your System."],
  ["03", "Earn XP & rank up", "Complete meaningful work and watch your real-world progress become visible."],
];

const navItems = [
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["System", "#system"],
];

function GlowOrb({ className = "" }) {
  return <div className={`pointer-events-none absolute rounded-full blur-3xl ${className}`} />;
}

function FeatureCard({ feature, index }) {
  const Icon = feature.icon;
  const cyan = feature.accent === "cyan";
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.045]"
    >
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${
          cyan ? "bg-cyan-500/10" : "bg-violet-500/10"
        }`}
      />
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl border ${
          cyan
            ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
            : "border-violet-400/20 bg-violet-400/10 text-violet-300"
        }`}
      >
        <Icon size={20} strokeWidth={1.7} />
      </div>
      <h3 className="font-heading text-lg font-semibold tracking-wide text-white">{feature.title}</h3>
      <p className="mt-2 max-w-sm font-body text-sm leading-6 text-slate-400">{feature.text}</p>
      <div className="mt-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600 transition-colors group-hover:text-cyan-400/70">
        System module <ArrowRight size={12} />
      </div>
    </motion.article>
  );
}

function StatPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="absolute inset-x-10 -bottom-10 h-32 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-cyan-400/15 bg-[#060b17]/90 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_90%_100%,rgba(124,58,237,0.10),transparent_30%)]" />
        <div className="relative flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg" />
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.24em] text-cyan-400">The System</p>
              <p className="font-heading text-sm font-semibold text-slate-200">Hunter Command Center</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
            <span className="font-display text-[9px] tracking-[0.18em] text-emerald-300">SYSTEM ONLINE</span>
          </div>
        </div>

        <div className="relative grid gap-4 p-4 sm:grid-cols-[1.2fr_.8fr] sm:p-6">
          <div className="rounded-2xl border border-white/[0.06] bg-slate-950/70 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-[9px] uppercase tracking-[0.24em] text-slate-500">Current Hunter</p>
                <h3 className="mt-1 font-heading text-2xl font-semibold text-white">Awakened</h3>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/5 font-display text-sm text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,.12)]">
                LV. 27
              </div>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {[
                ["XP", "7,840", "cyan"],
                ["QUESTS", "42", "purple"],
                ["STREAK", "12d", "cyan"],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl border border-white/[0.05] bg-white/[0.025] p-3">
                  <p className="font-display text-[8px] tracking-[0.2em] text-slate-600">{label}</p>
                  <p className={`mt-1 font-heading text-lg ${tone === "cyan" ? "text-cyan-300" : "text-violet-300"}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.15em]">
                <span className="text-slate-500">Progress to next level</span>
                <span className="text-cyan-400">78%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <motion.div initial={{ width: 0 }} whileInView={{ width: "78%" }} viewport={{ once: true }} transition={{ duration: 1.1, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 shadow-[0_0_14px_rgba(34,211,238,.35)]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
            <div className="rounded-2xl border border-white/[0.06] bg-slate-950/70 p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[9px] tracking-[0.2em] text-slate-500">TODAY'S QUEST</span>
                <Target size={16} className="text-cyan-400" />
              </div>
              <p className="mt-4 font-heading text-base font-semibold text-slate-100">Deep Work Session</p>
              <p className="mt-1 text-xs text-slate-500">Complete 90 minutes of focused work.</p>
              <div className="mt-4 flex items-center justify-between text-[10px]">
                <span className="text-violet-300">+120 XP</span>
                <span className="rounded-full border border-cyan-400/15 bg-cyan-400/5 px-2 py-1 text-cyan-300">ACTIVE</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-slate-950/70 p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[9px] tracking-[0.2em] text-slate-500">STREAK</span>
                <Flame size={16} className="text-violet-300" />
              </div>
              <p className="mt-4 font-heading text-2xl font-semibold text-white">12 days</p>
              <p className="mt-1 text-xs text-slate-500">Consistency is becoming power.</p>
              <div className="mt-4 flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < 6 ? "bg-violet-400/70" : "bg-slate-800"}`} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#02050d] text-slate-100 selection:bg-cyan-400/20">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,.16),transparent_34%),radial-gradient(circle_at_85%_25%,rgba(124,58,237,.10),transparent_26%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(34,211,238,.022)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.022)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <GlowOrb className="left-[10%] top-[18rem] h-64 w-64 bg-cyan-500/5" />
      <GlowOrb className="right-[5%] top-[38rem] h-72 w-72 bg-violet-500/5" />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.05] bg-[#02050d]/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <img src="/logo.png" alt="Solo Leveling System" className="h-9 w-9 rounded-xl shadow-[0_0_24px_rgba(34,211,238,.12)]" />
            <div>
              <p className="font-display text-[11px] font-bold tracking-[0.2em] text-cyan-300">SOLO LEVELING</p>
              <p className="font-display text-[8px] tracking-[0.35em] text-slate-600">THE SYSTEM</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map(([label, href]) => <a key={href} href={href} className="font-heading text-xs font-medium tracking-wide text-slate-400 transition hover:text-white">{label}</a>)}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/login" className="px-4 py-2 font-heading text-xs font-semibold tracking-wide text-slate-400 transition hover:text-white">Login</Link>
            <Link to="/register" className="group flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 font-heading text-xs font-bold tracking-wide text-cyan-300 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 hover:shadow-[0_0_25px_rgba(34,211,238,.12)]">Start your journey <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></Link>
          </div>

          <button onClick={() => setMenuOpen((v) => !v)} className="rounded-lg border border-white/10 p-2 text-slate-300 sm:hidden" aria-label="Toggle menu">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/[0.05] bg-[#030712]/95 px-5 py-5 sm:hidden">
            <div className="flex flex-col gap-4">
              {navItems.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="font-heading text-sm text-slate-300">{label}</a>)}
              <div className="mt-1 flex gap-3 border-t border-white/[0.06] pt-4">
                <Link to="/login" className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-center font-heading text-xs text-slate-300">Login</Link>
                <Link to="/register" className="flex-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-center font-heading text-xs font-bold text-cyan-300">Begin Awakening</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative flex min-h-[760px] items-center overflow-hidden pt-28 sm:min-h-[850px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_42%,rgba(29,78,216,.16),transparent_38%),radial-gradient(ellipse_at_20%_70%,rgba(124,58,237,.08),transparent_34%)]" />
          <div className="absolute right-[-16rem] top-28 hidden h-[38rem] w-[38rem] rounded-full border border-cyan-400/[0.05] lg:block" />
          <div className="absolute right-[-10rem] top-40 hidden h-[30rem] w-[30rem] rounded-full border border-violet-400/[0.05] lg:block" />

          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-10 lg:py-24">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }} className="relative z-10">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-3.5 py-2 font-display text-[9px] tracking-[0.2em] text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,.05)]">
                <Sparkles size={12} /> YOUR PERSONAL EVOLUTION SYSTEM
              </div>
              <h1 className="max-w-3xl font-heading text-5xl font-semibold leading-[1.03] tracking-[-0.035em] text-white sm:text-6xl lg:text-[5.1rem]">
                Turn your life into a <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-violet-400 bg-clip-text text-transparent">quest.</span>
              </h1>
              <p className="mt-7 max-w-2xl font-body text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
                Solo Leveling System is a gamified productivity workspace that turns tasks, habits, goals, focus, and learning into one progression system — so you always know what to do next and why it matters.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="group inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/10 px-6 py-3.5 font-heading text-sm font-bold tracking-wide text-cyan-200 shadow-[0_0_35px_rgba(34,211,238,.08)] transition hover:bg-cyan-400/15 hover:shadow-[0_0_45px_rgba(34,211,238,.15)]">
                  Begin your awakening <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#system" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-6 py-3.5 font-heading text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05]">
                  <Play size={15} /> See the System
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                <span className="flex items-center gap-2"><Check size={13} className="text-cyan-400" /> Tasks & quests</span>
                <span className="flex items-center gap-2"><Check size={13} className="text-cyan-400" /> Habits & streaks</span>
                <span className="flex items-center gap-2"><Check size={13} className="text-cyan-400" /> Stats & progression</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: .96, x: 18 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: .8, delay: .15 }} className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute inset-0 rounded-[40px] bg-cyan-500/10 blur-[80px]" />
              <div className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-slate-950/75 p-2 shadow-2xl shadow-black/60">
                <img src="/og-image.jpg" alt="Solo Leveling System preview" className="aspect-[1.9/1] w-full rounded-[24px] object-cover object-center opacity-95" />
                <div className="absolute inset-x-7 bottom-7 rounded-2xl border border-white/10 bg-[#030712]/75 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-[9px] tracking-[0.2em] text-cyan-400">SYSTEM STATUS</p>
                      <p className="mt-1 font-heading text-sm font-semibold text-white">Progress becomes visible.</p>
                    </div>
                    <div className="rounded-lg border border-violet-400/20 bg-violet-400/10 px-3 py-2 font-display text-[9px] tracking-[0.15em] text-violet-300">LV. UP</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-white/10 bg-[#070c18]/90 px-4 py-3 shadow-xl backdrop-blur-xl sm:block">
                <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300"><Zap size={15} /></div><div><p className="font-display text-[8px] tracking-[0.18em] text-slate-600">TODAY</p><p className="font-heading text-xs font-semibold text-slate-200">+480 XP earned</p></div></div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-white/[0.05] bg-white/[0.012]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 py-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600 sm:gap-x-14 sm:px-8">
            <span className="flex items-center gap-2"><Gamepad2 size={13} /> Gamified productivity</span>
            <span className="flex items-center gap-2"><Target size={13} /> Goal focused</span>
            <span className="flex items-center gap-2"><Shield size={13} /> Personal workspace</span>
            <span className="flex items-center gap-2"><Moon size={13} /> Dark system UI</span>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="max-w-2xl">
            <p className="font-display text-[10px] font-semibold tracking-[0.28em] text-cyan-400">ONE SYSTEM. MANY MISSIONS.</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">Everything you need to keep moving forward.</h2>
            <p className="mt-4 font-body text-sm leading-7 text-slate-400 sm:text-base">Instead of jumping between disconnected productivity tools, build your personal progression inside one focused command center.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map((feature, index) => <FeatureCard key={feature.title} feature={feature} index={index} />)}</div>
        </section>

        <section id="system" className="relative overflow-hidden border-y border-white/[0.05] bg-[#030815] py-24 sm:py-32">
          <div className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-cyan-500/[0.06] blur-[100px]" />
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="font-display text-[10px] tracking-[0.28em] text-violet-300">THE COMMAND CENTER</p>
                <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your real life, translated into progression.</h2>
                <p className="mt-4 font-body text-sm leading-7 text-slate-400 sm:text-base">Every completed action feeds the same loop: do meaningful work, earn progress, understand yourself, and choose the next mission.</p>
              </div>
              <Link to="/register" className="group inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-white/10 bg-white/[0.025] px-4 py-2.5 font-heading text-xs font-semibold text-slate-300 transition hover:border-cyan-400/25 hover:text-cyan-300 sm:self-auto">Enter the System <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></Link>
            </div>
            <StatPreview />
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="font-display text-[10px] tracking-[0.28em] text-cyan-400">HOW IT WORKS</p>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">A simple loop for serious progress.</h2>
              <p className="mt-5 font-body text-sm leading-7 text-slate-400">The interface feels like a game, but the objective is real: make your days more intentional and your long-term growth easier to see.</p>
            </div>
            <div className="space-y-3">
              {steps.map(([number, title, text], index) => (
                <motion.div key={number} initial={{ opacity: 0, x: 15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .45, delay: index * .08 }} className="group grid grid-cols-[54px_1fr] gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-cyan-400/15 hover:bg-white/[0.035] sm:grid-cols-[64px_1fr] sm:p-6">
                  <div className="font-display text-sm tracking-[0.16em] text-slate-600 transition group-hover:text-cyan-400">{number}</div>
                  <div><h3 className="font-heading text-base font-semibold text-slate-100">{title}</h3><p className="mt-1.5 font-body text-sm leading-6 text-slate-500">{text}</p></div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 sm:pb-32">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[30px] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.07] via-slate-900/60 to-violet-500/[0.08] p-8 text-center shadow-2xl shadow-black/30 sm:p-14">
            <div className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[90px]" />
            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300"><Sparkles size={20} /></div>
              <p className="mt-6 font-display text-[10px] tracking-[0.28em] text-cyan-400">YOUR NEXT LEVEL STARTS HERE</p>
              <h2 className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-semibold tracking-tight text-white sm:text-5xl">Stop waiting for motivation. Build a System.</h2>
              <p className="mx-auto mt-5 max-w-xl font-body text-sm leading-7 text-slate-400">Create your Hunter profile, choose your first quest, and make progress visible from day one.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/10 px-6 py-3.5 font-heading text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/15">Begin Awakening <ArrowRight size={16} /></Link>
                <a href="https://github.com/MohammedTharick25/Solo-Leveling-System" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-6 py-3.5 font-heading text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05]"><Github size={16} /> View on GitHub</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.05] bg-[#02040a]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3"><img src="/logo.png" alt="" className="h-7 w-7 rounded-lg" /><div><p className="font-display text-[9px] tracking-[0.2em] text-slate-400">SOLO LEVELING SYSTEM</p><p className="mt-0.5 text-[10px] text-slate-600">Your personal evolution workspace.</p></div></div>
          <div className="flex flex-wrap items-center gap-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"><a href="#features" className="transition hover:text-slate-300">Features</a><a href="#how-it-works" className="transition hover:text-slate-300">How it works</a><Link to="/login" className="transition hover:text-slate-300">Login</Link><a href="https://github.com/MohammedTharick25/Solo-Leveling-System" target="_blank" rel="noreferrer" className="transition hover:text-slate-300">GitHub</a></div>
        </div>
      </footer>
    </div>
  );
}
