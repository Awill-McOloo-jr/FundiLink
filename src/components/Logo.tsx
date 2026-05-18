interface LogoProps {
  compact?: boolean;
  className?: string;
  size?: 'md' | 'lg';
  tone?: 'light' | 'dark';
}

function FundilinkMark({ tile = false, size = 'md' }: { tile?: boolean; size?: 'md' | 'lg' }) {
  const innerFill = tile ? '#111118' : '#F8FAFC';
  const tileSize = size === 'lg' ? 'h-20 w-20 rounded-[1.75rem]' : 'h-12 w-12 rounded-2xl';
  const plainSize = size === 'lg' ? 'h-20 w-20' : 'h-8 w-8';
  const svgSize = size === 'lg' ? 'h-16 w-16' : tile ? 'h-9 w-9' : 'h-8 w-8';

  return (
    <span className={`${tile ? `grid ${tileSize} place-items-center bg-[#111118] shadow-lg shadow-blue-950/25` : `grid ${plainSize} place-items-center`} shrink-0`}>
      <svg viewBox="0 0 48 48" className={svgSize} aria-hidden="true">
        <polygon points="21,5 39,15.5 39,36.5 21,47 3,36.5 3,15.5" fill="none" stroke="#E8500A" strokeWidth="3" />
        <polygon points="21,12 32.5,18.5 32.5,33.5 21,40 9.5,33.5 9.5,18.5" fill="#E8500A" opacity="0.14" />
        <rect x="14" y="18" width="4" height="17" rx="1" fill="#E8500A" />
        <rect x="14" y="18" width="12" height="4" rx="1" fill="#E8500A" />
        <rect x="14" y="25" width="9" height="4" rx="1" fill="#E8500A" />
        <circle cx="39" cy="15.5" r="5.5" fill="#3B82F6" />
        <circle cx="39" cy="15.5" r="2.5" fill={innerFill} />
      </svg>
    </span>
  );
}

export default function Logo({ compact = false, className = '', size = 'md', tone = 'dark' }: LogoProps) {
  if (compact) {
    return (
      <div className={`flex items-center justify-center ${className}`} aria-label="Fundilink">
        <FundilinkMark tile={size !== 'lg'} size={size} />
      </div>
    );
  }

  const wordColor = tone === 'light' ? 'text-slate-950' : 'text-white';
  const trademarkColor = tone === 'light' ? 'text-blue-600' : 'text-blue-300';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <FundilinkMark />
      <span className="flex min-w-0 items-baseline gap-0.5">
        <span className={`font-display text-2xl font-black leading-none tracking-tight ${wordColor}`}>
          fundi<span className="text-[#E8500A]">link</span>
        </span>
        <span className={`text-xs font-black ${trademarkColor}`}>TM</span>
      </span>
    </div>
  );
}
