import { Link } from 'react-router-dom';
import { Plus, Receipt } from 'lucide-react';
import ExpenseList from '../ExpenseList';
import { EmptyState } from '../ui';

export default function ExpensesTab({ data, groupId, myId, archived, isAdmin, onChanged }) {
  if (data.expenses.length === 0) {
    return (
      <EmptyState icon={Receipt} title="No expenses yet" text="Add the first shared expense and we'll work out who owes what.">
        {!archived && <Link to={`/expenses/new?group=${groupId}`} className="btn-primary"><Plus className="h-4 w-4" />Add expense</Link>}
      </EmptyState>
    );
  }
  return (
    <div>
      <ExpenseList expenses={data.expenses} myId={myId} isAdmin={() => isAdmin} onChanged={onChanged} />
      {data.total > data.expenses.length && (
        <p className="mt-3 text-center text-sm text-slate-500">
          Showing the latest {data.expenses.length} of {data.total} expenses. <Link to={`/expenses?group=${groupId}`} className="font-medium text-indigo-600 hover:underline">See all with filters</Link>
        </p>
      )}
    </div>
  );
}
