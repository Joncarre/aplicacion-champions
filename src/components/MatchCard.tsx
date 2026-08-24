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
}

const OUTCOME_STYLES = {
  exact: { label: 'Marcador exacto', chip: 'bg-exact/15 text-exact' },
  sign: { label: 'Signo acertado', chip: 'bg-sign/15 text-sign' },
  miss: { label: 'Fallado', chip: 'bg-line text-ink-mute' },
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
}: MatchCardProps) {
  const lock = lockReasonFor(match, { hasPaid, currentMatchday, now })
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
    <article className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
        <span className="font-mono text-xs font-medium text-ink-soft">{formatTime(match.kickoff)}</span>
        <MatchStatus match={match} lock={lock} now={now} finished={finished} />
      </div>

      <div className="space-y-2 px-4 py-3.5">
        <TeamRow team={homeTeam} fallback={match.homeTeamId} goals={match.homeGoals} winner={isWinner(match, 'home')} />
        <TeamRow team={awayTeam} fallback={match.awayTeamId} goals={match.awayGoals} winner={isWinner(match, 'away')} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line-soft bg-raised/40 px-4 py-3">
        <span className="text-xs font-medium text-ink-mute">Tu apuesta</span>

        <div className="flex items-center gap-2">
          {scored ? (
            <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${OUTCOME_STYLES[scored].chip}`}>
              {points === 0 ? '0 pts' : `+${points} pts`}
            </span>
          ) : null}

          <div className="flex items-center gap-1.5">
            <ScoreInput
              value={value.home}
              onChange={update('home')}
              editable={editable}
              label={`Goles de ${homeTeam?.name ?? 'local'}`}
            />
            <span aria-hidden="true" className="text-ink-mute">
              –
            </span>
            <ScoreInput
              value={value.away}
              onChange={update('away')}
              editable={editable}
              label={`Goles de ${awayTeam?.name ?? 'visitante'}`}
            />
          </div>
        </div>
      </div>
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
    return <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">Final</span>
  }
  if (now >= match.kickoff) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-miss uppercase">
        <span className="size-1.5 animate-pulse rounded-full bg-miss" aria-hidden="true" />
        En juego
      </span>
    )
  }
  if (lock === null) {
    return (
      <span className="text-[11px] font-medium text-brand-soft">
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
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="h-6 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: team?.color ?? 'var(--color-line)' }}
      />
      <span className={`min-w-0 flex-1 truncate text-[15px] ${winner ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
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

function ScoreInput({
  value,
  onChange,
  editable,
  label,
}: {
  value: string
  onChange: (value: string) => void
  editable: boolean
  label: string
}) {
  if (!editable) {
    return (
      <span
        aria-label={`${label}: ${value || 'sin apostar'}`}
        className="grid size-11 place-items-center rounded-lg border border-line-soft bg-surface font-mono text-base tabular-nums text-ink-soft"
      >
        {value === '' ? '–' : value}
      </span>
    )
  }

  return (
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
      className="size-11 rounded-lg border border-line bg-raised text-center font-mono text-base tabular-nums text-ink
                 transition-colors placeholder:text-ink-mute focus:border-brand focus:outline-none"
    />
  )
}

function isWinner(match: Match, side: 'home' | 'away'): boolean {
  if (!isResolved(match)) return false
  return side === 'home' ? match.homeGoals > match.awayGoals : match.awayGoals > match.homeGoals
}
