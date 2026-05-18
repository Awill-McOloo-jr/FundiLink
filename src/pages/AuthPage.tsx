import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../db/schema';
import { ArrowRight, Briefcase, Hammer, Shield, Smartphone } from 'lucide-react';
import Logo from '../components/Logo';

interface AuthPageProps {
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
}

const authImages = [
  'https://images.pexels.com/photos/11174198/pexels-photo-11174198.jpeg?auto=compress&cs=tinysrgb&w=1800&h=2200&fit=crop',
  'https://images.pexels.com/photos/5325460/pexels-photo-5325460.jpeg?auto=compress&cs=tinysrgb&w=1800&h=2200&fit=crop',
  'https://images.pexels.com/photos/14704776/pexels-photo-14704776.jpeg?auto=compress&cs=tinysrgb&w=1800&h=2200&fit=crop',
  'https://images.pexels.com/photos/5802827/pexels-photo-5802827.jpeg?auto=compress&cs=tinysrgb&w=1800&h=2200&fit=crop',
];

export default function AuthPage({ onNavigate, showToast }: AuthPageProps) {
  const { login, signup, verifyOTP, authStep } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('fundi');
  const [otpInput, setOtpInput] = useState('');
  const [message, setMessage] = useState('');
  const [heroImage] = useState(() => authImages[Math.floor(Math.random() * authImages.length)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const result = mode === 'login'
      ? await login(email, password)
      : await signup({ email, password, name, phone, role });

    setMessage(result.message);
    showToast(result.message);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await verifyOTP(otpInput);
    if (result.success) {
      showToast('Welcome to Fundilink.');
      setTimeout(() => onNavigate('home'), 300);
    } else {
      showToast(result.message);
    }
  };

  const roleOptions = [
    { value: 'fundi' as UserRole, label: 'Fundi', icon: Hammer, desc: 'Find work' },
    { value: 'employer' as UserRole, label: 'Employer', icon: Briefcase, desc: 'Hire talent' },
    { value: 'admin' as UserRole, label: 'Admin', icon: Shield, desc: 'Moderate' },
  ];

  return (
    <div className="grid min-h-screen bg-white text-slate-950 lg:grid-cols-[minmax(320px,42vw)_1fr]">
      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:border-r lg:border-slate-200 lg:px-10">
        <div className="w-full max-w-md">
          <Logo compact size="lg" className="mx-auto" />
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            {authStep === 'otp_sent' ? (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-[#005fec]">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Enter OTP</h2>
                    <p className="text-xs text-slate-500">Use the dev code shown in the toast.</p>
                  </div>
                </div>

                {message && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-800">{message}</div>}

                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-2xl font-black tracking-[0.45em] outline-none focus:border-[#005fec]"
                />

                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005fec] py-3 text-sm font-black text-white transition hover:bg-blue-700">
                  Verify and continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black">{mode === 'login' ? 'Sign in' : 'Join Fundilink'}</h2>
                  <p className="mt-1 text-xs text-slate-500">{mode === 'login' ? 'Access your Fundilink account.' : 'Create your Fundilink account.'}</p>
                </div>

                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <button type="button" onClick={() => setMode('signup')} className={`rounded-lg py-2 text-xs font-black transition ${mode === 'signup' ? 'bg-white text-[#005fec] shadow-sm' : 'text-slate-500'}`}>
                    Create
                  </button>
                  <button type="button" onClick={() => setMode('login')} className={`rounded-lg py-2 text-xs font-black transition ${mode === 'login' ? 'bg-white text-[#005fec] shadow-sm' : 'text-slate-500'}`}>
                    Sign in
                  </button>
                </div>

                {mode === 'signup' && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {roleOptions.map(option => {
                        const Icon = option.icon;
                        return (
                          <button key={option.value} type="button" onClick={() => setRole(option.value)}
                            className={`rounded-xl border p-3 text-center transition ${role === option.value ? 'border-[#005fec] bg-blue-50 text-[#005fec]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                            <Icon className="mx-auto h-4 w-4" />
                            <span className="mt-1 block text-[11px] font-black">{option.label}</span>
                            <span className="block text-[9px] text-slate-400">{option.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-[#005fec]" />
                  </>
                )}

                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-[#005fec]" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-[#005fec]" />

                {mode === 'signup' && (
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-sm font-black text-slate-400">+254</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pl-14 text-sm outline-none focus:border-[#005fec]" />
                  </div>
                )}

                {message && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-800">{message}</div>}

                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005fec] py-3 text-sm font-black text-white transition hover:bg-blue-700">
                  {mode === 'login' ? 'Sign in securely' : 'Create account'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 lg:block">
        <img src={heroImage} alt="African civil engineering professionals and construction infrastructure" className="absolute inset-0 h-full w-full object-cover" />
      </section>
    </div>
  );
}
