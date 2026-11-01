import React, { useEffect, useRef, useState } from 'react';
import type { Theme } from '../lib/theme';

interface ShootingStarEffect {
  id: number;
  x: number;
  y: number;
}

/** Pre-calculated natural star positions for the deep night sky */
const NIGHT_SKY_STARS = [
  { x: 7, y: 14, size: 2, delay: 0 },
  { x: 15, y: 38, size: 1.5, delay: 1.2 },
  { x: 22, y: 22, size: 2.2, delay: 2.1 },
  { x: 31, y: 12, size: 1.2, delay: 0.6 },
  { x: 38, y: 45, size: 1.8, delay: 1.8 },
  { x: 49, y: 16, size: 2.5, delay: 2.8 },
  { x: 58, y: 34, size: 1.4, delay: 0.4 },
  { x: 67, y: 18, size: 2.2, delay: 1.5 },
  { x: 74, y: 42, size: 1.2, delay: 2.4 },
  { x: 82, y: 15, size: 2.6, delay: 0.9 },
  { x: 89, y: 32, size: 1.6, delay: 2.0 },
  { x: 94, y: 10, size: 2, delay: 1.1 },
  { x: 12, y: 72, size: 1.4, delay: 0.7 },
  { x: 26, y: 84, size: 2, delay: 2.3 },
  { x: 78, y: 76, size: 1.5, delay: 1.4 },
  { x: 88, y: 68, size: 2.2, delay: 2.6 },
];

/** Shooting star for dark mode — a long, luminous streak that dashes across the night sky. */
function ShootingStar({ x, y }: { x: number; y: number }): React.ReactElement {
  return (
    <div className="absolute shooting-star-anim" style={{ left: `${x}%`, top: `${y}%` }}>
      <div
        style={{
          width: 150,
          height: 2,
          transform: 'rotate(32deg)',
          background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.4) 50%, #ffffff 100%)',
          borderRadius: 1,
          boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.75)',
        }}
      />
    </div>
  );
}

/**
 * Background Effects & Atmosphere:
 * - ☀️ Light mode: Morning sunbeam glow, crisp travel stamps, dashed flight path, camp doodle accents
 * - ☾ Dark mode (Direction 2: 深邃星空夜幕):
 *     Crystal-clear Deep Midnight Navy backdrop, subtle cosmic nebula wash,
 *     twinkling stars, delicate Big Dipper constellation, and occasional shooting stars.
 *     NO noisy stamps, NO dots, NO emoji clutter.
 */
export function BackgroundEffects({ theme }: { theme: Theme }): React.ReactElement {
  const [stars, setStars] = useState<ShootingStarEffect[]>([]);
  const idRef = useRef(0);
  const timerRef = useRef<number>(0);

  useEffect(() => {
    setStars([]);

    if (theme !== 'dark') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let mounted = true;

    function spawn() {
      if (!mounted) return;

      const id = idRef.current++;
      const fromTopOnly = Math.random() > 0.35;
      const star: ShootingStarEffect = fromTopOnly
        ? {
            id,
            x: Math.random() * 70,
            y: -15,
          }
        : {
            id,
            x: -12,
            y: Math.random() * 20 - 5,
          };

      setStars((prev) => [...prev, star]);

      setTimeout(() => {
        if (mounted) setStars((prev) => prev.filter((s) => s.id !== id));
      }, 1800);

      const nextDelay = Math.random() * 18000 + 12000;
      timerRef.current = window.setTimeout(spawn, nextDelay);
    }

    const initialDelay = Math.random() * 2500 + 2000;
    timerRef.current = window.setTimeout(spawn, initialDelay);

    return () => {
      mounted = false;
      window.clearTimeout(timerRef.current);
    };
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none"
      aria-hidden="true"
    >
      {/* ── ☾ DARK MODE: 深邃星空夜幕 (Clean Midnight Sky) ── */}
      {isDark ? (
        <>
          {/* Deep Cosmic Nebula Wash */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(30, 58, 138, 0.22) 0%, transparent 65%), radial-gradient(circle at 85% 15%, rgba(99, 102, 241, 0.15) 0%, transparent 45%), radial-gradient(circle at 15% 85%, rgba(14, 165, 233, 0.1) 0%, transparent 45%)',
            }}
          />

          {/* Delicate Big Dipper Constellation (北斗七星) Watermark */}
          <svg
            className="absolute top-12 right-8 sm:right-24 w-72 h-44 hidden md:block"
            style={{ opacity: 0.3 }}
            fill="none"
          >
            <path
              d="M 20 120 L 70 95 L 125 105 L 175 75 L 220 50 L 250 20 L 275 25"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            {/* Stars along the path */}
            {[
              { cx: 20, cy: 120, r: 2.5 },
              { cx: 70, cy: 95, r: 2 },
              { cx: 125, cy: 105, r: 2.2 },
              { cx: 175, cy: 75, r: 2.8 },
              { cx: 220, cy: 50, r: 2.2 },
              { cx: 250, cy: 20, r: 2 },
              { cx: 275, cy: 25, r: 3 },
            ].map((p, idx) => (
              <g key={idx}>
                <circle cx={p.cx} cy={p.cy} r={p.r * 2.2} fill="rgba(251, 191, 36, 0.2)" />
                <circle cx={p.cx} cy={p.cy} r={p.r} fill="#ffffff" />
              </g>
            ))}
          </svg>

          {/* Natural Twinkling Stars */}
          {NIGHT_SKY_STARS.map((star, idx) => (
            <div
              key={idx}
              className="absolute rounded-full star-twinkle"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                backgroundColor: idx % 3 === 0 ? '#fbbf24' : '#ffffff',
                boxShadow:
                  star.size > 2
                    ? `0 0 6px 1.5px ${idx % 3 === 0 ? 'rgba(251, 191, 36, 0.7)' : 'rgba(255, 255, 255, 0.8)'}`
                    : undefined,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}

          {/* Shooting Stars */}
          {stars.map((s) => (
            <ShootingStar key={s.id} x={s.x} y={s.y} />
          ))}
        </>
      ) : (
        /* ── ☀️ LIGHT MODE: 溫潤手帳紙與旅行戳印 ── */
        <>
          {/* Ambient Morning Sunlight & Fresh Sage Wash */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 8% 8%, rgba(254, 215, 170, 0.45) 0%, transparent 42%), radial-gradient(circle at 92% 88%, rgba(209, 250, 229, 0.4) 0%, transparent 38%), radial-gradient(circle at 85% 15%, rgba(224, 242, 254, 0.35) 0%, transparent 35%)',
            }}
          />

          {/* Top-right Vintage Travel Passport Stamp */}
          <div
            className="absolute top-14 right-6 sm:right-16"
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: '2.5px dashed rgba(194, 65, 12, 0.24)',
              color: '#c2410c',
              opacity: 0.24,
              transform: 'rotate(16deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontFamily: 'monospace',
              letterSpacing: 1,
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 800 }}>★ ROAMLOG ★</span>
            <span style={{ fontSize: 13, fontWeight: 900, margin: '2px 0' }}>2026 ENTRY</span>
            <span style={{ fontSize: 8 }}>PASSPORT STAMP</span>
          </div>

          {/* Bottom-left Mountain Camp Badge Stamp */}
          <div
            className="absolute bottom-16 left-6 sm:left-14"
            style={{
              width: 120,
              height: 120,
              borderRadius: 20,
              border: '2px solid rgba(37, 99, 235, 0.24)',
              color: '#2563eb',
              opacity: 0.22,
              transform: 'rotate(-12deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ fontSize: 22 }}>🏕</span>
            <span style={{ fontSize: 9, fontWeight: 900, marginTop: 2 }}>EXPEDITION</span>
            <span style={{ fontSize: 7, opacity: 0.8 }}>FIELD NOTE</span>
          </div>

          {/* Top Curving Dotted Flight Path */}
          <svg
            className="absolute top-2 left-1/4 w-1/2 h-28 hidden md:block"
            style={{ opacity: 0.18 }}
            fill="none"
          >
            <path
              d="M 10 70 Q 150 10 320 40 T 600 20"
              stroke="#f2722b"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <text x="320" y="32" fill="#f2722b" fontSize="14">
              ✈
            </text>
          </svg>

          {/* Hand-drawn Doodles in Margins */}
          <div className="absolute top-44 left-5 sm:left-10 text-xl hidden lg:block" style={{ opacity: 0.22 }}>
            ☕
          </div>
          <div className="absolute bottom-60 right-6 sm:right-12 text-2xl hidden lg:block" style={{ opacity: 0.22 }}>
            📷
          </div>
          <div className="absolute top-96 right-10 text-xl hidden xl:block" style={{ opacity: 0.22 }}>
            🧭
          </div>
          <div className="absolute bottom-36 left-1/3 text-lg hidden md:block" style={{ opacity: 0.22 }}>
            🌲
          </div>
        </>
      )}
    </div>
  );
}
