import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Sun and moon swap with a spin. The click position becomes the centre of the circular reveal.
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-white hover:text-violet-600 active:scale-90 ${className}`}
    >
      <Sun className={`absolute h-5 w-5 transition duration-500 ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
      <Moon className={`absolute h-5 w-5 transition duration-500 ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
    </button>
  );
}
