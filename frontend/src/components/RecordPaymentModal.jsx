import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { ErrorBanner } from './ui';
import { recordSettlement } from '../services/settlementService';
import { rupeesToPaise, paiseToInput } from '../utils/money';
import { getErrorMessage, todayLocal } from '../utils/format';

/**
 * mode "paid"     -> I paid someone. Creates a request; they must confirm it.
 * mode "received" -> Someone paid me. I am confirming it myself, so it is recorded immediately.
 * `preset` (optional) pre-fills the form from a suggested payment.
 */
export default function RecordPaymentModal({ open, onClose, groupId, members, myId, preset, onDone }) {
  const [mode, setMode] = useState('paid');
  const [personId, setPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const others = members.filter((m) => m.id !== myId);

  useEffect(() => {
    if (!open) return;
    setError('');
    setDate(todayLocal());
    setMode(preset?.mode || 'paid');
    setPersonId(String(preset?.personId || others[0]?.id || ''));
    setAmount(preset?.amount ? paiseToInput(preset.amount) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset]);

  const paise = rupeesToPaise(amount);

  const submit = async (e) => {
    e.preventDefault();
    if (!personId) return setError('Choose a person');
    if (!paise) return setError('Enter a valid amount, e.g. 500 or 500.50');
    setBusy(true);
    setError('');
    try {
      await recordSettlement({
        group_id: Number(groupId),
        paid_by: mode === 'paid' ? myId : Number(personId),
        paid_to: mode === 'paid' ? Number(personId) : myId,
        amount: paise,
        payment_date: date,
      });
      onClose();
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const modes = [
    { id: 'paid', label: 'I paid someone' },
    { id: 'received', label: 'Someone paid me' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Record a payment">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {modes.map((m) => (
            <button type="button" key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === m.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {mode === 'paid'
            ? 'They will be asked to confirm they received it. Balances change once they do.'
            : 'You are confirming you received this money, so balances update right away.'}
        </p>

        <ErrorBanner>{error}</ErrorBanner>

        <div>
          <label htmlFor="pay-person" className="label">{mode === 'paid' ? 'Paid to' : 'Received from'}</label>
          <select id="pay-person" className="input" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pay-amount" className="label">Amount</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <input id="pay-amount" inputMode="decimal" className="input !pl-8" placeholder="0.00" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="pay-date" className="label">Date</label>
            <input id="pay-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'paid' ? 'Send for confirmation' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
