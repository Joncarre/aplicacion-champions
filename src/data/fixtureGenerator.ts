import type { Match, Team } from '@/types'
import { madridToUtc } from '@/lib/date'
import { MATCHDAY_WINDOWS } from './calendar'

/**
 * Sorteo automático de un calendario de fase liga.
 *
 * El calendario de verdad está en `fixtures.ts`; esto es la alternativa para
 * cuando el admin sustituye la lista de equipos por otra y necesita unos
 * emparejamientos cualesquiera. Se construyen con el método del círculo: cada
 * equipo juega 8 partidos contra 8 rivales distintos y cada jornada es un
 * emparejamiento perfecto. Es determinista, así que recargar la app no mueve
 * los partidos de sitio.
 */
export function generateFixtures(teams: Team[]): Match[] {
  const ids = teams.map((t) => t.id)
  // El método del círculo requiere un número par de equipos.
  if (ids.length % 2 !== 0) ids.pop()
  if (ids.length < 2) return []

  const rounds = buildRounds(ids, MATCHDAY_WINDOWS.length)
  const oriented = assignHomeAway(rounds)

  return oriented.flatMap((pairs, roundIndex) => {
    const window = MATCHDAY_WINDOWS[roundIndex]
    if (!window) return []
    const matchday = window.matchday
    const kickoffs = buildKickoffSlots(window.days, pairs.length, matchday)

    return pairs.map(([homeTeamId, awayTeamId], i) => ({
      id: `md${matchday}-${String(i + 1).padStart(2, '0')}`,
      matchday,
      homeTeamId,
      awayTeamId,
      kickoff: kickoffs[i] ?? madridToUtc(`${window.days[0] ?? '2026-09-08'}T21:00`),
      homeGoals: null,
      awayGoals: null,
    }))
  })
}

/** Método del círculo: devuelve `roundCount` jornadas sin emparejamientos repetidos. */
function buildRounds(ids: string[], roundCount: number): [string, string][][] {
  const [fixed = '', ...rotating] = ids
  const size = rotating.length
  const rounds: [string, string][][] = []

  for (let round = 0; round < roundCount; round++) {
    const pairs: [string, string][] = []
    const opponent = rotating[round % size]
    if (opponent) pairs.push([fixed, opponent])

    for (let i = 1; i <= (size - 1) / 2; i++) {
      const a = rotating[(round + i) % size]
      const b = rotating[(((round - i) % size) + size) % size]
      if (a && b) pairs.push([a, b])
    }
    rounds.push(pairs)
  }
  return rounds
}

/**
 * Decide quién juega en casa mediante una orientación euleriana.
 *
 * El conjunto de los 144 partidos forma un grafo en el que cada equipo tiene
 * grado 8, que es par, así que admite un recorrido euleriano. Al orientar cada
 * partido en el sentido en el que lo recorre ese camino, todo equipo acaba con
 * exactamente cuatro partidos en casa y cuatro fuera, igual que en el sorteo
 * real de la UEFA.
 */
function assignHomeAway(rounds: [string, string][][]): [string, string][][] {
  const edges: [string, string][] = []
  const edgeIndexByPosition: number[][] = rounds.map((pairs) =>
    pairs.map((pair) => {
      edges.push(pair)
      return edges.length - 1
    }),
  )

  const adjacency = new Map<string, number[]>()
  const link = (team: string, edgeIndex: number) => {
    const list = adjacency.get(team)
    if (list) list.push(edgeIndex)
    else adjacency.set(team, [edgeIndex])
  }
  edges.forEach(([a, b], index) => {
    link(a, index)
    link(b, index)
  })

  const used = new Array<boolean>(edges.length).fill(false)
  const cursor = new Map<string, number>()
  const oriented = new Array<[string, string] | null>(edges.length).fill(null)

  for (const start of [...adjacency.keys()].sort()) {
    const stack: string[] = [start]
    while (stack.length > 0) {
      const team = stack[stack.length - 1]
      if (team === undefined) break

      const list = adjacency.get(team) ?? []
      let pointer = cursor.get(team) ?? 0
      while (pointer < list.length) {
        const candidate = list[pointer]
        if (candidate !== undefined && !used[candidate]) break
        pointer++
      }
      cursor.set(team, pointer)

      const edgeIndex = list[pointer]
      if (edgeIndex === undefined) {
        stack.pop()
        continue
      }

      const edge = edges[edgeIndex]
      if (!edge) {
        stack.pop()
        continue
      }
      used[edgeIndex] = true
      const rival = edge[0] === team ? edge[1] : edge[0]
      oriented[edgeIndex] = [team, rival]
      stack.push(rival)
    }
  }

  return rounds.map((pairs, round) =>
    pairs.map((pair, index): [string, string] => {
      const edgeIndex = edgeIndexByPosition[round]?.[index]
      const result = edgeIndex === undefined ? null : oriented[edgeIndex]
      return result ?? pair
    }),
  )
}

/**
 * Reparte los 18 partidos de una jornada entre los días de su ventana,
 * imitando el reparto real: un tercio a las 18:45 y dos tercios a las 21:00.
 * La última jornada se juega entera en simultáneo a las 21:00.
 */
function buildKickoffSlots(days: string[], matchCount: number, seed: number): number[] {
  const slots: number[] = []

  if (days.length === 1) {
    const day = days[0] ?? ''
    for (let i = 0; i < matchCount; i++) slots.push(madridToUtc(`${day}T21:00`))
    return slots
  }

  const perDay = Math.ceil(matchCount / days.length)
  const earlyPerDay = Math.floor(perDay / 3)

  for (const day of days) {
    for (let i = 0; i < perDay && slots.length < matchCount; i++) {
      const time = i < earlyPerDay ? '18:45' : '21:00'
      slots.push(madridToUtc(`${day}T${time}`))
    }
  }

  return shuffle(slots, seed)
}

/** Barajado de Fisher-Yates con PRNG semillado, para que el orden sea reproducible. */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  const random = mulberry32(seed * 2654435761)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const a = out[i]
    const b = out[j]
    if (a !== undefined && b !== undefined) {
      out[i] = b
      out[j] = a
    }
  }
  return out
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
