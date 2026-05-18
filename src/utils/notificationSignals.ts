import type { Application, Job, Message, Profile, User } from '../db/schema';
import { isFundiBadgeActive } from './verification';

const day = 86400000;

export type ReadinessSignal = {
  id: string;
  label: string;
  done: boolean;
  action: string;
};

export type NotificationSignal = {
  id: string;
  kind: 'profile' | 'offer' | 'interview' | 'reviewed' | 'follow-up';
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  route: 'profile' | 'messages' | 'jobs';
  jobId?: string;
  updatedAt: number;
};

export function getReadinessSignals(profile?: Profile, user?: User): ReadinessSignal[] {
  return [
    { id: 'profile-photo', label: 'Profile photo', done: Boolean(profile?.avatarUrl), action: 'Add a clear profile photo so employers recognise you quickly.' },
    { id: 'cv-insights', label: 'CV insights', done: Boolean(profile?.cvInsights?.length), action: 'Upload a CV so Fundilink can extract skills and certificates.' },
    { id: 'portfolio-evidence', label: 'Portfolio evidence', done: Boolean(profile?.portfolioImages?.length), action: 'Add photos of finished jobs with short descriptions.' },
    { id: 'verification', label: 'Verification', done: isFundiBadgeActive(profile, user), action: 'Complete identity, trade, safety, portfolio, experience, and profile checks to activate the badge.' },
  ];
}

export function getReadinessScore(profile?: Profile, user?: User) {
  const signals = getReadinessSignals(profile, user);
  return Math.round((signals.filter(item => item.done).length / signals.length) * 100);
}

export function getUnreadMessageCount(currentUser: User | null | undefined, messages: Message[]) {
  if (!currentUser) return 0;
  return messages.filter(message => message.receiverId === currentUser._id && !message.read).length;
}

export function getNotificationSignals(options: {
  currentUser: User | null | undefined;
  profiles: Profile[];
  applications: Application[];
  jobs: Job[];
}) {
  const { currentUser, profiles, applications, jobs } = options;
  if (!currentUser || currentUser.role !== 'fundi') return [];

  const profile = profiles.find(item => item.userId === currentUser._id);
  const myApplications = applications
    .filter(app => app.fundiId === currentUser._id)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const jobById = new Map(jobs.map(job => [job._id, job]));
  const now = Date.now();

  const profileSignals: NotificationSignal[] = getReadinessSignals(profile, currentUser)
    .filter(item => !item.done)
    .map(item => ({
      id: `profile-${item.id}`,
      kind: 'profile',
      title: item.label,
      body: item.action,
      priority: 'medium',
      actionLabel: 'Complete profile',
      route: 'profile',
      updatedAt: profile?.updatedAt || now,
    }));

  const applicationSignals = myApplications.flatMap<NotificationSignal>(app => {
    const job = jobById.get(app.jobId);
    const title = job?.title || 'your application';
    const employer = job?.employerName || 'the employer';

    if (app.status === 'offered') {
      return [{
        id: `application-offer-${app._id}`,
        kind: 'offer',
        title: 'Reply to job offer',
        body: `${employer} sent an offer for ${title}. Confirm availability or ask for final details.`,
        priority: 'high',
        actionLabel: 'Message employer',
        route: 'messages',
        jobId: app.jobId,
        updatedAt: app.updatedAt,
      }];
    }

    if (app.status === 'interviewed') {
      return [{
        id: `application-interview-${app._id}`,
        kind: 'interview',
        title: 'Interview invitation',
        body: `${employer} invited you to interview for ${title}. Reply with a suitable time.`,
        priority: 'high',
        actionLabel: 'Reply now',
        route: 'messages',
        jobId: app.jobId,
        updatedAt: app.updatedAt,
      }];
    }

    if (app.status === 'reviewed') {
      return [{
        id: `application-reviewed-${app._id}`,
        kind: 'reviewed',
        title: 'Application reviewed',
        body: `${employer} reviewed your application for ${title}. Send one short note with your start date and proof.`,
        priority: 'medium',
        actionLabel: 'Send note',
        route: 'messages',
        jobId: app.jobId,
        updatedAt: app.updatedAt,
      }];
    }

    if (app.status === 'pending' && now - app.updatedAt >= day) {
      return [{
        id: `application-follow-up-${app._id}`,
        kind: 'follow-up',
        title: 'Follow up once',
        body: `${title} is still awaiting employer review. A brief availability note is enough.`,
        priority: 'low',
        actionLabel: 'Follow up',
        route: 'messages',
        jobId: app.jobId,
        updatedAt: app.updatedAt,
      }];
    }

    return [];
  });

  return [...applicationSignals, ...profileSignals].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority] || b.updatedAt - a.updatedAt;
  });
}
