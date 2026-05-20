import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, JOB_CATEGORIES, SKILL_OPTIONS, formatKSh, generateId, getJobCategory, type Application, type ApplicationStatus, type Job, type JobCategory, type Profile, type User } from '../db/schema';
import VerifiedEmployerBadge from '../components/VerifiedEmployerBadge';
import {
  Archive,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  Gauge,
  MapPin,
  PanelRightOpen,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  Video,
  WalletCards,
  X,
} from 'lucide-react';

export type EmployerView = 'dashboard' | 'jobs' | 'candidates' | 'applications' | 'analytics';

interface EmployerDashboardProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  onNavigate: (page: string) => void;
  onSelectFundi: (id: string) => void;
  onOpenJobApplications?: (id: string) => void;
  selectedEmployerJobId?: string;
  onSelectEmployerJob?: (id: string) => void;
  showToast: (msg: string) => void;
  view?: EmployerView;
}

type CandidateRecommendation = {
  profile: Profile;
  user?: User;
  skillMatches: string[];
  score: number;
};

const day = 86400000;

function getWorkMode(job: Job) {
  const text = job.description.toLowerCase();
  if (text.includes('remote')) return 'Remote';
  if (text.includes('hybrid')) return 'Hybrid';
  return 'Onsite';
}

function getProjectType(job: Job) {
  const match = job.description.match(/Project type:\s*([^\n]+)/i);
  return match?.[1]?.trim() || 'General works';
}

function scoreCandidate(profile: Profile, myJobs: Job[]) {
  const openSkills = new Set(myJobs.flatMap(job => job.skills));
  const skillMatches = profile.skills.filter(skill => openSkills.has(skill));
  const countyMatches = myJobs.filter(job => job.county === profile.county).length;
  const categorySignal = myJobs.filter(job => job.skills.some(skill => profile.skills.includes(skill))).length;
  const score = Math.min(98, Math.round(
    skillMatches.length * 18 +
    countyMatches * 10 +
    categorySignal * 6 +
    profile.rating * 7 +
    Math.min(profile.completedJobs, 30)
  ));
  return { score: Math.max(42, score), skillMatches };
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function isDeadlinePassed(deadline: string) {
  const time = new Date(`${deadline}T23:59:59`).getTime();
  return Number.isFinite(time) && time < Date.now();
}

function daysUntil(deadline: string) {
  const time = new Date(`${deadline}T23:59:59`).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.ceil((time - Date.now()) / day);
}

function addDaysToDate(dateValue: string, days: number) {
  const base = Number.isFinite(new Date(`${dateValue}T12:00:00`).getTime()) ? new Date(`${dateValue}T12:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function jobStatusLabel(job: Job) {
  if (job.status === 'completed') return 'Closed';
  if (job.status === 'cancelled') return 'Archived';
  if (job.status === 'flagged') return 'Flagged';
  if (isDeadlinePassed(job.deadline)) return 'Expired';
  return 'Active';
}

function jobStatusClasses(job: Job) {
  if (job.status === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (job.status === 'cancelled' || isDeadlinePassed(job.deadline)) return 'bg-slate-100 text-slate-600 ring-slate-200';
  if (job.status === 'flagged') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-orange-50 text-[#F97316] ring-orange-100';
}

function applicationLabel(status: ApplicationStatus) {
  if (status === 'interviewed') return 'shortlisted';
  return status;
}

function statusClasses(status: ApplicationStatus) {
  if (status === 'hired' || status === 'offered') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'rejected' || status === 'withdrawn') return 'bg-red-50 text-red-700 ring-red-200';
  if (status === 'interviewed') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (status === 'reviewed') return 'bg-blue-50 text-blue-700 ring-blue-200';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function scoreClasses(score: number) {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-red-50 text-red-700 ring-red-200';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getApplicationOfferText(app: Application, job: Job, profile?: Profile) {
  const proposedOffer = app.coverLetter.match(/Proposed offer:\s*([^\.]+)/i)?.[1]?.trim();
  if (proposedOffer) return proposedOffer;
  const fundiRate = profile ? `${formatKSh(profile.hourlyRate)}/hr fundi rate` : 'Fundi rate not listed';
  return `${formatKSh(job.budget)} client offer / ${fundiRate}`;
}

export default function EmployerDashboard({
  jobs,
  setJobs,
  applications,
  setApplications,
  onNavigate,
  onSelectFundi,
  onOpenJobApplications,
  selectedEmployerJobId,
  onSelectEmployerJob,
  showToast,
  view = 'dashboard',
}: EmployerDashboardProps) {
  const { currentUser, profiles, users } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [county, setCounty] = useState('Nairobi');
  const [budget, setBudget] = useState('25000');
  const [jobCategory, setJobCategory] = useState<JobCategory>('Building Construction');
  const [primarySkill, setPrimarySkill] = useState('Masonry');
  const [secondarySkill, setSecondarySkill] = useState('Concrete Mixing');
  const [deadline, setDeadline] = useState('2026-06-15');
  const [workMode, setWorkMode] = useState('Onsite');
  const [projectType, setProjectType] = useState('Residential');
  const [candidateSkill, setCandidateSkill] = useState('All Skills');
  const [candidateCounty, setCandidateCounty] = useState('All Counties');
  const [postPanelOpen, setPostPanelOpen] = useState(false);
  const [postStep, setPostStep] = useState(0);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [applicationView, setApplicationView] = useState<'kanban' | 'list'>('kanban');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [applicationJobFilter, setApplicationJobFilter] = useState('all');
  const [applicationQuery, setApplicationQuery] = useState('');
  const [hireCandidate, setHireCandidate] = useState<CandidateRecommendation | null>(null);
  const [hireJobId, setHireJobId] = useState('');
  const [hireOffer, setHireOffer] = useState('');
  const [hireStartDate, setHireStartDate] = useState(() => addDaysToDate(new Date().toISOString().slice(0, 10), 1));
  const [hireNote, setHireNote] = useState('');

  const myJobs = currentUser?.role === 'employer' ? jobs.filter(job => job.employerId === currentUser._id) : [];
  const liveJobs = myJobs.filter(job => job.status === 'active' && !isDeadlinePassed(job.deadline));
  const myApplications = applications.filter(app => myJobs.some(job => job._id === app.jobId));
  const selectedApplicationJob = selectedEmployerJobId ? myJobs.find(job => job._id === selectedEmployerJobId) : undefined;
  const selectedJobApplications = selectedApplicationJob
    ? myApplications.filter(app => app.jobId === selectedApplicationJob._id).sort((a, b) => b.appliedAt - a.appliedAt)
    : [];
  const pendingApps = myApplications.filter(app => app.status === 'pending').length;
  const reviewedApps = myApplications.filter(app => app.status === 'reviewed').length;
  const shortlistedApps = myApplications.filter(app => app.status === 'interviewed' || app.status === 'offered').length;
  const hiredApps = myApplications.filter(app => app.status === 'hired' || app.status === 'offered').length;
  const liveBudget = liveJobs.reduce((sum, job) => sum + job.budget, 0);
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = Date.now() - 7 * day;
  const newToday = myApplications.filter(app => app.appliedAt >= todayStart).length;
  const weeklyApplications = myApplications.filter(app => app.appliedAt >= weekStart).length;
  const weeklyHires = myApplications.filter(app => app.updatedAt >= weekStart && (app.status === 'hired' || app.status === 'offered')).length;

  const candidateRecommendations = useMemo<CandidateRecommendation[]>(() => {
    return profiles
      .map(profile => {
        const user = users.find(item => item._id === profile.userId);
        const match = scoreCandidate(profile, liveJobs);
        return { profile, user, ...match };
      })
      .filter(item => item.user?.role === 'fundi')
      .filter(item => candidateSkill === 'All Skills' || item.profile.skills.includes(candidateSkill))
      .filter(item => candidateCounty === 'All Counties' || item.profile.county === candidateCounty)
      .sort((a, b) => b.score - a.score);
  }, [profiles, users, liveJobs, candidateSkill, candidateCounty]);

  if (!currentUser || currentUser.role !== 'employer') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <BriefcaseBusiness className="mx-auto h-10 w-10 text-[#2563EB]" />
          <h2 className="text-lg font-bold text-slate-800">Employer access required</h2>
          <p className="text-xs text-slate-600">Sign in with an employer account to manage jobs and fundis.</p>
        </div>
      </div>
    );
  }

  const firstName = currentUser.name.split(' ')[0] || currentUser.name;
  const stats = [
    { label: 'Active jobs', value: liveJobs.length, icon: ClipboardList, tone: 'text-[#F97316] bg-orange-50' },
    { label: 'Applications', value: myApplications.length, icon: UsersRound, tone: 'text-[#2563EB] bg-blue-50' },
    { label: 'Interviews', value: shortlistedApps, icon: Video, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Live budget', value: formatKSh(liveBudget), icon: Banknote, tone: 'text-slate-900 bg-slate-100' },
  ];

  const workflowColumns: Array<{ title: string; count: number; statuses: ApplicationStatus[]; tone: string }> = [
    { title: 'New', count: pendingApps, statuses: ['pending'], tone: 'border-slate-200 bg-slate-50' },
    { title: 'Reviewed', count: reviewedApps, statuses: ['reviewed'], tone: 'border-blue-200 bg-blue-50' },
    { title: 'Shortlisted', count: shortlistedApps, statuses: ['interviewed', 'offered'], tone: 'border-amber-200 bg-amber-50' },
    { title: 'Hired', count: hiredApps, statuses: ['hired'], tone: 'border-emerald-200 bg-emerald-50' },
  ];
  const filteredApplications = myApplications
    .filter(app => applicationStatusFilter === 'all' || app.status === applicationStatusFilter)
    .filter(app => applicationJobFilter === 'all' || app.jobId === applicationJobFilter)
    .filter(app => {
      const job = myJobs.find(item => item._id === app.jobId);
      const user = users.find(item => item._id === app.fundiId);
      const profile = profiles.find(item => item.userId === app.fundiId);
      const haystack = [
        app.fundiName,
        app.fundiSkill,
        app.coverLetter,
        job?.title,
        job?.county,
        user?.name,
        profile?.skills.join(' '),
      ].join(' ').toLowerCase();
      return haystack.includes(applicationQuery.trim().toLowerCase());
    })
    .sort((a, b) => b.appliedAt - a.appliedAt);
  const applicationStatusFilters: Array<{ label: string; value: 'all' | ApplicationStatus; count: number }> = [
    { label: 'All', value: 'all', count: myApplications.length },
    { label: 'New', value: 'pending', count: pendingApps },
    { label: 'Reviewed', value: 'reviewed', count: reviewedApps },
    { label: 'Shortlisted', value: 'interviewed', count: myApplications.filter(app => app.status === 'interviewed').length },
    { label: 'Offers', value: 'offered', count: myApplications.filter(app => app.status === 'offered').length },
    { label: 'Hired', value: 'hired', count: myApplications.filter(app => app.status === 'hired').length },
  ];

  const resetJobForm = () => {
    setTitle('');
    setDesc('');
    setCounty('Nairobi');
    setBudget('25000');
    setJobCategory('Building Construction');
    setPrimarySkill('Masonry');
    setSecondarySkill('Concrete Mixing');
    setDeadline('2026-06-15');
    setWorkMode('Onsite');
    setProjectType('Residential');
    setPostStep(0);
    setEditingJobId(null);
  };

  const openCreateJob = () => {
    resetJobForm();
    setPostPanelOpen(true);
  };

  const openEditJob = (job: Job) => {
    if (job.employerId !== currentUser._id) {
      showToast('Only the employer who posted this job can edit it.');
      return;
    }
    setEditingJobId(job._id);
    setTitle(job.title);
    setDesc(job.description.replace(/^Project type:[\s\S]*?\n\n/i, ''));
    setCounty(job.county);
    setBudget(String(job.budget));
    setJobCategory(getJobCategory(job));
    setPrimarySkill(job.skills[0] || 'Masonry');
    setSecondarySkill(job.skills[1] || job.skills[0] || 'Concrete Mixing');
    setDeadline(job.deadline);
    setWorkMode(getWorkMode(job));
    setProjectType(getProjectType(job));
    setPostStep(0);
    setPostPanelOpen(true);
  };

  const updateOwnedJob = (jobId: string, updates: Partial<Job>, toastMessage: string) => {
    const target = myJobs.find(job => job._id === jobId);
    if (!target || target.employerId !== currentUser._id) {
      showToast('Only the employer who posted this job can change it.');
      return;
    }
    setJobs(prev => prev.map(job => job._id === jobId ? { ...job, ...updates, updatedAt: Date.now() } : job));
    showToast(toastMessage);
  };

  const handleCreateJob = (e: FormEvent) => {
    e.preventDefault();
    const skills = [primarySkill, secondarySkill].filter((skill, index, arr) => skill && arr.indexOf(skill) === index);
    const metadata = [
      `Project type: ${projectType}`,
      `Work arrangement: ${workMode}`,
    ].join('\n');
    if (editingJobId) {
      updateOwnedJob(editingJobId, {
        title: title.trim() || 'Untitled construction job',
        category: jobCategory,
        description: `${metadata}\n\n${desc.trim() || 'Scope details pending.'}`,
        skills,
        county,
        budget: Number(budget) || 5000,
        deadline,
        status: isDeadlinePassed(deadline) ? 'cancelled' : 'active',
      }, 'Job details updated.');
    } else {
      const newJob: Job = {
        _id: generateId('job'),
        employerId: currentUser._id,
        employerName: currentUser.name,
        title: title.trim() || 'Untitled construction job',
        category: jobCategory,
        description: `${metadata}\n\n${desc.trim() || 'Scope details pending.'}`,
        skills,
        county,
        budget: Number(budget) || 5000,
        status: isDeadlinePassed(deadline) ? 'cancelled' : 'active',
        deadline,
        applicationsCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setJobs(prev => [newJob, ...prev]);
      showToast(isDeadlinePassed(deadline) ? 'Job saved as archived because the deadline has passed.' : 'Job posted. Fundi recommendations updated.');
    }
    resetJobForm();
    setPostPanelOpen(false);
  };

  const updateApplicationStatus = (appId: string, status: ApplicationStatus) => {
    setApplications(prev => prev.map(app => app._id === appId ? { ...app, status, updatedAt: Date.now() } : app));
    showToast(`Application marked as ${applicationLabel(status)}.`);
  };

  const getFundiDetails = (fundiId: string) => {
    const user = users.find(item => item._id === fundiId);
    const profile = profiles.find(item => item.userId === fundiId);
    return { user, profile, avatar: profile?.avatarUrl || user?.avatarUrl };
  };

  const openFundiProfile = (fundiId: string) => {
    onSelectFundi(fundiId);
    onNavigate('fundi-profile');
  };

  const openJobApplications = (job: Job) => {
    if (onOpenJobApplications) {
      onOpenJobApplications(job._id);
      return;
    }
    onSelectEmployerJob?.(job._id);
    onNavigate('employer-applications');
  };

  const openHirePanel = (candidate: CandidateRecommendation, jobId?: string) => {
    const bestJob = jobId
      ? liveJobs.find(job => job._id === jobId)
      : liveJobs.find(job => job.skills.some(skill => candidate.profile.skills.includes(skill))) || liveJobs[0];
    setHireCandidate(candidate);
    setHireJobId(bestJob?._id || '');
    setHireOffer(bestJob ? String(bestJob.budget) : String(Math.max(5000, candidate.profile.hourlyRate * 40)));
    setHireStartDate(addDaysToDate(new Date().toISOString().slice(0, 10), 1));
    setHireNote(`Invite ${candidate.user?.name || 'this fundi'} to confirm availability and scope before starting work.`);
  };

  const confirmHireOffer = () => {
    if (!hireCandidate || !hireJobId) {
      showToast('Select a live job before starting a hire.');
      return;
    }
    const selectedJob = liveJobs.find(job => job._id === hireJobId);
    if (!selectedJob) {
      showToast('This job is not live. Reopen or postpone the deadline first.');
      return;
    }
    const existing = applications.find(app => app.jobId === hireJobId && app.fundiId === hireCandidate.profile.userId);
    const note = [
      'Employer-initiated hire offer.',
      `Proposed offer: ${formatKSh(Number(hireOffer) || selectedJob.budget)}.`,
      `Preferred start: ${hireStartDate}.`,
      hireNote.trim(),
    ].filter(Boolean).join(' ');

    if (existing) {
      setApplications(prev => prev.map(app => app._id === existing._id ? {
        ...app,
        status: 'offered',
        coverLetter: note,
        updatedAt: Date.now(),
      } : app));
    } else {
      const newApplication: Application = {
        _id: generateId('app'),
        jobId: selectedJob._id,
        fundiId: hireCandidate.profile.userId,
        fundiName: hireCandidate.user?.name || 'Fundi',
        fundiSkill: hireCandidate.profile.skills.slice(0, 2).join(' & ') || 'Construction',
        fundiRating: hireCandidate.profile.rating,
        coverLetter: note,
        status: 'offered',
        appliedAt: Date.now(),
        updatedAt: Date.now(),
      };
      setApplications(prev => [newApplication, ...prev]);
      setJobs(prev => prev.map(job => job._id === selectedJob._id ? { ...job, applicationsCount: job.applicationsCount + 1, updatedAt: Date.now() } : job));
    }

    showToast(`Hire offer sent to ${hireCandidate.user?.name || 'fundi'}.`);
    setHireCandidate(null);
    onNavigate('employer-applications');
  };

  const renderCandidateCard = (candidate: CandidateRecommendation, compact = false) => {
    const { profile, user, skillMatches, score } = candidate;
    const name = user?.name || 'Fundi profile';
    const visibleSkills = (skillMatches.length ? skillMatches : profile.skills).slice(0, 4);
    const liveFitJobs = liveJobs.filter(job => job.skills.some(skill => profile.skills.includes(skill))).length;

    return (
      <article key={profile._id} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-xl animate-slide-up">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2563EB] via-[#F97316] to-emerald-400 opacity-0 transition duration-300 group-hover:opacity-100" />
        <div className="flex items-start gap-4">
          <img src={profile.avatarUrl} alt={name} className="h-16 w-16 rounded-2xl object-cover shadow-sm transition duration-300 group-hover:scale-105" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-black text-slate-950">{name}</h3>
              {profile.verified && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
              {profile.county} / {profile.availability}
            </p>
          </div>
          <span className={`rounded-2xl px-3 py-2 text-xl font-black ring-1 ${scoreClasses(score)}`}>{score}%</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-950">{profile.rating.toFixed(1)}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Rating</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-950">{profile.completedJobs}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Jobs</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-sm font-black text-slate-950">{formatKSh(profile.hourlyRate)}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Hourly</p>
          </div>
        </div>

        {!compact && (
          <p className="mt-4 line-clamp-3 text-xs leading-5 text-slate-600">{profile.bio}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-[#F97316]">{profile.skills[0] || 'Construction'}</span>
          {visibleSkills.map(skill => (
            <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{skill}</span>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs font-bold text-blue-800">
          Fits {liveFitJobs} live job{liveFitJobs === 1 ? '' : 's'} from your current posts.
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={() => openFundiProfile(profile.userId)} className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800">
            View profile
          </button>
          <button onClick={() => openHirePanel(candidate)} className="rounded-2xl bg-[#F97316] px-4 py-3 text-xs font-black text-white transition hover:bg-orange-600">
            Start hire
          </button>
        </div>
      </article>
    );
  };

  const renderJobCard = (job: Job, compact = false) => {
    const jobApps = applications.filter(app => app.jobId === job._id);
    const hiredCount = jobApps.filter(app => app.status === 'hired' || app.status === 'offered').length;
    const deadlineDays = daysUntil(job.deadline);
    const statusLabel = jobStatusLabel(job);
    const isLive = job.status === 'active' && !isDeadlinePassed(job.deadline);

    return (
      <article key={job._id} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-xl animate-slide-up">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-blue-50 via-white to-orange-50 opacity-90" />
        <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-[#F97316]/10 blur-2xl transition duration-300 group-hover:bg-[#F97316]/20" />
        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm transition duration-300 group-hover:scale-105">
                <BriefcaseBusiness className="h-5 w-5 text-[#F97316]" />
              </div>
              <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">{getJobCategory(job)}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${jobStatusClasses(job)}`}>{statusLabel}</span>
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-950">{job.title}</h3>
              <p className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.county}</span>
                <span className="inline-flex items-center gap-1"><WalletCards className="h-3.5 w-3.5" /> {formatKSh(job.budget)}</span>
                <span>{getWorkMode(job)}</span>
                <span>{getProjectType(job)}</span>
              </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:w-56">
              <span className="rounded-2xl bg-white/90 px-4 py-3 text-lg font-black text-slate-950 ring-1 ring-slate-200">{jobApps.length}<span className="block text-[10px] uppercase tracking-wide text-slate-400">Apps</span></span>
              <span className="rounded-2xl bg-white/90 px-4 py-3 text-lg font-black text-slate-950 ring-1 ring-slate-200">{hiredCount}<span className="block text-[10px] uppercase tracking-wide text-slate-400">Offers</span></span>
            </div>
          </div>

          {!compact && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{job.description.replace(/^Project type:[\s\S]*?\n\n/i, '')}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {job.skills.slice(0, 4).map(skill => (
              <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{skill}</span>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="flex items-center gap-2 text-xs font-black text-slate-900"><CalendarClock className="h-4 w-4 text-[#F97316]" /> Application deadline</p>
              <p className="mt-1 text-xs text-slate-500">
                {job.deadline} {deadlineDays !== null && deadlineDays >= 0 ? `(${deadlineDays}d left)` : '(expired)'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-900">Job visibility</p>
              <p className="mt-1 text-xs text-slate-500">{isLive ? 'Open to applicants.' : 'Hidden until reopened.'}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => openJobApplications(job)} className="rounded-full bg-[#2563EB] px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700">Review applications</button>
            <button onClick={() => openEditJob(job)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
            <button onClick={() => updateOwnedJob(job._id, { deadline: addDaysToDate(job.deadline, 7), status: 'active' }, 'Deadline postponed by 7 days.')} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"><RotateCcw className="h-3.5 w-3.5" /> Postpone</button>
            {job.status !== 'completed' && <button onClick={() => updateOwnedJob(job._id, { status: 'completed' }, 'Job closed. It is no longer listed as available.')} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> Close</button>}
            {job.status !== 'cancelled' && <button onClick={() => updateOwnedJob(job._id, { status: 'cancelled' }, 'Job archived. It is no longer listed as available.')} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"><Archive className="h-3.5 w-3.5" /> Archive</button>}
            {job.status !== 'active' && <button onClick={() => updateOwnedJob(job._id, { status: 'active', deadline: addDaysToDate(new Date().toISOString().slice(0, 10), 14) }, 'Job reopened with a new deadline.')} className="rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-[#F97316] transition hover:bg-orange-100">Reopen</button>}
          </div>
        </div>
      </article>
    );
  };

  const renderApplicationRow = (app: Application, compact = false) => {
    const job = myJobs.find(item => item._id === app.jobId);
    const { user, profile, avatar } = getFundiDetails(app.fundiId);
    const score = profile && job ? scoreCandidate(profile, [job]).score : Math.round(app.fundiRating * 18);

    return (
      <div key={app._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#2563EB] hover:shadow-md">
        <div className="flex items-start gap-3">
          {avatar ? (
            <img src={avatar} alt={app.fundiName} className="h-11 w-11 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-xs font-black text-slate-500">{app.fundiName.slice(0, 2)}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-black text-slate-950">{user?.name || app.fundiName}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ring-1 ${statusClasses(app.status)}`}>{applicationLabel(app.status)}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">{job?.title || 'Job unavailable'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
              <span>{score}% match</span>
              <span>Applied {formatDate(app.appliedAt)}</span>
            </div>
          </div>
        </div>
        {!compact && <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{app.coverLetter || 'No application note provided.'}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => updateApplicationStatus(app._id, 'reviewed')} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-700 transition hover:bg-slate-200">Review</button>
          <button onClick={() => updateApplicationStatus(app._id, 'interviewed')} className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700 transition hover:bg-amber-100">Shortlist</button>
          <button onClick={() => onNavigate('messages')} className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100">Message</button>
          <button onClick={() => updateApplicationStatus(app._id, 'hired')} className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100">Hire</button>
          <button onClick={() => updateApplicationStatus(app._id, 'rejected')} className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-700 transition hover:bg-red-100">Reject</button>
        </div>
      </div>
    );
  };

  const renderJobApplicationCard = (app: Application, job: Job) => {
    const { user, profile, avatar } = getFundiDetails(app.fundiId);
    const score = profile ? scoreCandidate(profile, [job]).score : Math.round(app.fundiRating * 18);
    const offerText = getApplicationOfferText(app, job, profile);
    const displayName = user?.name || app.fundiName;
    const visibleSkills = (profile?.skills.length ? profile.skills : [app.fundiSkill]).slice(0, 4);

    return (
      <article key={app._id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            {avatar ? (
              <img src={avatar} alt={displayName} className="h-16 w-16 rounded-2xl object-cover shadow-sm transition duration-300 group-hover:scale-105" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-sm font-black uppercase text-slate-500">{displayName.slice(0, 2)}</div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black text-slate-950">{displayName}</h3>
                {profile?.verified && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1 ${statusClasses(app.status)}`}>{applicationLabel(app.status)}</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                <span>{profile?.county || job.county}</span>
                <span>{app.fundiRating.toFixed(1)} rating</span>
                <span>Applied {formatDate(app.appliedAt)}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleSkills.map(skill => (
                  <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{skill}</span>
                ))}
              </div>
            </div>
          </div>
          <span className={`rounded-2xl px-4 py-3 text-2xl font-black ring-1 ${scoreClasses(score)}`}>{score}%</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-orange-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-500">Offer</p>
            <p className="mt-1 text-sm font-black text-slate-950">{offerText}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">Trade fit</p>
            <p className="mt-1 text-sm font-black text-slate-950">{app.fundiSkill || visibleSkills.join(', ')}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Profile</p>
            <p className="mt-1 text-sm font-black text-slate-950">{profile ? `${profile.completedJobs} completed jobs` : 'Profile pending'}</p>
          </div>
        </div>

        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{app.coverLetter || 'No application note provided.'}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => openFundiProfile(app.fundiId)} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800">View fundi profile</button>
          <button onClick={() => updateApplicationStatus(app._id, 'reviewed')} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200">Mark reviewed</button>
          <button onClick={() => updateApplicationStatus(app._id, 'interviewed')} className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100">Shortlist</button>
          <button onClick={() => updateApplicationStatus(app._id, 'hired')} className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100">Hire</button>
          <button onClick={() => onNavigate('messages')} className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100">Message</button>
          <button onClick={() => updateApplicationStatus(app._id, 'rejected')} className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-700 transition hover:bg-red-100">Reject</button>
        </div>
      </article>
    );
  };

  const renderPageHeader = (eyebrow: string, titleText: string, body: string, action?: React.ReactNode) => (
    <header className="flex flex-col gap-5 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-[#F97316]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{titleText}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{body}</p>
      </div>
      {action}
    </header>
  );

  const dashboardView = (
    <>
      <header id="employer-overview" className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              {getGreeting()}, {firstName}.
            </h1>
            <VerifiedEmployerBadge user={currentUser} className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            You have <span className="font-black text-slate-900">{newToday}</span> new application{newToday === 1 ? '' : 's'} today.
          </p>
          <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-[#F97316] animate-fade-in">
            <Sparkles className="h-4 w-4" />
            Weekly summary: {weeklyApplications} applications, {shortlistedApps} shortlisted, {weeklyHires} hired.
          </div>
        </div>
        <button onClick={openCreateJob} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/15 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl">
          <Plus className="h-4 w-4" />
          Post a new job
        </button>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-xl animate-slide-up" style={{ animationDelay: `${index * 60}ms` }}>
              <div className={`grid h-12 w-12 place-items-center rounded-2xl transition duration-300 group-hover:scale-110 ${stat.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-8 text-4xl font-black tracking-tight text-slate-950">{stat.value}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">{stat.label}</p>
            </div>
          );
        })}
      </section>

      <section id="employer-candidates" className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Top matches today</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Recommended fundis</h2>
          </div>
          <button onClick={() => onNavigate('employer-candidates')} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]">See all</button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {candidateRecommendations.slice(0, 3).map(candidate => renderCandidateCard(candidate, true))}
        </div>
      </section>

      <section id="employer-jobs" className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Your active jobs</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Latest job posts</h2>
          </div>
          <button onClick={() => onNavigate('employer-jobs')} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]">See all</button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {liveJobs.length ? liveJobs.slice(0, 3).map(job => renderJobCard(job, true)) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 lg:col-span-3">No live jobs. Post or reopen a job to start receiving matched fundis.</div>
          )}
        </div>
      </section>
    </>
  );

  const jobsView = (
    <>
      {renderPageHeader(
        'Job control room',
        'Your posted jobs',
        'Keep every job moving: review applicants, tune the scope, extend deadlines, and close completed work without losing track.',
        <button onClick={openCreateJob} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Post a new job
        </button>
      )}
      <section className="grid gap-6 xl:grid-cols-2">
        {myJobs.length ? myJobs.map(job => renderJobCard(job)) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">No jobs posted yet.</div>
        )}
      </section>
    </>
  );

  const candidatesView = (
    <>
      {renderPageHeader(
        'Fundis',
        'Browse matched fundis',
        'Filter fundis by skill and county, review their evidence, then start a direct hire flow from a live job.',
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={candidateSkill} onChange={(e) => setCandidateSkill(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#2563EB]">
            {SKILL_OPTIONS.map(skill => <option key={skill}>{skill}</option>)}
          </select>
          <select value={candidateCounty} onChange={(e) => setCandidateCounty(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#2563EB]">
            {COUNTIES.map(item => <option key={item}>{item}</option>)}
          </select>
        </div>
      )}
      <section className="grid gap-6 lg:grid-cols-3">
        {candidateRecommendations.map(candidate => renderCandidateCard(candidate))}
      </section>
    </>
  );

  const focusedApplicationsView = selectedApplicationJob ? (
    <>
      {renderPageHeader(
        'Job applications',
        selectedApplicationJob.title,
        `Review fundis who applied for this specific job in ${selectedApplicationJob.county}. Use the actions to shortlist, hire, message, or reject each applicant.`,
        <button onClick={() => onSelectEmployerJob?.('')} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB]">
          View all applications
        </button>
      )}
      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4">
        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">Applicants</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{selectedJobApplications.length}</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-orange-500">Client offer</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{formatKSh(selectedApplicationJob.budget)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Deadline</p>
          <p className="mt-2 text-sm font-black text-slate-950">{selectedApplicationJob.deadline}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600">Status</p>
          <p className="mt-2 text-sm font-black capitalize text-slate-950">{jobStatusLabel(selectedApplicationJob)}</p>
        </div>
      </section>
      <section className="space-y-5">
        {selectedJobApplications.length ? selectedJobApplications.map(app => renderJobApplicationCard(app, selectedApplicationJob)) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-black text-slate-950">No applications yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              This job has not received any fundi applications yet. When someone applies, their offer, profile, match score, and hiring actions will appear here.
            </p>
          </div>
        )}
      </section>
    </>
  ) : null;

  const applicationsView = focusedApplicationsView || (
    <>
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-sm">
        <div className="relative p-7 sm:p-8">
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#2563EB]/25 blur-3xl" />
          <div className="absolute -bottom-28 left-1/2 h-56 w-56 rounded-full bg-[#F97316]/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-orange-200">Applications</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Hiring desk</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Review every applicant, compare their fit, and move the right fundis from new application to hired outcome with fewer clicks.
              </p>
            </div>
            <button onClick={openCreateJob} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-50">
              <Plus className="h-4 w-4 text-[#F97316]" />
              Post another job
            </button>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'New applications', value: pendingApps, icon: Clock3, tone: 'text-slate-200' },
              { label: 'Under review', value: reviewedApps, icon: Eye, tone: 'text-blue-200' },
              { label: 'Shortlisted', value: shortlistedApps, icon: Sparkles, tone: 'text-orange-200' },
              { label: 'Hired / offered', value: hiredApps, icon: CheckCircle2, tone: 'text-emerald-200' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                  <Icon className={`h-5 w-5 ${item.tone}`} />
                  <p className="mt-5 text-3xl font-black">{item.value}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_220px_180px]">
          <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
            Search applicant, skill, or job
            <input
              value={applicationQuery}
              onChange={(event) => setApplicationQuery(event.target.value)}
              placeholder="Search fundi name, trade, county..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case tracking-normal text-slate-900 outline-none transition focus:border-[#2563EB] focus:bg-white"
            />
          </label>
          <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
            Job
            <select value={applicationJobFilter} onChange={(event) => setApplicationJobFilter(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm normal-case text-slate-900 outline-none focus:border-[#2563EB]">
              <option value="all">All jobs</option>
              {myJobs.map(job => <option key={job._id} value={job._id}>{job.title}</option>)}
            </select>
          </label>
          <div className="block text-xs font-black uppercase tracking-wide text-slate-400">
            View
            <div className="mt-2 flex rounded-2xl bg-slate-100 p-1">
              {(['kanban', 'list'] as const).map(item => (
                <button key={item} onClick={() => setApplicationView(item)} className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-black capitalize transition ${applicationView === item ? 'bg-white text-[#2563EB] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  {item === 'kanban' ? 'Board' : 'List'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {applicationStatusFilters.map(filter => (
            <button
              key={filter.label}
              onClick={() => setApplicationStatusFilter(filter.value)}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${applicationStatusFilter === filter.value ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {filter.label}
              <span className={`ml-2 rounded-full px-2 py-0.5 ${applicationStatusFilter === filter.value ? 'bg-white/15 text-white' : 'bg-white text-slate-500'}`}>{filter.count}</span>
            </button>
          ))}
        </div>
      </section>

      {filteredApplications.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-black text-slate-950">No applications match this view</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Try clearing the filters or post a new job to attract more matched fundis.</p>
        </section>
      ) : applicationView === 'kanban' ? (
        <section className="grid gap-6 xl:grid-cols-4">
          {workflowColumns.map(column => {
            const columnApps = filteredApplications.filter(app => column.statuses.includes(app.status));
            return (
              <div key={column.title} className={`rounded-3xl border p-4 shadow-sm ${column.tone}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-950">{column.title}</h2>
                  <span className="grid h-9 min-w-9 place-items-center rounded-full bg-white px-2 text-sm font-black text-slate-900 shadow-sm">{columnApps.length}</span>
                </div>
                <div className="mt-4 space-y-4">
                  {columnApps.length ? columnApps.map(app => renderApplicationRow(app, true)) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-center text-xs text-slate-400">No fundis here.</div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredApplications.map(app => renderApplicationRow(app))}
        </section>
      )}
    </>
  );

  const analyticsView = (
    <>
      {renderPageHeader(
        'Analytics',
        'Hiring insights',
        'Track hiring speed, fundi quality, budget coverage, and application movement away from the overview dashboard.'
      )}
      <section className="grid gap-6 lg:grid-cols-3">
        {[
          { label: 'Time to hire', value: hiredApps ? `${Math.max(2.4, 5.8 - hiredApps * 0.7).toFixed(1)} days` : 'No hires yet', icon: Clock3 },
          { label: 'Average match rate', value: candidateRecommendations.length ? `${Math.round(candidateRecommendations.reduce((sum, candidate) => sum + candidate.score, 0) / candidateRecommendations.length)}%` : '0%', icon: Gauge },
          { label: 'Pending reviews', value: pendingApps, icon: Eye },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <Icon className="h-6 w-6 text-[#2563EB]" />
              <p className="mt-8 text-4xl font-black tracking-tight text-slate-950">{item.value}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">{item.label}</p>
            </div>
          );
        })}
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Weekly hiring activity</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Applications and outcomes</h2>
            </div>
            <BarChart3 className="h-5 w-5 text-[#F97316]" />
          </div>
          <div className="mt-8 grid h-56 grid-cols-7 items-end gap-3">
            {[2, 4, 3, 6, 5, 7, Math.max(1, weeklyApplications)].map((value, index) => (
              <div key={index} className="flex h-full flex-col justify-end rounded-2xl bg-slate-100 p-2">
                <div className="rounded-xl bg-[#2563EB] transition-all duration-500" style={{ height: `${Math.min(100, value * 12)}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-orange-200">Weekly summary</p>
          <h2 className="mt-3 text-2xl font-black">You hired {weeklyHires} fundi{weeklyHires === 1 ? '' : 's'} this week.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {weeklyHires ? 'Good momentum. Keep reviewing pending fundis quickly to protect response time.' : 'No completed hires this week. Start with pending applications and shortlist the strongest matches.'}
          </p>
        </div>
      </section>
    </>
  );

  const currentView =
    view === 'jobs' ? jobsView :
    view === 'candidates' ? candidatesView :
    view === 'applications' ? applicationsView :
    view === 'analytics' ? analyticsView :
    dashboardView;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 sm:px-8 lg:px-10">
      {currentView}

      {postPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
          <button className="hidden flex-1 cursor-default lg:block" onClick={() => setPostPanelOpen(false)} aria-label="Close job form backdrop" />
          <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#F97316]">{editingJobId ? 'Edit job' : 'Guided job posting'}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{editingJobId ? 'Update job details' : 'Post a new job'}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Capture scope, trade requirements, location, and application deadline.</p>
                </div>
                <button onClick={() => { setPostPanelOpen(false); resetJobForm(); }} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {['Scope', 'Trade', 'Deadline'].map((step, index) => (
                  <button key={step} onClick={() => setPostStep(index)} className={`rounded-full px-3 py-2 text-xs font-black transition ${postStep === index ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {index + 1}. {step}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateJob} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {postStep === 0 && (
                  <div className="space-y-5">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                      Job title
                      <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-900 outline-none transition focus:border-[#2563EB] focus:bg-white" placeholder="e.g. Roof truss installation" />
                    </label>
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                      Scope and deliverables
                      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={8} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case leading-6 tracking-normal text-slate-900 outline-none transition focus:border-[#2563EB] focus:bg-white" placeholder="Describe the site, expected deliverables, materials available, and any access constraints." />
                    </label>
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                      Project type
                      <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                        {['Residential', 'Commercial', 'Estate maintenance', 'Emergency repair'].map(type => <option key={type}>{type}</option>)}
                      </select>
                    </label>
                  </div>
                )}

                {postStep === 1 && (
                  <div className="space-y-5">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                      Category
                      <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value as JobCategory)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                        {JOB_CATEGORIES.filter((category): category is JobCategory => category !== 'All Categories').map(category => <option key={category}>{category}</option>)}
                      </select>
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                        Primary skill
                        <select value={primarySkill} onChange={(e) => setPrimarySkill(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                          {SKILL_OPTIONS.filter(skill => skill !== 'All Skills').map(skill => <option key={skill}>{skill}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                        Secondary skill
                        <select value={secondarySkill} onChange={(e) => setSecondarySkill(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                          {SKILL_OPTIONS.filter(skill => skill !== 'All Skills').map(skill => <option key={skill}>{skill}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="rounded-3xl bg-blue-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-black text-blue-900">
                        <SlidersHorizontal className="h-4 w-4" />
                        Matching signal
                      </p>
                      <p className="mt-2 text-xs leading-5 text-blue-800">These skills feed fundi ranking, so choose the actual work needed.</p>
                    </div>
                  </div>
                )}

                {postStep === 2 && (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                        County
                        <select value={county} onChange={(e) => setCounty(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                          {COUNTIES.filter(c => c !== 'All Counties').map(c => <option key={c}>{c}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                        Client offer
                        <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none" />
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                        Work arrangement
                        <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                          {['Onsite', 'Hybrid', 'Remote'].map(mode => <option key={mode}>{mode}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                        Application deadline
                        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none" />
                      </label>
                    </div>
                    <div className="rounded-3xl bg-orange-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-black text-orange-900">
                        <PanelRightOpen className="h-4 w-4" />
                        Deadline rule
                      </p>
                      <p className="mt-2 text-xs leading-5 text-orange-800">When the application deadline passes, this job is archived automatically and disappears from available jobs.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-6">
                <button type="button" onClick={() => setPostStep(step => Math.max(0, step - 1))} disabled={postStep === 0} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                {postStep < 2 ? (
                  <button type="button" onClick={() => setPostStep(step => Math.min(2, step + 1))} className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-5 py-2.5 text-xs font-black text-white transition hover:bg-blue-700">
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-xs font-black text-white transition hover:bg-orange-600">
                    <Send className="h-4 w-4" />
                    {editingJobId ? 'Save changes' : 'Publish job'}
                  </button>
                )}
              </div>
            </form>
          </aside>
        </div>
      )}

      {hireCandidate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
          <button className="hidden flex-1 cursor-default lg:block" onClick={() => setHireCandidate(null)} aria-label="Close hire panel backdrop" />
          <aside className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#F97316]">Hiring process</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Start hire offer</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Create a trackable offer and move this fundi into your application pipeline.</p>
                </div>
                <button onClick={() => setHireCandidate(null)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <img src={hireCandidate.profile.avatarUrl} alt={hireCandidate.user?.name || 'Fundi'} className="h-14 w-14 rounded-2xl object-cover" />
                  <div>
                    <h3 className="font-black text-slate-950">{hireCandidate.user?.name || 'Fundi profile'}</h3>
                    <p className="text-xs font-bold text-slate-500">{hireCandidate.profile.skills.slice(0, 3).join(', ')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                  Hire for job
                  <select value={hireJobId} onChange={(e) => setHireJobId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                    <option value="">Select a live job</option>
                    {liveJobs.map(job => <option key={job._id} value={job._id}>{job.title}</option>)}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                    Proposed offer
                    <input type="number" value={hireOffer} onChange={(e) => setHireOffer(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none" />
                  </label>
                  <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                    Preferred start
                    <input type="date" value={hireStartDate} onChange={(e) => setHireStartDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none" />
                  </label>
                </div>
                <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                  Offer note
                  <textarea value={hireNote} onChange={(e) => setHireNote(e.target.value)} rows={5} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case leading-6 text-slate-900 outline-none" />
                </label>
                <div className="rounded-3xl bg-emerald-50 p-4">
                  <p className="text-sm font-black text-emerald-900">What happens next</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-800">The offer appears in Applications as an offered fundi. You can message, reject, or mark hired from the pipeline.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={() => setHireCandidate(null)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50">Cancel</button>
              <button onClick={confirmHireOffer} className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-xs font-black text-white transition hover:bg-orange-600">
                <Send className="h-4 w-4" />
                Send hire offer
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
