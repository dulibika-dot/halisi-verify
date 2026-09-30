import { useState } from 'react';
import type { Hotspot } from '../../types';
import { cn } from '../../utils/cn';

/**
 * A lightweight, offline "map" of Kenya drawn with SVG.
 * The outline is simplified (not survey-accurate) — good enough to show where
 * suspicious activity is concentrated in a prototype. A real map library
 * (e.g. Leaflet) can replace this later without changing the data.
 */

const SCALE = 56;
const project = (lng: number, lat: number) => ({ x: (lng - 33.5) * SCALE, y: (5.3 - lat) * SCALE });
const toPath = (pts: Array<[number, number]>) =>
  pts.map(([lng, lat], i) => {
    const { x, y } = project(lng, lat);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';

// Simplified border, clockwise from the north-west
const KENYA: Array<[number, number]> = [
  [33.99, 4.22], [34.39, 4.61], [35.3, 5.02], [35.92, 4.62], [36.86, 4.45], [38.12, 3.6], [38.67, 3.62],
  [39.56, 3.42], [40.77, 4.26], [41.17, 3.94], [41.89, 3.98], [40.98, 2.78], [40.99, -0.86], [41.56, -1.68],
  [40.9, -2.27], [40.3, -2.6], [40.22, -3.3], [39.9, -3.75], [39.7, -4.3], [39.2, -4.68], [37.76, -3.68],
  [37.7, -3.1], [34.07, -1.06], [33.9, -0.95], [33.89, 0.11], [34.18, 0.63], [34.57, 1.11], [34.9, 1.55],
  [34.98, 2.4], [34.6, 3.1], [34.45, 3.67],
];
const LAKE_VICTORIA: Array<[number, number]> = [
  [33.9, -0.95], [34.07, -1.06], [34.3, -0.62], [34.8, -0.28], [34.5, -0.12], [34.1, -0.05], [33.89, 0.11],
];
const LAKE_TURKANA: Array<[number, number]> = [
  [35.95, 4.4], [36.2, 4.35], [36.35, 3.6], [36.6, 2.9], [36.75, 2.4], [36.55, 2.45], [36.2, 3.2], [35.95, 3.9],
];

export type HotspotLevel = 'high' | 'medium' | 'low';

export function hotspotLevel(h: Hotspot): HotspotLevel {
  const score = h.suspicious + h.invalid * 0.6;
  return score >= 30 ? 'high' : score >= 10 ? 'medium' : 'low';
}

const LEVEL_COLOR: Record<HotspotLevel, string> = { high: '#d03b3b', medium: '#f59e0b', low: '#14b8a6' };

interface Props {
  hotspots: Hotspot[];
  selected: string | null;
  onSelect: (name: string) => void;
}

export function KenyaMap({ hotspots, selected, onSelect }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...hotspots.map((h) => h.suspicious + h.invalid));
  const hovered = hotspots.find((h) => h.name === hover);

  return (
    <div className="relative">
      <svg viewBox="0 0 500 580" className="h-auto w-full" role="img" aria-label="Simulated map of Kenya showing verification hotspots">
        <defs>
          <pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#e2e8f0" strokeWidth="0.6" />
          </pattern>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#eef2f6" />
          </linearGradient>
          <filter id="land-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.08" />
          </filter>
        </defs>

        <rect width="500" height="580" fill="url(#map-grid)" />
        <text x="440" y="470" fill="#94a3b8" fontSize="11" fontStyle="italic" textAnchor="middle">
          Indian Ocean
        </text>

        <path d={toPath(KENYA)} fill="url(#land)" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" filter="url(#land-shadow)" />
        <path d={toPath(LAKE_VICTORIA)} fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />
        <path d={toPath(LAKE_TURKANA)} fill="#dbeafe" stroke="#93c5fd" strokeWidth="1" />

        {/* biggest circles first so small ones stay clickable on top */}
        {[...hotspots].sort((a, b) => b.suspicious + b.invalid - (a.suspicious + a.invalid)).map((h) => {
          const { x, y } = project(h.lng, h.lat);
          const weight = (h.suspicious + h.invalid) / max;
          const r = 6 + Math.sqrt(weight) * 26;
          const level = hotspotLevel(h);
          const color = LEVEL_COLOR[level];
          const isActive = selected === h.name || hover === h.name;
          return (
            <g
              key={h.name}
              className="cursor-pointer"
              onClick={() => onSelect(h.name)}
              onMouseEnter={() => setHover(h.name)}
              onMouseLeave={() => setHover(null)}
              tabIndex={0}
              role="button"
              aria-label={`${h.name}: ${h.suspicious} suspicious, ${h.invalid} invalid`}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(h.name)}
            >
              {level === 'high' && (
                <circle cx={x} cy={y} r={r} fill={color} opacity="0.25">
                  <animate attributeName="r" from={r} to={r * 1.7} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.3" to="0" dur="2.2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={x} cy={y} r={r + 8} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={color}
                fillOpacity={isActive ? 0.45 : 0.28}
                stroke={color}
                strokeWidth={isActive ? 2.5 : 1.5}
                className="transition-all duration-200"
              />
              <circle cx={x} cy={y} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* Labels in a separate pass so no circle covers them. Only notable towns (or the one in focus). */}
        {hotspots.map((h) => {
          const isActive = selected === h.name || hover === h.name;
          if (hotspotLevel(h) === 'low' && !isActive) return null;
          const { x, y } = project(h.lng, h.lat);
          const r = 6 + Math.sqrt((h.suspicious + h.invalid) / max) * 26;
          return (
            <text
              key={h.name}
              x={x}
              y={y - r - 6}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight={isActive ? 700 : 600}
              fill="#334155"
              stroke="#fff"
              strokeWidth="3"
              paintOrder="stroke"
              className="pointer-events-none"
            >
              {h.name}
            </text>
          );
        })}

        {/* compass */}
        <g transform="translate(462 40)" fill="#94a3b8">
          <path d="M0 -16 L5 0 L0 -3 L-5 0 Z" />
          <text y="12" textAnchor="middle" fontSize="10" fontWeight="600">
            N
          </text>
        </g>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur">
          <p className="font-semibold text-slate-900">
            {hovered.name} <span className="font-normal text-slate-500">· {hovered.county}</span>
          </p>
          <p className="mt-1 text-slate-600">
            <span className="font-semibold text-amber-700">{hovered.suspicious}</span> suspicious ·{' '}
            <span className="font-semibold text-rose-700">{hovered.invalid}</span> invalid · {hovered.totalVerifications} total
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {(['high', 'medium', 'low'] as const).map((l) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={cn('size-3 rounded-full border-2')} style={{ borderColor: LEVEL_COLOR[l], background: `${LEVEL_COLOR[l]}55` }} />
            {l === 'high' ? 'High concentration' : l === 'medium' ? 'Medium' : 'Low'}
          </span>
        ))}
        <span className="text-slate-400">Circle size = suspicious + invalid checks</span>
      </div>
    </div>
  );
}
