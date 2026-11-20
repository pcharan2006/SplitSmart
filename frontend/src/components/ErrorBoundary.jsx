import { Component } from 'react';

// If any page crashes while rendering, show a friendly screen instead of a blank white page.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-5xl">😕</p>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-slate-600">The page hit an unexpected problem. Your data is safe. Try reloading.</p>
        <div className="mt-2 flex gap-3">
          <button className="btn-primary" onClick={() => window.location.reload()}>Reload page</button>
          <a className="btn-secondary" href="/dashboard">Go to dashboard</a>
        </div>
      </div>
    );
  }
}
