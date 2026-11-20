// Small loading placeholder: shimmering bars instead of a spinning wheel.
export function Spinner({ className = '' }) {
  return (
    <div className={`space-y-3 py-6 ${className}`} role="status" aria-label="Loading">
      <div className="skeleton h-5 w-2/5" />
      <div className="skeleton h-16" style={{ animationDelay: '120ms' }} />
      <div className="skeleton h-16" style={{ animationDelay: '240ms' }} />
    </div>
  );
}

// Full-page loading placeholder shaped like a dashboard, so nothing jumps when the data arrives.
export function PageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading">
      <div className="skeleton h-36" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" style={{ animationDelay: `${i * 120}ms` }} />)}
      </div>
      <div className="skeleton h-64" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="animate-pop rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-sm">
      {children}
    </div>
  );
}

const badgeTones = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200/70',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200/70',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  red: 'bg-rose-50 text-rose-700 ring-rose-200/70',
};

export function Badge({ tone = 'slate', children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="card animate-fade-up flex flex-col items-center border-dashed !border-violet-200 px-6 py-14 text-center">
      {Icon && (
        <span className="gradient-brand flex h-14 w-14 animate-float items-center justify-center rounded-2xl text-white shadow-[0_12px_24px_-8px_rgb(var(--brand-rgb)/0.7)]">
          <Icon className="h-7 w-7" />
        </span>
      )}
      <p className="mt-5 font-display text-lg font-bold">{title}</p>
      {text && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
