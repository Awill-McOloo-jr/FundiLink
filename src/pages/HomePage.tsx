import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES } from '../db/schema';
import { isFundiBadgeActive } from '../utils/verification';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  BrickWall,
  CheckCircle2,
  Droplets,
  Hammer,
  HardHat,
  LockKeyhole,
  MapPin,
  Search,
  Shield,
  ShieldCheck,
  Star,
  UsersRound,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
  onSelectFundi: (id: string) => void;
  onFilterChange: (county: string, skill: string, query: string) => void;
}

const quickFilters = ['Masonry', 'Electrical', 'Plumbing', 'Carpentry', 'Roofing'];

const tradeCategories: Array<{
  name: string;
  examples: string;
  skills: string[];
  icon: LucideIcon;
}> = [
  { name: 'Masonry & Concrete', examples: 'Block work, foundations', skills: ['Masonry', 'Concrete Mixing', 'Foundation Repair', 'Cabro Laying'], icon: BrickWall },
  { name: 'Electrical & Solar', examples: 'Wiring, solar systems', skills: ['Electrical Wiring', 'Solar Installation', 'Fault Finding'], icon: Zap },
  { name: 'Plumbing & Drainage', examples: 'Pipe fitting, leaks', skills: ['Plumbing', 'Drainage', 'Pipe Fitting'], icon: Droplets },
  { name: 'Carpentry & Roofing', examples: 'Cabinets, roof frames', skills: ['Carpentry', 'Roofing', 'Cabinet Making'], icon: Hammer },
];

const employerSteps = [
  { title: 'Post a Job', text: 'Describe the work, county, budget, timeline, and required trade.', icon: BriefcaseBusiness },
  { title: 'Browse Matched Fundis', text: 'Review recommended fundis by skills, location, portfolio, and ratings.', icon: Search },
  { title: 'Hire & Review', text: 'Choose the best fit, manage the work, and leave useful feedback.', icon: Star },
];

const fundiSteps = [
  { title: 'Create Profile', text: 'Add your photo, skills, CV, rate, portfolio, and verification evidence.', icon: HardHat },
  { title: 'Get Discovered', text: 'Employers find you through trade, county, and matching signals.', icon: BadgeCheck },
  { title: 'Get Hired & Paid', text: 'Apply, message employers, track outcomes, and build your reputation.', icon: CheckCircle2 },
];

const trustSignals = [
  { title: 'Verified Profiles', text: 'All fundis go through identity verification', icon: CheckCircle2 },
  { title: 'Rated & Reviewed', text: 'Real feedback from past employers', icon: Star },
  { title: 'Skilled & Vetted', text: 'Profiles include certifications and portfolio', icon: Shield },
  { title: 'Secure Payments', text: 'Milestone-based payment protection (coming soon)', icon: LockKeyhole },
];

const kenyaCountyPins = [
  { county: 'Nairobi', x: 169, y: 172 },
  { county: 'Mombasa', x: 221, y: 252 },
  { county: 'Kiambu', x: 158, y: 157 },
  { county: 'Kisumu', x: 74, y: 146 },
  { county: 'Nakuru', x: 121, y: 128 },
  { county: 'Eldoret', x: 103, y: 92 },
  { county: 'Machakos', x: 187, y: 190 },
  { county: 'Kajiado', x: 162, y: 225 },
];

export default function HomePage({ onNavigate, onSelectFundi, onFilterChange }: HomePageProps) {
  const { profiles, users } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('All Counties');
  const [selectedTrade, setSelectedTrade] = useState('');
  const [howItWorksRole, setHowItWorksRole] = useState<'employers' | 'fundis'>('employers');

  const fundiProfiles = useMemo(
    () => profiles.filter(profile => users.some(user => user._id === profile.userId && user.role === 'fundi')),
    [profiles, users]
  );

  const featuredFundis = useMemo(() => [...fundiProfiles]
    .sort((a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs)
    .slice(0, 3), [fundiProfiles]);

  const categoryCards = useMemo(() => tradeCategories.map(category => ({
    ...category,
    count: fundiProfiles.filter(profile => profile.skills.some(skill => category.skills.includes(skill))).length,
  })), [fundiProfiles]);

  const countyStats = useMemo(() => COUNTIES
    .filter(county => county !== 'All Counties')
    .map(county => ({
      county,
      count: fundiProfiles.filter(profile => profile.county === county).length,
      verified: fundiProfiles.filter(profile => profile.county === county && isFundiBadgeActive(profile, users.find(user => user._id === profile.userId))).length,
    }))
    .filter(item => item.count > 0), [fundiProfiles, users]);

  const scrollToSection = (target: string) => {
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearch = () => {
    const query = searchQuery.trim() || selectedTrade;
    onFilterChange(selectedCounty, selectedTrade || 'All Skills', query);
    onNavigate('jobs');
  };

  const handleChip = (trade: string) => {
    const nextTrade = selectedTrade === trade ? '' : trade;
    setSelectedTrade(nextTrade);
    setSearchQuery(nextTrade);
  };

  const startEmployerFlow = () => {
    onNavigate('auth');
  };

  const openCountyFundis = (county: string) => {
    onFilterChange(county, 'All Skills', '');
    onNavigate('fundis');
  };

  return (
    <div className="bg-white text-slate-950">
      <section className="relative min-h-[680px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1800&auto=format&fit=crop&q=85"
          alt="Kenyan construction project"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/55 to-black/30" />

        <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-orange-200 ring-1 ring-white/20 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-[#F97316]" />
              Verified tradespeople for Kenyan projects
            </span>
            <h1 className="mt-6 max-w-4xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Connect with trusted Fundis for every stage of your construction project.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-200">
              Find skilled local fundis by trade, county, proof of work, and availability. Post work, compare profiles, and move from enquiry to hire with less back-and-forth.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => scrollToSection('browse-fundis')}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] active:scale-95"
              >
                Find a Fundi
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={startEmployerFlow}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/70 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-[#F97316] hover:bg-[#F97316] active:scale-95"
              >
                Post a Job
              </button>
            </div>

            <div className="mt-9 max-w-3xl rounded-[2rem] bg-white p-2 shadow-2xl shadow-black/30">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-slate-50 px-4 py-3">
                  <Search className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search trade, e.g. masonry, roofing, solar"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                    className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-3 md:w-56">
                  <MapPin className="h-5 w-5 shrink-0 text-[#2563EB]" />
                  <select
                    value={selectedCounty}
                    onChange={(event) => setSelectedCounty(event.target.value)}
                    className="w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                  >
                    {COUNTIES.map(county => <option key={county} value={county}>{county}</option>)}
                  </select>
                </label>
                <button
                  onClick={handleSearch}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8] active:scale-95"
                >
                  Search
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickFilters.map(trade => (
                <button
                  key={trade}
                  onClick={() => handleChip(trade)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-xs font-black transition active:scale-95 ${
                    selectedTrade === trade
                      ? 'bg-[#F97316] text-white shadow-lg shadow-orange-950/20'
                      : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-[#F97316] hover:ring-[#F97316]'
                  }`}
                >
                  {trade}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100">
        <div className="mx-auto grid max-w-7xl divide-y divide-slate-200 px-4 py-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            ['500+', 'Registered Fundis'],
            ['47', 'Counties Covered'],
            ['20+', 'Trade Categories'],
            ['Free', 'to Post Jobs'],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-5 text-center">
              <p className="text-3xl font-black text-slate-950">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="role-selection" className="bg-slate-900 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white shadow-2xl shadow-black/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-[#60A5FA]">
              <BriefcaseBusiness className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-black">I need a Fundi</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Post a job, browse verified profiles, and hire the right tradesperson fast.
            </p>
            <button
              onClick={startEmployerFlow}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#2563EB] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] active:scale-95"
            >
              Post a Job
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-orange-400/25 bg-white/[0.04] p-6 text-white shadow-2xl shadow-black/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-[#F97316]">
              <HardHat className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-black">I am a Fundi</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Create your profile, showcase your skills, and get hired by verified employers.
            </p>
            <button
              onClick={() => onNavigate('auth')}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#F97316] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-orange-600 active:scale-95"
            >
              Create Profile
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#F97316]">Trade categories</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Find the right specialist for the work.</h2>
          </div>
          <button
            onClick={() => onNavigate('jobs')}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-black text-[#2563EB] transition hover:text-[#F97316]"
          >
            View all trades
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categoryCards.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.name}
                onClick={() => { onFilterChange('All Counties', category.skills[0], ''); onNavigate('jobs'); }}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-md active:scale-[0.99]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] transition group-hover:bg-orange-50 group-hover:text-[#F97316]">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-black text-slate-950">{category.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{category.examples}</p>
                <span className="mt-5 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#F97316]">
                  {category.count} Fundis available
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-blue-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#2563EB]">Trust signals</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Why Fundilink?</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trustSignals.map(signal => {
              const Icon = signal.icon;
              return (
                <div key={signal.title} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <Icon className="h-6 w-6 text-[#2563EB]" />
                  <h3 className="mt-4 text-base font-black text-slate-950">{signal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{signal.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#F97316]">How Fundilink Works</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">A smarter way to hire</h2>
          <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {[
              { key: 'employers' as const, label: 'For Employers' },
              { key: 'fundis' as const, label: 'For Fundis' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setHowItWorksRole(tab.key)}
                className={`cursor-pointer rounded-full px-5 py-2 text-sm font-black transition ${
                  howItWorksRole === tab.key ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:text-[#F97316]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-10 grid gap-5 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-8 hidden border-t-2 border-dashed border-slate-200 md:block" />
          {(howItWorksRole === 'employers' ? employerSteps : fundiSteps).map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white ring-8 ring-white">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mx-auto mt-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316] text-sm font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="browse-fundis" className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">Featured Fundis</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              A quick look at skilled profiles with photos, ratings, and portfolio-backed trades.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {featuredFundis.map(profile => {
              const user = users.find(item => item._id === profile.userId);
              const badgeActive = isFundiBadgeActive(profile, user);
              const primarySkill = profile.skills[0] || 'Fundi';
              const tradeColor = primarySkill.toLowerCase().includes('electrical') || primarySkill.toLowerCase().includes('solar')
                ? 'bg-blue-50 text-[#2563EB]'
                : primarySkill.toLowerCase().includes('plumbing') || primarySkill.toLowerCase().includes('drainage')
                  ? 'bg-emerald-50 text-emerald-700'
                  : primarySkill.toLowerCase().includes('carpentry') || primarySkill.toLowerCase().includes('roofing')
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-orange-50 text-[#F97316]';
              if (!user) return null;
              return (
                <article
                  key={profile._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <img src={profile.avatarUrl} alt={user.name} className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">{user.name}</h3>
                        {badgeActive && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <BadgeCheck className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${tradeColor}`}>
                        {primarySkill}
                      </span>
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
                        {profile.county}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-xs font-black text-[#F97316]">
                      <Star className="h-3 w-3 fill-[#F97316] text-[#F97316]" />
                      {profile.rating}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {profile.skills.slice(0, 3).map(skill => (
                      <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => { onSelectFundi(profile.userId); onNavigate('fundi-profile'); }}
                    className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-[#2563EB] active:scale-95"
                  >
                    View Profile
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => onNavigate('fundis')}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] active:scale-95"
            >
              Browse All Fundis
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section id="counties" className="bg-slate-900 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-orange-300">Kenya coverage</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Available across Kenya</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              County-first search helps homeowners and contractors find fundis close enough to visit site, quote accurately, and start faster.
            </p>
            <svg viewBox="0 0 320 320" className="mt-8 h-80 w-full text-[#F97316]" role="img" aria-label="Kenya service map with active Fundilink counties">
              <defs>
                <linearGradient id="kenya-map-fill" x1="60" x2="260" y1="20" y2="290" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F97316" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#2563EB" stopOpacity="0.14" />
                </linearGradient>
              </defs>
              <path
                d="M172 18 215 39 247 73 276 123 259 161 272 205 239 235 225 269 182 290 142 278 109 254 83 224 63 184 46 143 57 105 82 76 105 43 141 31Z"
                fill="url(#kenya-map-fill)"
                stroke="#F97316"
                strokeLinejoin="round"
                strokeWidth="4"
              />
              <path d="M82 76 120 127 98 179 134 236 184 248 229 220 220 160 244 119 214 78 171 58 139 100 113 71" fill="none" stroke="white" strokeDasharray="7 9" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M57 105 111 125 150 95 210 119 259 161M83 224 134 236 162 225 184 248M46 143 98 179 169 172 220 160" fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="2" />
              {kenyaCountyPins.map(pin => {
                const stat = countyStats.find(item => item.county === pin.county);
                if (!stat) return null;
                return (
                  <g
                    key={pin.county}
                    role="button"
                    tabIndex={0}
                    onClick={() => openCountyFundis(pin.county)}
                    onKeyDown={(event) => event.key === 'Enter' && openCountyFundis(pin.county)}
                    className="cursor-pointer outline-none"
                  >
                    <circle cx={pin.x} cy={pin.y} r="16" fill="#22C55E" opacity="0.14" />
                    <circle cx={pin.x} cy={pin.y} r="7" fill="#22C55E" stroke="#ECFDF5" strokeWidth="2" />
                    <text x={pin.x + 12} y={pin.y + 4} fill="white" fontSize="10" fontWeight="800">
                      {pin.county}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {countyStats.map(item => (
                <button
                  key={item.county}
                  onClick={() => openCountyFundis(item.county)}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#F97316] hover:bg-white/[0.09] active:scale-[0.99]"
                >
                  <span>
                    <span className="block font-black text-white">{item.county}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-400">
                      <UsersRound className="h-3.5 w-3.5 text-[#F97316]" />
                      {item.count} fundis listed
                    </span>
                  </span>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">ACTIVE</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => onNavigate('auth')}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-[#F97316] hover:text-white active:scale-95"
            >
              Don't see your county? Join the waitlist
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-orange-300">Ready when the site is ready</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Bring the right fundi into the job faster.</h2>
          </div>
          <button onClick={() => onNavigate('auth')} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#F97316] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-orange-600 active:scale-95">
            Get Started
            <Wrench className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
