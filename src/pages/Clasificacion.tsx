import { useState } from 'react'
import { Trophy, Users } from 'lucide-react'
import type { InternalRow, TeamStanding } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Avatar } from '@/components/Avatar'
import { EmptyState, PageHeader, Segmented } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

type Tab = 'porra' | 'champions'

export default function Clasificacion() {
  const [tab, setTab] = useState<Tab>('porra')
  const { loading, internalStandings, championsStandings } = useData()

  return (
    <>
      <PageHeader title="Clasificación" subtitle="Cómo va la porra y cómo va la Champions" />

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

/** Oro, plata y bronce para el podio. */
const PODIUM = ['text-gold', 'text-ink', 'text-[#c98a5e]'] as const

/** El líder se distingue del resto también por el marco. */
const LEADER_ROW = 'border-gold/35 bg-gradient-to-r from-gold/8 to-transparent'

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
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((row) => {
          const isMe = row.user.id === user?.id
          return (
            <li
              key={row.user.id}
              className={[
                'card flex items-center gap-3 px-3 py-3 transition-colors',
                row.position === 1 ? LEADER_ROW : '',
                isMe ? 'border-brand/45 bg-brand/8' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'w-6 shrink-0 text-center font-mono text-base font-bold tabular-nums',
                  PODIUM[row.position - 1] ?? 'text-ink-mute',
                ].join(' ')}
              >
                {row.position}
              </span>

              <Avatar user={row.user} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {row.user.nickname}
                  {isMe ? <span className="ml-1.5 text-xs font-medium text-brand-soft">tú</span> : null}
                </p>
                <p className="truncate text-xs text-ink-mute">
                  {row.user.nombre} {row.user.apellidos}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5 text-right">
                <div className="w-7">
                  <p className="font-mono text-sm tabular-nums text-sign">{row.signHits}</p>
                  <p className="text-[10px] text-ink-mute">1X2</p>
                </div>
                <div className="w-7">
                  <p className="font-mono text-sm tabular-nums text-exact">{row.exactHits}</p>
                  <p className="text-[10px] text-ink-mute">exac.</p>
                </div>
                <div className="w-10">
                  <p className="font-mono text-xl leading-none font-bold tabular-nums text-ink">{row.totalPoints}</p>
                  <p className="mt-0.5 text-[10px] text-ink-mute">pts</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="px-1 text-xs leading-relaxed text-ink-mute">
        <span className="text-sign">1X2</span> son los aciertos de signo (1 punto) y{' '}
        <span className="text-exact">exactos</span> los marcadores clavados (3 puntos). Los puntos totales incluyen
        también máximo goleador y campeón.
      </p>
    </div>
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
    <div className="space-y-3">
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Clasificación de la fase liga de la Champions League</caption>
          <thead>
            <tr className="border-b border-line text-[11px] tracking-wide text-ink-mute uppercase">
              <th scope="col" className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-semibold">
                Equipo
              </th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" title={column.title} className="px-2 py-2.5 text-center font-semibold">
                  {column.label}
                </th>
              ))}
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team.id} className="border-b border-line-soft last:border-0">
                <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-normal">
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-ink-mute">
                      {row.position}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-6 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: row.team.color }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink">{row.team.name}</span>
                      <span className="block truncate text-[11px] text-ink-mute">{row.team.league}</span>
                    </span>
                  </span>
                </th>
                {COLUMNS.map((column) => (
                  <td key={column.key} className="px-2 py-2.5 text-center font-mono text-[13px] tabular-nums text-ink-soft">
                    {column.key === 'goalDiff' && row.goalDiff > 0 ? `+${row.goalDiff}` : row[column.key]}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right font-mono text-[15px] font-bold tabular-nums text-ink">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-1 text-xs text-ink-mute">Desliza la tabla para ver todas las columnas.</p>
    </div>
  )
}
