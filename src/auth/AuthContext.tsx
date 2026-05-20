import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { SEED_PROFILES, SEED_USERS, defaultAccountSettings, defaultAvatarForUser, defaultEmployerProfileForUser, type Profile, type User, type UserRole } from '../db/schema';

interface AuthResult {
  success: boolean;
  message: string;
}

interface AuthState {
  currentUser: User | null;
  users: User[];
  profiles: Profile[];
  isAuthenticated: boolean;
  isLoading: boolean;
  authStep: 'idle' | 'enter_details' | 'otp_sent' | 'authenticated';
  pendingUser: Partial<User> | null;
  otpCode: string;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (data: { email: string; password: string; name: string; phone: string; role: UserRole }) => Promise<AuthResult>;
  verifyOTP: (code: string) => Promise<AuthResult>;
  logout: () => void;
  switchUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  updateProfile: (userId: string, updates: Partial<Profile>) => void;
  suspendUser: (userId: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);
const CURRENT_USER_KEY = 'fundilink.current-user-id';

const defaultAfricanAvatars: Record<string, string> = Object.fromEntries(
  SEED_PROFILES.map(profile => [profile.userId, profile.avatarUrl])
);
const defaultUserAvatars: Record<string, string> = Object.fromEntries(
  SEED_USERS.map(user => [user._id, user.avatarUrl || defaultAvatarForUser(user.role, user.name)])
);

const oldDefaultAvatarMarkers = [
  'photo-1540569014015-19a7be504e3a',
  'photo-1566492031773-4f4e44671857',
  'photo-1573496359142-b8d87734a5a2',
  'photo-1580489944761-15a19d654956',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1534528741775-53994a69daeb',
  'source.unsplash.com/160x160',
];

function migrateProfiles(profiles: Profile[]) {
  return profiles.map(profile => {
    const isUploadedImage = profile.avatarUrl.startsWith('data:');
    const isOldDefault = oldDefaultAvatarMarkers.some(marker => profile.avatarUrl.includes(marker));
    const normalizedProfile = {
      ...profile,
      cvFileUrl: profile.cvFileUrl || '',
      cvMimeType: profile.cvMimeType || '',
      cvInsights: profile.cvInsights || [],
      verificationDocuments: profile.verificationDocuments || [],
      verificationStatus: profile.verificationStatus || (profile.verified ? 'verified' : 'unverified'),
    };
    if (isUploadedImage || !isOldDefault) return normalizedProfile;
    return {
      ...normalizedProfile,
      avatarUrl: defaultAfricanAvatars[profile.userId] || profile.avatarUrl,
    };
  });
}

function migrateUsers(users: User[]) {
  const seedUsersById = new Map(SEED_USERS.map(user => [user._id, user]));
  return users.map(user => ({
    ...user,
    avatarUrl: user.avatarUrl || defaultUserAvatars[user._id] || defaultAvatarForUser(user.role, user.name),
    employerProfile: user.role === 'employer' ? user.employerProfile || defaultEmployerProfileForUser(user) : user.employerProfile,
    accountSettings: user.accountSettings || defaultAccountSettings(),
    verified: user.verified ?? seedUsersById.get(user._id)?.verified ?? false,
    verificationStatus: user.verificationStatus || seedUsersById.get(user._id)?.verificationStatus || (user.verified ? 'verified' : 'unverified'),
    verificationDocuments: user.verificationDocuments || seedUsersById.get(user._id)?.verificationDocuments || [],
  }));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [profiles, setProfiles] = useState<Profile[]>(SEED_PROFILES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStep, setAuthStep] = useState<AuthState['authStep']>('idle');
  const [pendingUser, setPendingUser] = useState<Partial<User> | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [serverLoaded, setServerLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/bootstrap')
      .then(res => res.json())
      .then((state: { users: User[]; profiles: Profile[] }) => {
        if (!alive) return;
        const migratedUsers = migrateUsers(state.users);
        const migratedProfiles = migrateProfiles(state.profiles);
        const currentUserId = window.localStorage.getItem(CURRENT_USER_KEY);
        setUsers(migratedUsers);
        setProfiles(migratedProfiles);
        setCurrentUser(currentUserId ? migratedUsers.find(user => user._id === currentUserId) || null : null);
        setAuthStep(currentUserId ? 'authenticated' : 'idle');
        setServerLoaded(true);
      })
      .catch(() => setServerLoaded(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!serverLoaded) return;
    window.localStorage.setItem(CURRENT_USER_KEY, currentUser?._id || '');
    fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users, profiles }),
    }).catch(() => undefined);
  }, [currentUser?._id, profiles, serverLoaded, users]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await postJson<AuthResult & { otp?: string }>('/api/auth/login', { email, password });
    if (result.success) {
      setOtpCode(result.otp || '');
      setPendingUser({ email });
      setAuthStep('otp_sent');
    }
    return { success: result.success, message: result.message };
  }, []);

  const signup = useCallback(async (data: { email: string; password: string; name: string; phone: string; role: UserRole }) => {
    const result = await postJson<AuthResult & { otp?: string }>('/api/auth/signup', data);
    if (result.success) {
      setOtpCode(result.otp || '');
      setPendingUser({ email: data.email, role: data.role });
      setAuthStep('otp_sent');
    }
    return { success: result.success, message: result.message };
  }, []);

  const verifyOTP = useCallback(async (code: string) => {
    const result = await postJson<AuthResult & { currentUser?: User; users?: User[]; profiles?: Profile[] }>('/api/auth/verify', { code });
    if (result.success && result.currentUser && result.users && result.profiles) {
      const migratedUsers = migrateUsers(result.users);
      setUsers(migratedUsers);
      setProfiles(migrateProfiles(result.profiles));
      setCurrentUser(migratedUsers.find(user => user._id === result.currentUser?._id) || result.currentUser);
      setAuthStep('authenticated');
      setPendingUser(null);
      setOtpCode('');
    }
    return { success: result.success, message: result.message };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setAuthStep('idle');
    setPendingUser(null);
  }, []);

  const switchUser = useCallback((userId: string) => {
    const user = users.find(item => item._id === userId);
    if (!user) return;
    setCurrentUser(user);
    setAuthStep('authenticated');
  }, [users]);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    const updatedAt = Date.now();
    setUsers(prev => prev.map(user =>
      user._id === userId ? { ...user, ...updates, updatedAt } : user
    ));
    setCurrentUser(current => current?._id === userId ? { ...current, ...updates, updatedAt } : current);
  }, []);

  const updateProfile = useCallback((userId: string, updates: Partial<Profile>) => {
    setProfiles(prev => prev.map(profile =>
      profile.userId === userId ? { ...profile, ...updates, updatedAt: Date.now() } : profile
    ));
  }, []);

  const suspendUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(user =>
      user._id === userId ? { ...user, isSuspended: !user.isSuspended, updatedAt: Date.now() } : user
    ));
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      profiles,
      isAuthenticated: !!currentUser,
      isLoading: !serverLoaded,
      authStep,
      pendingUser,
      otpCode,
      login,
      signup,
      verifyOTP,
      logout,
      switchUser,
      updateUser,
      updateProfile,
      suspendUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
