import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { COUNTIES, formatKSh, type Profile, type User } from '../db/schema';
import { isFundiBadgeActive } from '../utils/verification';
import {
  ArrowRight,
  BadgeCheck,
  BrickWall,
  Droplets,
  Hammer,
  MapPin,
  Search,
  Star,
  UserRoundSearch,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface FundisDirectoryPageProps {
  onNavigate: (page: string) => void;
  onSelectFundi: (id: string) => void;
  initialCounty?: string;
}

type DirectoryCategory = {
  name: string;
  description: string;
  skills: string[];
  icon: LucideIcon;
  accent: string;
};

const FUNDIS_PER_PAGE = 12;

const directoryCategories: DirectoryCategory[] = [
  {
    name: 'Masonry & Concrete',
    description: 'Foundations, block work, cabro, plastering, and structural concrete.',
    skills: ['Masonry', 'Concrete Mixing', 'Foundation Repair', 'Tile Fitting', 'Cabro Laying'],
    icon: BrickWall,
    accent: 'text-[#F97316] bg-orange-50',
  },
  {
    name: 'Electrical & Solar',
    description: 'Wiring, solar, backup power, fault tracing, and small site systems.',
    skills: ['Electrical Wiring', 'Solar Installation', 'Fault Finding', 'Generator Setup', 'CCTV Installation'],
    icon: Zap,
    accent: 'text-[#2563EB] bg-blue-50',
  },
  {
    name: 'Plumbing & Drainage',
    description: 'Pipework, leaks, drainage, water heaters, and site water supply.',
    skills: ['Plumbing', 'Drainage', 'Pipe Fitting', 'Water Heater Repair'],
    icon: Droplets,
    accent: 'text-emerald-700 bg-emerald-50',
  },
  {
    name: 'Carpentry & Roofing',
    description: 'Cabinets, joinery, roofing timber, finishes, and repair work.',
    skills: ['Carpentry', 'Roofing', 'Cabinet Making', 'Wood Varnishing'],
    icon: Hammer,
    accent: 'text-amber-700 bg-amber-50',
  },
];

function categoryForProfile(profile: Profile): DirectoryCategory {
  return directoryCategories.find(category =>
    profile.skills.some(skill => category.skills.includes(skill))
  ) || {
    name: 'General Construction',
    description: 'Painting, gypsum, welding, HVAC, landscaping, and specialist site work.',
    skills: profile.skills,
    icon: UserRoundSearch,
    accent: 'text-slate-700 bg-slate-100',
  };
}

function FundiCard({
  profile,
  user,
  category,
  onOpen,
}: {
  profile: Profile;
  user: User;
  category: DirectoryCategory;
  onOpen: () => void;
}) {
  const badgeActive = isFundiBadgeActive(profile, user);

  return (
    <article className="group flex min-h-[250px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-lg">
      <div className="flex items-start gap-3">
        <img src={profile.avatarUrl} alt={user.name} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-black text-slate-950">{user.name}</h3>
            {badgeActive && (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" title="Verified fundi">
                <BadgeCheck className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <span className={`mt-2 inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[10px] font-black ${category.accent}`}>
            {category.name}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-xs font-black text-[#F97316]">
          <Star className="h-3 w-3 fill-[#F97316] text-[#F97316]" />
          {profile.rating}
        </span>
      </div>

      <p className="mt-3 max-h-10 overflow-hidden text-sm leading-5 text-slate-600">{profile.bio}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.skills.slice(0, 3).map(skill => (
          <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
          {profile.county}
        </span>
        <span>{formatKSh(profile.hourlyRate)}/hr</span>
      </div>

      <button
        onClick={onOpen}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition group-hover:bg-[#2563EB] active:scale-95"
      >
        View Profile
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

export default function FundisDirectoryPage({ onNavigate, onSelectFundi, initialCounty = 'All Counties' }: FundisDirectoryPageProps) {
  const { profiles, users } = useAuth();
  const [query, setQuery] = useState('');
  const [county, setCounty] = useState(initialCounty);
  const [category, setCategory] = useState('All Specialisations');
  const [page, setPage] = useState(1);

  const fundis = useMemo(() => profiles
    .map(profile => ({ profile, user: users.find(item => item._id === profile.userId) }))
    .filter((item): item is { profile: Profile; user: User } => Boolean(item.user && item.user.role === 'fundi')),
    [profiles, users]
  );

  const categoryStats = useMemo(() => {
    return directoryCategories.map(item => ({
      ...item,
      count: fundis.filter(({ profile }) => categoryForProfile(profile).name === item.name).length,
    }));
  }, [fundis]);

  const filteredFundis = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    return fundis.filter(({ profile, user }) => {
      const countyOk = county === 'All Counties' || profile.county === county;
      const categoryOk = category === 'All Specialisations' || categoryForProfile(profile).name === category;
      const text = `${user.name} ${profile.bio} ${profile.skills.join(' ')} ${profile.county}`.toLowerCase();
      const queryOk = !queryText || text.includes(queryText);
      return countyOk && categoryOk && queryOk;
    });
  }, [category, county, fundis, query]);

  useEffect(() => {
    setPage(1);
  }, [category, county, query]);

  useEffect(() => {
    setCounty(initialCounty);
  }, [initialCounty]);

  const totalPages = Math.max(1, Math.ceil(filteredFundis.length / FUNDIS_PER_PAGE));
  const pagedFundis = filteredFundis.slice((page - 1) * FUNDIS_PER_PAGE, page * FUNDIS_PER_PAGE);
  const visibleStart = filteredFundis.length ? (page - 1) * FUNDIS_PER_PAGE + 1 : 0;
  const visibleEnd = Math.min(page * FUNDIS_PER_PAGE, filteredFundis.length);

  const openProfile = (userId: string) => {
    onSelectFundi(userId);
    onNavigate('fundi-profile');
  };

  return (
    <div className="bg-slate-50">
      <section className="bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-black uppercase tracking-widest text-orange-300">Fundi directory</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_480px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Browse fundis by specialisation.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Find Kenyan fundis by trade, county, skills, rating, and profile evidence. Cards stay compact so you can compare more people quickly.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_170px]">
                <label className="flex items-center gap-2 rounded-full bg-white px-4 py-3 text-slate-950">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search skill or trade"
                    className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  />
                </label>
                <select
                  value={county}
                  onChange={(event) => setCounty(event.target.value)}
                  className="rounded-full bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none"
                >
                  {COUNTIES.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_260px]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {categoryStats.map(item => {
              const Icon = item.icon;
              const active = category === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setCategory(active ? 'All Specialisations' : item.name)}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-[#2563EB] hover:shadow-md active:scale-[0.99] ${
                    active ? 'border-[#2563EB] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.accent}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950">{item.name}</span>
                    <span className="text-xs font-bold text-slate-500">{item.count} available</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Specialisation</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-950 outline-none transition focus:border-[#2563EB]"
            >
              <option>All Specialisations</option>
              {directoryCategories.map(item => <option key={item.name}>{item.name}</option>)}
              <option>General Construction</option>
            </select>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#2563EB]">Available fundis</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {category === 'All Specialisations' ? 'All specialisations' : category}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Showing {visibleStart}-{visibleEnd} of {filteredFundis.length}
              </span>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-[#F97316]">
                {FUNDIS_PER_PAGE} per page
              </span>
            </div>
          </div>

          {pagedFundis.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedFundis.map(({ profile, user }) => (
                <FundiCard
                  key={profile._id}
                  profile={profile}
                  user={user}
                  category={categoryForProfile(profile)}
                  onOpen={() => openProfile(user._id)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center">
              <UserRoundSearch className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="mt-3 font-black text-slate-950">No fundis match these filters yet.</h3>
              <p className="mt-1 text-sm text-slate-500">Try a different county, trade, or search term.</p>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page === 1}
                className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="cursor-pointer rounded-full bg-[#2563EB] px-4 py-2 text-sm font-black text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
