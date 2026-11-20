import { Link } from 'react-router-dom';
import {
  ArrowRight, Users, Scale, Network, HandCoins, Sparkles, PiggyBank, ShieldCheck, Check,
  Plane, House, Utensils, Briefcase, PartyPopper, GraduationCap, Bell, BarChart3,
} from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import SplitDemo from '../components/landing/SplitDemo';
import { Reveal } from '../components/motion';
import { useAuth } from '../context/AuthContext';

const occasions = [
  { icon: House, text: 'Roommates' }, { icon: Plane, text: 'Trips' }, { icon: Utensils, text: 'Dinners' },
  { icon: Briefcase, text: 'Office lunches' }, { icon: PartyPopper, text: 'Parties' }, { icon: GraduationCap, text: 'Hostels' },
];

const steps = [
  { n: '01', title: 'Create a group', text: 'Add roommates, friends or family by email or a share code.' },
  { n: '02', title: 'Add expenses', text: 'Say who paid and how to split it. Four ways, always exact.' },
  { n: '03', title: 'Settle up', text: 'See exactly who pays whom in the fewest payments, then mark it done.' },
];

function FloatingChip({ className = '', children, delay = '' }) {
  return (
    <div className={`glass absolute z-10 hidden items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs shadow-[0_18px_36px_-14px_rgb(var(--brand-rgb)/0.4)] xl:flex ${delay} ${className}`}>
      {children}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* Background glow blobs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] overflow-hidden">
        <div className="absolute -left-24 top-10 h-96 w-96 animate-drift rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-[28rem] w-[28rem] animate-drift rounded-full bg-fuchsia-400/25 blur-3xl [animation-delay:-6s]" />
        <div className="absolute left-1/3 top-72 h-80 w-80 animate-drift rounded-full bg-sky-300/25 blur-3xl [animation-delay:-12s]" />
        <div className="absolute inset-0 [background-image:radial-gradient(rgb(var(--brand-rgb)/0.18)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
      </div>

      <header className="glass sticky top-3 z-30 mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 shadow-[0_10px_30px_-12px_rgb(var(--brand-rgb)/0.25)] sm:px-5">
        <Logo />
        <nav className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <Link to="/dashboard" className="btn-primary !py-2">Open dashboard <ArrowRight className="h-4 w-4" /></Link>
          ) : (
            <>
              <Link to="/login" className="btn !py-2 text-slate-700 hover:bg-white/70">Log in</Link>
              <Link to="/register" className="btn-primary !py-2">Sign up free</Link>
            </>
          )}
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="glass animate-fade-up inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-violet-700">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500" /></span>
            AI-powered expense splitting
          </span>
          <h1 className="animate-fade-up mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-[4.25rem]">
            Split bills, <br className="hidden sm:block" />
            <span className="gradient-text">not friendships.</span>
          </h1>
          <p className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-slate-600 [animation-delay:160ms]">
            Track shared expenses, see who owes whom, settle up in the fewest payments, and ask an AI assistant about your spending.
          </p>
          <div className="animate-fade-up mt-9 flex flex-col gap-3 [animation-delay:240ms] sm:flex-row">
            <Link to="/register" className="btn-primary !px-7 !py-3.5 text-base">
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className="btn-secondary !px-7 !py-3.5 text-base">See how it works</a>
          </div>
          <ul className="animate-fade-up mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 [animation-delay:320ms]">
            {['Free to use', 'Exact to the paisa', 'No spreadsheets'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />{t}</li>
            ))}
          </ul>
        </div>

        <div className="animate-fade-up relative [animation-delay:200ms]">
          <FloatingChip className="-right-5 -top-8 animate-float [--r:3deg]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><HandCoins className="h-4 w-4" /></span>
            <div><p className="font-semibold text-slate-800">Diya paid you</p><p className="text-emerald-600">+₹833.34 confirmed</p></div>
          </FloatingChip>
          <FloatingChip className="-bottom-10 -right-6 animate-float-slow [--r:-3deg]">
            <span className="gradient-brand flex h-8 w-8 items-center justify-center rounded-full text-white"><Sparkles className="h-4 w-4" /></span>
            <div><p className="font-semibold text-slate-800">AI insight</p><p className="text-slate-500">Food is up 18% this month</p></div>
          </FloatingChip>
          <FloatingChip className="-bottom-10 -left-6 animate-float [--r:2deg] [animation-delay:-3s]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Bell className="h-4 w-4" /></span>
            <div><p className="font-semibold text-slate-800">Budget alert</p><p className="text-amber-600">80% of Groceries used</p></div>
          </FloatingChip>
          <SplitDemo />
        </div>
      </section>

      {/* ---------- Occasions marquee ---------- */}
      <section aria-label="Works for every group" className="border-y border-white/70 bg-white/50 py-5 backdrop-blur">
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-10">
            {[...occasions, ...occasions, ...occasions, ...occasions].map(({ icon: Icon, text }, i) => (
              <span key={i} className="flex items-center gap-2.5 font-display text-sm font-bold text-slate-400">
                <Icon className="h-5 w-5 text-violet-400" /> {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Bento features ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-violet-600">Features</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Everything a group needs</h2>
          <p className="mt-4 text-slate-600">Built for roommates, students, families and travel groups.</p>
        </Reveal>

        <div className="mt-14 grid auto-rows-[minmax(190px,auto)] gap-5 md:grid-cols-3">
          <Reveal className="md:col-span-2">
            <div className="spotlight card lift h-full p-7">
              <span className="gradient-brand flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-violet-500/30"><Network className="h-6 w-6" /></span>
              <h3 className="mt-5 text-xl font-bold">Fewer payments, automatically</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">Smart debt simplification turns a tangled web of IOUs into the minimum number of transfers.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-600 line-through decoration-rose-300">6 payments</span>
                <ArrowRight className="h-4 w-4 text-slate-300" />
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-200">2 payments</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="spotlight card lift h-full p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600"><Scale className="h-6 w-6" /></span>
              <h3 className="mt-5 text-lg font-bold">Four ways to split</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Equal, exact amounts, percentages or shares. Always adds up to the paisa.</p>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <div className="spotlight card lift h-full p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600"><Sparkles className="h-6 w-6" /></span>
              <h3 className="mt-5 text-lg font-bold">AI expense assistant</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Ask "who owes me the most?" or "how can we spend less?" and get answers from your real data.</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="spotlight card lift h-full p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><HandCoins className="h-6 w-6" /></span>
              <h3 className="mt-5 text-lg font-bold">Settle with confirmation</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Record a payment, the receiver confirms, balances update. No disputes.</p>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className="spotlight card lift h-full p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><PiggyBank className="h-6 w-6" /></span>
              <h3 className="mt-5 text-lg font-bold">Budgets and alerts</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Set monthly or category budgets and get warned before you overspend.</p>
            </div>
          </Reveal>
          <Reveal className="md:col-span-3" delay={80}>
            <div className="spotlight card lift flex h-full flex-col justify-between gap-6 p-7 sm:flex-row sm:items-center">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><BarChart3 className="h-6 w-6" /></span>
                <h3 className="mt-5 text-xl font-bold">Charts that make sense</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">Monthly trends and category breakdowns, so you always know where the money goes.</p>
              </div>
              <div className="flex h-28 items-end gap-3" aria-hidden="true">
                {[38, 62, 48, 80, 58, 70, 52, 96].map((h, i) => (
                  <div key={i} className={`w-9 rounded-t-lg ${i === 7 ? 'gradient-brand' : 'bg-indigo-100'}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-violet-600">How it works</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Three steps to square up</h2>
        </Reveal>
        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-9 hidden h-px bg-linear-to-r from-transparent via-violet-300 to-transparent md:block" />
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 120} className="relative text-center">
              <span className="gradient-brand relative mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl font-display text-xl font-extrabold text-white shadow-[0_16px_30px_-10px_rgb(var(--brand-rgb)/0.7)]">{s.n}</span>
              <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Final call to action ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-16 text-center text-white">
            <div className="absolute -left-16 -top-16 -z-10 h-72 w-72 animate-drift rounded-full bg-indigo-600/50 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 -z-10 h-72 w-72 animate-drift rounded-full bg-fuchsia-600/40 blur-3xl [animation-delay:-9s]" />
            <div className="absolute inset-0 -z-10 [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            <ShieldCheck className="mx-auto h-8 w-8 text-violet-300" />
            <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">Ready to stop chasing people for money?</h2>
            <p className="mx-auto mt-4 max-w-md text-white/70">Create a group in under a minute. Your data stays yours.</p>
            <Link to="/register" className="btn keep-white mt-9 bg-white !px-8 !py-3.5 text-base text-[#0f5b48] shadow-[0_14px_30px_-10px_rgba(255,240,200,0.4)] hover:-translate-y-0.5 hover:bg-[#fff1c9]">
              Create your free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/70 bg-white/40 py-8 text-center text-sm text-slate-500 backdrop-blur">
        <Users className="mx-auto mb-2 h-4 w-4 text-violet-400" />
        © {new Date().getFullYear()} SplitSmart. Built as a full-stack learning project.
      </footer>
    </div>
  );
}
