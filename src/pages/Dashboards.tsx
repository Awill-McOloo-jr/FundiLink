import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, SKILL_OPTIONS, formatKSh, generateId, type Job, type Application, type Payment } from '../db/schema';
import { User, Layers, Eye, PlusCircle, MapPin, Shield, AlertTriangle } from 'lucide-react';

// ============================================================================
// FUNDI DASHBOARD
// ============================================================================
interface FundiDashboardProps {
  jobs: Job[];
  applications: Application[];
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
  updateProfile: (userId: string, updates: any) => void;
}

export function FundiDashboard({ jobs, applications, onNavigate, showToast, updateProfile }: FundiDashboardProps) {
  const { currentUser, profiles } = useAuth();

  if (!currentUser || currentUser.role !== 'fundi') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-white border rounded-2xl p-8 space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="font-bold text-slate-800 text-lg">Fundi Access Required</h2>
          <p className="text-xs text-slate-600">Switch to a Fundi persona from the top bar.</p>
        </div>
      </div>
    );
  }

  const myProfile = profiles.find(p => p.userId === currentUser._id);
  const myApps = applications.filter(a => a.fundiId === currentUser._id);

  const [editBio, setEditBio] = useState(myProfile?.bio || '');
  const [editRate, setEditRate] = useState(myProfile?.hourlyRate || 350);
  const [editCounty, setEditCounty] = useState(myProfile?.county || 'Nairobi');
  const [editSkills, setEditSkills] = useState(myProfile?.skills.join(', ') || '');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(currentUser._id, {
      bio: editBio,
      hourlyRate: editRate,
      county: editCounty,
      skills: editSkills.split(',').map(s => s.trim()).filter(Boolean),
    });
    showToast('💾 Profile updated across all Convex live queries!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Artisan Workspace</span>
          <h1 className="text-2xl font-display font-black text-slate-900 mt-1">Karibu Tena, {currentUser.name}!</h1>
          <p className="text-xs text-slate-500">Track bids, edit your public listing, and respond to live instructions.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-slate-50 px-3 py-2 rounded-xl border text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Rating</p>
            <p className="text-base font-black text-amber-600">⭐ {myProfile?.rating || 5.0}</p>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-xl border text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Pending</p>
            <p className="text-base font-black text-blue-600">{myApps.filter(a => a.status === 'pending').length}</p>
          </div>
          <div className="bg-slate-50 px-3 py-2 rounded-xl border text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Rate</p>
            <p className="text-base font-black text-slate-800">{formatKSh(myProfile?.hourlyRate || 350)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Editor */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <User className="h-4 w-4 text-[#005fec]" /> Manage Public Profile
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700">Bio</label>
              <textarea rows={3} value={editBio} onChange={(e) => setEditBio(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700">Rate (KSh/hr)</label>
                <input type="number" value={editRate} onChange={(e) => setEditRate(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700">County</label>
                <select value={editCounty} onChange={(e) => setEditCounty(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none">
                  {COUNTIES.filter(c => c !== 'All Counties').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700">Skills (comma-separated)</label>
              <input type="text" value={editSkills} onChange={(e) => setEditSkills(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-[#005fec] text-white font-bold text-xs py-2 rounded-xl hover:bg-blue-700 transition">
              Save Changes
            </button>
          </form>
          <button onClick={() => onNavigate('fundi-profile')}
            className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs py-1.5 rounded-lg font-medium flex items-center justify-center gap-1">
            <Eye className="h-3.5 w-3.5" /> View Public Profile
          </button>
        </div>

        {/* Applications Tracker */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-3">
            <Layers className="h-4 w-4 text-[#005fec]" /> My Applications ({myApps.length})
          </h2>
          {myApps.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No applications yet. <button onClick={() => onNavigate('jobs')} className="text-[#005fec] underline font-bold">Browse Jobs</button>
            </div>
          ) : (
            <div className="space-y-3">
              {myApps.map(app => {
                const job = jobs.find(j => j._id === app.jobId);
                return (
                  <div key={app._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <h3 className="font-bold text-slate-900 text-sm">{job?.title || 'Unknown Job'}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        app.status === 'hired' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        {app.status === 'hired' ? 'Hired' : app.status}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px] bg-white p-2 rounded border border-slate-100">
                      <strong>Your Pitch:</strong> "{app.coverLetter.slice(0, 120)}..."
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{job?.county} • {formatKSh(job?.budget || 0)}</span>
                      {app.status === 'hired' && (
                        <button onClick={() => onNavigate('messages')} className="bg-[#005fec] text-white px-2 py-0.5 rounded font-bold">💬 Open Chat</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMPLOYER DASHBOARD
// ============================================================================
interface EmployerDashboardProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
}

export function EmployerDashboard({ jobs, setJobs, applications, setApplications, onNavigate: _onNavEmp, showToast }: EmployerDashboardProps) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [county, setCounty] = useState('Nairobi');
  const [budget, setBudget] = useState('15000');
  const [skill, setSkill] = useState('Masonry');
  const [deadline, setDeadline] = useState('2026-05-01');

  if (!currentUser || currentUser.role !== 'employer') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-white border rounded-2xl p-8 space-y-3">
          <AlertTriangle className="h-10 w-10 text-[#005fec] mx-auto" />
          <h2 className="font-bold text-slate-800 text-lg">Employer Access Required</h2>
          <p className="text-xs text-slate-600">Switch to an Employer persona from the top bar.</p>
        </div>
      </div>
    );
  }

  const myJobs = jobs.filter(j => j.employerId === currentUser._id);

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: Job = {
      _id: generateId('job'),
      employerId: currentUser._id,
      employerName: currentUser.name,
      title: title || 'Untitled Construction Request',
      description: desc || 'No description provided.',
      skills: [skill],
      county,
      budget: Number(budget) || 5000,
      status: 'active',
      deadline,
      applicationsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setJobs(prev => [newJob, ...prev]);
    showToast(`🏗️ Job posted! M-Pesa STK push reserved for KSh ${Number(budget).toLocaleString()}`);
    setTitle(''); setDesc('');
  };

  const handleHire = (appId: string) => {
    const app = applications.find(a => a._id === appId);
    setApplications(prev => prev.map(a => a._id === appId ? { ...a, status: 'hired' as const } : a));
    if (app) {
      const job = jobs.find(j => j._id === app.jobId);
      showToast(`M-Pesa payment reserved: KSh ${job?.budget.toLocaleString()} for ${app.fundiName}`);
    }
  };

  const handleReject = (appId: string) => {
    setApplications(prev => prev.map(a => a._id === appId ? { ...a, status: 'rejected' as const } : a));
    showToast('Application rejected.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-[#005fec] text-white rounded-2xl p-6 mb-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="bg-white/20 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">Property Management</span>
          <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight mt-1">Employer Suite: {currentUser.name}</h1>
          <p className="text-xs text-blue-100">Post jobs, review artisans, manage M-Pesa payments.</p>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-xl text-center backdrop-blur-xs">
          <p className="text-[10px] text-blue-100 font-bold uppercase">Active</p>
          <p className="text-xl font-bold text-amber-300">{myJobs.length} Jobs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Post Job Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <PlusCircle className="h-4 w-4 text-[#005fec]" /> Post New Job
          </h2>
          <form onSubmit={handleCreateJob} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700">Job Title</label>
              <input type="text" required placeholder="e.g. Mason for Gate" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700">County</label>
              <select value={county} onChange={(e) => setCounty(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none">
                {COUNTIES.filter(c => c !== 'All Counties').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700">Budget (KSh)</label>
              <input type="number" required value={budget} onChange={(e) => setBudget(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none font-mono font-bold" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700">Trade Tag</label>
              <select value={skill} onChange={(e) => setSkill(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none">
                {SKILL_OPTIONS.filter(s => s !== 'All Skills').map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700">Description</label>
              <textarea rows={3} required value={desc} onChange={(e) => setDesc(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border rounded-lg focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-[#005fec] hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl transition">
              Broadcast Job
            </button>
          </form>
        </div>

        {/* Active Jobs & Applications */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider">My Active Jobs & Bids</h2>
          {myJobs.length === 0 ? (
            <p className="p-6 bg-white border rounded-xl text-xs text-slate-400 italic text-center">No active jobs. Post one using the form.</p>
          ) : (
            myJobs.map(job => {
              const jobApps = applications.filter(a => a.jobId === job._id);
              return (
                <div key={job._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{job.title}</h3>
                      <p className="text-[11px] text-slate-500">
                        <MapPin className="h-3 w-3 inline" /> {job.county} • <strong className="text-[#005fec]">{formatKSh(job.budget)}</strong>
                      </p>
                    </div>
                    <span className="bg-blue-50 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded">{jobApps.length} bids</span>
                  </div>
                  {jobApps.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-2 bg-slate-50 rounded">Waiting for artisans to apply...</p>
                  ) : (
                    <div className="space-y-2">
                      {jobApps.map(app => (
                        <div key={app._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-900">{app.fundiName}</strong>
                              <span className="text-amber-600 font-mono text-[11px]">⭐ {app.fundiRating}</span>
                              <span className="text-slate-400 text-[11px]">({app.fundiSkill})</span>
                            </div>
                            <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-100">"{app.coverLetter.slice(0, 100)}..."</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1">
                            {app.status === 'pending' ? (
                              <>
                                <button onClick={() => handleHire(app._id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px] uppercase">✓ Hire</button>
                                <button onClick={() => handleReject(app._id)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[10px] uppercase">✕ Reject</button>
                              </>
                            ) : (
                              <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${app.status === 'hired' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                                {app.status === 'hired' ? '🔒 HIRED' : app.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
interface AdminDashboardProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  applications: Application[];
  payments: Payment[];
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
  suspendUser: (userId: string) => void;
}

export function AdminDashboard({ jobs, setJobs, applications, payments, onNavigate: _onNavAdmin, showToast, suspendUser }: AdminDashboardProps) {
  const { currentUser, users } = useAuth();

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="bg-white border rounded-2xl p-8 space-y-3">
          <Shield className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="font-bold text-slate-800 text-base">Admin Clearance Required</h2>
          <p className="text-xs text-slate-600">Switch to Admin persona from the top bar.</p>
        </div>
      </div>
    );
  }

  const totalBudget = jobs.reduce((a, j) => a + j.budget, 0);
  const hiredCount = applications.filter(a => a.status === 'hired').length;
  const totalVolume = hiredCount * 18500 + totalBudget * 0.02;
  // Platform fees tracked via payments table

  const handleToggleFlag = (jobId: string) => {
    setJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: j.status === 'flagged' ? 'active' : 'flagged' } : j));
    showToast('Job moderation status toggled.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight">Admin Control Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Live Convex serverless telemetry & moderation tools.</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs">
          <p className="text-slate-400">Auth Token</p>
          <p className="font-mono text-amber-300 font-bold">{currentUser.email}</p>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Users', value: users.length, color: 'text-slate-900' },
          { label: 'Jobs', value: jobs.length, color: 'text-blue-600' },
          { label: 'Applications', value: applications.length, color: 'text-emerald-600' },
          { label: 'Hired', value: hiredCount, color: 'text-purple-600' },
          { label: 'M-Pesa Volume', value: formatKSh(Math.round(totalVolume)), color: 'text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="font-bold text-slate-800 text-sm">User Management</span>
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {users.map(u => (
              <div key={u._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{u.name}</p>
                  <p className="text-slate-500 font-mono text-[10px]">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold block mb-1 ${u.isSuspended ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'}`}>
                    {u.role} {u.isSuspended && '(suspended)'}
                  </span>
                  <button onClick={() => { suspendUser(u._id); showToast(`User ${u.isSuspended ? 'reactivated' : 'suspended'}.`); }}
                    className="text-[10px] text-red-600 hover:underline bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {u.isSuspended ? 'Reactivate' : 'Suspend'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jobs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="font-bold text-slate-800 text-sm">Job Moderation</span>
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {jobs.map(j => (
              <div key={j._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 truncate max-w-[240px]">{j.title}</p>
                    <p className="text-slate-500 text-[11px]">{j.county} • {j.employerName}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${j.status === 'flagged' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {j.status}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="font-mono text-blue-600 font-bold">{formatKSh(j.budget)}</span>
                  <button onClick={() => handleToggleFlag(j._id)}
                    className={`px-2 py-0.5 rounded font-bold text-[10px] text-white ${j.status === 'flagged' ? 'bg-emerald-600' : 'bg-red-500'}`}>
                    {j.status === 'flagged' ? '✓ Approve' : '⚠ Flag'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <span className="font-bold text-slate-800 text-sm">Payment Ledger (M-Pesa)</span>
        <div className="mt-3 space-y-2">
          {payments.map(p => (
            <div key={p._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-slate-900">{formatKSh(p.amount)}</span>
                <span className="text-slate-400 ml-2">Fee: {formatKSh(p.platformFee)}</span>
                {p.mpesaReceiptNumber && <span className="font-mono text-[10px] text-slate-500 ml-2">#{p.mpesaReceiptNumber}</span>}
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                p.status === 'escrowed' ? 'bg-blue-100 text-blue-800' :
                p.status === 'released' ? 'bg-emerald-100 text-emerald-800' :
                p.status === 'refunded' ? 'bg-red-100 text-red-800' :
                'bg-amber-100 text-amber-800'}`}>
                {p.status === 'escrowed' ? 'reserved' : p.status}
              </span>
            </div>
          ))}
          {payments.length === 0 && <p className="text-xs text-slate-400 italic text-center p-4">No payment records yet.</p>}
        </div>
      </div>

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-slate-700">
        <p className="font-bold text-amber-900 mb-0.5">💰 Safaricom B2C M-Pesa Integration</p>
        <p>Platform charges 2.0% fee on successful inspections. Disputes are resolved per NCA Kenya guidelines.</p>
      </div>
    </div>
  );
}
