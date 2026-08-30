import { describe, expect, it } from 'vitest'
import type { Match, MatchdayScore, Prediction, UserScore } from '@/types'
import { ACHIEVEMENTS, evaluateAchievements } from './achievements'

/** Puntuación de un usuario a partir de sus puntos por jornada. */
function score(userId: string, pointsByMatchday: number[]): UserScore {
  const matchdays: MatchdayScore[] = pointsByMatchday.map((points, index) => ({
    matchday: index + 1,
    points,
    signHits: points,
    exactHits: 0,
    // Una jornada con partidos resueltos, aunque el usuario sacara cero.
    resolved: 18,
    predicted: 18,
  }))

  return {
    userId,
    matchdays,
    matchPoints: pointsByMatchday.reduce((a, b) => a + b, 0),
    extraPoints: 0,
    totalPoints: pointsByMatchday.reduce((a, b) => a + b, 0),
    signHits: 0,
    exactHits: 0,
    topScorerHit: false,
    championHit: false,
  }
}

const match = (id: string, homeGoals: number, awayGoals: number): Match => ({
  id,
  matchday: 1,
  homeTeamId: 'a',
  awayTeamId: 'b',
  kickoff: 0,
  homeGoals,
  awayGoals,
})

const prediction = (matchId: string, homeGoals: number, awayGoals: number): Prediction => ({
  id: `ana__${matchId}`,
  userId: 'ana',
  matchId,
  matchday: 1,
  homeGoals,
  awayGoals,
  updatedAt: 0,
})

const evaluate = (input: Partial<Parameters<typeof evaluateAchievements>[0]> = {}) =>
  evaluateAchievements({ userId: 'ana', scores: [], predictions: [], matches: [], ...input })

const has = (states: ReturnType<typeof evaluate>, id: string) =>
  states.find((state) => state.id === id)?.unlocked ?? false

describe('evaluateAchievements', () => {
  it('devuelve todos los logros, conseguidos o no', () => {
    const states = evaluate()
    expect(states).toHaveLength(ACHIEVEMENTS.length)
    expect(states.every((state) => state.unlocked === false)).toBe(true)
  })

  it('no da nada por jugado si aún no hay resultados', () => {
    const vacio: UserScore = { ...score('ana', [0]), matchdays: [] }
    const states = evaluate({ scores: [vacio] })
    expect(states.every((state) => state.unlocked === false)).toBe(true)
  })

  /* ────────────────────────────── Mejor de la jornada ────────────────────────────── */

  it('reconoce al mejor de una jornada', () => {
    const scores = [score('ana', [30, 10]), score('bea', [20, 40])]
    const states = evaluate({ scores })

    expect(has(states, 'top-1')).toBe(true)
    expect(has(states, 'top-2')).toBe(false)
  })

  it('cuenta las rachas de mejor de la jornada', () => {
    // Ana gana las jornadas 1, 2 y 3 seguidas.
    const scores = [score('ana', [30, 30, 30, 5]), score('bea', [10, 10, 10, 50])]
    const states = evaluate({ scores })

    expect(has(states, 'top-1')).toBe(true)
    expect(has(states, 'top-2')).toBe(true)
    expect(has(states, 'top-3')).toBe(true)
  })

  it('rompe la racha cuando pierde una jornada por el medio', () => {
    // Gana la 1 y la 2, pierde la 3, gana la 4: la racha máxima es de dos.
    const scores = [score('ana', [30, 30, 5, 30]), score('bea', [10, 10, 50, 10])]
    const states = evaluate({ scores })

    expect(has(states, 'top-2')).toBe(true)
    expect(has(states, 'top-3')).toBe(false)
  })

  it('reparte el logro entre los empatados', () => {
    const scores = [score('ana', [25]), score('bea', [25])]
    expect(has(evaluate({ scores }), 'top-1')).toBe(true)
    expect(has(evaluate({ userId: 'bea', scores }), 'top-1')).toBe(true)
  })

  it('no da el logro si nadie puntuó en esa jornada', () => {
    const scores = [score('ana', [0]), score('bea', [0])]
    expect(has(evaluate({ scores }), 'top-1')).toBe(false)
  })

  /* ────────────────────────────── Liderato ────────────────────────────── */

  it('reconoce el liderato por puntos acumulados, no por jornada suelta', () => {
    // Bea gana la segunda jornada, pero Ana sigue líder en el acumulado.
    const scores = [score('ana', [40, 10]), score('bea', [5, 30])]
    const states = evaluate({ scores })

    expect(has(states, 'leader-1')).toBe(true)
    expect(has(states, 'leader-2')).toBe(true)
    expect(has(states, 'top-2')).toBe(false)
  })

  it('cuenta las rachas de liderato', () => {
    const scores = [score('ana', [40, 40, 40]), score('bea', [5, 5, 5])]
    const states = evaluate({ scores })

    expect(has(states, 'leader-3')).toBe(true)
  })

  it('corta la racha de liderato al perder el primer puesto', () => {
    // Ana lidera la 1 y la 2; en la 3 la adelanta Bea.
    const scores = [score('ana', [40, 40, 0]), score('bea', [5, 5, 100])]
    const states = evaluate({ scores })

    expect(has(states, 'leader-2')).toBe(true)
    expect(has(states, 'leader-3')).toBe(false)
  })

  /* ────────────────────────────── Goleadas clavadas ────────────────────────────── */

  it('premia clavar el marcador de un partido con muchos goles', () => {
    const matches = [match('m1', 3, 2), match('m2', 4, 3), match('m3', 5, 4)]

    // Cinco goles: pasa del primer escalón pero no de los otros dos.
    let states = evaluate({ predictions: [prediction('m1', 3, 2)], matches })
    expect(has(states, 'exact-5')).toBe(true)
    expect(has(states, 'exact-7')).toBe(false)

    // Siete goles.
    states = evaluate({ predictions: [prediction('m2', 4, 3)], matches })
    expect(has(states, 'exact-7')).toBe(true)
    expect(has(states, 'exact-9')).toBe(false)

    // Nueve goles: se llevan los tres, porque son escalones acumulativos.
    states = evaluate({ predictions: [prediction('m3', 5, 4)], matches })
    expect(has(states, 'exact-5')).toBe(true)
    expect(has(states, 'exact-7')).toBe(true)
    expect(has(states, 'exact-9')).toBe(true)
  })

  it('exige que sea el marcador exacto, no solo el signo', () => {
    const matches = [match('m1', 5, 4)]
    const states = evaluate({ predictions: [prediction('m1', 3, 1)], matches })
    expect(has(states, 'exact-5')).toBe(false)
  })

  it('no cuenta partidos todavía sin resultado', () => {
    const sinJugar: Match = { ...match('m1', 0, 0), homeGoals: null, awayGoals: null }
    const states = evaluate({ predictions: [prediction('m1', 5, 4)], matches: [sinJugar] })
    expect(has(states, 'exact-5')).toBe(false)
  })

  it('deja fuera el límite exacto: cuatro goles no son «más de cuatro»', () => {
    const matches = [match('m1', 2, 2)]
    const states = evaluate({ predictions: [prediction('m1', 2, 2)], matches })
    expect(has(states, 'exact-5')).toBe(false)
  })
})

/* ────────────────────────────── Precisión ────────────────────────────── */

describe('logros de precisión', () => {
  it('exige tres marcadores clavados en la MISMA jornada', () => {
    const conTres = { ...score('ana', [30, 30]) }
    conTres.matchdays[0]!.exactHits = 3
    expect(has(evaluate({ scores: [conTres] }), 'triplete')).toBe(true)

    // Repartidos entre dos jornadas no cuentan.
    const repartidos = { ...score('ana', [30, 30]) }
    repartidos.matchdays[0]!.exactHits = 2
    repartidos.matchdays[1]!.exactHits = 2
    expect(has(evaluate({ scores: [repartidos] }), 'triplete')).toBe(false)
  })

  it('distingue el 0-0 de cualquier otro empate', () => {
    const cero = [match('m1', 0, 0)]
    expect(has(evaluate({ predictions: [prediction('m1', 0, 0)], matches: cero }), 'porteria-cero')).toBe(true)

    const otroEmpate = [match('m1', 1, 1)]
    const states = evaluate({ predictions: [prediction('m1', 1, 1)], matches: otroEmpate })
    expect(has(states, 'porteria-cero')).toBe(false)
    // Pero sigue siendo un empate clavado.
    expect(has(states, 'sangre-fria')).toBe(true)
  })

  it('no da «sangre fría» por clavar un partido con ganador', () => {
    const matches = [match('m1', 2, 1)]
    expect(has(evaluate({ predictions: [prediction('m1', 2, 1)], matches }), 'sangre-fria')).toBe(false)
  })
})

/* ────────────────────────────── Constancia ────────────────────────────── */

describe('logros de constancia', () => {
  const jornadaCompleta = (id: string, kickoff: number, home: number, away: number): Match => ({
    ...match(id, home, away),
    kickoff,
  })

  it('premia apostar la jornada entera antes del primer partido', () => {
    const matches = [jornadaCompleta('m1', 1_000, 1, 0), jornadaCompleta('m2', 2_000, 0, 0)]
    const aTiempo = [
      { ...prediction('m1', 1, 0), updatedAt: 500 },
      { ...prediction('m2', 0, 0), updatedAt: 900 },
    ]
    expect(has(evaluate({ predictions: aTiempo, matches }), 'puntual')).toBe(true)

    // Si una apuesta llega después del primer saque inicial, se pierde.
    const tarde = [
      { ...prediction('m1', 1, 0), updatedAt: 500 },
      { ...prediction('m2', 0, 0), updatedAt: 1_500 },
    ]
    expect(has(evaluate({ predictions: tarde, matches }), 'puntual')).toBe(false)
  })

  it('no da «puntual» si se dejó algún partido sin apostar', () => {
    const matches = [jornadaCompleta('m1', 1_000, 1, 0), jornadaCompleta('m2', 2_000, 0, 0)]
    const incompleta = [{ ...prediction('m1', 1, 0), updatedAt: 500 }]
    expect(has(evaluate({ predictions: incompleta, matches }), 'puntual')).toBe(false)
  })

  it('no da «puntual» por una jornada aún sin terminar', () => {
    const sinAcabar: Match[] = [
      jornadaCompleta('m1', 1_000, 1, 0),
      { ...jornadaCompleta('m2', 2_000, 0, 0), homeGoals: null, awayGoals: null },
    ]
    const apuestas = [
      { ...prediction('m1', 1, 0), updatedAt: 500 },
      { ...prediction('m2', 0, 0), updatedAt: 600 },
    ]
    expect(has(evaluate({ predictions: apuestas, matches: sinAcabar }), 'puntual')).toBe(false)
  })

  it('exige no dejarse ni un partido en ninguna jornada para ser veterano', () => {
    expect(has(evaluate({ scores: [score('ana', [10, 10])] }), 'veterano')).toBe(true)

    const conHueco = { ...score('ana', [10, 10]) }
    conHueco.matchdays[1]!.predicted = 17
    expect(has(evaluate({ scores: [conHueco] }), 'veterano')).toBe(false)
  })

  it('da «muro» solo con la jornada entera acertada de signo', () => {
    const perfecta = { ...score('ana', [30]) }
    perfecta.matchdays[0]!.signHits = 12
    perfecta.matchdays[0]!.exactHits = 6
    expect(has(evaluate({ scores: [perfecta] }), 'muro')).toBe(true)

    const conFallo = { ...score('ana', [30]) }
    conFallo.matchdays[0]!.signHits = 11
    conFallo.matchdays[0]!.exactHits = 6
    expect(has(evaluate({ scores: [conFallo] }), 'muro')).toBe(false)
  })
})

/* ────────────────────────────── Gestas ────────────────────────────── */

describe('logros de gesta', () => {
  it('reconoce recortar veinte puntos al líder', () => {
    // Ana pierde por 30 en la primera y por 5 en la segunda: recorta 25.
    const scores = [score('ana', [5, 40]), score('bea', [35, 15])]
    expect(has(evaluate({ scores }), 'remontada')).toBe(true)
  })

  it('no da remontada si el recorte se queda corto', () => {
    const scores = [score('ana', [20, 25]), score('bea', [30, 30])]
    expect(has(evaluate({ scores }), 'remontada')).toBe(false)
  })

  it('premia ser el mejor de la jornada llegando último', () => {
    // Tras la jornada 1 Ana es la última; en la 2 es la que más puntúa.
    const scores = [score('ana', [1, 50]), score('bea', [30, 5]), score('cai', [20, 5])]
    expect(has(evaluate({ scores }), 'tocado-hundido')).toBe(true)
  })

  it('no lo da si ya llegaba líder a esa jornada', () => {
    const scores = [score('ana', [40, 50]), score('bea', [5, 5])]
    const states = evaluate({ scores })
    expect(has(states, 'tocado-hundido')).toBe(false)
    expect(has(states, 'top-1')).toBe(true)
  })

  it('da «vidente» al acertar goleador o campeón', () => {
    const conGoleador = { ...score('ana', [10]), topScorerHit: true }
    expect(has(evaluate({ scores: [conGoleador] }), 'vidente')).toBe(true)

    const conCampeon = { ...score('ana', [10]), championHit: true }
    expect(has(evaluate({ scores: [conCampeon] }), 'vidente')).toBe(true)

    expect(has(evaluate({ scores: [score('ana', [10])] }), 'vidente')).toBe(false)
  })
})
