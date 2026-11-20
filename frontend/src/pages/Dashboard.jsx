import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Users, ArrowRight, TrendingUp, TrendingDown, Receipt, Clock, Plus, HandCoins } from 'lucide-react';
import BalanceCard from '../components/BalanceCard';
import { groupGradient } from '../components/GroupCard';
import { CountUp, CountUpMoney } from '../components/motion';
import ExpenseCard from '../components/ExpenseCard';
import { SpendingBarChart, CategoryDonut } from '../components/charts';
import { PageSkeleton, ErrorBanner, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../services/analyticsService';
import { formatPaise } from '../utils/money';
import { getErrorMessage, monthLabel } from '../utils/format';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// `flush` lets a list run edge to edge inside the card (the header keeps its padding).
function Panel({ title, action, children, className = '', flush = false }) {
  return (
    <section className={`card ${flush ? 'overflow-hidden' : 'p-5'} ${className}`}>
      <div className={`flex items-center justify-between gap-3 ${flush ? 'px-5 pb-3 pt-5' : 'mb-4'}`}>
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SeeAll = ({ to, children = 'See all' }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">{children}<ArrowRight className="h-3.5 w-3.5" /></Link>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard().then(setData).catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <ErrorBanner>{error}</ErrorBanner>;
  if (!data) return <PageSkeleton />;

  const { summary, this_month: month, category_breakdown, monthly_spending, recent_transactions, groups, pending_settlements } = data;
  const hasAnyData = summary.total_expenses > 0 || groups.length > 0;
  const change = month.change_percent;
  const needsAction = pending_settlements.awaiting_my_confirmation;
  const awaiting = pending_settlements.awaiting_others;
  const net = summary.owed_to_you - summary.you_owe;

  return (
    <div className="space-y-6">
      {/* Hero: greeting + your overall position */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-[0_24px_50px_-20px_rgb(var(--brand-rgb)/0.55)] sm:p-8 dark:ring-1 dark:ring-white/10">
        <div className="absolute -left-10 -top-16 -z-10 h-64 w-64 animate-drift rounded-full bg-indigo-600/60 blur-3xl" />
        <div className="absolute -bottom-20 right-0 -z-10 h-64 w-64 animate-drift rounded-full bg-fuchsia-600/50 blur-3xl [animation-delay:-7s]" />
        <div className="absolute inset-0 -z-10 [background-image:radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(90deg,transparent,black)]" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-[#ffe3a0]">{greeting()}, {user.name.split(' ')[0]} 👋</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/55">Your net position</p>
            <p className={`mt-1 font-display text-5xl font-extrabold tracking-tight ${net < 0 ? 'text-rose-300' : 'text-white'}`}>
              {net > 0 && '+'}<CountUpMoney paise={net} />
            </p>
            <p className="mt-2 text-sm text-white/75">
              {net > 0 ? 'More money is coming to you than you owe.' : net < 0 ? 'You owe a bit more than you are owed.' : "You're all square across every group."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/expenses/new" className="btn keep-white bg-white text-[#0f5b48] shadow-[0_12px_24px_-10px_rgba(255,240,200,0.5)] hover:-translate-y-0.5 hover:bg-[#fff1c9]"><Plus className="h-4 w-4" /> Add expense</Link>
            <Link to="/settlements" className="btn border border-white/20 bg-white/10 text-white backdrop-blur hover:-translate-y-0.5 hover:bg-white/20"><HandCoins className="h-4 w-4" /> Settle up</Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard label="You are owed" paise={summary.owed_to_you} tone="positive" icon={ArrowDownLeft} hint="Across all groups" />
        <BalanceCard label="You owe" paise={summary.you_owe} tone="negative" icon={ArrowUpRight} hint="Across all groups" />
        <div className="spotlight card lift p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Spent in {monthLabel(month.year, month.month)}</p>
            <span className="gradient-brand flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg shadow-violet-500/30"><CalendarDays className="h-5 w-5" /></span>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold tracking-tight"><CountUpMoney paise={month.my_spending} /></p>
          <p className="mt-1 flex items-center gap-1 text-xs">
            {change === null ? (
              <span className="text-slate-400">No spending last month to compare</span>
            ) : (
              <>
                {change > 0 ? <TrendingUp className="h-3.5 w-3.5 text-rose-500" /> : <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />}
                <span className={change > 0 ? 'font-medium text-rose-600' : 'font-medium text-emerald-600'}>{Math.abs(change)}% {change > 0 ? 'more' : 'less'}</span>
                <span className="text-slate-400">than last month</span>
              </>
            )}
          </p>
        </div>
        <div className="spotlight card lift p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Active groups</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-cyan-500 text-white shadow-lg shadow-sky-500/30"><Users className="h-5 w-5" /></span>
          </div>
          <p className="mt-3 font-display text-3xl font-extrabold tracking-tight"><CountUp value={summary.active_groups} /></p>
          <p className="mt-1 text-xs text-slate-400">You've paid {formatPaise(summary.total_paid)} in total</p>
        </div>
      </div>

      {!hasAnyData && (
        <EmptyState icon={Receipt} title="Nothing here yet" text="Create a group and add your first expense to see balances and charts.">
          <Link to="/groups" className="btn-primary">Create a group</Link>
        </EmptyState>
      )}

      {hasAnyData && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Your spending, last 6 months" className="lg:col-span-2" action={<SeeAll to="/analytics">Analytics</SeeAll>}>
              <SpendingBarChart data={monthly_spending} />
            </Panel>
            <Panel title={`By category, ${monthLabel(month.year, month.month, true)}`}>
              {category_breakdown.length === 0
                ? <p className="py-10 text-center text-sm text-slate-500">No spending this month yet.</p>
                : <CategoryDonut data={category_breakdown} />}
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Recent expenses" className="lg:col-span-2" flush>
              {recent_transactions.length === 0 ? (
                <p className="px-5 pb-8 text-center text-sm text-slate-500">No expenses yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {recent_transactions.map((e) => (
                    <li key={e.id}>
                      <Link to={`/groups/${e.group_id}`} className="block transition hover:bg-slate-50"><ExpenseCard expense={e} myId={user.id} showGroup /></Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-slate-100 px-5 py-3 text-right"><SeeAll to="/expenses">View all expenses</SeeAll></div>
            </Panel>

            <div className="space-y-6">
              <Panel title="Pending settlements" action={<SeeAll to="/settlements" />}>
                {needsAction.length + awaiting.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">Nothing pending 🎉</p>
                ) : (
                  <ul className="space-y-3">
                    {needsAction.map((s) => (
                      <li key={s.id}>
                        <Link to={`/settlements?group=${s.group_id}`} className="block rounded-xl border border-amber-200 bg-amber-50/60 p-3 transition hover:bg-amber-50">
                          <p className="text-sm font-medium">{s.paid_by_name} says they paid you</p>
                          <p className="mt-0.5 flex items-center justify-between text-xs text-slate-500"><span>{s.group_name} · confirm</span><span className="text-sm font-semibold text-slate-900">{formatPaise(s.amount)}</span></p>
                        </Link>
                      </li>
                    ))}
                    {awaiting.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-slate-600">Waiting for {s.paid_to_name}</span>
                        <span className="font-semibold">{formatPaise(s.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Your groups" action={<SeeAll to="/groups" />}>
                {groups.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">No groups yet.</p>
                ) : (
                  <ul className="-mx-2 divide-y divide-slate-100">
                    {groups.slice(0, 5).map((g) => (
                      <li key={g.id}>
                        <Link to={`/groups/${g.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-slate-50">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br text-sm font-bold text-white shadow-md ${groupGradient(g.id)}`}>{g.name[0].toUpperCase()}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.name}</span>
                          <span className={`text-sm font-semibold tabular-nums ${g.my_balance > 0 ? 'text-emerald-600' : g.my_balance < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {g.my_balance === 0 ? 'settled' : formatPaise(Math.abs(g.my_balance))}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
