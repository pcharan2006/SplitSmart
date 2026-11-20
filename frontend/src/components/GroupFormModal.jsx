import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { ErrorBanner } from './ui';
import { getErrorMessage } from '../utils/format';

// Used for both "Create group" (no `group` prop) and "Edit group".
export default function GroupFormModal({ open, onClose, group, onSubmit }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm({ name: group?.name || '', description: group?.description || '' });
      setError('');
    }
  }, [open, group]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Group name must be at least 2 characters');
    setBusy(true);
    setError('');
    try {
      await onSubmit({ name: form.name.trim(), description: form.description.trim() });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={group ? 'Edit group' : 'Create a group'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBanner>{error}</ErrorBanner>
        <div>
          <label htmlFor="g-name" className="label">Group name</label>
          <input id="g-name" className="input" autoFocus maxLength={100} placeholder="e.g. Flat Roommates, Goa Trip" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="g-desc" className="label">Description <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea id="g-desc" className="input min-h-20 resize-none" maxLength={500} placeholder="What is this group for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {group ? 'Save changes' : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
