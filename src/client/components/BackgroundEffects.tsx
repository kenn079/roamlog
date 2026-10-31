import React, { useEffect, useRef, useState } from 'react';
import type { Theme } from '../lib/theme';

interface StarEffect {
  id: number;
  x: number;
  y: number;
}

/** Shooting star for dark mode — a long, luminous streak that dashes across the night sky. */
function ShootingStar({ x, y }: { x: number; y: number }): React.ReactElement {
  return (
    <div className="absolute shooting-star-anim" style={{ left: `${x}%`, top: `${y}%` }}>
      <div
        style={{
          width: 140,
          height: 2,
          transform: 'rotate(32deg)',
          background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.4) 60%, var(--scene-snow) 100%)',
          borderRadius: 1,
          boxShadow: '0 0 8px 1.5px color-mix(in srgb, var(--scene-snow) 60%, transparent)',
        }}
      />
    </div>
  );
}

/**
 * Subtle ambient background effects:
 *   ☾ dark  → occasional shooting stars streaking across the night sky
 *   (light mode has no animation as requested)
 *
 * Placed behind interactive map cards (z-0 / pointer-events-none).
 */
export function BackgroundEffects({ theme }: { theme: Theme }): React.ReactElement | null {
  const [stars, setStars] = useState<StarEffect[]>([]);
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
      // Start outside the screen bounds (either above the top edge or beyond the top-left)
      // so it seamlessly streaks into view
      const fromTopOnly = Math.random() > 0.35;
      const star: StarEffect = fromTopOnly
        ? {
            id,
            x: Math.random() * 70, // 0% ~ 70%
            y: -15, // completely above viewport
          }
        : {
            id,
            x: -12, // completely to the left of viewport
            y: Math.random() * 20 - 5,
          };

      setStars((prev) => [...prev, star]);

      // Remove effect after animation finishes (1.8s)
      setTimeout(() => {
        if (mounted) setStars((prev) => prev.filter((s) => s.id !== id));
      }, 1800);

      // Next meteor in 15 – 35s
      const nextDelay = Math.random() * 20000 + 15000;
      timerRef.current = window.setTimeout(spawn, nextDelay);
    }

    // First meteor after 3 - 6 seconds
    const initialDelay = Math.random() * 3000 + 3000;
    timerRef.current = window.setTimeout(spawn, initialDelay);

    return () => {
      mounted = false;
      window.clearTimeout(timerRef.current);
    };
  }, [theme]);

  if (theme !== 'dark') return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {stars.map((s) => (
        <ShootingStar key={s.id} x={s.x} y={s.y} />
      ))}
    </div>
  );
}

