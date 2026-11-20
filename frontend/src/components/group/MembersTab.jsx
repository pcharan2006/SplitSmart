import { useState } from 'react';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { Badge, ErrorBanner } from '../ui';
import { addMember } from '../../services/groupService';
import { getErrorMessage, initials } from '../../utils/format';

export default function MembersTab({ group, myId, isAdmin, onChanged, onRemove }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = isAdmin && !group.is_archived;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await addMember(group.id, email.trim());
      setEmail('');
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <form onSubmit={submit} className="card p-5">
          <label htmlFor="add-email" className="label">Add a registered user by email</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="add-email" type="email" required className="input" placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn-primary shrink-0" disabled={busy || !email}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add member
            </button>
          </div>
          <div className="mt-3 empty:hidden"><ErrorBanner>{error}</ErrorBanner></div>
          <p className="mt-2 text-xs text-slate-400">They must already have an account. Otherwise share an invitation code with them.</p>
        </form>
      )}

      <ul className="card divide-y divide-slate-100">
        {group.members.map((m) => {
          const isSelf = m.id === myId;
          const isCreator = m.id === group.created_by;
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{initials(m.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name}{isSelf && <span className="text-slate-400"> (you)</span>}</p>
                <p className="truncate text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {isCreator && <Badge tone="amber">Creator</Badge>}
                <Badge tone={m.role === 'admin' ? 'indigo' : 'slate'}>{m.role === 'admin' ? 'Admin' : 'Member'}</Badge>
                {canManage && !isSelf && !isCreator && (
                  <button onClick={() => onRemove(m)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${m.name}`}>
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
