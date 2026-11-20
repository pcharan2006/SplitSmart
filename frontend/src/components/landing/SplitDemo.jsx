import { useMemo, useState } from 'react';
import { Minus, Plus, CheckCircle2, Utensils } from 'lucide-react';
import { allocate } from '../../utils/splits';
import { formatPaise, rupeesToPaise } from '../../utils/money';

const PEOPLE = [
  { name: 'Aarav', color: 'from-indigo-600 to-violet-500' },
  { name: 'Diya', color: 'from-fuchsia-500 to-orange-500' },
  { name: 'Kabir', color: 'from-rose-600 to-pink-500' },
  { name: 'Meera', color: 'from-teal-600 to-emerald-500' },
  { name: 'Rohan', color: 'from-amber-500 to-yellow-400' },
  { name: 'Sana', color: 'from-cyan-600 to-orange-500' },
];

// A live, playable taste of the real split engine (same largest-remainder maths the app uses).
export default function SplitDemo() {
  const [amount, setAmount] = useState('2500');
  const [count, setCount] = useState(3);

  const paise = rupeesToPaise(amount);
  const shares = useMemo(() => (paise && paise > 0 ? allocate(paise, Array(count).fill(1)) : null), [paise, count]);
  const max = shares ? Math.max(...shares) : 1;

  return (
    <div className="spotlight glass relative rounded-3xl p-5 shadow-[0_30px_60px_-20px_rgb(var(--brand-rgb)/0.35)] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="gradient-brand flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg shadow-violet-500/30">
          <Utensils className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-sm font-bold">Dinner at Toscano</p>
          <p className="text-xs text-slate-500">Try it: change the bill or the people</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-3">
        <div className="col-span-3">
          <label htmlFor="demo-amount" className="mb-1 block text-xs font-medium text-slate-500">Bill amount (₹)</label>
          <input
            id="demo-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').slice(0, 9))}
            className="input !py-2 font-display text-lg font-bold tabular-nums"
          />
        </div>
        <div className="col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-500">People</span>
          <div className="flex h-[46px] items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-1.5 shadow-sm">
            <button onClick={() => setCount((c) => Math.max(2, c - 1))} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600 active:scale-90" aria-label="Fewer people">
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-display text-lg font-bold tabular-nums" aria-live="polite">{count}</span>
            <button onClick={() => setCount((c) => Math.min(6, c + 1))} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600 active:scale-90" aria-label="More people">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {PEOPLE.slice(0, count).map((p, i) => (
          <li key={p.name} className="animate-pop" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-center gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${p.color} text-xs font-bold text-white`}>{p.name[0]}</span>
              <span className="w-14 text-sm font-medium text-slate-700">{p.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full bg-linear-to-r ${p.color} transition-all duration-500 ease-out`} style={{ width: shares ? `${(shares[i] / max) * 100}%` : '0%' }} />
              </div>
              <span className="w-24 text-right font-display text-sm font-bold tabular-nums">{shares ? formatPaise(shares[i]) : '—'}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {shares
          ? `Adds up to exactly ${formatPaise(shares.reduce((a, b) => a + b, 0))}. Never a paisa lost to rounding.`
          : 'Enter an amount like 2500 or 99.50'}
      </div>
    </div>
  );
}
