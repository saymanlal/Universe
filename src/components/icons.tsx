import type { SVGProps } from 'react';

/**
 * Small hand-picked inline icon set. Avoids pulling in an icon library
 * (keeps the bundle lean and backend-free). All icons inherit `currentColor`.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const GalaxyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="2" />
    <path d="M12 12c4-3 8-2 8 2 0 4-6 6-10 4M12 12c-4 3-8 2-8-2 0-4 6-6 10-4" />
  </svg>
);

export const StarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l2.4 5.4 5.9.6-4.4 3.9 1.3 5.8L12 16.9 6.8 18.7l1.3-5.8L3.7 9l5.9-.6L12 3z" />
  </svg>
);

export const PlanetIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="6" />
    <path d="M4.5 15c5 2 12 1 15-3" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const LayersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />
  </svg>
);

export const SlidersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M18 18h2" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="16" cy="18" r="2" />
  </svg>
);

export const CrosshairIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

export const GridIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 11l9-8 9 8M5 10v10h14V10" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const WandIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 4V2M15 10V8M12 6h2M18 6h-2M6 20l9-9M17 12l1.5 1.5" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h10" />
  </svg>
);

export const PencilIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h4l10-10a1.5 1.5 0 000-2l-2-2a1.5 1.5 0 00-2 0L4 16v4z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);

export const DiceIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const OpenIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
    <path d="M12 3v12M8 7l4-4 4 4" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const FastForwardIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M4 6l7 6-7 6zM13 6l7 6-7 6z" />
  </svg>
);

export const RewindIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M20 6l-7 6 7 6zM11 6l-7 6 7 6z" />
  </svg>
);

export const StepForwardIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M6 6l8 6-8 6z" />
    <rect x="16" y="6" width="2.4" height="12" />
  </svg>
);

export const StepBackIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M18 6l-8 6 8 6z" />
    <rect x="5.6" y="6" width="2.4" height="12" />
  </svg>
);

export const UndoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h11a5 5 0 015 5v1" />
  </svg>
);

export const RedoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 7l5 5-5 5" />
    <path d="M20 12H9a5 5 0 00-5 5v1" />
  </svg>
);

export const MoveIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
  </svg>
);
