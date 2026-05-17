import cors from 'cors';
import express from 'express';
import Database from 'better-sqlite3';
import {
  SEED_APPLICATIONS,
  SEED_JOBS,
  SEED_MESSAGES,
  SEED_PAYMENTS,
  SEED_PROFILES,
  SEED_REVIEWS,
  SEED_USERS,
  defaultAvatarForUser,
  generateId,
  generateOTP,
  getJobCategory,
  hashPassword,
  verifyPassword,
  type Application,
  type Job,
  type Message,
  type Payment,
  type Profile,
  type ProfileViewEvent,
  type Review,
  type User,
} from '../src/db/schema';

type BootstrapState = {
  users: User[];
  profiles: Profile[];
  jobs: Job[];
  applications: Application[];
  messages: Message[];
  reviews: Review[];
  payments: Payment[];
  profileViews: Record<string, number>;
  profileViewEvents: ProfileViewEvent[];
};

const db = new Database('server/fundilink.sqlite');
db.pragma('journal_mode = WAL');

const app = express();
const port = Number(process.env.PORT || 4000);
const pendingAuth = new Map<string, { type: 'login' | 'signup'; userId?: string; user?: User }>();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

function runSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

function readJson<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  db.prepare(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), Date.now());
}

function getState(): BootstrapState {
  return {
    users: readJson('users', SEED_USERS),
    profiles: readJson('profiles', SEED_PROFILES),
    jobs: readJson('jobs', SEED_JOBS),
    applications: readJson('applications', SEED_APPLICATIONS),
    messages: readJson('messages', SEED_MESSAGES),
    reviews: readJson('reviews', SEED_REVIEWS),
    payments: readJson('payments', SEED_PAYMENTS),
    profileViews: readJson('profileViews', {}),
    profileViewEvents: readJson('profileViewEvents', []),
  };
}

function seedIfEmpty() {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get('users');
  if (row) return;
  const seed = getState();
  Object.entries(seed).forEach(([key, value]) => writeJson(key, value));
}

function normalizeExistingState() {
  const state = getState();
  const users = state.users.map(user => ({
    ...user,
    avatarUrl: user.avatarUrl || SEED_USERS.find(seedUser => seedUser._id === user._id)?.avatarUrl || defaultAvatarForUser(user.role, user.name),
  }));
  const existingJobsById = new Map(state.jobs.map(job => [job._id, job]));
  const jobsWithSeedBackfill = [
    ...state.jobs,
    ...SEED_JOBS.filter(seedJob => !existingJobsById.has(seedJob._id)),
  ].map(job => ({
    ...job,
    category: SEED_JOBS.find(seedJob => seedJob._id === job._id)?.category || getJobCategory({ ...job, category: undefined }),
  }));

  const profiles = state.profiles.map(profile => {
    const seedProfile = SEED_PROFILES.find(item => item.userId === profile.userId);
    const hasUploadedAvatar = profile.avatarUrl.startsWith('data:');
    const avatarUrl = hasUploadedAvatar
      ? profile.avatarUrl
      : profile.avatarUrl.includes('source.unsplash.com/160x160')
        ? seedProfile?.avatarUrl || profile.avatarUrl
        : profile.avatarUrl;
    return {
      ...profile,
      avatarUrl,
      verificationStatus: profile.verificationStatus || (profile.verified ? 'verified' : 'unverified'),
      verificationDocuments: profile.verificationDocuments || [],
      cvInsights: profile.cvInsights || [],
    };
  });

  patchState({ users, jobs: jobsWithSeedBackfill, profiles });
}

function patchState(patch: Partial<BootstrapState>) {
  Object.entries(patch).forEach(([key, value]) => {
    if (value !== undefined) writeJson(key, value);
  });
}

runSchema();
seedIfEmpty();
normalizeExistingState();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: 'sqlite', file: 'server/fundilink.sqlite' });
});

app.get('/api/bootstrap', (_req, res) => {
  res.json(getState());
});

app.put('/api/state', (req, res) => {
  patchState(req.body as Partial<BootstrapState>);
  res.json({ ok: true, state: getState() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const state = getState();
  const user = state.users.find(item => item.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ success: false, message: 'No account found with this email.' });
  if (user.isSuspended) return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });
  const seededPassword = user.passwordHash === '$2b$10$simulated';
  if (!seededPassword && !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Incorrect password.' });
  }
  const otp = generateOTP();
  pendingAuth.set(otp, { type: 'login', userId: user._id });
  res.json({ success: true, message: `OTP sent! (Dev code: ${otp})`, otp });
});

app.post('/api/auth/signup', (req, res) => {
  const data = req.body as { email: string; password: string; name: string; phone: string; role: User['role'] };
  const state = getState();
  if (state.users.some(item => item.email.toLowerCase() === data.email.toLowerCase())) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }
  const user: User = {
    _id: generateId('u'),
    email: data.email,
    role: data.role,
    name: data.name,
    phone: data.phone.startsWith('+254') ? data.phone : `+254${data.phone.replace(/^0/, '')}`,
    avatarUrl: defaultAvatarForUser(data.role, data.name),
    passwordHash: hashPassword(data.password),
    isSuspended: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const otp = generateOTP();
  pendingAuth.set(otp, { type: 'signup', user });
  res.json({ success: true, message: `OTP sent to ${data.phone}! (Dev code: ${otp})`, otp });
});

app.post('/api/auth/verify', (req, res) => {
  const { code } = req.body as { code: string };
  const pending = pendingAuth.get(code);
  if (!pending) return res.status(400).json({ success: false, message: 'Invalid OTP code.' });

  const state = getState();
  let currentUser: User | undefined;
  let users = state.users;
  let profiles = state.profiles;

  if (pending.type === 'login') {
    currentUser = users.find(item => item._id === pending.userId);
  } else if (pending.user) {
    currentUser = pending.user;
    users = [...users, currentUser];
    if (currentUser.role === 'fundi') {
      profiles = [
        ...profiles,
        {
          _id: generateId('p'),
          userId: currentUser._id,
          bio: 'Newly registered Fundilink craftsman. Update your profile to attract clients.',
          skills: ['Masonry'],
          county: 'Nairobi',
          hourlyRate: 350,
          avatarUrl: currentUser.avatarUrl || defaultAvatarForUser(currentUser.role, currentUser.name),
          cvInsights: [],
          verificationDocuments: [],
          verificationStatus: 'unverified',
          portfolioImages: [],
          rating: 5.0,
          completedJobs: 0,
          verified: false,
          availability: 'available',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
    }
    patchState({ users, profiles });
  }

  pendingAuth.delete(code);
  if (!currentUser) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'Authentication successful!', currentUser, users, profiles });
});

app.listen(port, () => {
  console.log(`Fundilink API running at http://127.0.0.1:${port}`);
});
