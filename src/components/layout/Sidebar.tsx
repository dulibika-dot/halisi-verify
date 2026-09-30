import { NavLink } from 'react-router-dom';
import { LogOut, Radio } from 'lucide-react';
import type { NavSection } from '../../layouts/navigation';
import { USE_MOCK_API } from '../../services/config';
import type { User } from '../../types';
import { cn } from '../../utils/cn';
import { Avatar, Logo } from '../ui';

interface SidebarProps {
  sections: NavSection[];
  portalLabel: string;
  user: User;
  onNavigate?: () => void;
  onLogout: () => void;
}

export function Sidebar({ sections, portalLabel, user, onNavigate, onLogout }: SidebarProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink-950 text-slate-300">
      {/* soft brand glow */}
      <div className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-brand-500/15 blur-3xl" />

      <div className="relative px-5 pt-6 pb-5">
        <Logo light />
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
          <span className="size-1.5 rounded-full bg-brand-400" />
          {portalLabel}
        </div>
      </div>

      <nav className="scroll-thin relative flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-widest text-slate-500 uppercase">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-brand-400" />}
                        <item.icon className={cn('size-[18px] shrink-0 transition', isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.tag && (
                          <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-300 uppercase">
                            {item.tag}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative space-y-3 border-t border-white/5 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5 text-xs">
          <Radio className="size-4 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-200">SMS gateway</p>
            <p className="truncate text-slate-500">{USE_MOCK_API ? 'Simulated mode · not connected' : 'Simulator live · gateway ready'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-rose-300"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
