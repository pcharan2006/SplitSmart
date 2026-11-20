import { Link } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';
import { assetUrl } from '../utils/assets';

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 border-x-0 border-t-0 border-b-slate-200/60 px-4 sm:px-6">
      <button className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <Link to="/expenses/new" className="btn-primary !py-2">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add expense</span>
      </Link>
      <ThemeToggle />
      <NotificationBell />
      <Link to="/profile" className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-white" aria-label="Your profile">
        {user?.profile_image ? (
          <img src={assetUrl(user.profile_image)} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
        ) : (
          <span className="gradient-brand flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
            {initials(user?.name)}
          </span>
        )}
        <span className="hidden text-sm font-medium text-slate-700 md:block">{user?.name}</span>
      </Link>
    </header>
  );
}
