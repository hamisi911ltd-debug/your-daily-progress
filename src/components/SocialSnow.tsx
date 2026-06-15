import { useMemo } from "react";

function IgIcon({ uid }: { uid: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`ig${uid}`} cx="30%" cy="110%" r="140%">
          <stop offset="0%"  stopColor="#fdf497" />
          <stop offset="40%" stopColor="#fd5949" />
          <stop offset="65%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#ig${uid})`} />
      <rect x="7" y="7" width="18" height="18" rx="4.5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="16" cy="16" r="5" stroke="white" strokeWidth="1.8" />
      <circle cx="22" cy="10" r="1.2" fill="white" />
    </svg>
  );
}

function TtIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#010101" />
      <path d="M21 8c-.5 1.4-1.7 2.4-3.1 2.6v8.9a3 3 0 11-3-3c.3 0 .5 0 .8.1V13a6.5 6.5 0 105.8 6.5V12.1a9.2 9.2 0 004.5 1.2v-3A5 5 0 0121 8z"
        fill="#69C9D0" transform="translate(1 0)" opacity="0.7" />
      <path d="M21 8c-.5 1.4-1.7 2.4-3.1 2.6v8.9a3 3 0 11-3-3c.3 0 .5 0 .8.1V13a6.5 6.5 0 105.8 6.5V12.1a9.2 9.2 0 004.5 1.2v-3A5 5 0 0121 8z"
        fill="#EE1D52" transform="translate(-1 0)" opacity="0.7" />
      <path d="M21 8c-.5 1.4-1.7 2.4-3.1 2.6v8.9a3 3 0 11-3-3c.3 0 .5 0 .8.1V13a6.5 6.5 0 105.8 6.5V12.1a9.2 9.2 0 004.5 1.2v-3A5 5 0 0121 8z"
        fill="white" />
    </svg>
  );
}

function SpIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#1DB954" />
      <path d="M23 20.5c-3.8-2.2-8.5-2.5-12.5-.7-.4.2-.9 0-1.1-.4s0-.9.4-1.1c4.5-1.9 9.7-1.6 13.8.8.4.2.5.7.3 1.1-.3.4-.7.5-.9.3z" fill="white" />
      <path d="M24.5 17c-4.2-2.6-10.5-2.8-14.5-.7-.5.3-1.2.1-1.4-.4s-.1-1.1.4-1.4c4.7-2.2 11.4-2 16.2.8.5.3.7.9.4 1.4-.3.4-.8.5-1.1.3z" fill="white" />
      <path d="M25.5 13.4c-4.8-2.8-12.8-3-17.5-.2-.6.3-1.3.1-1.6-.5s-.1-1.3.5-1.6c5.5-3.2 14-2.9 19.6.2.6.3.8 1 .5 1.5-.4.6-1 .8-1.5.6z" fill="white" />
    </svg>
  );
}

function YtIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#FF0000" />
      <path d="M27 11.7a3 3 0 00-2.1-2.1C23 9 16 9 16 9s-7 0-8.9.6A3 3 0 005 11.7C4.4 13.6 4.4 16 4.4 16s0 2.4.6 4.3a3 3 0 002.1 2.1C9 23 16 23 16 23s7 0 8.9-.6a3 3 0 002.1-2.1c.6-1.9.6-4.3.6-4.3s0-2.4-.6-4.3z" fill="white" fillOpacity="0.15" />
      <polygon points="13,12 13,20 21,16" fill="white" />
    </svg>
  );
}

function ScIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#FFFC00" />
      <path
        d="M16 5.5c-3.6 0-6 2.7-6 6.2v1.5c-.4.2-.9.3-1.4.3-.6 0-1 .3-.9 1 .1.5.6.8 1.1.9-.3.7-.9 1.8-2 2.2-.3.1-.5.4-.4.8.1.3.4.5.8.6.6.2 1.4.4 2 .5.1.4.3.9.7 1.1.2.1.4.1.5.1h.2c.7 0 1.4-.3 2.2-.6.6-.2 1.2-.4 2-.4s1.4.2 2 .4c.8.3 1.5.6 2.2.6h.2c.2 0 .3 0 .5-.1.4-.2.6-.7.7-1.1.6-.1 1.4-.3 2-.5.4-.1.7-.3.8-.6.1-.4-.1-.7-.4-.8-1.1-.4-1.7-1.5-2-2.2.5-.1 1-.4 1.1-.9.1-.7-.3-1-1-.9-.4 0-.9-.1-1.3-.3v-1.5c0-3.5-2.4-6.2-6-6.2z"
        fill="#1A1A1A"
      />
    </svg>
  );
}

const ICONS = [IgIcon, TtIcon, SpIcon, YtIcon, ScIcon] as const;

interface Flake {
  id: string;
  type: number;
  uid: string;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  rot: number;
}

// 15 icons, large, evenly spread horizontally
const FLAKES: Flake[] = Array.from({ length: 15 }, (_, i) => ({
  id: `sf${i}`,
  type: i % 5,
  uid: `h${i}`,
  x: Math.round((i * 7 + [4, 11, 19, 26, 33, 41, 48, 55, 62, 69, 76, 83, 90, 97, 3][i]) % 100),
  size: [42, 50, 38, 56, 44, 52, 40, 48, 54, 38, 46, 50, 42, 56, 44][i],
  duration: [14, 11, 16, 12, 18, 13, 15, 11, 17, 13, 16, 12, 14, 10, 15][i],
  delay: [-4, -9, -2, -14, -7, -11, -1, -16, -5, -12, -3, -8, -15, -6, -10][i],
  opacity: [0.55, 0.65, 0.50, 0.70, 0.60, 0.55, 0.65, 0.50, 0.60, 0.70, 0.55, 0.65, 0.50, 0.60, 0.65][i],
  rot: i % 2 === 0 ? 160 : -160,
}));

export function SocialSnow() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      {FLAKES.map((f) => {
        const Icon = ICONS[f.type as keyof typeof ICONS];
        return (
          <div
            key={f.id}
            className="absolute"
            style={{
              left: `${f.x}%`,
              top: 0,
              width: f.size,
              height: f.size,
              opacity: f.opacity,
              animation: `socialFall ${f.duration}s ${f.delay}s linear infinite`,
              "--fall-rot": `${f.rot}deg`,
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            } as React.CSSProperties}
          >
            {f.type === 0 ? <IgIcon uid={f.uid} /> : <Icon />}
          </div>
        );
      })}
    </div>
  );
}
