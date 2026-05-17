import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, SKILL_OPTIONS, formatKSh, type Application, type Job, type Profile } from '../db/schema';
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  FolderKanban,
  ShieldCheck,
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
  const { currentUser, profiles } = useAuth();
  const myProfile = currentUser ? profiles.find(profile => profile.userId === currentUser._id) : undefined;

  const [bio, setBio] = useState(myProfile?.bio || '');
  const [hourlyRate, setHourlyRate] = useState(myProfile?.hourlyRate || 350);
  const [county, setCounty] = useState(myProfile?.county || 'Nairobi');
  const [skills, setSkills] = useState(myProfile?.skills.join(', ') || '');

  useEffect(() => {
    setBio(myProfile?.bio || '');
    setHourlyRate(myProfile?.hourlyRate || 350);
    setCounty(myProfile?.county || 'Nairobi');
    setSkills(myProfile?.skills.join(', ') || '');
  }, [myProfile]);

  const myApplications = useMemo(
    () => currentUser ? applications.filter(application => application.fundiId === currentUser._id) : [],
    [applications, currentUser]
  );

  const activeSkillMatches = useMemo(() => {
    const profileSkillSet = new Set((myProfile?.skills || []).map(skill => skill.toLowerCase()));
    return jobs.filter(job => job.status === 'active' && job.skills.some(skill => profileSkillSet.has(skill.toLowerCase()))).length;
  }, [jobs, myProfile?.skills]);

  if (!currentUser || currentUser.role !== 'fundi' || !myProfile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Fundi profile access required</h2>
          <p className="text-xs text-slate-600">Sign in as a fundi to manage profile details.</p>
        </div>
      </div>
    );
  }

  const verificationDocuments = myProfile.verificationDocuments || [];
  const cvInsights = myProfile.cvInsights || [];
  const readinessItems = [
    { label: 'Photo', done: Boolean(myProfile.avatarUrl), helper: 'Visible on job applications and search cards.' },
    { label: 'CV', done: Boolean(myProfile.cvFileName), helper: myProfile.cvFileName || 'Upload a CV to extract matching details.' },
    { label: 'Skills', done: myProfile.skills.length >= 2, helper: `${myProfile.skills.length} skill(s) listed.` },
    { label: 'Portfolio', done: myProfile.portfolioImages.length > 0, helper: `${myProfile.portfolioImages.length} project image(s).` },
    { label: 'Verification', done: myProfile.verified, helper: myProfile.verified ? 'Badge active across Fundilink.' : 'Upload evidence and run verification.' },
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
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCvInsights(String(reader.result || ''), file.name, myProfile.skills, myProfile.completedJobs);
      const mergedSkills = Array.from(new Set([...myProfile.skills, ...parsed.detectedSkills]));
      updateProfile(currentUser._id, {
        cvFileName: file.name,
        cvInsights: parsed.insights,
        skills: mergedSkills,
      });
      showToast('CV scanned. Skills and profile insights were updated.');
    };
    reader.onerror = () => {
      const parsed = parseCvInsights('', file.name, myProfile.skills, myProfile.completedJobs);
      updateProfile(currentUser._id, { cvFileName: file.name, cvInsights: parsed.insights });
      showToast('CV saved. Insights were inferred from the filename and profile.');
    };
    reader.readAsText(file);
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
    const evidence = [
      bio,
      skills,
      myProfile.cvFileName || '',
      ...cvInsights,
      ...verificationDocuments,
    ].join(' ').toLowerCase();
    const hasTrustedEvidence = ['nca', 'epra', 'osha', 'safety', 'certificate', 'licence', 'license'].some(term => evidence.includes(term));

    updateProfile(currentUser._id, {
      verified: hasTrustedEvidence,
      verificationStatus: hasTrustedEvidence ? 'verified' : 'pending',
    });
    showToast(hasTrustedEvidence ? 'Verification passed. Fundi badge is now active.' : 'Verification evidence saved for manual review.');
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
                  {myProfile.verified && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-950">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
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
          <p className="mt-2 text-xs leading-5 text-slate-500">{myProfile.cvFileName || 'No CV uploaded yet.'}</p>
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
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Status: <span className="font-black text-slate-900">{myProfile.verified ? 'Verified badge active' : myProfile.verificationStatus || 'unverified'}</span>
          </p>
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
              <img key={`${image}-${index}`} src={image} alt="Portfolio evidence" className="aspect-square rounded-lg object-cover" />
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
