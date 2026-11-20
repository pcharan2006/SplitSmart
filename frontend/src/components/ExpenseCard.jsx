import { categoryStyle } from '../utils/categories';
import { formatPaise } from '../utils/money';
import { formatDate } from '../utils/format';

// One row in an expense list. `myId` lets us say "You paid" and show the viewer's own share.
export default function ExpenseCard({ expense, myId, showGroup }) {
  const { icon: Icon, color } = categoryStyle(expense.category);
  const paidByMe = expense.paid_by === myId;

  return (
    <div className="group flex items-center gap-4 px-4 py-3.5 transition sm:px-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition duration-300 group-hover:scale-110 group-hover:-rotate-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{expense.title}</p>
        <p className="truncate text-xs text-slate-500">
          {paidByMe ? 'You' : expense.paid_by_name} paid · {formatDate(expense.expense_date)}
          {showGroup && expense.group_name ? ` · ${expense.group_name}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-900">{formatPaise(expense.amount)}</p>
        <p className="text-xs text-slate-500">{expense.my_share > 0 ? `Your share ${formatPaise(expense.my_share)}` : 'Not involved'}</p>
      </div>
    </div>
  );
}
