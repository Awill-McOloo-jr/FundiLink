import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, SKILL_OPTIONS, formatKSh, timeAgo, type Application, type Job, type ProfileViewEvent } from '../db/schema';
import {
  AlertTriangle,
  Award,
  Banknote,
  BarChart3,
  Bell,
  BookmarkPlus,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  FolderKanban,
  Lightbulb,
  Layers,
  MapPinned,
  MessageSquare,
  Search,
  Send,
  Shield,
  SlidersHorizontal,
  Star,
  TrendingUp,
  Video,
  XCircle,
  Zap,
} from 'lucide-react';

interface FundiDashboardProps {
  jobs: Job[];
  applications: Application[];
  onNavigate: (page: string) => void;
  onOpenJob: (jobId: string) => void;
  showToast: (msg: string) => void;
  profileViews: number;
  profileViewEvents: ProfileViewEvent[];
}

const SKILL_CATEGORIES: Record<string, string[]> = {
  Structural: ['Masonry', 'Concrete Mixing', 'Foundation Repair', 'Tile Fitting'],
  Mechanical: ['Plumbing', 'Drainage', 'Pipe Fitting', 'Water Heater Repair'],
  Electrical: ['Electrical Wiring', 'Solar Installation', 'Fault Finding', 'Generator Setup'],
  Fabrication: ['Carpentry', 'Roofing', 'Cabinet Making', 'Wood Varnishing'],
  Finishing: ['Painting', 'Gypsum Ceiling', 'Wall Texturing', 'Waterproofing'],
};

const COUNTY_DISTANCES: Record<string, Record<string, number>> = {
  Nairobi: { Kiambu: 24, Kajiado: 78, Machakos: 64, Nakuru: 160, Kisumu: 350, Mombasa: 485 },
  Kiambu: { Nairobi: 24, Kajiado: 96, Machakos: 76, Nakuru: 138 },
  Mombasa: { Nairobi: 485, Kisumu: 830 },
  Kisumu: { Eldoret: 120, Nakuru: 185, Nairobi: 350 },
  Nakuru: { Nairobi: 160, Kiambu: 138, Eldoret: 155, Kisumu: 185 },
  Machakos: { Nairobi: 64, Kiambu: 76, Kajiado: 110 },
};

function getCategory(skill: string) {
  return Object.entries(SKILL_CATEGORIES).find(([, items]) => items.includes(skill))?.[0] || 'General';
}

function getDistance(from: string, to: string) {
  if (from === to || from === 'All Counties') return 0;
  return COUNTY_DISTANCES[from]?.[to] ?? COUNTY_DISTANCES[to]?.[from] ?? 220;
}

function getCompanyType(job: Job) {
  if (job.employerName.includes('Kiprop')) return 'Contractor';
  if (job.employerName.includes('Maina')) return 'Estate';
  return 'Homeowner';
}

function getWorkMode(job: Job) {
  if (job.skills.some(skill => ['Solar Installation', 'Electrical Wiring', 'Cabinet Making'].includes(skill))) return 'Hybrid';
  return 'Onsite';
}

function getJobLevel(job: Job) {
  if (job.budget >= 45000) return 'Senior';
  if (job.budget >= 22000) return 'Mid';
  return 'Junior';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function FundiDashboard({ jobs, applications, onNavigate, onOpenJob, showToast, profileViews, profileViewEvents }: FundiDashboardProps) {
  const { currentUser, profiles } = useAuth();
  const myProfile = currentUser ? profiles.find(p => p.userId === currentUser._id) : undefined;

  const [filterCounty, setFilterCounty] = useState(myProfile?.county || 'All Counties');
  const [radius, setRadius] = useState(60);
  const [minBudget, setMinBudget] = useState(10000);
  const [maxBudget, setMaxBudget] = useState(70000);
  const [experienceLevel, setExperienceLevel] = useState('Any');
  const [techStack, setTechStack] = useState('All Skills');
  const [workArrangement, setWorkArrangement] = useState('Any');
  const [companyType, setCompanyType] = useState('Any');
  const [savedSearches, setSavedSearches] = useState<string[]>(['Nearby high-match jobs', 'Verified employers over KSh 25k']);
  const [recommendationPage, setRecommendationPage] = useState(0);
  const [showAllApplications, setShowAllApplications] = useState(false);

  useEffect(() => {
    setFilterCounty(myProfile?.county || 'All Counties');
  }, [myProfile]);

  const myApps = useMemo(
    () => currentUser ? applications.filter(a => a.fundiId === currentUser._id) : [],
    [applications, currentUser]
  );
  const sortedApplications = useMemo(
    () => [...myApps].sort((a, b) => b.updatedAt - a.updatedAt),
    [myApps]
  );
  const appliedJobIds = useMemo(() => new Set(myApps.map(app => app.jobId)), [myApps]);
  const profileSkills = myProfile?.skills || [];
  const completedJobs = myProfile?.completedJobs || 0;
  const successfulApplications = myApps.filter(app => ['offered', 'hired'].includes(app.status)).length;
  const successRate = myApps.length ? Math.round((successfulApplications / myApps.length) * 100) : 0;
  const pendingApplications = myApps.filter(app => app.status === 'pending').length;
  const shortlistedApplications = myApps.filter(app => ['reviewed', 'interviewed'].includes(app.status)).length;
  const hiredOrOfferedApplications = successfulApplications;
  const rejectedApplications = myApps.filter(app => ['rejected', 'withdrawn'].includes(app.status)).length;
  const applicationStatusCards = [
    { label: 'Applied', value: myApps.length, helper: 'Total job applications sent', icon: ClipboardCheck, tone: 'text-blue-300' },
    { label: 'Pending', value: pendingApplications, helper: 'Waiting for employer review', icon: Bell, tone: 'text-amber-300' },
    { label: 'Shortlisted', value: shortlistedApplications, helper: 'Reviewed or invited to interview', icon: Star, tone: 'text-cyan-300' },
    { label: 'Hired / offered', value: hiredOrOfferedApplications, helper: 'Positive hiring outcomes', icon: Award, tone: 'text-emerald-300' },
    { label: 'Rejected', value: rejectedApplications, helper: 'Closed without selection', icon: XCircle, tone: 'text-red-300' },
  ];

  const matchedJobs = useMemo(() => {
    const skillSet = new Set(profileSkills.map(skill => skill.toLowerCase()));

    return jobs
      .filter(job => job.status === 'active' && !appliedJobIds.has(job._id))
      .map(job => {
        const matchedSkills = job.skills.filter(skill => skillSet.has(skill.toLowerCase()));
        const adjacentSkills = job.skills.filter(skill =>
          !matchedSkills.includes(skill) && profileSkills.some(profileSkill => getCategory(profileSkill) === getCategory(skill))
        );
        const distance = getDistance(myProfile?.county || 'Nairobi', job.county);
        const level = getJobLevel(job);
        const workMode = getWorkMode(job);
        const type = getCompanyType(job);
        const skillScore = Math.round((matchedSkills.length / Math.max(job.skills.length, 1)) * 42 + adjacentSkills.length * 8);
        const experienceScore = Math.min(18, Math.round(completedJobs / 2.2));
        const locationScore = job.county === myProfile?.county ? 18 : Math.max(0, 18 - Math.round(distance / 18));
        const salaryScore = job.budget >= minBudget && job.budget <= maxBudget ? 14 : job.budget > maxBudget ? 8 : 4;
        const preferenceScore = (workArrangement === 'Any' || workArrangement === workMode ? 5 : 1) + (companyType === 'Any' || companyType === type ? 5 : 1);
        const hiredSignal = myApps.some(app => ['offered', 'hired'].includes(app.status) && matchedSkills.some(skill => app.fundiSkill.toLowerCase().includes(skill.toLowerCase())));
        const score = Math.min(98, skillScore + experienceScore + locationScore + salaryScore + preferenceScore + (hiredSignal ? 6 : 2));

        return { job, matchedSkills, adjacentSkills, distance, level, workMode, companyType: type, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [jobs, appliedJobIds, profileSkills, myProfile?.county, completedJobs, minBudget, maxBudget, workArrangement, companyType, myApps]);

  const filteredJobs = matchedJobs.filter(({ job, distance, level, workMode, companyType: type }) => {
    const locationOk = filterCounty === 'All Counties' || job.county === filterCounty || distance <= radius;
    const budgetOk = job.budget >= minBudget && job.budget <= maxBudget;
    const levelOk = experienceLevel === 'Any' || level === experienceLevel;
    const skillOk = techStack === 'All Skills' || job.skills.includes(techStack);
    const workOk = workArrangement === 'Any' || workMode === workArrangement;
    const companyOk = companyType === 'Any' || type === companyType;
    return locationOk && budgetOk && levelOk && skillOk && workOk && companyOk;
  });

  useEffect(() => {
    setRecommendationPage(0);
  }, [filterCounty, radius, minBudget, maxBudget, experienceLevel, techStack, workArrangement, companyType, currentUser?._id]);

  const recommendationPageSize = 3;
  const recommendationTotalPages = Math.max(1, Math.ceil(filteredJobs.length / recommendationPageSize));
  const safeRecommendationPage = Math.min(recommendationPage, recommendationTotalPages - 1);
  const visibleRecommendations = filteredJobs.slice(
    safeRecommendationPage * recommendationPageSize,
    safeRecommendationPage * recommendationPageSize + recommendationPageSize
  );

  const openSkillMatches = jobs.filter(job => job.status === 'active' && !appliedJobIds.has(job._id) && job.skills.some(skill => profileSkills.includes(skill))).length;
  const topMatch = matchedJobs[0];
  const recentProfileViewers = [...profileViewEvents].sort((a, b) => b.viewedAt - a.viewedAt).slice(0, 4);
  const earlierUntrackedViews = Math.max(0, profileViews - profileViewEvents.length);
  const displayedApplications = showAllApplications ? sortedApplications : sortedApplications.slice(0, 1);
  const cvInsightList = myProfile?.cvInsights || [];
  const verificationDocuments = myProfile?.verificationDocuments || [];
  const readinessItems = [
    { label: 'Profile photo', done: Boolean(myProfile?.avatarUrl), detail: 'Helps employers identify you quickly.' },
    { label: 'CV insights', done: cvInsightList.length > 0, detail: cvInsightList.length > 0 ? `${myProfile?.cvFileName || 'CV'} scanned for matching.` : 'Upload CV to extract skills and certifications.' },
    { label: 'Portfolio evidence', done: Boolean(myProfile?.portfolioImages.length), detail: `${myProfile?.portfolioImages.length || 0} portfolio item(s).` },
    { label: 'Verification', done: Boolean(myProfile?.verified), detail: myProfile?.verified ? 'Verified profile.' : `${verificationDocuments.length} evidence file(s) uploaded.` },
  ];
  const readinessScore = Math.round((readinessItems.filter(item => item.done).length / readinessItems.length) * 100);
  const latestApplication = sortedApplications[0];
  const latestApplicationJob = latestApplication ? jobs.find(job => job._id === latestApplication.jobId) : undefined;
  const statusMessage = latestApplication
    ? latestApplication.status === 'pending'
      ? `Application sent to ${latestApplicationJob?.employerName || 'the employer'} for ${latestApplicationJob?.title || 'a job'}.`
      : latestApplication.status === 'reviewed'
        ? `${latestApplicationJob?.employerName || 'Employer'} has reviewed your application.`
        : latestApplication.status === 'interviewed'
          ? `Interview invitation received for ${latestApplicationJob?.title || 'your application'}.`
          : latestApplication.status === 'offered'
            ? `Offer received for ${latestApplicationJob?.title || 'your application'}.`
            : latestApplication.status === 'hired'
              ? `You were hired for ${latestApplicationJob?.title || 'the job'}.`
              : latestApplication.status === 'rejected'
                ? `${latestApplicationJob?.employerName || 'Employer'} selected another fundi for ${latestApplicationJob?.title || 'that job'}.`
                : `Application status updated to ${latestApplication.status}.`
    : 'No applications sent yet. Apply to a matching job to start receiving live updates.';
  const replyCount = myApps.filter(app => app.status !== 'pending').length;
  const notificationItems = [
    statusMessage,
    replyCount > 0
      ? `${replyCount} application reply signal(s) received from employers.`
      : 'No employer replies yet. Your dashboard will update when a status changes.',
    readinessScore < 100
      ? `Profile is ${readinessScore}% complete. Finish ${readinessItems.filter(item => !item.done).map(item => item.label.toLowerCase()).join(', ')} in the profile tab.`
      : 'Profile is complete and ready for employer review.',
  ];
  const strongestSkill = profileSkills[0] || topMatch?.matchedSkills[0] || 'your strongest trade';
  const applicationTips = [
    {
      title: 'Open with the exact job need',
      body: topMatch
        ? `Mention ${topMatch.matchedSkills[0] || topMatch.job.skills[0]} first, then show one similar job you completed.`
        : `Lead with ${strongestSkill} and the kind of site you handle best.`,
      icon: Lightbulb,
    },
    {
      title: 'Send proof before the employer asks',
      body: cvInsightList.length
        ? 'Your CV has useful signals. Add one photo or certificate that backs up the same skill.'
        : 'Upload your CV and one clear site photo so employers can verify your experience faster.',
      icon: FileText,
    },
    {
      title: 'Follow up pending applications',
      body: pendingApplications > 0
        ? `${pendingApplications} pending application(s) can get a polite follow-up after a day.`
        : 'When an application is pending, follow up once with availability, tools, and start date.',
      icon: Clock3,
    },
  ];

  if (!currentUser || currentUser.role !== 'fundi') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Fundi Access Required</h2>
          <p className="text-xs text-slate-600">Switch to a fundi persona from the left panel.</p>
        </div>
      </div>
    );
  }

  const handleSaveSearch = () => {
    const label = `${filterCounty === 'All Counties' ? 'All counties' : filterCounty} / ${techStack} / ${formatKSh(minBudget)}-${formatKSh(maxBudget)}`;
    setSavedSearches(prev => prev.includes(label) ? prev : [label, ...prev].slice(0, 4));
    showToast('Search preference saved for future job alerts.');
  };

  const handleRecommendAction = (job: Job) => {
    showToast(`Opening ${job.title} for application review.`);
    onOpenJob(job._id);
  };

  const handleApplicationFollowUp = (app: Application) => {
    const job = jobs.find(item => item._id === app.jobId);
    showToast(`Follow-up opened for ${job?.title || 'this application'}.`);
    onNavigate('messages');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-7">
          <div className="space-y-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100">
                <Bot className="h-3.5 w-3.5 text-amber-300" />
                AI matching workspace
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Welcome back, {currentUser.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Jobs are ranked by skill fit, experience, location, pay compatibility, work preference, and hiring feedback signals.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Application pipeline</p>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  Live from your applications
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {applicationStatusCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="rounded-lg bg-slate-900/70 p-3 ring-1 ring-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <Icon className={`h-4 w-4 ${card.tone}`} />
                        <p className="text-2xl font-black text-white">{card.value}</p>
                      </div>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">{card.helper}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Best recommendation</p>
                <h2 className="mt-1 text-lg font-black">{topMatch?.job.title || 'No fresh recommendations'}</h2>
              </div>
              <span className="rounded-md bg-emerald-400 px-2.5 py-1 text-xs font-black text-slate-950">{topMatch?.score || 0}%</span>
            </div>
            <div className="mt-4 space-y-2 text-xs text-slate-300">
              {topMatch ? (
                <>
                  <p className="flex items-center gap-2"><MapPinned className="h-3.5 w-3.5 text-blue-300" /> {topMatch.job.county} within {topMatch.distance} km match radius</p>
                  <p className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5 text-amber-300" /> {formatKSh(topMatch.job.budget)} budget compatibility</p>
                  <p className="flex items-center gap-2"><BriefcaseBusiness className="h-3.5 w-3.5 text-emerald-300" /> {topMatch.workMode} with {topMatch.companyType} client type</p>
                </>
              ) : (
                <p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> You have already applied to the current matching jobs. New active jobs will appear here automatically.</p>
              )}
            </div>
            <button
              onClick={() => topMatch && handleRecommendAction(topMatch.job)}
              disabled={!topMatch}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-slate-500"
            >
              <Send className="h-3.5 w-3.5" />
              {topMatch ? 'Review recommended job' : 'Waiting for new matching jobs'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <SlidersHorizontal className="h-4 w-4 text-[#005fec]" />
            Job matching filters
          </h2>
          <button onClick={handleSaveSearch} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50">
            <BookmarkPlus className="h-3.5 w-3.5 text-[#005fec]" />
            Save preset
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-8">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Location
            <select value={filterCounty} onChange={(e) => setFilterCounty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal text-slate-800">
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Radius
            <input type="range" min="10" max="250" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="mt-3 w-full" />
            <span className="text-xs normal-case text-slate-700">{radius} km</span>
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Min pay
            <input type="number" value={minBudget} onChange={(e) => setMinBudget(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case text-slate-800" />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Max pay
            <input type="number" value={maxBudget} onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case text-slate-800" />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Skill
            <select value={techStack} onChange={(e) => setTechStack(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal">
              {SKILL_OPTIONS.map(skill => <option key={skill}>{skill}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Work mode
            <select value={workArrangement} onChange={(e) => setWorkArrangement(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal">
              {['Any', 'Onsite', 'Hybrid', 'Remote'].map(mode => <option key={mode}>{mode}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Level
            <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal">
              {['Any', 'Junior', 'Mid', 'Senior'].map(level => <option key={level}>{level}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Client type
            <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal">
              {['Any', 'Homeowner', 'Contractor', 'Estate'].map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
        </div>
        {savedSearches.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {savedSearches.map(search => (
              <button key={search} onClick={() => showToast(`Loaded preset: ${search}`)} className="rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-blue-50">
                {search}
              </button>
            ))}
          </div>
        )}
      </section>

      <main className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Zap className="h-4 w-4 text-[#005fec]" />
                  Personalized job recommendations
                </h2>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#005fec]">{filteredJobs.length} matches</span>
              </div>
              <div className="mt-4 space-y-3">
                {filteredJobs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
                    No unapplied jobs match the current filters. Clear filters or wait for new jobs from employers.
                  </div>
                ) : visibleRecommendations.map(({ job, matchedSkills, adjacentSkills, score, distance, level, workMode, companyType: type }) => (
                  <div key={job._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-black text-slate-900">{job.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">{job.employerName} / {type} / {job.county} / {distance} km</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-2xl font-black text-[#005fec]">{score}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">match</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...matchedSkills, ...adjacentSkills].map(skill => (
                        <span key={skill} className="rounded-md bg-white px-2 py-1 text-[10px] font-black text-slate-700 ring-1 ring-slate-200">{skill}</span>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-4">
                      <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-600" /> {formatKSh(job.budget)}</span>
                      <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-600" /> {level}</span>
                      <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-blue-600" /> {workMode}</span>
                      <button onClick={() => handleRecommendAction(job)} className="rounded-md bg-slate-900 px-3 py-1.5 font-black text-white">Apply</button>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-[#005fec] transition-all" style={{ width: `${score}%` }} />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Skill fit: {matchedSkills.length}/{job.skills.length} exact, {adjacentSkills.length} adjacent. Score also includes distance, pay range, experience, and employer outcome signals.
                    </p>
                  </div>
                ))}
              </div>
              {filteredJobs.length > recommendationPageSize && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-bold text-slate-500">
                    Showing {safeRecommendationPage * recommendationPageSize + 1}-{Math.min(filteredJobs.length, (safeRecommendationPage + 1) * recommendationPageSize)} of {filteredJobs.length} matching jobs
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRecommendationPage(page => Math.max(0, page - 1))}
                      disabled={safeRecommendationPage === 0}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                      {safeRecommendationPage + 1}/{recommendationTotalPages}
                    </span>
                    <button
                      onClick={() => setRecommendationPage(page => Math.min(recommendationTotalPages - 1, page + 1))}
                      disabled={safeRecommendationPage >= recommendationTotalPages - 1}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Lightbulb className="h-4 w-4 text-[#005fec]" />
                Application coach
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Practical moves that help a fundi stand out before an employer shortlists.
              </p>
              <div className="mt-4 space-y-3">
                {applicationTips.map(tip => {
                  const TipIcon = tip.icon;
                  return (
                    <div key={tip.title} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#005fec] ring-1 ring-slate-200">
                          <TipIcon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-black text-slate-900">{tip.title}</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">{tip.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => onNavigate('profile')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-800 transition hover:bg-blue-50 hover:text-[#005fec]"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Improve profile evidence
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Layers className="h-4 w-4 text-[#005fec]" />
                  Application management
                </h2>
                {myApps.length > 1 && (
                  <button
                    onClick={() => setShowAllApplications(prev => !prev)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    {showAllApplications ? 'Show latest only' : `View all ${myApps.length}`}
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {myApps.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500">
                    No applications yet. <button onClick={() => onNavigate('jobs')} className="font-black text-[#005fec]">Browse jobs</button>
                  </div>
                ) : displayedApplications.map(app => {
                  const job = jobs.find(j => j._id === app.jobId);
                  const reviewed = ['reviewed', 'interviewed', 'offered', 'hired', 'rejected'].includes(app.status);
                  const interviewed = ['interviewed', 'offered', 'hired'].includes(app.status);
                  const finalDecision = ['offered', 'hired', 'rejected'].includes(app.status);
                  const steps = [
                    { label: 'Applied', done: true, icon: Send },
                    { label: 'Reviewed', done: reviewed, icon: Eye },
                    { label: 'Interview', done: interviewed, icon: Video },
                    { label: app.status === 'rejected' ? 'Rejected' : 'Offered', done: finalDecision, icon: app.status === 'rejected' ? XCircle : CheckCircle2 },
                  ];

                  return (
                    <div key={app._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-900">{job?.title || 'Unknown job'}</h3>
                          <p className="mt-1 text-[11px] text-slate-500">{job?.county} / {formatKSh(job?.budget || 0)} / Applied {new Date(app.appliedAt).toLocaleDateString('en-KE')}</p>
                        </div>
                        <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${
                          app.status === 'hired' || app.status === 'offered' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          app.status === 'interviewed' || app.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>{app.status === 'hired' ? 'Hired' : app.status}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {steps.map(step => {
                          const StepIcon = step.icon;
                          return (
                            <div key={step.label} className={`rounded-lg p-2 text-center ${step.done ? 'bg-white text-slate-900 ring-1 ring-slate-200' : 'bg-slate-100 text-slate-400'}`}>
                              <StepIcon className="mx-auto h-4 w-4" />
                              <p className="mt-1 text-[10px] font-black">{step.label}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => onNavigate('messages')} className="flex items-center gap-1.5 rounded-md bg-[#005fec] px-3 py-1.5 text-[11px] font-black text-white">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Message
                        </button>
                        {app.status === 'pending' && (
                          <button
                            onClick={() => handleApplicationFollowUp(app)}
                            className="flex items-center gap-1.5 rounded-md bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-slate-800"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Follow up
                          </button>
                        )}
                        <span className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                          {app.status === 'pending' && 'Notification: your application was sent.'}
                          {app.status === 'reviewed' && 'Notification: employer is reviewing your profile.'}
                          {app.status === 'interviewed' && 'Notification: you are invited to interview.'}
                          {app.status === 'offered' && 'Notification: job offer received.'}
                          {app.status === 'hired' && 'Notification: hired. M-Pesa payment can be prepared.'}
                          {app.status === 'rejected' && 'Notification: application was not selected.'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {myApps.length > 1 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status of all applications</p>
                    <div className="mt-3 space-y-2">
                      {sortedApplications.map(app => {
                        const job = jobs.find(item => item._id === app.jobId);
                        return (
                          <div key={`status-${app._id}`} className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0 truncate font-bold text-slate-700">{job?.title || 'Unknown job'}</span>
                            <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase ${
                              app.status === 'hired' || app.status === 'offered' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              app.status === 'interviewed' || app.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {app.status === 'hired' ? 'Hired' : app.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <ClipboardCheck className="h-4 w-4 text-[#005fec]" />
                  Verification and portfolio
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { title: 'Skill evidence', meta: `${profileSkills.length} live skill(s) listed`, icon: ClipboardCheck },
                    { title: 'Verification badge', meta: myProfile?.verified ? 'Active on profile cards' : `${verificationDocuments.length} evidence file(s) uploaded`, icon: Shield },
                    { title: 'Portfolio showcase', meta: `${myProfile?.portfolioImages.length || 0} projects`, icon: FolderKanban },
                    { title: 'CV intelligence', meta: cvInsightList.length ? `${cvInsightList.length} extracted insight(s)` : 'No CV scanned yet', icon: FileText },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-lg bg-slate-50 p-3">
                        <Icon className="h-4 w-4 text-[#005fec]" />
                        <p className="mt-2 text-xs font-black text-slate-900">{item.title}</p>
                        <p className="text-[11px] text-slate-500">{item.meta}</p>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => onNavigate('profile')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-black text-white transition hover:bg-slate-800">
                  <Shield className="h-3.5 w-3.5" />
                  Open verification center
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Bell className="h-4 w-4 text-[#005fec]" />
                  Notifications and reviews
                </h2>
                <div className="mt-4 space-y-2 text-xs">
                  {notificationItems.map((item, index) => (
                    <p key={item} className={`rounded-lg p-3 ${
                      index === 0 ? 'bg-blue-50 text-blue-900' : index === 1 ? 'bg-slate-50 text-slate-700' : 'bg-emerald-50 text-emerald-900'
                    }`}>
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <Eye className="h-4 w-4 text-[#005fec]" />
                    Profile viewers
                  </h2>
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#005fec]">
                    {profileViews} total
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {recentProfileViewers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                      No named viewers recorded yet. New profile visits will show the viewer, avatar, and time here.
                    </div>
                  ) : recentProfileViewers.map(view => (
                    <div key={view._id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                      {view.viewerAvatarUrl ? (
                        <img src={view.viewerAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                          {getInitials(view.viewerName)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-900">{view.viewerName}</p>
                        <p className="text-[11px] capitalize text-slate-500">{view.viewerRole === 'guest' ? 'Guest visitor' : view.viewerRole}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-slate-400">{timeAgo(view.viewedAt)}</span>
                    </div>
                  ))}
                  {earlierUntrackedViews > 0 && (
                    <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
                      {earlierUntrackedViews} earlier view{earlierUntrackedViews === 1 ? '' : 's'} happened before viewer tracking was enabled.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <BarChart3 className="h-4 w-4 text-[#005fec]" />
              Profile readiness
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="rounded-lg bg-slate-950 p-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Readiness score</p>
                <p className="mt-2 text-4xl font-black">{readinessScore}%</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">Complete the profile evidence employers use when shortlisting.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {readinessItems.map(item => (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-[10px] font-black ${item.done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.done ? 'Done' : 'Needed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { label: 'Profile views', value: profileViews, helper: `${profileViewEvents.length} named, ${earlierUntrackedViews} earlier untracked`, icon: Eye },
                { label: 'Application success', value: `${successRate}%`, helper: `${successfulApplications}/${myApps.length} offered or hired applications`, icon: TrendingUp },
                { label: 'Open skill matches', value: openSkillMatches, helper: 'Active jobs requiring your skills', icon: Search },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-4">
                    <Icon className="h-4 w-4 text-[#005fec]" />
                    <p className="mt-3 text-xl font-black text-slate-900">{item.value}</p>
                    <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.helper}</p>
                  </div>
                );
              })}
            </div>
          </section>
      </main>
    </div>
  );
}
