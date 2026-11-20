import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { ErrorBanner } from '../components/ui';
import { resetPassword } from '../services/authService';
import { getErrorMessage } from '../utils/format';
import { passwordProblem } from '../utils/validation';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const errors = {
    password: passwordProblem(form.password),
    confirm: form.confirm === form.password ? null : 'Passwords do not match',
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.password || errors.confirm) return;
    setBusy(true);
    setError('');
    try {
      await resetPassword({ token, newPassword: form.password });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
      footer={<Link to="/login" className="font-semibold text-indigo-600 hover:underline">Back to log in</Link>}
    >
      {done ? (
        <div className="space-y-4" role="status">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><p>Your password has been reset.</p>
          </div>
          <Link to="/login" className="btn-primary w-full">Log in</Link>
        </div>
      ) : !token ? (
        <div className="space-y-4">
          <ErrorBanner>This reset link is missing its token. Please request a new one.</ErrorBanner>
          <Link to="/forgot-password" className="btn-primary w-full">Request a new link</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <ErrorBanner>{error}</ErrorBanner>
          {error && <p className="text-sm text-slate-500">Links expire after 30 minutes and work once. <Link to="/forgot-password" className="font-medium text-indigo-600 hover:underline">Request a new one</Link>.</p>}
          <Field id="password" type="password" label="New password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={touched ? errors.password : null} />
          <Field id="confirm" type="password" label="Confirm new password" autoComplete="new-password"
            value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={touched ? errors.confirm : null} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Reset password
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
