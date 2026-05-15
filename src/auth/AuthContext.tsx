import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  SEED_USERS, SEED_PROFILES,
  generateId, hashPassword, verifyPassword, generateOTP,
  type User, type Profile, type UserRole
} from '../db/schema';

interface AuthState {
  currentUser: User | null;
  users: User[];
  profiles: Profile[];
  isAuthenticated: boolean;
  // Auth flow
  authStep: 'idle' | 'enter_details' | 'otp_sent' | 'authenticated';
  pendingUser: Partial<User> | null;
  otpCode: string;
  // Actions
  login: (email: string, password: string) => { success: boolean; message: string };
  signup: (data: { email: string; password: string; name: string; phone: string; role: UserRole }) => { success: boolean; message: string };
  verifyOTP: (code: string) => { success: boolean; message: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  updateProfile: (userId: string, updates: Partial<Profile>) => void;
  suspendUser: (userId: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [profiles, setProfiles] = useState<Profile[]>(SEED_PROFILES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStep, setAuthStep] = useState<AuthState['authStep']>('idle');
  const [pendingUser, setPendingUser] = useState<Partial<User> | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');

  const login = useCallback((email: string, password: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { success: false, message: 'No account found with this email.' };
    if (user.isSuspended) return { success: false, message: 'Account suspended. Contact admin.' };
    if (!verifyPassword(password, user.passwordHash)) return { success: false, message: 'Incorrect password.' };

    // Simulate OTP flow
    const otp = generateOTP();
    setOtpCode(otp);
    setPendingUser(user);
    setAuthStep('otp_sent');
    return { success: true, message: `OTP sent! (Dev code: ${otp})` };
  }, [users]);

  const signup = useCallback((data: { email: string; password: string; name: string; phone: string; role: UserRole }) => {
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, message: 'Email already registered.' };
    }
    const newUser: User = {
      _id: generateId('u'),
      email: data.email,
      role: data.role,
      name: data.name,
      phone: data.phone.startsWith('+254') ? data.phone : `+254${data.phone.replace(/^0/, '')}`,
      passwordHash: hashPassword(data.password),
      isSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const otp = generateOTP();
    setOtpCode(otp);
    setPendingUser(newUser);
    setAuthStep('otp_sent');
    return { success: true, message: `OTP sent to ${data.phone}! (Dev code: ${otp})` };
  }, [users]);

  const verifyOTP = useCallback((code: string) => {
    if (code !== otpCode) return { success: false, message: 'Invalid OTP code.' };
    if (!pendingUser) return { success: false, message: 'No pending registration.' };

    // Check if this is a new user or existing
    const existing = users.find(u => u._id === pendingUser._id);
    if (!existing && pendingUser._id) {
      // New user — add to users
      const completeUser = pendingUser as User;
      setUsers(prev => [...prev, completeUser]);

      // Create default profile if fundi
      if (completeUser.role === 'fundi') {
        const newProfile: Profile = {
          _id: generateId('p'),
          userId: completeUser._id,
          bio: 'Newly registered Fundilink craftsman. Update your profile to attract clients.',
          skills: ['Masonry'],
          county: 'Nairobi',
          hourlyRate: 350,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          portfolioImages: [],
          rating: 5.0,
          completedJobs: 0,
          verified: false,
          availability: 'available',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setProfiles(prev => [...prev, newProfile]);
      }
      setCurrentUser(completeUser);
    } else if (existing) {
      setCurrentUser(existing);
    }

    setAuthStep('authenticated');
    setPendingUser(null);
    setOtpCode('');
    return { success: true, message: 'Authentication successful!' };
  }, [otpCode, pendingUser, users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setAuthStep('idle');
    setPendingUser(null);
  }, []);

  const switchUser = useCallback((userId: string) => {
    const user = users.find(u => u._id === userId);
    if (user) {
      setCurrentUser(user);
      setAuthStep('authenticated');
    }
  }, [users]);

  const updateProfile = useCallback((userId: string, updates: Partial<Profile>) => {
    setProfiles(prev => prev.map(p =>
      p.userId === userId ? { ...p, ...updates, updatedAt: Date.now() } : p
    ));
  }, []);

  const suspendUser = useCallback((userId: string) => {
    setUsers(prev => prev.map(u =>
      u._id === userId ? { ...u, isSuspended: !u.isSuspended } : u
    ));
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser, users, profiles,
      isAuthenticated: !!currentUser,
      authStep, pendingUser, otpCode,
      login, signup, verifyOTP, logout, switchUser, updateProfile, suspendUser,
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
