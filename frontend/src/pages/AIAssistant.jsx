import { useEffect, useState } from 'react';
import { MessageSquare, BarChart3, ShieldCheck } from 'lucide-react';
import ChatPanel from '../components/ai/ChatPanel';
import InsightsPanel from '../components/ai/InsightsPanel';
import { listGroups } from '../services/groupService';

const TABS = [
  { id: 'chat', label: 'Ask', icon: MessageSquare },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

export default function AIAssistant() {
  const [tab, setTab] = useState('chat');
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');

  useEffect(() => { listGroups().then(setGroups).catch(() => {}); }, []);

  const scopeLabel = groupId ? groups.find((g) => String(g.id) === groupId)?.name ?? 'this group' : 'all your groups';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="mt-1 flex items-center gap-1.5 text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-500" />Only sees groups you belong to. Reads your data, never changes it.</p>
        </div>
        <div>
          <label htmlFor="ai-scope" className="sr-only">Data scope</label>
          <select id="ai-scope" className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">All my groups</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Both panels stay mounted so switching tabs doesn't lose the chat or the insights. */}
      <div className="mt-6">
        <div hidden={tab !== 'chat'}><ChatPanel key={`chat-${groupId}`} groupId={groupId} scopeLabel={scopeLabel} /></div>
        <div hidden={tab !== 'insights'}><InsightsPanel key={`ins-${groupId}`} groupId={groupId} scopeLabel={scopeLabel} /></div>
      </div>
    </div>
  );
}
