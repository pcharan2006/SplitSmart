const pad = (n) => String(n).padStart(2, '0');

// { from: '2026-11-01', to: '2026-11-30' } for a month (inclusive).
function monthRange(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

function currentYearMonth(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function previousMonth({ year, month }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// The last n months ending with the current one, oldest first.
function lastNMonths(n, now = new Date()) {
  let cur = currentYearMonth(now);
  const out = [cur];
  for (let i = 1; i < n; i++) {
    cur = previousMonth(cur);
    out.unshift(cur);
  }
  return out;
}

// Months with no spending still need a row (0) so charts show a continuous axis.
function fillMonths(months, rows) {
  const totals = new Map(rows.map((r) => [`${r.year}-${r.month}`, r.total]));
  return months.map((m) => ({ year: m.year, month: m.month, total: totals.get(`${m.year}-${m.month}`) || 0 }));
}

// Display-only percentage (e.g. 12.5). null when there is nothing to compare against.
function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) * 10000) / previous) / 100;
}

module.exports = { monthRange, currentYearMonth, previousMonth, lastNMonths, fillMonths, percentChange };
