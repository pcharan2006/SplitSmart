// All money in the app is an integer number of PAISE (₹1 = 100 paise), same as the backend.
// These helpers convert for display and for form input without ever using floating-point maths.

// 123456 -> "₹1,234.56" (Indian digit grouping)
export function formatPaise(paise) {
  const n = Number(paise) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const whole = String(Math.floor(abs / 100));
  const frac = String(abs % 100).padStart(2, '0');
  const grouped =
    whole.length > 3 ? whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + whole.slice(-3) : whole;
  return `${sign}₹${grouped}.${frac}`;
}

// What the user types ("250", "250.5", "250.50") -> 25000 paise. Returns null if invalid.
export function rupeesToPaise(input) {
  const s = String(input ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

// 25050 -> "250.50" (for pre-filling an input)
export function paiseToInput(paise) {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}
