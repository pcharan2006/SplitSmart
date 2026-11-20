import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPaise } from '../utils/money';
import { categoryColor } from '../utils/categories';
import { monthLabel } from '../utils/format';
import { useTheme } from '../context/ThemeContext';

const PRIMARY = '#1f7f5a';

// Chart colours are plain hex (SVG), so they pick the right set for the current theme here.
function useChartColors() {
  const { isDark } = useTheme();
  return isDark
    ? { grid: '#1f332a', axis: '#8fa89a', cursor: 'rgba(95,203,164,0.1)', pastTop: '#2d6b53', pastBottom: '#1d4636', last: '#3a5b4a', nowTop: '#f7b32b', nowBottom: '#2fb286' }
    : { grid: '#e2d9c2', axis: '#7a7a66', cursor: 'rgba(22,122,92,0.08)', pastTop: '#b9dccb', pastBottom: '#d9ede1', last: '#cfc7ae', nowTop: '#eba00f', nowBottom: '#0f5b48' };
}

// Axis ticks are shown in rupees, compact: 150000 paise -> "₹1.5k"
const compact = (paise) => {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${+(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${+(rupees / 1000).toFixed(1)}k`;
  return `₹${rupees}`;
};

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/70 bg-white/90 px-3.5 py-2.5 text-sm shadow-[0_18px_36px_-12px_rgb(var(--brand-rgb)/0.4)] backdrop-blur-md">
      <p className="font-medium text-slate-900">{label ?? payload[0].payload.category}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-slate-600">
          {p.name !== 'value' && p.name !== 'total' ? `${p.name}: ` : ''}<span className="font-semibold text-slate-900">{formatPaise(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// Bars for the last N months of spending. `data` = [{ year, month, total }]
export function SpendingBarChart({ data, height = 260 }) {
  const c = useChartColors();
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.year, d.month) }));
  const last = rows.length - 1;
  return (
    <div role="img" aria-label="Bar chart of monthly spending" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barNow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.nowTop} />
              <stop offset="100%" stopColor={c.nowBottom} />
            </linearGradient>
            <linearGradient id="barPast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.pastTop} />
              <stop offset="100%" stopColor={c.pastBottom} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="4 6" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 12 }} />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} tick={{ fill: c.axis, fontSize: 12 }} allowDecimals={false} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: c.cursor, radius: 8 }} />
          <Bar dataKey="total" name="Spent" radius={[10, 10, 0, 0]} maxBarSize={44} animationDuration={900}>
            {rows.map((_, i) => <Cell key={i} fill={i === last ? 'url(#barNow)' : 'url(#barPast)'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut + a legend list with exact amounts. `data` = [{ category, total }]
export function CategoryDonut({ data, height = 200 }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  return (
    <div>
      <div role="img" aria-label="Donut chart of spending by category" style={{ height }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="category" innerRadius="62%" outerRadius="92%" paddingAngle={data.length > 1 ? 3 : 0} cornerRadius={6} stroke="none" animationDuration={900}>
              {data.map((d) => <Cell key={d.category} fill={categoryColor(d.category)} />)}
            </Pie>
            <Tooltip content={<MoneyTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-500">Total</span>
          <span className="font-display text-base font-extrabold">{formatPaise(total)}</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((d) => (
          <li key={d.category} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(d.category) }} />
            <span className="flex-1 truncate text-slate-700">{d.category}</span>
            <span className="text-slate-400">{total ? Math.round((d.total * 100) / total) : 0}%</span>
            <span className="w-24 text-right font-semibold tabular-nums">{formatPaise(d.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// This month vs last month, side by side per category.
export function CategoryCompareChart({ thisMonth, lastMonth, height = 280 }) {
  const c = useChartColors();
  const cats = [...new Set([...thisMonth.map((c) => c.category), ...lastMonth.map((c) => c.category)])];
  const rows = cats.map((category) => ({
    category,
    'This month': thisMonth.find((c) => c.category === category)?.total || 0,
    'Last month': lastMonth.find((c) => c.category === category)?.total || 0,
  }));
  return (
    <div role="img" aria-label="Category spending this month compared with last month" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fill: c.axis, fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={56} />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} tick={{ fill: c.axis, fontSize: 12 }} allowDecimals={false} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: c.cursor, radius: 8 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Last month" fill={c.last} radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Bar dataKey="This month" fill={PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
