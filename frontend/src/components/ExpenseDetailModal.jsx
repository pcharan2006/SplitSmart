import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { Badge, ErrorBanner, Spinner } from './ui';
import { getExpense, deleteExpense } from '../services/expenseService';
import { categoryStyle } from '../utils/categories';
import { formatPaise } from '../utils/money';
import { formatDate, getErrorMessage } from '../utils/format';

const SPLIT_LABEL = { equal: 'Split equally', exact: 'Exact amounts', percentage: 'By percentage', shares: 'By shares' };

// Shows one expense in full: who paid, each person's share, and Edit/Delete for people allowed to.
export default function ExpenseDetailModal({ expenseId, myId, canManage, onClose, onChanged }) {
  const [expense, setExpense] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expenseId) return;
    setExpense(null); setError(''); setConfirming(false);
    getExpense(expenseId).then(setExpense).catch((err) => setError(getErrorMessage(err)));
  }, [expenseId]);

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteExpense(expenseId);
      onClose();
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const style = expense && categoryStyle(expense.category);

  return (
    <Modal open={Boolean(expenseId)} onClose={onClose} title="Expense details">
      {!expense && !error && <Spinner className="!py-8" />}
      <ErrorBanner>{error}</ErrorBanner>
      {expense && (
        <div>
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.color}`}><style.icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{expense.title}</p>
              <p className="text-sm text-slate-500">{formatDate(expense.expense_date)} · <Badge>{expense.category}</Badge></p>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight">{formatPaise(expense.amount)}</p>
          <p className="mt-1 text-sm text-slate-500">Paid by {expense.paid_by === myId ? 'you' : expense.paid_by_name} · {SPLIT_LABEL[expense.split_type]}</p>
          {expense.description && <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">{expense.description}</p>}

          <h3 className="mb-2 mt-5 text-sm font-semibold">Who owes what</h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {expense.splits.map((s) => (
              <li key={s.user_id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                <span>{s.user_id === myId ? 'You' : s.name}</span>
                <span className="font-semibold tabular-nums">{formatPaise(s.share_amount)}</span>
              </li>
            ))}
          </ul>

          {canManage && (
            <div className="mt-6 flex items-center justify-end gap-3">
              {confirming ? (
                <>
                  <span className="mr-auto text-sm text-slate-600">Delete this expense?</span>
                  <button className="btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>Keep</button>
                  <button className="btn-danger" onClick={remove} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Yes, delete</button>
                </>
              ) : (
                <>
                  <button className="btn-secondary !text-rose-600" onClick={() => setConfirming(true)}><Trash2 className="h-4 w-4" />Delete</button>
                  <Link to={`/expenses/${expense.id}/edit`} className="btn-primary"><Pencil className="h-4 w-4" />Edit</Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
