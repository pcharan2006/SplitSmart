import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// The frame around every logged-in page: sidebar on the left, navbar on top, page in the middle.
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      {/* Keyboard users can jump past the sidebar and navbar. It only appears when focused. */}
      <a href="#main" className="sr-only z-[60] rounded-xl bg-[#0f5b48] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        {/* Keyed by URL so every page change plays the entrance animation */}
        <main id="main" tabIndex={-1} key={pathname} className="mx-auto max-w-6xl animate-fade-up p-4 outline-none sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
