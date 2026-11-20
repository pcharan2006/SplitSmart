// MySQL timestamps look like "2026-11-19 10:30:00" (UTC). Parse them as UTC.
function parseTimestamp(value) {
  return new Date(String(value).replace(' ', 'T') + 'Z');
}

export function timeAgo(value) {
  const seconds = Math.floor((Date.now() - parseTimestamp(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return parseTimestamp(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "2026-11-19" -> "19 Nov 2026"
export function formatDate(yyyyMmDd) {
  const [y, m, d] = String(yyyyMmDd).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Today as "YYYY-MM-DD" in the user's own timezone (toISOString would give UTC and can be a day off).
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

// (2026, 11) -> "Nov"; with long=true -> "November 2026"
export function monthLabel(year, month, long = false) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', long ? { month: 'long', year: 'numeric' } : { month: 'short' });
}

// Turns an Axios error into a message a person can read.
export function getErrorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
  return 'Something went wrong. Please try again.';
}
