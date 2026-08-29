import { useMemo, useState } from 'react'
import { CalendarCheck, Plus, Shuffle, Trash2, Undo2 } from 'lucide-react'
import type { Team } from '@/types'
import { useData } from '@/context/DataContext'
import { DEFAULT_TEAMS, TEAM_COUNT } from '@/data/teams'
import { buildOfficialMatches } from '@/data/fixtures'
import { generateFixtures } from '@/data/fixtureGenerator'
import { getBackend } from '@/services/backend'
import { recomputeScores } from '@/services/scores'
import { Alert } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

/**
 * Editor de los 36 participantes de la fase liga.
 *
 * La lista que viene por defecto es la del sorteo oficial de 2026/27, y el
 * calendario de `fixtures.ts` se apoya en sus identificadores. Aquí se pueden
 * retocar nombres, ligas y colores sin problema; añadir o quitar equipos, en
 * cambio, deja el calendario oficial sin sentido y obliga a sortear uno nuevo.
 */
export function TeamsPanel() {
  const { teams, matches, refresh } = useData()
  const [draft, setDraft] = useState<Team[]>(teams)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null)

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(teams), [draft, teams])
  const hasResults = matches.some((match) => match.homeGoals !== null)

  /** Si alguien ha tocado la lista de equipos, el calendario oficial ya no encaja. */
  const officialIds = useMemo(() => new Set(DEFAULT_TEAMS.map((team) => team.id)), [])
  const matchesOfficialSquad =
    teams.length === TEAM_COUNT && teams.every((team) => officialIds.has(team.id))

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

  async function run(work: () => Promise<void>, done: string) {
    setBusy(true)
    setFeedback(null)
    try {
      await work()
      await refresh()
      setFeedback({ tone: 'success', text: done })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se ha podido completar' })
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (draft.some((team) => team.name.trim() === '')) {
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
            ? 'Equipos guardados.'
            : `Guardados ${cleaned.length} equipos. La fase liga necesita ${TEAM_COUNT}.`,
      })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se han podido guardar' })
    } finally {
      setBusy(false)
    }
  }

  function confirmLosingResults(): boolean {
    if (!hasResults) return true
    return window.confirm('Se rehará el calendario y se perderán los resultados ya metidos. ¿Sigo?')
  }

  return (
    <div className="space-y-4">
      <Alert tone={draft.length === TEAM_COUNT ? 'info' : 'warning'}>
        {draft.length} de {TEAM_COUNT} equipos. Son los del sorteo oficial: puedes corregir nombres, ligas y colores,
        pero si añades o quitas alguno tendrás que sortear un calendario nuevo.
      </Alert>

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

      <ul className="space-y-2">
        {draft.map((team, index) => (
          <li key={team.id} className="card p-3">
            <div className="flex items-start gap-2.5">
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
        <button type="button" onClick={() => setDraft(DEFAULT_TEAMS)} disabled={busy} className="btn-ghost px-3 text-xs">
          Lista oficial
        </button>
      </div>

      <div className="card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Calendario</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-mute">
            Lo normal es usar el calendario oficial de la UEFA, con sus 144 partidos y sus horarios. El sorteo
            automático solo hace falta si has cambiado la lista de equipos.
            {hasResults ? ' Ojo: ya hay resultados metidos y cualquiera de las dos opciones se los lleva por delante.' : ''}
          </p>
        </div>

        <button
          type="button"
          disabled={busy || dirty || !matchesOfficialSquad}
          onClick={() => {
            if (!confirmLosingResults()) return
            void run(async () => {
              const backend = await getBackend()
              await backend.replaceMatches(buildOfficialMatches())
              await recomputeScores()
            }, 'Calendario oficial restaurado')
          }}
          className="btn-primary w-full text-xs"
        >
          <CalendarCheck size={15} aria-hidden="true" />
          {dirty
            ? 'Guarda los equipos primero'
            : matchesOfficialSquad
              ? 'Restaurar calendario oficial'
              : 'No disponible: has cambiado los equipos'}
        </button>

        <button
          type="button"
          disabled={busy || dirty || teams.length < 2}
          onClick={() => {
            if (!confirmLosingResults()) return
            void run(async () => {
              const backend = await getBackend()
              await backend.replaceMatches(generateFixtures(teams))
              await recomputeScores()
            }, 'Calendario sorteado con los equipos actuales')
          }}
          className="btn-ghost w-full text-xs"
        >
          <Shuffle size={15} aria-hidden="true" />
          Sortear calendario automático
        </button>
      </div>
    </div>
  )
}
