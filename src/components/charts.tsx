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

/** Puntos que llevas acumulados jornada a jornada. */
export function CumulativeChart({ points }: { points: EvolutionPoint[] }) {
  const gradientId = useId()
  const played = points.filter((point) => point.played)
  if (played.length === 0) return <ChartPlaceholder />

  const ticks = axisTicks(Math.max(1, ...played.map((point) => point.maxCumulative)), 4)
  const ceiling = ticks[ticks.length - 1] ?? 1
  const yAt = (value: number) => PAD_TOP + (1 - value / ceiling) * plotHeight

  const mine: [number, number][] = played.map((point, index) => [xAt(index, played.length), yAt(point.cumulative)])
  const last = played[played.length - 1]

  const floor = (PAD_TOP + plotHeight).toFixed(1)
  const area = `${toPath(mine)} L${xAt(played.length - 1, played.length).toFixed(1)},${floor} L${PAD_LEFT},${floor} Z`

  return (
    <figure className="px-1 py-3">
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

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={toPath(mine)}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="1.25"
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
    </figure>
  )
}

/* ────────────────────────────── Distancia con el líder ────────────────────────────── */

/**
 * Cuántos puntos te sacaba el primero al cerrar cada jornada.
 *
 * En vez de dibujar la resta, se dibujan las dos trayectorias: la del líder en
 * dorado y la tuya en azul, con la banda entre ambas sombreada. La distancia
 * deja de ser un número abstracto y pasa a ser el hueco que se ve: se abre
 * cuando te descuelgas y se cierra cuando recortas.
 */
export function GapChart({ points }: { points: EvolutionPoint[] }) {
  const gradientId = useId()
  const played = points.filter((point) => point.played)
  if (played.length === 0) return <ChartPlaceholder />

  const ticks = axisTicks(Math.max(1, ...played.map((point) => point.leaderCumulative)), 4)
  const ceiling = ticks[ticks.length - 1] ?? 1
  const yAt = (value: number) => PAD_TOP + (1 - value / ceiling) * plotHeight

  const mine: [number, number][] = played.map((point, index) => [xAt(index, played.length), yAt(point.cumulative)])
  const leader: [number, number][] = played.map((point, index) => [
    xAt(index, played.length),
    yAt(point.leaderCumulative),
  ])

  // La banda se cierra volviendo por la línea del líder al revés.
  const band = `${toPath(leader)} L${[...mine].reverse().map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')} Z`
  const last = played[played.length - 1]

  return (
    <figure className="px-1 py-3">
      <ChartHeading
        title="Distancia con el líder"
        detail={last?.gapToLeader === 0 ? 'Vas primero' : `${last?.gapToLeader ?? 0} puntos`}
      />

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label={`Tus puntos frente a los del líder en cada jornada: ${played
          .map((point) => `jornada ${point.matchday}, ${point.cumulative} contra ${point.leaderCumulative}`)
          .join('; ')}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        <YAxis ticks={ticks} yAt={yAt} />

        <path d={band} fill={`url(#${gradientId})`} />

        <path
          d={toPath(leader)}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={toPath(mine)}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {mine.map(([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={index === mine.length - 1 ? 4 : 2.5}
            fill={index === mine.length - 1 ? 'var(--color-brand)' : 'var(--color-base)'}
            stroke="var(--color-brand)"
            strokeWidth="1.5"
          />
        ))}

        <XAxis points={played} />
      </svg>
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
    <figure className="px-1 py-3">
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
                <span className="truncate font-mono text-[11px] text-ink-soft">{segment.label}</span>
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
      <h3 className="font-mono text-[13px] font-medium text-ink">{title}</h3>
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

function ChartPlaceholder() {
  return (
    <div className="grid min-h-36 place-items-center px-4 py-8 text-center">
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
