import { Link } from 'react-router-dom';
import { Split } from 'lucide-react';

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5">
      <span className="gradient-brand flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-[0_6px_16px_-4px_rgb(var(--brand-rgb)/0.7)] transition duration-300 group-hover:rotate-6 group-hover:scale-105">
        <Split className="h-5 w-5" />
      </span>
      <span className={`font-display text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Split<span className={light ? 'text-fuchsia-300' : 'gradient-text'}>Smart</span>
      </span>
    </Link>
  );
}
