import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/format';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your groups and balances."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" value={form.email} onChange={update('email')} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">Password</label>
            <Link to="/forgot-password" className="mb-1.5 text-xs font-medium text-indigo-600 hover:underline">Forgot password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" required className="input" placeholder="Your password" value={form.password} onChange={update('password')} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting || !form.email || !form.password}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
