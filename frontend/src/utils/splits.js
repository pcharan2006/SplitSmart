import { rupeesToPaise, formatPaise } from './money';

/*
 * Live preview of how an expense will be split. This mirrors the backend's maths so people see
 * the result while typing, but the BACKEND is the authority: it re-checks everything on save.
 */

// Largest-remainder split: parts always add up to exactly `total` (BigInt avoids overflow).
export function allocate(total, weights) {
  const T = BigInt(total);
  const W = weights.map((w) => BigInt(w));
  const sumW = W.reduce((a, b) => a + b, 0n);
  const base = W.map((w) => (T * w) / sumW);
  const rem = W.map((w) => (T * w) % sumW);
  const leftover = Number(T - base.reduce((a, b) => a + b, 0n));
  const order = weights.map((_, i) => i).sort((a, b) => (rem[b] === rem[a] ? a - b : rem[b] > rem[a] ? 1 : -1));
  const out = base.map(Number);
  for (let k = 0; k < leftover; k++) out[order[k]] += 1;
  return out;
}

// "33.33" -> 3333 basis points (100% = 10000). Null if not a valid percentage.
function percentToBp(value) {
  const s = String(value ?? '').trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

const toShares = (value) => (/^\d+$/.test(String(value ?? '').trim()) ? Number(value) : null);

/**
 * @param type     'equal' | 'exact' | 'percentage' | 'shares'
 * @param amount   total in paise (or null if not entered yet)
 * @param members  [{ id, name }]
 * @param parts    { [userId]: { on: boolean, value: string } }
 * @returns { shares: { [userId]: paise }, problem: string|null, note: string|null }
 */
export function buildPreview({ type, amount, members, parts }) {
  const chosen = members.filter((m) => parts[m.id]?.on);
  if (chosen.length === 0) return { shares: {}, problem: 'Select at least one person', note: null };
  if (!amount) return { shares: {}, problem: null, note: 'Enter an amount to see the split' };

  const toMap = (arr) => Object.fromEntries(chosen.map((m, i) => [m.id, arr[i]]));

  if (type === 'equal') {
    return { shares: toMap(allocate(amount, chosen.map(() => 1))), problem: null, note: null };
  }

  if (type === 'exact') {
    const paise = chosen.map((m) => rupeesToPaise(parts[m.id].value));
    const shares = Object.fromEntries(chosen.map((m, i) => [m.id, paise[i] ?? 0]));
    if (paise.some((p) => p === null || p <= 0)) return { shares, problem: 'Enter an amount (more than ₹0) for everyone selected', note: null };
    const sum = paise.reduce((a, b) => a + b, 0);
    if (sum < amount) return { shares, problem: `${formatPaise(amount - sum)} still to assign`, note: null };
    if (sum > amount) return { shares, problem: `${formatPaise(sum - amount)} over the total`, note: null };
    return { shares, problem: null, note: null };
  }

  if (type === 'percentage') {
    const bps = chosen.map((m) => percentToBp(parts[m.id].value));
    if (bps.some((b) => b === null || b <= 0)) return { shares: {}, problem: 'Enter a percentage (up to 2 decimals) for everyone selected', note: null };
    const sum = bps.reduce((a, b) => a + b, 0);
    if (sum !== 10000) return { shares: {}, problem: `Percentages total ${sum / 100}%. They must add up to 100%`, note: null };
    return { shares: toMap(allocate(amount, bps)), problem: null, note: null };
  }

  // shares
  const counts = chosen.map((m) => toShares(parts[m.id].value));
  if (counts.some((c) => c === null || c <= 0)) return { shares: {}, problem: 'Enter a whole number of shares (1 or more) for everyone selected', note: null };
  return { shares: toMap(allocate(amount, counts)), problem: null, note: null };
}

// The participants array the API expects.
export function buildParticipants(type, members, parts) {
  return members
    .filter((m) => parts[m.id]?.on)
    .map((m) => {
      const value = parts[m.id].value;
      if (type === 'exact') return { user_id: m.id, value: rupeesToPaise(value) };
      if (type === 'percentage') return { user_id: m.id, value: Number(value) };
      if (type === 'shares') return { user_id: m.id, value: Number(value) };
      return { user_id: m.id };
    });
}
