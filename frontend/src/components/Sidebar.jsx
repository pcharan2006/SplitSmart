import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Receipt, HandCoins, BarChart3, Sparkles, UserCircle, LogOut, X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';
import { assetUrl } from '../utils/assets';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/groups', label: 'Groups', icon: Users },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/settlements', label: 'Settlements', icon: HandCoins },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Dark backdrop behind the drawer on small screens */}
      {open && <div className="fixed inset-0 z-30 animate-fade-in bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden bg-slate-950 text-white/75 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Decorative glow blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 animate-drift rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 animate-drift rounded-full bg-fuchsia-600/20 blur-3xl [animation-delay:-8s]" />

        <div className="relative flex h-16 items-center justify-between px-5">
          <Logo to="/dashboard" light />
          <button className="rounded-lg p-1.5 text-white/55 hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {links.map(({ to, label, icon: Icon, badge }, i) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              style={{ animationDelay: `${i * 45}ms` }}
              className={({ isActive }) =>
                `group relative flex animate-fade-up items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
                  isActive
                    ? 'bg-linear-to-r from-indigo-500/25 to-fuchsia-500/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                    : 'text-white/55 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-linear-to-b from-indigo-400 to-fuchsia-400 shadow-[0_0_12px_rgb(var(--accent-rgb)/0.8)]" />}
                  <Icon className={`h-5 w-5 transition duration-200 group-hover:scale-110 ${isActive ? 'text-violet-300' : ''}`} />
                  {label}
                  {badge && <span className="gradient-brand ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
            {user?.profile_image ? (
              <img src={assetUrl(user.profile_image)} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20" />
            ) : (
              <span className="gradient-brand flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">{initials(user?.name)}</span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-white/55">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
