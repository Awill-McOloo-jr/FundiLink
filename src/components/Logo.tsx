interface LogoProps {
  compact?: boolean;
  className?: string;
}

export default function Logo({ compact = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 48 48" className="h-10 w-10 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="fundilink-mark" x1="8" x2="40" y1="7" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0EA5E9" />
            <stop offset="0.55" stopColor="#005FEC" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#fundilink-mark)" />
        <path d="M14 31.5V20.7L24 14l10 6.7v10.8" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <path d="M18 32h12.5c2 0 3.5-1.4 3.5-3.3 0-1.8-1.5-3.2-3.5-3.2H24" fill="none" stroke="#FBBF24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <path d="M18 24h9" stroke="white" strokeLinecap="round" strokeWidth="3" />
      </svg>
      {!compact && (
        <span className="min-w-0">
          <span className="block font-display text-xl font-black tracking-tight text-white">
            fundi<span className="text-amber-300">link</span>
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Construction hiring
          </span>
        </span>
      )}
    </div>
  );
}
