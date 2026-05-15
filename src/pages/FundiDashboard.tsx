import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, SKILL_OPTIONS, formatKSh, type Application, type Job, type Profile } from '../db/schema';
import {
  AlertTriangle,
  Award,
  Banknote,
  BarChart3,
  Bell,
  BookmarkPlus,
  Bot,
  BriefcaseBusiness,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  FolderKanban,
  Layers,
  MapPinned,
  MessageSquare,
  Search,
  Send,
  Shield,
  SlidersHorizontal,
  Star,
  Target,
  TrendingUp,
  UploadCloud,
  User,
  Video,
  XCircle,
  Zap,
} from 'lucide-react';

interface FundiDashboardProps {
  jobs: Job[];
  applications: Application[];
  onNavigate: (page: string) => void;
  showToast: (msg: string) => void;
  updateProfile: (userId: string, updates: Partial<Profile>) => void;
  profileViews: number;
}

const SKILL_CATEGORIES: Record<string, string[]> = {
  Structural: ['Masonry', 'Concrete Mixing', 'Foundation Repair', 'Tile Fitting'],
  Mechanical: ['Plumbing', 'Drainage', 'Pipe Fitting', 'Water Heater Repair'],
  Electrical: ['Electrical Wiring', 'Solar Installation', 'Fault Finding', 'Generator Setup'],
  Fabrication: ['Carpentry', 'Roofing', 'Cabinet Making', 'Wood Varnishing'],
  Finishing: ['Painting', 'Gypsum Ceiling', 'Wall Texturing', 'Waterproofing'],
};

const COUNTY_DISTANCES: Record<string, Record<string, number>> = {
  Nairobi: { Kiambu: 24, Kajiado: 78, Machakos: 64, Nakuru: 160, Kisumu: 350, Mombasa: 485 },
  Kiambu: { Nairobi: 24, Kajiado: 96, Machakos: 76, Nakuru: 138 },
  Mombasa: { Nairobi: 485, Kisumu: 830 },
  Kisumu: { Eldoret: 120, Nakuru: 185, Nairobi: 350 },
  Nakuru: { Nairobi: 160, Kiambu: 138, Eldoret: 155, Kisumu: 185 },
  Machakos: { Nairobi: 64, Kiambu: 76, Kajiado: 110 },
};

function getCategory(skill: string) {
  return Object.entries(SKILL_CATEGORIES).find(([, items]) => items.includes(skill))?.[0] || 'General';
}

function getDistance(from: string, to: string) {
  if (from === to || from === 'All Counties') return 0;
  return COUNTY_DISTANCES[from]?.[to] ?? COUNTY_DISTANCES[to]?.[from] ?? 220;
}

function getCompanyType(job: Job) {
  if (job.employerName.includes('Kiprop')) return 'Contractor';
  if (job.employerName.includes('Maina')) return 'Estate';
  return 'Homeowner';
}

function getWorkMode(job: Job) {
  if (job.skills.some(skill => ['Solar Installation', 'Electrical Wiring', 'Cabinet Making'].includes(skill))) return 'Hybrid';
  return 'Onsite';
}

function getJobLevel(job: Job) {
  if (job.budget >= 45000) return 'Senior';
  if (job.budget >= 22000) return 'Mid';
  return 'Junior';
}

export default function FundiDashboard({ jobs, applications, onNavigate, showToast, updateProfile, profileViews }: FundiDashboardProps) {
  const { currentUser, profiles } = useAuth();
  const myProfile = currentUser ? profiles.find(p => p.userId === currentUser._id) : undefined;

  const [editBio, setEditBio] = useState(myProfile?.bio || '');
  const [editRate, setEditRate] = useState(myProfile?.hourlyRate || 350);
  const [editCounty, setEditCounty] = useState(myProfile?.county || 'Nairobi');
  const [editSkills, setEditSkills] = useState(myProfile?.skills.join(', ') || '');
  const [filterCounty, setFilterCounty] = useState(myProfile?.county || 'All Counties');
  const [radius, setRadius] = useState(60);
  const [minBudget, setMinBudget] = useState(10000);
  const [maxBudget, setMaxBudget] = useState(70000);
  const [experienceLevel, setExperienceLevel] = useState('Any');
  const [techStack, setTechStack] = useState('All Skills');
  const [workArrangement, setWorkArrangement] = useState('Any');
  const [companyType, setCompanyType] = useState('Any');
  const [savedSearches, setSavedSearches] = useState<string[]>(['Nearby high-match briefs', 'Verified employers over KSh 25k']);
  const [photoPreview, setPhotoPreview] = useState(myProfile?.avatarUrl || '');
  const [cvFileName, setCvFileName] = useState('');
  const [cvInsights, setCvInsights] = useState<string[]>([]);

  useEffect(() => {
    setEditBio(myProfile?.bio || '');
    setEditRate(myProfile?.hourlyRate || 350);
    setEditCounty(myProfile?.county || 'Nairobi');
    setEditSkills(myProfile?.skills.join(', ') || '');
    setFilterCounty(myProfile?.county || 'All Counties');
    setPhotoPreview(myProfile?.avatarUrl || '');
  }, [myProfile]);

  const myApps = useMemo(
    () => currentUser ? applications.filter(a => a.fundiId === currentUser._id) : [],
    [applications, currentUser]
  );
  const profileSkills = myProfile?.skills || [];
  const completedJobs = myProfile?.completedJobs || 0;
  const hiredApplications = myApps.filter(a => a.status === 'hired').length;
  const successRate = myApps.length ? Math.round((hiredApplications / myApps.length) * 100) : 0;

  const matchedJobs = useMemo(() => {
    const skillSet = new Set(profileSkills.map(skill => skill.toLowerCase()));

    return jobs
      .filter(job => job.status === 'active')
      .map(job => {
        const matchedSkills = job.skills.filter(skill => skillSet.has(skill.toLowerCase()));
        const adjacentSkills = job.skills.filter(skill =>
          !matchedSkills.includes(skill) && profileSkills.some(profileSkill => getCategory(profileSkill) === getCategory(skill))
        );
        const distance = getDistance(myProfile?.county || 'Nairobi', job.county);
        const level = getJobLevel(job);
        const workMode = getWorkMode(job);
        const type = getCompanyType(job);
        const skillScore = Math.round((matchedSkills.length / Math.max(job.skills.length, 1)) * 42 + adjacentSkills.length * 8);
        const experienceScore = Math.min(18, Math.round(completedJobs / 2.2));
        const locationScore = job.county === myProfile?.county ? 18 : Math.max(0, 18 - Math.round(distance / 18));
        const salaryScore = job.budget >= minBudget && job.budget <= maxBudget ? 14 : job.budget > maxBudget ? 8 : 4;
        const preferenceScore = (workArrangement === 'Any' || workArrangement === workMode ? 5 : 1) + (companyType === 'Any' || companyType === type ? 5 : 1);
        const hiredSignal = myApps.some(app => app.status === 'hired' && matchedSkills.some(skill => app.fundiSkill.toLowerCase().includes(skill.toLowerCase())));
        const score = Math.min(98, skillScore + experienceScore + locationScore + salaryScore + preferenceScore + (hiredSignal ? 6 : 2));

        return { job, matchedSkills, adjacentSkills, distance, level, workMode, companyType: type, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [jobs, profileSkills, myProfile?.county, completedJobs, minBudget, maxBudget, workArrangement, companyType, myApps]);

  const filteredJobs = matchedJobs.filter(({ job, distance, level, workMode, companyType: type }) => {
    const locationOk = filterCounty === 'All Counties' || job.county === filterCounty || distance <= radius;
    const budgetOk = job.budget >= minBudget && job.budget <= maxBudget;
    const levelOk = experienceLevel === 'Any' || level === experienceLevel;
    const skillOk = techStack === 'All Skills' || job.skills.includes(techStack);
    const workOk = workArrangement === 'Any' || workMode === workArrangement;
    const companyOk = companyType === 'Any' || type === companyType;
    return locationOk && budgetOk && levelOk && skillOk && workOk && companyOk;
  });

  const parsedSkillGroups = Object.entries(SKILL_CATEGORIES)
    .map(([category, skills]) => ({
      category,
      skills: profileSkills.filter(skill => skills.includes(skill)),
    }))
    .filter(group => group.skills.length > 0);

  const openSkillMatches = jobs.filter(job => job.status === 'active' && job.skills.some(skill => profileSkills.includes(skill))).length;
  const topMatch = matchedJobs[0];
  const readinessItems = [
    { label: 'Profile photo', done: Boolean(myProfile?.avatarUrl), detail: 'Helps employers identify you quickly.' },
    { label: 'CV insights', done: cvInsights.length > 0, detail: cvInsights.length > 0 ? 'CV has been scanned this session.' : 'Upload CV to extract skills and certifications.' },
    { label: 'Portfolio evidence', done: Boolean(myProfile?.portfolioImages.length), detail: `${myProfile?.portfolioImages.length || 0} portfolio item(s).` },
    { label: 'Verification', done: Boolean(myProfile?.verified), detail: myProfile?.verified ? 'Verified profile.' : 'Add NCA/EPRA or safety proof.' },
  ];
  const readinessScore = Math.round((readinessItems.filter(item => item.done).length / readinessItems.length) * 100);

  if (!currentUser || currentUser.role !== 'fundi') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Fundi Access Required</h2>
          <p className="text-xs text-slate-600">Switch to a fundi persona from the left panel.</p>
        </div>
      </div>
    );
  }

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    updateProfile(currentUser._id, {
      bio: editBio,
      hourlyRate: editRate,
      county: editCounty,
      skills: editSkills.split(',').map(s => s.trim()).filter(Boolean),
    });
    showToast('Profile updated. Match scoring and recommendations refreshed.');
  };

  const handleSaveSearch = () => {
    const label = `${filterCounty === 'All Counties' ? 'All counties' : filterCounty} / ${techStack} / ${formatKSh(minBudget)}-${formatKSh(maxBudget)}`;
    setSavedSearches(prev => prev.includes(label) ? prev : [label, ...prev].slice(0, 4));
    showToast('Search preference saved for future job alerts.');
  };

  const extractCvInsights = (text: string, fileName: string) => {
    const source = `${text} ${fileName}`.toLowerCase();
    const detectedSkills = SKILL_OPTIONS
      .filter(skill => skill !== 'All Skills' && source.includes(skill.toLowerCase()))
      .slice(0, 5);
    const yearMatch = source.match(/(\d+)\+?\s*(years|yrs|year)/);
    const certifications = ['nca', 'epra', 'safety', 'osha']
      .filter(term => source.includes(term))
      .map(term => term.toUpperCase());
    const insights = [
      detectedSkills.length
        ? `Skills detected: ${detectedSkills.join(', ')}.`
        : `Skills inferred from profile: ${profileSkills.slice(0, 4).join(', ') || 'Add skills to improve parsing.'}`,
      yearMatch
        ? `Experience signal: ${yearMatch[1]} years mentioned in the CV.`
        : `Experience signal: ${completedJobs} completed Fundilink jobs currently strengthen your profile.`,
      certifications.length
        ? `Certification keywords found: ${certifications.join(', ')}.`
        : myProfile?.verified
          ? 'Certification signal: profile is already marked verified.'
          : 'Certification gap: upload licenses such as NCA or EPRA to improve trust.',
      'Employer-facing summary refreshed for matching and shortlist review.',
    ];
    setCvInsights(insights);
  };

  const handlePhotoUpload = (file?: File) => {
    if (!file || !currentUser) return;
    const reader = new FileReader();
    reader.onload = () => {
      const avatarUrl = String(reader.result);
      setPhotoPreview(avatarUrl);
      updateProfile(currentUser._id, { avatarUrl });
      showToast('Profile photo updated.');
    };
    reader.readAsDataURL(file);
  };

  const handleCvUpload = (file?: File) => {
    if (!file) return;
    setCvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      extractCvInsights(String(reader.result || ''), file.name);
      showToast('CV scanned and profile insights generated.');
    };
    reader.onerror = () => {
      extractCvInsights('', file.name);
      showToast('CV uploaded. Insights were inferred from the filename and current profile.');
    };
    reader.readAsText(file);
  };

  const handleRecommendAction = (job: Job) => {
    showToast(`Opening matching jobs. ${job.title} is ready for application review.`);
    onNavigate('jobs');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-7">
          <div className="space-y-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100">
                <Bot className="h-3.5 w-3.5 text-amber-300" />
                AI matching workspace
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Welcome back, {currentUser.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Jobs are ranked by skill fit, experience, location, pay compatibility, work preference, and hiring feedback signals.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Match score', value: `${topMatch?.score || 0}%`, icon: Target, tone: 'text-emerald-300' },
                { label: 'Profile views', value: profileViews, icon: Eye, tone: 'text-blue-300' },
                { label: 'Success rate', value: `${successRate}%`, icon: TrendingUp, tone: 'text-amber-300' },
                { label: 'Open skill matches', value: openSkillMatches, icon: Search, tone: 'text-cyan-300' },
              ].map(metric => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <Icon className={`h-4 w-4 ${metric.tone}`} />
                    <p className="mt-3 text-2xl font-black">{metric.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{metric.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Best recommendation</p>
                <h2 className="mt-1 text-lg font-black">{topMatch?.job.title || 'No active matches yet'}</h2>
              </div>
              <span className="rounded-md bg-emerald-400 px-2.5 py-1 text-xs font-black text-slate-950">{topMatch?.score || 0}%</span>
            </div>
            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <p className="flex items-center gap-2"><MapPinned className="h-3.5 w-3.5 text-blue-300" /> {topMatch?.job.county || editCounty} within {topMatch?.distance || 0} km match radius</p>
              <p className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5 text-amber-300" /> {formatKSh(topMatch?.job.budget || 0)} budget compatibility</p>
              <p className="flex items-center gap-2"><BriefcaseBusiness className="h-3.5 w-3.5 text-emerald-300" /> {topMatch?.workMode || 'Onsite'} with {topMatch?.companyType || 'Homeowner'} client type</p>
            </div>
            <button
              onClick={() => topMatch && handleRecommendAction(topMatch.job)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-blue-50"
            >
              <Send className="h-3.5 w-3.5" />
              Review recommended job
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <User className="h-4 w-4 text-[#005fec]" />
              Fundi profile
            </h2>
            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={photoPreview || myProfile?.avatarUrl}
                    alt={currentUser.name}
                    className="h-16 w-16 rounded-lg object-cover ring-2 ring-white"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900">Profile picture</p>
                    <p className="text-[11px] leading-4 text-slate-500">Used on search cards, applications, and employer shortlist views.</p>
                  </div>
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-800 ring-1 ring-slate-200 hover:bg-blue-50">
                  <Camera className="h-3.5 w-3.5 text-[#005fec]" />
                  Upload photo
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files?.[0])} className="hidden" />
                </label>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#005fec]" />
                  <div>
                    <p className="text-xs font-black text-slate-900">CV reader</p>
                    <p className="text-[11px] leading-4 text-slate-600">Upload a CV and Fundilink extracts useful matching details for employers.</p>
                  </div>
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-800 ring-1 ring-blue-100 hover:bg-blue-50">
                  <UploadCloud className="h-3.5 w-3.5 text-[#005fec]" />
                  Upload CV
                  <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={(e) => handleCvUpload(e.target.files?.[0])} className="hidden" />
                </label>
                {cvFileName && <p className="mt-2 truncate text-[10px] font-bold text-blue-700">{cvFileName}</p>}
                {cvInsights.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {cvInsights.map(insight => (
                      <p key={insight} className="rounded-md bg-white px-2 py-1.5 text-[11px] leading-4 text-slate-700">
                        {insight}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Bio
                <textarea rows={4} value={editBio} onChange={(e) => setEditBio(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case leading-5 tracking-normal text-slate-800 outline-none focus:border-[#005fec]" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Rate
                  <input type="number" value={editRate} onChange={(e) => setEditRate(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]" />
                </label>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  County
                  <select value={editCounty} onChange={(e) => setEditCounty(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]">
                    {COUNTIES.filter(c => c !== 'All Counties').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Skill stack
                <input type="text" value={editSkills} onChange={(e) => setEditSkills(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal text-slate-800 outline-none focus:border-[#005fec]" />
              </label>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#005fec] py-2.5 text-xs font-black text-white transition hover:bg-blue-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save profile
              </button>
              <button type="button" onClick={() => onNavigate('fundi-profile')}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-200">
                <Eye className="h-3.5 w-3.5" />
                View public profile
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-[#005fec]" />
              Smart filters
            </h2>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Location
                  <select value={filterCounty} onChange={(e) => setFilterCounty(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case tracking-normal text-slate-800">
                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Radius
                  <input type="range" min="10" max="250" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="mt-3 w-full" />
                  <span className="text-xs normal-case text-slate-700">{radius} km</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Min pay
                  <input type="number" value={minBudget} onChange={(e) => setMinBudget(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case text-slate-800" />
                </label>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Max pay
                  <input type="number" value={maxBudget} onChange={(e) => setMaxBudget(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs normal-case text-slate-800" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {['Any', 'Junior', 'Mid', 'Senior'].map(level => <option key={level}>{level}</option>)}
                </select>
                <select value={techStack} onChange={(e) => setTechStack(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {SKILL_OPTIONS.map(skill => <option key={skill}>{skill}</option>)}
                </select>
                <select value={workArrangement} onChange={(e) => setWorkArrangement(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {['Any', 'Onsite', 'Hybrid', 'Remote'].map(mode => <option key={mode}>{mode}</option>)}
                </select>
                <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {['Any', 'Homeowner', 'Contractor', 'Estate'].map(type => <option key={type}>{type}</option>)}
                </select>
              </div>
              <button onClick={handleSaveSearch} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-black text-slate-800 hover:bg-slate-50">
                <BookmarkPlus className="h-3.5 w-3.5 text-[#005fec]" />
                Save search preset
              </button>
              <div className="space-y-1">
                {savedSearches.map(search => (
                  <button key={search} onClick={() => showToast(`Loaded preset: ${search}`)} className="block w-full truncate rounded-md bg-slate-100 px-2 py-1.5 text-left text-[11px] font-bold text-slate-600 hover:bg-blue-50">
                    {search}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Zap className="h-4 w-4 text-[#005fec]" />
                  Personalized job recommendations
                </h2>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#005fec]">{filteredJobs.length} matches</span>
              </div>
              <div className="mt-4 space-y-3">
                {filteredJobs.slice(0, 4).map(({ job, matchedSkills, adjacentSkills, score, distance, level, workMode, companyType: type }) => (
                  <div key={job._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-black text-slate-900">{job.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">{job.employerName} / {type} / {job.county} / {distance} km</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-2xl font-black text-[#005fec]">{score}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">match</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...matchedSkills, ...adjacentSkills].map(skill => (
                        <span key={skill} className="rounded-md bg-white px-2 py-1 text-[10px] font-black text-slate-700 ring-1 ring-slate-200">{skill}</span>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-4">
                      <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-600" /> {formatKSh(job.budget)}</span>
                      <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-600" /> {level}</span>
                      <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-blue-600" /> {workMode}</span>
                      <button onClick={() => handleRecommendAction(job)} className="rounded-md bg-slate-900 px-3 py-1.5 font-black text-white">Apply</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Bot className="h-4 w-4 text-[#005fec]" />
                Matching engine
              </h2>
              <div className="mt-4 space-y-3">
                {parsedSkillGroups.map(group => (
                  <div key={group.category} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{group.category}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.skills.map((skill, index) => (
                        <span key={skill} className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
                          {skill} / {index === 0 ? 'Expert' : index === 1 ? 'Advanced' : 'Working'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <p className="font-black">Learning signals</p>
                  <p className="mt-1">Applications, accepts, rejects, and hiring outcomes tune future rankings.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Layers className="h-4 w-4 text-[#005fec]" />
                Application management
              </h2>
              <div className="mt-4 space-y-3">
                {myApps.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500">
                    No applications yet. <button onClick={() => onNavigate('jobs')} className="font-black text-[#005fec]">Browse jobs</button>
                  </div>
                ) : myApps.map(app => {
                  const job = jobs.find(j => j._id === app.jobId);
                  const reviewed = ['reviewed', 'interviewed', 'offered', 'hired', 'rejected'].includes(app.status);
                  const interviewed = ['interviewed', 'offered', 'hired'].includes(app.status);
                  const finalDecision = ['offered', 'hired', 'rejected'].includes(app.status);
                  const steps = [
                    { label: 'Applied', done: true, icon: Send },
                    { label: 'Reviewed', done: reviewed, icon: Eye },
                    { label: 'Interview', done: interviewed, icon: Video },
                    { label: app.status === 'rejected' ? 'Rejected' : 'Offered', done: finalDecision, icon: app.status === 'rejected' ? XCircle : CheckCircle2 },
                  ];

                  return (
                    <div key={app._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-900">{job?.title || 'Unknown job'}</h3>
                          <p className="mt-1 text-[11px] text-slate-500">{job?.county} / {formatKSh(job?.budget || 0)} / Applied {new Date(app.appliedAt).toLocaleDateString('en-KE')}</p>
                        </div>
                        <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${
                          app.status === 'hired' || app.status === 'offered' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          app.status === 'interviewed' || app.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>{app.status === 'hired' ? 'Hired' : app.status}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {steps.map(step => {
                          const StepIcon = step.icon;
                          return (
                            <div key={step.label} className={`rounded-lg p-2 text-center ${step.done ? 'bg-white text-slate-900 ring-1 ring-slate-200' : 'bg-slate-100 text-slate-400'}`}>
                              <StepIcon className="mx-auto h-4 w-4" />
                              <p className="mt-1 text-[10px] font-black">{step.label}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => onNavigate('messages')} className="flex items-center gap-1.5 rounded-md bg-[#005fec] px-3 py-1.5 text-[11px] font-black text-white">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Message
                        </button>
                        <span className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                          {app.status === 'pending' && 'Notification: your application was sent.'}
                          {app.status === 'reviewed' && 'Notification: employer is reviewing your profile.'}
                          {app.status === 'interviewed' && 'Notification: you are invited to interview.'}
                          {app.status === 'offered' && 'Notification: job offer received.'}
                          {app.status === 'hired' && 'Notification: hired. Escrow can be prepared.'}
                          {app.status === 'rejected' && 'Notification: application was not selected.'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <ClipboardCheck className="h-4 w-4 text-[#005fec]" />
                  Assessments and portfolio
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { title: 'Tile level challenge', meta: '92% pass likelihood', icon: ClipboardCheck },
                    { title: 'Safety compliance', meta: myProfile?.verified ? 'Verified' : 'Needs upload', icon: Shield },
                    { title: 'Portfolio showcase', meta: `${myProfile?.portfolioImages.length || 0} projects`, icon: FolderKanban },
                    { title: 'Referral incentive', meta: 'KSh 1,500 per hire', icon: Star },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-lg bg-slate-50 p-3">
                        <Icon className="h-4 w-4 text-[#005fec]" />
                        <p className="mt-2 text-xs font-black text-slate-900">{item.title}</p>
                        <p className="text-[11px] text-slate-500">{item.meta}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Bell className="h-4 w-4 text-[#005fec]" />
                  Notifications and reviews
                </h2>
                <div className="mt-4 space-y-2 text-xs">
                  <p className="rounded-lg bg-blue-50 p-3 text-blue-900">Email/SMS alerts are enabled for saved searches, match changes, and status updates.</p>
                  <p className="rounded-lg bg-slate-50 p-3 text-slate-700">Company review signal: {topMatch?.job.employerName || 'Employers'} averages 4.7/5 for pay reliability and site safety.</p>
                  <p className="rounded-lg bg-emerald-50 p-3 text-emerald-900">Candidate quality score shown to employers: {Math.min(99, 78 + Math.round((myProfile?.rating || 4.5) * 4))}%.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <BarChart3 className="h-4 w-4 text-[#005fec]" />
              Profile readiness
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="rounded-lg bg-slate-950 p-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Readiness score</p>
                <p className="mt-2 text-4xl font-black">{readinessScore}%</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">Complete the profile evidence employers use when shortlisting.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {readinessItems.map(item => (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-[10px] font-black ${item.done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.done ? 'Done' : 'Needed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { label: 'Profile views', value: profileViews, helper: 'Recorded public profile visits', icon: Eye },
                { label: 'Application success', value: `${successRate}%`, helper: `${hiredApplications}/${myApps.length} hired applications`, icon: TrendingUp },
                { label: 'Open skill matches', value: openSkillMatches, helper: 'Active jobs requiring your skills', icon: Search },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-4">
                    <Icon className="h-4 w-4 text-[#005fec]" />
                    <p className="mt-3 text-xl font-black text-slate-900">{item.value}</p>
                    <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.helper}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
