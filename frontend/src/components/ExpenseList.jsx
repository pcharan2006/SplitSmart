import { useState } from 'react';
import ExpenseCard from './ExpenseCard';
import ExpenseDetailModal from './ExpenseDetailModal';

// A list of clickable expenses. Clicking opens the detail dialog.
// isAdmin(groupId) says whether the viewer is an admin of that expense's group.
export default function ExpenseList({ expenses, myId, isAdmin, showGroup, onChanged }) {
  const [openId, setOpenId] = useState(null);
  const open = expenses.find((e) => e.id === openId);
  const canManage = open ? open.created_by === myId || isAdmin(open.group_id) : false;

  return (
    <>
      <ul className="card divide-y divide-slate-100 overflow-hidden">
        {expenses.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => setOpenId(e.id)} className="block w-full text-left transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
              <ExpenseCard expense={e} myId={myId} showGroup={showGroup} />
            </button>
          </li>
        ))}
      </ul>
      <ExpenseDetailModal expenseId={openId} myId={myId} canManage={canManage} onClose={() => setOpenId(null)} onChanged={onChanged} />
    </>
  );
}
