import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Browser tab titles per section, so tabs and history are readable ("Groups · SplitSmart").
const TITLES = [
  ['/dashboard', 'Dashboard'],
  ['/groups', 'Groups'],
  ['/expenses/new', 'Add expense'],
  ['/expenses', 'Expenses'],
  ['/settlements', 'Settlements'],
  ['/analytics', 'Analytics'],
  ['/assistant', 'AI Assistant'],
  ['/profile', 'Profile'],
  ['/login', 'Log in'],
  ['/register', 'Sign up'],
  ['/forgot-password', 'Forgot password'],
  ['/reset-password', 'Reset password'],
];

export default function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const match = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
    document.title = match ? `${match[1]} · SplitSmart` : 'SplitSmart · AI Expense Splitter';
  }, [pathname]);
}
