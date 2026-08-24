import type {
  Extras,
  InternalRow,
  Match,
  MatchdayScore,
  Prediction,
  PublicUser,
  Team,
  TeamStanding,
  TournamentConfig,
  UserScore,
} from '@/types'
import { MATCHDAY_WINDOWS } from '@/data/calendar'
import { MAX_POINTS_PER_MATCH, isResolved, outcomeOf, pointsForOutcome, scoreExtras } from './scoring'

/* ────────────────────────────── Clasificación real ────────────────────────────── */

/**
 * Tabla de la fase liga a partir de los resultados que ha ido metiendo el admin.
 * Desempates: puntos, diferencia de goles, goles a favor y nombre.
 */
export function buildChampionsStandings(teams: Team[], matches: Match[]): TeamStanding[] {
  const rows = new Map<string, Omit<TeamStanding, 'position'>>()
  for (const team of teams) {
    rows.set(team.id, {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    })
  }

  for (const match of matches) {
    if (!isResolved(match)) continue
    const home = rows.get(match.homeTeamId)
    const away = rows.get(match.awayTeamId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += match.homeGoals
    home.goalsAgainst += match.awayGoals
    away.goalsFor += match.awayGoals
    away.goalsAgainst += match.homeGoals

    if (match.homeGoals > match.awayGoals) {
      home.won++
      home.points += 3
      away.lost++
    } else if (match.homeGoals < match.awayGoals) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    }
  }

  return [...rows.values()]
    .map((row) => ({ ...row, goalDiff: row.goalsFor - row.goalsAgainst }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        a.team.name.localeCompare(b.team.name, 'es'),
    )
    .map((row, index) => ({ ...row, position: index + 1 }))
}

/* ────────────────────────────── Clasificación de la porra ────────────────────────────── */

interface ScoreInput {
  userId: string
  /** Solo las apuestas de ese usuario. */
  predictions: Prediction[]
  matches: Match[]
  extras: Extras | undefined
  config: TournamentConfig
}

/**
 * Puntuación de un usuario, desglosada por jornada.
 *
 * `signHits` cuenta los aciertos de signo que NO son marcador exacto, para que
 * la tabla cuadre a simple vista: puntos = 1 × signos + 3 × exactos + extras.
 */
export function computeUserScore({ userId, predictions, matches, extras, config }: ScoreInput): UserScore {
  const byMatch = new Map(predictions.map((p) => [p.matchId, p]))
  const buckets = new Map<number, MatchdayScore>(
    MATCHDAY_WINDOWS.map((w) => [
      w.matchday,
      { matchday: w.matchday, points: 0, signHits: 0, exactHits: 0, resolved: 0, predicted: 0 },
    ]),
  )

  for (const match of matches) {
    let bucket = buckets.get(match.matchday)
    if (!bucket) {
      bucket = { matchday: match.matchday, points: 0, signHits: 0, exactHits: 0, resolved: 0, predicted: 0 }
      buckets.set(match.matchday, bucket)
    }
    if (!isResolved(match)) continue
    bucket.resolved++

    const prediction = byMatch.get(match.id)
    if (!prediction) continue
    bucket.predicted++

    const outcome = outcomeOf(prediction, match)
    bucket.points += pointsForOutcome(outcome)
    if (outcome === 'exact') bucket.exactHits++
    else if (outcome === 'sign') bucket.signHits++
  }

  const matchdays = [...buckets.values()].sort((a, b) => a.matchday - b.matchday)
  const matchPoints = matchdays.reduce((sum, m) => sum + m.points, 0)
  const extraScore = scoreExtras(extras, config)

  return {
    userId,
    matchdays,
    matchPoints,
    extraPoints: extraScore.points,
    totalPoints: matchPoints + extraScore.points,
    signHits: matchdays.reduce((sum, m) => sum + m.signHits, 0),
    exactHits: matchdays.reduce((sum, m) => sum + m.exactHits, 0),
    topScorerHit: extraScore.topScorerHit,
    championHit: extraScore.championHit,
  }
}

interface StandingsInput {
  users: PublicUser[]
  /** Apuestas de todos los participantes. */
  predictions: Prediction[]
  matches: Match[]
  extras: Extras[]
  config: TournamentConfig
}

/** Tabla de la porra ordenada. Desempates: puntos, exactos, signos y nickname. */
export function buildInternalStandings({
  users,
  predictions,
  matches,
  extras,
  config,
}: StandingsInput): InternalRow[] {
  const predictionsByUser = groupBy(predictions, (p) => p.userId)
  const extrasByUser = new Map(extras.map((e) => [e.userId, e]))

  return users
    .map((user) => ({
      user,
      ...computeUserScore({
        userId: user.id,
        predictions: predictionsByUser.get(user.id) ?? [],
        matches,
        extras: extrasByUser.get(user.id),
        config,
      }),
    }))
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.exactHits - a.exactHits ||
        b.signHits - a.signHits ||
        a.user.nickname.localeCompare(b.user.nickname, 'es'),
    )
    .map((row, index) => ({ ...row, position: index + 1 }))
}

/* ────────────────────────────── Evolución para el perfil ────────────────────────────── */

export interface EvolutionPoint {
  matchday: number
  /** Puntos conseguidos en esa jornada. */
  points: number
  cumulative: number
  /** Techo alcanzable con los partidos ya resueltos hasta esa jornada. */
  maxCumulative: number
  /** Acumulado del líder de la porra en ese momento. */
  leaderCumulative: number
  /** Distancia con el líder: 0 si vas primero, negativo si vas por detrás. */
  gapToLeader: number
  signHits: number
  exactHits: number
  /** `false` mientras la jornada no tenga ningún resultado oficial. */
  played: boolean
}

/**
 * Serie temporal de un usuario jornada a jornada, con su techo teórico y su
 * distancia al líder. Es la materia prima de las gráficas del perfil.
 */
export function buildEvolution(userId: string, allScores: UserScore[]): EvolutionPoint[] {
  const mine = allScores.find((s) => s.userId === userId)
  if (!mine) return []

  const cumulativeByUser = new Map<string, number>()
  let myCumulative = 0
  let maxCumulative = 0

  return mine.matchdays.map((bucket) => {
    myCumulative += bucket.points
    maxCumulative += bucket.resolved * MAX_POINTS_PER_MATCH

    let leaderCumulative = 0
    for (const score of allScores) {
      const previous = cumulativeByUser.get(score.userId) ?? 0
      const found = score.matchdays.find((m) => m.matchday === bucket.matchday)
      const next = previous + (found?.points ?? 0)
      cumulativeByUser.set(score.userId, next)
      if (next > leaderCumulative) leaderCumulative = next
    }

    return {
      matchday: bucket.matchday,
      points: bucket.points,
      cumulative: myCumulative,
      maxCumulative,
      leaderCumulative,
      gapToLeader: myCumulative - leaderCumulative,
      signHits: bucket.signHits,
      exactHits: bucket.exactHits,
      played: bucket.resolved > 0,
    }
  })
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const k = key(item)
    const bucket = map.get(k)
    if (bucket) bucket.push(item)
    else map.set(k, [item])
  }
  return map
}
