import { Lock } from 'lucide-react'
import type { Match, Prediction, Team } from '@/types'
import { formatCountdown, formatTime } from '@/lib/date'
import { LOCK_MESSAGES, lockReasonFor, type LockReason } from '@/lib/locks'
import { isResolved, outcomeOf, pointsForOutcome } from '@/lib/scoring'

export interface DraftScore {
  home: string
  away: string
}

interface MatchCardProps {
  match: Match
  homeTeam: Team | undefined
  awayTeam: Team | undefined
  prediction: Prediction | undefined
  draft: DraftScore | undefined
  onDraftChange: (matchId: string, draft: DraftScore) => void
  hasPaid: boolean
  currentMatchday: number
  now: number
  /** El administrador mira la jornada, pero no apuesta en ella. */
  isAdmin?: boolean
}

const OUTCOME_STYLES = {
  exact: { label: 'Marcador exacto', text: 'text-exact' },
  sign: { label: 'Signo acertado', text: 'text-sign' },
  miss: { label: 'Fallado', text: 'text-ink-mute' },
} as const

export function MatchCard({
  match,
  homeTeam,
  awayTeam,
  prediction,
  draft,
  onDraftChange,
  hasPaid,
  currentMatchday,
  now,
  isAdmin = false,
}: MatchCardProps) {
  const lock = lockReasonFor(match, { hasPaid, currentMatchday, now, isAdmin })
  const editable = lock === null
  const finished = isResolved(match)

  const value: DraftScore = draft ?? {
    home: prediction ? String(prediction.homeGoals) : '',
    away: prediction ? String(prediction.awayGoals) : '',
  }

  const scored = finished && prediction ? outcomeOf(prediction, match) : null
  const points = scored ? pointsForOutcome(scored) : null

  const update = (side: 'home' | 'away') => (raw: string) => {
    // Un solo dígito por marcador: nadie va a apostar un 12-0.
    const digits = raw.replace(/\D/g, '').slice(-1)
    onDraftChange(match.id, { ...value, [side]: digits })
  }

  return (
    // Sin tarjeta ni borde: los partidos se separan con la línea afilada que
    // pinta la pantalla de Jornadas.
    <article className="py-3.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-medium text-aqua">{formatTime(match.kickoff)}</span>
        <MatchStatus match={match} lock={lock} now={now} finished={finished} />
      </div>

      <div className="mt-3 space-y-2">
        <TeamRow team={homeTeam} fallback={match.homeTeamId} goals={match.homeGoals} winner={isWinner(match, 'home')} />
        <TeamRow team={awayTeam} fallback={match.awayTeamId} goals={match.awayGoals} winner={isWinner(match, 'away')} />
      </div>

      {/* Al administrador no se le pinta el hueco de la apuesta: no la tiene. */}
      {isAdmin ? null : (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] tracking-wide text-brand-soft uppercase">Tu apuesta</span>

          <div className="flex items-center gap-2.5">
            {/* Un fallo no suma nada, así que tampoco hace falta anunciarlo. */}
            {scored && points ? (
              <span
                title={OUTCOME_STYLES[scored].label}
                className={`font-mono text-[11px] font-semibold ${OUTCOME_STYLES[scored].text}`}
              >
                +{points} pts
              </span>
            ) : null}

            <ScorePicker
              home={value.home}
              away={value.away}
              editable={editable}
              onHomeChange={update('home')}
              onAwayChange={update('away')}
              homeLabel={`Goles de ${homeTeam?.name ?? 'local'}`}
              awayLabel={`Goles de ${awayTeam?.name ?? 'visitante'}`}
            />
          </div>
        </div>
      )}
    </article>
  )
}

function MatchStatus({
  match,
  lock,
  now,
  finished,
}: {
  match: Match
  lock: LockReason
  now: number
  finished: boolean
}) {
  if (finished) {
    return <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">Finalizado</span>
  }
  if (now >= match.kickoff) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-miss uppercase">
        <span className="size-1.5 animate-pulse rounded-full bg-miss" aria-hidden="true" />
        En juego
      </span>
    )
  }
  // Para el administrador la jornada es una lista de partidos y ya: no hay
  // cuenta atrás que le afecte ni candado que anunciarle.
  if (lock === 'admin') return null
  if (lock === null) {
    return (
      <span className="font-mono text-[11px] font-medium text-brand-soft">
        Cierra en {formatCountdown(match.kickoff - now)}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-ink-mute">
      <Lock size={11} aria-hidden="true" />
      {LOCK_MESSAGES[lock]}
    </span>
  )
}

function TeamRow({
  team,
  fallback,
  goals,
  winner,
}: {
  team: Team | undefined
  fallback: string
  goals: number | null
  winner: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`min-w-0 flex-1 truncate font-mono text-sm ${winner ? 'font-bold text-ink' : 'text-ink-soft'}`}
      >
        {team?.name ?? fallback}
      </span>
      <span
        className={`w-6 text-right font-mono text-lg tabular-nums ${
          goals === null ? 'text-ink-mute' : winner ? 'font-bold text-ink' : 'text-ink-soft'
        }`}
      >
        {goals ?? '–'}
      </span>
    </div>
  )
}

interface ScorePickerProps {
  home: string
  away: string
  editable: boolean
  onHomeChange: (value: string) => void
  onAwayChange: (value: string) => void
  homeLabel: string
  awayLabel: string
}

/**
 * Marcador de la apuesta, sin cajas.
 *
 * Cada número se apoya sobre un trazo fino que se enciende al escribir, como
 * el hueco de un formulario de papel. Encaja con una pantalla sin tarjetas ni
 * bordes: lo único que se ve es la cifra y la línea que la sostiene.
 */
function ScorePicker({
  home,
  away,
  editable,
  onHomeChange,
  onAwayChange,
  homeLabel,
  awayLabel,
}: ScorePickerProps) {
  return (
    <div className="flex items-end gap-2">
      <ScoreSlot value={home} label={homeLabel} editable={editable} onChange={onHomeChange} />
      <span aria-hidden="true" className="pb-2 font-mono text-sm text-ink-mute">
        –
      </span>
      <ScoreSlot value={away} label={awayLabel} editable={editable} onChange={onAwayChange} />
    </div>
  )
}

function ScoreSlot({
  value,
  label,
  editable,
  onChange,
}: {
  value: string
  label: string
  editable: boolean
  onChange: (value: string) => void
}) {
  // El trazo vive fuera del campo para poder engordarlo sin mover la cifra.
  const rule = (
    <span
      aria-hidden="true"
      className={[
        'block h-[2px] rounded-full transition-colors duration-200',
        editable ? (value === '' ? 'bg-brand/35' : 'bg-brand/70') : 'bg-line',
      ].join(' ')}
    />
  )

  if (!editable) {
    return (
      <span className="w-8">
        <span
          aria-label={`${label}: ${value || 'sin apostar'}`}
          className="block pb-1 text-center font-mono text-lg font-normal tabular-nums text-ink-soft"
        >
          {value === '' ? '–' : value}
        </span>
        {rule}
      </span>
    )
  }

  return (
    // El campo conserva 44 px de alto para el dedo aunque la cifra sea pequeña.
    <span className="w-8">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={1}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => event.target.select()}
        placeholder="–"
        className="h-11 w-full bg-transparent pb-1 text-center font-mono text-lg font-normal tabular-nums text-ink
                   placeholder:text-ink-mute focus:text-brand-soft focus:outline-none"
      />
      {rule}
    </span>
  )
}

function isWinner(match: Match, side: 'home' | 'away'): boolean {
  if (!isResolved(match)) return false
  return side === 'home' ? match.homeGoals > match.awayGoals : match.awayGoals > match.homeGoals
}
