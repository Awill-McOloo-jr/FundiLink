// ============================================================================
// FUNDILINK CONVEX DATABASE SCHEMA
// Tables: users, profiles, jobs, applications, messages, reviews, payments
// ============================================================================

// ── ENUM TYPES ──────────────────────────────────────────────────────────────
export type UserRole = 'fundi' | 'employer' | 'admin';
export type JobStatus = 'active' | 'completed' | 'flagged' | 'cancelled';
export type ApplicationStatus = 'pending' | 'reviewed' | 'interviewed' | 'offered' | 'hired' | 'rejected' | 'withdrawn';
export type PaymentStatus = 'pending' | 'escrowed' | 'released' | 'refunded' | 'failed';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export const JOB_CATEGORIES = [
  'All Categories',
  'Electrical Works',
  'Building Construction',
  'Solar Installation',
  'Borehole Drilling',
  'Plumbing & Drainage',
  'Carpentry & Joinery',
  'Painting & Finishing',
  'Roofing',
  'Tiling & Flooring',
  'Welding & Fabrication',
  'HVAC & Refrigeration',
  'Security & CCTV',
  'Landscaping',
] as const;

export type JobCategory = Exclude<(typeof JOB_CATEGORIES)[number], 'All Categories'>;

// ── TABLE: users ────────────────────────────────────────────────────────────
// Indexes: byEmail (unique), byRole, byPhone
export interface User {
  _id: string;
  email: string;           // unique, indexed
  role: UserRole;          // indexed
  name: string;
  phone: string;           // +254 prefixed
  avatarUrl?: string;
  verified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'verified';
  verificationDocuments?: string[];
  passwordHash: string;    // bcrypt hash (simulated)
  otpCode?: string;        // 6-digit OTP (simulated)
  otpExpiry?: number;      // Unix timestamp
  isSuspended: boolean;
  createdAt: number;       // Unix ms
  updatedAt: number;
}

// ── TABLE: profiles ─────────────────────────────────────────────────────────
// Relationship: userId → users._id (1:1)
// Indexes: byUserId (unique), byCounty, bySkill, byRating
export interface Profile {
  _id: string;
  userId: string;          // FK → users._id
  bio: string;
  skills: string[];        // indexed (array index)
  county: string;          // indexed
  hourlyRate: number;      // KSh
  avatarUrl: string;
  cvFileName?: string;
  cvFileUrl?: string;
  cvMimeType?: string;
  cvInsights?: string[];
  verificationDocuments?: string[];
  verificationStatus?: 'unverified' | 'pending' | 'verified';
  portfolioImages: string[];
  rating: number;          // 0.0–5.0, indexed
  completedJobs: number;
  verified: boolean;       // NCA/EPRA vetted
  availability: 'available' | 'busy' | 'offline';
  createdAt: number;
  updatedAt: number;
}

// ── TABLE: jobs ─────────────────────────────────────────────────────────────
// Relationship: employerId → users._id
// Indexes: byEmployer, byCounty, bySkill, byStatus, byBudget, byDeadline
export interface ProfileViewEvent {
  _id: string;
  fundiId: string;
  viewerId?: string;
  viewerName: string;
  viewerRole: UserRole | 'guest';
  viewerAvatarUrl?: string;
  viewedAt: number;
}

export interface Job {
  _id: string;
  employerId: string;      // FK → users._id
  employerName: string;    // denormalized for display
  title: string;
  category?: JobCategory;
  description: string;
  skills: string[];        // indexed (array index)
  county: string;          // indexed
  budget: number;          // KSh, indexed
  status: JobStatus;       // indexed
  deadline: string;        // ISO date
  applicationsCount: number;
  createdAt: number;
  updatedAt: number;
}

// ── TABLE: applications ─────────────────────────────────────────────────────
// Relationships: jobId → jobs._id, fundiId → users._id
// Indexes: byJob, byFundi, byStatus, byJobAndFundi (compound unique)
export interface Application {
  _id: string;
  jobId: string;           // FK → jobs._id
  fundiId: string;         // FK → users._id
  fundiName: string;       // denormalized
  fundiSkill: string;      // primary skill at time of application
  fundiRating: number;     // snapshot at time of application
  coverLetter: string;
  status: ApplicationStatus;
  appliedAt: number;
  updatedAt: number;
}

// ── TABLE: messages ─────────────────────────────────────────────────────────
// Relationships: senderId → users._id, receiverId → users._id
// Indexes: byConversation, bySender, byReceiver, byTimestamp
export interface Message {
  _id: string;
  senderId: string;        // FK → users._id
  receiverId: string;      // FK → users._id
  content: string;
  read: boolean;
  status: MessageStatus;
  conversationId: string;  // compound: sorted "userIdA_userIdB"
  createdAt: number;
}

// ── TABLE: reviews ──────────────────────────────────────────────────────────
// Relationships: reviewerId → users._id, revieweeId → users._id, jobId → jobs._id
// Indexes: byReviewee, byReviewer, byJob
export interface Review {
  _id: string;
  reviewerId: string;      // FK → users._id
  reviewerName: string;    // denormalized
  revieweeId: string;      // FK → users._id
  jobId: string;           // FK → jobs._id
  rating: number;          // 1–5
  comment: string;
  createdAt: number;
}

// ── TABLE: payments ─────────────────────────────────────────────────────────
// Relationships: jobId → jobs._id, employerId → users._id, fundiId → users._id
// Indexes: byJob, byEmployer, byFundi, byStatus
export interface Payment {
  _id: string;
  jobId: string;           // FK → jobs._id
  employerId: string;      // FK → users._id
  fundiId: string;         // FK → users._id
  amount: number;          // KSh
  platformFee: number;     // 2% of amount
  status: PaymentStatus;
  mpesaReceiptNumber?: string;
  mpesaTransactionId?: string;
  createdAt: number;
  releasedAt?: number;
}

// ============================================================================
// SEED DATA — Kenyan market realistic examples
// ============================================================================

const now = Date.now();
const day = 86400000;

export const USER_AVATAR_POOL = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&h=160&fit=crop&crop=face&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=face&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop&crop=face&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&h=160&fit=crop&crop=face&q=80',
];

export function defaultAvatarForUser(role: UserRole, name = '') {
  const offset = role === 'fundi' ? 0 : role === 'employer' ? 2 : 5;
  const nameScore = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return USER_AVATAR_POOL[(nameScore + offset) % USER_AVATAR_POOL.length];
}

export const SEED_USERS: User[] = [
  { _id: 'u_fundi_1', email: 'kamau.mason@gmail.com', role: 'fundi', name: 'John Kamau', phone: '+254712345678', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: false, verificationStatus: 'unverified', verificationDocuments: [], createdAt: now - 90*day, updatedAt: now - 2*day },
  { _id: 'u_fundi_2', email: 'mwangi.plumber@yahoo.com', role: 'fundi', name: 'Peter Mwangi', phone: '+254722111222', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: false, verificationStatus: 'unverified', verificationDocuments: [], createdAt: now - 60*day, updatedAt: now - 5*day },
  { _id: 'u_fundi_3', email: 'amina.electric@gmail.com', role: 'fundi', name: 'Amina Onyango', phone: '+254733444555', avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: false, verificationStatus: 'unverified', verificationDocuments: [], createdAt: now - 45*day, updatedAt: now - 1*day },
  { _id: 'u_fundi_4', email: 'njeri.carpentry@outlook.com', role: 'fundi', name: 'Grace Njeri', phone: '+254701999888', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: false, verificationStatus: 'unverified', verificationDocuments: [], createdAt: now - 30*day, updatedAt: now - 3*day },
  { _id: 'u_fundi_5', email: 'kipchoge.paint@gmail.com', role: 'fundi', name: 'Eliud Kipchoge', phone: '+254710555666', avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: false, verificationStatus: 'unverified', verificationDocuments: [], createdAt: now - 20*day, updatedAt: now - 1*day },
  { _id: 'u_emp_1', email: 'fatma.homes@gmail.com', role: 'employer', name: 'Fatma Juma', phone: '+254724888999', avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: true, verificationStatus: 'verified', verificationDocuments: ['kra-pin-fatma-homes.pdf', 'id-check-fatma-juma.pdf'], createdAt: now - 120*day, updatedAt: now - 1*day },
  { _id: 'u_emp_2', email: 'david.contractors@gmail.com', role: 'employer', name: 'David Kiprop', phone: '+254799777666', avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: true, verificationStatus: 'verified', verificationDocuments: ['business-registration-kiprop-contractors.pdf', 'kra-pin-david-kiprop.pdf'], createdAt: now - 80*day, updatedAt: now - 2*day },
  { _id: 'u_emp_3', email: 'wanjiku.estates@gmail.com', role: 'employer', name: 'Wanjiku Maina', phone: '+254711222333', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: false, verificationStatus: 'pending', verificationDocuments: ['property-manager-letter-wanjiku.pdf'], createdAt: now - 40*day, updatedAt: now - 7*day },
  { _id: 'u_admin_1', email: 'moderator@fundilink.co.ke', role: 'admin', name: 'Admin Chief', phone: '+254700000000', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face&q=80', passwordHash: '$2b$10$simulated', isSuspended: false, verified: false, verificationStatus: 'unverified', verificationDocuments: [], createdAt: now - 365*day, updatedAt: now },
];

export const SEED_PROFILES: Profile[] = [
  { _id: 'p_1', userId: 'u_fundi_1', bio: 'Professional mason with 8+ years experience in foundation laying, bricklaying, and plastering for residential bungalows across Nairobi and Kiambu. NCA-certified.', skills: ['Masonry', 'Concrete Mixing', 'Tile Fitting', 'Foundation Repair'], county: 'Nairobi', hourlyRate: 450, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face&q=80', portfolioImages: ['https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400&auto=format&fit=crop&q=80'], rating: 4.9, completedJobs: 34, verified: true, availability: 'available', createdAt: now - 90*day, updatedAt: now - 2*day },
  { _id: 'p_2', userId: 'u_fundi_2', bio: 'Certified plumber expert in drainage unblocking, water meter installation, and modern PEX piping. Fast response time around Mombasa and coastal areas.', skills: ['Plumbing', 'Drainage', 'Pipe Fitting', 'Water Heater Repair'], county: 'Mombasa', hourlyRate: 400, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face&q=80', portfolioImages: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&auto=format&fit=crop&q=80'], rating: 4.7, completedJobs: 21, verified: true, availability: 'available', createdAt: now - 60*day, updatedAt: now - 5*day },
  { _id: 'p_3', userId: 'u_fundi_3', bio: 'EPRA-certified domestic electrician specializing in smart home wiring, solar panel installation, distribution board setup, and safety auditing across Kisumu and western Kenya.', skills: ['Electrical Wiring', 'Solar Installation', 'Fault Finding', 'Generator Setup'], county: 'Kisumu', hourlyRate: 500, avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&h=160&fit=crop&crop=face&q=80', portfolioImages: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80'], rating: 4.8, completedJobs: 19, verified: true, availability: 'busy', createdAt: now - 45*day, updatedAt: now - 1*day },
  { _id: 'p_4', userId: 'u_fundi_4', bio: 'Custom furniture craftsman and roof framework carpenter. Bespoke designs for wardrobes, kitchen cabinets, and sturdy roofing rafters. Based in Kiambu with county-wide service.', skills: ['Carpentry', 'Roofing', 'Cabinet Making', 'Wood Varnishing'], county: 'Kiambu', hourlyRate: 420, avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=face&q=80', portfolioImages: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&auto=format&fit=crop&q=80'], rating: 5.0, completedJobs: 12, verified: false, availability: 'available', createdAt: now - 30*day, updatedAt: now - 3*day },
  { _id: 'p_5', userId: 'u_fundi_5', bio: 'Professional painter and gypsum ceiling artist. Specializing in interior/exterior finishing, decorative textures, and modern gypsum board designs for commercial and residential spaces.', skills: ['Painting', 'Gypsum Ceiling', 'Wall Texturing', 'Waterproofing'], county: 'Nakuru', hourlyRate: 380, avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&h=160&fit=crop&crop=face&q=80', portfolioImages: [], rating: 4.6, completedJobs: 8, verified: false, availability: 'available', createdAt: now - 20*day, updatedAt: now - 1*day },
];

export const SEED_JOBS: Job[] = [
  { _id: 'job_1', employerId: 'u_emp_1', employerName: 'Fatma Juma', title: 'Kitchen Cabinet Refitting & Living Room Tile Laying', category: 'Tiling & Flooring', description: 'We need an experienced craftsman to replace outdated wooden kitchen cabinets and lay high-gloss floor tiles in a Kilimani apartment. Materials are already purchased and on site. Work must be completed within 4 days. Must bring own precision tools and spirit level.', skills: ['Tile Fitting', 'Carpentry', 'Cabinet Making'], county: 'Nairobi', budget: 25000, status: 'active', deadline: '2026-04-15', applicationsCount: 2, createdAt: now - 5*day, updatedAt: now - 1*day },
  { _id: 'job_2', employerId: 'u_emp_1', employerName: 'Fatma Juma', title: 'Complete Borehole Pump Solar Integration', category: 'Solar Installation', description: 'Looking for a certified solar tech/electrician to connect our deep well water pump to a newly installed 12-panel solar array. Must test the inverter flow control and provide safety grounding. EPRA certification required.', skills: ['Electrical Wiring', 'Solar Installation'], county: 'Kiambu', budget: 45000, status: 'active', deadline: '2026-04-20', applicationsCount: 1, createdAt: now - 3*day, updatedAt: now - 1*day },
  { _id: 'job_3', employerId: 'u_emp_2', employerName: 'David Kiprop', title: 'Perimeter Wall Construction (Block Work)', category: 'Building Construction', description: 'Setting up a perimeter fence around a quarter-acre plot in Nakuru. Need a reliable team leader mason who can lay machine-cut stones quickly with proper alignment and mortar ratio. Daily lunch provided. 2-week project.', skills: ['Masonry', 'Concrete Mixing'], county: 'Nakuru', budget: 60000, status: 'active', deadline: '2026-04-25', applicationsCount: 0, createdAt: now - 2*day, updatedAt: now - 2*day },
  { _id: 'job_4', employerId: 'u_emp_2', employerName: 'David Kiprop', title: 'Bathroom Leakage Troubleshooting & Pipe Replacement', category: 'Plumbing & Drainage', description: 'Ceiling of ground floor is wet due to active leak from master bathroom above. Need a skilled plumber with sound detector experience to isolate the broken PPR pipe and replace it without smashing too many tiles.', skills: ['Plumbing', 'Drainage'], county: 'Mombasa', budget: 12000, status: 'active', deadline: '2026-04-12', applicationsCount: 1, createdAt: now - 1*day, updatedAt: now - 1*day },
  { _id: 'job_5', employerId: 'u_emp_3', employerName: 'Wanjiku Maina', title: 'Full House Interior Painting & Gypsum Ceiling', category: 'Painting & Finishing', description: 'Moving into a new 3-bedroom apartment in Westlands. Need complete interior painting with premium silk finish plus gypsum ceiling installation in living room and master bedroom. Must have dust sheets and clean workspace.', skills: ['Painting', 'Gypsum Ceiling'], county: 'Nairobi', budget: 35000, status: 'active', deadline: '2026-04-30', applicationsCount: 0, createdAt: now - 1*day, updatedAt: now - 1*day },
  { _id: 'job_6', employerId: 'u_emp_3', employerName: 'Wanjiku Maina', title: 'Roof Truss Framework for Extension Wing', category: 'Roofing', description: 'Building a 2-room extension in Machakos. Need an experienced carpenter to construct and install roof trusses using treated cypress timber. Must follow approved architectural drawings.', skills: ['Carpentry', 'Roofing'], county: 'Machakos', budget: 28000, status: 'active', deadline: '2026-05-05', applicationsCount: 0, createdAt: now, updatedAt: now },
  { _id: 'job_7', employerId: 'u_emp_2', employerName: 'David Kiprop', title: 'Borehole Drilling Survey and Pump House Setup', category: 'Borehole Drilling', description: 'Need a borehole team to inspect a plot near Eldoret, advise on drilling depth, prepare casing requirements, and build a small pump house after drilling. Please include equipment availability and expected mobilisation timeline.', skills: ['Borehole Drilling', 'Concrete Mixing', 'Electrical Wiring'], county: 'Eldoret', budget: 85000, status: 'active', deadline: '2026-05-16', applicationsCount: 0, createdAt: now - 2*day, updatedAt: now - 2*day },
  { _id: 'job_8', employerId: 'u_emp_3', employerName: 'Wanjiku Maina', title: 'Apartment CCTV and Smart Lock Installation', category: 'Security & CCTV', description: 'Install 8 CCTV cameras, configure remote viewing, and fit two smart locks for a small apartment block in Kiambu. Contractor must label cables neatly and provide a handover guide for the caretaker.', skills: ['CCTV Installation', 'Electrical Wiring', 'Fault Finding'], county: 'Kiambu', budget: 38000, status: 'active', deadline: '2026-05-12', applicationsCount: 0, createdAt: now - 1*day, updatedAt: now - 1*day },
  { _id: 'job_9', employerId: 'u_emp_1', employerName: 'Fatma Juma', title: 'Steel Gate Welding and Anti-Rust Finishing', category: 'Welding & Fabrication', description: 'Fabricate and install a sliding steel gate for a residential driveway in Kajiado. Include anti-rust primer, hinges, locking provision, and clean site handover.', skills: ['Welding', 'Metal Fabrication', 'Painting'], county: 'Kajiado', budget: 52000, status: 'active', deadline: '2026-05-18', applicationsCount: 0, createdAt: now - 1*day, updatedAt: now - 1*day },
  { _id: 'job_10', employerId: 'u_emp_2', employerName: 'David Kiprop', title: 'Cold Room AC Service for Butchery', category: 'HVAC & Refrigeration', description: 'Service a small cold room and repair inconsistent cooling in a butchery. Technician should check refrigerant levels, clean coils, inspect thermostat wiring, and advise on preventive maintenance.', skills: ['HVAC Service', 'Fault Finding', 'Electrical Wiring'], county: 'Nakuru', budget: 18000, status: 'active', deadline: '2026-05-09', applicationsCount: 0, createdAt: now, updatedAt: now },
  { _id: 'job_11', employerId: 'u_emp_3', employerName: 'Wanjiku Maina', title: 'Cabro Driveway and Drainage Channel', category: 'Landscaping', description: 'Prepare a driveway base, lay cabro blocks, and shape a side drainage channel for a home in Nairobi. Must quote labour, tools, compaction, and estimated completion date.', skills: ['Cabro Laying', 'Drainage', 'Concrete Mixing'], county: 'Nairobi', budget: 42000, status: 'active', deadline: '2026-05-21', applicationsCount: 0, createdAt: now, updatedAt: now },
  { _id: 'job_12', employerId: 'u_emp_1', employerName: 'Fatma Juma', title: 'Three-Phase Consumer Unit Upgrade', category: 'Electrical Works', description: 'Upgrade a consumer unit for a workshop, balance loads, label circuits, and test earthing. Fundi must bring testing equipment and explain any safety defects before work starts.', skills: ['Electrical Wiring', 'Fault Finding'], county: 'Nairobi', budget: 30000, status: 'active', deadline: '2026-05-14', applicationsCount: 0, createdAt: now, updatedAt: now },
];

export const SEED_APPLICATIONS: Application[] = [
  { _id: 'app_1', jobId: 'job_1', fundiId: 'u_fundi_1', fundiName: 'John Kamau', fundiSkill: 'Masonry & Tile Fitting', fundiRating: 4.9, coverLetter: 'Habari Fatma, I am a skilled mason and master tile setter based in Nairobi. I can start tomorrow morning with my premium tools. I guarantee seamless joints and a clean workspace.', status: 'pending', appliedAt: now - 4*day, updatedAt: now - 4*day },
  { _id: 'app_2', jobId: 'job_1', fundiId: 'u_fundi_4', fundiName: 'Grace Njeri', fundiSkill: 'Carpentry', fundiRating: 5.0, coverLetter: 'Hello, I specialize in beautiful custom cabinets and modular fittings. I can refurbish your kitchen frames perfectly and ensure soft-close hinges are configured.', status: 'pending', appliedAt: now - 3*day, updatedAt: now - 3*day },
  { _id: 'app_3', jobId: 'job_2', fundiId: 'u_fundi_3', fundiName: 'Amina Onyango', fundiSkill: 'Electrical & Solar', fundiRating: 4.8, coverLetter: 'I hold an EPRA license for solar arrays. I have completed 5 similar borehole pump controllers in Kiambu county. Will ensure correct surge protection is installed.', status: 'hired', appliedAt: now - 2*day, updatedAt: now - 1*day },
  { _id: 'app_4', jobId: 'job_4', fundiId: 'u_fundi_2', fundiName: 'Peter Mwangi', fundiSkill: 'Plumbing', fundiRating: 4.7, coverLetter: 'I have a thermal leak detector and 10 years experience with PPR pipe systems. Can arrive within 2 hours of confirmation. Emergency rate applies for same-day callouts.', status: 'pending', appliedAt: now - 1*day, updatedAt: now - 1*day },
];

export const SEED_MESSAGES: Message[] = [];

export const SEED_REVIEWS: Review[] = [
  { _id: 'rev_1', reviewerId: 'u_emp_1', reviewerName: 'Fatma Juma', revieweeId: 'u_fundi_1', jobId: 'job_1', rating: 5, comment: 'Kamau did an outstanding job plastering our external balcony. Exceptionally neat and respects the budget.', createdAt: now - 15*day },
  { _id: 'rev_2', reviewerId: 'u_emp_2', reviewerName: 'David Kiprop', revieweeId: 'u_fundi_2', jobId: 'job_4', rating: 4, comment: 'Good response rate during a burst water main emergency. Fixed it quickly, though arrived 30 minutes late.', createdAt: now - 10*day },
  { _id: 'rev_3', reviewerId: 'u_emp_1', reviewerName: 'Fatma Juma', revieweeId: 'u_fundi_3', jobId: 'job_2', rating: 5, comment: 'Amina is extremely professional. Solar integration was flawless and she provided a detailed safety report.', createdAt: now - 2*day },
];

export const SEED_PAYMENTS: Payment[] = [
  { _id: 'pay_1', jobId: 'job_2', employerId: 'u_emp_1', fundiId: 'u_fundi_3', amount: 45000, platformFee: 900, status: 'escrowed', mpesaReceiptNumber: 'SHL2K8M9PQ', mpesaTransactionId: 'txn_sim_001', createdAt: now - 2*day },
  { _id: 'pay_2', jobId: 'job_1', employerId: 'u_emp_1', fundiId: 'u_fundi_1', amount: 25000, platformFee: 500, status: 'pending', createdAt: now - 1*day },
];

// ============================================================================
// DATABASE SERVICE — Convex-like reactive query layer
// ============================================================================

export const COUNTIES = ['All Counties', 'Nairobi', 'Mombasa', 'Kiambu', 'Kisumu', 'Nakuru', 'Eldoret', 'Machakos', 'Kajiado'];

export const SKILL_OPTIONS = ['All Skills', 'Masonry', 'Plumbing', 'Electrical Wiring', 'Carpentry', 'Tile Fitting', 'Concrete Mixing', 'Solar Installation', 'Cabinet Making', 'Drainage', 'Roofing', 'Painting', 'Gypsum Ceiling', 'Fault Finding', 'Pipe Fitting', 'Borehole Drilling', 'CCTV Installation', 'Welding', 'Metal Fabrication', 'HVAC Service', 'Cabro Laying'];

export function getJobCategory(job: Pick<Job, 'category' | 'skills' | 'title' | 'description'>): JobCategory {
  if (job.category) return job.category;
  const text = `${job.title} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
  if (text.includes('solar')) return 'Solar Installation';
  if (text.includes('borehole') || text.includes('pump house') || text.includes('drilling')) return 'Borehole Drilling';
  if (text.includes('tile') || text.includes('floor') || text.includes('cabro')) return 'Tiling & Flooring';
  if (text.includes('roof')) return 'Roofing';
  if (text.includes('electrical') || text.includes('wiring') || text.includes('consumer unit') || text.includes('fault')) return 'Electrical Works';
  if (text.includes('plumbing') || text.includes('drainage') || text.includes('pipe') || text.includes('leak')) return 'Plumbing & Drainage';
  if (text.includes('welding') || text.includes('fabrication') || text.includes('steel') || text.includes('metal')) return 'Welding & Fabrication';
  if (text.includes('hvac') || /\bac\b/.test(text) || text.includes('cooling') || text.includes('refrigeration')) return 'HVAC & Refrigeration';
  if (text.includes('cctv') || text.includes('security') || text.includes('smart lock')) return 'Security & CCTV';
  if (text.includes('landscap')) return 'Landscaping';
  if (text.includes('carpentry') || text.includes('cabinet') || text.includes('joinery')) return 'Carpentry & Joinery';
  if (text.includes('painting') || text.includes('gypsum') || text.includes('finish')) return 'Painting & Finishing';
  return 'Building Construction';
}

export const CATEGORIES = [
  { name: 'Masonry & Concrete', count: 142, skills: ['Masonry', 'Concrete Mixing', 'Foundation Repair'] },
  { name: 'Plumbing & Drainage', count: 98, skills: ['Plumbing', 'Drainage', 'Pipe Fitting', 'Water Heater Repair'] },
  { name: 'Electrical & Solar', count: 115, skills: ['Electrical Wiring', 'Solar Installation', 'Fault Finding', 'Generator Setup'] },
  { name: 'Carpentry & Roofing', count: 86, skills: ['Carpentry', 'Roofing', 'Cabinet Making', 'Wood Varnishing'] },
  { name: 'Painting & Finishing', count: 64, skills: ['Painting', 'Gypsum Ceiling', 'Wall Texturing', 'Waterproofing'] },
];

// Unique ID generator
let idCounter = 1000;
export function generateId(prefix: string): string {
  return `${prefix}_${++idCounter}_${Date.now().toString(36)}`;
}

// Format currency
export function formatKSh(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE')}`;
}

// Format time ago
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString('en-KE');
}

// Hash password (simulated)
export function hashPassword(password: string): string {
  return `$2b$10$simulated_${btoa(password).slice(0, 12)}`;
}

// Verify password (simulated)
export function verifyPassword(password: string, hash: string): boolean {
  return hash === hashPassword(password);
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
