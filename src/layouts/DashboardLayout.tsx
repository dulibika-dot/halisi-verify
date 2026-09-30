import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Menu, X } from 'lucide-react';
import { AccountStatusBanner } from '../components/layout/AccountStatusBanner';
import { NotificationsMenu } from '../components/layout/NotificationsMenu';
import { Sidebar } from '../components/layout/Sidebar';
import { Avatar, ConfirmDialog, DataModePill } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { findNavItem, type NavSection } from './navigation';

interface DashboardLayoutProps {
  sections: NavSection[];
  portalLabel: string;
  alertsPath: string;
}

/**
 * Shell shared by the Manufacturer App and the Admin Dashboard:
 * sidebar (drawer on mobile) + top bar + animated page area.
 */
export function DashboardLayout({ sections, portalLabel, alertsPath }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  if (!user) return null;
  const current = findNavItem(sections, pathname);

  const handleLogout = () => {
    logout();
    toast.info('Signed out', 'You have been logged out securely.');
    navigate('/login');
  };

  const sidebar = (
    <Sidebar
      sections={sections}
      portalLabel={portalLabel}
      user={user}
      onNavigate={() => setDrawerOpen(false)}
      onLogout={() => setConfirmLogout(true)}
    />
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/60" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-drawer-in shadow-2xl">
            {sidebar}
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-5 right-3 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-lg sm:px-6 lg:px-8">
          <button
            onClick={() => setDrawerOpen(true)}
            className="-ml-1 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            <span className="hidden text-slate-400 sm:inline">{portalLabel}</span>
            <ChevronRight className="hidden size-4 text-slate-300 sm:inline" />
            <span className="truncate font-semibold text-slate-900">{current?.label ?? 'Page'}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <DataModePill className="hidden sm:inline-flex" />
            <NotificationsMenu manufacturerId={user.manufacturerId} viewAllPath={alertsPath} />
            <div className="hidden items-center gap-2.5 border-l border-slate-200 pl-3 sm:flex">
              <Avatar name={user.name} size="sm" />
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.role === 'admin' ? 'Administrator' : 'Manufacturer'}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {user.role === 'manufacturer' && user.manufacturerId && (
            <AccountStatusBanner manufacturerId={user.manufacturerId} pathname={pathname} />
          )}
          <div key={pathname} className="animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
        title="Log out?"
        message="You will need to sign in again to access the dashboard."
        confirmLabel="Log out"
      />
    </div>
  );
}
