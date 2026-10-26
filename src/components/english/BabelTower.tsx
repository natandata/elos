// Babel mark: a stepped tower (ziggurat) in sandstone tones. Decorative only.
export function BabelTower({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="6" y="50" width="52" height="8" rx="1.5" fill="#92400e" />
      <rect x="11" y="41" width="42" height="9" rx="1.5" fill="#b45309" />
      <rect x="16" y="32" width="32" height="9" rx="1.5" fill="#d97706" />
      <rect x="21" y="23" width="22" height="9" rx="1.5" fill="#f59e0b" />
      <rect x="26" y="14" width="12" height="9" rx="1.5" fill="#fbbf24" />
      <rect x="30" y="6" width="4" height="8" rx="1" fill="#fde68a" />
      <path d="M32 50v8M24 41v9M40 41v9M32 32v9M27 23v9M37 23v9" stroke="#78350f" strokeWidth="1.2" opacity=".45" />
    </svg>
  );
}
