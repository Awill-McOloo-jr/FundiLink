import { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  Hammer,
  HardHat,
  Ruler,
  ShieldCheck,
  Wrench,
  Zap,
} from 'lucide-react';

const officialReferences = [
  {
    title: 'National Building Code 2024',
    body: 'Use this as the main reference for building control, materials, layouts, safety, and compliance expectations in Kenya.',
    href: 'https://www.nca.go.ke/building-code',
    tag: 'NCA',
  },
  {
    title: 'Kenya Law building code text',
    body: 'Legal text of the National Building Code, useful when a client, architect, or inspector asks for the source regulation.',
    href: 'https://new.kenyalaw.org/akn/ke/act/ln/2024/47/eng@2024-03-01',
    tag: 'Kenya Law',
  },
  {
    title: 'NCA project registration',
    body: 'Construction projects must be registered through the Authority where applicable. Confirm the project status before starting major works.',
    href: 'https://www.nca.go.ke/project-registration',
    tag: 'NCA',
  },
  {
    title: 'NCA worker accreditation',
    body: 'Skilled construction workers and site supervisors can be accredited by NCA. Keep your card current and visible on serious sites.',
    href: 'https://www.nca.go.ke/whole-story/MAC160810',
    tag: 'NCA',
  },
  {
    title: 'KEBS standards portal',
    body: 'Check Kenya Standards and gazetted standards for materials, products, and workmanship references.',
    href: 'https://standards.kebs.go.ke/',
    tag: 'KEBS',
  },
  {
    title: 'EPRA electricity requirements',
    body: 'Electrical installation work and electrical contractors are regulated through EPRA licensing requirements.',
    href: 'https://epra.go.ke/electricity-1',
    tag: 'EPRA',
  },
  {
    title: 'DOSHS workplace safety',
    body: 'The Directorate of Occupational Safety and Health Services handles workplace safety oversight in Kenya.',
    href: 'https://www.labour.go.ke/occupational-safety-and-health-services',
    tag: 'Safety',
  },
  {
    title: 'Work Injury Benefits Act',
    body: 'Reference for work injury compensation duties and worker protection when accidents happen during work.',
    href: 'https://new.kenyalaw.org/akn/ke/act/2007/13/eng@2007-11-09',
    tag: 'WIBA',
  },
];

const complianceCards = [
  {
    title: 'Before starting work',
    icon: ClipboardCheck,
    points: [
      'Confirm the client has drawings, approvals, and site access where the job requires them.',
      'Write down scope, rate, materials owner, start date, handover date, and payment milestones.',
      'Take before photos, agree on measurements, and record any existing damage.',
    ],
  },
  {
    title: 'NCA and permits',
    icon: BadgeCheck,
    points: [
      'Work under an NCA registered contractor for regulated construction projects.',
      'Ask whether the project is registered with NCA before major structural or building works.',
      'Keep your NCA accreditation, trade certificates, and supervisor contacts ready.',
    ],
  },
  {
    title: 'Standards and materials',
    icon: Ruler,
    points: [
      'Use KEBS/KS compliant materials where standards apply.',
      'If drawings mention BS or EN standards, ask the architect or engineer for the exact specification.',
      'Reject weak blocks, poor cement storage, wrong cable sizes, or unapproved substitutions.',
    ],
  },
  {
    title: 'Site safety',
    icon: ShieldCheck,
    points: [
      'Use PPE: helmet, boots, gloves, eye protection, harness where needed, and dust mask for cutting or grinding.',
      'Do a quick risk check before ladders, scaffolds, live power, excavation, welding, and roof work.',
      'Report injuries immediately and keep evidence for WIBA or employer insurance follow-up.',
    ],
  },
];

const documentWallet = [
  'National ID and KRA PIN',
  'NCA accreditation card or certificate',
  'Trade certificates and assessment results',
  'EPRA licence for electrical installation work',
  'Portfolio photos with location, date, and scope',
  'Written quotation, measurements, and material list',
  'Receipts, delivery notes, and client sign-off',
  'Emergency contact and basic insurance details',
];

const dailyChecklist = [
  'Walk the site and identify hazards before tools come out.',
  'Confirm materials, measurements, and client changes in writing.',
  'Keep walkways clear and protect finished surfaces.',
  'Photograph hidden work before covering it: pipes, conduits, reinforcement, waterproofing.',
  'Clean up, record progress, and agree on the next milestone before leaving.',
];

const tradePlaybooks = [
  {
    title: 'Masonry and concrete',
    skills: ['Masonry', 'Concrete Mixing', 'Foundation Repair', 'Cabro Laying'],
    icon: HardHat,
    tips: ['Check lines, levels, curing, mix ratios, and foundation bearing before speed.', 'Never close work before reinforcement and dimensions are inspected.'],
  },
  {
    title: 'Electrical and solar',
    skills: ['Electrical Wiring', 'Solar Installation', 'Fault Finding', 'Generator Setup', 'CCTV Installation'],
    icon: Zap,
    tips: ['Confirm EPRA licensing requirements for installation work.', 'Label circuits, test earthing, isolate supply, and document load changes.'],
  },
  {
    title: 'Plumbing and drainage',
    skills: ['Plumbing', 'Drainage', 'Pipe Fitting', 'Water Heater Repair'],
    icon: Wrench,
    tips: ['Pressure test before closing walls or floors.', 'Confirm pipe class, slope, traps, inspection points, and waterproofing handover.'],
  },
  {
    title: 'Carpentry and roofing',
    skills: ['Carpentry', 'Roofing', 'Cabinet Making', 'Wood Varnishing'],
    icon: Hammer,
    tips: ['Confirm timber treatment, anchorage, spacing, and roof fall before installation.', 'Use drawings or site measurements signed off by the client.'],
  },
  {
    title: 'Finishes and painting',
    skills: ['Painting', 'Gypsum Ceiling', 'Wall Texturing', 'Waterproofing', 'Tile Fitting'],
    icon: FileCheck2,
    tips: ['Prepare surfaces properly before finish coats.', 'Agree sample colour, tile layout, expansion gaps, and waterproofing test before final work.'],
  },
];

export default function FundiKnowledgePage() {
  const { currentUser, profiles } = useAuth();
  const myProfile = currentUser ? profiles.find(profile => profile.userId === currentUser._id) : undefined;
  const skills = myProfile?.skills || [];

  const suggestedPlaybooks = useMemo(() => {
    const matched = tradePlaybooks.filter(playbook =>
      playbook.skills.some(skill => skills.includes(skill))
    );
    return matched.length ? matched : tradePlaybooks.slice(0, 3);
  }, [skills]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-100">
              <BookOpenCheck className="h-3.5 w-3.5 text-amber-300" />
              Fundi guide
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Know the rules before you touch the site.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              A simple field guide for Kenyan fundis: compliance, safety, standards, documentation, and trade habits that protect your work and help clients trust you.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Today&apos;s site focus</p>
            <div className="mt-3 space-y-2">
              {dailyChecklist.slice(0, 4).map(item => (
                <div key={item} className="flex gap-2 rounded-lg bg-slate-900/70 p-3 text-xs leading-5 text-slate-300 ring-1 ring-white/10">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {complianceCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#005fec]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-sm font-black text-slate-900">{card.title}</h2>
              <div className="mt-3 space-y-2">
                {card.points.map(point => (
                  <p key={point} className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">{point}</p>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <main className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Hammer className="h-4 w-4 text-[#005fec]" />
              Trade playbooks
            </h2>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#005fec]">
              {skills.length ? 'Based on your skills' : 'Starter picks'}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {suggestedPlaybooks.map(playbook => {
              const Icon = playbook.icon;
              return (
                <div key={playbook.title} className="rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#005fec] ring-1 ring-slate-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{playbook.title}</h3>
                      <p className="text-[11px] text-slate-500">{playbook.skills.slice(0, 3).join(', ')}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {playbook.tips.map(tip => (
                      <p key={tip} className="text-xs leading-5 text-slate-600">{tip}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <FileCheck2 className="h-4 w-4 text-[#005fec]" />
            Document wallet
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Keep these ready so employers can verify you quickly.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {documentWallet.map(item => (
              <div key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <ShieldCheck className="h-4 w-4 text-[#005fec]" />
              Official references
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Use these links for current official wording. Fundilink summaries are practical guidance, not a substitute for county, NCA, EPRA, KEBS, or professional advice.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Confirm project-specific rules before starting.
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {officialReferences.map(reference => (
            <a
              key={reference.href}
              href={reference.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#005fec] ring-1 ring-slate-200">{reference.tag}</span>
                <ExternalLink className="h-4 w-4 text-slate-400 transition group-hover:text-[#005fec]" />
              </div>
              <h3 className="mt-3 text-sm font-black text-slate-900">{reference.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{reference.body}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
