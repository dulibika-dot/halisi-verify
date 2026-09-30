import { Link } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-grid px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SearchX className="size-7 text-slate-400" />
      </div>
      <p className="mt-6 text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">This page doesn't exist</h1>
      <p className="mt-2 text-sm text-slate-500">The link may be broken or the page may have moved.</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
        <ArrowLeft className="size-4" /> Back to start
      </Link>
    </div>
  );
}
