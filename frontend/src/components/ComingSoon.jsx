import { Construction } from 'lucide-react';

// Temporary placeholder shown on pages we haven't built yet.
export default function ComingSoon({ title, description }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Construction className="h-6 w-6" />
        </span>
        <p className="mt-4 font-semibold">Coming in the next steps</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
