import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import SplitEditor from '../components/SplitEditor';
import { Spinner, ErrorBanner, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { listGroups, getGroup } from '../services/groupService';
import { createExpense, updateExpense, getExpense } from '../services/expenseService';
import { CATEGORIES } from '../utils/categories';
import { rupeesToPaise, paiseToInput } from '../utils/money';
import { buildPreview, buildParticipants } from '../utils/splits';
import { getErrorMessage, todayLocal } from '../utils/format';

const allOn = (members) => Object.fromEntries(members.map((m) => [m.id, { on: true, value: '' }]));

// One page for both "Add expense" (/expenses/new) and "Edit expense" (/expenses/:id/edit).
export default function AddExpense() {
  const { id: expenseId } = useParams();
  const editing = Boolean(expenseId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groups, setGroups] = useState(null);
  const [groupId, setGroupId] = useState(searchParams.get('group') || '');
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Food', date: todayLocal(), paidBy: '', description: '' });
  const [splitType, setSplitType] = useState('equal');
  const [parts, setParts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [convertedNote, setConvertedNote] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Load the user's groups, and (when editing) the expense itself.
  useEffect(() => {
    (async () => {
      try {
        const list = await listGroups();
        setGroups(list.filter((g) => !g.is_archived));
        if (editing) {
          const e = await getExpense(expenseId);
          const g = await getGroup(e.group_id);
          setGroupId(String(e.group_id));
          setGroupName(g.name);
          setMembers(g.members);
          setForm({ title: e.title, amount: paiseToInput(e.amount), category: e.category, date: e.expense_date.slice(0, 10), paidBy: String(e.paid_by), description: e.description || '' });
          // The backend stores each person's final share, not the original percentages/shares,
          // so those two methods are shown as exact amounts when editing.
          const keepEqual = e.split_type === 'equal';
          setSplitType(keepEqual ? 'equal' : 'exact');
          setConvertedNote(!keepEqual && e.split_type !== 'exact');
          const base = Object.fromEntries(g.members.map((m) => [m.id, { on: false, value: '' }]));
          e.splits.forEach((s) => { base[s.user_id] = { on: true, value: paiseToInput(s.share_amount) }; });
          setParts(base);
        }
      } catch (err) {
        setLoadError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, expenseId]);

  // Creating: whenever the chosen group changes, load its members and select everyone.
  useEffect(() => {
    if (editing || !groupId) return;
    getGroup(groupId)
      .then((g) => {
        setMembers(g.members);
        setParts(allOn(g.members));
        setForm((f) => ({ ...f, paidBy: String(g.members.some((m) => m.id === user.id) ? user.id : g.members[0]?.id || '') }));
      })
      .catch((err) => setLoadError(getErrorMessage(err)));
  }, [groupId, editing, user.id]);

  const amountPaise = rupeesToPaise(form.amount);
  const preview = useMemo(() => buildPreview({ type: splitType, amount: amountPaise, members, parts }), [splitType, amountPaise, members, parts]);

  const changeType = (type) => {
    setSplitType(type);
    // Start each method with sensible blanks (e.g. 1 share each).
    setParts((p) => Object.fromEntries(members.map((m) => [m.id, { on: p[m.id]?.on ?? true, value: type === 'shares' ? '1' : '' }])));
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!groupId) return setSubmitError('Choose a group');
    if (form.title.trim().length < 1) return setSubmitError('Enter a title');
    if (!amountPaise) return setSubmitError('Enter a valid amount, e.g. 250 or 250.50');
    if (preview.problem) return setSubmitError(preview.problem);

    const payload = {
      group_id: Number(groupId),
      title: form.title.trim(),
      description: form.description.trim() || null,
      amount: amountPaise,
      category: form.category,
      expense_date: form.date,
      paid_by: Number(form.paidBy),
      split_type: splitType,
      participants: buildParticipants(splitType, members, parts),
    };
    setSubmitting(true);
    try {
      if (editing) await updateExpense(expenseId, payload);
      else await createExpense(payload);
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return <ErrorBanner>{loadError}</ErrorBanner>;
  if (!editing && groups.length === 0) {
    return (
      <EmptyState title="Create a group first" text="Expenses are shared inside a group. Create one (or join with a code) to get started.">
        <Link to="/groups" className="btn-primary">Go to groups</Link>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={groupId ? `/groups/${groupId}` : '/groups'} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />Back
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{editing ? 'Edit expense' : 'Add an expense'}</h1>

      <form onSubmit={submit} className="mt-6 space-y-6" noValidate>
        <div className="card space-y-4 p-5 sm:p-6">
          <div>
            <label htmlFor="group" className="label">Group</label>
            <select id="group" className="input" value={groupId} disabled={editing} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Select a group…</option>
              {(editing ? [{ id: Number(groupId), name: groupName }] : groups).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="title" className="label">What was it for?</label>
            <input id="title" className="input" maxLength={150} placeholder="e.g. Dinner at Mainland China" value={form.title} onChange={set('title')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className="label">Amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input id="amount" inputMode="decimal" className="input !pl-8" placeholder="0.00" value={form.amount} onChange={set('amount')} />
              </div>
              {form.amount && !amountPaise && <p className="mt-1.5 text-xs text-rose-600">Use numbers only, with up to 2 decimals</p>}
            </div>
            <div>
              <label htmlFor="date" className="label">Date</label>
              <input id="date" type="date" className="input" value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label htmlFor="category" className="label">Category</label>
              <select id="category" className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="paidBy" className="label">Paid by</label>
              <select id="paidBy" className="input" value={form.paidBy} onChange={set('paidBy')} disabled={!members.length}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.id === user.id ? `${m.name} (you)` : m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="desc" className="label">Notes <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="desc" className="input min-h-16 resize-none" maxLength={500} value={form.description} onChange={set('description')} />
          </div>
        </div>

        {members.length > 0 && (
          <div className="card p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">How to split it</h2>
            {convertedNote && <p className="mb-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">The original percentages/shares aren't stored, so each person's final amount is shown as an exact amount. You can switch method if you like.</p>}
            <SplitEditor members={members} parts={parts} setParts={setParts} type={splitType} setType={changeType} preview={preview} myId={user.id} />
          </div>
        )}

        <ErrorBanner>{submitError}</ErrorBanner>

        <div className="flex justify-end gap-3">
          <Link to={groupId ? `/groups/${groupId}` : '/groups'} className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={submitting || !members.length}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
