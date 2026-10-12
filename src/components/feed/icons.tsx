type IconProps = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function HeartIcon({ size = 26, className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.7 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.3 0 5.4 3.1 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
    </svg>
  );
}

export function CommentIcon({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20.5l1.5-5.1A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  );
}

export function SmileIcon({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.2c.9 1.1 2 1.7 3.5 1.7s2.6-.6 3.5-1.7" />
      <path d="M9 9.8h.01M15 9.8h.01" strokeWidth={2.6} />
    </svg>
  );
}

export function MoreIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

export function EyeIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function SearchIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

export function PlusSquareIcon({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function HomeIcon({ size = 26, className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}>
      <path d="M3.5 10.8 12 3.5l8.5 7.3V20a1 1 0 0 1-1 1H15v-6.2H9V21H4.5a1 1 0 0 1-1-1v-9.2z" />
    </svg>
  );
}

export function PaperPlaneIcon({ size = 26, className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}>
      <path d="M21 3.5 10.2 14" />
      <path d="M21 3.5 14.6 20.5l-4.4-6.5L3.5 9.6 21 3.5z" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}

export function ComposeIcon({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M11 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V13" />
      <path d="m18.4 3.6 2 2L11.5 14.5 8.5 15.5l1-3 8.9-8.9z" />
    </svg>
  );
}
