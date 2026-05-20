import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  COMPANY_SIZES,
  EMPLOYER_INDUSTRIES,
  KENYA_COUNTIES,
  defaultEmployerProfileForUser,
  type Application,
  type EmployerProfileDetails,
  type Job,
} from '../db/schema';
import VerifiedEmployerBadge from '../components/VerifiedEmployerBadge';
import {
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  Save,
  ShieldCheck,
  UploadCloud,
  UsersRound,
} from 'lucide-react';

interface EmployerProfilePageProps {
  jobs: Job[];
  applications: Application[];
  showToast: (msg: string) => void;
}

const evidenceSlots = [
  { key: 'kra', label: 'KRA PIN' },
  { key: 'business', label: 'Business registration' },
  { key: 'id', label: 'Director or owner ID' },
];

function statusClasses(status?: string) {
  if (status === 'verified') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'pending') return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-red-50 text-red-700 ring-red-200';
}

function formatMemberDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-KE', { month: 'short', year: 'numeric' }).format(new Date(timestamp));
}

function averageResponseHours(applications: Application[]) {
  const responded = applications.filter(app => app.updatedAt > app.appliedAt);
  if (!responded.length) return '0 hrs';
  const hours = responded.reduce((sum, app) => sum + (app.updatedAt - app.appliedAt) / 3600000, 0) / responded.length;
  return `${hours.toFixed(1)} hrs`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

export default function EmployerProfilePage({ jobs, applications, showToast }: EmployerProfilePageProps) {
  const { currentUser, updateUser } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const evidenceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const initialProfile = currentUser?.employerProfile || (currentUser ? defaultEmployerProfileForUser(currentUser) : defaultEmployerProfileForUser({ name: 'Employer', role: 'employer' }));
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [profile, setProfile] = useState<EmployerProfileDetails>(initialProfile);
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>(currentUser?.verificationDocuments || []);

  const employerJobs = useMemo(() => jobs.filter(job => job.employerId === currentUser?._id), [currentUser?._id, jobs]);
  const employerApplications = useMemo(
    () => applications.filter(app => employerJobs.some(job => job._id === app.jobId)),
    [applications, employerJobs]
  );
  const hiresMade = employerApplications.filter(app => app.status === 'hired' || app.status === 'offered').length;
  const responseRate = employerApplications.length
    ? Math.round((employerApplications.filter(app => app.status !== 'pending').length / employerApplications.length) * 100)
    : 0;
  const originalSignature = JSON.stringify({
    name: currentUser?.name || '',
    avatarUrl: currentUser?.avatarUrl || '',
    profile: currentUser?.employerProfile || initialProfile,
    evidenceFiles: currentUser?.verificationDocuments || [],
  });
  const currentSignature = JSON.stringify({ name: displayName, avatarUrl, profile, evidenceFiles });
  const hasUnsavedChanges = originalSignature !== currentSignature;
  const verificationStatus = currentUser?.verificationStatus || (currentUser?.verified ? 'verified' : 'unverified');

  if (!currentUser || currentUser.role !== 'employer') {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <Building2 className="mx-auto h-10 w-10 text-[#2563EB]" />
          <h1 className="mt-3 text-lg font-black text-slate-950">Employer profile required</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in as an employer to manage your public profile.</p>
        </div>
      </div>
    );
  }

  const updateProfileField = (key: keyof EmployerProfileDetails, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUrl(await readFileAsDataUrl(file));
    showToast('Avatar ready. Save profile to publish it.');
  };

  const addEvidenceFiles = (files: FileList | File[]) => {
    const names = Array.from(files).map(file => file.name);
    if (!names.length) return;
    setEvidenceFiles(prev => Array.from(new Set([...prev, ...names])));
    showToast('Evidence attached. Run verification when all checks are ready.');
  };

  const handleEvidenceDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    addEvidenceFiles(event.dataTransfer.files);
  };

  const saveProfile = () => {
    const nextStatus = evidenceFiles.length >= 3 && !currentUser.verified ? 'pending' : verificationStatus;
    updateUser(currentUser._id, {
      name: displayName.trim() || currentUser.name,
      avatarUrl,
      employerProfile: profile,
      verificationDocuments: evidenceFiles,
      verificationStatus: nextStatus,
    });
    showToast('Profile saved.');
  };

  const runVerification = () => {
    const checksPassed = Boolean(profile.companyName.trim()) && Boolean(profile.county) && evidenceFiles.length >= 3;
    if (!checksPassed) {
      updateUser(currentUser._id, { verified: false, verificationStatus: evidenceFiles.length ? 'pending' : 'unverified', verificationDocuments: evidenceFiles });
      showToast('Verification needs company details and all three evidence files.');
      return;
    }
    updateUser(currentUser._id, { verified: true, verificationStatus: 'verified', verificationDocuments: evidenceFiles, employerProfile: profile });
    showToast('Verification passed. Trust badge activated.');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8 lg:px-10">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#F97316]">Employer workspace / Profile</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Company profile</h1>
            {hasUnsavedChanges && <span className="h-3 w-3 rounded-full bg-amber-400 shadow-lg shadow-amber-300/50" title="Unsaved changes" />}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Build the employer presence fundis see before they apply, message you, or accept work from your company.</p>
        </div>
        <button onClick={saveProfile} className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 lg:mt-0">
          <Save className="h-4 w-4" />
          Save profile
        </button>
      </header>

      {hasUnsavedChanges && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Unsaved changes. Save before leaving this page.</div>
      )}

      <main className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-sm">
            <div className="flex flex-col items-center text-center">
              <button onClick={() => avatarInputRef.current?.click()} className="group relative h-36 w-36 overflow-hidden rounded-[2rem] bg-white/10 ring-4 ring-white/10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-3xl font-black">{displayName.slice(0, 2)}</span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-950/70 py-2 text-xs font-black">
                  <Camera className="h-3.5 w-3.5" />
                  Edit
                </span>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-5 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-xl font-black text-white outline-none focus:border-[#F97316]" />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-100">Employer</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${statusClasses(verificationStatus)}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {verificationStatus}
                </span>
                <VerifiedEmployerBadge user={currentUser} className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-400">Member since {formatMemberDate(currentUser.createdAt)}</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-[#F97316]" />
                {profile.county}, Kenya
              </p>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white">Hiring activity</h2>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-300">Public</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Jobs posted', value: employerJobs.length, icon: Building2 },
                { label: 'Hires made', value: hiresMade, icon: UsersRound },
                { label: 'Response rate', value: `${responseRate}%`, icon: CheckCircle2 },
                { label: 'Avg. response', value: averageResponseHours(employerApplications), icon: Clock3 },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <Icon className="h-4 w-4 text-[#F97316]" />
                    <p className="mt-3 text-2xl font-black text-white">{item.value}</p>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{item.label}</p>
                  </div>
                );
              })}
              </div>
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
              <Building2 className="h-5 w-5 text-[#2563EB]" />
              Company information
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-400">
                Company name
                <input value={profile.companyName} onChange={(event) => updateProfileField('companyName', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-[#2563EB]" />
              </label>
              <label className="text-xs font-black uppercase tracking-wide text-slate-400">
                Website URL
                <input value={profile.websiteUrl} onChange={(event) => updateProfileField('websiteUrl', event.target.value)} placeholder="https://example.co.ke" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-900 outline-none focus:border-[#2563EB]" />
              </label>
              <label className="text-xs font-black uppercase tracking-wide text-slate-400">
                Industry
                <select value={profile.industry} onChange={(event) => updateProfileField('industry', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                  {EMPLOYER_INDUSTRIES.map(industry => <option key={industry}>{industry}</option>)}
                </select>
              </label>
              <label className="text-xs font-black uppercase tracking-wide text-slate-400">
                Company size
                <select value={profile.companySize} onChange={(event) => updateProfileField('companySize', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                  {COMPANY_SIZES.map(size => <option key={size}>{size}</option>)}
                </select>
              </label>
              <label className="text-xs font-black uppercase tracking-wide text-slate-400 sm:col-span-2">
                County / location
                <select value={profile.county} onChange={(event) => updateProfileField('county', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case text-slate-900 outline-none">
                  {KENYA_COUNTIES.map(county => <option key={county}>{county}</option>)}
                </select>
              </label>
              <label className="text-xs font-black uppercase tracking-wide text-slate-400 sm:col-span-2">
                Company description
                <textarea value={profile.companyDescription} maxLength={300} onChange={(event) => updateProfileField('companyDescription', event.target.value)} rows={5} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case leading-6 tracking-normal text-slate-900 outline-none focus:border-[#2563EB]" />
                <span className="mt-1 block text-right text-[10px] text-slate-400">{profile.companyDescription.length}/300</span>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
                  Verification centre
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Employers receive the checkmark only after company details and evidence files pass the checks.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${statusClasses(verificationStatus)}`}>{verificationStatus}</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {evidenceSlots.map(slot => (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => evidenceInputRefs.current[slot.key]?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleEvidenceDrop}
                  className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-left transition hover:border-[#2563EB] hover:bg-blue-50"
                >
                  <UploadCloud className="h-5 w-5 text-[#F97316]" />
                  <p className="mt-3 text-sm font-black text-slate-950">{slot.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Drop file or click to upload.</p>
                  <input
                    ref={(node) => { evidenceInputRefs.current[slot.key] = node; }}
                    type="file"
                    className="hidden"
                    onChange={(event) => event.target.files && addEvidenceFiles(event.target.files)}
                  />
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {evidenceFiles.length ? evidenceFiles.map(file => (
                <span key={file} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                  {file}
                </span>
              )) : <span className="text-sm text-slate-500">No evidence files attached yet.</span>}
            </div>
            <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-900">
              Verification requires a complete company name, county, KRA PIN, business registration or property authority, and owner ID. The trust badge stays inactive until checks pass.
            </div>
            <button onClick={runVerification} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
              <ShieldCheck className="h-4 w-4" />
              Run verification
            </button>
          </div>

        </section>
      </main>

      <div className="sticky bottom-4 z-20 lg:hidden">
        <button onClick={saveProfile} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-4 text-sm font-black text-white shadow-2xl shadow-blue-600/25">
          <Save className="h-4 w-4" />
          Save profile
        </button>
      </div>
    </div>
  );
}
