import { Sparkles, ShieldCheck, Scale, HandCoins } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const points = [
  { icon: Scale, text: 'Split any bill four ways: equal, exact, percentage or shares' },
  { icon: Sparkles, text: 'Ask the AI assistant about your spending in plain English' },
  { icon: ShieldCheck, text: 'Balances calculated to the paisa, never rounded wrong' },
];

// Two-panel frame shared by Login and Register: brand panel on the left (desktop), form on the right.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative isolate hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
        <div className="absolute -left-24 -top-24 -z-10 h-96 w-96 animate-drift rounded-full bg-indigo-600/50 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 -z-10 h-[26rem] w-[26rem] animate-drift rounded-full bg-fuchsia-600/40 blur-3xl [animation-delay:-9s]" />
        <div className="absolute left-1/3 top-1/2 -z-10 h-72 w-72 animate-drift rounded-full bg-sky-500/25 blur-3xl [animation-delay:-14s]" />
        <div className="absolute inset-0 -z-10 [background-image:radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

        <Logo light />

        <div className="relative">
          {/* A little floating preview card */}
          <div className="glass !border-white/15 !bg-white/10 animate-float mb-10 flex w-72 items-center gap-3 rounded-2xl p-4 text-white shadow-2xl [--r:-3deg]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300"><HandCoins className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold">Aarav settled up</p>
              <p className="text-xs text-emerald-300">+₹1,250.00 confirmed</p>
            </div>
          </div>

          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight">
            Share costs,<br /><span className="bg-linear-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">not headaches.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }, i) => (
              <li key={text} className="animate-fade-up flex items-start gap-3 text-white/75" style={{ animationDelay: `${300 + i * 120}ms` }}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-violet-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/55">For roommates, friends, families and travel groups.</p>
      </div>

      <div className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden lg:hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />
        </div>
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="animate-fade-up w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="card p-7 sm:p-8">
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}
