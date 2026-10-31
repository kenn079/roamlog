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

      {/* Day: sun · Night: low dusk sun + a few stars */}
      <circle cx="1060" cy="24" r="14" fill="var(--scene-orb)" className="dark:hidden" />
      <g className="hidden dark:inline">
        <circle cx="1060" cy="24" r="14" fill="var(--scene-orb)" />
        <circle cx="160" cy="18" r="1.5" fill="var(--scene-snow)" />
        <circle cx="340" cy="12" r="1.2" fill="var(--scene-snow)" />
        <circle cx="580" cy="16" r="1.4" fill="var(--scene-snow)" />
        <circle cx="820" cy="12" r="1.6" fill="var(--scene-snow)" />
        <circle cx="950" cy="22" r="1.2" fill="var(--scene-snow)" />
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

      {/* Night-only campfire next to the tent */}
      <g className="hidden dark:inline">
        <polygon points="575,70 582,56 589,70" fill="#e3a93b" />
        <polygon points="578,70 582,61 586,70" fill="#f7d06b" />
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
