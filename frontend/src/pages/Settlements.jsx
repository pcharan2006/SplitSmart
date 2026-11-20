import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, X, Undo2, Plus, HandCoins, PartyPopper, Loader2 } from 'lucide-react';
import { Spinner, ErrorBanner, EmptyState, Badge } from '../components/ui';
import RecordPaymentModal from '../components/RecordPaymentModal';
import { useAuth } from '../context/AuthContext';
import { listGroups, getGroup, getBalances, getSuggestions } from '../services/groupService';
import * as settlementApi from '../services/settlementService';
import { formatPaise } from '../utils/money';
import { formatDate, getErrorMessage } from '../utils/format';

const STATUS = { pending: { tone: 'amber', label: 'Pending' }, completed: { tone: 'green', label: 'Completed' }, rejected: { tone: 'red', label: 'Rejected' } };

function Section({ title, hint, children }) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

export default function Settlements() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const groupId = searchParams.get('group') || '';

  const [groups, setGroups] = useState(null);
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [preset, setPreset] = useState(null);

  useEffect(() => {
    listGroups()
      .then((list) => {
        setGroups(list);
        if (!searchParams.get('group') && list.length) {
          const first = list.find((g) => !g.is_archived) || list[0];
          setSearchParams({ group: String(first.id) }, { replace: true });
        }
      })
      .catch((err) => setError(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!groupId) return;
    try {
      const [g, b, s, list] = await Promise.all([
        getGroup(groupId), getBalances(groupId), getSuggestions(groupId), settlementApi.listSettlements(groupId),
      ]);
      setGroup(g); setBalances(b); setSuggestions(s); setSettlements(list); setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [groupId]);

  useEffect(() => { setGroup(null); setBalances(null); load(); }, [load]);

  // Runs a confirm/reject/cancel call, then refreshes. Errors (e.g. "balances changed") show in the banner.
  const act = async (id, fn) => {
    setBusyId(id);
    setActionError('');
    try {
      await fn(id);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const openRecord = (p) => { setPreset(p || null); setRecordOpen(true); };

  if (groups && groups.length === 0) {
    return (
      <EmptyState icon={HandCoins} title="No groups yet" text="Settlements happen inside a group. Create or join one first.">
        <Link to="/groups" className="btn-primary">Go to groups</Link>
      </EmptyState>
    );
  }

  const archived = Boolean(group?.is_archived);
  const mine = balances?.my_balance;
  const needsMyAction = settlements.filter((s) => s.status === 'pending' && s.paid_to === user.id);
  const awaitingOthers = settlements.filter((s) => s.status === 'pending' && s.paid_by === user.id);
  const otherPending = settlements.filter((s) => s.status === 'pending' && s.paid_by !== user.id && s.paid_to !== user.id);
  const history = settlements.filter((s) => s.status !== 'pending');
  const who = (id, name) => (id === user.id ? 'You' : name);

  const Row = ({ s, children }) => (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <strong>{who(s.paid_by, s.paid_by_name)}</strong>
          <ArrowRight className="mx-2 inline h-4 w-4 text-slate-400" />
          <strong>{who(s.paid_to, s.paid_to_name)}</strong>
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{s.payment_date ? formatDate(s.payment_date) : formatDate(s.created_at)}</p>
      </div>
      <span className="font-semibold tabular-nums">{formatPaise(s.amount)}</span>
      {children}
    </li>
  );

  const Busy = ({ id }) => (busyId === id ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settlements</h1>
          <p className="mt-1 text-slate-500">See who owes whom, record payments, and confirm money you received.</p>
        </div>
        {!archived && group && group.members.length > 1 && (
          <button className="btn-primary" onClick={() => openRecord()}><Plus className="h-4 w-4" />Record payment</button>
        )}
      </div>

      <div className="mt-6">
        <label htmlFor="s-group" className="sr-only">Group</label>
        <select id="s-group" className="input max-w-sm" value={groupId} onChange={(e) => setSearchParams({ group: e.target.value })}>
          {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}{g.is_archived ? ' (archived)' : ''}</option>)}
        </select>
      </div>

      <div className="mt-6 space-y-8">
        <ErrorBanner>{error}</ErrorBanner>
        <ErrorBanner>{actionError}</ErrorBanner>
        {!group && !error && <Spinner />}

        {group && balances && (
          <>
            {archived && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This group is archived, so payments can't be changed.</div>}

            {mine && (
              <div className="card p-5">
                <p className="text-sm font-medium text-slate-500">Your balance in {group.name}</p>
                <p className={`mt-1 text-3xl font-bold tracking-tight ${mine.status === 'receives' ? 'text-emerald-600' : mine.status === 'owes' ? 'text-rose-600' : 'text-slate-900'}`}>
                  {mine.status === 'settled' ? 'All settled up' : formatPaise(Math.abs(mine.net_balance))}
                </p>
                {mine.status !== 'settled' && <p className="mt-1 text-sm text-slate-500">{mine.status === 'receives' ? 'You are owed this much.' : 'You owe this much.'}</p>}
              </div>
            )}

            {needsMyAction.length > 0 && (
              <Section title="Needs your confirmation" hint="Someone says they paid you. Confirm once the money has arrived.">
                <ul className="card divide-y divide-amber-100 border-amber-200 bg-amber-50/40">
                  {needsMyAction.map((s) => (
                    <Row key={s.id} s={s}>
                      <div className="flex items-center gap-2">
                        <Busy id={s.id} />
                        <button className="btn-secondary !py-1.5 !text-rose-600" disabled={busyId === s.id || archived} onClick={() => act(s.id, settlementApi.rejectSettlement)}><X className="h-4 w-4" />Reject</button>
                        <button className="btn-primary !py-1.5" disabled={busyId === s.id || archived} onClick={() => act(s.id, settlementApi.confirmSettlement)}><Check className="h-4 w-4" />Confirm</button>
                      </div>
                    </Row>
                  ))}
                </ul>
              </Section>
            )}

            {awaitingOthers.length > 0 && (
              <Section title="Waiting for confirmation" hint="You recorded these. They count once the other person confirms.">
                <ul className="card divide-y divide-slate-100">
                  {awaitingOthers.map((s) => (
                    <Row key={s.id} s={s}>
                      <div className="flex items-center gap-2">
                        <Badge tone="amber">Pending</Badge>
                        <Busy id={s.id} />
                        <button className="btn-secondary !py-1.5" disabled={busyId === s.id || archived} onClick={() => act(s.id, settlementApi.cancelSettlement)}><Undo2 className="h-4 w-4" />Cancel</button>
                      </div>
                    </Row>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Suggested payments" hint="The fewest payments that would settle everyone. These are suggestions until a payment is recorded.">
              {suggestions.length === 0 ? (
                <div className="card flex items-center gap-3 px-5 py-4 text-sm text-slate-600">
                  <PartyPopper className="h-5 w-5 text-emerald-500" />Everyone is settled up.
                </div>
              ) : (
                <ul className="card divide-y divide-slate-100">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                      <p className="min-w-0 flex-1 text-sm">
                        <strong>{who(s.from, s.from_name)}</strong>
                        <ArrowRight className="mx-2 inline h-4 w-4 text-slate-400" />
                        <strong>{who(s.to, s.to_name)}</strong>
                      </p>
                      <span className={`font-semibold tabular-nums ${s.from === user.id ? 'text-rose-600' : s.to === user.id ? 'text-emerald-600' : ''}`}>{formatPaise(s.amount)}</span>
                      {!archived && s.from === user.id && (
                        <button className="btn-primary !py-1.5" onClick={() => openRecord({ mode: 'paid', personId: s.to, amount: s.amount })}>I paid this</button>
                      )}
                      {!archived && s.to === user.id && (
                        <button className="btn-secondary !py-1.5" onClick={() => openRecord({ mode: 'received', personId: s.from, amount: s.amount })}>Mark received</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {otherPending.length > 0 && (
              <Section title="Other pending payments">
                <ul className="card divide-y divide-slate-100">
                  {otherPending.map((s) => <Row key={s.id} s={s}><Badge tone="amber">Pending</Badge></Row>)}
                </ul>
              </Section>
            )}

            <Section title="Payment history">
              {history.length === 0 ? (
                <p className="card px-5 py-8 text-center text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <ul className="card divide-y divide-slate-100">
                  {history.map((s) => (
                    <Row key={s.id} s={s}><Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge></Row>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>

      {group && (
        <RecordPaymentModal open={recordOpen} onClose={() => setRecordOpen(false)} groupId={group.id} members={group.members}
          myId={user.id} preset={preset} onDone={load} />
      )}
    </div>
  );
}
