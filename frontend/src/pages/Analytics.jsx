import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { SpendingBarChart, CategoryCompareChart, CategoryDonut } from '../components/charts';
import BudgetsPanel from '../components/BudgetsPanel';
import { Spinner, ErrorBanner } from '../components/ui';
import { listGroups } from '../services/groupService';
import { getMonthly, getGroupAnalytics } from '../services/analyticsService';
import { formatPaise } from '../utils/money';
import { formatDate, getErrorMessage, monthLabel } from '../utils/format';

const RANGES = [3, 6, 12];

function Stat({ label, value, children }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {children}
    </div>
  );
}

export default function Analytics() {
  const now = new Date();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [months, setMonths] = useState(6);
  const [monthly, setMonthly] = useState(null);
  const [groupStats, setGroupStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { listGroups().then(setGroups).catch((err) => setError(getErrorMessage(err))); }, []);

  useEffect(() => {
    setMonthly(null);
    setGroupStats(null);
    setError('');
    getMonthly(months, groupId).then(setMonthly).catch((err) => setError(getErrorMessage(err)));
    if (groupId) getGroupAnalytics(groupId).then(setGroupStats).catch((err) => setError(getErrorMessage(err)));
  }, [months, groupId]);

  const cmp = monthly?.comparison;
  const change = cmp?.change_percent;
  const ChangeIcon = !cmp || cmp.change_amount === 0 ? Minus : cmp.change_amount > 0 ? TrendingUp : TrendingDown;
  const changeColor = !cmp || cmp.change_amount === 0 ? 'text-slate-500' : cmp.change_amount > 0 ? 'text-rose-600' : 'text-emerald-600';
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-slate-500">Your share of spending: what you actually consumed, not just what you paid.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="a-group" className="sr-only">Group</label>
        <select id="a-group" className="input max-w-xs" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">All groups</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setMonths(r)} aria-pressed={months === r}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${months === r ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {r} months
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner>{error}</ErrorBanner>
      {!monthly && !error && <Spinner />}

      {monthly && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={monthLabel(now.getFullYear(), now.getMonth() + 1, true)} value={formatPaise(cmp.this_month)} />
            <Stat label={monthLabel(prevDate.getFullYear(), prevDate.getMonth() + 1, true)} value={formatPaise(cmp.last_month)} />
            <Stat label="Change vs last month" value={`${cmp.change_amount > 0 ? '+' : cmp.change_amount < 0 ? '-' : ''}${formatPaise(Math.abs(cmp.change_amount))}`}>
              <p className={`mt-1 flex items-center gap-1 text-sm font-medium ${changeColor}`}>
                <ChangeIcon className="h-4 w-4" />
                {change === null ? 'Nothing to compare yet' : `${change > 0 ? '+' : ''}${change}%`}
              </p>
            </Stat>
          </div>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Monthly spending</h2>
            <SpendingBarChart data={monthly.months} height={280} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-4 font-semibold">This month vs last month, by category</h2>
              {monthly.category_this_month.length + monthly.category_last_month.length === 0
                ? <p className="py-12 text-center text-sm text-slate-500">No category data yet.</p>
                : <CategoryCompareChart thisMonth={monthly.category_this_month} lastMonth={monthly.category_last_month} />}
            </section>
            <section className="card p-5">
              <h2 className="mb-4 font-semibold">Where this month's money went</h2>
              {monthly.category_this_month.length === 0
                ? <p className="py-12 text-center text-sm text-slate-500">No spending this month yet.</p>
                : <CategoryDonut data={monthly.category_this_month} />}
            </section>
          </div>
        </>
      )}

      {groupId && groupStats && (
        <section className="card p-5">
          <h2 className="font-semibold">Whole-group figures</h2>
          <p className="mb-4 mt-0.5 text-sm text-slate-500">Everyone's spending in this group, all time.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Total spent</p><p className="mt-1 text-lg font-bold">{formatPaise(groupStats.totals.total_spent)}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Expenses</p><p className="mt-1 text-lg font-bold">{groupStats.totals.expense_count}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Average expense</p><p className="mt-1 text-lg font-bold">{formatPaise(groupStats.totals.average_expense)}</p></div>
          </div>
          {groupStats.biggest_expense && (
            <p className="mt-4 text-sm text-slate-600">
              Biggest expense: <strong>{groupStats.biggest_expense.title}</strong> ({formatPaise(groupStats.biggest_expense.amount)}, {formatDate(groupStats.biggest_expense.expense_date)}, paid by {groupStats.biggest_expense.paid_by_name})
            </p>
          )}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="pb-2 font-medium">Member</th><th className="pb-2 text-right font-medium">Paid</th><th className="pb-2 text-right font-medium">Share</th><th className="pb-2 text-right font-medium">Balance</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupStats.members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="py-2.5 font-medium">{m.name}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatPaise(m.total_paid)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatPaise(m.total_owed)}</td>
                    <td className={`py-2.5 text-right font-semibold tabular-nums ${m.net_balance > 0 ? 'text-emerald-600' : m.net_balance < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {m.net_balance === 0 ? '—' : `${m.net_balance > 0 ? '+' : '-'}${formatPaise(Math.abs(m.net_balance))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <BudgetsPanel month={now.getMonth() + 1} year={now.getFullYear()} groups={groups.filter((g) => !g.is_archived)} />
    </div>
  );
}
