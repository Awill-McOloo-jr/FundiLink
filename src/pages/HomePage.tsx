import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, formatKSh } from '../db/schema';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Hammer,
  HardHat,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: 'jobs' | 'fundi-profile' | 'auth') => void;
  onSelectFundi: (id: string) => void;
  onFilterChange: (county: string, skill: string, query: string) => void;
}

const TRADE_GROUPS = [
  { name: 'Masonry and concrete', skills: ['Masonry', 'Concrete Mixing', 'Foundation Repair', 'Tile Fitting'], icon: Hammer },
  { name: 'Electrical and solar', skills: ['Electrical Wiring', 'Solar Installation', 'Fault Finding', 'Generator Setup'], icon: Sparkles },
  { name: 'Plumbing and drainage', skills: ['Plumbing', 'Drainage', 'Pipe Fitting', 'Water Heater Repair'], icon: ShieldCheck },
  { name: 'Carpentry and roofing', skills: ['Carpentry', 'Roofing', 'Cabinet Making', 'Wood Varnishing'], icon: HardHat },
];

export default function HomePage({ onNavigate, onSelectFundi, onFilterChange }: HomePageProps) {
  const { profiles, users } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('All Counties');

  const fundiProfiles = profiles.filter(profile => users.some(user => user._id === profile.userId && user.role === 'fundi'));
  const employerCount = users.filter(user => user.role === 'employer').length;
  const verifiedCount = fundiProfiles.filter(profile => profile.verified).length;
  const averageRate = fundiProfiles.length
    ? Math.round(fundiProfiles.reduce((sum, profile) => sum + profile.hourlyRate, 0) / fundiProfiles.length)
    : 0;

  const tradeStats = useMemo(() => TRADE_GROUPS.map(group => ({
    ...group,
    count: fundiProfiles.filter(profile => profile.skills.some(skill => group.skills.includes(skill))).length,
  })), [fundiProfiles]);

  const countyStats = useMemo(() => COUNTIES
    .filter(county => county !== 'All Counties')
    .map(county => ({
      county,
      count: fundiProfiles.filter(profile => profile.county === county).length,
      verified: fundiProfiles.filter(profile => profile.county === county && profile.verified).length,
    }))
    .filter(item => item.count > 0), [fundiProfiles]);

  const featuredFundis = [...fundiProfiles]
    .sort((a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs)
    .slice(0, 4);

  const handleSearch = () => {
    onFilterChange(selectedCounty, 'All Skills', searchQuery);
    onNavigate('jobs');
  };

  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-slate-900 lg:block">
          <img
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80"
            alt="Construction site"
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-slate-950/35" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#005fec]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified construction hiring in Kenya
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
              Connect with trusted fundis for every stage of your construction project.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Fundilink helps homeowners and contractors find available Kenyan tradespeople, compare verified profiles, and manage job applications without informal back-and-forth.
            </p>

            <div className="mt-7 rounded-lg border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/70">
              <div className="grid gap-2 md:grid-cols-[1fr_190px_150px]">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search masonry, plumbing, solar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-[#005fec]" />
                  <select
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                  >
                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <button
                  onClick={handleSearch}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#005fec] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  Search
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Available fundis', value: fundiProfiles.length, icon: UsersRound },
                { label: 'Verified profiles', value: verifiedCount, icon: BadgeCheck },
                { label: 'Employers', value: employerCount, icon: BriefcaseBusiness },
                { label: 'Avg hourly rate', value: formatKSh(averageRate), icon: Banknote },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Icon className="h-4 w-4 text-[#005fec]" />
                    <p className="mt-2 text-xl font-black text-slate-950">{item.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden items-end lg:flex">
            <div className="relative w-full rounded-lg border border-white/15 bg-white/10 p-4 text-white backdrop-blur-md">
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-100">Live profile snapshot</p>
              <div className="mt-4 space-y-3">
                {featuredFundis.slice(0, 3).map(profile => {
                  const user = users.find(u => u._id === profile.userId);
                  return (
                    <button
                      key={profile._id}
                      onClick={() => { onSelectFundi(profile.userId); onNavigate('fundi-profile'); }}
                      className="flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left text-slate-950 transition hover:bg-blue-50"
                    >
                      <img src={profile.avatarUrl} alt={user?.name || 'Fundi'} className="h-12 w-12 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">{user?.name || 'Fundi'}</span>
                        <span className="block truncate text-[11px] font-bold text-[#005fec]">{profile.skills.slice(0, 2).join(', ')}</span>
                      </span>
                      <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">{profile.rating}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#005fec]">Trade coverage</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Explore available trades from verified fundi profiles</h2>
          </div>
          <button onClick={() => onNavigate('jobs')} className="inline-flex items-center gap-2 text-sm font-black text-[#005fec]">
            View open jobs
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tradeStats.map(group => {
            const Icon = group.icon;
            return (
              <button
                key={group.name}
                onClick={() => { onFilterChange('All Counties', group.skills[0], ''); onNavigate('jobs'); }}
                className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#005fec] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#005fec]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{group.count} listed</span>
                </div>
                <h3 className="mt-4 font-black text-slate-950">{group.name}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{group.skills.join(', ')}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#005fec]">How it works</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">A cleaner hiring flow for both sides.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Employers create structured jobs. Fundis apply with profile evidence, CV details, portfolio images, and clear availability. The app keeps status, messaging, and M-Pesa steps visible.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: 'Post a scoped job', text: 'Budget, county, trade stack, timeline, and work arrangement.', icon: ClipboardList },
              { title: 'Compare fundis', text: 'Ratings, verification, past jobs, portfolio, and fit scores.', icon: Star },
              { title: 'Manage outcome', text: 'Shortlist, interview, hire, reject, and track application status.', icon: CheckCircle2 },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg bg-slate-50 p-4">
                  <Icon className="h-5 w-5 text-[#005fec]" />
                  <h3 className="mt-3 text-sm font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#005fec]">Featured fundis</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Available profiles from current data</h2>
              </div>
              <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-black text-slate-700">{fundiProfiles.length} total</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {featuredFundis.map(profile => {
                const user = users.find(u => u._id === profile.userId);
                if (!user) return null;
                return (
                  <button
                    key={profile._id}
                    onClick={() => { onSelectFundi(profile.userId); onNavigate('fundi-profile'); }}
                    className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#005fec] hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <img src={profile.avatarUrl} alt={user.name} className="h-14 w-14 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-950">{user.name}</h3>
                          {profile.verified && <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">Verified</span>}
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-[#005fec]">{profile.skills.join(', ')}</p>
                        <p className="mt-2 text-xs text-slate-500">{profile.county} / {formatKSh(profile.hourlyRate)}/hr / {profile.completedJobs} jobs</p>
                      </div>
                      <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {profile.rating}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-200">County availability</p>
            <div className="mt-4 space-y-2">
              {countyStats.map(item => (
                <button
                  key={item.county}
                  onClick={() => { onFilterChange(item.county, 'All Skills', ''); onNavigate('jobs'); }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-3 text-left transition hover:bg-white/15"
                >
                  <span>
                    <span className="block text-sm font-black">{item.county}</span>
                    <span className="block text-[11px] text-slate-400">{item.verified} verified</span>
                  </span>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-950">{item.count} fundis</span>
                </button>
              ))}
            </div>
            <button onClick={() => onNavigate('auth')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#005fec] px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700">
              Join Fundilink
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
