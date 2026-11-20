import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/format';
import { passwordProblem } from '../utils/validation';

// Same rules as the backend, checked here first so people get instant feedback.
function validate({ name, email, password, confirmPassword }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address';
  const pwProblem = passwordProblem(password);
  if (pwProblem) errors.password = pwProblem;
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const errors = validate(form);
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));
  const show = (field) => (touched[field] ? errors[field] : undefined);

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (Object.keys(errors).length) return;
    setServerError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start splitting expenses in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {serverError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        )}
        <Field id="name" label="Full name" autoComplete="name" placeholder="Asha Rao" value={form.name} onChange={update('name')} onBlur={blur('name')} error={show('name')} />
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update('email')} onBlur={blur('email')} error={show('email')} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters, with a number" value={form.password} onChange={update('password')} onBlur={blur('password')} error={show('password')} />
        <Field id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat your password" value={form.confirmPassword} onChange={update('confirmPassword')} onBlur={blur('confirmPassword')} error={show('confirmPassword')} />
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
