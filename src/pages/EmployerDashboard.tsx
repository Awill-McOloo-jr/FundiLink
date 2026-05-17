import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, JOB_CATEGORIES, SKILL_OPTIONS, formatKSh, generateId, getJobCategory, type Application, type Job, type JobCategory } from '../db/schema';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Filter,
  Gauge,
  MapPin,
  MessageSquare,
  PlusCircle,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserCheck,
  UsersRound,
  Video,
  XCircle,
} from 'lucide-react';

interface EmployerDashboardProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  onNavigate: (page: string) => void;
  onSelectFundi: (id: string) => void;
  showToast: (msg: string) => void;
}

function getWorkMode(job: Job) {
  if (job.description.toLowerCase().includes('remote')) return 'Remote';
  if (job.description.toLowerCase().includes('hybrid')) return 'Hybrid';
  return 'Onsite';
}

function getCompanyType(job: Job) {
  if (job.employerName.includes('Kiprop')) return 'Contractor';
  if (job.employerName.includes('Maina')) return 'Estate';
  return 'Homeowner';
}

export default function EmployerDashboard({ jobs, setJobs, applications, setApplications, onNavigate, onSelectFundi, showToast }: EmployerDashboardProps) {
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
  const [companySize, setCompanySize] = useState('1-10');
  const [projectType, setProjectType] = useState('Residential');
  const [candidateSkill, setCandidateSkill] = useState('All Skills');
  const [candidateCounty, setCandidateCounty] = useState('All Counties');

  const myJobs = currentUser?.role === 'employer' ? jobs.filter(job => job.employerId === currentUser._id) : [];
  const myApplications = applications.filter(app => myJobs.some(job => job._id === app.jobId));
  const pendingApps = myApplications.filter(app => app.status === 'pending').length;
  const interviewApps = myApplications.filter(app => app.status === 'interviewed' || app.status === 'offered' || app.status === 'hired').length;
  const hiredApps = myApplications.filter(app => app.status === 'hired').length;
  const totalBudget = myJobs.reduce((sum, job) => sum + job.budget, 0);

  const candidateRecommendations = useMemo(() => {
    const openSkills = new Set(myJobs.flatMap(job => job.skills));
    return profiles
      .map(profile => {
        const user = users.find(u => u._id === profile.userId);
        const skillMatches = profile.skills.filter(skill => openSkills.has(skill));
        const locationMatches = myJobs.filter(job => job.county === profile.county).length;
        const score = Math.min(98, Math.round(skillMatches.length * 22 + locationMatches * 12 + profile.rating * 8 + Math.min(profile.completedJobs, 30)));
        return { profile, user, skillMatches, score };
      })
      .filter(item => item.user?.role === 'fundi')
      .filter(item => candidateSkill === 'All Skills' || item.profile.skills.includes(candidateSkill))
      .filter(item => candidateCounty === 'All Counties' || item.profile.county === candidateCounty)
      .sort((a, b) => b.score - a.score);
  }, [profiles, users, myJobs, candidateSkill, candidateCounty]);

  if (!currentUser || currentUser.role !== 'employer') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-[#005fec]" />
          <h2 className="text-lg font-bold text-slate-800">Employer Access Required</h2>
          <p className="text-xs text-slate-600">Switch to an employer persona from the left navigation.</p>
        </div>
      </div>
    );
  }

  const handleCreateJob = (e: FormEvent) => {
    e.preventDefault();
    const skills = [primarySkill, secondarySkill].filter((skill, index, arr) => skill && arr.indexOf(skill) === index);
    const metadata = [
      `Project type: ${projectType}`,
      `Work arrangement: ${workMode}`,
      `Company size: ${companySize}`,
    ].join('\n');
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
      status: 'active',
      deadline,
      applicationsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setJobs(prev => [newJob, ...prev]);
    setTitle('');
    setDesc('');
    showToast('Job posted. Candidate recommendations updated.');
  };

  const updateApplicationStatus = (appId: string, status: Application['status']) => {
    setApplications(prev => prev.map(app => app._id === appId ? { ...app, status, updatedAt: Date.now() } : app));
    showToast(`Application marked as ${status}.`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#005fec]">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Employer hiring cockpit
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Manage jobs, candidates, interviews, and hiring outcomes.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Built for homeowners, contractors, and property managers who need a clean workflow from posting to shortlist to final offer.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active jobs', value: myJobs.length, icon: ClipboardList },
              { label: 'Applications', value: myApplications.length, icon: UsersRound },
              { label: 'Interviews', value: interviewApps, icon: Video },
              { label: 'Budget live', value: formatKSh(totalBudget), icon: Banknote },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                  <Icon className="h-4 w-4 text-[#005fec]" />
                  <p className="mt-2 text-xl font-black text-slate-950">{item.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <PlusCircle className="h-4 w-4 text-[#005fec]" />
              Post a complete job
            </h2>
            <form onSubmit={handleCreateJob} className="mt-4 space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Job title
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]" placeholder="e.g. Roof truss installation" />
              </label>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Category
                <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value as JobCategory)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case text-slate-800">
                  {JOB_CATEGORIES.filter(category => category !== 'All Categories').map(category => <option key={category}>{category}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  County
                  <select value={county} onChange={(e) => setCounty(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case text-slate-800">
                    {COUNTIES.filter(c => c !== 'All Counties').map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Budget
                  <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case text-slate-800" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={primarySkill} onChange={(e) => setPrimarySkill(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {SKILL_OPTIONS.filter(skill => skill !== 'All Skills').map(skill => <option key={skill}>{skill}</option>)}
                </select>
                <select value={secondarySkill} onChange={(e) => setSecondarySkill(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {SKILL_OPTIONS.filter(skill => skill !== 'All Skills').map(skill => <option key={skill}>{skill}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {['Residential', 'Commercial', 'Estate maintenance', 'Emergency repair'].map(type => <option key={type}>{type}</option>)}
                </select>
                <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {['Onsite', 'Hybrid', 'Remote'].map(mode => <option key={mode}>{mode}</option>)}
                </select>
                <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {['1-10', '11-50', '51-200', '200+'].map(size => <option key={size}>{size}</option>)}
                </select>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" />
              </div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Scope and deliverables
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case leading-5 tracking-normal text-slate-800 outline-none focus:border-[#005fec]" />
              </label>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#005fec] py-2.5 text-xs font-black text-white hover:bg-blue-700">
                <Send className="h-3.5 w-3.5" />
                Publish job
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Filter className="h-4 w-4 text-[#005fec]" />
              Candidate filters
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <select value={candidateSkill} onChange={(e) => setCandidateSkill(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                {SKILL_OPTIONS.map(skill => <option key={skill}>{skill}</option>)}
              </select>
              <select value={candidateCounty} onChange={(e) => setCandidateCounty(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                {COUNTIES.map(item => <option key={item}>{item}</option>)}
              </select>
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <UserCheck className="h-4 w-4 text-[#005fec]" />
                  Candidate recommendations
                </h2>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#005fec]">{candidateRecommendations.length} profiles</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {candidateRecommendations.slice(0, 4).map(({ profile, user, skillMatches, score }) => (
                  <div key={profile._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <img src={profile.avatarUrl} alt={user?.name || 'Fundi'} className="h-14 w-14 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-black text-slate-950">{user?.name}</h3>
                        <p className="truncate text-xs font-bold text-[#005fec]">{profile.skills.join(', ')}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{profile.county} / {formatKSh(profile.hourlyRate)}/hr / {profile.completedJobs} jobs</p>
                      </div>
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">{score}%</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(skillMatches.length ? skillMatches : profile.skills.slice(0, 2)).map(skill => (
                        <span key={skill} className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">{skill}</span>
                      ))}
                    </div>
                    <button onClick={() => { onSelectFundi(profile.userId); onNavigate('fundi-profile'); }} className="mt-3 w-full rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
                      View profile
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BarChart3 className="h-4 w-4 text-[#005fec]" />
                Hiring insights
              </h2>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Pending review', value: pendingApps, icon: Eye },
                  { label: 'Time to hire', value: myApplications.length ? '3.6 days' : 'No hires yet', icon: Clock3 },
                  { label: 'Funnel quality', value: `${Math.min(98, 62 + hiredApps * 12 + myApplications.length * 4)}%`, icon: Gauge },
                  { label: 'Posting ROI', value: totalBudget ? '2.8x est.' : 'Pending', icon: Banknote },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                      <Icon className="h-4 w-4 text-[#005fec]" />
                      <p className="mt-2 text-lg font-black text-slate-950">{item.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <ClipboardList className="h-4 w-4 text-[#005fec]" />
              Jobs and application workflow
            </h2>
            <div className="mt-4 space-y-4">
              {myJobs.length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">No jobs yet. Publish one from the left panel.</div>
              ) : myJobs.map(job => {
                const jobApps = applications.filter(app => app.jobId === job._id);
                return (
                  <div key={job._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{job.title}</h3>
                        <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.county}</span>
                          <span>{getJobCategory(job)}</span>
                          <span>{formatKSh(job.budget)}</span>
                          <span>{getWorkMode(job)}</span>
                          <span>{getCompanyType(job)}</span>
                        </p>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">{jobApps.length} applications</span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {jobApps.length === 0 ? (
                        <p className="rounded-lg bg-white p-3 text-xs text-slate-500 ring-1 ring-slate-200">No candidates have applied yet. Recommendations above can help you invite suitable fundis.</p>
                      ) : jobApps.map(app => (
                        <div key={app._id} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-slate-950">{app.fundiName}</p>
                              <p className="text-[11px] text-slate-500">{app.fundiSkill} / rating {app.fundiRating}</p>
                              <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600">{app.coverLetter || 'No application note provided.'}</p>
                            </div>
                            <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${
                              app.status === 'hired' || app.status === 'offered' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              app.status === 'interviewed' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>{app.status}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={() => updateApplicationStatus(app._id, 'reviewed')} className="rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-700">Review</button>
                            <button onClick={() => updateApplicationStatus(app._id, 'interviewed')} className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-800">
                              <Video className="h-3.5 w-3.5" />
                              Interview
                            </button>
                            <button onClick={() => showToast('Zoom and Google Meet scheduling integration is ready for connection.')} className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Schedule
                            </button>
                            <button onClick={() => onNavigate('messages')} className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Message
                            </button>
                            <button onClick={() => updateApplicationStatus(app._id, 'offered')} className="flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Offer
                            </button>
                            <button onClick={() => updateApplicationStatus(app._id, 'rejected')} className="flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-800">
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                            <button onClick={() => updateApplicationStatus(app._id, 'hired')} className="rounded-md bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white">
                              Hire with M-Pesa
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
