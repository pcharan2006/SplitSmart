import { useEffect, useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import Modal from '../Modal';
import { ErrorBanner } from '../ui';
import { createInvite } from '../../services/groupService';
import { formatDate, getErrorMessage } from '../../utils/format';

export default function InviteModal({ open, onClose, groupId }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) { setInvite(null); setError(''); setCopied(false); }
  }, [open]);

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      setInvite(await createInvite(groupId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked; the code is still visible to copy by hand */
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite people">
      <p className="text-sm text-slate-500">Generate a code and share it. Anyone who has an account can use it under <strong>Groups → Join with code</strong>. It expires in 7 days.</p>
      <div className="mt-4 space-y-4">
        <ErrorBanner>{error}</ErrorBanner>
        {invite ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs font-medium text-indigo-700">Invitation code</p>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <code className="break-all text-lg font-semibold tracking-wide text-slate-900">{invite.code}</code>
              <button onClick={copy} className="btn-secondary shrink-0 !py-2" aria-label="Copy code">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-indigo-700/80">Expires {formatDate(invite.expiresAt)}</p>
          </div>
        ) : (
          <button className="btn-primary w-full" onClick={generate} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate invitation code
          </button>
        )}
      </div>
    </Modal>
  );
}
