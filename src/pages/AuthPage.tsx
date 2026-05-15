import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../db/schema';
import { Smartphone, Hammer, Briefcase, Shield, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
}

export default function AuthPage({ onNavigate, showToast }: AuthPageProps) {
  const { login, signup, verifyOTP, authStep, currentUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('fundi');
  const [otpInput, setOtpInput] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (mode === 'login') {
      const result = login(email, password);
      setMessage(result.message);
      showToast(result.message);
    } else {
      if (!email || !password || !name) {
        showToast('Please fill in all required fields.');
        return;
      }
      const result = signup({ email, password, name, phone, role });
      setMessage(result.message);
      showToast(result.message);
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const result = verifyOTP(otpInput);
    if (result.success) {
      showToast('🎉 Welcome to Fundilink!');
      // Navigate based on role after short delay
      setTimeout(() => {
        if (currentUser?.role === 'fundi') onNavigate('dashboard-fundi');
        else if (currentUser?.role === 'employer') onNavigate('dashboard-employer');
        else if (currentUser?.role === 'admin') onNavigate('admin');
        else onNavigate('home');
      }, 300);
    } else {
      showToast(result.message);
    }
  };

  // OTP verification step
  if (authStep === 'otp_sent') {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-6 animate-slide-up">
          <div className="text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-[#005fec] mb-3">
              <Smartphone className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-display font-black text-slate-900">Verify Your Identity</h1>
            <p className="text-xs text-slate-500 mt-1">We sent a 6-digit code via SMS to your phone.</p>
          </div>

          {message && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs text-center font-medium">{message}</div>
          )}

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-2">Enter 6-Digit OTP Code</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-full text-center tracking-[0.5em] text-xl font-bold p-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Dev mode: The OTP code is shown in the blue toast notification.
              </p>
            </div>

            <button type="submit" className="w-full bg-[#005fec] hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
              Verify & Continue <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400">
            Didn't receive it? <button onClick={() => { setMessage('New OTP sent!'); showToast('New OTP dispatched.'); }} className="text-[#005fec] underline font-medium">Resend Code</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-6 animate-slide-up">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-[#005fec] mb-3">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight">
            {mode === 'login' ? 'Welcome Back' : 'Join Fundilink'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'login' ? 'Sign in with email & password.' : 'Create your account to start hiring or earning.'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button onClick={() => { setMode('signup'); setMessage(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${mode === 'signup' ? 'bg-white text-[#005fec] shadow-sm' : 'text-slate-500'}`}>
            Create Account
          </button>
          <button onClick={() => { setMode('login'); setMessage(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${mode === 'login' ? 'bg-white text-[#005fec] shadow-sm' : 'text-slate-500'}`}>
            Sign In
          </button>
        </div>

        {message && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs text-center font-medium">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Your Role</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'fundi' as UserRole, label: 'Fundi', icon: Hammer, desc: 'Skilled Worker' },
                  { value: 'employer' as UserRole, label: 'Employer', icon: Briefcase, desc: 'Homeowner' },
                  { value: 'admin' as UserRole, label: 'Admin', icon: Shield, desc: 'Moderator' },
                ].map(r => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${role === r.value ? 'border-[#005fec] bg-blue-50/60 text-[#005fec] font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <r.icon className="h-4 w-4" />
                    <span className="text-[11px] font-bold">{r.label}</span>
                    <span className="text-[9px] text-slate-400">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-0.5">Full Name</label>
              <input type="text" placeholder="e.g. John Kamau" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-0.5">Email Address</label>
            <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-0.5">Password</label>
            <input type="password" required placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-0.5">Safaricom Number</label>
              <div className="relative">
                <input type="tel" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 pl-14 font-mono" />
                <span className="text-sm text-slate-400 absolute left-3 top-2.5 font-bold">+254</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">For M-Pesa escrow & OTP SMS.</span>
            </div>
          )}

          <button type="submit" className="w-full bg-[#005fec] hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition shadow-sm uppercase tracking-wide">
            {mode === 'login' ? 'Sign In Securely' : 'Create Account & Send OTP'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">⚡ Quick test: Use the identity switcher bar at the top to skip auth.</p>
          <p className="text-[10px] text-slate-400 mt-1">Test: <span className="font-mono">kamau.mason@gmail.com</span> / any password</p>
        </div>
      </div>
    </div>
  );
}
