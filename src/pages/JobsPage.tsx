import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import VerifiedEmployerBadge from '../components/VerifiedEmployerBadge';
import {
  COUNTIES,
  JOB_CATEGORIES,
  SKILL_OPTIONS,
  formatKSh,
  generateId,
  getJobCategory,
  timeAgo,
  type Application,
  type Job,
  type JobCategory,
} from '../db/schema';
import {
  ArrowRight,
  Banknote,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle,
  Filter,
  Hammer,
  Layers,
  MapPin,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

type View = 'list' | 'detail';
type CategoryFilter = (typeof JOB_CATEGORIES)[number];

interface JobsPageProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  filterCounty: string;
  filterSkill: string;
  filterQuery: string;
  setFilterCounty: (v: string) => void;
  setFilterSkill: (v: string) => void;
  setFilterQuery: (v: string) => void;
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  isDetailPage: boolean;
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
}

const categoryHints: Record<JobCategory, string> = {
  'Electrical Works': 'Wiring, consumer units, fault finding',
  'Building Construction': 'Masonry, concrete, structural work',
  'Solar Installation': 'Panels, inverters, pumps, backup power',
  'Borehole Drilling': 'Survey, drilling support, pump setup',
  'Plumbing & Drainage': 'Leaks, drainage, pipe fitting',
  'Carpentry & Joinery': 'Cabinets, roofing timber, furniture',
  'Painting & Finishing': 'Paint, gypsum, waterproofing',
  Roofing: 'Trusses, sheets, rafters, repairs',
  'Tiling & Flooring': 'Tiles, cabro, floor finishes',
  'Welding & Fabrication': 'Steel gates, frames, fabrication',
  'HVAC & Refrigeration': 'AC, cold rooms, refrigeration service',
  'Security & CCTV': 'CCTV, smart locks, access control',
  Landscaping: 'Cabro, garden works, external finishes',
};

export default function JobsPage({
  jobs,
  setJobs,
  applications,
  setApplications,
  filterCounty,
  filterSkill,
  filterQuery,
  setFilterCounty,
  setFilterSkill,
  setFilterQuery,
  selectedJobId,
  setSelectedJobId,
  isDetailPage,
  onNavigate,
  showToast,
}: JobsPageProps) {
  const { currentUser, isAuthenticated, profiles, users } = useAuth();
  const [view, setView] = useState<View>(() => isDetailPage ? 'detail' : 'list');
  const [maxBudget, setMaxBudget] = useState(100000);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All Categories');
  const [jobsPage, setJobsPage] = useState(0);
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    setView(isDetailPage ? 'detail' : 'list');
  }, [isDetailPage]);

  const activeJobs = useMemo(
    () => jobs.filter(job => job.status === 'active'),
    [jobs]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activeJobs.forEach(job => {
      const category = getJobCategory(job);
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return counts;
  }, [activeJobs]);

  const filteredJobs = useMemo(() => {
    return activeJobs
      .filter(job => {
        const q = filterQuery.toLowerCase();
        const category = getJobCategory(job);
        const matchQ = !q
          || job.title.toLowerCase().includes(q)
          || job.description.toLowerCase().includes(q)
          || category.toLowerCase().includes(q)
          || job.skills.some(skill => skill.toLowerCase().includes(q));
        const matchCategory = categoryFilter === 'All Categories' || category === categoryFilter;
        const matchCounty = filterCounty === 'All Counties' || job.county === filterCounty;
        const matchSkill = filterSkill === 'All Skills' || job.skills.includes(filterSkill);
        const matchBudget = job.budget <= maxBudget;
        return matchQ && matchCategory && matchCounty && matchSkill && matchBudget;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [activeJobs, categoryFilter, filterCounty, filterQuery, filterSkill, maxBudget]);

  useEffect(() => {
    setJobsPage(0);
  }, [categoryFilter, filterCounty, filterQuery, filterSkill, maxBudget]);

  const jobsPerPage = 12;
  const jobsTotalPages = Math.max(1, Math.ceil(filteredJobs.length / jobsPerPage));
  const safeJobsPage = Math.min(jobsPage, jobsTotalPages - 1);
  const visibleJobs = filteredJobs.slice(safeJobsPage * jobsPerPage, safeJobsPage * jobsPerPage + jobsPerPage);
  const selectedCategoryHint = categoryFilter === 'All Categories'
    ? 'Showing every active trade category. Use the dropdown to focus the work list.'
    : categoryHints[categoryFilter as JobCategory];

  const selectedJob = jobs.find(job => job._id === selectedJobId);
  const selectedEmployer = selectedJob ? users.find(user => user._id === selectedJob.employerId) : undefined;
  const selectedCategory = selectedJob ? getJobCategory(selectedJob) : 'Building Construction';
  const jobApps = applications.filter(application => application.jobId === selectedJobId);
  const hasApplied = currentUser ? applications.some(application => application.jobId === selectedJobId && application.fundiId === currentUser._id) : false;

  const handleResetFilters = () => {
    setFilterQuery('');
    setFilterCounty('All Counties');
    setFilterSkill('All Skills');
    setCategoryFilter('All Categories');
    setMaxBudget(100000);
  };

  const handleApply = () => {
    if (!isAuthenticated || !currentUser) {
      showToast('Please sign in to apply for jobs.');
      onNavigate('auth');
      return;
    }
    if (currentUser.role !== 'fundi') {
      showToast('Only fundi accounts can apply for jobs.');
      return;
    }
    if (hasApplied) {
      showToast('You have already applied for this job.');
      return;
    }
    if (!coverLetter.trim()) {
      showToast('Write your own application note before submitting.');
      return;
    }

    const profile = profiles.find(item => item.userId === currentUser._id);
    const newApplication: Application = {
      _id: generateId('app'),
      jobId: selectedJobId,
      fundiId: currentUser._id,
      fundiName: currentUser.name,
      fundiSkill: profile?.skills?.[0] || 'General Fundi',
      fundiRating: profile?.rating || 5.0,
      coverLetter: coverLetter.trim(),
      status: 'pending',
      appliedAt: Date.now(),
      updatedAt: Date.now(),
    };

    setApplications(prev => [newApplication, ...prev]);
    setJobs(prev => prev.map(job => job._id === selectedJobId ? { ...job, applicationsCount: job.applicationsCount + 1 } : job));
    showToast('Application submitted. Employer will be notified.');
    setCoverLetter('');
  };

  if (view === 'detail' && selectedJob) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => {
            setView('list');
            onNavigate('jobs');
          }}
          className="mb-4 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#005fec] transition hover:-translate-x-0.5 hover:bg-slate-50"
        >
          Back to jobs
        </button>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100">
                  <Layers className="h-3.5 w-3.5 text-amber-300" />
                  {selectedCategory}
                </span>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{selectedJob.title}</h1>
                <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5">Client: <strong className="text-white">{selectedJob.employerName}</strong><VerifiedEmployerBadge user={selectedEmployer} /></span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedJob.county}</span>
                  <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {selectedJob.deadline}</span>
                  <span>Posted {timeAgo(selectedJob.createdAt)}</span>
                </p>
              </div>

              <div className="rounded-xl border border-blue-300/20 bg-blue-400/10 p-4 text-left shadow-inner shadow-blue-950/20 sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Client offer</p>
                <p className="mt-1 text-2xl font-black text-white">{formatKSh(selectedJob.budget)}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-300">Indicative labour budget</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <section>
              <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Job description</h2>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">{selectedJob.description}</div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Required skills</h2>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.skills.map(skill => (
                    <span key={skill} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-800">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-950">
                <p className="font-black">Daily work helper</p>
                <p className="mt-1">Before applying, confirm site access, materials on site, transport cost, and exact handover date.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                <PlusCircle className="h-5 w-5 text-[#005fec]" />
                Submit application
              </h2>

              {!isAuthenticated ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  You must <button onClick={() => onNavigate('auth')} className="font-black underline">sign in</button> to apply.
                </div>
              ) : currentUser?.role !== 'fundi' ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Sign in with a fundi account to apply.
                </div>
              ) : hasApplied ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span>Application already submitted. Track status in your <button onClick={() => onNavigate('dashboard-fundi')} className="font-black underline">Fundi Dashboard</button>.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={coverLetter}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    placeholder="Write a short, specific note: availability, relevant experience, tools, and what you need from the client."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-blue-600"
                  />
                  <button
                    disabled={!coverLetter.trim()}
                    onClick={handleApply}
                    className="flex items-center gap-2 rounded-xl bg-[#005fec] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0"
                  >
                    Submit application
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Applications ({jobApps.length})</h2>
              <div className="space-y-2">
                {jobApps.map(application => (
                  <div key={application._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-xs">
                    <div>
                      <span className="font-black text-slate-900">{application.fundiName}</span>
                      <span className="ml-1 text-slate-400">({application.fundiSkill})</span>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                      application.status === 'hired' ? 'bg-emerald-100 text-emerald-800' :
                      application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {application.status}
                    </span>
                  </div>
                ))}
                {jobApps.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs italic text-slate-400">No applications yet.</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Kenyan construction jobs
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Find jobs by trade, county, and budget.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Browse verified work opportunities across construction, power, water, security, finishing, and maintenance. Each job shows its category, scope, budget, skills, and employer details upfront.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active jobs', value: activeJobs.length },
              { label: 'Categories', value: categoryCounts.size },
              { label: 'Counties', value: new Set(activeJobs.map(job => job.county)).size },
            ].map(metric => (
              <div key={metric.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-2xl font-black">{metric.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Layers className="h-4 w-4 text-[#005fec]" />
              Select work category
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{selectedCategoryHint}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#005fec] focus:bg-white"
            >
              {JOB_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category === 'All Categories' ? 'All Categories' : `${category} (${categoryCounts.get(category) || 0})`}
                </option>
              ))}
            </select>
            <button onClick={handleResetFilters} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-[#005fec] transition hover:bg-blue-50 active:scale-95">
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <aside className="self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
              <Filter className="h-3.5 w-3.5 text-[#005fec]" />
              Filters
            </span>
            <button onClick={handleResetFilters} className="text-[11px] font-bold text-slate-400 underline hover:text-blue-600">
              Reset
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              Keywords
              <div className="relative mt-1">
                <input
                  type="text"
                  placeholder="solar, borehole, cctv..."
                  value={filterQuery}
                  onChange={(event) => setFilterQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 pl-8 text-xs outline-none focus:border-blue-500"
                />
                <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
              </div>
            </label>

            <label className="block text-xs font-bold text-slate-700">
              County
              <select
                value={filterCounty}
                onChange={(event) => setFilterCounty(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-medium outline-none"
              >
                {COUNTIES.map(county => <option key={county} value={county}>{county}</option>)}
              </select>
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Specialization
              <select
                value={filterSkill}
                onChange={(event) => setFilterSkill(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-medium outline-none"
              >
                {SKILL_OPTIONS.map(skill => <option key={skill} value={skill}>{skill}</option>)}
              </select>
            </label>

            <div>
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-700">
                <span>Max budget</span>
                <span className="text-[#005fec]">{formatKSh(maxBudget)}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="100000"
                step="2500"
                value={maxBudget}
                onChange={(event) => setMaxBudget(Number(event.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>KSh 5K</span>
                <span>KSh 100K+</span>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-[11px] text-slate-600">
              <p className="mb-0.5 flex items-center gap-1.5 font-black text-blue-800">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Smart matching
              </p>
              <p>Use category, county, specialization, and budget together to find jobs worth your travel time.</p>
            </div>
          </div>
        </aside>

        <section className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
            <span>Available jobs: <strong>{filteredJobs.length}</strong></span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
              Page {safeJobsPage + 1}/{jobsTotalPages}
            </span>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <h3 className="font-bold text-slate-800">No matching jobs</h3>
              <p className="mt-1 text-xs text-slate-500">Try expanding your filters.</p>
              <button onClick={handleResetFilters} className="mt-4 rounded-xl bg-[#005fec] px-4 py-2 text-xs font-bold text-white">
                Reset filters
              </button>
            </div>
          ) : (
            <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleJobs.map(job => {
              const category = getJobCategory(job);
              const employer = users.find(user => user._id === job.employerId);
              return (
                <button
                  key={job._id}
                  onClick={() => {
                    setSelectedJobId(job._id);
                    setView('detail');
                    onNavigate('job-detail');
                    setCoverLetter('');
                  }}
                  className="group flex min-h-[340px] w-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-100/80 active:scale-[0.99] sm:p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      <Layers className="h-3.5 w-3.5 text-amber-300" />
                      {category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.county}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      <Banknote className="h-3.5 w-3.5" />
                      Client offer listed
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col">
                    <h2 className="text-base font-black tracking-tight text-slate-950 transition group-hover:text-[#005fec]">{job.title}</h2>
                    <p
                      className="mt-2 text-sm leading-6 text-slate-600"
                      style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {job.description}
                    </p>

                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
                      <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <Banknote className="h-3.5 w-3.5" />
                        Client offer
                      </p>
                      <p className="text-xl font-black text-[#005fec]">{formatKSh(job.budget)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {job.skills.slice(0, 4).map(skill => (
                      <span key={skill} className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto border-t border-slate-100 pt-3 text-xs">
                    <div className="space-y-2 text-slate-500">
                      <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> <span className="truncate">{job.employerName}</span><VerifiedEmployerBadge user={employer} /></span>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1"><Hammer className="h-3.5 w-3.5" /> {job.applicationsCount} applications</span>
                        <span>{timeAgo(job.createdAt)}</span>
                      </div>
                    </div>
                    <span className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-[#005fec] px-4 py-2.5 text-xs font-black text-white transition group-hover:translate-x-0.5">
                      Review and apply
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
            </div>
            {filteredJobs.length > jobsPerPage && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold text-slate-500">
                  Showing {safeJobsPage * jobsPerPage + 1}-{Math.min(filteredJobs.length, (safeJobsPage + 1) * jobsPerPage)} of {filteredJobs.length} jobs
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJobsPage(page => Math.max(0, page - 1))}
                    disabled={safeJobsPage === 0}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                    {safeJobsPage + 1}/{jobsTotalPages}
                  </span>
                  <button
                    onClick={() => setJobsPage(page => Math.min(jobsTotalPages - 1, page + 1))}
                    disabled={safeJobsPage >= jobsTotalPages - 1}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
