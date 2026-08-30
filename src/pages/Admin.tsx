import { useMemo, useState } from 'react'
import {
  Check,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Trash2,
  RotateCcw,
  Wallet,
  Wand,
} from 'lucide-react'
import type { Match, PublicUser, TournamentConfig } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { DEFAULT_TEAMS } from '@/data/teams'
import { buildOfficialMatches } from '@/data/fixtures'
import { MATCHDAY_WINDOWS } from '@/data/calendar'
import { madridToUtc, toDateTimeInputValue } from '@/lib/date'
import { getBackend, useDemoBackend } from '@/services/backend'
import { setPassword } from '@/services/auth'
import { recomputeScores } from '@/services/scores'
import { Avatar } from '@/components/Avatar'
import { BackButton } from '@/components/BackButton'
import { MatchdayPicker } from '@/components/MatchdayPicker'
import { ExtrasPanel } from '@/components/admin/ExtrasPanel'
import { TeamsPanel } from '@/components/admin/TeamsPanel'
import { Alert, Field, PageHeader } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

type Section = 'participantes' | 'resultados' | 'apuestas' | 'equipos' | 'calendario' | 'torneo'

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'participantes', label: 'Participantes' },
  { value: 'resultados', label: 'Resultados' },
  { value: 'apuestas', label: 'Apuestas' },
  { value: 'equipos', label: 'Equipos' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'torneo', label: 'Torneo' },
]

export default function Admin() {
  const [section, setSection] = useState<Section>('participantes')
  const { loading } = useData()

  return (
    <>
      <div className="safe-top pt-5">
        <BackButton to="/perfil" label="Volver al perfil" />
      </div>

      <PageHeader title="Administración" />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setSection(item.value)}
            aria-current={section === item.value}
            className={[
              'min-h-10 shrink-0 rounded-lg border px-3.5 text-sm font-semibold transition-colors',
              section === item.value
                ? 'border-brand/50 bg-brand/12 text-ink'
                : 'border-line bg-surface text-ink-mute hover:text-ink-soft',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Cargando" />
          </div>
        ) : section === 'participantes' ? (
          <ParticipantsPanel />
        ) : section === 'resultados' ? (
          <ResultsPanel />
        ) : section === 'apuestas' ? (
          <ExtrasPanel />
        ) : section === 'equipos' ? (
          <TeamsPanel />
        ) : section === 'calendario' ? (
          <CalendarPanel />
        ) : (
          <TournamentPanel />
        )}
      </div>
    </>
  )
}

/* ────────────────────────────── Participantes ────────────────────────────── */

function ParticipantsPanel() {
  const { users, config, refresh } = useData()
  const { user: me, refreshUser } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const paidCount = users.filter((u) => u.hasPaid).length
  const pot = paidCount * config.entryFee

  async function run(userId: string, work: () => Promise<void>, done: string) {
    setBusy(userId)
    setFeedback(null)
    try {
      await work()
      await refresh()
      if (userId === me?.id) await refreshUser()
      setFeedback({ tone: 'success', text: done })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se ha podido completar' })
    } finally {
      setBusy(null)
    }
  }

  async function togglePaid(participant: PublicUser) {
    const backend = await getBackend()
    await backend.updateUser(participant.id, { hasPaid: !participant.hasPaid })
  }

  async function toggleAdmin(participant: PublicUser) {
    const backend = await getBackend()
    await backend.updateUser(participant.id, { isAdmin: !participant.isAdmin })
  }

  async function resetPassword(participant: PublicUser) {
    const next = window.prompt(`Nueva contraseña para ${participant.nickname}`)
    if (!next) return
    await setPassword(participant.id, next)
  }

  async function remove(participant: PublicUser) {
    const confirmed = window.confirm(
      `¿Seguro que quieres borrar a ${participant.nickname}? Se irán también sus apuestas y no hay vuelta atrás.`,
    )
    if (!confirmed) return
    const backend = await getBackend()
    await backend.deleteUser(participant.id)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        <SummaryTile label="Inscritos" value={users.length} />
        <SummaryTile label="Han pagado" value={paidCount} />
        <SummaryTile label="Bote" value={`${pot} €`} tone="gold" />
      </div>

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

      <ul className="space-y-2">
        {users.map((participant) => {
          const working = busy === participant.id
          return (
            <li key={participant.id} className="card p-3.5">
              <div className="flex items-center gap-3">
                <Avatar user={participant} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-ink">
                    {participant.nickname}
                    {participant.isAdmin ? (
                      <ShieldCheck size={14} className="shrink-0 text-brand-soft" aria-label="administrador" />
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-mute">
                    {participant.nombre} {participant.apellidos}
                  </p>
                </div>
                {working ? <Spinner label="Guardando" /> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={working}
                  onClick={() =>
                    run(
                      participant.id,
                      () => togglePaid(participant),
                      participant.hasPaid ? 'Marcado como pendiente' : 'Marcado como pagado',
                    )
                  }
                  className={[
                    'btn min-h-10 flex-1 px-3 text-xs',
                    participant.hasPaid
                      ? 'border border-exact/40 bg-exact/12 text-exact'
                      : 'border border-line bg-raised text-ink-soft',
                  ].join(' ')}
                >
                  {participant.hasPaid ? <Check size={14} aria-hidden="true" /> : <Wallet size={14} aria-hidden="true" />}
                  {participant.hasPaid ? 'Pagado' : 'Sin pagar'}
                </button>

                <button
                  type="button"
                  disabled={working}
                  onClick={() => run(participant.id, () => toggleAdmin(participant), 'Permisos actualizados')}
                  className="btn-ghost min-h-10 px-3 text-xs"
                  aria-label={participant.isAdmin ? 'Quitar administrador' : 'Hacer administrador'}
                >
                  <ShieldCheck size={14} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  disabled={working}
                  onClick={() => run(participant.id, () => resetPassword(participant), 'Contraseña cambiada')}
                  className="btn-ghost min-h-10 px-3 text-xs"
                  aria-label={`Cambiar la contraseña de ${participant.nickname}`}
                >
                  <KeyRound size={14} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  disabled={working || participant.id === me?.id}
                  onClick={() => run(participant.id, () => remove(participant), 'Participante eliminado')}
                  className="btn-ghost min-h-10 px-3 text-xs text-miss disabled:opacity-30"
                  aria-label={`Eliminar a ${participant.nickname}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ────────────────────────────── Resultados ────────────────────────────── */

type ResultDraft = Record<string, { home: string; away: string }>

function ResultsPanel() {
  const { matchesByMatchday, teamById, currentMatchday, refresh } = useData()
  const [matchday, setMatchday] = useState(currentMatchday)
  const [drafts, setDrafts] = useState<ResultDraft>({})
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const matches = useMemo(() => matchesByMatchday(matchday), [matchesByMatchday, matchday])

  const valueFor = (match: Match) =>
    drafts[match.id] ?? {
      home: match.homeGoals === null ? '' : String(match.homeGoals),
      away: match.awayGoals === null ? '' : String(match.awayGoals),
    }

  const pending = useMemo(
    () =>
      matches.filter((match) => {
        const draft = drafts[match.id]
        if (!draft) return false
        const home = draft.home === '' ? null : Number(draft.home)
        const away = draft.away === '' ? null : Number(draft.away)
        // Un resultado a medias no se guarda.
        if ((home === null) !== (away === null)) return false
        return home !== match.homeGoals || away !== match.awayGoals
      }),
    [matches, drafts],
  )

  async function save() {
    if (pending.length === 0 || saving) return
    setSaving(true)
    setFeedback(null)
    try {
      const backend = await getBackend()
      for (const match of pending) {
        const draft = drafts[match.id]
        await backend.updateMatch(match.id, {
          homeGoals: draft?.home === '' || draft === undefined ? null : Number(draft.home),
          awayGoals: draft?.away === '' || draft === undefined ? null : Number(draft.away),
        })
      }
      // Cambiar un resultado cambia la clasificación de todo el mundo.
      await recomputeScores()
      await refresh()
      setDrafts({})
      setFeedback({ tone: 'success', text: `${pending.length} resultados guardados y puntos recalculados` })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se han podido guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <MatchdayPicker value={matchday} onChange={setMatchday} currentMatchday={currentMatchday} />

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

      <Alert tone="info">
        Deja los dos marcadores vacíos para volver a marcar un partido como no jugado.
      </Alert>

      <ul className="space-y-2">
        {matches.map((match) => {
          const value = valueFor(match)
          return (
            <li key={match.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-[13px] text-ink-soft">
                  {teamById.get(match.homeTeamId)?.name ?? match.homeTeamId}
                </p>
                <p className="truncate text-[13px] text-ink-soft">
                  {teamById.get(match.awayTeamId)?.name ?? match.awayTeamId}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <GoalInput
                  value={value.home}
                  label={`Goles de ${teamById.get(match.homeTeamId)?.name ?? 'local'}`}
                  onChange={(home) => setDrafts((current) => ({ ...current, [match.id]: { ...value, home } }))}
                />
                <GoalInput
                  value={value.away}
                  label={`Goles de ${teamById.get(match.awayTeamId)?.name ?? 'visitante'}`}
                  onChange={(away) => setDrafts((current) => ({ ...current, [match.id]: { ...value, away } }))}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {pending.length > 0 ? (
        <div className="safe-bottom fixed inset-x-0 bottom-[4.75rem] z-30 px-4">
          <div className="mx-auto max-w-lg">
            <button type="button" onClick={save} disabled={saving} className="btn-primary w-full shadow-lift">
              {saving ? <Spinner label="Guardando" /> : `Guardar ${pending.length} resultados`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function GoalInput({
  value,
  label,
  onChange,
}: {
  value: string
  label: string
  onChange: (value: string) => void
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={2}
      aria-label={label}
      value={value}
      placeholder="–"
      onFocus={(event) => event.target.select()}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 2))}
      className="size-10 rounded-lg border border-line bg-raised text-center font-mono text-base tabular-nums text-ink
                 placeholder:text-ink-mute focus:border-brand focus:outline-none"
    />
  )
}

/* ────────────────────────────── Calendario y equipos ────────────────────────────── */

function CalendarPanel() {
  const { teams, matches, matchesByMatchday, teamById, currentMatchday, refresh } = useData()
  const [matchday, setMatchday] = useState(currentMatchday)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

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

  async function seedEverything() {
    if (
      matches.length > 0 &&
      !window.confirm('Se van a regenerar los 36 equipos y los 144 partidos. Los resultados ya guardados se perderán. ¿Sigo?')
    ) {
      return
    }
    const backend = await getBackend()
    await backend.replaceTeams(DEFAULT_TEAMS)
    await backend.replaceMatches(buildOfficialMatches())
    await recomputeScores()
  }

  async function updateKickoff(match: Match, wallClock: string) {
    if (!wallClock) return
    const backend = await getBackend()
    await backend.updateMatch(match.id, { kickoff: madridToUtc(wallClock) })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <SummaryTile label="Equipos" value={teams.length} />
        <SummaryTile label="Partidos" value={matches.length} />
      </div>

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

      <div className="card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Sembrar la competición</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-mute">
            Carga los 36 equipos del sorteo y los 144 partidos oficiales con sus horarios. Si la UEFA mueve alguno,
            puedes corregirlo aquí abajo sin tocar el resto.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(seedEverything, 'Competición sembrada')}
          className="btn-primary w-full text-xs"
        >
          <Wand size={15} aria-hidden="true" />
          Equipos y calendario oficiales
        </button>
      </div>

      {useDemoBackend ? (
        <div className="card space-y-3 p-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Datos de demostración</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-mute">
              Estás en modo demo, sobre el almacenamiento del navegador. Puedes volver al punto de partida cuando
              quieras: participantes de prueba, calendario y resultados hasta la fecha de hoy.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { resetDemoData } = await import('@/services/demoBackend')
                await resetDemoData()
                await recomputeScores()
              }, 'Datos de demostración reiniciados')
            }
            className="btn-ghost w-full text-xs"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reiniciar datos de demostración
          </button>
        </div>
      ) : null}

      <div>
        <h2 className="px-1 pb-2.5 text-xs font-semibold tracking-wide text-ink-mute uppercase">Horarios</h2>
        <MatchdayPicker value={matchday} onChange={setMatchday} currentMatchday={currentMatchday} />
        <ul className="mt-3 space-y-2">
          {matchesByMatchday(matchday).map((match) => (
            <li key={match.id} className="card space-y-2 p-3">
              <p className="truncate text-[13px] text-ink-soft">
                {teamById.get(match.homeTeamId)?.name ?? match.homeTeamId}
                <span className="mx-1.5 text-ink-mute">–</span>
                {teamById.get(match.awayTeamId)?.name ?? match.awayTeamId}
              </p>
              <input
                type="datetime-local"
                defaultValue={toDateTimeInputValue(match.kickoff)}
                aria-label="Hora del partido"
                disabled={busy}
                onBlur={(event) => {
                  if (event.target.value === toDateTimeInputValue(match.kickoff)) return
                  void run(() => updateKickoff(match, event.target.value), 'Horario actualizado')
                }}
                className="field py-2 text-sm"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ────────────────────────────── Ajustes del torneo ────────────────────────────── */

function TournamentPanel() {
  const { config, teams, refresh } = useData()
  const [draft, setDraft] = useState<TournamentConfig>(config)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name, 'es')), [teams])

  async function save() {
    setBusy(true)
    setFeedback(null)
    try {
      const backend = await getBackend()
      await backend.saveConfig(draft)
      await recomputeScores()
      await refresh()
      setFeedback({ tone: 'success', text: 'Ajustes guardados y puntos recalculados' })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se han podido guardar' })
    } finally {
      setBusy(false)
    }
  }

  async function recalculate() {
    setBusy(true)
    setFeedback(null)
    try {
      await recomputeScores()
      await refresh()
      setFeedback({ tone: 'success', text: 'Puntuaciones recalculadas' })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se ha podido recalcular' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

      <div className="card space-y-4 p-4">
        <h2 className="text-sm font-semibold text-ink">Aciertos de las apuestas especiales</h2>

        <Field
          label="Máximo goleador real"
          htmlFor="actual-top-scorer"
          hint="Se compara sin distinguir tildes ni mayúsculas, y acepta el apellido suelto."
        >
          <input
            id="actual-top-scorer"
            className="field"
            value={draft.actualTopScorer ?? ''}
            placeholder="Todavía sin decidir"
            onChange={(event) => setDraft((c) => ({ ...c, actualTopScorer: event.target.value || null }))}
          />
        </Field>

        <Field
          label="Campeón real"
          htmlFor="actual-champion"
          hint="Escríbelo o elige de la lista. Se compara igual de flexible que el goleador."
        >
          <input
            id="actual-champion"
            className="field"
            list="equipos-champions"
            value={draft.actualChampion ?? ''}
            placeholder="Todavía sin decidir"
            onChange={(event) => setDraft((c) => ({ ...c, actualChampion: event.target.value || null }))}
          />
          <datalist id="equipos-champions">
            {sortedTeams.map((team) => (
              <option key={team.id} value={team.name} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="card space-y-4 p-4">
        <h2 className="text-sm font-semibold text-ink">Ajustes generales</h2>

        <Field
          label="Jornada abierta a apuestas"
          htmlFor="current-matchday"
          hint="Normalmente se deduce sola del calendario. Fíjala solo si necesitas forzarla."
        >
          <select
            id="current-matchday"
            className="field"
            value={draft.currentMatchdayOverride ?? ''}
            onChange={(event) =>
              setDraft((c) => ({
                ...c,
                currentMatchdayOverride: event.target.value ? Number(event.target.value) : null,
              }))
            }
          >
            <option value="">Automática</option>
            {MATCHDAY_WINDOWS.map((window) => (
              <option key={window.matchday} value={window.matchday}>
                Jornada {window.matchday} · {window.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cuota por participante (€)" htmlFor="entry-fee">
          <input
            id="entry-fee"
            type="number"
            inputMode="numeric"
            min={0}
            className="field"
            value={draft.entryFee}
            onChange={(event) => setDraft((c) => ({ ...c, entryFee: Number(event.target.value) || 0 }))}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy} className="btn-primary flex-1">
          {busy ? <Spinner label="Guardando" /> : 'Guardar ajustes'}
        </button>
        <button type="button" onClick={recalculate} disabled={busy} className="btn-ghost px-4" aria-label="Recalcular puntuaciones">
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/* ────────────────────────────── Piezas compartidas ────────────────────────────── */

function SummaryTile({
  label,
  value,
  tone = 'ink',
}: {
  label: string
  value: string | number
  tone?: 'ink' | 'gold'
}) {
  return (
    <div className="card px-3 py-2.5 text-center">
      <p className={`font-mono text-xl font-bold tabular-nums ${tone === 'gold' ? 'text-gold' : 'text-ink'}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-mute">{label}</p>
    </div>
  )
}

