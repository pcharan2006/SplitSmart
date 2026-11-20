import { CheckCircle2, AlertCircle } from 'lucide-react';
import { formatPaise } from '../utils/money';
import { initials } from '../utils/format';

const TYPES = [
  { id: 'equal', label: 'Equally', hint: 'Everyone selected pays the same.' },
  { id: 'exact', label: 'Exact', hint: 'Type exactly how much each person owes (in ₹).' },
  { id: 'percentage', label: 'Percent', hint: 'Give each person a percentage. They must total 100%.' },
  { id: 'shares', label: 'Shares', hint: 'Give each person a number of shares, e.g. 2 shares pays double 1 share.' },
];
const unit = { exact: '₹', percentage: '%', shares: 'shares' };

export default function SplitEditor({ members, parts, setParts, type, setType, preview, myId }) {
  const typeInfo = TYPES.find((t) => t.id === type);
  const setPart = (id, patch) => setParts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  const allOn = members.every((m) => parts[m.id]?.on);
  const toggleAll = () => setParts((p) => Object.fromEntries(members.map((m) => [m.id, { ...p[m.id], on: !allOn }])));

  const total = Object.values(preview.shares).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Split method">
        {TYPES.map((t) => (
          <button type="button" key={t.id} role="tab" aria-selected={type === t.id} onClick={() => setType(t.id)}
            className={`rounded-lg px-2 py-2 text-sm font-medium transition ${type === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">{typeInfo.hint}</p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Split between</span>
        <button type="button" onClick={toggleAll} className="text-xs font-medium text-indigo-600 hover:underline">{allOn ? 'Deselect all' : 'Select all'}</button>
      </div>

      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {members.map((m) => {
          const part = parts[m.id] || { on: false, value: '' };
          const share = preview.shares[m.id];
          return (
            <li key={m.id} className={`flex items-center gap-3 px-3 py-3 sm:px-4 ${part.on ? '' : 'opacity-50'}`}>
              <input id={`p-${m.id}`} type="checkbox" checked={part.on} onChange={(e) => setPart(m.id, { on: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor={`p-${m.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials(m.name)}</span>
                <span className="truncate text-sm font-medium">{m.name}{m.id === myId && <span className="text-slate-400"> (you)</span>}</span>
              </label>
              {type !== 'equal' && part.on && (
                <div className="relative w-28 shrink-0">
                  {type === 'exact' && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>}
                  <input inputMode="decimal" aria-label={`${m.name} ${unit[type]}`} className={`input !py-1.5 text-right ${type === 'exact' ? '!pl-7' : ''} ${type === 'percentage' ? '!pr-7' : ''}`}
                    placeholder={type === 'shares' ? '1' : '0'} value={part.value} onChange={(e) => setPart(m.id, { value: e.target.value })} />
                  {type === 'percentage' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>}
                </div>
              )}
              <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">{part.on && share !== undefined ? formatPaise(share) : '—'}</span>
            </li>
          );
        })}
      </ul>

      <div role="status" className={`mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ${preview.problem ? 'bg-rose-50 text-rose-700' : total ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
        {preview.problem ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : total ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
        <span>{preview.problem || (total ? `Adds up to ${formatPaise(total)}` : preview.note)}</span>
      </div>
    </div>
  );
}
