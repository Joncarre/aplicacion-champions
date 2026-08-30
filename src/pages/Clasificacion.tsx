import { useState } from 'react'
import { Trophy, Users } from 'lucide-react'
import type { InternalRow, TeamStanding } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Avatar } from '@/components/Avatar'
import { Reveal, stagger } from '@/components/Reveal'
import { EmptyState, PageHeader, Segmented } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

type Tab = 'porra' | 'champions'

export default function Clasificacion() {
  const [tab, setTab] = useState<Tab>('porra')
  const { loading, internalStandings, championsStandings } = useData()

  return (
    <>
      <PageHeader title="Clasificación" />

      <Segmented
        ariaLabel="Elegir clasificación"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'porra', label: 'La porra' },
          { value: 'champions', label: 'Champions' },
        ]}
      />

      <div className="mt-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Cargando la clasificación" />
          </div>
        ) : tab === 'porra' ? (
          <InternalTable rows={internalStandings} />
        ) : (
          <ChampionsTable rows={championsStandings} />
        )}
      </div>
    </>
  )
}

/* ────────────────────────────── Clasificación de la porra ────────────────────────────── */

/**
 * Oro, plata y bronce para el podio. Va como estilo en línea y no como clase
 * de utilidad: así el color no depende de que se haya generado la clase ni
 * puede quedar tapado por ninguna otra regla.
 */
const PODIUM = ['var(--color-gold)', 'var(--color-ink)', '#f7d9bd'] as const

function positionColor(position: number): string {
  return PODIUM[position - 1] ?? 'var(--color-ink-mute)'
}

/**
 * Zona de la tabla en la que cae cada participante. Con menos de seis
 * jugadores no se marca nada, porque el podio y la cola se solaparían.
 */
function zoneOf(position: number, total: number): 'top' | 'bottom' | null {
  if (total < 6) return null
  if (position <= 3) return 'top'
  if (position > total - 3) return 'bottom'
  return null
}

const ZONE_TINT = {
  top: 'linear-gradient(to right, transparent, color-mix(in oklab, var(--color-exact) 22%, transparent))',
  bottom: 'linear-gradient(to right, transparent, color-mix(in oklab, var(--color-miss) 22%, transparent))',
} as const

function InternalTable({ rows }: { rows: InternalRow[] }) {
  const { user } = useAuth()

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users size={28} aria-hidden="true" />}
        title="Aún no hay participantes"
        description="En cuanto se registre alguien aparecerá aquí."
      />
    )
  }

  return (
    <ul className="space-y-2">
      {rows.map((row, index) => {
        const isMe = row.user.id === user?.id
        const zone = zoneOf(row.position, rows.length)

        return (
          <Reveal
            as="li"
            key={row.user.id}
            delay={stagger(index, 35, 280)}
            // Las filas van sin borde; el único marco es el animado de quien mira.
            className={[
              'relative overflow-hidden',
              isMe ? 'card-live' : 'rounded-2xl bg-surface',
            ].join(' ')}
          >
            {/* Franja de color que asoma por la derecha: verde en el podio, roja en la cola. */}
            {zone ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-2/5"
                style={{ background: ZONE_TINT[zone] }}
              />
            ) : null}

            <div className="relative flex items-center gap-3 px-3 py-3">
              <span
                style={{ color: positionColor(row.position) }}
                className="w-6 shrink-0 text-center font-mono text-base font-bold tabular-nums"
              >
                {row.position}
              </span>

              <Avatar user={row.user} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{row.user.nickname}</p>
                <p className="truncate text-xs text-ink-mute">
                  {row.user.nombre} {row.user.apellidos}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <div className="w-7 text-center">
                  <p className="font-mono text-sm tabular-nums text-sign">{row.signHits}</p>
                  <p className="text-[10px] text-ink-mute">1X2</p>
                </div>
                <div className="w-7 text-center">
                  <p className="font-mono text-sm tabular-nums text-exact">{row.exactHits}</p>
                  <p className="text-[10px] text-ink-mute">exac.</p>
                </div>
                <div className="w-10 text-center">
                  <p className="font-mono text-xl leading-none font-bold tabular-nums text-ink">{row.totalPoints}</p>
                  <p className="mt-0.5 text-[10px] text-ink-mute">pts</p>
                </div>
              </div>
            </div>
          </Reveal>
        )
      })}
    </ul>
  )
}

/* ────────────────────────────── Clasificación de la Champions ────────────────────────────── */

const COLUMNS = [
  { key: 'played', label: 'PJ', title: 'Partidos jugados' },
  { key: 'won', label: 'G', title: 'Ganados' },
  { key: 'drawn', label: 'E', title: 'Empatados' },
  { key: 'lost', label: 'P', title: 'Perdidos' },
  { key: 'goalsFor', label: 'GF', title: 'Goles a favor' },
  { key: 'goalsAgainst', label: 'GC', title: 'Goles en contra' },
  { key: 'goalDiff', label: 'DG', title: 'Diferencia de goles' },
] as const

/** Anchos compartidos entre la cabecera y las filas, para que las columnas cuadren. */
const NUMBER_COLUMN = 'w-[1.4rem] shrink-0 text-center'
const POINTS_COLUMN = 'w-[1.9rem] shrink-0 text-center'

function ChampionsTable({ rows }: { rows: TeamStanding[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={28} aria-hidden="true" />}
        title="Sin equipos cargados"
        description="El administrador todavía no ha fijado los 36 participantes de la fase liga."
      />
    )
  }

  return (
    <div className="space-y-2">
      {/* La leyenda va una sola vez, arriba, y no se repite en cada equipo. */}
      <div className="flex items-center gap-1.5 px-2.5 font-mono text-[10px] text-ink-mute">
        <span className="me-2 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">Equipo</span>
        {COLUMNS.map((column) => (
          <span key={column.key} className={NUMBER_COLUMN} title={column.title}>
            {column.label}
          </span>
        ))}
        <span className={POINTS_COLUMN}>Pts</span>
      </div>

      <ul className="space-y-2">
        {rows.map((row, index) => {
          const zone = zoneOf(row.position, rows.length)

          return (
            <Reveal
              as="li"
              key={row.team.id}
              delay={stagger(index, 35, 280)}
              className="relative overflow-hidden rounded-2xl bg-surface"
            >
              {zone ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-2/5"
                  style={{ background: ZONE_TINT[zone] }}
                />
              ) : null}

              <div className="relative flex items-center gap-1.5 px-2.5 py-2.5">
                <span
                  style={{ color: positionColor(row.position) }}
                  className="me-2 w-5 shrink-0 text-center font-mono text-sm font-bold tabular-nums"
                >
                  {row.position}
                </span>

                <div className="min-w-0 flex-1 pr-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{row.team.name}</p>
                  <p className="truncate text-[11px] text-ink-mute">{row.team.league}</p>
                </div>

                {COLUMNS.map((column) => (
                  <span
                    key={column.key}
                    className={`${NUMBER_COLUMN} font-mono text-[13px] tabular-nums text-ink-soft`}
                  >
                    {column.key === 'goalDiff' && row.goalDiff > 0 ? `+${row.goalDiff}` : row[column.key]}
                  </span>
                ))}

                <span className={`${POINTS_COLUMN} font-mono text-base font-bold tabular-nums text-ink`}>
                  {row.points}
                </span>
              </div>
            </Reveal>
          )
        })}
      </ul>
    </div>
  )
}
