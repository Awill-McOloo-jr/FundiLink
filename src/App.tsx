import { useEffect, useRef, useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import {
  SEED_JOBS, SEED_APPLICATIONS, SEED_MESSAGES, SEED_REVIEWS, SEED_PAYMENTS,
  type Job, type Application, type Message, type Review, type Payment, type ProfileViewEvent
} from './db/schema';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import JobsPage from './pages/JobsPage';
import FundiProfilePage from './pages/FundiProfilePage';
import AuthPage from './pages/AuthPage';
import { AdminDashboard } from './pages/Dashboards';
import FundiDashboard from './pages/FundiDashboard';
import FundiProfileManager from './pages/FundiProfileManager';
import EmployerDashboard from './pages/EmployerDashboard';
import MessagesPage from './pages/MessagesPage';

type Page = 'home' | 'jobs' | 'job-detail' | 'fundi-profile' | 'profile' | 'auth' | 'dashboard-fundi' | 'dashboard-employer' | 'admin' | 'messages';

const APP_STORAGE_KEY = 'fundilink.app-state.v1';

type StoredAppState = {
  jobs?: Job[];
  applications?: Application[];
  messages?: Message[];
  reviews?: Review[];
  profileViews?: Record<string, number>;
  profileViewEvents?: ProfileViewEvent[];
  currentPage?: Page;
  selectedJobId?: string;
  selectedFundiId?: string;
  filterCounty?: string;
  filterSkill?: string;
  filterQuery?: string;
};

function readStoredAppState(): StoredAppState {
  try {
    const raw = window.localStorage.getItem(APP_STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredAppState : {};
  } catch {
    return {};
  }
}

const pagePaths: Record<Page, string> = {
  home: '/',
  jobs: '/jobs',
  'job-detail': '/jobs/detail',
  'fundi-profile': '/fundis/public-profile',
  profile: '/profile',
  auth: '/auth',
  'dashboard-fundi': '/dashboard/fundi',
  'dashboard-employer': '/dashboard/employer',
  admin: '/admin',
  messages: '/messages',
};

function pageFromPath(pathname: string): Page | null {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/jobs/detail')) return 'job-detail';
  if (pathname.startsWith('/jobs')) return 'jobs';
  if (pathname.startsWith('/fundis/public-profile')) return 'fundi-profile';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/auth')) return 'auth';
  if (pathname.startsWith('/dashboard/employer')) return 'dashboard-employer';
  if (pathname.startsWith('/dashboard/fundi')) return 'dashboard-fundi';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/messages')) return 'messages';
  return null;
}

function AppContent() {
  const { currentUser, updateProfile, suspendUser, profiles } = useAuth();
  const storedAppState = typeof window !== 'undefined' ? readStoredAppState() : {};

  // Database state (simulating Convex reactive tables)
  const [jobs, setJobs] = useState<Job[]>(storedAppState.jobs?.length ? storedAppState.jobs : SEED_JOBS);
  const [applications, setApplications] = useState<Application[]>(storedAppState.applications || SEED_APPLICATIONS);
  const [messages, setMessages] = useState<Message[]>(storedAppState.messages || SEED_MESSAGES);
  const [reviews, setReviews] = useState<Review[]>(storedAppState.reviews || SEED_REVIEWS);
  const [payments] = useState<Payment[]>(SEED_PAYMENTS);
  const [profileViews, setProfileViews] = useState<Record<string, number>>(storedAppState.profileViews || {});
  const [profileViewEvents, setProfileViewEvents] = useState<ProfileViewEvent[]>(storedAppState.profileViewEvents || []);
  const recordedProfileViews = useRef(new Set<string>());
  const [serverLoaded, setServerLoaded] = useState(false);

  // Navigation state
  const [currentPage, setCurrentPage] = useState<Page>(() => pageFromPath(window.location.pathname) || storedAppState.currentPage || 'home');
  const [selectedJobId, setSelectedJobId] = useState(storedAppState.selectedJobId || 'job_1');
  const [selectedFundiId, setSelectedFundiId] = useState(storedAppState.selectedFundiId || 'u_fundi_1');

  // Filter state
  const [filterCounty, setFilterCounty] = useState(storedAppState.filterCounty || 'All Counties');
  const [filterSkill, setFilterSkill] = useState(storedAppState.filterSkill || 'All Skills');
  const [filterQuery, setFilterQuery] = useState(storedAppState.filterQuery || '');

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const navigate = useCallback((page: string) => {
    const nextPage = page as Page;
    setCurrentPage(nextPage);
    const nextPath = pagePaths[nextPage] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ page: nextPage }, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleFilterChange = useCallback((county: string, skill: string, query: string) => {
    setFilterCounty(county);
    setFilterSkill(skill);
    setFilterQuery(query);
  }, []);

  const navigateFromFundiDashboard = useCallback((page: string) => {
    if (page === 'fundi-profile' && currentUser?.role === 'fundi') {
      setSelectedFundiId(currentUser._id);
    }
    navigate(page);
  }, [currentUser, navigate]);

  const openJobDetail = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
    navigate('job-detail');
  }, [navigate]);

  const recordProfileView = useCallback((fundiId: string) => {
    const viewKey = `${currentUser?._id || 'guest'}:${fundiId}`;
    if (recordedProfileViews.current.has(viewKey)) return;
    recordedProfileViews.current.add(viewKey);
    const viewerProfile = currentUser ? profiles.find(profile => profile.userId === currentUser._id) : undefined;
    const viewedAt = Date.now();
    const viewerRole: ProfileViewEvent['viewerRole'] = currentUser?.role || 'guest';
    setProfileViews(prev => ({
      ...prev,
      [fundiId]: (prev[fundiId] || 0) + 1,
    }));
    setProfileViewEvents(prev => [
      {
        _id: `view_${viewedAt}_${Math.random().toString(36).slice(2, 8)}`,
        fundiId,
        viewerId: currentUser?._id,
        viewerName: currentUser?.name || 'Guest visitor',
        viewerRole,
        viewerAvatarUrl: viewerProfile?.avatarUrl || currentUser?.avatarUrl,
        viewedAt,
      },
      ...prev,
    ].slice(0, 250));
  }, [currentUser, profiles]);

  useEffect(() => {
    let alive = true;
    fetch('/api/bootstrap')
      .then(res => res.json())
      .then((state: {
        jobs: Job[];
        applications: Application[];
        messages: Message[];
        reviews: Review[];
        profileViews: Record<string, number>;
        profileViewEvents: ProfileViewEvent[];
      }) => {
        if (!alive) return;
        setJobs(state.jobs);
        setApplications(state.applications);
        setMessages(state.messages);
        setReviews(state.reviews);
        setProfileViews(state.profileViews || {});
        setProfileViewEvents(state.profileViewEvents || []);
        setServerLoaded(true);
      })
      .catch(() => setServerLoaded(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!serverLoaded) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({
      jobs,
      applications,
      messages,
      reviews,
      profileViews,
      profileViewEvents,
      currentPage,
      selectedJobId,
      selectedFundiId,
      filterCounty,
      filterSkill,
      filterQuery,
    } satisfies StoredAppState));
    fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobs,
        applications,
        messages,
        reviews,
        profileViews,
        profileViewEvents,
      }),
    }).catch(() => undefined);
  }, [
    applications,
    currentPage,
    filterCounty,
    filterQuery,
    filterSkill,
    jobs,
    messages,
    profileViews,
    profileViewEvents,
    reviews,
    selectedFundiId,
    selectedJobId,
    serverLoaded,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(pageFromPath(window.location.pathname) || 'home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (currentPage !== 'home' && currentPage !== 'auth') return;

    const nextPage = currentUser.role === 'fundi' ? 'dashboard-fundi' : currentUser.role === 'employer' ? 'dashboard-employer' : 'admin';
    setCurrentPage(nextPage);
    window.history.replaceState({ page: nextPage }, '', pagePaths[nextPage]);
  }, [currentPage, currentUser]);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        if (currentUser?.role === 'fundi') {
          return (
            <FundiDashboard
              jobs={jobs}
              applications={applications}
              onNavigate={navigateFromFundiDashboard}
              onOpenJob={openJobDetail}
              showToast={showToast}
              profileViews={profileViews[currentUser._id] || 0}
              profileViewEvents={profileViewEvents.filter(event => event.fundiId === currentUser._id)}
            />
          );
        }
        if (currentUser?.role === 'employer') {
          return (
            <EmployerDashboard
              jobs={jobs}
              setJobs={setJobs}
              applications={applications}
              setApplications={setApplications}
              onNavigate={navigate}
              onSelectFundi={setSelectedFundiId}
              showToast={showToast}
            />
          );
        }
        if (currentUser?.role === 'admin') {
          return (
            <AdminDashboard
              jobs={jobs}
              setJobs={setJobs}
              applications={applications}
              payments={payments}
              onNavigate={navigate}
              showToast={showToast}
              suspendUser={suspendUser}
            />
          );
        }
        return (
          <HomePage
            onNavigate={navigate}
            onSelectFundi={(id) => setSelectedFundiId(id)}
            onFilterChange={handleFilterChange}
          />
        );
      case 'jobs':
      case 'job-detail':
        return (
          <JobsPage
            jobs={jobs}
            setJobs={setJobs}
            applications={applications}
            setApplications={setApplications}
            filterCounty={filterCounty}
            filterSkill={filterSkill}
            filterQuery={filterQuery}
            setFilterCounty={setFilterCounty}
            setFilterSkill={setFilterSkill}
            setFilterQuery={setFilterQuery}
            selectedJobId={selectedJobId}
            setSelectedJobId={setSelectedJobId}
            isDetailPage={currentPage === 'job-detail'}
            onNavigate={navigate}
            showToast={showToast}
          />
        );
      case 'fundi-profile':
        return (
          <FundiProfilePage
            selectedFundiId={selectedFundiId}
            profileViews={profileViews[selectedFundiId] || 0}
            onProfileView={recordProfileView}
            jobs={jobs}
            reviews={reviews}
            setReviews={setReviews}
            onNavigate={navigate}
            showToast={showToast}
          />
        );
      case 'profile':
        return (
          <FundiProfileManager
            jobs={jobs}
            applications={applications}
            profileViews={currentUser ? profileViews[currentUser._id] || 0 : 0}
            onNavigate={navigateFromFundiDashboard}
            showToast={showToast}
            updateProfile={updateProfile}
          />
        );
      case 'auth':
        return <AuthPage onNavigate={navigate} showToast={showToast} />;
      case 'dashboard-fundi':
        return (
          <FundiDashboard
            jobs={jobs}
            applications={applications}
            onNavigate={navigateFromFundiDashboard}
            onOpenJob={openJobDetail}
            showToast={showToast}
            profileViews={currentUser ? profileViews[currentUser._id] || 0 : 0}
            profileViewEvents={currentUser ? profileViewEvents.filter(event => event.fundiId === currentUser._id) : []}
          />
        );
      case 'dashboard-employer':
        return (
          <EmployerDashboard
            jobs={jobs}
            setJobs={setJobs}
            applications={applications}
            setApplications={setApplications}
            onNavigate={navigate}
            onSelectFundi={setSelectedFundiId}
            showToast={showToast}
          />
        );
      case 'admin':
        return (
          <AdminDashboard
            jobs={jobs}
            setJobs={setJobs}
            applications={applications}
            payments={payments}
            onNavigate={navigate}
            showToast={showToast}
            suspendUser={suspendUser}
          />
        );
      case 'messages':
        return (
          <MessagesPage
            messages={messages}
            setMessages={setMessages}
            showToast={showToast}
          />
        );
      default:
        return <HomePage onNavigate={navigate} onSelectFundi={(id) => setSelectedFundiId(id)} onFilterChange={handleFilterChange} />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={(p) => {
        if (p === 'fundi-profile' && currentUser?.role === 'fundi') {
          setSelectedFundiId(currentUser._id);
        }
        navigate(p);
      }}
      toast={toast}
      onDismissToast={() => setToast(null)}
      selectedJobId={selectedJobId}
      selectedFundiId={selectedFundiId}
    >
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
