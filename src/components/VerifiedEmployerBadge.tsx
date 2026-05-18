import { BadgeCheck } from 'lucide-react';
import type { User } from '../db/schema';

export function isVerifiedEmployer(user?: Pick<User, 'role' | 'verified'>) {
  return user?.role === 'employer' && Boolean(user.verified);
}

export default function VerifiedEmployerBadge({ user, className = '' }: { user?: Pick<User, 'role' | 'verified'>; className?: string }) {
  if (!isVerifiedEmployer(user)) return null;

  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1d9bf0] text-white shadow-sm ${className}`}
      title="Verified employer"
      aria-label="Verified employer"
    >
      <BadgeCheck className="h-3.5 w-3.5" />
    </span>
  );
}
