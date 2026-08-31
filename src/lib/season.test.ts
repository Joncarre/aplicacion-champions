import { describe, expect, it } from 'vitest'
import type { Extras, Match, Prediction, PublicUser, TournamentConfig } from '@/types'
import { MATCHES_PER_MATCHDAY, TOTAL_MATCHDAYS, TOTAL_MATCHES } from '@/data/calendar'
import { buildOfficialMatches } from '@/data/fixtures'
import { evaluateAchievements } from './achievements'
import { POINTS, isResolved, outcomeOf } from './scoring'
import { buildEvolution, buildInternalStandings, computeUserScore } from './standings'

/**
 * Temporada entera simulada sobre el calendario oficial.
 *
 * Los tests de al lado comprueban cada pieza por separado con dos o tres
 * partidos. Este juega las ocho jornadas con sus 144 partidos y seis
 * participantes, y comprueba que las cuentas cuadran entre sí: que el total
 * es exactamente lo que dice el baremo, que el desglose por jornada suma lo
 * mismo que el total y que la tabla y las gráficas cuentan la misma historia.
 *
 * Es la prueba que hay que mirar si alguna vez alguien dice que sus puntos no
 * le salen.
 */

/** Generador reproducible: la misma temporada en cada ejecución. */
function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 4_294_967_296
  }
}

const PARTICIPANTS = ['ana', 'bea', 'cai', 'dani', 'eva', 'fran']

function user(nickname: string): PublicUser {
  return {
    id: nickname,
    nickname,
    nombre: nickname,
    apellidos: 'Apellido',
    photo: null,
    isAdmin: false,
    hasPaid: true,
    createdAt: 0,
  }
}

/** Resultados oficiales hasta la jornada indicada, ambas incluidas. */
function playUpTo(matchday: number): Match[] {
  const random = makeRandom(20_2627)
  return buildOfficialMatches().map((match) => {
    // Se recorre siempre entero para que los marcadores no dependan del corte.
    const home = Math.floor(random() * 5)
    const away = Math.floor(random() * 5)
    if (match.matchday > matchday) return match
    return { ...match, homeGoals: home, awayGoals: away }
  })
}

/**
 * Apuestas de todos. Cada participante tiene su propia semilla, así que unos
 * aciertan más que otros y la tabla no acaba en un empate a todo.
 */
function betsFor(matches: Match[], skip: (nickname: string, index: number) => boolean = () => false): Prediction[] {
  const predictions: Prediction[] = []

  PARTICIPANTS.forEach((nickname, seat) => {
    const random = makeRandom(1_000 + seat * 97)
    matches.forEach((match, index) => {
      const home = Math.floor(random() * 4)
      const away = Math.floor(random() * 4)
      if (skip(nickname, index)) return
      predictions.push({
        id: `${nickname}__${match.id}`,
        userId: nickname,
        matchId: match.id,
        matchday: match.matchday,
        homeGoals: home,
        awayGoals: away,
        updatedAt: match.kickoff - 86_400_000,
      })
    })
  })

  return predictions
}

const CONFIG: TournamentConfig = {
  actualTopScorer: null,
  actualChampion: null,
  currentMatchdayOverride: null,
  entryFee: 10,
}

const byUser = (predictions: Prediction[], userId: string) => predictions.filter((p) => p.userId === userId)

describe('temporada completa sobre el calendario oficial', () => {
  const matches = playUpTo(TOTAL_MATCHDAYS)
  const predictions = betsFor(matches)
  const users = PARTICIPANTS.map(user)

  it('reparte los 144 partidos en ocho jornadas de dieciocho', () => {
    expect(matches).toHaveLength(TOTAL_MATCHES)
    for (let matchday = 1; matchday <= TOTAL_MATCHDAYS; matchday++) {
      expect(matches.filter((match) => match.matchday === matchday)).toHaveLength(MATCHES_PER_MATCHDAY)
    }
  })

  it('el total de cada uno es exactamente lo que dice el baremo', () => {
    for (const participant of users) {
      const score = computeUserScore({
        userId: participant.id,
        predictions: byUser(predictions, participant.id),
        matches,
        extras: undefined,
        config: CONFIG,
      })

      // 1 punto por signo, 3 por marcador exacto. Nada más y nada menos.
      expect(score.totalPoints).toBe(score.signHits * POINTS.sign + score.exactHits * POINTS.exact)
      // Y el desglose por jornada suma lo mismo que el total.
      expect(score.matchdays.reduce((sum, bucket) => sum + bucket.points, 0)).toBe(score.matchPoints)
      expect(score.matchdays.reduce((sum, bucket) => sum + bucket.signHits, 0)).toBe(score.signHits)
      expect(score.matchdays.reduce((sum, bucket) => sum + bucket.exactHits, 0)).toBe(score.exactHits)
    }
  })

  it('cuenta un acierto por partido, ni de más ni de menos', () => {
    const ana = computeUserScore({
      userId: 'ana',
      predictions: byUser(predictions, 'ana'),
      matches,
      extras: undefined,
      config: CONFIG,
    })

    // El mismo recuento, hecho a mano partido a partido.
    let signos = 0
    let exactos = 0
    for (const prediction of byUser(predictions, 'ana')) {
      const match = matches.find((m) => m.id === prediction.matchId)
      if (!match || !isResolved(match)) continue
      const outcome = outcomeOf(prediction, match)
      if (outcome === 'exact') exactos++
      else if (outcome === 'sign') signos++
    }

    expect(ana.exactHits).toBe(exactos)
    expect(ana.signHits).toBe(signos)
    // Con 144 partidos apostados alguno se acierta: si sale cero, algo va mal.
    expect(ana.exactHits + ana.signHits).toBeGreaterThan(0)
  })

  it('ordena la tabla por puntos y numera las posiciones sin saltos', () => {
    const rows = buildInternalStandings({ users, predictions, matches, extras: [], config: CONFIG })

    expect(rows).toHaveLength(PARTICIPANTS.length)
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4, 5, 6])

    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.totalPoints).toBeGreaterThanOrEqual(rows[i]!.totalPoints)
    }
  })

  it('la gráfica acaba en los mismos puntos que la tabla', () => {
    const rows = buildInternalStandings({ users, predictions, matches, extras: [], config: CONFIG })

    for (const row of rows) {
      const evolution = buildEvolution(row.user.id, rows)
      const last = evolution[evolution.length - 1]

      expect(evolution).toHaveLength(TOTAL_MATCHDAYS)
      expect(last?.cumulative).toBe(row.matchPoints)
      // El techo son tres puntos por partido resuelto: 144 × 3.
      expect(last?.maxCumulative).toBe(TOTAL_MATCHES * POINTS.exact)
      // Nadie puede ir por delante del líder.
      expect(last!.gapToLeader).toBeLessThanOrEqual(0)
    }

    // Y el líder de la gráfica es el primero de la tabla.
    const leader = buildEvolution(rows[0]!.user.id, rows)
    expect(leader[leader.length - 1]!.gapToLeader).toBe(0)
  })

  it('suma el goleador y el campeón encima de los puntos de los partidos', () => {
    const extras: Extras[] = [{ userId: 'ana', topScorer: 'Kylian Mbappé', champion: 'Real Madrid' }]
    const config: TournamentConfig = {
      ...CONFIG,
      actualTopScorer: 'Mbappé',
      actualChampion: 'Real Madrid',
    }

    const conExtras = computeUserScore({
      userId: 'ana',
      predictions: byUser(predictions, 'ana'),
      matches,
      extras: extras[0],
      config,
    })

    expect(conExtras.extraPoints).toBe(POINTS.topScorer + POINTS.champion)
    expect(conExtras.totalPoints).toBe(conExtras.matchPoints + POINTS.topScorer + POINTS.champion)
    expect(conExtras.topScorerHit).toBe(true)
    expect(conExtras.championHit).toBe(true)
  })
})

describe('temporada a medias', () => {
  it('no cuenta como jugado lo que todavía no tiene resultado', () => {
    const matches = playUpTo(3)
    const predictions = betsFor(matches)
    const users = PARTICIPANTS.map(user)
    const rows = buildInternalStandings({ users, predictions, matches, extras: [], config: CONFIG })

    for (const row of rows) {
      // Las jornadas 4 a 8 están en blanco, no ausentes.
      for (const bucket of row.matchdays.filter((m) => m.matchday > 3)) {
        expect(bucket.resolved).toBe(0)
        expect(bucket.points).toBe(0)
      }

      const evolution = buildEvolution(row.user.id, rows)
      expect(evolution.filter((point) => point.played).map((point) => point.matchday)).toEqual([1, 2, 3])
      expect(evolution[evolution.length - 1]!.maxCumulative).toBe(3 * MATCHES_PER_MATCHDAY * POINTS.exact)
    }
  })

  it('los logros se reparten sobre las jornadas terminadas', () => {
    const matches = playUpTo(8)
    // Fran se salta un partido de la última jornada; el resto apuestan todo.
    const predictions = betsFor(matches, (nickname, index) => nickname === 'fran' && index === TOTAL_MATCHES - 1)
    const users = PARTICIPANTS.map(user)
    const rows = buildInternalStandings({ users, predictions, matches, extras: [], config: CONFIG })

    const veterano = (userId: string) =>
      evaluateAchievements({
        userId,
        scores: rows,
        predictions: byUser(predictions, userId),
        matches,
      }).find((state) => state.id === 'veterano')?.unlocked

    expect(veterano('ana')).toBe(true)
    expect(veterano('fran')).toBe(false)

    // Y el mejor de alguna jornada existe: alguien tiene que serlo.
    const algunMejor = PARTICIPANTS.some((nickname) =>
      evaluateAchievements({
        userId: nickname,
        scores: rows,
        predictions: byUser(predictions, nickname),
        matches,
      }).some((state) => state.id === 'top-1' && state.unlocked),
    )
    expect(algunMejor).toBe(true)
  })
})
