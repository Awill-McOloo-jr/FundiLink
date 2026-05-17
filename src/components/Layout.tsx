import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  BriefcaseBusiness,
  Home,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  UserCircle2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Logo from './Logo';

type Page = 'home' | 'jobs' | 'job-detail' | 'fundi-profile' | 'profile' | 'auth' | 'dashboard-fundi' | 'dashboard-employer' | 'admin' | 'messages';

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
};

export default function Layout({ children, currentPage, onNavigate, toast, onDismissToast }: LayoutProps) {
  const { currentUser, isAuthenticated, logout, profiles } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const currentProfile = currentUser ? profiles.find(profile => profile.userId === currentUser._id) : undefined;
  const currentAvatarUrl = currentProfile?.avatarUrl || currentUser?.avatarUrl;

  const dashboardPage: Page =
    currentUser?.role === 'employer' ? 'dashboard-employer' :
    currentUser?.role === 'admin' ? 'admin' :
    'dashboard-fundi';

  const mainNav: NavItem[] = isAuthenticated
    ? [
        { key: dashboardPage, label: 'Dashboard', icon: currentUser?.role === 'employer' ? BriefcaseBusiness : currentUser?.role === 'admin' ? ShieldCheck : LayoutDashboard },
        { key: 'jobs', label: 'Browse jobs', icon: SearchCheck },
        { key: 'messages', label: 'Messages', icon: MessagesSquare },
      ]
    : [
        { key: 'home', label: 'Home', icon: Home },
        { key: 'jobs', label: 'Browse jobs', icon: SearchCheck },
        { key: 'auth', label: 'Sign in', icon: UserRound },
      ];

  const navigate = (page: Page) => {
    setAccountOpen(false);
    onNavigate(page);
  };

  const isActive = (page: Page) => currentPage === page || (page === 'jobs' && currentPage === 'job-detail');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col items-center border-r border-slate-900 bg-slate-950 py-3 text-white shadow-2xl shadow-slate-950/40 lg:w-20">
        <button
          onClick={() => navigate(isAuthenticated ? dashboardPage : 'home')}
          className="mb-8 rounded-xl transition duration-200 hover:scale-105 active:scale-95"
          aria-label="Fundilink"
          title="Fundilink"
        >
          <Logo compact />
        </button>

        <nav className="flex flex-1 flex-col items-center gap-3">
          {mainNav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.key);
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl transition duration-200 hover:scale-105 active:scale-95 lg:h-12 lg:w-12 ${
                  active
                    ? 'bg-white text-[#005fec] shadow-lg shadow-black/25'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
                aria-label={item.label}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xl group-hover:block">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="relative flex flex-col items-center gap-3">
          {currentUser?.role === 'fundi' && (
            <button
              onClick={() => navigate('profile')}
              className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl transition duration-200 hover:scale-105 active:scale-95 lg:h-12 lg:w-12 ${
                isActive('profile') ? 'bg-white text-[#005fec] shadow-lg shadow-black/25' : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              aria-label="Profile"
              title="Profile"
            >
              <UserCircle2 className="h-5 w-5" />
              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xl group-hover:block">
                Profile
              </span>
            </button>
          )}

          <button
            onClick={() => setAccountOpen(open => !open)}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl transition duration-200 hover:scale-105 active:scale-95 lg:h-12 lg:w-12 ${
              accountOpen ? 'bg-white text-[#005fec]' : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            aria-label="Account"
            title={currentUser ? currentUser.name : 'Sign in'}
          >
            {currentAvatarUrl ? (
              <img src={currentAvatarUrl} alt={currentUser?.name || 'Account'} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </button>

          {accountOpen && (
            <div className="absolute bottom-0 left-[calc(100%+12px)] w-64 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl">
              {currentUser ? (
                <>
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    {currentAvatarUrl ? (
                      <img src={currentAvatarUrl} alt={currentUser.name} className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#005fec] text-sm font-black uppercase text-white">
                        {currentUser.name.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{currentUser.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{currentUser.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setAccountOpen(false);
                      onNavigate('home');
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-600 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('auth')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005fec] px-3 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
                >
                  <UserRound className="h-4 w-4" />
                  Sign in
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

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
          <div className="mx-auto max-w-7xl">
            <p className="font-semibold">Fundilink Technologies&trade;</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
