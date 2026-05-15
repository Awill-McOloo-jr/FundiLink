import { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, SKILL_OPTIONS, formatKSh, timeAgo, generateId, type Job, type Application } from '../db/schema';
import { Search, MapPin, Filter, Briefcase, ArrowRight, CheckCircle, PlusCircle } from 'lucide-react';

type View = 'list' | 'detail';

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
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
}

export default function JobsPage({
  jobs, setJobs, applications, setApplications,
  filterCounty, filterSkill, filterQuery,
  setFilterCounty, setFilterSkill, setFilterQuery,
  selectedJobId, setSelectedJobId, onNavigate, showToast
}: JobsPageProps) {
  const { currentUser, isAuthenticated, profiles } = useAuth();
  const [view, setView] = useState<View>('list');
  const [maxBudget, setMaxBudget] = useState(100000);
  const [coverLetter, setCoverLetter] = useState('');

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const q = filterQuery.toLowerCase();
      const matchQ = !q || j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || j.skills.some(s => s.toLowerCase().includes(q));
      const matchC = filterCounty === 'All Counties' || j.county === filterCounty;
      const matchS = filterSkill === 'All Skills' || j.skills.includes(filterSkill);
      const matchB = j.budget <= maxBudget;
      return matchQ && matchC && matchS && matchB && j.status !== 'flagged';
    });
  }, [jobs, filterQuery, filterCounty, filterSkill, maxBudget]);

  const selectedJob = jobs.find(j => j._id === selectedJobId);
  const jobApps = applications.filter(a => a.jobId === selectedJobId);
  const hasApplied = currentUser ? applications.some(a => a.jobId === selectedJobId && a.fundiId === currentUser._id) : false;

  const handleApply = () => {
    if (!isAuthenticated || !currentUser) {
      showToast('Please sign in to apply for jobs.');
      onNavigate('auth');
      return;
    }
    if (currentUser.role !== 'fundi') {
      showToast('Only fundi accounts can apply. Switch persona from the left navigation.');
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

    const profile = profiles.find(p => p.userId === currentUser._id);
    const newApp: Application = {
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

    setApplications(prev => [newApp, ...prev]);
    setJobs(prev => prev.map(j => j._id === selectedJobId ? { ...j, applicationsCount: j.applicationsCount + 1 } : j));
    showToast('Application submitted. Employer will be notified.');
    setCoverLetter('');
  };

  // ── DETAIL VIEW ───────────────────────────────────────────
  if (view === 'detail' && selectedJob) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
        <button onClick={() => setView('list')} className="text-xs text-[#005fec] font-bold mb-4 inline-flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          ← Back to listings
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Fixed Price Escrow</span>
              <h1 className="text-xl sm:text-2xl font-display font-black text-slate-900 mt-2 tracking-tight">{selectedJob.title}</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                <span>By: <strong>{selectedJob.employerName}</strong></span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedJob.county}</span>
                <span>Deadline: <strong>{selectedJob.deadline}</strong></span>
                <span>Posted {timeAgo(selectedJob.createdAt)}</span>
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-right w-full sm:w-auto shrink-0">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Budget</p>
              <p className="text-xl sm:text-2xl font-black text-[#005fec]">{formatKSh(selectedJob.budget)}</p>
              <p className="text-[10px] text-slate-400 italic">M-Pesa escrow</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">Scope of Work</h3>
            <div className="text-slate-700 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200/60 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</div>
          </div>

          <div>
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {selectedJob.skills.map(sk => (
                <span key={sk} className="bg-slate-100 text-slate-800 font-bold text-xs px-3 py-1 rounded-lg border border-slate-200">🔨 {sk}</span>
              ))}
            </div>
          </div>

          {/* Application Form */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-[#005fec]" /> Submit Application
            </h3>

            {!isAuthenticated ? (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
                ⚠️ You must <button onClick={() => onNavigate('auth')} className="underline font-bold">sign in</button> to apply.
              </div>
            ) : currentUser?.role !== 'fundi' ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                ⚠️ Switch to a Fundi persona from the top bar to apply.
              </div>
            ) : hasApplied ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span>Application already submitted. Track status in your <button onClick={() => onNavigate('dashboard-fundi')} className="underline font-bold">Fundi Dashboard</button>.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Habari, explain why you are the best fundi for this job..."
                  className="w-full text-sm p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 text-slate-800"
                />
                <button disabled={!coverLetter.trim()} onClick={handleApply} className="bg-[#005fec] hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1">
                  🚀 Submit Application <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Other applicants */}
          <div>
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">Other Bids ({jobApps.length})</h3>
            <div className="space-y-2">
              {jobApps.map(app => (
                <div key={app._id} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{app.fundiName}</span>
                    <span className="text-slate-400 ml-1">({app.fundiSkill})</span>
                    <span className="text-amber-500 ml-2">{'★'.repeat(Math.round(app.fundiRating))}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${app.status === 'hired' ? 'bg-emerald-100 text-emerald-800' : app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {app.status}
                  </span>
                </div>
              ))}
              {jobApps.length === 0 && <p className="text-xs text-slate-400 italic">No other bids yet.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Available Construction Tenders</h1>
        <p className="text-xs sm:text-sm text-slate-500">Browse open briefs matching your skillset. Apply instantly with your verified portfolio.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 self-start">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#005fec]" /> Filters
            </span>
            <button
              onClick={() => { setFilterQuery(''); setFilterCounty('All Counties'); setFilterSkill('All Skills'); setMaxBudget(100000); }}
              className="text-[11px] text-slate-400 hover:text-blue-600 underline"
            >
              Clear
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Keywords</label>
            <div className="relative">
              <input type="text" placeholder="tile, solar, pipe..." value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 pl-8 focus:outline-none focus:border-blue-500" />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">County</label>
            <select value={filterCounty} onChange={(e) => setFilterCounty(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none font-medium">
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Specialization</label>
            <select value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none font-medium">
              {SKILL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Max Budget</span>
              <span className="text-[#005fec]">{formatKSh(maxBudget)}</span>
            </div>
            <input type="range" min="5000" max="100000" step="2500" value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>KSh 5K</span><span>KSh 100K+</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-slate-600">
            <p className="font-bold text-blue-800 mb-0.5">💡 Reactive Updates</p>
            <p>New briefs push to your screen instantly via Convex live queries.</p>
          </div>
        </div>

        {/* Listings */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Found <strong>{filteredJobs.length}</strong> active briefs</span>
            <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">Newest first</span>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800">No Matching Jobs</h3>
              <p className="text-xs text-slate-500 mt-1">Try expanding your filters.</p>
              <button onClick={() => { setFilterCounty('All Counties'); setFilterSkill('All Skills'); setMaxBudget(100000); }}
                className="mt-4 bg-[#005fec] text-white font-bold text-xs px-4 py-2 rounded-xl">Reset Filters</button>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job._id} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 transition shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer"
                onClick={() => { setSelectedJobId(job._id); setView('detail'); setCoverLetter(''); }}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-2">📂 {job.skills[0]}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium"><MapPin className="h-3 w-3" /> {job.county}</span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1">{job.title}</h2>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Budget</p>
                    <p className="text-lg font-black text-[#005fec]">{formatKSh(job.budget)}</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">{job.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {job.skills.map(sk => <span key={sk} className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md">{sk}</span>)}
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-slate-500">
                    <span>Client: <strong className="text-slate-800">{job.employerName}</strong></span>
                    <span>Bids: <strong className="text-[#005fec]">{job.applicationsCount}</strong></span>
                    <span>{timeAgo(job.createdAt)}</span>
                  </div>
                  <span className="bg-[#005fec] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1">
                    Review & Apply <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
