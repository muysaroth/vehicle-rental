import { useState } from 'react'

/**
 * Small dependency-free SVG charts: grouped bars and lines over shared
 * categories. Enough for the MIS reports without pulling in a chart library.
 */

export interface Series {
  name: string
  color: string
  values: number[]
}

interface ChartProps {
  labels: string[]
  series: Series[]
  format?: (n: number) => string
  height?: number
  kind?: 'bar' | 'line'
}

const W = 720
const PAD = { top: 12, right: 12, bottom: 28, left: 64 }

function niceMax(n: number): number {
  if (n <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  return Math.ceil(n / p) * p
}

export function Chart({ labels, series, format = (n) => String(Math.round(n)), height = 240, kind = 'bar' }: ChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)))
  const plotW = W - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const step = plotW / Math.max(1, labels.length)
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const barW = Math.min(28, (step * 0.7) / series.length)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img">
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tk)} y2={y(tk)} stroke="#e2e8f0" />
            <text x={PAD.left - 8} y={y(tk) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {format(tk)}
            </text>
          </g>
        ))}

        {labels.map((label, i) => (
          <text key={label} x={PAD.left + step * i + step / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#64748b">
            {label}
          </text>
        ))}

        {kind === 'bar'
          ? series.map((s, si) =>
              s.values.map((v, i) => {
                const x = PAD.left + step * i + step / 2 - (barW * series.length) / 2 + si * barW
                return <rect key={`${si}-${i}`} x={x} y={y(v)} width={barW - 2} height={Math.max(0, PAD.top + plotH - y(v))} rx="3" fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />
              }),
            )
          : series.map((s) => (
              <g key={s.name}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  points={s.values.map((v, i) => `${PAD.left + step * i + step / 2},${y(v)}`).join(' ')}
                />
                {s.values.map((v, i) => (
                  <circle key={i} cx={PAD.left + step * i + step / 2} cy={y(v)} r={hover === i ? 4.5 : 3} fill={s.color} />
                ))}
              </g>
            ))}

        {labels.map((label, i) => (
          <rect
            key={`hit-${label}`}
            x={PAD.left + step * i}
            y={PAD.top}
            width={step}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      {hover !== null && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow">
          <div className="mb-1 font-semibold">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex justify-between gap-4">
              <span style={{ color: s.color }}>{s.name}</span>
              <span className="tabular-nums">{format(s.values[hover])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** A single horizontal meter, for utilisation and shares. */
export function Meter({ value, color = '#0f766e' }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} />
    </div>
  )
}

export const TYPE_COLORS: Record<string, string> = {
  car: '#0f766e',
  suv: '#2563eb',
  van: '#d97706',
  pickup: '#7c3aed',
  motorbike: '#db2777',
}
