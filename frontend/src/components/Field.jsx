// A labelled input with an inline error message. Extra props (type, value, onChange…) go to the <input>.
export default function Field({ id, label, error, hint, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        className={`input ${error ? '!border-rose-400 !ring-rose-500/20' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
