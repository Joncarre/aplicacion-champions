import { useMemo, useState } from 'react'
import { Check, ShieldCheck, Wallet, Workflow } from 'lucide-react'
import type { Match, PublicUser } from '@/types'
import { useData } from '@/context/DataContext'
import { formatDay, formatTime } from '@/lib/date'
import { getBackend } from '@/services/backend'
import { recomputeScores } from '@/services/scores'
import { Avatar } from '@/components/Avatar'
import { MatchdayPicker } from '@/components/MatchdayPicker'
import { ExtrasPanel } from './ExtrasPanel'
import { Alert } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

type Section = 'participantes' | 'resultados' | 'apuestas' | 'cruces'

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'participantes', label: 'Participantes' },
  { value: 'resultados', label: 'Resultados' },
  { value: 'apuestas', label: 'Apuestas' },
  { value: 'cruces', label: 'Cruces' },
]

/**
 * Panel de administración, incrustado en el perfil del administrador.
 *
 * No es una pantalla aparte porque el administrador no participa en la porra:
 * su perfil no tiene posición ni gráficas, así que este es su contenido.
 *
 * Equipos y calendario no se tocan desde aquí: se sembraron una vez y, si la
 * UEFA cambiase algo, se corrige directamente en la base de datos. Un botón
 * capaz de regenerar los 144 partidos a media competición era más peligro que
 * comodidad.
 *
 * Lo mismo con los ajustes del torneo: las respuestas oficiales del goleador y
 * del campeón viven en la pestaña de Apuestas, al lado de las apuestas que
 * resuelven, y no en un panel de opciones aparte.
 */
export default function AdminPanels() {
  const [section, setSection] = useState<Section>('participantes')
  const { loading } = useData()

  return (
    <section className="mt-6">
      <h2 className="text-center font-mono text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
        Administración
      </h2>
      <span aria-hidden="true" className="rule-taper mt-2.5 block" />

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SECTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setSection(item.value)}
            aria-current={section === item.value}
            className={[
              'min-h-9 shrink-0 rounded-full px-3.5 font-mono text-xs font-semibold transition-colors',
              section === item.value ? 'bg-brand/22 text-brand-light' : 'bg-surface text-ink-mute hover:text-ink-soft',
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
        ) : (
          <KnockoutPanel />
        )}
      </div>
    </section>
  )
}

/* ────────────────────────────── Participantes ────────────────────────────── */

function ParticipantsPanel() {
  const { users, config, refresh } = useData()
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  // El administrador no juega, así que ni cuenta como inscrito ni pone dinero.
  const participants = users.filter((u) => !u.isAdmin)
  const paidCount = participants.filter((u) => u.hasPaid).length
  const pot = paidCount * config.entryFee

  async function run(userId: string, work: () => Promise<void>, done: string) {
    setBusy(userId)
    setFeedback(null)
    try {
      await work()
      await refresh()
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2.5">
        <SummaryTile label="Inscritos" value={participants.length} />
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

              <div className="mt-3 flex">
                {/* Al administrador no le toca pagar: no juega la porra. */}
                {participant.isAdmin ? (
                  <span className="btn min-h-10 flex-1 cursor-default px-3 font-mono text-[11px] tracking-wide text-brand-soft uppercase">
                    No participa
                  </span>
                ) : (
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
                    {participant.hasPaid ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      <Wallet size={14} aria-hidden="true" />
                    )}
                    {participant.hasPaid ? 'Pagado' : 'Sin pagar'}
                  </button>
                )}
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

      {/*
        El botón vive arriba y no flotando sobre el pie: abajo se solapaba con
        el de cerrar sesión, que es lo último de la página del perfil.
      */}
      {pending.length > 0 ? (
        <button type="button" onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? (
            <Spinner label="Guardando" />
          ) : (
            `Guardar ${pending.length} ${pending.length === 1 ? 'resultado' : 'resultados'}`
          )}
        </button>
      ) : null}

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

      <Alert tone="info">
        Deja los dos marcadores vacíos para volver a marcar un partido como no jugado.
      </Alert>

      <ul className="space-y-2">
        {matches.map((match) => {
          const value = valueFor(match)
          return (
            <li key={match.id} className="card space-y-2 p-3">
              {/* Cuándo se juega: sin esto los 18 partidos son indistinguibles. */}
              <p className="font-mono text-[11px] tracking-wide text-ink-mute">
                {formatDay(match.kickoff)} · {formatTime(match.kickoff)}
              </p>

              <div className="flex items-center gap-3">
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
              </div>
            </li>
          )
        })}
      </ul>
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

/* ────────────────────────────── Cruces ────────────────────────────── */

/**
 * Gestión de la fase eliminatoria. Todavía vacía: el cuadro no existe hasta
 * que la fase liga termine y se sepa quién se cruza con quién.
 */
function KnockoutPanel() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand/12 text-brand-soft">
        <Workflow size={26} aria-hidden="true" />
      </span>

      <div className="space-y-2">
        <p className="font-display text-xl font-bold text-ink">Aún no hay cruces</p>
        <p className="text-sm leading-relaxed text-balance text-ink-soft">
          El cuadro se montará al terminar la fase liga, el{' '}
          <strong className="text-ink">27 de enero de 2027</strong>. Los play-offs se juegan a partir del{' '}
          <strong className="text-ink">16 de febrero</strong>.
        </p>
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

