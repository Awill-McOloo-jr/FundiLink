import { useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  BarChart3,
  BriefcaseBusiness,
  Bell,
  BookOpenCheck,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  SearchCheck,
  Settings,
  ShieldCheck,
  UserCircle2,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Logo from './Logo';

type Page = 'home' | 'fundis' | 'jobs' | 'job-detail' | 'fundi-profile' | 'user-profile' | 'profile' | 'settings' | 'auth' | 'dashboard-fundi' | 'dashboard-employer' | 'employer-jobs' | 'employer-candidates' | 'employer-applications' | 'employer-analytics' | 'admin' | 'messages' | 'knowledge' | 'notifications';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  toast: string | null;
  onDismissToast: () => void;
  selectedJobId: string;
  selectedFundiId: string;
  notificationBadgeCount: number;
  unreadMessageCount: number;
}

type NavItem = {
  key: Page;
  label: string;
  icon: LucideIcon;
  anchor?: string;
};

export default function Layout({
  children,
  currentPage,
  onNavigate,
  toast,
  onDismissToast,
  notificationBadgeCount,
  unreadMessageCount,
}: LayoutProps) {
  const { currentUser, isAuthenticated, logout, profiles } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);
  const [activePublicNav, setActivePublicNav] = useState('Browse Fundis');
  const [activeEmployerAnchor, setActiveEmployerAnchor] = useState('employer-overview');
  const currentProfile = currentUser ? profiles.find(profile => profile.userId === currentUser._id) : undefined;
  const currentAvatarUrl = currentProfile?.avatarUrl || currentUser?.avatarUrl;
  const showSideNav = isAuthenticated;
  const showPublicTopNav = !isAuthenticated;
  const isEmployerWorkspace = showSideNav && currentUser?.role === 'employer';

  const dashboardPage: Page =
    currentUser?.role === 'employer' ? 'dashboard-employer' :
    currentUser?.role === 'admin' ? 'admin' :
    'dashboard-fundi';

  const employerNav: NavItem[] = [
    { key: 'dashboard-employer', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'employer-jobs', label: 'My Jobs', icon: ClipboardList },
    { key: 'employer-candidates', label: 'Fundis', icon: UsersRound },
    { key: 'employer-applications', label: 'Applications', icon: BriefcaseBusiness },
    { key: 'messages', label: 'Messages', icon: MessagesSquare },
    { key: 'employer-analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const fundiNav: NavItem[] = [
    { key: dashboardPage, label: 'Dashboard', icon: currentUser?.role === 'admin' ? ShieldCheck : LayoutDashboard },
    { key: 'jobs', label: 'Browse jobs', icon: SearchCheck },
    { key: 'messages', label: 'Messages', icon: MessagesSquare },
    ...(currentUser?.role === 'fundi' ? [{ key: 'notifications' as Page, label: 'Notifications', icon: Bell }] : []),
    ...(currentUser?.role === 'fundi' ? [{ key: 'knowledge' as Page, label: 'Fundi guide', icon: BookOpenCheck }] : []),
  ];

  const mainNav: NavItem[] = isAuthenticated
    ? currentUser?.role === 'employer' ? employerNav : fundiNav
    : [
        { key: 'home', label: 'Home', icon: Home },
        { key: 'jobs', label: 'Browse jobs', icon: SearchCheck },
        { key: 'auth', label: 'Sign in', icon: UserRound },
      ];

  const employerSecondaryNav: NavItem[] = [
    { key: 'settings', label: 'Settings', icon: Settings },
    { key: 'profile', label: 'Profile', icon: UserCircle2 },
  ];

  const navigate = (page: Page, anchor?: string) => {
    setAccountOpen(false);
    setPublicMenuOpen(false);
    if (anchor) setActiveEmployerAnchor(anchor);
    onNavigate(page);
    if (anchor) {
      window.setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, currentPage === page ? 0 : 120);
    }
  };

  const navigatePublicSection = (target: string, label: string) => {
    setActivePublicNav(label);
    setPublicMenuOpen(false);
    onNavigate('home');
    window.setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, currentPage === 'home' ? 0 : 80);
  };

  const navigateToAuth = (label?: string) => {
    if (label) setActivePublicNav(label);
    setPublicMenuOpen(false);
    onNavigate('auth');
  };

  const isActive = (page: Page) => currentPage === page || (page === 'jobs' && currentPage === 'job-detail');
  const isActiveItem = (item: NavItem) => item.anchor ? currentPage === item.key && activeEmployerAnchor === item.anchor : isActive(item.key);
  const badgeFor = (page: Page) => {
    if (page === 'messages') return unreadMessageCount;
    if (page === 'notifications') return notificationBadgeCount;
    return 0;
  };
  const formatBadge = (count: number) => count > 99 ? '99+' : String(count);

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActiveItem(item);
    const badgeCount = badgeFor(item.key);
    return (
      <button
        key={`${item.label}-${item.anchor || item.key}`}
        onClick={() => navigate(item.key, item.anchor)}
        className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl transition duration-200 hover:scale-105 active:scale-95 lg:h-12 ${
          isEmployerWorkspace ? 'lg:w-full lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-3 lg:hover:scale-100' : 'lg:w-12'
        } ${
          active
            ? isEmployerWorkspace
              ? 'bg-[#F97316]/15 text-white ring-1 ring-[#F97316]/35'
              : 'bg-white text-[#005fec] shadow-lg shadow-black/25'
            : 'text-slate-400 hover:bg-white/10 hover:text-white'
        }`}
        aria-label={badgeCount > 0 ? `${item.label}, ${badgeCount} unread` : item.label}
        title={item.label}
      >
        {isEmployerWorkspace && active && <span className="absolute left-0 hidden h-7 w-1 rounded-r-full bg-[#F97316] lg:block" />}
        <Icon className="h-5 w-5 shrink-0" />
        {isEmployerWorkspace && <span className="hidden truncate text-sm font-black lg:block">{item.label}</span>}
        {badgeCount > 0 && (
          <span className={`absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-slate-950 ${
            isEmployerWorkspace ? '-right-1 -top-1 lg:right-3 lg:top-1/2 lg:-translate-y-1/2' : '-right-1 -top-1'
          }`}>
            {formatBadge(badgeCount)}
          </span>
        )}
        <span className={`pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xl group-hover:block ${
          isEmployerWorkspace ? 'lg:hidden' : ''
        }`}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      {showPublicTopNav && (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <button onClick={() => navigate('home')} className="cursor-pointer" aria-label="Fundilink home">
              <Logo tone="light" />
            </button>

            <nav className="hidden items-center gap-8 lg:flex">
              {[
                { label: 'Browse Fundis', action: () => { setActivePublicNav('Browse Fundis'); navigate('fundis'); } },
                { label: 'Post a Job', action: () => navigateToAuth('Post a Job') },
                { label: 'How It Works', target: 'how-it-works' },
                { label: 'Counties', target: 'counties' },
              ].map(link => (
                <button
                  key={link.label}
                  onClick={() => link.action ? link.action() : navigatePublicSection(link.target || 'browse-fundis', link.label)}
                  className={`relative cursor-pointer py-5 text-sm font-black transition ${
                    activePublicNav === link.label ? 'text-[#2563EB]' : 'text-slate-600 hover:text-[#F97316]'
                  }`}
                >
                  {link.label}
                  <span className={`absolute bottom-0 left-0 h-0.5 rounded-full transition-all ${
                    activePublicNav === link.label ? 'w-full bg-[#F97316]' : 'w-0 bg-[#F97316]'
                  }`} />
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <button
                onClick={() => navigateToAuth()}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-black text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]"
              >
                Login
              </button>
              <button
                onClick={() => navigateToAuth()}
                className="rounded-full bg-[#2563EB] px-5 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-[#1d4ed8]"
              >
                Sign Up
              </button>
            </div>

            <button
              onClick={() => setPublicMenuOpen(open => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-800 transition hover:border-[#2563EB] hover:text-[#2563EB] lg:hidden"
              aria-label="Open navigation menu"
            >
              {publicMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {publicMenuOpen && (
            <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-lg lg:hidden">
              <div className="space-y-2">
                {[
                  { label: 'Browse Fundis', action: () => { setActivePublicNav('Browse Fundis'); navigate('fundis'); } },
                  { label: 'Post a Job', action: () => navigateToAuth('Post a Job') },
                  { label: 'How It Works', target: 'how-it-works' },
                  { label: 'Counties', target: 'counties' },
                ].map(link => (
                  <button
                    key={link.label}
                    onClick={() => link.action ? link.action() : navigatePublicSection(link.target || 'browse-fundis', link.label)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-black ${
                      activePublicNav === link.label ? 'bg-orange-50 text-[#F97316]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                    {activePublicNav === link.label && <span className="h-1.5 w-8 rounded-full bg-[#F97316]" />}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => navigateToAuth()} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">Login</button>
                <button onClick={() => navigateToAuth()} className="rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-black text-white">Sign Up</button>
              </div>
            </div>
          )}
        </header>
      )}

      {showSideNav && (
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-slate-900 bg-slate-950 py-3 text-white shadow-2xl shadow-slate-950/40 ${
        isEmployerWorkspace ? 'items-center lg:w-60 lg:items-stretch lg:px-3' : 'items-center lg:w-20'
      }`}>
        <button
          onClick={() => navigate(isAuthenticated ? dashboardPage : 'home')}
          className={`mb-8 rounded-xl transition duration-200 hover:scale-105 active:scale-95 ${
            isEmployerWorkspace ? 'lg:mb-7 lg:flex lg:h-14 lg:items-center lg:justify-start lg:px-2 lg:hover:scale-100' : ''
          }`}
          aria-label="Fundilink"
          title="Fundilink"
        >
          <span className={isEmployerWorkspace ? 'lg:hidden' : ''}>
            <Logo compact />
          </span>
          {isEmployerWorkspace && <Logo className="hidden lg:flex" tone="dark" />}
        </button>

        <nav className={`flex flex-1 flex-col gap-3 ${isEmployerWorkspace ? 'items-center lg:items-stretch' : 'items-center'}`}>
          {mainNav.map(renderNavButton)}
        </nav>

        <div className={`relative flex flex-col items-center gap-3 ${isEmployerWorkspace ? 'lg:items-stretch' : ''}`}>
          {isEmployerWorkspace && (
            <div className="border-t border-white/10 pt-3">
              <div className="space-y-2">
                {employerSecondaryNav.map(renderNavButton)}
              </div>
            </div>
          )}

          {currentUser && currentUser.role !== 'admin' && !isEmployerWorkspace && (
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
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition duration-200 hover:scale-105 active:scale-95 lg:h-11 lg:w-11 ${
              isEmployerWorkspace ? 'lg:hidden' : ''
            } ${
              accountOpen ? 'bg-white text-[#005fec]' : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            aria-label="Account"
            title={currentUser ? currentUser.name : 'Sign in'}
          >
            {currentAvatarUrl ? (
              <img src={currentAvatarUrl} alt={currentUser?.name || 'Account'} className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/20" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </button>

          {isEmployerWorkspace && currentUser && (
            <div className="hidden rounded-3xl border border-white/10 bg-white/10 p-3 lg:block">
              <div className="flex items-center gap-3">
                {currentAvatarUrl ? (
                  <img src={currentAvatarUrl} alt={currentUser.name} className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/20" />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#F97316] text-xs font-black uppercase text-white">
                    {currentUser.name.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{currentUser.name}</p>
                  <p className="truncate text-[11px] font-bold text-slate-400">Employer account</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setAccountOpen(false);
                  onNavigate('home');
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-xs font-black text-slate-200 transition hover:bg-red-500 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}

          {accountOpen && (
            <div className={`absolute bottom-0 left-[calc(100%+12px)] w-64 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl ${
              isEmployerWorkspace ? 'lg:hidden' : ''
            }`}>
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
      )}

      {toast && (
        <div className="animate-toast-in fixed bottom-5 right-5 z-50 max-w-md rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-2xl shadow-slate-950/20">
          <div className="flex items-start gap-3">
            <span className="relative mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
                <circle cx="14" cy="14" r="11.5" fill="none" stroke="currentColor" strokeWidth="2.4" className="animate-toast-success-ring" />
                <path d="M8.5 14.5 12.3 18.2 20 10.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" className="animate-toast-success-tick" />
              </svg>
            </span>
            <p className="text-xs font-bold leading-relaxed">{toast}</p>
            <button onClick={onDismissToast} className="ml-auto rounded-md px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className={`min-h-screen ${showSideNav ? isEmployerWorkspace ? 'pl-16 lg:pl-60' : 'pl-16 lg:pl-20' : ''}`}>
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
