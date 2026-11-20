import { CountUpMoney } from './motion';

// tone: "positive" (green, money coming to you), "negative" (red, money you owe), or "neutral".
const tones = {
  positive: { icon: 'from-emerald-400 to-teal-500 shadow-emerald-500/30', text: 'text-emerald-600', glow: 'bg-emerald-400/20' },
  negative: { icon: 'from-rose-400 to-pink-500 shadow-rose-500/30', text: 'text-rose-600', glow: 'bg-rose-400/20' },
  neutral: { icon: 'from-indigo-500 to-violet-500 shadow-violet-500/30', text: 'text-slate-900', glow: 'bg-violet-400/20' },
};

export default function BalanceCard({ label, paise, tone = 'neutral', icon: Icon, hint }) {
  const t = tones[tone];
  return (
    <div className="spotlight card lift p-5">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${t.glow}`} />
      <div className="relative flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-lg ${t.icon}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className={`relative mt-3 font-display text-3xl font-extrabold tracking-tight ${t.text}`}>
        <CountUpMoney paise={paise} />
      </p>
      {hint && <p className="relative mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
