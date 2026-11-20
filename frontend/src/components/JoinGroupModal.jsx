import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { ErrorBanner } from './ui';
import { joinGroup } from '../services/groupService';
import { getErrorMessage } from '../utils/format';

export default function JoinGroupModal({ open, onClose }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setCode(''); setError(''); }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const group = await joinGroup(code.trim());
      onClose();
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Join a group">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">Paste the invitation code a group admin shared with you.</p>
        <ErrorBanner>{error}</ErrorBanner>
        <div>
          <label htmlFor="join-code" className="label">Invitation code</label>
          <input id="join-code" className="input font-mono" autoFocus placeholder="e.g. a1B2c3D4e5F6" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy || code.trim().length < 6}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Join group
          </button>
        </div>
      </form>
    </Modal>
  );
}
