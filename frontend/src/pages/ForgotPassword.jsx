import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { ErrorBanner } from '../components/ui';
import { forgotPassword } from '../services/authService';
import { getErrorMessage } from '../utils/format';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    setBusy(true);
    setError('');
    try {
      setResult(await forgotPassword(email.trim()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll help you set a new one."
      footer={<Link to="/login" className="font-semibold text-indigo-600 hover:underline">Back to log in</Link>}
    >
      {result ? (
        <div className="space-y-4" role="status">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{result.message}</p>
          </div>
          {/* Only the development backend returns this token (there is no email service yet). */}
          {result.devResetToken && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Development mode</p>
              <p className="mt-1">No email is sent locally, so here is your reset link directly:</p>
              <Link to={`/reset-password?token=${result.devResetToken}`} className="btn-primary mt-3 w-full">Set a new password</Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <ErrorBanner>{error}</ErrorBanner>
          <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn-primary w-full" disabled={busy || !email}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Send reset link
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
