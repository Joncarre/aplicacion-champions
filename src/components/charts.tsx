import { useId } from 'react'
import type { EvolutionPoint } from '@/lib/standings'

/**
 * Gráficas del perfil, dibujadas a mano en SVG.
 *
 * Son series muy pequeñas —ocho jornadas— así que una librería de gráficos
 * pesaría más que el código que hace falta, y de este modo el estilo encaja
 * exactamente con el resto de la aplicación.
 */

const WIDTH = 320
const HEIGHT = 150
const PAD_X = 10
const PAD_TOP = 14
const PAD_BOTTOM = 24

const plotWidth = WIDTH - PAD_X * 2
const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

function xAt(index: number, count: number): number {
  if (count <= 1) return PAD_X + plotWidth / 2
  return PAD_X + (index / (count - 1)) * plotWidth
}

function toPath(coordinates: [number, number][]): string {
  return coordinates.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

/* ────────────────────────────── Puntos acumulados ────────────────────────────── */

/**
 * Puntos que llevas jornada a jornada frente al máximo que se podía sacar.
 * El hueco entre las dos líneas es, literalmente, lo que has dejado escapar.
 */
export function CumulativeChart({ points }: { points: EvolutionPoint[] }) {
  const gradientId = useId()
  const played = points.filter((point) => point.played)
  if (played.length === 0) return <ChartPlaceholder />

  const ceiling = Math.max(1, ...played.map((point) => point.maxCumulative))
  const yAt = (value: number) => PAD_TOP + (1 - value / ceiling) * plotHeight

  const mine: [number, number][] = played.map((point, index) => [xAt(index, played.length), yAt(point.cumulative)])
  const best: [number, number][] = played.map((point, index) => [xAt(index, played.length), yAt(point.maxCumulative)])
  const last = played[played.length - 1]

  const area = `${toPath(mine)} L${xAt(played.length - 1, played.length).toFixed(1)},${(PAD_TOP + plotHeight).toFixed(1)} L${PAD_X},${(PAD_TOP + plotHeight).toFixed(1)} Z`

  return (
    <figure className="card p-4">
      <ChartHeading
        title="Puntos acumulados"
        detail={`${last?.cumulative ?? 0} de ${last?.maxCumulative ?? 0} posibles`}
      />

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-3 h-auto w-full" role="img" aria-label={ariaFor(played)}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={PAD_X}
          y1={PAD_TOP + plotHeight}
          x2={WIDTH - PAD_X}
          y2={PAD_TOP + plotHeight}
          stroke="var(--color-line)"
          strokeWidth="1"
        />

        <path d={toPath(best)} fill="none" stroke="var(--color-line)" strokeWidth="1.5" strokeDasharray="3 4" />
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={toPath(mine)}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {mine.map(([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={index === mine.length - 1 ? 4 : 2.5}
            fill="var(--color-base)"
            stroke="var(--color-brand)"
            strokeWidth="2"
          />
        ))}

        <AxisLabels points={played} />
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-mute">
        <LegendDot color="var(--color-brand)" label="Tus puntos" />
        <LegendDot color="var(--color-line)" label="Máximo posible" dashed />
      </figcaption>
    </figure>
  )
}

/* ────────────────────────────── Distancia con el líder ────────────────────────────── */

/** Cuántos puntos te sacaba el primero al cerrar cada jornada. */
export function GapChart({ points }: { points: EvolutionPoint[] }) {
  const played = points.filter((point) => point.played)
  if (played.length === 0) return <ChartPlaceholder />

  const worst = Math.min(-1, ...played.map((point) => point.gapToLeader))
  const barWidth = Math.min(28, (plotWidth / played.length) * 0.6)
  const last = played[played.length - 1]

  return (
    <figure className="card p-4">
      <ChartHeading
        title="Distancia con el líder"
        detail={last?.gapToLeader === 0 ? 'Vas primero' : `${last?.gapToLeader ?? 0} puntos`}
      />

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`Diferencia de puntos con el primer clasificado en cada jornada: ${played
          .map((point) => `jornada ${point.matchday}, ${point.gapToLeader}`)
          .join('; ')}`}
      >
        <line
          x1={PAD_X}
          y1={PAD_TOP}
          x2={WIDTH - PAD_X}
          y2={PAD_TOP}
          stroke="var(--color-gold)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />

        {played.map((point, index) => {
          const height = (Math.abs(point.gapToLeader) / Math.abs(worst)) * plotHeight
          const x = xAt(index, played.length) - barWidth / 2
          const leader = point.gapToLeader === 0

          return (
            <g key={point.matchday}>
              <rect
                x={x}
                y={PAD_TOP}
                width={barWidth}
                height={Math.max(leader ? 3 : 4, height)}
                rx="3"
                fill={leader ? 'var(--color-gold)' : 'var(--color-brand)'}
                opacity={leader ? 1 : 0.55}
              />
              {!leader ? (
                <text
                  x={xAt(index, played.length)}
                  y={PAD_TOP + Math.max(4, height) + 11}
                  textAnchor="middle"
                  className="fill-[var(--color-ink-mute)] text-[9px]"
                >
                  {point.gapToLeader}
                </text>
              ) : null}
            </g>
          )
        })}

        <AxisLabels points={played} />
      </svg>

      <figcaption className="mt-2 text-[11px] text-ink-mute">
        La línea dorada es el líder de la porra en ese momento.
      </figcaption>
    </figure>
  )
}

/* ────────────────────────────── Reparto de aciertos ────────────────────────────── */

interface HitsProps {
  signHits: number
  exactHits: number
  missed: number
}

/** Cómo se reparten tus pronósticos entre exactos, de signo y fallados. */
export function HitsDonut({ signHits, exactHits, missed }: HitsProps) {
  const total = signHits + exactHits + missed
  if (total === 0) return <ChartPlaceholder />

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const segments = [
    { value: exactHits, color: 'var(--color-exact)', label: 'Marcador exacto' },
    { value: signHits, color: 'var(--color-sign)', label: 'Solo el signo' },
    { value: missed, color: 'var(--color-line)', label: 'Fallados' },
  ]

  let offset = 0
  const hits = signHits + exactHits

  return (
    <figure className="card p-4">
      <ChartHeading title="Tus aciertos" detail={`${Math.round((hits / total) * 100)} % de acierto`} />

      <div className="mt-3 flex items-center gap-5">
        <svg
          viewBox="0 0 140 140"
          className="size-32 shrink-0 -rotate-90"
          role="img"
          aria-label={`De ${total} pronósticos: ${exactHits} con el marcador exacto, ${signHits} solo con el signo y ${missed} fallados`}
        >
          {segments.map((segment) => {
            const length = (segment.value / total) * circumference
            const dash = `${length} ${circumference - length}`
            const element = (
              <circle
                key={segment.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            )
            offset += length
            return element
          })}
        </svg>

        <ul className="min-w-0 flex-1 space-y-2">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="truncate text-ink-soft">{segment.label}</span>
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">{segment.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}

/* ────────────────────────────── Piezas compartidas ────────────────────────────── */

export function StatTile({
  label,
  value,
  hint,
  tone = 'ink',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'ink' | 'brand' | 'gold' | 'exact'
}) {
  const colors = {
    ink: 'text-ink',
    brand: 'text-brand-soft',
    gold: 'text-gold',
    exact: 'text-exact',
  } as const

  return (
    <div className="card px-3.5 py-3">
      <p className="text-[11px] font-medium text-ink-mute">{label}</p>
      <p className={`mt-1 font-mono text-2xl leading-none font-bold tabular-nums ${colors[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-ink-mute">{hint}</p> : null}
    </div>
  )
}

function ChartHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <span className="shrink-0 font-mono text-xs tabular-nums text-ink-mute">{detail}</span>
    </div>
  )
}

function AxisLabels({ points }: { points: EvolutionPoint[] }) {
  return (
    <>
      {points.map((point, index) => (
        <text
          key={point.matchday}
          x={xAt(index, points.length)}
          y={HEIGHT - 6}
          textAnchor="middle"
          className="fill-[var(--color-ink-mute)] text-[9px]"
        >
          J{point.matchday}
        </text>
      ))}
    </>
  )
}

function LegendDot({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-0.5 w-4 rounded-full"
        style={
          dashed
            ? { backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)` }
            : { backgroundColor: color }
        }
      />
      {label}
    </span>
  )
}

function ChartPlaceholder() {
  return (
    <div className="card grid min-h-36 place-items-center px-4 py-8 text-center">
      <p className="max-w-56 text-sm text-balance text-ink-mute">
        Aquí aparecerá tu evolución en cuanto se juegue la primera jornada.
      </p>
    </div>
  )
}

function ariaFor(points: EvolutionPoint[]): string {
  const detail = points.map((point) => `jornada ${point.matchday}, ${point.cumulative} puntos`).join('; ')
  return `Puntos acumulados por jornada: ${detail}`
}
