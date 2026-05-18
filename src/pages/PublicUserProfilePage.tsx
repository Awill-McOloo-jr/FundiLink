import type { Dispatch, SetStateAction } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatKSh, getJobCategory, type Job, type Review } from '../db/schema';
import VerifiedEmployerBadge from '../components/VerifiedEmployerBadge';
import FundiProfilePage from './FundiProfilePage';
import { AlertTriangle, BriefcaseBusiness, Building2, CalendarClock, MessageSquare, ShieldCheck } from 'lucide-react';

interface PublicUserProfilePageProps {
  selectedUserId: string;
  profileViews: number;
  onProfileView: (fundiId: string) => void;
  jobs: Job[];
  reviews: Review[];
  setReviews: Dispatch<SetStateAction<Review[]>>;
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
}

export default function PublicUserProfilePage({
  selectedUserId,
  profileViews,
  onProfileView,
  jobs,
  reviews,
  setReviews,
  onNavigate,
  showToast,
}: PublicUserProfilePageProps) {
  const { users } = useAuth();
  const user = users.find(item => item._id === selectedUserId);

  if (user?.role === 'fundi') {
    return (
      <FundiProfilePage
        selectedFundiId={selectedUserId}
        profileViews={profileViews}
        onProfileView={onProfileView}
        jobs={jobs}
        reviews={reviews}
        setReviews={setReviews}
        onNavigate={onNavigate}
        showToast={showToast}
      />
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-3 text-lg font-black text-slate-900">Profile not found</h1>
          <p className="mt-2 text-sm text-slate-500">This viewer profile is no longer available.</p>
        </div>
      </div>
    );
  }

  const employerJobs = jobs.filter(job => job.employerId === user._id);
  const activeJobs = employerJobs.filter(job => job.status === 'active');

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-slate-950 p-6 text-white lg:p-8">
            <div className="flex items-start gap-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white/10" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black">
                  {user.name.slice(0, 2)}
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">{user.name}</h1>
                  <VerifiedEmployerBadge user={user} className="h-5 w-5" />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {user.verified ? 'Verified employer account on Fundilink.' : 'Employer account awaiting full verification.'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { label: 'Active jobs', value: activeJobs.length },
                { label: 'Total posts', value: employerJobs.length },
                { label: 'Verification', value: user.verified ? 'Verified' : user.verificationStatus || 'Pending' },
                { label: 'Evidence files', value: user.verificationDocuments?.length || 0 },
              ].map(metric => (
                <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-lg font-black capitalize">{metric.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 lg:p-7">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <ShieldCheck className="h-4 w-4 text-[#005fec]" />
              Employer trust profile
            </h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-900">Contact</p>
                <p className="mt-1 text-sm text-slate-600">{user.phone}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-black text-blue-950">Verification system</p>
                <p className="mt-1 text-xs leading-5 text-blue-900">
                  Fundilink verifies employers using identity, KRA PIN, business registration, contractor letters, estate manager letters, or property ownership evidence before showing the blue check.
                </p>
              </div>
              <button
                onClick={() => onNavigate('messages')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005fec] px-4 py-3 text-xs font-black text-white transition hover:bg-blue-700 active:scale-95"
              >
                <MessageSquare className="h-4 w-4" />
                Message employer
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
          <BriefcaseBusiness className="h-4 w-4 text-[#005fec]" />
          Posted jobs
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {employerJobs.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">This employer has not posted jobs yet.</p>
          ) : employerJobs.map(job => (
            <article key={job._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">{job.title}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{job.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1"><Building2 className="h-3.5 w-3.5" /> {getJobCategory(job)}</span>
                <span className="rounded-lg bg-white px-2 py-1">{formatKSh(job.budget)}</span>
                <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1"><CalendarClock className="h-3.5 w-3.5" /> {job.deadline}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
