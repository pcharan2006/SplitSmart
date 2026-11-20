import { Link } from 'react-router-dom';
import { Users, ArrowUpRight } from 'lucide-react';
import { Badge } from './ui';

// Each group gets its own colour (stable, chosen from its id) so groups are recognisable at a glance.
const palettes = [
  'from-indigo-500 to-violet-500 shadow-violet-500/30',
  'from-fuchsia-500 to-pink-500 shadow-pink-500/30',
  'from-sky-500 to-cyan-500 shadow-sky-500/30',
  'from-amber-500 to-orange-500 shadow-orange-500/30',
  'from-emerald-500 to-teal-500 shadow-emerald-500/30',
  'from-rose-500 to-red-500 shadow-rose-500/30',
];
export const groupGradient = (id) => palettes[Math.abs(Number(id) || 0) % palettes.length];

export default function GroupCard({ group }) {
  return (
    <Link to={`/groups/${group.id}`} className={`spotlight card lift group block p-5 ${group.is_archived ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br font-display text-xl font-extrabold text-white shadow-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110 ${groupGradient(group.id)}`}>
          {group.name[0].toUpperCase()}
        </span>
        <div className="flex gap-1.5">
          {group.is_archived ? <Badge tone="amber">Archived</Badge> : null}
          <Badge tone={group.role === 'admin' ? 'indigo' : 'slate'}>{group.role === 'admin' ? 'Admin' : 'Member'}</Badge>
        </div>
      </div>
      <h3 className="mt-4 truncate text-lg font-bold text-slate-900">{group.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{group.description || 'No description'}</p>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition duration-300 group-hover:bg-violet-100 group-hover:text-violet-600">
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
