import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, SKILL_OPTIONS, formatKSh, type Application, type Job, type Profile } from '../db/schema';
import { evaluateFundiVerification, isFundiBadgeActive } from '../utils/verification';
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  ExternalLink,
  FileText,
  FolderKanban,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCircle2,
} from 'lucide-react';

interface FundiProfileManagerProps {
  jobs: Job[];
  applications: Application[];
  profileViews: number;
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
  updateProfile: (userId: string, updates: Partial<Profile>) => void;
}

function parseCvInsights(text: string, fileName: string, currentSkills: string[], completedJobs: number) {
  const source = `${text} ${fileName}`.toLowerCase();
  const detectedSkills = SKILL_OPTIONS
    .filter(skill => skill !== 'All Skills' && source.includes(skill.toLowerCase()))
    .slice(0, 8);
  const yearMatch = source.match(/(\d+)\+?\s*(years|yrs|year)/);
  const certifications = ['nca', 'epra', 'osha', 'safety', 'certificate', 'licence', 'license']
    .filter(term => source.includes(term))
    .map(term => term.toUpperCase());

  return {
    detectedSkills,
    insights: [
      detectedSkills.length
        ? `Skills detected: ${detectedSkills.join(', ')}.`
        : `Skills inferred from profile: ${currentSkills.slice(0, 5).join(', ') || 'Add skills to improve parsing.'}`,
      yearMatch
        ? `Experience signal: ${yearMatch[1]} years mentioned in the CV.`
        : `Experience signal: ${completedJobs} completed Fundilink jobs currently support this profile.`,
      certifications.length
        ? `Certification keywords found: ${certifications.join(', ')}.`
        : 'Certification gap: upload NCA, EPRA, OSHA, or safety proof to verify the profile.',
    ],
  };
}

export default function FundiProfileManager({
  jobs,
  applications,
  profileViews,
  onNavigate,
  showToast,
  updateProfile,
}: FundiProfileManagerProps) {
  const { currentUser, profiles, updateUser } = useAuth();
  const myProfile = currentUser ? profiles.find(profile => profile.userId === currentUser._id) : undefined;

  const [bio, setBio] = useState(myProfile?.bio || '');
  const [hourlyRate, setHourlyRate] = useState(myProfile?.hourlyRate || 350);
  const [county, setCounty] = useState(myProfile?.county || 'Nairobi');
  const [skills, setSkills] = useState(myProfile?.skills.join(', ') || '');
  const [employerName, setEmployerName] = useState(currentUser?.name || '');
  const [employerPhone, setEmployerPhone] = useState(currentUser?.phone || '');

  useEffect(() => {
    setBio(myProfile?.bio || '');
    setHourlyRate(myProfile?.hourlyRate || 350);
    setCounty(myProfile?.county || 'Nairobi');
    setSkills(myProfile?.skills.join(', ') || '');
  }, [myProfile]);

  useEffect(() => {
    setEmployerName(currentUser?.name || '');
    setEmployerPhone(currentUser?.phone || '');
  }, [currentUser]);

  const myApplications = useMemo(
    () => currentUser ? applications.filter(application => application.fundiId === currentUser._id) : [],
    [applications, currentUser]
  );

  const activeSkillMatches = useMemo(() => {
    const profileSkillSet = new Set((myProfile?.skills || []).map(skill => skill.toLowerCase()));
    return jobs.filter(job => job.status === 'active' && job.skills.some(skill => profileSkillSet.has(skill.toLowerCase()))).length;
  }, [jobs, myProfile?.skills]);

  const employerDocuments = currentUser?.verificationDocuments || [];

  const handleEmployerPhotoUpload = (file?: File) => {
    if (!file || !currentUser) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateUser(currentUser._id, { avatarUrl: String(reader.result) });
      showToast('Employer profile picture saved.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEmployerProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    updateUser(currentUser._id, { name: employerName.trim() || currentUser.name, phone: employerPhone.trim() || currentUser.phone });
    showToast('Employer profile saved.');
    onNavigate('dashboard-employer');
  };

  const handleEmployerVerificationUpload = (file?: File) => {
    if (!file || !currentUser) return;
    updateUser(currentUser._id, {
      verificationDocuments: [file.name, ...employerDocuments].slice(0, 8),
      verificationStatus: 'pending',
      verified: false,
    });
    showToast('Employer verification document uploaded.');
  };

  const runEmployerVerificationCheck = () => {
    if (!currentUser) return;
    const evidence = [
      employerName,
      employerPhone,
      currentUser.email,
      ...employerDocuments,
    ].join(' ').toLowerCase();
    const hasTrustedEvidence = ['kra', 'pin', 'business', 'registration', 'company', 'contractor', 'estate', 'property', 'id-check', 'national'].some(term => evidence.includes(term));
    updateUser(currentUser._id, {
      verified: hasTrustedEvidence,
      verificationStatus: hasTrustedEvidence ? 'verified' : 'pending',
    });
    showToast(hasTrustedEvidence ? 'Employer verification passed. Blue check is now active.' : 'Employer evidence saved for admin review.');
  };

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Profile access required</h2>
          <p className="text-xs text-slate-600">Sign in to manage your Fundilink profile.</p>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'employer') {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="bg-slate-950 p-6 text-white lg:p-8">
              <div className="flex items-start gap-4">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white/10" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black">
                    {currentUser.name.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight">{currentUser.name}</h1>
                    {currentUser.verified && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1d9bf0] text-white">
                        <BadgeCheck className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Verified employers get a blue check beside their names across jobs, messages, and application workflows.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { label: 'Status', value: currentUser.verified ? 'Verified' : currentUser.verificationStatus || 'Unverified' },
                  { label: 'Evidence files', value: employerDocuments.length },
                  { label: 'Account type', value: 'Employer' },
                  { label: 'Trust badge', value: currentUser.verified ? 'Active' : 'Pending' },
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
                Employer verification centre
              </h2>
              <form onSubmit={handleSaveEmployerProfile} className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Display name
                  <input
                    value={employerName}
                    onChange={(event) => setEmployerName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]"
                  />
                </label>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Phone
                  <input
                    value={employerPhone}
                    onChange={(event) => setEmployerPhone(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]"
                  />
                </label>
                <button type="submit" className="flex items-center justify-center gap-2 rounded-lg bg-[#005fec] px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 lg:col-span-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Save employer profile
                </button>
              </form>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800">
                  <UploadCloud className="h-4 w-4" />
                  Upload profile image
                  <input type="file" accept="image/*" onChange={(event) => handleEmployerPhotoUpload(event.target.files?.[0])} className="hidden" />
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800">
                  <UploadCloud className="h-4 w-4" />
                  Upload verification file
                  <input type="file" accept=".txt,.pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(event) => handleEmployerVerificationUpload(event.target.files?.[0])} className="hidden" />
                </label>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-900">Employer verification rules</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Upload business registration, KRA PIN, national ID confirmation, contractor letter, estate manager letter, or property ownership evidence. Passing verification activates the blue check on employer names only.
                </p>
                <button onClick={runEmployerVerificationCheck} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-600 hover:text-white">
                  <ClipboardCheck className="h-4 w-4" />
                  Run employer verification
                </button>
              </div>

              {employerDocuments.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {employerDocuments.map(document => (
                    <p key={document} className="truncate rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-950">{document}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (currentUser.role !== 'fundi' || !myProfile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Profile access required</h2>
          <p className="text-xs text-slate-600">This profile section is available for fundis and employers.</p>
        </div>
      </div>
    );
  }

  const verificationDocuments = myProfile.verificationDocuments || [];
  const cvInsights = myProfile.cvInsights || [];
  const verificationResult = evaluateFundiVerification(myProfile, currentUser);
  const fundiBadgeActive = isFundiBadgeActive(myProfile, currentUser);
  const readinessItems = [
    { label: 'Photo', done: Boolean(myProfile.avatarUrl), helper: 'Visible on job applications and search cards.' },
    { label: 'CV', done: Boolean(myProfile.cvFileName), helper: myProfile.cvFileName || 'Upload a CV to extract matching details.' },
    { label: 'Skills', done: myProfile.skills.length >= 2, helper: `${myProfile.skills.length} skill(s) listed.` },
    { label: 'Portfolio', done: myProfile.portfolioImages.length > 0, helper: `${myProfile.portfolioImages.length} project image(s).` },
    { label: 'Verification', done: fundiBadgeActive, helper: fundiBadgeActive ? 'Badge active across Fundilink.' : `${verificationResult.score}% of required checks passed.` },
  ];
  const readinessScore = Math.round((readinessItems.filter(item => item.done).length / readinessItems.length) * 100);

  const handleSaveProfile = (event: FormEvent) => {
    event.preventDefault();
    updateProfile(currentUser._id, {
      bio,
      hourlyRate,
      county,
      skills: skills.split(',').map(skill => skill.trim()).filter(Boolean),
    });
    showToast('Profile saved. Your dashboard and matching scores have been refreshed.');
    onNavigate('dashboard-fundi');
  };

  const handlePhotoUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile(currentUser._id, { avatarUrl: String(reader.result) });
      showToast('Profile photo saved.');
    };
    reader.readAsDataURL(file);
  };

  const handleCvUpload = (file?: File) => {
    if (!file) return;
    const canReadText = file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      let cvText = '';
      if (canReadText) {
        try {
          cvText = await file.text();
        } catch {
          cvText = '';
        }
      }
      const parsed = parseCvInsights(cvText, file.name, myProfile.skills, myProfile.completedJobs);
      const mergedSkills = Array.from(new Set([...myProfile.skills, ...parsed.detectedSkills]));
      updateProfile(currentUser._id, {
        cvFileName: file.name,
        cvFileUrl: String(reader.result || ''),
        cvMimeType: file.type || 'application/octet-stream',
        cvInsights: parsed.insights,
        skills: mergedSkills,
      });
      showToast(canReadText ? 'CV uploaded and scanned. Skills and profile insights were updated.' : 'CV uploaded. Employers can now view it from your public profile.');
    };
    reader.onerror = () => {
      const parsed = parseCvInsights('', file.name, myProfile.skills, myProfile.completedJobs);
      updateProfile(currentUser._id, {
        cvFileName: file.name,
        cvFileUrl: '',
        cvMimeType: file.type || 'application/octet-stream',
        cvInsights: parsed.insights,
      });
      showToast('CV saved. Insights were inferred from the filename and profile.');
    };
    reader.readAsDataURL(file);
  };

  const handlePortfolioUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile(currentUser._id, {
        portfolioImages: [String(reader.result), ...myProfile.portfolioImages].slice(0, 8),
      });
      showToast('Portfolio evidence added.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePortfolioImage = (indexToRemove: number) => {
    const nextImages = myProfile.portfolioImages.filter((_, index) => index !== indexToRemove);
    updateProfile(currentUser._id, {
      portfolioImages: nextImages,
      verified: nextImages.length >= 2 ? myProfile.verified : false,
      verificationStatus: nextImages.length >= 2 ? myProfile.verificationStatus : 'pending',
    });
    showToast('Portfolio image removed.');
  };

  const handleVerificationUpload = (file?: File) => {
    if (!file) return;
    updateProfile(currentUser._id, {
      verificationDocuments: [file.name, ...verificationDocuments].slice(0, 6),
      verificationStatus: 'pending',
      verified: false,
    });
    showToast('Verification document uploaded. Run the verification check to activate the badge.');
  };

  const runVerificationCheck = () => {
    const candidateProfile: Profile = {
      ...myProfile,
      bio,
      hourlyRate,
      county,
      skills: skills.split(',').map(skill => skill.trim()).filter(Boolean),
    };
    const result = evaluateFundiVerification(candidateProfile, currentUser);

    updateProfile(currentUser._id, {
      bio: candidateProfile.bio,
      hourlyRate: candidateProfile.hourlyRate,
      county: candidateProfile.county,
      skills: candidateProfile.skills,
      verified: result.passed,
      verificationStatus: result.passed ? 'verified' : 'pending',
    });
    showToast(result.passed
      ? 'Verification passed. Fundi badge is now active.'
      : `Verification not passed. Missing: ${result.missingRequired.map(check => check.label).join(', ')}.`
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-slate-950 p-6 text-white lg:p-8">
            <div className="flex items-start gap-4">
              <img src={myProfile.avatarUrl} alt={currentUser.name} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white/10" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">{currentUser.name}</h1>
                  {fundiBadgeActive && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-slate-950" title="Verified fundi" aria-label="Verified fundi">
                      <BadgeCheck className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{myProfile.bio}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {[
                { label: 'Readiness', value: `${readinessScore}%` },
                { label: 'Profile views', value: profileViews },
                { label: 'Applications', value: myApplications.length },
                { label: 'Skill matches', value: activeSkillMatches },
              ].map(metric => (
                <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-2xl font-black">{metric.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 lg:p-7">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <UserCircle2 className="h-4 w-4 text-[#005fec]" />
              Profile details
            </h2>
            <form onSubmit={handleSaveProfile} className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 lg:col-span-2">
                Bio
                <textarea
                  rows={5}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm normal-case leading-6 tracking-normal text-slate-800 outline-none focus:border-[#005fec]"
                />
              </label>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Hourly rate
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]"
                />
              </label>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                County
                <select
                  value={county}
                  onChange={(event) => setCounty(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]"
                >
                  {COUNTIES.filter(item => item !== 'All Counties').map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 lg:col-span-2">
                Skills
                <input
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]"
                />
              </label>
              <button type="submit" className="flex items-center justify-center gap-2 rounded-lg bg-[#005fec] px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 lg:col-span-2">
                <CheckCircle2 className="h-4 w-4" />
                Save profile
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Camera className="h-4 w-4 text-[#005fec]" />
            Profile picture
          </h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">Upload a clear face photo. It appears in recommendations, applications, and public profile cards.</p>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800">
            <UploadCloud className="h-4 w-4" />
            Upload photo
            <input type="file" accept="image/*" onChange={(event) => handlePhotoUpload(event.target.files?.[0])} className="hidden" />
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <FileText className="h-4 w-4 text-[#005fec]" />
            CV reader
          </h2>
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-900">{myProfile.cvFileName ? 'CV uploaded' : 'No CV uploaded yet.'}</p>
            {myProfile.cvFileName && <p className="mt-1 truncate text-[11px] font-bold text-slate-500">{myProfile.cvFileName}</p>}
          </div>
          {myProfile.cvFileUrl && (
            <a
              href={myProfile.cvFileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-xs font-black text-slate-800 transition hover:border-[#005fec] hover:text-[#005fec]"
            >
              <ExternalLink className="h-4 w-4" />
              View uploaded CV
            </a>
          )}
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800">
            <UploadCloud className="h-4 w-4" />
            Upload CV
            <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={(event) => handleCvUpload(event.target.files?.[0])} className="hidden" />
          </label>
          {cvInsights.length > 0 && (
            <div className="mt-3 space-y-2">
              {cvInsights.map(insight => (
                <p key={insight} className="rounded-lg bg-blue-50 p-2 text-[11px] leading-5 text-blue-950">{insight}</p>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <ShieldCheck className="h-4 w-4 text-[#005fec]" />
            Fundi verification
          </h2>
          <div className="mt-3 rounded-lg bg-slate-950 p-3 text-white">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Verification score</p>
                <p className="mt-1 text-2xl font-black">{verificationResult.score}%</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${
                fundiBadgeActive ? 'bg-emerald-400 text-slate-950' : 'bg-amber-300 text-slate-950'
              }`}>
                {fundiBadgeActive ? 'Badge active' : myProfile.verificationStatus || 'Unverified'}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-300">
              The badge activates only after all required verification checks pass.
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {verificationResult.checks.map(check => (
              <div key={check.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  check.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {check.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <p className="text-xs font-black text-slate-900">{check.label}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800">
            <UploadCloud className="h-4 w-4" />
            Upload evidence
            <input type="file" accept=".txt,.pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(event) => handleVerificationUpload(event.target.files?.[0])} className="hidden" />
          </label>
          <button onClick={runVerificationCheck} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-600 hover:text-white">
            <ClipboardCheck className="h-4 w-4" />
            Run verification check
          </button>
          {verificationDocuments.length > 0 && (
            <div className="mt-3 space-y-1">
              {verificationDocuments.map(document => (
                <p key={document} className="truncate rounded-md bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-600">{document}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <FolderKanban className="h-4 w-4 text-[#005fec]" />
            Portfolio showcase
          </h2>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-xs font-black text-slate-700 transition hover:border-[#005fec] hover:bg-blue-50">
            <UploadCloud className="h-4 w-4 text-[#005fec]" />
            Add project image
            <input type="file" accept="image/*" onChange={(event) => handlePortfolioUpload(event.target.files?.[0])} className="hidden" />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {myProfile.portfolioImages.length > 0 ? myProfile.portfolioImages.map((image, index) => (
              <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-lg">
                <img src={image} alt="Portfolio evidence" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePortfolioImage(index)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-600 opacity-100 shadow-lg transition hover:scale-105 hover:bg-rose-600 hover:text-white active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Remove portfolio image"
                  title="Remove portfolio image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )) : (
              <div className="col-span-full rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500">No portfolio evidence uploaded yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Eye className="h-4 w-4 text-[#005fec]" />
            Profile readiness
          </h2>
          <div className="mt-4 rounded-lg bg-slate-950 p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Readiness score</p>
            <p className="mt-2 text-4xl font-black">{readinessScore}%</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">{formatKSh(myProfile.hourlyRate)} hourly rate in {myProfile.county}.</p>
          </div>
          <div className="mt-3 space-y-2">
            {readinessItems.map(item => (
              <div key={item.label} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-black text-slate-900">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.helper}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-[10px] font-black ${item.done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {item.done ? 'Done' : 'Needed'}
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('fundi-profile')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-xs font-black text-slate-800 transition hover:bg-slate-200">
            <Eye className="h-4 w-4" />
            View public profile
          </button>
        </div>
      </section>
    </div>
  );
}
