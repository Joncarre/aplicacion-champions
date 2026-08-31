import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { POINTS, namesMatch } from '@/lib/scoring'
import { Alert } from '@/components/ui'

/**
 * Qué ha apostado cada participante al máximo goleador y al campeón.
 *
 * Es solo consulta: los aciertos se fijan en la pestaña de Torneo. En cuanto
 * hay respuesta oficial, aquí se marcan los que la clavaron, que es la forma
 * rápida de comprobar que el reparto de puntos cuadra.
 */
export function ExtrasPanel() {
  const { users, extras, config } = useData()

  const rows = useMemo(() => {
    const byUser = new Map(extras.map((entry) => [entry.userId, entry]))

    // El administrador no apuesta, así que no cuenta como pendiente.
    return users
      .filter((user) => !user.isAdmin)
      .map((user) => {
        const bet = byUser.get(user.id)
        const topScorer = bet?.topScorer?.trim() ?? ''
        const champion = bet?.champion?.trim() ?? ''

        return {
          user,
          topScorer,
          champion,
          topScorerHit: Boolean(topScorer && config.actualTopScorer && namesMatch(topScorer, config.actualTopScorer)),
          championHit: Boolean(champion && config.actualChampion && namesMatch(champion, config.actualChampion)),
        }
      })
      .sort((a, b) => a.user.nickname.localeCompare(b.user.nickname, 'es'))
  }, [users, extras, config])

  const missing = rows.filter((row) => !row.topScorer && !row.champion).length

  return (
    <div className="space-y-4">
      {config.actualTopScorer || config.actualChampion ? (
        <Alert tone="info">
          Oficial: {config.actualTopScorer ?? 'goleador sin fijar'} · {config.actualChampion ?? 'campeón sin fijar'}
        </Alert>
      ) : null}

      {missing > 0 ? (
        <Alert tone="warning">
          {missing} {missing === 1 ? 'participante sin apostar' : 'participantes sin apostar'}
        </Alert>
      ) : null}

      <div>
        <div className="flex items-center gap-2 px-2.5 pb-2 font-mono text-[10px] text-ink-mute">
          <span className="w-24 shrink-0">Participante</span>
          <span className="min-w-0 flex-1">Goleador (+{POINTS.topScorer})</span>
          <span className="min-w-0 flex-1">Campeón (+{POINTS.champion})</span>
        </div>

        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.user.id} className="flex items-center gap-2 rounded-2xl bg-surface px-2.5 py-2.5">
              <span className="w-24 shrink-0 truncate text-[13px] font-semibold text-ink">{row.user.nickname}</span>
              <BetCell value={row.topScorer} hit={row.topScorerHit} />
              <BetCell value={row.champion} hit={row.championHit} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function BetCell({ value, hit }: { value: string; hit: boolean }) {
  if (!value) {
    return <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-mute">—</span>
  }

  return (
    <span
      className={`flex min-w-0 flex-1 items-center gap-1 truncate font-mono text-[11px] ${
        hit ? 'text-exact' : 'text-ink-soft'
      }`}
    >
      {hit ? <Check size={12} className="shrink-0" aria-label="acertada" /> : null}
      <span className="truncate">{value}</span>
    </span>
  )
}
