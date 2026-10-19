import React from 'react';

/**
 * Flat geometric camp scenery (triangles + circles), inspired by the
 * eyecatch style of Yuru Camp. Colours come from --scene-* CSS variables,
 * so the same SVG becomes "cream tent" by day and "dusk campfire" at night.
 */
export function CampScene({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 640 120"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className={className}
    >
      <rect width="640" height="120" fill="var(--scene-sky)" />

      {/* Day: sun · Night: low dusk sun + a few stars */}
      <circle cx="520" cy="38" r="18" fill="var(--scene-orb)" className="dark:hidden" />
      <g className="hidden dark:inline">
        <circle cx="330" cy="92" r="30" fill="var(--scene-orb)" />
        <circle cx="90" cy="22" r="1.6" fill="var(--scene-snow)" />
        <circle cx="210" cy="14" r="1.2" fill="var(--scene-snow)" />
        <circle cx="470" cy="20" r="1.4" fill="var(--scene-snow)" />
        <circle cx="590" cy="30" r="1.1" fill="var(--scene-snow)" />
      </g>

      {/* Far ridge */}
      <polygon points="-20,120 90,46 200,120" fill="var(--scene-far)" />
      <polygon points="400,120 520,58 640,120" fill="var(--scene-far)" />

      {/* Main peak with a little snow cap */}
      <polygon points="150,120 300,24 450,120" fill="var(--scene-near)" />
      <polygon points="277,39 300,24 323,39 311,36 300,44 289,36" fill="var(--scene-snow)" />

      {/* Near hill */}
      <polygon points="520,120 600,78 700,120" fill="var(--scene-near)" />

      {/* Tent */}
      <polygon points="70,120 104,74 138,120" fill="var(--scene-tent)" />
      <polygon points="104,74 112,120 96,120" fill="var(--scene-tent-shade)" />

      {/* Night-only campfire next to the tent */}
      <g className="hidden dark:inline">
        <polygon points="150,120 160,102 170,120" fill="#e3a93b" />
        <polygon points="155,120 160,110 165,120" fill="#f7d06b" />
      </g>
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
