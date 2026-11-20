import { Loader2 } from 'lucide-react';
import Modal from './Modal';

// "Are you sure?" dialog. Shows server errors (e.g. "group has expenses") inside the dialog.
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, busy, error, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-slate-600">{message}</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
