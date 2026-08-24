import { useMemo, useState } from 'react'
import { Plus, RefreshCw, Trash2, Undo2 } from 'lucide-react'
import type { Team } from '@/types'
import { useData } from '@/context/DataContext'
import { DEFAULT_TEAMS } from '@/data/teams'
import { generateFixtures } from '@/data/fixtures'
import { TEAM_COUNT } from '@/data/teams'
import { getBackend } from '@/services/backend'
import { recomputeScores } from '@/services/scores'
import { Alert } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

/**
 * Editor de los 36 participantes de la fase liga.
 *
 * La UEFA no publica los clasificados hasta finales de agosto, así que la lista
 * que viene por defecto es una semilla plausible que hay que sustituir por la
 * real. Cambiar la lista obliga a rehacer el calendario, porque los
 * emparejamientos se generan a partir de ella.
 */
export function TeamsPanel() {
  const { teams, matches, refresh } = useData()
  const [draft, setDraft] = useState<Team[]>(teams)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null)

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(teams), [draft, teams])
  const hasResults = matches.some((match) => match.homeGoals !== null)

  const update = (index: number, patch: Partial<Team>) =>
    setDraft((current) => current.map((team, i) => (i === index ? { ...team, ...patch } : team)))

  function addTeam() {
    setDraft((current) => [
      ...current,
      {
        id: `equipo-${Date.now().toString(36)}`,
        name: '',
        shortName: '',
        league: '',
        country: '',
        color: '#4d7cff',
      },
    ])
  }

  async function save() {
    const incomplete = draft.some((team) => team.name.trim() === '')
    if (incomplete) {
      setFeedback({ tone: 'error', text: 'Hay equipos sin nombre' })
      return
    }

    setBusy(true)
    setFeedback(null)
    try {
      const cleaned = draft.map((team) => ({
        ...team,
        name: team.name.trim(),
        league: team.league.trim(),
        country: team.country.trim(),
        shortName: (team.shortName.trim() || team.name.trim().slice(0, 3)).toUpperCase(),
      }))

      const backend = await getBackend()
      await backend.replaceTeams(cleaned)
      await refresh()

      setFeedback({
        tone: cleaned.length === TEAM_COUNT ? 'success' : 'warning',
        text:
          cleaned.length === TEAM_COUNT
            ? 'Equipos guardados. Regenera el calendario para que los emparejamientos usen la lista nueva.'
            : `Guardados ${cleaned.length} equipos. La fase liga necesita ${TEAM_COUNT} para poder generar las 8 jornadas.`,
      })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se han podido guardar' })
    } finally {
      setBusy(false)
    }
  }

  async function regenerate() {
    if (
      hasResults &&
      !window.confirm('Se rehará el calendario con los equipos actuales y se perderán los resultados. ¿Sigo?')
    ) {
      return
    }

    setBusy(true)
    setFeedback(null)
    try {
      const backend = await getBackend()
      await backend.replaceMatches(generateFixtures(teams))
      await recomputeScores()
      await refresh()
      setFeedback({ tone: 'success', text: 'Calendario regenerado con los equipos actuales' })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se ha podido regenerar' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Alert tone={draft.length === TEAM_COUNT ? 'info' : 'warning'}>
        {draft.length} de {TEAM_COUNT} equipos. Sustituye esta lista por los clasificados reales en cuanto la UEFA los
        publique y después regenera el calendario.
      </Alert>

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

      <ul className="space-y-2">
        {draft.map((team, index) => (
          <li key={team.id} className="card p-3">
            <div className="flex items-start gap-2.5">
              <label className="sr-only" htmlFor={`color-${team.id}`}>
                Color de {team.name || 'el equipo'}
              </label>
              <input
                id={`color-${team.id}`}
                type="color"
                value={team.color}
                onChange={(event) => update(index, { color: event.target.value })}
                className="mt-1 size-9 shrink-0 cursor-pointer rounded-lg border border-line bg-raised"
              />

              <div className="min-w-0 flex-1 space-y-2">
                <label className="sr-only" htmlFor={`name-${team.id}`}>
                  Nombre del equipo
                </label>
                <input
                  id={`name-${team.id}`}
                  className="field py-2 text-sm"
                  value={team.name}
                  placeholder="Nombre del equipo"
                  onChange={(event) => update(index, { name: event.target.value })}
                />

                <div className="flex gap-2">
                  <label className="sr-only" htmlFor={`league-${team.id}`}>
                    Liga de {team.name || 'el equipo'}
                  </label>
                  <input
                    id={`league-${team.id}`}
                    className="field flex-1 py-2 text-sm"
                    value={team.league}
                    placeholder="Liga"
                    onChange={(event) => update(index, { league: event.target.value })}
                  />
                  <label className="sr-only" htmlFor={`short-${team.id}`}>
                    Abreviatura de {team.name || 'el equipo'}
                  </label>
                  <input
                    id={`short-${team.id}`}
                    className="field w-20 py-2 text-center text-sm uppercase"
                    value={team.shortName}
                    maxLength={4}
                    placeholder="ABR"
                    onChange={(event) => update(index, { shortName: event.target.value })}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDraft((current) => current.filter((_, i) => i !== index))}
                aria-label={`Quitar a ${team.name || 'este equipo'}`}
                className="btn-ghost mt-1 min-h-9 px-2.5 text-miss"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button type="button" onClick={addTeam} className="btn-ghost w-full text-xs">
        <Plus size={15} aria-hidden="true" />
        Añadir equipo
      </button>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={busy || !dirty} className="btn-primary flex-1 text-xs">
          {busy ? <Spinner label="Guardando" /> : 'Guardar equipos'}
        </button>
        <button
          type="button"
          onClick={() => setDraft(teams)}
          disabled={busy || !dirty}
          className="btn-ghost px-4 text-xs"
          aria-label="Descartar los cambios"
        >
          <Undo2 size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setDraft(DEFAULT_TEAMS)}
          disabled={busy}
          className="btn-ghost px-3 text-xs"
        >
          Lista por defecto
        </button>
      </div>

      <div className="card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Regenerar el calendario</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-mute">
            Vuelve a sortear las 8 jornadas con los equipos guardados: cada uno con 8 rivales distintos, 4 partidos en
            casa y 4 fuera.
            {hasResults ? ' Ojo: ya hay resultados metidos y se perderán.' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={regenerate}
          disabled={busy || teams.length < 2 || dirty}
          className="btn-ghost w-full text-xs"
        >
          <RefreshCw size={15} aria-hidden="true" />
          {dirty ? 'Guarda los equipos primero' : 'Regenerar calendario'}
        </button>
      </div>
    </div>
  )
}
