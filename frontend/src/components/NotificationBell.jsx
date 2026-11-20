import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../services/api';
import { timeAgo } from '../utils/format';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications', { params: { limit: 8 } });
      setData(res.data);
    } catch {
      /* a failed refresh just keeps the old list */
    }
  }, []);

  // Load now, then refresh every minute.
  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  // Close the panel when clicking outside it.
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    load();
  };

  const markRead = async (n) => {
    if (!n.is_read) {
      await api.post(`/notifications/${n.id}/read`);
      load();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100"
        aria-label={`Notifications${data.unread_count ? `, ${data.unread_count} unread` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {data.unread_count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {data.unread_count > 9 ? '9+' : data.unread_count}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {data.unread_count > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-indigo-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {data.notifications.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up 🎉</li>}
            {data.notifications.map((n) => (
              <li key={n.id}>
                <button onClick={() => markRead(n)} className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${n.is_read ? '' : 'bg-indigo-50/50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
