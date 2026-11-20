import { ArrowRight, PartyPopper } from 'lucide-react';
import { formatPaise } from '../../utils/money';
import { initials } from '../../utils/format';

const tone = {
  receives: { text: 'text-emerald-600', label: 'gets back' },
  owes: { text: 'text-rose-600', label: 'owes' },
  settled: { text: 'text-slate-400', label: 'settled up' },
};

function Avatar({ name }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials(name)}</span>;
}

export default function BalancesTab({ balances, suggestions, myId }) {
  const mine = balances.find((b) => b.user_id === myId);
  const allSettled = balances.every((b) => b.net_balance === 0);
  const who = (id, name) => (id === myId ? 'You' : name);

  return (
    <div className="space-y-6">
      {mine && (
        <div className="card p-5">
          <p className="text-sm font-medium text-slate-500">Your balance in this group</p>
          <p className={`mt-1 text-3xl font-bold tracking-tight ${tone[mine.status].text}`}>
            {mine.status === 'settled' ? 'All settled up' : formatPaise(Math.abs(mine.net_balance))}
          </p>
          {mine.status !== 'settled' && (
            <p className="mt-1 text-sm text-slate-500">{mine.status === 'receives' ? 'The group owes you this much.' : 'You owe the group this much.'}</p>
          )}
        </div>
      )}

      <section>
        <h3 className="mb-3 font-semibold">Suggested payments</h3>
        {suggestions.length === 0 ? (
          <div className="card flex items-center gap-3 px-5 py-4 text-sm text-slate-600">
            <PartyPopper className="h-5 w-5 text-emerald-500" />
            {allSettled ? 'Nobody owes anything. Add an expense to get started.' : 'Nothing to settle right now.'}
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {suggestions.map((s, i) => (
              <li key={i} className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${s.from === myId ? 'bg-rose-50/50' : s.to === myId ? 'bg-emerald-50/50' : ''}`}>
                <span className="min-w-0 flex-1 text-sm">
                  <strong className="font-semibold">{who(s.from, s.from_name)}</strong>
                  <ArrowRight className="mx-2 inline h-4 w-4 text-slate-400" />
                  <strong className="font-semibold">{who(s.to, s.to_name)}</strong>
                </span>
                <span className={`font-semibold ${s.from === myId ? 'text-rose-600' : s.to === myId ? 'text-emerald-600' : 'text-slate-900'}`}>{formatPaise(s.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-400">These are suggestions only. Balances change when a payment is recorded and confirmed.</p>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Everyone's balance</h3>
        <ul className="card divide-y divide-slate-100">
          {balances.map((b) => (
            <li key={b.user_id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <Avatar name={b.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.name}{b.user_id === myId && <span className="text-slate-400"> (you)</span>}</p>
                <p className="text-xs text-slate-500">Paid {formatPaise(b.total_paid)} · Share {formatPaise(b.total_owed)}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${tone[b.status].text}`}>{b.status === 'settled' ? '₹0.00' : formatPaise(Math.abs(b.net_balance))}</p>
                <p className="text-xs text-slate-400">{tone[b.status].label}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
