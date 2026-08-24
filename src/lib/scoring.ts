import type { Extras, Match, Outcome, Prediction, Sign, TournamentConfig } from '@/types'

/**
 * Baremo de la porra.
 * Acertar el marcador exacto vale 3 puntos en total, no 3 además del signo.
 */
export const POINTS = {
  sign: 1,
  exact: 3,
  topScorer: 25,
  champion: 50,
} as const

/** Puntos máximos que reparte un solo partido. */
export const MAX_POINTS_PER_MATCH = POINTS.exact

/** Un partido al que el admin ya le ha puesto resultado. */
export type ResolvedMatch = Match & { homeGoals: number; awayGoals: number }

export function isResolved(match: Match): match is ResolvedMatch {
  return match.homeGoals !== null && match.awayGoals !== null
}

export function signOf(homeGoals: number, awayGoals: number): Sign {
  if (homeGoals > awayGoals) return '1'
  if (homeGoals < awayGoals) return '2'
  return 'X'
}

/** Compara una apuesta con el resultado oficial. */
export function outcomeOf(
  prediction: Pick<Prediction, 'homeGoals' | 'awayGoals'>,
  match: ResolvedMatch,
): Outcome {
  if (prediction.homeGoals === match.homeGoals && prediction.awayGoals === match.awayGoals) {
    return 'exact'
  }
  if (signOf(prediction.homeGoals, prediction.awayGoals) === signOf(match.homeGoals, match.awayGoals)) {
    return 'sign'
  }
  return 'miss'
}

export function pointsForOutcome(outcome: Outcome): number {
  if (outcome === 'exact') return POINTS.exact
  if (outcome === 'sign') return POINTS.sign
  return 0
}

/** Puntos de una apuesta contra un partido cualquiera. `null` si aún no hay resultado. */
export function scorePrediction(
  prediction: Pick<Prediction, 'homeGoals' | 'awayGoals'> | undefined,
  match: Match,
): { outcome: Outcome; points: number } | null {
  if (!prediction || !isResolved(match)) return null
  const outcome = outcomeOf(prediction, match)
  return { outcome, points: pointsForOutcome(outcome) }
}

/**
 * Normaliza un nombre para poder comparar el texto libre del máximo goleador:
 * quita tildes, pasa a minúsculas y colapsa espacios.
 */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Compara dos nombres de jugador escritos a mano. Acepta que uno sea una
 * versión abreviada del otro ("Mbappé" contra "Kylian Mbappé"), pero no
 * coincidencias parciales de una sola palabra corta.
 */
export function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a)
  const right = normalizeName(b)
  if (!left || !right) return false
  if (left === right) return true

  const leftTokens = left.split(' ').filter((t) => t.length > 2)
  const rightTokens = right.split(' ').filter((t) => t.length > 2)
  if (leftTokens.length === 0 || rightTokens.length === 0) return false

  const [shorter, longer] =
    leftTokens.length <= rightTokens.length ? [leftTokens, rightTokens] : [rightTokens, leftTokens]
  return shorter.every((token) => longer.includes(token))
}

/** Puntos de las dos apuestas especiales, una vez el admin conoce los aciertos. */
export function scoreExtras(
  extras: Extras | undefined,
  config: TournamentConfig,
): { points: number; topScorerHit: boolean; championHit: boolean } {
  const topScorerHit = Boolean(
    extras?.topScorer && config.actualTopScorer && namesMatch(extras.topScorer, config.actualTopScorer),
  )
  const championHit = Boolean(
    extras?.championTeamId &&
      config.actualChampionTeamId &&
      extras.championTeamId === config.actualChampionTeamId,
  )
  return {
    points: (topScorerHit ? POINTS.topScorer : 0) + (championHit ? POINTS.champion : 0),
    topScorerHit,
    championHit,
  }
}
