import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { DataModePill, Logo } from '../../components/ui';
import { SmsSimulator } from '../../components/verification/SmsSimulator';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

/**
 * Public page (no login): anyone with the link can try verifying a product by SMS
 * from their own phone's browser. In Supabase mode it runs the same database
 * function as a real SMS, so results appear live on the dashboards.
 */
export function PublicSmsPage() {
  useDocumentTitle('Verify a product by SMS');
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <DataModePill className="hidden sm:inline-flex" />
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <LogIn className="size-4" /> Sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="mb-1 text-xs font-semibold tracking-wider text-brand-600 uppercase">Try it yourself</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Is your product genuine?</h1>
        <p className="mt-2 mb-8 max-w-2xl text-sm text-slate-500">
          Type the code printed on the product, like a customer would in an SMS: <span className="font-mono font-semibold text-slate-700">VERIFY 839274615</span>.
          The reply comes straight from the Halisi verification system.
        </p>
        <SmsSimulator />
      </main>
    </div>
  );
}
