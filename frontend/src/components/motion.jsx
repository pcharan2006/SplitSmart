import { useEffect, useRef, useState } from 'react';
import { formatPaise } from '../utils/money';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fades and slides its children up the first time they scroll into view.
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${shown ? 'animate-fade-up' : 'opacity-0'} ${className}`}
      style={shown ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

// A number that counts up from 0 to `value` (integer). `format` turns the number into text.
export function CountUp({ value, format = (n) => String(n), duration = 900 }) {
  const [n, setN] = useState(reducedMotion() ? value : 0);

  useEffect(() => {
    if (reducedMotion()) {
      setN(value);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      setN(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className="tabular-nums">{format(n)}</span>;
}

// Money version: value in paise, counts up and shows rupees.
export const CountUpMoney = ({ paise, ...rest }) => <CountUp value={paise} format={formatPaise} {...rest} />;
