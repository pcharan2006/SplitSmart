const ApiError = require('./ApiError');

// ALL money in this app is an integer number of paise (₹1 = 100 paise).
// Integers are exact in JavaScript; decimals like 0.1 + 0.2 are not.
// Percentages are handled as "basis points": 33.33% = 3333 bp, 100% = 10000 bp.

const CATEGORIES = [
  'Food', 'Rent', 'Groceries', 'Transportation', 'Electricity',
  'Entertainment', 'Shopping', 'Travel', 'Utilities', 'Others',
];
const SPLIT_TYPES = ['equal', 'exact', 'percentage', 'shares'];

const bad = (msg) => new ApiError(400, msg);

/**
 * Split `total` paise in proportion to `weights` so the parts ALWAYS add up to exactly `total`.
 * Uses the "largest remainder" method: everyone gets the rounded-down amount, then the
 * leftover paise are handed out one each to those with the biggest fractional remainders.
 * Example: allocate(10000, [1,1,1]) -> [3334, 3333, 3333]
 * BigInt is used internally so large amounts can never overflow.
 */
function allocate(total, weights) {
  const T = BigInt(total);
  const W = weights.map((w) => BigInt(w));
  const sumW = W.reduce((a, b) => a + b, 0n);
  if (sumW <= 0n) throw bad('Split weights must be positive');

  const base = W.map((w) => (T * w) / sumW);
  const rem = W.map((w) => (T * w) % sumW);
  let leftover = Number(T - base.reduce((a, b) => a + b, 0n));

  const order = weights
    .map((_, i) => i)
    .sort((a, b) => (rem[b] === rem[a] ? a - b : rem[b] > rem[a] ? 1 : -1)); // biggest remainder first, ties by position
  const result = base.map(Number);
  for (let k = 0; k < leftover; k++) result[order[k]] += 1;
  return result;
}

// "33.33" or 33.33 -> 3333 basis points. Rejects more than 2 decimals.
function percentToBasisPoints(value) {
  const s = String(value).trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) throw bad('Percentages must be numbers with at most 2 decimal places');
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

const isPositiveInt = (n) => Number.isSafeInteger(n) && n > 0;

/**
 * Turn a split request into exact per-person shares.
 * participants: [{ user_id, value }]
 *   equal      -> value ignored
 *   exact      -> value = paise that person owes
 *   percentage -> value = percent (e.g. 33.33); must add up to exactly 100
 *   shares     -> value = whole number of shares (e.g. 2)
 * Returns [{ user_id, share_amount }] whose share_amount values sum to `amount`.
 */
function computeSplits({ splitType, amount, participants }) {
  if (!SPLIT_TYPES.includes(splitType)) throw bad('Invalid split type');
  if (!isPositiveInt(amount)) throw bad('Amount must be a positive whole number of paise');
  if (!Array.isArray(participants) || participants.length === 0) throw bad('At least one participant is required');

  const ids = participants.map((p) => p.user_id);
  if (new Set(ids).size !== ids.length) throw bad('Each participant can only appear once');

  let amounts;
  if (splitType === 'equal') {
    amounts = allocate(amount, ids.map(() => 1));
  } else if (splitType === 'exact') {
    amounts = participants.map((p) => {
      if (!isPositiveInt(p.value)) throw bad('Exact amounts must be positive whole numbers of paise');
      return p.value;
    });
    const sum = amounts.reduce((a, b) => a + b, 0);
    if (sum !== amount) throw bad(`Exact amounts add up to ${sum} paise but the expense is ${amount} paise`);
  } else if (splitType === 'percentage') {
    const bps = participants.map((p) => {
      const bp = percentToBasisPoints(p.value);
      if (bp <= 0) throw bad('Each percentage must be greater than 0');
      return bp;
    });
    const sum = bps.reduce((a, b) => a + b, 0);
    if (sum !== 10000) throw bad(`Percentages add up to ${sum / 100}% but must total 100%`);
    amounts = allocate(amount, bps);
  } else {
    const shares = participants.map((p) => {
      if (!isPositiveInt(p.value)) throw bad('Shares must be positive whole numbers');
      return p.value;
    });
    amounts = allocate(amount, shares);
  }

  return participants.map((p, i) => ({ user_id: p.user_id, share_amount: amounts[i] }));
}

/**
 * 123456 paise -> "₹1,234.56" (Indian digit grouping). Integer maths only, display purposes.
 */
function formatPaise(paise) {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const whole = String(Math.floor(abs / 100));
  const frac = String(abs % 100).padStart(2, '0');
  // Indian grouping: last 3 digits, then groups of 2.
  const grouped = whole.length > 3
    ? whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + whole.slice(-3)
    : whole;
  return `${sign}₹${grouped}.${frac}`;
}

module.exports = { CATEGORIES, SPLIT_TYPES, allocate, percentToBasisPoints, computeSplits, formatPaise };
