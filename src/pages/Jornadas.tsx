import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarOff, Check } from 'lucide-react'
import type { Match, Prediction } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useNow } from '@/hooks/useNow'
import { getBackend } from '@/services/backend'
import { formatLongDay, madridDayKey } from '@/lib/date'
import { lockReasonFor } from '@/lib/locks'
import { MatchCard, type DraftScore } from '@/components/MatchCard'
import { MatchdayPicker } from '@/components/MatchdayPicker'
import { Reveal, stagger } from '@/components/Reveal'
import { Alert, EmptyState, PageHeader } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

type Drafts = Record<string, DraftScore>

export default function Jornadas() {
  const { user } = useAuth()
  const { loading, teamById, matchesByMatchday, myPredictions, currentMatchday, refresh } = useData()
  const now = useNow()

  const [matchday, setMatchday] = useState(currentMatchday)
  const [drafts, setDrafts] = useState<Drafts>({})
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  // Al terminar de cargar se abre la jornada en juego, pero solo la primera
  // vez: si el usuario ya ha elegido otra, no se le mueve de sitio.
  const openedInitial = useRef(false)
  useEffect(() => {
    if (loading || openedInitial.current) return
    openedInitial.current = true
    setMatchday(currentMatchday)
  }, [loading, currentMatchday])

  // Cambiar de jornada descarta lo que se estuviera escribiendo sin guardar.
  useEffect(() => {
    setDrafts({})
    setFeedback(null)
  }, [matchday])

  const matches = useMemo(() => matchesByMatchday(matchday), [matchesByMatchday, matchday])
  const hasPaid = user?.hasPaid ?? false

  const byDay = useMemo(() => {
    const groups = new Map<string, Match[]>()
    for (const match of matches) {
      const key = madridDayKey(match.kickoff)
      const bucket = groups.get(key)
      if (bucket) bucket.push(match)
      else groups.set(key, [match])
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [matches])

  /** Apuestas escritas que están completas y son distintas de lo ya guardado. */
  const pending = useMemo(() => {
    const result: Prediction[] = []
    if (!user) return result

    for (const match of matches) {
      const draft = drafts[match.id]
      if (!draft || draft.home === '' || draft.away === '') continue
      if (lockReasonFor(match, { hasPaid, currentMatchday, now }) !== null) continue

      const homeGoals = Number(draft.home)
      const awayGoals = Number(draft.away)
      const saved = myPredictions.get(match.id)
      if (saved && saved.homeGoals === homeGoals && saved.awayGoals === awayGoals) continue

      result.push({
        id: `${user.id}__${match.id}`,
        userId: user.id,
        matchId: match.id,
        matchday: match.matchday,
        homeGoals,
        awayGoals,
        updatedAt: Date.now(),
      })
    }
    return result
  }, [drafts, matches, myPredictions, user, hasPaid, currentMatchday, now])

  /** Partidos abiertos que aún no tienen apuesta guardada ni escrita. */
  const missing = useMemo(
    () =>
      matches.filter((match) => {
        if (lockReasonFor(match, { hasPaid, currentMatchday, now }) !== null) return false
        const draft = drafts[match.id]
        if (draft && draft.home !== '' && draft.away !== '') return false
        return !myPredictions.get(match.id)
      }).length,
    [matches, drafts, myPredictions, hasPaid, currentMatchday, now],
  )

  async function save() {
    if (pending.length === 0 || saving) return
    setSaving(true)
    setFeedback(null)
    try {
      const backend = await getBackend()
      await backend.savePredictions(pending)
      await refresh()
      setDrafts({})
      setFeedback({
        tone: 'success',
        text: pending.length === 1 ? 'Apuesta guardada' : `${pending.length} apuestas guardadas`,
      })
    } catch (cause) {
      setFeedback({
        tone: 'error',
        text: cause instanceof Error ? cause.message : 'No se han podido guardar',
      })
    } finally {
      setSaving(false)
    }
  }

  const isOpenMatchday = matchday === currentMatchday
  const showSaveBar = isOpenMatchday && hasPaid && !loading && matches.length > 0

  return (
    <>
      <PageHeader title="Jornadas" />

      <MatchdayPicker value={matchday} onChange={setMatchday} currentMatchday={currentMatchday} />

      <div className="mt-5 space-y-4">
        {!hasPaid ? (
          <Alert tone="warning">Pago pendiente: no puedes apostar</Alert>
        ) : null}

        {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

        {isOpenMatchday && hasPaid && missing > 0 ? (
          <Alert tone="pending">
            Te faltan {missing} {missing === 1 ? 'partido' : 'partidos'} por apostar
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Cargando la jornada" />
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon={<CalendarOff size={28} aria-hidden="true" />}
            title="Todavía no hay partidos"
            description={
              // La siembra ya no se hace desde la app: si esto sale vacío,
              // es que falta cargar el calendario en la base de datos.
              user?.isAdmin
                ? 'El calendario se carga directamente en la base de datos.'
                : 'El administrador aún no ha cargado el calendario de esta jornada.'
            }
          />
        ) : (
          byDay.map(([day, dayMatches], dayIndex) => (
            <section key={day} className={dayIndex > 0 ? 'pt-4' : undefined}>
              {/* La fecha encabeza el día y la línea afilada la subraya. */}
              <Reveal as="h2">
                <span className="block text-center font-mono text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
                  {formatLongDay(dayMatches[0]?.kickoff ?? 0)}
                </span>
                <span aria-hidden="true" className="rule-taper mt-2.5 block" />
              </Reveal>

              {dayMatches.map((match, index) => (
                <Reveal key={match.id} delay={stagger(dayIndex === 0 ? index : index + 2, 40, 260)}>
                  <MatchCard
                    match={match}
                    homeTeam={teamById.get(match.homeTeamId)}
                    awayTeam={teamById.get(match.awayTeamId)}
                    prediction={myPredictions.get(match.id)}
                    draft={drafts[match.id]}
                    onDraftChange={(matchId, draft) => setDrafts((current) => ({ ...current, [matchId]: draft }))}
                    hasPaid={hasPaid}
                    currentMatchday={currentMatchday}
                    now={now}
                  />
                </Reveal>
              ))}
            </section>
          ))
        )}
      </div>

      {/* Deja hueco para que la barra de guardado no tape el último partido. */}
      {showSaveBar ? <div aria-hidden="true" className="h-20" /> : null}

      {/*
        Barra de guardado. Se queda siempre a la vista mientras la jornada esté
        abierta, aunque no haya nada pendiente: así se sabe que las apuestas
        hay que guardarlas y cuándo están a salvo.
      */}
      {showSaveBar ? (
        <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-[7.25rem] z-30 flex justify-center px-4">
          <button
            type="button"
            onClick={save}
            disabled={saving || pending.length === 0}
            className={[
              'pointer-events-auto inline-flex items-center gap-2 rounded-full transition-all duration-200',
              pending.length > 0
                ? 'min-h-11 bg-brand px-5 text-sm font-semibold text-white shadow-lift active:scale-[0.98]'
                : // Sin nada pendiente deja de ser un botón y pasa a ser un acuse discreto.
                  'min-h-8 bg-surface/80 px-3.5 font-mono text-[11px] tracking-wide text-ink-mute uppercase backdrop-blur',
            ].join(' ')}
          >
            {saving ? (
              <Spinner label="Guardando" />
            ) : pending.length > 0 ? (
              <>
                <Check size={16} aria-hidden="true" />
                Guardar {pending.length} {pending.length === 1 ? 'apuesta' : 'apuestas'}
              </>
            ) : (
              <>
                <Check size={12} className="text-exact" aria-hidden="true" />
                Guardado
              </>
            )}
          </button>
        </div>
      ) : null}
    </>
  )
}
