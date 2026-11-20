import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, UserPlus, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2, LogOut } from 'lucide-react';
import { Spinner, Badge, ErrorBanner, EmptyState } from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import GroupFormModal from '../components/GroupFormModal';
import InviteModal from '../components/group/InviteModal';
import ExpensesTab from '../components/group/ExpensesTab';
import BalancesTab from '../components/group/BalancesTab';
import MembersTab from '../components/group/MembersTab';
import { useAuth } from '../context/AuthContext';
import * as groups from '../services/groupService';
import { getErrorMessage } from '../utils/format';

const TABS = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'balances', label: 'Balances' },
  { id: 'members', label: 'Members' },
];

// A small "⋯" menu that closes when you click elsewhere.
function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="relative" ref={ref}>
      <button className="btn-secondary !px-3" onClick={() => setOpen((o) => !o)} aria-label="More actions" aria-expanded={open}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="card absolute right-0 z-30 mt-2 w-52 overflow-hidden py-1 shadow-xl">
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button key={label} onClick={() => { setOpen(false); onClick(); }}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${danger ? 'text-rose-600' : 'text-slate-700'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [expenses, setExpenses] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('expenses');

  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: 'delete'|'archive'|'restore'|'leave'|'remove', member? }
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const load = useCallback(async () => {
    try {
      const [g, b, s, e] = await Promise.all([
        groups.getGroup(id), groups.getBalances(id), groups.getSuggestions(id), groups.getGroupExpenses(id, { limit: 50 }),
      ]);
      setGroup(g); setBalanceData(b); setSuggestions(s); setExpenses(e);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else setError(getErrorMessage(err));
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (notFound) {
    return (
      <EmptyState title="Group not found" text="It may have been deleted, or you're not a member.">
        <Link to="/groups" className="btn-primary">Back to groups</Link>
      </EmptyState>
    );
  }
  if (!group || !balanceData || !expenses) return error ? <ErrorBanner>{error}</ErrorBanner> : <Spinner />;

  const isAdmin = group.my_role === 'admin';
  const isCreator = group.created_by === user.id;
  const archived = Boolean(group.is_archived);

  // What each confirm dialog says and does.
  const dialogs = {
    delete: { title: 'Delete this group?', message: `"${group.name}" and its members will be removed permanently. This only works if the group has no expenses. Otherwise, archive it.`, label: 'Delete group', danger: true,
      run: async () => { await groups.deleteGroup(group.id); navigate('/groups', { replace: true }); } },
    archive: { title: 'Archive this group?', message: 'Archived groups become read-only: no new expenses or payments. You can restore it any time.', label: 'Archive',
      run: async () => { await groups.archiveGroup(group.id); await load(); } },
    restore: { title: 'Restore this group?', message: 'The group becomes active again.', label: 'Restore',
      run: async () => { await groups.unarchiveGroup(group.id); await load(); } },
    leave: { title: 'Leave this group?', message: 'You will lose access to it. You can only leave if you have no expenses in the group.', label: 'Leave group', danger: true,
      run: async () => { await groups.removeMember(group.id, user.id); navigate('/groups', { replace: true }); } },
    remove: { title: `Remove ${confirm?.member?.name}?`, message: 'They will no longer be in this group. This only works if they have no expenses in it.', label: 'Remove member', danger: true,
      run: async () => { await groups.removeMember(group.id, confirm.member.id); await load(); } },
  };
  const dialog = confirm ? dialogs[confirm.kind] : null;

  const runConfirm = async () => {
    setConfirmBusy(true);
    setConfirmError('');
    try {
      await dialog.run();
      setConfirm(null);
    } catch (err) {
      setConfirmError(getErrorMessage(err));
    } finally {
      setConfirmBusy(false);
    }
  };
  const ask = (kind, member) => { setConfirmError(''); setConfirm({ kind, member }); };

  const menuItems = [
    isAdmin && !archived && { label: 'Edit group', icon: Pencil, onClick: () => setEditOpen(true) },
    isAdmin && !archived && { label: 'Archive group', icon: Archive, onClick: () => ask('archive') },
    isAdmin && archived && { label: 'Restore group', icon: ArchiveRestore, onClick: () => ask('restore') },
    isAdmin && { label: 'Delete group', icon: Trash2, onClick: () => ask('delete'), danger: true },
    !isCreator && { label: 'Leave group', icon: LogOut, onClick: () => ask('leave'), danger: true },
  ].filter(Boolean);

  return (
    <div>
      <Link to="/groups" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />All groups
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-2xl font-bold tracking-tight">{group.name}</h1>
            {archived && <Badge tone="amber">Archived</Badge>}
            <Badge tone={isAdmin ? 'indigo' : 'slate'}>{isAdmin ? 'Admin' : 'Member'}</Badge>
          </div>
          {group.description && <p className="mt-1.5 max-w-2xl text-slate-500">{group.description}</p>}
        </div>
        <div className="flex gap-2">
          {isAdmin && !archived && (
            <button className="btn-secondary" onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" />Invite</button>
          )}
          {!archived && (
            <Link to={`/expenses/new?group=${group.id}`} className="btn-primary"><Plus className="h-4 w-4" />Add expense</Link>
          )}
          <MoreMenu items={menuItems} />
        </div>
      </div>

      {archived && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This group is archived and read-only.{isAdmin && ' Restore it from the ⋯ menu to add expenses again.'}
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t.label}
            {t.id === 'members' && <span className="ml-1.5 text-slate-400">{group.members.length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'expenses' && <ExpensesTab data={expenses} groupId={group.id} myId={user.id} archived={archived} isAdmin={isAdmin} onChanged={load} />}
        {tab === 'balances' && <BalancesTab balances={balanceData.balances} suggestions={suggestions} myId={user.id} />}
        {tab === 'members' && <MembersTab group={group} myId={user.id} isAdmin={isAdmin} onChanged={load} onRemove={(m) => ask('remove', m)} />}
      </div>

      <GroupFormModal open={editOpen} onClose={() => setEditOpen(false)} group={group}
        onSubmit={async (data) => { await groups.updateGroup(group.id, data); await load(); }} />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} groupId={group.id} />
      <ConfirmDialog open={Boolean(dialog)} title={dialog?.title} message={dialog?.message} confirmLabel={dialog?.label}
        danger={dialog?.danger} busy={confirmBusy} error={confirmError} onConfirm={runConfirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
