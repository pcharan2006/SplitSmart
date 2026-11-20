import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { PublicOnlyRoute, FullScreenSpinner } from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import useDocumentTitle from './hooks/useDocumentTitle';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import AddExpense from './pages/AddExpense';
import ExpenseHistory from './pages/ExpenseHistory';
import Settlements from './pages/Settlements';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';

// The chart library is big, so these two pages are only downloaded when someone opens them.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-indigo-600">404</p>
      <p className="text-slate-600">That page doesn't exist.</p>
      <Link to="/" className="btn-primary">Go home</Link>
    </div>
  );
}

export default function App() {
  useDocumentTitle();
  return (
    <Suspense fallback={<FullScreenSpinner />}>
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Password reset works whether or not you're logged in (the link comes from outside the app) */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Only for logged-out visitors */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Only for logged-in users, wrapped in the sidebar/navbar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetails />} />
          <Route path="/expenses" element={<ExpenseHistory />} />
          <Route path="/expenses/new" element={<AddExpense />} />
          <Route path="/expenses/:id/edit" element={<AddExpense />} />
          <Route path="/settlements" element={<Settlements />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
