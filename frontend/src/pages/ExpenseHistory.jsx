import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, ChevronLeft, ChevronRight, Plus, Receipt, SearchX } from 'lucide-react';
import ExpenseList from '../components/ExpenseList';
import { Spinner, ErrorBanner, EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';
import { listGroups, getGroupExpenses } from '../services/groupService';
import { CATEGORIES } from '../utils/categories';
import { formatPaise } from '../utils/money';
import { getErrorMessage } from '../utils/format';

const PAGE_SIZE = 15;
const blankFilters = { search: '', category: '', from: '', to: '' };

export default function ExpenseHistory() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState(null);
  const [filters, setFilters] = useState(blankFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(filters.search);
  const groupId = searchParams.get('group') || '';

  useEffect(() => {
    listGroups()
      .then((list) => {
        setGroups(list);
        // Default to the first group if none is chosen.
        if (!searchParams.get('group') && list.length) setSearchParams({ group: String(list[0].id) }, { replace: true });
      })
      .catch((err) => setError(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any filter change goes back to page 1.
  useEffect(() => { setPage(1); }, [debouncedSearch, filters.category, filters.from, filters.to, groupId]);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filters.category) params.category = filters.category;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      setData(await getGroupExpenses(groupId, params));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [groupId, page, debouncedSearch, filters.category, filters.from, filters.to]);
  useEffect(() => { load(); }, [load]);

  const set = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);
  const roleOf = (id) => groups?.find((g) => g.id === id)?.role;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const dateRangeInvalid = filters.from && filters.to && filters.from > filters.to;

  if (groups && groups.length === 0) {
    return (
      <EmptyState icon={Receipt} title="No expenses to show" text="Join or create a group, then add your first expense.">
        <Link to="/groups" className="btn-primary">Go to groups</Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="mt-1 text-slate-500">Search and filter everything your group has spent.</p>
        </div>
        <Link to={groupId ? `/expenses/new?group=${groupId}` : '/expenses/new'} className="btn-primary"><Plus className="h-4 w-4" />Add expense</Link>
      </div>

      <div className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="f-group" className="sr-only">Group</label>
          <select id="f-group" className="input" value={groupId} onChange={(e) => setSearchParams({ group: e.target.value })}>
            {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}{g.is_archived ? ' (archived)' : ''}</option>)}
          </select>
        </div>
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <label htmlFor="f-search" className="sr-only">Search</label>
          <input id="f-search" className="input !pl-10" placeholder="Search title or notes…" value={filters.search} onChange={set('search')} />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="f-cat" className="sr-only">Category</label>
          <select id="f-cat" className="input" value={filters.category} onChange={set('category')}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input id="f-from" type="date" className="input" value={filters.from} max={filters.to || undefined} onChange={set('from')} />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input id="f-to" type="date" className="input" value={filters.to} min={filters.from || undefined} onChange={set('to')} />
        </div>
        <div className="flex items-end lg:col-span-2">
          {hasFilters && (
            <button className="btn-secondary w-full" onClick={() => setFilters(blankFilters)}><X className="h-4 w-4" />Clear filters</button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <ErrorBanner>{error}</ErrorBanner>
        {dateRangeInvalid && <ErrorBanner>The "From" date must be before the "To" date.</ErrorBanner>}
        {(!data || (loading && !data.expenses.length)) && !error && <Spinner />}

        {data && (
          <>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{data.total} {data.total === 1 ? 'expense' : 'expenses'}{hasFilters ? ' match your filters' : ''}</span>
              {data.expenses.length > 0 && <span>Page total {formatPaise(data.expenses.reduce((s, e) => s + e.amount, 0))}</span>}
            </div>

            {data.expenses.length === 0 ? (
              <EmptyState icon={hasFilters ? SearchX : Receipt} title={hasFilters ? 'Nothing matches' : 'No expenses yet'} text={hasFilters ? 'Try different filters.' : 'Add the first expense to this group.'} />
            ) : (
              <div className={loading ? 'opacity-60 transition' : 'transition'}>
                <ExpenseList expenses={data.expenses} myId={user.id} isAdmin={(gid) => roleOf(gid) === 'admin'} onChanged={load} />
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button className="btn-secondary !px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                <button className="btn-secondary !px-3" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
