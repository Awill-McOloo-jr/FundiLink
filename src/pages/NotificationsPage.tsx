import { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatKSh, timeAgo, type Application, type Job } from '../db/schema';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  FileCheck2,
  MessageSquare,
  Send,
  Shield,
  Star,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { getNotificationSignals, getReadinessScore, getReadinessSignals, type NotificationSignal } from '../utils/notificationSignals';

interface NotificationsPageProps {
  jobs: Job[];
  applications: Application[];
  onNavigate: (page: string) => void;
  onOpenJob: (jobId: string) => void;
}

function statusIcon(status: Application['status']): LucideIcon {
  if (status === 'pending') return Send;
  if (status === 'reviewed') return Eye;
  if (status === 'interviewed') return MessageSquare;
  if (status === 'offered' || status === 'hired') return CheckCircle2;
  if (status === 'rejected' || status === 'withdrawn') return XCircle;
  return Bell;
}

function statusMessage(app: Application, job?: Job) {
  const title = job?.title || 'your application';
  const employer = job?.employerName || 'the employer';
  if (app.status === 'pending') return `Application sent to ${employer}.`;
  if (app.status === 'reviewed') return `${employer} reviewed ${title}.`;
  if (app.status === 'interviewed') return `Interview invitation for ${title}.`;
  if (app.status === 'offered') return `Offer received for ${title}.`;
  if (app.status === 'hired') return `You were hired for ${title}.`;
  if (app.status === 'rejected') return `${employer} selected another fundi for ${title}.`;
  if (app.status === 'withdrawn') return `${title} was withdrawn.`;
  return `Application status updated to ${app.status}.`;
}

function actionIcon(kind: NotificationSignal['kind']): LucideIcon {
  if (kind === 'profile') return FileCheck2;
  if (kind === 'offer') return Star;
  if (kind === 'interview') return MessageSquare;
  if (kind === 'reviewed') return Eye;
  return Clock3;
}

function priorityClass(priority: NotificationSignal['priority']) {
  if (priority === 'high') return 'border-rose-200 bg-rose-50 text-rose-950';
  if (priority === 'medium') return 'border-blue-200 bg-blue-50 text-blue-950';
  return 'border-amber-200 bg-amber-50 text-amber-950';
}

export default function NotificationsPage({ jobs, applications, onNavigate, onOpenJob }: NotificationsPageProps) {
  const { currentUser, profiles } = useAuth();
  const myProfile = currentUser ? profiles.find(profile => profile.userId === currentUser._id) : undefined;

  const myApplications = useMemo(
    () => currentUser ? applications.filter(app => app.fundiId === currentUser._id).sort((a, b) => b.updatedAt - a.updatedAt) : [],
    [applications, currentUser]
  );
  const actionItems = useMemo(
    () => getNotificationSignals({ currentUser, profiles, applications, jobs }),
    [applications, currentUser, jobs, profiles]
  );
  const readinessItems = getReadinessSignals(myProfile, currentUser || undefined);
  const readinessScore = getReadinessScore(myProfile, currentUser || undefined);

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-3 text-lg font-black text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to see your application and profile notifications.</p>
        </div>
      </div>
    );
  }

  const handlePrimaryAction = (item: NotificationSignal) => {
    onNavigate(item.route);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px] lg:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Action centre</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Things that need your response</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Fundilink now keeps this page focused on unfinished actions: replies, follow ups, offers, interviews, and missing profile evidence.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Open actions</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-5xl font-black">{actionItems.length}</p>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-950">
                Live count
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              The bell badge clears when you open this page; this live queue stays until each action is handled.
            </p>
          </div>
        </div>
      </section>

      <main className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Needs action</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Only items you can act on are listed here.</p>
            </div>
            <button
              onClick={() => onNavigate('jobs')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              Browse jobs
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {actionItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <h3 className="mt-3 text-sm font-black text-slate-900">All caught up</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  No profile, interview, offer, or follow-up action is waiting right now.
                </p>
              </div>
            ) : actionItems.map(item => {
              const Icon = actionIcon(item.kind);
              return (
                <article key={item.id} className={`rounded-2xl border p-4 ${priorityClass(item.priority)}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black">{item.title}</h3>
                          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase">
                            {item.priority}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 opacity-80">{item.body}</p>
                        <p className="mt-1 text-[11px] font-bold opacity-60">{timeAgo(item.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handlePrimaryAction(item)}
                      className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95"
                    >
                      {item.actionLabel}
                    </button>
                    {item.jobId && (
                      <button
                        onClick={() => onOpenJob(item.jobId || '')}
                        className="rounded-xl bg-white/80 px-3 py-2 text-xs font-black text-slate-800 ring-1 ring-black/5 transition hover:bg-white active:scale-95"
                      >
                        View job
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <FileCheck2 className="h-4 w-4 text-[#005fec]" />
                Profile readiness
              </h2>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{readinessScore}%</span>
            </div>
            <div className="mt-4 space-y-2">
              {readinessItems.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-xs font-black text-slate-900">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.done ? 'Complete.' : item.action}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-[10px] font-black ${item.done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {item.done ? 'Done' : 'Needed'}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('profile')}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#005fec] px-3 py-2.5 text-xs font-black text-white transition hover:bg-blue-700 active:scale-95"
            >
              <Shield className="h-3.5 w-3.5" />
              Complete profile
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <ClipboardCheck className="h-4 w-4 text-[#005fec]" />
              Recent application activity
            </h2>
            <div className="mt-4 space-y-3">
              {myApplications.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                  Apply to jobs and the latest application movement will appear here.
                </p>
              ) : myApplications.slice(0, 5).map(app => {
                const job = jobs.find(item => item._id === app.jobId);
                const Icon = statusIcon(app.status);
                return (
                  <button
                    key={app._id}
                    onClick={() => job ? onOpenJob(job._id) : onNavigate('jobs')}
                    className="flex w-full gap-3 rounded-xl bg-slate-50 p-3 text-left transition hover:bg-blue-50 active:scale-[0.99]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#005fec] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-slate-900">{statusMessage(app, job)}</span>
                      <span className="mt-1 block truncate text-[11px] text-slate-500">
                        {job?.county || 'Unknown county'} / {formatKSh(job?.budget || 0)} / {timeAgo(app.updatedAt)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                      {app.status === 'hired' ? 'Hired' : app.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
