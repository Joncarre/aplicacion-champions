import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { POINTS, namesMatch } from '@/lib/scoring'
import { getBackend } from '@/services/backend'
import { recomputeScores } from '@/services/scores'
import { Alert, Field } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

/**
 * Las apuestas especiales, de punta a punta: arriba se fijan las respuestas
 * oficiales y abajo se ve lo que apostó cada uno.
 *
 * Van juntas a propósito. En cuanto se escribe el goleador o el campeón de
 * verdad, la tabla de abajo marca a los que lo clavaron, que es la forma
 * rápida de comprobar que el reparto de 25 y 50 puntos cuadra.
 */
export function ExtrasPanel() {
  const { users, extras, config, teams, refresh } = useData()

  // La configuración ya está cargada cuando este panel se monta: el panel de
  // administración no pinta ninguna pestaña mientras haya datos en vuelo.
  const [topScorer, setTopScorer] = useState(config.actualTopScorer ?? '')
  const [champion, setChampion] = useState(config.actualChampion ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name, 'es')), [teams])

  const rows = useMemo(() => {
    const byUser = new Map(extras.map((entry) => [entry.userId, entry]))

    // El administrador no apuesta, así que no cuenta como pendiente.
    return users
      .filter((user) => !user.isAdmin)
      .map((user) => {
        const bet = byUser.get(user.id)
        const topScorerBet = bet?.topScorer?.trim() ?? ''
        const championBet = bet?.champion?.trim() ?? ''

        return {
          user,
          topScorer: topScorerBet,
          champion: championBet,
          topScorerHit: Boolean(
            topScorerBet && config.actualTopScorer && namesMatch(topScorerBet, config.actualTopScorer),
          ),
          championHit: Boolean(championBet && config.actualChampion && namesMatch(championBet, config.actualChampion)),
        }
      })
      .sort((a, b) => a.user.nickname.localeCompare(b.user.nickname, 'es'))
  }, [users, extras, config])

  const missing = rows.filter((row) => !row.topScorer && !row.champion).length

  const dirty =
    (topScorer.trim() || null) !== (config.actualTopScorer ?? null) ||
    (champion.trim() || null) !== (config.actualChampion ?? null)

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    setFeedback(null)
    try {
      const backend = await getBackend()
      await backend.saveConfig({
        actualTopScorer: topScorer.trim() || null,
        actualChampion: champion.trim() || null,
      })
      // Acertar el goleador o el campeón mueve 25 y 50 puntos: hay que rehacer
      // la clasificación entera, no solo la de quien acertó.
      await recomputeScores()
      await refresh()
      setFeedback({ tone: 'success', text: 'Aciertos guardados y puntos recalculados' })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se han podido guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-4">
        <h2 className="text-sm font-semibold text-ink">Respuestas oficiales</h2>

        <Field
          label="Máximo goleador"
          htmlFor="actual-top-scorer"
          hint="Se compara sin distinguir tildes ni mayúsculas, y acepta el apellido suelto."
        >
          <input
            id="actual-top-scorer"
            className="field"
            value={topScorer}
            placeholder="Todavía sin decidir"
            onChange={(event) => setTopScorer(event.target.value)}
          />
        </Field>

        <Field
          label="Campeón"
          htmlFor="actual-champion"
          hint="Escríbelo o elige de la lista. Se compara igual de flexible que el goleador."
        >
          <input
            id="actual-champion"
            className="field"
            list="equipos-champions"
            value={champion}
            placeholder="Todavía sin decidir"
            onChange={(event) => setChampion(event.target.value)}
          />
          <datalist id="equipos-champions">
            {sortedTeams.map((team) => (
              <option key={team.id} value={team.name} />
            ))}
          </datalist>
        </Field>

        <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary w-full text-xs">
          {saving ? <Spinner label="Guardando" /> : 'Guardar aciertos'}
        </button>
      </div>

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

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
