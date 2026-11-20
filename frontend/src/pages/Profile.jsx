import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import Field from '../components/Field';
import { ErrorBanner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/userService';
import { changePassword } from '../services/authService';
import { assetUrl } from '../utils/assets';
import { formatDate, getErrorMessage, initials } from '../utils/format';
import { passwordProblem } from '../utils/validation';

const MAX_PHOTO = 2 * 1024 * 1024; // same limit as the server
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function Notice({ children }) {
  if (!children) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <CheckCircle2 className="h-4 w-4 shrink-0" />{children}
    </p>
  );
}

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // --- profile ---
  const [name, setName] = useState(user.name);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileOk, setProfileOk] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Make a temporary preview URL for the chosen photo, and free it afterwards.
  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setProfileOk('');
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setProfileError('Please choose a JPG, PNG or WebP image');
    if (file.size > MAX_PHOTO) return setProfileError('That image is over 2 MB. Please choose a smaller one');
    setProfileError('');
    setPhoto(file);
  };

  const dirty = name.trim() !== user.name || Boolean(photo);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileOk('');
    if (name.trim().length < 2) return setProfileError('Name must be at least 2 characters');
    setSavingProfile(true);
    setProfileError('');
    try {
      const updated = await updateProfile({ name: name.trim(), photo });
      setUser(updated);
      setPhoto(null);
      setProfileOk('Profile updated');
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  // --- password ---
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwTouched, setPwTouched] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const pwErrors = {
    current: pw.current ? null : 'Enter your current password',
    next: passwordProblem(pw.next) || (pw.next === pw.current ? 'Choose a password different from the current one' : null),
    confirm: pw.confirm === pw.next ? null : 'Passwords do not match',
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwTouched(true);
    setPwOk('');
    if (Object.values(pwErrors).some(Boolean)) return;
    setSavingPw(true);
    setPwError('');
    try {
      await changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      setPwTouched(false);
      setPwOk('Password changed');
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  const avatar = preview || assetUrl(user.profile_image);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile and settings</h1>
        <p className="mt-1 text-slate-500">Manage your details and keep your account secure.</p>
      </div>

      <form onSubmit={saveProfile} className="card space-y-5 p-5 sm:p-6" noValidate>
        <h2 className="font-semibold">Your details</h2>
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt="Your profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">{initials(user.name)}</span>
          )}
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="photo" onChange={pickPhoto} />
            <button type="button" className="btn-secondary" onClick={() => fileRef.current.click()}><Camera className="h-4 w-4" />{avatar ? 'Change photo' : 'Add photo'}</button>
            <p className="mt-1.5 text-xs text-slate-400">{photo ? `${photo.name} · click Save to apply` : 'JPG, PNG or WebP, up to 2 MB'}</p>
          </div>
        </div>

        <Field id="name" label="Full name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Field id="email" label="Email" value={user.email} readOnly disabled hint="Your email is your login and can't be changed." />
        <p className="text-sm text-slate-500">Member since {formatDate(user.created_at.slice(0, 10))}</p>

        <ErrorBanner>{profileError}</ErrorBanner>
        <Notice>{profileOk}</Notice>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={savingProfile || !dirty}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}Save changes
          </button>
        </div>
      </form>

      <form onSubmit={savePassword} className="card space-y-4 p-5 sm:p-6" noValidate>
        <h2 className="font-semibold">Change password</h2>
        <Field id="current" type="password" label="Current password" autoComplete="current-password" value={pw.current}
          onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwTouched ? pwErrors.current : null} />
        <Field id="new" type="password" label="New password" autoComplete="new-password" value={pw.next} hint="At least 8 characters, with a letter and a number"
          onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwTouched ? pwErrors.next : null} />
        <Field id="confirm" type="password" label="Confirm new password" autoComplete="new-password" value={pw.confirm}
          onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwTouched ? pwErrors.confirm : null} />
        <ErrorBanner>{pwError}</ErrorBanner>
        <Notice>{pwOk}</Notice>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={savingPw}>{savingPw && <Loader2 className="h-4 w-4 animate-spin" />}Update password</button>
        </div>
      </form>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">Log out</h2>
          <p className="mt-0.5 text-sm text-slate-500">You'll need to sign in again on this device.</p>
        </div>
        <button className="btn-secondary !text-rose-600" onClick={() => { logout(); navigate('/login', { replace: true }); }}><LogOut className="h-4 w-4" />Log out</button>
      </section>
    </div>
  );
}
