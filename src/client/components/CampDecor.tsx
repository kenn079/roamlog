import React from 'react';

/**
 * Flat geometric camp scenery (triangles + circles), inspired by the
 * eyecatch style of Yuru Camp. Colours come from --scene-* CSS variables,
 * so the same SVG becomes "cream tent" by day and "dusk campfire" at night.
 */
export function CampScene({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 1200 70"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="1200" height="70" fill="var(--scene-sky)" />

      {/* Day: sun · Night: crescent moon with warm lunar glow + stars */}
      <circle cx="1060" cy="24" r="14" fill="var(--scene-orb)" className="dark:hidden" />
      <g className="hidden dark:inline">
        {/* Soft lunar glow */}
        <circle cx="1060" cy="24" r="18" fill="rgba(251, 191, 36, 0.15)" />
        {/* Crescent Moon */}
        <path
          d="M 1060 10 A 14 14 0 1 0 1074 24 A 12 12 0 1 1 1060 10 Z"
          fill="var(--scene-orb)"
        />
        {/* Starry Night Sky */}
        <circle cx="160" cy="18" r="1.5" fill="var(--scene-snow)" />
        <circle cx="340" cy="12" r="1.2" fill="var(--scene-snow)" />
        <circle cx="580" cy="16" r="1.4" fill="var(--scene-snow)" />
        <circle cx="820" cy="12" r="1.6" fill="var(--scene-snow)" />
        <circle cx="950" cy="22" r="1.2" fill="var(--scene-snow)" />
        <circle cx="70" cy="15" r="1.3" fill="var(--scene-snow)" opacity="0.8" />
        <circle cx="480" cy="11" r="1.2" fill="var(--scene-snow)" opacity="0.75" />
        <circle cx="720" cy="18" r="1.4" fill="var(--scene-snow)" opacity="0.85" />
        {/* Twinkling 4-point cross star glint */}
        <path d="M 820 8 L 820 16 M 816 12 L 824 12" stroke="var(--scene-snow)" strokeWidth="0.8" opacity="0.6" />
      </g>

      {/* Far ridge */}
      <polygon points="-20,70 120,24 260,70" fill="var(--scene-far)" />
      <polygon points="200,70 380,20 560,70" fill="var(--scene-far)" opacity="0.85" />
      <polygon points="680,70 820,22 960,70" fill="var(--scene-far)" />
      <polygon points="900,70 1040,28 1180,70" fill="var(--scene-far)" opacity="0.75" />

      {/* Midground Main Peaks with Crisp Snow Caps */}
      <polygon points="60,70 220,15 380,70" fill="var(--scene-near)" />
      <polygon points="196,26 220,15 244,26 232,23 220,29 208,23" fill="var(--scene-snow)" />

      <polygon points="460,70 640,12 820,70" fill="var(--scene-near)" />
      <polygon points="612,23 640,12 668,23 654,20 640,27 626,20" fill="var(--scene-snow)" />

      {/* Foothills & Near hills */}
      <polygon points="-40,70 60,45 160,70" fill="var(--scene-near)" opacity="0.85" />
      <polygon points="320,70 440,40 560,70" fill="var(--scene-near)" opacity="0.9" />
      <polygon points="800,70 940,38 1080,70" fill="var(--scene-near)" opacity="0.85" />

      {/* Crisp Geometric Pine Trees */}
      <polygon points="420,70 428,50 436,70" fill="var(--scene-near)" />
      <polygon points="432,70 439,56 446,70" fill="var(--scene-far)" />
      <polygon points="540,70 547,48 554,70" fill="var(--scene-near)" />
      <polygon points="550,70 556,54 562,70" fill="var(--scene-far)" />

      {/* Classic Yuru Camp A-Frame Tent */}
      <polygon points="465,70 495,34 525,70" fill="var(--scene-tent)" />
      <polygon points="495,34 502,70 488,70" fill="var(--scene-tent-shade)" />

      {/* Night-only cozy campsite details: tent lantern, doorway glow, campfire & embers */}
      <g className="hidden dark:inline">
        {/* Warm doorway glow */}
        <polygon points="491,48 499,48 502,70 488,70" fill="rgba(251, 191, 36, 0.28)" />
        {/* Hanging lantern at tent peak */}
        <line x1="495" y1="34" x2="495" y2="40" stroke="#f2722b" strokeWidth="0.8" />
        <circle cx="495" cy="41" r="5" fill="rgba(251, 191, 36, 0.35)" />
        <circle cx="495" cy="41" r="1.8" fill="#fbbf24" />

        {/* Campfire ground ambient glow */}
        <ellipse cx="582" cy="68" rx="22" ry="5" fill="rgba(245, 158, 11, 0.22)" />
        {/* Flames */}
        <polygon points="575,70 582,56 589,70" fill="#e3a93b" />
        <polygon points="578,70 582,61 586,70" fill="#f7d06b" />
        {/* Rising campfire smoke curls */}
        <path d="M 582 55 Q 579 46 584 38 T 582 28" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.1" strokeLinecap="round" />
        {/* Drifting embers / fireflies */}
        <circle cx="580" cy="48" r="0.9" fill="#f59e0b" opacity="0.8" />
        <circle cx="585" cy="41" r="0.7" fill="#fbbf24" opacity="0.85" />
        <circle cx="581" cy="34" r="0.6" fill="#fde68a" opacity="0.75" />
        <circle cx="587" cy="27" r="0.5" fill="#fde68a" opacity="0.65" />
      </g>

      {/* Right Side Pine Trees */}
      <polygon points="760,70 768,52 776,70" fill="var(--scene-near)" />
      <polygon points="772,70 779,46 786,70" fill="var(--scene-far)" />
    </svg>
  );
}

/** Small tent mark used as the app logo. */
export function TentMark({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect width="40" height="40" rx="12" fill="var(--accent)" />
      <circle cx="29" cy="12" r="4" fill="var(--sun)" />
      <polygon points="8,31 20,13 32,31" fill="var(--on-accent)" />
      <polygon points="20,13 23,31 17,31" fill="var(--accent)" opacity="0.55" />
    </svg>
  );
}

/** A tiny geometric scene for empty states. */
export function EmptyCamp({
  message,
  className = '',
}: {
  message: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 ${className}`}>
      <svg viewBox="0 0 120 64" aria-hidden="true" className="w-28 h-auto">
        <circle cx="92" cy="18" r="9" fill="var(--sun)" />
        <polygon points="0,64 34,22 68,64" fill="var(--moss-soft)" />
        <polygon points="40,64 72,30 104,64" fill="var(--moss)" />
        <polygon points="18,64 32,44 46,64" fill="var(--accent)" />
      </svg>
      <p className="text-sm text-ink-soft max-w-md leading-relaxed">{message}</p>
    </div>
  );
}

/** Stable small tilt (−2°…2°) per id so polaroids look hand-placed but never jitter. */
export function tiltFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ((Math.abs(hash) % 9) - 4) / 2;
}
