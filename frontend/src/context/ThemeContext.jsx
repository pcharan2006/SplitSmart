import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

const ThemeContext = createContext(null);
const KEY = 'theme';

const read = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* storage blocked: fall back to the system setting */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Remembers the choice, defaults to the computer's own light/dark setting, and applies it to <html>.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(read);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#070d0b' : '#0f5b48');
  }, [theme]);

  // Follow the system setting live, until the person picks a theme themselves.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => {
      try { if (localStorage.getItem(KEY)) return; } catch { /* ignore */ }
      setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // `event` (optional) is the click: the new theme grows outward from that point.
  const toggle = useCallback((event) => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      setTheme(next);
      try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) return apply();

    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        document.documentElement.classList.toggle('dark', next === 'dark');
        apply();
      });
    });
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => {});
    return undefined;
  }, [theme]);

  const value = useMemo(() => ({ theme, isDark: theme === 'dark', toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
