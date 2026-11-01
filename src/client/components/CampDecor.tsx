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

/** Hand-crafted minimalist vector stargazing refractor telescope on a tripod. */
export function VectorTelescope({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
      {/* Objective Lens Star Sparkle */}
      <path d="M 31 4 L 31 10 M 28 7 L 34 7" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
      <circle cx="31" cy="7" r="1" fill="#fbbf24" />

      {/* Main Optical Tube (angled up to top-right) */}
      {/* Sun/dew shield at objective end */}
      <path
        d="M 23.5 12.5 L 27.5 10 L 29.5 13.5 L 25.5 16 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.2"
      />
      {/* Main Tube barrel */}
      <path
        d="M 12 19 L 23.5 12.5 L 25.5 16 L 14 22.5 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
      {/* Focus mount & Eyepiece at bottom left */}
      <path
        d="M 8.5 24 L 12 19 L 14 22.5 L 10.5 25.5 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <line x1="7" y1="26.5" x2="9.5" y2="24.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="6" y1="25.5" x2="8" y2="28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

      {/* Small Finder Scope parallel on top of tube */}
      <line x1="17" y1="13" x2="23" y2="9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="18" y1="14.5" x2="18" y2="12.5" stroke="currentColor" strokeWidth="0.8" />
      <line x1="22" y1="12" x2="22" y2="10" stroke="currentColor" strokeWidth="0.8" />

      {/* Central Alt-Azimuth Mount */}
      <circle cx="19" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.25" />
      <line x1="19" y1="20" x2="19" y2="22" stroke="currentColor" strokeWidth="1.2" />

      {/* Tripod Legs */}
      <line x1="19" y1="22" x2="9" y2="34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="19" y1="22" x2="19" y2="35" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="19" y1="22" x2="29" y2="34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

      {/* Leg Spreader / Accessory Tray */}
      <line x1="13.5" y1="28.5" x2="24.5" y2="28.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/** Vintage outdoor hurricane kerosene lantern with glowing filament/flame. */
export function VectorVintageLantern({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 32 38" fill="none" className={className} aria-hidden="true">
      {/* Top wire bail / handle */}
      <path
        d="M 9 13 C 9 4, 23 4, 23 13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Top Ring / Vent knob */}
      <circle cx="16" cy="6.5" r="1.8" stroke="currentColor" strokeWidth="1" />
      {/* Top Chimney Cap */}
      <path
        d="M 12 10 L 20 10 L 19 8 L 13 8 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.25"
      />
      {/* Ventilation Dome */}
      <path
        d="M 10 13 L 22 13 L 20 10 L 12 10 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.3"
      />

      {/* Wire Frame / Side Fuel Pipes */}
      <path
        d="M 10 13 C 6 15, 6 25, 9 27"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M 22 13 C 26 15, 26 25, 23 27"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Glass Chamber */}
      <path
        d="M 11 13.5 C 9 17, 9 23, 11 26.5 L 21 26.5 C 23 23, 23 17, 21 13.5 Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="rgba(251, 191, 36, 0.08)"
      />

      {/* Glass Horizontal Wire Guard Rings */}
      <path d="M 10 18 Q 16 19.5 22 18" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <path d="M 10.2 22 Q 16 23.5 21.8 22" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />

      {/* Golden Warm Flame & Ambient Glow in Globe */}
      <circle cx="16" cy="20.5" r="4.5" fill="rgba(251, 191, 36, 0.28)" />
      {/* Flame Path */}
      <path
        d="M 16 16.5 C 14.8 19, 14.5 21, 16 22.5 C 17.5 21, 17.2 19, 16 16.5 Z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="0.5"
      />

      {/* Burner Base collar */}
      <rect
        x="10"
        y="26.5"
        width="12"
        height="2"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.25"
      />

      {/* Fuel Tank Bottom Base */}
      <path
        d="M 8 28.5 L 24 28.5 L 25 33 L 7 33 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <line x1="8.5" y1="33" x2="23.5" y2="33" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Minimalist campfire with crossed logs, warm flames, and drifting spark embers. */
export function VectorCampfire({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Drifting embers / sparks */}
      <circle cx="14" cy="4" r="0.9" fill="#fbbf24" />
      <circle cx="20" cy="7" r="0.7" fill="#fde68a" />
      <circle cx="11" cy="9" r="0.6" fill="#f59e0b" />

      {/* Ambient fire glow */}
      <circle cx="16" cy="18" r="7" fill="rgba(251, 191, 36, 0.18)" />

      {/* Outer Flame */}
      <path
        d="M 16 7 C 12 12, 8.5 16, 9.5 21 C 10.5 25.5, 13.5 26.5, 16 26.5 C 18.5 26.5, 21.5 25.5, 22.5 21 C 23.5 16, 20 12, 16 7 Z"
        fill="rgba(245, 158, 11, 0.25)"
        stroke="#f59e0b"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Inner Flame Core */}
      <path
        d="M 16 13 C 14 16.5, 12 19, 13 22 C 13.8 24.5, 15 25.5, 16 25.5 C 17 25.5, 18.2 24.5, 19 22 C 20 19, 18 16.5, 16 13 Z"
        fill="#fde68a"
        stroke="#fbbf24"
        strokeWidth="0.8"
      />

      {/* Crossed Firewood Logs */}
      <line x1="6" y1="28" x2="26" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="6" y1="23" x2="26" y2="28" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Wood bark details */}
      <line x1="10" y1="26" x2="11" y2="24" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
      <line x1="21" y1="24.5" x2="22" y2="26.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
    </svg>
  );
}

/** Classic enamel camp mug with rising steam and subtle mountain ridge illustration. */
export function VectorCampMug({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Curling rising steam */}
      <path
        d="M 11 9 Q 8.5 6 11 3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 16 9 Q 18.5 6 16 3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Mug Body */}
      <rect
        x="7"
        y="12"
        width="14"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.1"
      />

      {/* Enamel Rim */}
      <line x1="6" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Enamel colored band dip */}
      <line x1="7" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />

      {/* Mug Handle */}
      <path
        d="M 21 15 C 26 15, 26 23, 21 23"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Mountain outline doodle on mug body */}
      <path
        d="M 10 22 L 13 18 L 15 20.5 L 17 18.5 L 18 22"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
    </svg>
  );
}

/** Vintage field camera with lens glint and strap lugs. */
export function VectorCamera({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Top Shutter Button */}
      <rect x="7" y="7" width="4" height="2" rx="0.5" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.3" />
      {/* Top Flash bump / Hotshoe */}
      <rect x="14" y="6.5" width="5" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.2" />

      {/* Camera Body */}
      <rect
        x="4"
        y="9"
        width="24"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.1"
      />

      {/* Leatherette divider line */}
      <line x1="4" y1="13" x2="28" y2="13" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />

      {/* Lens Concentric Circles */}
      <circle cx="16" cy="18" r="5.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
      <circle cx="16" cy="18" r="3.2" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="17" cy="17" r="0.9" fill="currentColor" opacity="0.7" />

      {/* Viewfinder window */}
      <rect x="22" y="10.5" width="3.5" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="0.9" />

      {/* Strap lugs */}
      <line x1="2.5" y1="13" x2="4" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="28" y1="13" x2="29.5" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Vintage expedition pocket compass with needle and cardinal markers. */
export function VectorCompass({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Top hanging loop */}
      <circle cx="16" cy="5" r="2.5" stroke="currentColor" strokeWidth="1" />
      <rect x="15" y="7" width="2" height="2" stroke="currentColor" strokeWidth="1" fill="currentColor" />

      {/* Compass Dial Outer Ring */}
      <circle cx="16" cy="19" r="10.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.08" />
      {/* Dial Inner Track */}
      <circle cx="16" cy="19" r="8.5" stroke="currentColor" strokeWidth="0.7" strokeDasharray="1.5 1.5" opacity="0.6" />

      {/* Cardinal Ticks */}
      <line x1="16" y1="10.5" x2="16" y2="12" stroke="currentColor" strokeWidth="1.2" />
      <line x1="16" y1="26" x2="16" y2="27.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="7.5" y1="19" x2="9" y2="19" stroke="currentColor" strokeWidth="1.2" />
      <line x1="23" y1="19" x2="24.5" y2="19" stroke="currentColor" strokeWidth="1.2" />

      {/* Compass Needle */}
      {/* North Needle (Solid Filled) */}
      <path d="M 16 11.5 L 18.2 19 L 16 17.5 L 13.8 19 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
      {/* South Needle (Hollow Outline) */}
      <path d="M 16 26.5 L 18.2 19 L 16 20.5 L 13.8 19 Z" stroke="currentColor" strokeWidth="0.9" fill="none" />

      {/* Center Pivot Pin */}
      <circle cx="16" cy="19" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** Layered geometric pine tree matching CampScene styling. */
export function VectorPineTree({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 28 32" fill="none" className={className} aria-hidden="true">
      {/* 3 Tier Pine Layers */}
      <polygon
        points="14,4 8,12 20,12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <polygon
        points="14,9 6,18 22,18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <polygon
        points="14,15 4,26 24,26"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />

      {/* Tree Trunk */}
      <rect
        x="12"
        y="26"
        width="4"
        height="5"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

/** Classic A-frame expedition tent with ridge line and doorway. */
export function VectorCampTent({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 32 28" fill="none" className={className} aria-hidden="true">
      {/* Ridge Line & Tent Body */}
      <polygon
        points="16,5 4,24 28,24"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
      {/* Tent Door Flap Opening */}
      <polygon
        points="16,5 20,24 12,24"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.35"
      />
      {/* Front Center Guy Line & Peg */}
      <line x1="16" y1="5" x2="16" y2="2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="4" y1="24" x2="1" y2="26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="28" y1="24" x2="31" y2="26" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
