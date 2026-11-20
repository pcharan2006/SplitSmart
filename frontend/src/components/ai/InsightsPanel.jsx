import { useState } from 'react';
import { Lightbulb, Loader2, Sparkles, TrendingDown, TrendingUp, Minus, AlertTriangle, PiggyBank, Users, Flame } from 'lucide-react';
import { ErrorBanner } from '../ui';
import { getInsights } from '../../services/aiService';
import { getErrorMessage } from '../../utils/format';

// Money from the server arrives as { paise, display }. We only ever show `display`.
const D = (m) => m?.display ?? '';

function Card({ icon: Icon, title, tone = 'indigo', children }) {
  const tones = { indigo: 'bg-indigo-50 text-indigo-600', rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', green: 'bg-emerald-50 text-emerald-600' };
  return (
    <section className="card p-5">
      <h3 className="flex items-center gap-2.5 font-semibold">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span>{title}
      </h3>
      <div className="mt-3 text-sm text-slate-600">{children}</div>
    </section>
  );
}

export default function InsightsPanel({ groupId, scopeLabel }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getInsights(groupId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const s = data?.signals;
  const m = s?.monthly_analysis;
  const TrendIcon = !m || m.trend === 'flat' ? Minus : m.trend === 'up' ? TrendingUp : TrendingDown;
  const hasData = m && (m.this_month.paise > 0 || m.last_month.paise > 0);

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold">Spending insights</h2>
          <p className="mt-0.5 text-sm text-slate-500">Analysis of your spending in {scopeLabel}. The numbers are calculated by the app; AI writes the advice.</p>
        </div>
        <button className="btn-primary" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {data ? 'Refresh insights' : 'Analyze my spending'}
        </button>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      {s && !hasData && (
        <div className="card px-6 py-12 text-center text-sm text-slate-500">There's no spending in the last two months yet. Add some expenses and come back for insights.</div>
      )}

      {s && hasData && (
        <>
          <section className="card border-indigo-200 bg-gradient-to-br from-indigo-50 to-transparent p-5">
            <h3 className="flex items-center gap-2 font-semibold text-indigo-900"><Sparkles className="h-4 w-4" />AI summary</h3>
            {data.narrative ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{data.narrative.summary}</p>
                <ul className="mt-4 space-y-2">
                  {data.narrative.suggestions.map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-slate-700"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><span>{t}</span></li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">AI tips aren't available right now{data.ai_error ? `: ${data.ai_error}` : ''}. Your calculated insights are below.</p>
            )}
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <Card icon={TrendIcon} title="This month vs last" tone={m.trend === 'up' ? 'rose' : m.trend === 'down' ? 'green' : 'indigo'}>
              <p className="text-2xl font-bold text-slate-900">{D(m.this_month)}</p>
              <p className="mt-1">Last month: {D(m.last_month)}
                {m.change_percent !== null && <span className={`ml-2 font-semibold ${m.trend === 'up' ? 'text-rose-600' : 'text-emerald-600'}`}>{m.change_percent > 0 ? '+' : ''}{m.change_percent}%</span>}
              </p>
            </Card>

            <Card icon={Flame} title="Top category" tone="amber">
              {s.top_category
                ? <p><strong className="text-slate-900">{s.top_category.category}</strong> is your biggest spend at {D(s.top_category.amount)}, {s.top_category.share_percent}% of this month.</p>
                : <p>No spending recorded this month yet.</p>}
            </Card>

            <Card icon={AlertTriangle} title="Unusual increases" tone="rose">
              {s.unusual_increases.length === 0 ? <p>Nothing unusual. Your categories are in line with last month.</p> : (
                <ul className="space-y-2">
                  {s.unusual_increases.map((u) => (
                    <li key={u.category}><strong className="text-slate-900">{u.category}</strong>: {D(u.this_month)} vs {D(u.last_month)} last month (+{D(u.increase)})</li>
                  ))}
                </ul>
              )}
            </Card>

            <Card icon={PiggyBank} title="Budgets" tone="green">
              {s.budget_alerts.length === 0 && !s.suggested_monthly_budget && <p>You're within all your budgets.</p>}
              {s.budget_alerts.map((b, i) => (
                <p key={i} className="mb-1.5"><strong className={b.status === 'exceeded' ? 'text-rose-600' : 'text-amber-600'}>{b.status === 'exceeded' ? 'Over' : 'Close to'}</strong> your {b.category === 'ALL' ? 'overall' : b.category} budget: {D(b.spent)} of {D(b.budget)} ({b.utilization_percent}%).</p>
              ))}
              {s.suggested_monthly_budget && <p>Tip: you have no overall budget. Based on last month, <strong className="text-slate-900">{D(s.suggested_monthly_budget)}</strong> would be a sensible limit.</p>}
            </Card>

            {s.group_comparison.length > 0 && (
              <Card icon={Users} title="Group comparison">
                <ul className="space-y-2.5">
                  {s.group_comparison.map((g) => (
                    <li key={g.group}>
                      <div className="flex justify-between"><span className="font-medium text-slate-900">{g.group}</span><span>{D(g.spending_this_month)} · {g.share_percent}%</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${g.share_percent}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card icon={Lightbulb} title="Where you could save" tone="amber">
              {s.saving_opportunities.length === 0 ? <p>No discretionary spending to trim this month.</p> : (
                <ul className="space-y-2">
                  {s.saving_opportunities.map((o) => (
                    <li key={o.category}>Cutting <strong className="text-slate-900">{o.category}</strong> ({D(o.spending)}) by 10% would save <strong className="text-emerald-600">{D(o.saving_if_cut_10_percent)}</strong>.</li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
