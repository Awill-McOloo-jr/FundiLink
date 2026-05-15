import { useEffect, useRef, useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import {
  SEED_JOBS, SEED_APPLICATIONS, SEED_MESSAGES, SEED_REVIEWS, SEED_PAYMENTS,
  type Job, type Application, type Message, type Review, type Payment
} from './db/schema';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import JobsPage from './pages/JobsPage';
import FundiProfilePage from './pages/FundiProfilePage';
import AuthPage from './pages/AuthPage';
import { AdminDashboard } from './pages/Dashboards';
import FundiDashboard from './pages/FundiDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import MessagesPage from './pages/MessagesPage';

type Page = 'home' | 'jobs' | 'job-detail' | 'fundi-profile' | 'auth' | 'dashboard-fundi' | 'dashboard-employer' | 'admin' | 'messages';

function AppContent() {
  const { currentUser, updateProfile, suspendUser } = useAuth();

  // Database state (simulating Convex reactive tables)
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [applications, setApplications] = useState<Application[]>(SEED_APPLICATIONS);
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS);
  const [payments] = useState<Payment[]>(SEED_PAYMENTS);
  const [profileViews, setProfileViews] = useState<Record<string, number>>({});
  const recordedProfileViews = useRef(new Set<string>());

  // Navigation state
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedJobId, setSelectedJobId] = useState('job_1');
  const [selectedFundiId, setSelectedFundiId] = useState('u_fundi_1');

  // Filter state
  const [filterCounty, setFilterCounty] = useState('All Counties');
  const [filterSkill, setFilterSkill] = useState('All Skills');
  const [filterQuery, setFilterQuery] = useState('');

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const navigate = useCallback((page: string) => {
    setCurrentPage(page as Page);
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

  const recordProfileView = useCallback((fundiId: string) => {
    const viewKey = `${currentUser?._id || 'guest'}:${fundiId}`;
    if (recordedProfileViews.current.has(viewKey)) return;
    recordedProfileViews.current.add(viewKey);
    setProfileViews(prev => ({
      ...prev,
      [fundiId]: (prev[fundiId] || 0) + 1,
    }));
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentPage !== 'home' && currentPage !== 'auth') return;

    if (currentUser.role === 'fundi') setCurrentPage('dashboard-fundi');
    else if (currentUser.role === 'employer') setCurrentPage('dashboard-employer');
    else if (currentUser.role === 'admin') setCurrentPage('admin');
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
              showToast={showToast}
              updateProfile={updateProfile}
              profileViews={profileViews[currentUser._id] || 0}
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
      case 'auth':
        return <AuthPage onNavigate={navigate} showToast={showToast} />;
      case 'dashboard-fundi':
        return (
          <FundiDashboard
            jobs={jobs}
            applications={applications}
            onNavigate={navigateFromFundiDashboard}
            showToast={showToast}
            updateProfile={updateProfile}
            profileViews={currentUser ? profileViews[currentUser._id] || 0 : 0}
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
