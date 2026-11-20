import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, PiggyBank, Plus, Trash2, X } from 'lucide-react';
import { ErrorBanner, Spinner } from './ui';
import * as api from '../services/analyticsService';
import { CATEGORIES } from '../utils/categories';
import { formatPaise, paiseToInput, rupeesToPaise } from '../utils/money';
import { getErrorMessage } from '../utils/format';

const bar = { ok: 'bg-emerald-500', warning: 'bg-amber-500', exceeded: 'bg-rose-500' };
const label = { ok: 'On track', warning: 'Nearly there', exceeded: 'Over budget' };
const labelTone = { ok: 'text-emerald-600', warning: 'text-amber-600', exceeded: 'text-rose-600' };

// Budgets for one month. Spending is YOUR share of expenses, calculated by the server.
export default function BudgetsPanel({ month, year, groups }) {
  const [budgets, setBudgets] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category: 'ALL', amount: '', groupId: '' });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { id, value }

  const load = useCallback(() => {
    api.listBudgets(month, year).then(setBudgets).catch((err) => setError(getErrorMessage(err)));
  }, [month, year]);
  useEffect(load, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); load(); return true; }
    catch (err) { setError(getErrorMessage(err)); return false; }
    finally { setBusy(false); }
  };

  const create = async (e) => {
    e.preventDefault();
    const amount = rupeesToPaise(form.amount);
    if (!amount) return setError('Enter a valid amount, e.g. 5000');
    const ok = await run(() => api.createBudget({ category: form.category, amount, month, year, ...(form.groupId ? { group_id: Number(form.groupId) } : {}) }));
    if (ok) { setAdding(false); setForm({ category: 'ALL', amount: '', groupId: '' }); }
  };

  const saveEdit = async () => {
    const amount = rupeesToPaise(editing.value);
    if (!amount) return setError('Enter a valid amount');
    if (await run(() => api.updateBudget(editing.id, amount))) setEditing(null);
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold"><PiggyBank className="h-5 w-5 text-indigo-600" />Budgets this month</h2>
        {!adding && <button className="btn-secondary !py-1.5" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add budget</button>}
      </div>

      <div className="mt-3 empty:hidden"><ErrorBanner>{error}</ErrorBanner></div>

      {adding && (
        <form onSubmit={create} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4" noValidate>
          <div>
            <label htmlFor="b-cat" className="label">Category</label>
            <select id="b-cat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="ALL">All categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="b-group" className="label">Group</label>
            <select id="b-group" className="input" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">All groups</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="b-amt" className="label">Limit (₹)</label>
            <input id="b-amt" inputMode="decimal" className="input" placeholder="5000" autoFocus value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="flex items-end gap-2">
            <button className="btn-primary flex-1" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
            <button type="button" className="btn-secondary" onClick={() => { setAdding(false); setError(''); }} aria-label="Cancel"><X className="h-4 w-4" /></button>
          </div>
        </form>
      )}

      {!budgets && !error && <Spinner className="!py-6" />}
      {budgets && budgets.length === 0 && !adding && (
        <p className="py-8 text-center text-sm text-slate-500">No budgets for this month. Set one and we'll warn you at 80% and 100%.</p>
      )}

      <ul className="mt-4 space-y-5">
        {budgets?.map((b) => (
          <li key={b.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{b.category === 'ALL' ? 'Overall' : b.category}<span className="font-normal text-slate-400"> · {b.group_name || 'all groups'}</span></p>
                <p className="mt-0.5 text-sm text-slate-500">
                  <span className="font-semibold text-slate-900">{formatPaise(b.spent)}</span> of{' '}
                  {editing?.id === b.id ? (
                    <span className="inline-flex items-center gap-1.5 align-middle">
                      <input autoFocus aria-label="New limit" inputMode="decimal" className="input !w-28 !py-1" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }} />
                      <button onClick={saveEdit} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50" aria-label="Save limit"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cancel edit"><X className="h-4 w-4" /></button>
                    </span>
                  ) : formatPaise(b.amount)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className={`mr-1 text-xs font-medium ${labelTone[b.status]}`}>{label[b.status]}</span>
                <button onClick={() => setEditing({ id: b.id, value: paiseToInput(b.amount) })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Edit ${b.category} budget`}><Pencil className="h-4 w-4" /></button>
                <button onClick={() => run(() => api.deleteBudget(b.id))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${b.category} budget`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.min(100, b.utilization_percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.utilization_percent}% of budget used`}>
              <div className={`h-full rounded-full transition-all ${bar[b.status]}`} style={{ width: `${Math.min(100, b.utilization_percent)}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {b.utilization_percent}% used · {b.over_by > 0 ? `${formatPaise(b.over_by)} over` : `${formatPaise(b.remaining)} left`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
