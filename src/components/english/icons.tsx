// Ícones do Babel (SVG próprios, preenchidos, no estilo "chunky" de apps de idiomas).
type P = { className?: string };
const base = { viewBox: "0 0 24 24", "aria-hidden": true as const };

export const IcoStar = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} className={className} fill="currentColor">
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
export const IcoCheck = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);
export const IcoClose = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);
export const IcoBack = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const IcoLock = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} className={className} fill="currentColor">
    <path d="M7 10V8a5 5 0 0110 0v2h.5A1.5 1.5 0 0119 11.5v8a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19.5v-8A1.5 1.5 0 016.5 10zm2.5 0h5V8a2.5 2.5 0 00-5 0z" />
  </svg>
);
export const IcoChat = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} className={className} fill="currentColor">
    <path d="M12 3C6.5 3 2.5 6.6 2.5 11c0 2.3 1.1 4.3 2.9 5.7-.2 1.3-.8 2.6-1.9 3.6 2.2-.1 4-.8 5.3-1.8.9.3 1.9.4 3.2.4 5.5 0 9.5-3.6 9.5-8S17.500 3 12 3z" />
  </svg>
);
export const IcoCrown = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} className={className} fill="currentColor">
    <path d="M3 8l4.5 4L12 5l4.500 7L21 8l-2 11H5z" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
export const IcoFlame = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}>
    <path fill="#ff9600" d="M12 2c.5 3.200 3.500 4.800 5 7.800 1.700 3.400.5 8.200-3.300 10.200-3.700 1.900-8.100-.4-8.600-4.500-.3-2.600 1-4.300 2.200-5.700.3 1.300 1 2.200 1.900 2.700C9 8.400 10.200 4.600 12 2z" />
    <path fill="#ffc800" d="M12 12.500c.4 1.700 2.300 2.400 2.600 4.200.3 1.800-1.100 3.300-2.700 3.300-1.900 0-3.200-1.600-2.800-3.300.3-1.200 1.200-1.800 1.700-2.800.3-.5.9-.8 1.200-1.400z" />
  </svg>
);
export const IcoBolt = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className} fill="#ffc800" stroke="#e5b000" strokeWidth="1.2" strokeLinejoin="round">
    <path d="M13.500 2L5 13.500h5.500L9.500 22 19 10h-5.800z" />
  </svg>
);
export const IcoSpeaker = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} className={className} fill="currentColor">
    <path d="M3 9.500v5h3.500L11 18.500v-13L6.500 9.500z" />
    <path d="M14 8.500a5 5 0 010 7M16.500 5.500a9 9 0 010 13" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" />
  </svg>
);
export const IcoTurtle = ({ className = "h-7 w-7" }: P) => (
  <svg {...base} className={className} fill="currentColor">
    <path d="M12 4c4.200 0 7.500 3 7.500 6.500V13h-15v-2.500C4.500 7 7.800 4 12 4zM5 14.500h14l1.500 3.500h-3l-.8-1.500H7.300L6.500 18h-3z" />
  </svg>
);
export const IcoTarget = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} className={className} fill="none" strokeWidth="2.500">
    <circle cx="12" cy="12" r="9" stroke="#ff4b4b" />
    <circle cx="12" cy="12" r="5" stroke="#ff9600" />
    <circle cx="12" cy="12" r="1.800" fill="#ffc800" stroke="none" />
  </svg>
);
export const IcoCards = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} className={className}>
    <rect x="3.500" y="6" width="12" height="15" rx="2.500" fill="#1cb0f6" />
    <rect x="8.500" y="3" width="12" height="15" rx="2.500" fill="#84d8ff" stroke="#1cb0f6" strokeWidth="1.500" />
  </svg>
);
export const IcoHeadphones = ({ className = "h-8 w-8" }: P) => (
  <svg {...base} className={className} fill="none" stroke="#ce82ff" strokeWidth="2.600" strokeLinecap="round">
    <path d="M4 15v-3a8 8 0 0116 0v3" />
    <rect x="3" y="14" width="4" height="6" rx="1.500" fill="#ce82ff" />
    <rect x="17" y="14" width="4" height="6" rx="1.500" fill="#ce82ff" />
  </svg>
);
export const IcoSparkle = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className} fill="currentColor">
    <path d="M12 2l1.800 6.200L20 10l-6.200 1.800L12 18l-1.800-6.200L4 10l6.200-1.800zM19 15l.9 2.100L22 18l-2.100.9L19 21l-.9-2.100L16 18l2.100-.9z" />
  </svg>
);
