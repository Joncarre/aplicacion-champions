import type { Match, Prediction, UserScore } from '@/types'
import { isResolved, outcomeOf } from './scoring'

/**
 * Logros personales.
 *
 * No se guardan en ninguna parte: se deducen cada vez a partir de las
 * puntuaciones y de las apuestas, que ya están en la base de datos. Eso tiene
 * dos ventajas que compensan de sobra recalcularlos: nunca pueden quedar
 * desincronizados con los resultados —si el admin corrige un marcador, los
 * logros se ajustan solos— y se pueden añadir logros nuevos que se apliquen
 * hacia atrás sin migrar nada.
 */

export type AchievementGroup = 'jornada' | 'liderato' | 'goleada' | 'precision' | 'constancia' | 'gestas'

export interface Achievement {
  id: string
  emoji: string
  title: string
  description: string
  group: AchievementGroup
}

export interface AchievementState extends Achievement {
  unlocked: boolean
}

export const ACHIEVEMENT_GROUPS: { id: AchievementGroup; label: string }[] = [
  { id: 'jornada', label: 'Mejor de la jornada' },
  { id: 'liderato', label: 'Liderato' },
  { id: 'goleada', label: 'Goleadas clavadas' },
  { id: 'precision', label: 'Precisión' },
  { id: 'constancia', label: 'Constancia' },
  { id: 'gestas', label: 'Gestas' },
]

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'top-1',
    emoji: '🥇',
    title: 'Mejor de la jornada',
    description: 'Sacar más puntos que nadie en una jornada.',
    group: 'jornada',
  },
  {
    id: 'top-2',
    emoji: '🔥',
    title: 'Dos seguidas',
    description: 'Ser el mejor de la jornada dos veces consecutivas.',
    group: 'jornada',
  },
  {
    id: 'top-3',
    emoji: '🚀',
    title: 'Tres seguidas',
    description: 'Ser el mejor de la jornada tres veces consecutivas.',
    group: 'jornada',
  },
  {
    id: 'leader-1',
    emoji: '👑',
    title: 'Líder',
    description: 'Encabezar la clasificación al cerrar una jornada.',
    group: 'liderato',
  },
  {
    id: 'leader-2',
    emoji: '🛡️',
    title: 'Líder dos jornadas',
    description: 'Aguantar el liderato dos jornadas seguidas.',
    group: 'liderato',
  },
  {
    id: 'leader-3',
    emoji: '🏆',
    title: 'Líder tres jornadas',
    description: 'Aguantar el liderato tres jornadas seguidas.',
    group: 'liderato',
  },
  {
    id: 'exact-5',
    emoji: '🎯',
    title: 'Más de 4 goles',
    description: 'Clavar el marcador de un partido con más de cuatro goles.',
    group: 'goleada',
  },
  {
    id: 'exact-7',
    emoji: '💥',
    title: 'Más de 6 goles',
    description: 'Clavar el marcador de un partido con más de seis goles.',
    group: 'goleada',
  },
  {
    id: 'exact-9',
    emoji: '🌋',
    title: 'Más de 8 goles',
    description: 'Clavar el marcador de un partido con más de ocho goles.',
    group: 'goleada',
  },
  {
    id: 'triplete',
    emoji: '🎳',
    title: 'Triplete',
    description: 'Clavar tres marcadores en la misma jornada.',
    group: 'precision',
  },
  {
    id: 'porteria-cero',
    emoji: '🥅',
    title: 'Portería a cero',
    description: 'Acertar un 0-0.',
    group: 'precision',
  },
  {
    id: 'sangre-fria',
    emoji: '🧊',
    title: 'Sangre fría',
    description: 'Clavar el marcador de un partido que acabó en empate.',
    group: 'precision',
  },
  {
    id: 'puntual',
    emoji: '⏰',
    title: 'Puntual',
    description: 'Apostar una jornada entera antes de que empiece el primer partido.',
    group: 'constancia',
  },
  {
    id: 'veterano',
    emoji: '🎖️',
    title: 'Veterano',
    description: 'No dejarse ni un partido sin apostar en toda la fase liga.',
    group: 'constancia',
  },
  {
    id: 'muro',
    emoji: '🧱',
    title: 'Muro',
    description: 'Terminar una jornada sin fallar ni un signo.',
    group: 'constancia',
  },
  {
    id: 'remontada',
    emoji: '📈',
    title: 'Remontada',
    description: 'Recortarle veinte puntos o más al líder de una jornada a otra.',
    group: 'gestas',
  },
  {
    id: 'tocado-hundido',
    emoji: '🃏',
    title: 'Tocado y hundido',
    description: 'Ser el mejor de la jornada llegando a ella el último de la tabla.',
    group: 'gestas',
  },
  {
    id: 'vidente',
    emoji: '🔮',
    title: 'Vidente',
    description: 'Acertar el máximo goleador o el campeón.',
    group: 'gestas',
  },
]

interface AchievementInput {
  userId: string
  /** Puntuaciones de todos los participantes: hacen falta para comparar. */
  scores: UserScore[]
  /** Apuestas del usuario. */
  predictions: Prediction[]
  matches: Match[]
}

/** Jornadas que ya tienen algún resultado oficial, en orden. */
function playedMatchdays(scores: UserScore[]): number[] {
  const played = new Set<number>()
  for (const score of scores) {
    for (const bucket of score.matchdays) {
      if (bucket.resolved > 0) played.add(bucket.matchday)
    }
  }
  return [...played].sort((a, b) => a - b)
}

/** Quién sacó más puntos en una jornada. Empatados cuentan todos. */
function bestOfMatchday(scores: UserScore[], matchday: number): Set<string> {
  let best = 0
  const winners = new Set<string>()

  for (const score of scores) {
    const bucket = score.matchdays.find((m) => m.matchday === matchday)
    if (!bucket) continue
    if (bucket.points > best) {
      best = bucket.points
      winners.clear()
      winners.add(score.userId)
    } else if (bucket.points === best && best > 0) {
      winners.add(score.userId)
    }
  }

  // Una jornada en la que nadie puntúa no tiene mejor.
  return best > 0 ? winners : new Set()
}

/** Puntos acumulados por un participante hasta una jornada, ambas incluidas. */
function cumulativeThrough(score: UserScore, matchday: number): number {
  return score.matchdays.filter((m) => m.matchday <= matchday).reduce((sum, m) => sum + m.points, 0)
}

/** Quién encabezaba la clasificación al cerrar una jornada. */
function leadersAt(scores: UserScore[], matchday: number): Set<string> {
  let best = 0
  const leaders = new Set<string>()

  for (const score of scores) {
    const total = cumulativeThrough(score, matchday)

    if (total > best) {
      best = total
      leaders.clear()
      leaders.add(score.userId)
    } else if (total === best && best > 0) {
      leaders.add(score.userId)
    }
  }

  return best > 0 ? leaders : new Set()
}

/** Quién cerraba la tabla al terminar una jornada. */
function lastPlaceAt(scores: UserScore[], matchday: number): Set<string> {
  if (scores.length === 0) return new Set()

  let worst = Number.POSITIVE_INFINITY
  const trailing = new Set<string>()

  for (const score of scores) {
    const total = cumulativeThrough(score, matchday)

    if (total < worst) {
      worst = total
      trailing.clear()
      trailing.add(score.userId)
    } else if (total === worst) {
      trailing.add(score.userId)
    }
  }

  return trailing
}

/** El desglose del usuario en una jornada, si existe. */
function bucketOf(score: UserScore | undefined, matchday: number) {
  return score?.matchdays.find((m) => m.matchday === matchday)
}

/**
 * ¿Apostó alguna jornada completa antes de que arrancara?
 *
 * Se exige que la jornada esté terminada para no dar el logro por una jornada
 * a medio disputar en la que todavía se pueden cambiar apuestas.
 */
function betEarly(predictions: Prediction[], matches: Match[]): boolean {
  const byMatchday = new Map<number, Match[]>()
  for (const match of matches) {
    const bucket = byMatchday.get(match.matchday)
    if (bucket) bucket.push(match)
    else byMatchday.set(match.matchday, [match])
  }

  const own = new Map(predictions.map((prediction) => [prediction.matchId, prediction]))

  for (const [, dayMatches] of byMatchday) {
    if (!dayMatches.every(isResolved)) continue

    const firstKickoff = Math.min(...dayMatches.map((match) => match.kickoff))
    const mine = dayMatches.map((match) => own.get(match.id))

    if (mine.every((prediction) => prediction !== undefined && prediction.updatedAt < firstKickoff)) {
      return true
    }
  }

  return false
}

/** ¿Clavó algún marcador que cumpla la condición dada? */
function hasExactHit(
  predictions: Prediction[],
  matches: Match[],
  condition: (homeGoals: number, awayGoals: number) => boolean,
): boolean {
  const byId = new Map(matches.map((match) => [match.id, match]))

  return predictions.some((prediction) => {
    const match = byId.get(prediction.matchId)
    if (!match || !isResolved(match)) return false
    if (outcomeOf(prediction, match) !== 'exact') return false
    return condition(match.homeGoals, match.awayGoals)
  })
}

/**
 * Racha más larga de jornadas consecutivas marcadas.
 *
 * Se recorre la lista de jornadas jugadas y no los números en bruto: si una
 * jornada aún no tiene resultados, la racha no debería romperse por eso.
 */
function longestStreak(played: number[], hit: (matchday: number) => boolean): number {
  let best = 0
  let current = 0

  for (const matchday of played) {
    current = hit(matchday) ? current + 1 : 0
    if (current > best) best = current
  }

  return best
}

/** Máximo número de goles de un partido cuyo marcador clavó el usuario. */
function biggestExactHit(predictions: Prediction[], matches: Match[]): number {
  const byId = new Map(matches.map((match) => [match.id, match]))
  let best = 0

  for (const prediction of predictions) {
    const match = byId.get(prediction.matchId)
    if (!match || !isResolved(match)) continue
    if (outcomeOf(prediction, match) !== 'exact') continue

    const goals = match.homeGoals + match.awayGoals
    if (goals > best) best = goals
  }

  return best
}

export function evaluateAchievements({
  userId,
  scores,
  predictions,
  matches,
}: AchievementInput): AchievementState[] {
  const played = playedMatchdays(scores)

  const wasBest = (matchday: number) => bestOfMatchday(scores, matchday).has(userId)
  const wasLeader = (matchday: number) => leadersAt(scores, matchday).has(userId)

  const bestStreak = longestStreak(played, wasBest)
  const leaderStreak = longestStreak(played, wasLeader)
  const biggest = biggestExactHit(predictions, matches)

  const mine = scores.find((score) => score.userId === userId)

  // Ni un partido sin apostar en todas las jornadas ya resueltas.
  const veterano =
    played.length > 0 &&
    played.every((matchday) => {
      const bucket = bucketOf(mine, matchday)
      return bucket !== undefined && bucket.predicted === bucket.resolved
    })

  // Una jornada entera apostada y sin un solo signo fallado.
  const muro = played.some((matchday) => {
    const bucket = bucketOf(mine, matchday)
    if (!bucket || bucket.resolved === 0) return false
    return bucket.predicted === bucket.resolved && bucket.signHits + bucket.exactHits === bucket.resolved
  })

  const triplete = played.some((matchday) => (bucketOf(mine, matchday)?.exactHits ?? 0) >= 3)

  // Distancia con el líder al cerrar cada jornada, siempre negativa o cero.
  const gaps = played.map((matchday) => {
    const own = mine ? cumulativeThrough(mine, matchday) : 0
    const best = Math.max(0, ...scores.map((score) => cumulativeThrough(score, matchday)))
    return own - best
  })
  const remontada = gaps.some((gap, index) => index > 0 && gap - (gaps[index - 1] ?? 0) >= 20)

  // Ser el mejor de una jornada llegando a ella el último de la tabla.
  const tocadoHundido = played.some((matchday, index) => {
    const previous = played[index - 1]
    if (previous === undefined) return false
    return lastPlaceAt(scores, previous).has(userId) && wasBest(matchday)
  })

  const unlocked: Record<string, boolean> = {
    'top-1': bestStreak >= 1,
    'top-2': bestStreak >= 2,
    'top-3': bestStreak >= 3,
    'leader-1': leaderStreak >= 1,
    'leader-2': leaderStreak >= 2,
    'leader-3': leaderStreak >= 3,
    'exact-5': biggest > 4,
    'exact-7': biggest > 6,
    'exact-9': biggest > 8,
    triplete,
    'porteria-cero': hasExactHit(predictions, matches, (home, away) => home === 0 && away === 0),
    'sangre-fria': hasExactHit(predictions, matches, (home, away) => home === away),
    puntual: betEarly(predictions, matches),
    veterano,
    muro,
    remontada,
    'tocado-hundido': tocadoHundido,
    vidente: Boolean(mine?.topScorerHit || mine?.championHit),
  }

  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked[achievement.id] ?? false,
  }))
}
