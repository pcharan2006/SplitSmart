import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, KeyRound, Users } from 'lucide-react';
import GroupCard from '../components/GroupCard';
import GroupFormModal from '../components/GroupFormModal';
import JoinGroupModal from '../components/JoinGroupModal';
import { Spinner, ErrorBanner, EmptyState } from '../components/ui';
import { listGroups, createGroup } from '../services/groupService';
import { getErrorMessage } from '../utils/format';

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const load = useCallback(() => {
    listGroups().then(setGroups).catch((err) => setError(getErrorMessage(err)));
  }, []);
  useEffect(load, [load]);

  const active = groups?.filter((g) => !g.is_archived) ?? [];
  const archived = groups?.filter((g) => g.is_archived) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="mt-1 text-slate-500">Flatmates, trips, office lunches: one group for each.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setJoinOpen(true)}><KeyRound className="h-4 w-4" />Join with code</button>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New group</button>
        </div>
      </div>

      <div className="mt-6 space-y-8">
        <ErrorBanner>{error}</ErrorBanner>
        {!groups && !error && <Spinner />}

        {groups && groups.length === 0 && (
          <EmptyState icon={Users} title="No groups yet" text="Create a group for your flat, trip or friends, or join one with an invitation code.">
            <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create your first group</button>
          </EmptyState>
        )}

        {active.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((g) => <GroupCard key={g.id} group={g} />)}
          </div>
        )}

        {archived.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Archived</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((g) => <GroupCard key={g.id} group={g} />)}
            </div>
          </section>
        )}
      </div>

      <GroupFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (data) => {
          const group = await createGroup(data);
          navigate(`/groups/${group.id}`);
        }}
      />
      <JoinGroupModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}
