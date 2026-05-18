import type { Profile, User } from '../db/schema';

export type VerificationCheck = {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
  required: boolean;
};

export type FundiVerificationResult = {
  passed: boolean;
  score: number;
  checks: VerificationCheck[];
  missingRequired: VerificationCheck[];
};

function hasAny(source: string, terms: string[]) {
  return terms.some(term => source.includes(term));
}

export function evaluateFundiVerification(profile?: Profile, user?: User): FundiVerificationResult {
  const documents = profile?.verificationDocuments || [];
  const documentText = documents.join(' ').toLowerCase();
  const evidenceText = [
    profile?.bio || '',
    profile?.cvFileName || '',
    ...(profile?.cvInsights || []),
    documentText,
  ].join(' ').toLowerCase();

  const checks: VerificationCheck[] = [
    {
      id: 'identity',
      label: 'Identity evidence',
      detail: 'National ID, passport, Huduma, KRA PIN, or other identity proof uploaded.',
      passed: hasAny(documentText, ['national', ' id', 'id-', 'passport', 'huduma', 'kra', 'pin']),
      required: true,
    },
    {
      id: 'trade-credential',
      label: 'Trade credential',
      detail: 'NCA, EPRA, TVET, artisan certificate, trade licence, or verified certificate evidence.',
      passed: hasAny(evidenceText, ['nca', 'epra', 'tvet', 'artisan', 'certificate', 'certified', 'licence', 'license', 'trade']),
      required: true,
    },
    {
      id: 'safety',
      label: 'Safety compliance',
      detail: 'Safety, OSHA, PPE, induction, first aid, or site-risk evidence uploaded or found in CV.',
      passed: hasAny(evidenceText, ['osha', 'safety', 'ppe', 'induction', 'first aid', 'first-aid', 'risk']),
      required: true,
    },
    {
      id: 'portfolio',
      label: 'Portfolio proof',
      detail: 'At least two portfolio images showing completed work.',
      passed: (profile?.portfolioImages.length || 0) >= 2,
      required: true,
    },
    {
      id: 'experience',
      label: 'Experience signal',
      detail: 'CV insights present or at least five completed jobs recorded on Fundilink.',
      passed: Boolean(profile?.cvInsights?.length || profile?.cvFileName) || (profile?.completedJobs || 0) >= 5,
      required: true,
    },
    {
      id: 'profile-quality',
      label: 'Profile completeness',
      detail: 'Bio, county, hourly rate, phone, and at least two skills are present.',
      passed: Boolean(
        profile?.bio && profile.bio.trim().length >= 80
        && profile.county
        && profile.hourlyRate > 0
        && (profile.skills.length || 0) >= 2
        && user?.phone
      ),
      required: true,
    },
  ];

  const requiredChecks = checks.filter(check => check.required);
  const passedRequired = requiredChecks.filter(check => check.passed);
  const score = Math.round((passedRequired.length / requiredChecks.length) * 100);
  const missingRequired = requiredChecks.filter(check => !check.passed);

  return {
    passed: missingRequired.length === 0,
    score,
    checks,
    missingRequired,
  };
}

export function isFundiBadgeActive(profile?: Profile, user?: User) {
  return Boolean(profile?.verified && evaluateFundiVerification(profile, user).passed);
}
