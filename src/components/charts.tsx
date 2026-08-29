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
const HEIGHT = 158
/** Hueco a la izquierda para las etiquetas del eje vertical. */
const PAD_LEFT = 30
const PAD_RIGHT = 10
const PAD_TOP = 12
const PAD_BOTTOM = 24

const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT
const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

function xAt(index: number, count: number): number {
  if (count <= 1) return PAD_LEFT + plotWidth / 2
  return PAD_LEFT + (index / (count - 1)) * plotWidth
}

function toPath(coordinates: [number, number][]): string {
  return coordinates.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

/**
 * Marcas del eje vertical en valores redondos (10, 25, 50, 100…) en vez de en
 * los números sueltos que salgan de los datos, que es lo que hace que un eje
 * se lea de un vistazo.
 */
function axisTicks(max: number, intervals: number): number[] {
  if (max <= 0) return [0]
  const rough = max / intervals
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude
  const top = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let value = 0; value <= top + step / 100; value += step) ticks.push(Math.round(value))
  return ticks
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

  const ticks = axisTicks(Math.max(1, ...played.map((point) => point.maxCumulative)), 4)
  const ceiling = ticks[ticks.length - 1] ?? 1
  const yAt = (value: number) => PAD_TOP + (1 - value / ceiling) * plotHeight

  const mine: [number, number][] = played.map((point, index) => [xAt(index, played.length), yAt(point.cumulative)])
  const best: [number, number][] = played.map((point, index) => [xAt(index, played.length), yAt(point.maxCumulative)])
  const last = played[played.length - 1]

  const floor = (PAD_TOP + plotHeight).toFixed(1)
  const area = `${toPath(mine)} L${xAt(played.length - 1, played.length).toFixed(1)},${floor} L${PAD_LEFT},${floor} Z`

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

        <YAxis ticks={ticks} yAt={yAt} />

        <path d={toPath(best)} fill="none" stroke="var(--color-sky)" strokeWidth="1" strokeDasharray="3 4" />
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

        <XAxis points={played} />
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-mute">
        <LegendDot color="var(--color-brand)" label="Tus puntos" />
        <LegendDot color="var(--color-sky)" label="Máximo posible" dashed />
      </figcaption>
    </figure>
  )
}

/* ────────────────────────────── Distancia con el líder ────────────────────────────── */

/**
 * Cuántos puntos te sacaba el primero al cerrar cada jornada.
 *
 * Se dibuja como un área que cuelga de la línea dorada del líder: el cero está
 * arriba y el hueco entre ambas es la distancia. Al ser la misma gramática que
 * la gráfica de puntos acumulados, las dos se leen igual.
 */
export function GapChart({ points }: { points: EvolutionPoint[] }) {
  const gradientId = useId()
  const played = points.filter((point) => point.played)
  if (played.length === 0) return <ChartPlaceholder />

  const worst = Math.max(1, ...played.map((point) => Math.abs(point.gapToLeader)))
  const ticks = axisTicks(worst, 3)
  const depth = ticks[ticks.length - 1] ?? 1
  // El cero está arriba y la distancia crece hacia abajo.
  const yAt = (value: number) => PAD_TOP + (Math.abs(value) / depth) * plotHeight

  const line: [number, number][] = played.map((point, index) => [
    xAt(index, played.length),
    yAt(point.gapToLeader),
  ])
  const last = played[played.length - 1]
  const lastX = xAt(played.length - 1, played.length).toFixed(1)

  // El área se cierra contra la línea del líder, no contra el suelo.
  const area = `${toPath(line)} L${lastX},${PAD_TOP} L${PAD_LEFT},${PAD_TOP} Z`

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
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <YAxis ticks={ticks} yAt={yAt} format={(value) => (value === 0 ? '0' : `−${value}`)} />

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={toPath(line)}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {line.map(([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={index === line.length - 1 ? 4 : 2.5}
            fill="var(--color-base)"
            stroke="var(--color-brand)"
            strokeWidth="2"
          />
        ))}

        {/* La línea del líder va encima de todo para que nunca se pierda. */}
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={WIDTH - PAD_RIGHT}
          y2={PAD_TOP}
          stroke="var(--color-gold)"
          strokeWidth="1.5"
        />

        <XAxis points={played} />
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-mute">
        <LegendDot color="var(--color-gold)" label="Líder" />
        <LegendDot color="var(--color-brand)" label="Tú" />
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

function ChartHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <span className="shrink-0 font-mono text-xs tabular-nums text-ink-mute">{detail}</span>
    </div>
  )
}

/** Eje vertical con sus líneas de referencia y sus etiquetas. */
function YAxis({
  ticks,
  yAt,
  format = String,
}: {
  ticks: number[]
  yAt: (value: number) => number
  format?: (value: number) => string
}) {
  return (
    <>
      {ticks.map((tick) => {
        const y = yAt(tick)
        return (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              y1={y}
              x2={WIDTH - PAD_RIGHT}
              y2={y}
              stroke="var(--color-line-soft)"
              strokeWidth="1"
            />
            <text
              x={PAD_LEFT - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-[var(--color-ink-mute)] font-mono text-[9px]"
            >
              {format(tick)}
            </text>
          </g>
        )
      })}
    </>
  )
}

function XAxis({ points }: { points: EvolutionPoint[] }) {
  return (
    <>
      {points.map((point, index) => (
        <text
          key={point.matchday}
          x={xAt(index, points.length)}
          y={HEIGHT - 6}
          textAnchor="middle"
          className="fill-[var(--color-ink-mute)] font-mono text-[9px]"
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
