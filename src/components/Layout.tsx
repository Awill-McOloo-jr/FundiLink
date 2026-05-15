import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  BriefcaseBusiness,
  FolderKanban,
  Gauge,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  Search,
  Shield,
  Smartphone,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Logo from './Logo';

type Page = 'home' | 'jobs' | 'job-detail' | 'fundi-profile' | 'auth' | 'dashboard-fundi' | 'dashboard-employer' | 'admin' | 'messages';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  toast: string | null;
  onDismissToast: () => void;
  selectedJobId: string;
  selectedFundiId: string;
}

type NavItem = {
  key: Page;
  label: string;
  icon: LucideIcon;
  roles?: string[];
};

const navItems: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'jobs', label: 'Browse Jobs', icon: Search },
  { key: 'dashboard-fundi', label: 'Fundi Dashboard', icon: Gauge, roles: ['fundi'] },
  { key: 'fundi-profile', label: 'Public Profile', icon: FolderKanban, roles: ['fundi'] },
  { key: 'dashboard-employer', label: 'Employer Hub', icon: BriefcaseBusiness, roles: ['employer'] },
  { key: 'admin', label: 'Admin', icon: Shield, roles: ['admin'] },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
];

export default function Layout({ children, currentPage, onNavigate, toast, onDismissToast }: LayoutProps) {
  const { currentUser, isAuthenticated, switchUser, logout, users } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleNav = navItems.filter(item =>
    (item.key !== 'home' || !currentUser) &&
    (!item.roles || (currentUser && item.roles.includes(currentUser.role)))
  );

  const navigateAndClose = (page: Page) => {
    if (page === 'home' && currentUser?.role === 'fundi') onNavigate('dashboard-fundi');
    else if (page === 'home' && currentUser?.role === 'employer') onNavigate('dashboard-employer');
    else if (page === 'home' && currentUser?.role === 'admin') onNavigate('admin');
    else onNavigate(page);
    setMobileMenuOpen(false);
  };

  const testUsers = [
    { id: 'u_fundi_1', label: 'Kamau', meta: 'Mason' },
    { id: 'u_fundi_3', label: 'Amina', meta: 'Solar' },
    { id: 'u_emp_1', label: 'Fatma', meta: 'Employer' },
    { id: 'u_admin_1', label: 'Admin', meta: 'Ops' },
  ];

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="border-b border-white/10 p-5">
        <button onClick={() => navigateAndClose('home')} className="text-left">
          <Logo />
        </button>
      </div>

      <div className="border-b border-white/10 p-4">
        {isAuthenticated && currentUser ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black uppercase text-slate-950">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{currentUser.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{currentUser.role}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigateAndClose('home'); }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-red-500 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigateAndClose('auth')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005fec] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <UserRound className="h-4 w-4" />
            Sign in
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {visibleNav.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.key || (item.key === 'jobs' && currentPage === 'job-detail');
          return (
            <button
              key={item.key}
              onClick={() => navigateAndClose(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                active
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-[#005fec]' : ''}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="space-y-4 border-t border-white/10 p-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Persona switcher</p>
          <div className="grid grid-cols-2 gap-2">
            {testUsers.map(btn => (
              <button
                key={btn.id}
                onClick={() => {
                  switchUser(btn.id);
                  const user = users.find(x => x._id === btn.id);
                  if (user?.role === 'fundi') navigateAndClose('dashboard-fundi');
                  else if (user?.role === 'employer') navigateAndClose('dashboard-employer');
                  else if (user?.role === 'admin') navigateAndClose('admin');
                }}
                className={`rounded-lg border px-2 py-2 text-left transition ${
                  currentUser?._id === btn.id
                    ? 'border-[#005fec] bg-[#005fec] text-white'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="block text-xs font-black">{btn.label}</span>
                <span className="block text-[10px] text-current opacity-70">{btn.meta}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[11px] text-slate-400">
          <p className="mb-2 flex items-center gap-2 font-bold text-slate-200">
            <Network className="h-3.5 w-3.5 text-emerald-400" />
            System status
          </p>
          <p className="flex items-center justify-between gap-2">
            <span>STK push</span>
            <span className="font-bold text-emerald-400">Ready</span>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span>OTP SMS</span>
            <span className="font-bold text-emerald-400">Active</span>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col items-center border-r border-slate-900 bg-slate-950 py-3 text-white shadow-2xl shadow-slate-950/40 lg:w-20">
        <button onClick={() => navigateAndClose('home')} className="mb-4 rounded-xl transition duration-200 hover:scale-105 active:scale-95">
          <Logo compact />
        </button>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="mb-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-white transition duration-200 hover:scale-105 hover:bg-white/15 active:scale-95 lg:h-12 lg:w-12"
          aria-label="Open navigation"
          title="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav className="flex flex-1 flex-col items-center gap-2">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.key || (item.key === 'jobs' && currentPage === 'job-detail');
            return (
              <button
                key={item.key}
                onClick={() => navigateAndClose(item.key)}
                className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition duration-200 hover:scale-105 active:scale-95 ${
                  active ? 'bg-white text-[#005fec] shadow-lg shadow-black/20' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                } lg:h-12 lg:w-12`}
                aria-label={item.label}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </nav>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/10 text-[10px] font-black uppercase text-white transition duration-200 hover:scale-105 hover:bg-white/15 active:scale-95 lg:h-12 lg:w-12"
          aria-label="Open persona switcher"
          title={currentUser ? currentUser.name : 'Sign in'}
        >
          {currentUser ? currentUser.name.slice(0, 2) : 'IN'}
        </button>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation backdrop"
          />
          <div className="relative ml-16 h-full w-[86vw] max-w-80 shadow-2xl lg:ml-20">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg bg-white/10 p-2 text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {toast && (
        <div className="animate-toast-in fixed right-4 top-4 z-50 max-w-md overflow-hidden rounded-2xl border border-blue-400/30 bg-[#005fec] px-4 py-3 text-white shadow-2xl">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-xs font-semibold leading-relaxed">{toast}</p>
            <button onClick={onDismissToast} className="ml-auto rounded-md px-1 text-white/80 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 h-1 animate-toast-bar bg-white/50" />
        </div>
      )}

      <main className="min-h-screen pl-16 lg:pl-20">
        {children}
        <footer className="border-t border-slate-200 bg-white px-6 py-5 text-xs text-slate-500 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">Fundilink Platforms Ltd. Nairobi, Kenya.</p>
            <p>Convex tables, M-Pesa escrow, OTP auth, and matching workflows are simulated for this prototype.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
