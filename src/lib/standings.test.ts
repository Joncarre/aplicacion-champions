import { describe, expect, it } from 'vitest'
import type { Extras, Match, Prediction, PublicUser, Team, TournamentConfig } from '@/types'
import { buildChampionsStandings, buildEvolution, buildInternalStandings, computeUserScore } from './standings'

const team = (id: string, name = id): Team => ({
  id,
  name,
  shortName: id.slice(0, 3).toUpperCase(),
  league: 'Liga',
  country: 'País',
  color: '#ffffff',
})

const TEAMS = [team('a', 'Alfa'), team('b', 'Bravo'), team('c', 'Charlie'), team('d', 'Delta')]

const match = (
  id: string,
  matchday: number,
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number | null = null,
  awayGoals: number | null = null,
): Match => ({ id, matchday, homeTeamId, awayTeamId, kickoff: 0, homeGoals, awayGoals })

const prediction = (
  userId: string,
  matchId: string,
  matchday: number,
  homeGoals: number,
  awayGoals: number,
): Prediction => ({ id: userId + '__' + matchId, userId, matchId, matchday, homeGoals, awayGoals, updatedAt: 0 })

const user = (id: string): PublicUser => ({
  id,
  nickname: id,
  nombre: id,
  apellidos: 'Apellido',
  photo: null,
  isAdmin: false,
  hasPaid: true,
  createdAt: 0,
})

const CONFIG: TournamentConfig = {
  actualTopScorer: null,
  actualChampion: null,
  currentMatchdayOverride: null,
  entryFee: 10,
}

describe('buildChampionsStandings', () => {
  const matches = [
    match('m1', 1, 'a', 'b', 3, 1), // gana Alfa
    match('m2', 1, 'c', 'd', 2, 2), // empate
    match('m3', 2, 'a', 'c', 0, 1), // gana Charlie
    match('m4', 2, 'b', 'd', 1, 0), // gana Bravo
    match('m5', 3, 'a', 'd', null, null), // sin resultado, no cuenta
  ]
  const table = buildChampionsStandings(TEAMS, matches)
  const row = (id: string) => table.find((r) => r.team.id === id)

  it('ignora los partidos sin resultado', () => {
    expect(row('a')?.played).toBe(2)
    expect(row('d')?.played).toBe(2)
  })

  it('reparte 3 puntos por victoria y 1 por empate', () => {
    expect(row('a')?.points).toBe(3)
    expect(row('c')?.points).toBe(4)
    expect(row('b')?.points).toBe(3)
    expect(row('d')?.points).toBe(1)
  })

  it('cuenta bien ganados, empatados y perdidos', () => {
    expect(row('c')).toMatchObject({ won: 1, drawn: 1, lost: 0 })
    expect(row('d')).toMatchObject({ won: 0, drawn: 1, lost: 1 })
  })

  it('acumula goles a favor, en contra y diferencia', () => {
    expect(row('a')).toMatchObject({ goalsFor: 3, goalsAgainst: 2, goalDiff: 1 })
    expect(row('b')).toMatchObject({ goalsFor: 2, goalsAgainst: 3, goalDiff: -1 })
  })

  it('ordena por puntos y luego por diferencia de goles', () => {
    expect(table.map((r) => r.team.id)).toEqual(['c', 'a', 'b', 'd'])
    expect(table.map((r) => r.position)).toEqual([1, 2, 3, 4])
  })

  it('incluye a los equipos que aún no han jugado', () => {
    const vacia = buildChampionsStandings(TEAMS, [])
    expect(vacia).toHaveLength(4)
    expect(vacia.every((r) => r.played === 0 && r.points === 0)).toBe(true)
  })
})

describe('computeUserScore', () => {
  const matches = [
    match('m1', 1, 'a', 'b', 2, 1),
    match('m2', 1, 'c', 'd', 0, 0),
    match('m3', 2, 'a', 'c', 1, 3),
    match('m4', 2, 'b', 'd', null, null),
  ]

  it('separa aciertos de signo y de marcador exacto', () => {
    const score = computeUserScore({
      userId: 'u',
      predictions: [
        prediction('u', 'm1', 1, 2, 1), // exacto -> 3
        prediction('u', 'm2', 1, 1, 1), // signo  -> 1
        prediction('u', 'm3', 2, 2, 0), // fallo  -> 0
      ],
      matches,
      extras: undefined,
      config: CONFIG,
    })

    expect(score.exactHits).toBe(1)
    expect(score.signHits).toBe(1)
    expect(score.totalPoints).toBe(4)
    // La tabla tiene que cuadrar: puntos = 1 x signos + 3 x exactos.
    expect(score.matchPoints).toBe(score.signHits * 1 + score.exactHits * 3)
  })

  it('desglosa por jornada y solo cuenta los partidos ya resueltos', () => {
    const score = computeUserScore({
      userId: 'u',
      predictions: [prediction('u', 'm1', 1, 2, 1)],
      matches,
      extras: undefined,
      config: CONFIG,
    })
    const j1 = score.matchdays.find((m) => m.matchday === 1)
    const j2 = score.matchdays.find((m) => m.matchday === 2)

    expect(j1).toMatchObject({ points: 3, resolved: 2, predicted: 1 })
    expect(j2).toMatchObject({ points: 0, resolved: 1, predicted: 0 })
  })

  it('inicializa las 8 jornadas aunque no haya partidos cargados', () => {
    const score = computeUserScore({ userId: 'u', predictions: [], matches: [], extras: undefined, config: CONFIG })
    expect(score.matchdays.map((m) => m.matchday)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('suma los puntos de goleador y campeón', () => {
    const extras: Extras = { userId: 'u', topScorer: 'Haaland', champion: 'Alfa', updatedAt: 0 }
    const score = computeUserScore({
      userId: 'u',
      predictions: [prediction('u', 'm1', 1, 2, 1)],
      matches,
      extras,
      config: { ...CONFIG, actualTopScorer: 'Erling Haaland', actualChampion: 'Alfa' },
    })
    expect(score.extraPoints).toBe(75)
    expect(score.totalPoints).toBe(78)
  })
})

describe('buildInternalStandings', () => {
  const matches = [match('m1', 1, 'a', 'b', 2, 1), match('m2', 1, 'c', 'd', 0, 0)]
  const users = [user('ana'), user('bea'), user('ceo')]
  const extras: Extras[] = []

  it('ordena por puntos totales', () => {
    const table = buildInternalStandings({
      users,
      predictions: [
        prediction('ana', 'm1', 1, 1, 0), // signo  -> 1
        prediction('bea', 'm1', 1, 2, 1), // exacto -> 3
        prediction('bea', 'm2', 1, 0, 0), // exacto -> 3
      ],
      matches,
      extras,
      config: CONFIG,
    })
    expect(table.map((r) => r.user.id)).toEqual(['bea', 'ana', 'ceo'])
    expect(table.map((r) => r.totalPoints)).toEqual([6, 1, 0])
    expect(table.map((r) => r.position)).toEqual([1, 2, 3])
  })

  it('desempata a favor de quien tiene más marcadores exactos', () => {
    const table = buildInternalStandings({
      users: [user('ana'), user('bea')],
      predictions: [
        prediction('ana', 'm1', 1, 2, 1), // exacto -> 3
        prediction('bea', 'm1', 1, 3, 0), // signo  -> 1
        prediction('bea', 'm3', 1, 1, 1), // signo  -> 1
      ],
      matches: [...matches, match('m3', 1, 'a', 'c', 2, 2)],
      extras,
      config: CONFIG,
    })
    // Ambas tienen 3 puntos; gana Ana por marcador exacto.
    expect(table.map((r) => [r.user.id, r.totalPoints])).toEqual([
      ['ana', 3],
      ['bea', 2],
    ])
  })

  it('incluye a los participantes que aún no han apostado', () => {
    const table = buildInternalStandings({ users, predictions: [], matches, extras, config: CONFIG })
    expect(table).toHaveLength(3)
    expect(table.every((r) => r.totalPoints === 0)).toBe(true)
  })
})

describe('buildEvolution', () => {
  const matches = [
    match('m1', 1, 'a', 'b', 2, 1),
    match('m2', 1, 'c', 'd', 0, 0),
    match('m3', 2, 'a', 'c', 1, 3),
  ]
  const scores = [
    computeUserScore({
      userId: 'ana',
      predictions: [prediction('ana', 'm1', 1, 1, 0), prediction('ana', 'm3', 2, 1, 3)],
      matches,
      extras: undefined,
      config: CONFIG,
    }),
    computeUserScore({
      userId: 'bea',
      predictions: [prediction('bea', 'm1', 1, 2, 1), prediction('bea', 'm2', 1, 0, 0)],
      matches,
      extras: undefined,
      config: CONFIG,
    }),
  ]

  it('acumula puntos jornada a jornada', () => {
    const ana = buildEvolution('ana', scores)
    expect(ana[0]).toMatchObject({ matchday: 1, points: 1, cumulative: 1 })
    expect(ana[1]).toMatchObject({ matchday: 2, points: 3, cumulative: 4 })
  })

  it('calcula el techo alcanzable con los partidos ya resueltos', () => {
    const ana = buildEvolution('ana', scores)
    expect(ana[0]?.maxCumulative).toBe(6) // 2 partidos resueltos x 3
    expect(ana[1]?.maxCumulative).toBe(9) // + 1 partido resuelto x 3
  })

  it('mide la distancia con el líder en cada momento', () => {
    const ana = buildEvolution('ana', scores)
    expect(ana[0]).toMatchObject({ leaderCumulative: 6, gapToLeader: -5 })
    // En la jornada 2 Bea no apostó, así que Ana recorta.
    expect(ana[1]).toMatchObject({ leaderCumulative: 6, gapToLeader: -2 })

    const bea = buildEvolution('bea', scores)
    expect(bea.every((p) => p.gapToLeader === 0)).toBe(true)
  })

  it('marca como no jugadas las jornadas sin resultados', () => {
    const ana = buildEvolution('ana', scores)
    expect(ana.filter((p) => p.played).map((p) => p.matchday)).toEqual([1, 2])
  })

  it('devuelve vacío si el usuario no está en la lista', () => {
    expect(buildEvolution('nadie', scores)).toEqual([])
  })
})
