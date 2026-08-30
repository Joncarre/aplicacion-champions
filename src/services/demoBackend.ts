import type { Extras, Match, Prediction, Team, TournamentConfig, User, UserScore } from '@/types'
import { DEFAULT_TEAMS } from '@/data/teams'
import { buildOfficialMatches } from '@/data/fixtures'
import { TOTAL_MATCHDAYS } from '@/data/calendar'
import { hashPassword, randomSalt } from '@/lib/crypto'
import { now } from '@/lib/clock'
import { madridToUtc } from '@/lib/date'
import { computeUserScore } from '@/lib/standings'
import { BackendError, DEFAULT_CONFIG, type Backend } from './backend'

/**
 * Backend de desarrollo sobre `localStorage`.
 *
 * Reproduce el mismo contrato que Firestore para poder construir y probar toda
 * la porra sin conexión ni credenciales. Se siembra con los 36 equipos, el
 * calendario completo y un puñado de participantes ficticios; los resultados
 * solo se rellenan hasta la fecha que marque el reloj, así que la app se ve
 * exactamente como se vería ese día.
 */

// Al subir esta versión, los navegadores que tuvieran datos viejos se
// resiembran solos.
const PREFIX = 'porra-champions:demo:v6'
const key = (collection: string) => `${PREFIX}:${collection}`

const DEMO_PASSWORD = 'champions'

interface DemoProfile {
  nickname: string
  nombre: string
  apellidos: string
  isAdmin: boolean
  hasPaid: boolean
  /** Cuánto acierta, de 0 a 1. Solo sirve para que los datos de prueba varíen. */
  skill: number
  /**
   * Acierto al final de la fase liga. Si se indica, el nivel se interpola
   * jornada a jornada entre `skill` y este valor, lo que permite dibujar
   * arranques fuertes que se desinflan o remontadas.
   */
  skillEnd?: number
}

/**
 * Nivel de acierto en una jornada concreta, según la forma del participante.
 *
 * La interpolación no es lineal sino con raíz cuadrada, así que el cambio se
 * concentra al principio: quien arranca fuerte se desinfla enseguida en vez de
 * ir cayendo poco a poco. Es lo que hace que un buen comienzo no garantice
 * acabar arriba, que es justo lo que tiene gracia de una porra.
 */
function skillAt(profile: DemoProfile, matchday: number): number {
  if (profile.skillEnd === undefined) return profile.skill
  const linear = Math.min(1, Math.max(0, (matchday - 1) / (TOTAL_MATCHDAYS - 1)))
  const progress = Math.sqrt(linear)
  return profile.skill + (profile.skillEnd - profile.skill) * progress
}

const DEMO_PROFILES: DemoProfile[] = [
  { nickname: 'joncarre', nombre: 'Jonathan', apellidos: 'Carrero', isAdmin: true, hasPaid: true, skill: 0.55 },
  { nickname: 'lucia', nombre: 'Lucía', apellidos: 'Serrano Gil', isAdmin: false, hasPaid: true, skill: 0.98, skillEnd: 0.02 },
  { nickname: 'dani', nombre: 'Daniel', apellidos: 'Ortega Ruiz', isAdmin: false, hasPaid: true, skill: 0.5 },
  { nickname: 'marta', nombre: 'Marta', apellidos: 'Iglesias Nieto', isAdmin: false, hasPaid: true, skill: 0.62 },
  { nickname: 'pablo', nombre: 'Pablo', apellidos: 'Ferrer Navas', isAdmin: false, hasPaid: true, skill: 0.4 },
  { nickname: 'noa', nombre: 'Noa', apellidos: 'Requena Prat', isAdmin: false, hasPaid: false, skill: 0.45 },
  { nickname: 'raquel', nombre: 'Raquel', apellidos: 'Antón Vega', isAdmin: false, hasPaid: true, skill: 0.72 },
  { nickname: 'sergio', nombre: 'Sergio', apellidos: 'Bermejo Lara', isAdmin: false, hasPaid: true, skill: 0.58 },
  { nickname: 'elena', nombre: 'Elena', apellidos: 'Vidal Campos', isAdmin: false, hasPaid: true, skill: 0.34 },
  { nickname: 'javi', nombre: 'Javier', apellidos: 'Mendoza Arias', isAdmin: false, hasPaid: true, skill: 0.5 },
]

/** Nicknames de prueba, para que los tests no dependan de una lista escrita a mano. */
export const DEMO_NICKNAMES = DEMO_PROFILES.map((profile) => profile.nickname)

/** Los que aún no han pagado, que es lo que el admin tiene que marcar. */
export const DEMO_UNPAID = DEMO_PROFILES.filter((profile) => !profile.hasPaid).map((p) => p.nickname)

function read<T>(collection: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(collection))
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write<T>(collection: string, value: T): void {
  try {
    localStorage.setItem(key(collection), JSON.stringify(value))
  } catch {
    // Sin espacio en localStorage: en modo demo se puede ignorar sin más.
  }
}

/** Pequeño retardo para que los estados de carga de la interfaz se noten de verdad. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 60))

export function createDemoBackend(): Backend {
  const ready = seed()

  const guard = async <T>(work: () => T): Promise<T> => {
    await ready
    await tick()
    return work()
  }

  return {
    kind: 'demo',

    listUsers: () => guard(() => read<User[]>('users', [])),

    getUser: (id) => guard(() => read<User[]>('users', []).find((u) => u.id === id) ?? null),

    createUser: (user) =>
      guard(() => {
        const users = read<User[]>('users', [])
        if (users.some((u) => u.id === user.id)) {
          throw new BackendError('Ese nickname ya está cogido')
        }
        write('users', [...users, user])
      }),

    updateUser: (id, patch) =>
      guard(() => {
        const users = read<User[]>('users', [])
        write(
          'users',
          users.map((u) => (u.id === id ? { ...u, ...patch, id: u.id } : u)),
        )
      }),

    deleteUser: (id) =>
      guard(() => {
        write<User[]>('users', read<User[]>('users', []).filter((u) => u.id !== id))
        write<Prediction[]>('predictions', read<Prediction[]>('predictions', []).filter((p) => p.userId !== id))
        write<Extras[]>('extras', read<Extras[]>('extras', []).filter((e) => e.userId !== id))
        write<UserScore[]>('scores', read<UserScore[]>('scores', []).filter((s) => s.userId !== id))
      }),

    listTeams: () => guard(() => read<Team[]>('teams', [])),

    replaceTeams: (teams) => guard(() => write('teams', teams)),

    listMatches: () => guard(() => read<Match[]>('matches', [])),

    replaceMatches: (matches) => guard(() => write('matches', matches)),

    updateMatch: (id, patch) =>
      guard(() => {
        const matches = read<Match[]>('matches', [])
        write(
          'matches',
          matches.map((m) => (m.id === id ? { ...m, ...patch, id: m.id } : m)),
        )
      }),

    listPredictions: () => guard(() => read<Prediction[]>('predictions', [])),

    listPredictionsByUser: (userId) =>
      guard(() => read<Prediction[]>('predictions', []).filter((p) => p.userId === userId)),

    savePredictions: (predictions) =>
      guard(() => {
        const stored = read<Prediction[]>('predictions', [])
        const byId = new Map(stored.map((p) => [p.id, p]))
        for (const prediction of predictions) byId.set(prediction.id, prediction)
        write('predictions', [...byId.values()])
      }),

    deletePrediction: (id) =>
      guard(() => write<Prediction[]>('predictions', read<Prediction[]>('predictions', []).filter((p) => p.id !== id))),

    listExtras: () => guard(() => read<Extras[]>('extras', [])),

    getExtras: (userId) => guard(() => read<Extras[]>('extras', []).find((e) => e.userId === userId) ?? null),

    saveExtras: (extras) =>
      guard(() => {
        const stored = read<Extras[]>('extras', []).filter((e) => e.userId !== extras.userId)
        write('extras', [...stored, extras])
      }),

    listScores: () => guard(() => read<UserScore[]>('scores', [])),

    replaceScores: (scores) => guard(() => write('scores', scores)),

    getConfig: () => guard(() => ({ ...DEFAULT_CONFIG, ...read<Partial<TournamentConfig>>('config', {}) })),

    saveConfig: (patch) =>
      guard(() => {
        const current = { ...DEFAULT_CONFIG, ...read<Partial<TournamentConfig>>('config', {}) }
        write('config', { ...current, ...patch })
      }),
  }
}

/* ────────────────────────────── Datos de prueba ────────────────────────────── */

async function seed(): Promise<void> {
  if (localStorage.getItem(key('seeded')) === '1') return

  const teams = DEFAULT_TEAMS
  const matches = buildOfficialMatches()
  const random = mulberry32(20262027)

  // Solo se rellenan los resultados de los partidos que ya se han jugado.
  const today = now()
  const played = matches.map((match) => {
    if (match.kickoff + 2 * 60 * 60 * 1000 > today) return match
    return { ...match, homeGoals: randomGoals(random), awayGoals: randomGoals(random) }
  })

  const users: User[] = []
  for (const profile of DEMO_PROFILES) {
    const salt = randomSalt()
    users.push({
      id: profile.nickname,
      nickname: profile.nickname,
      nombre: profile.nombre,
      apellidos: profile.apellidos,
      passwordHash: await hashPassword(DEMO_PASSWORD, salt),
      passwordSalt: salt,
      photo: null,
      isAdmin: profile.isAdmin,
      hasPaid: profile.hasPaid,
      createdAt: madridToUtc('2026-08-20T19:30') + users.length * 3_600_000,
    })
  }

  const predictions: Prediction[] = []
  const extras: Extras[] = []

  for (const profile of DEMO_PROFILES) {
    if (!profile.hasPaid) continue

    for (const match of played) {
      // Se apuesta a todo lo ya jugado y a la jornada que esté abierta ahora.
      const isPast = match.homeGoals !== null
      if (!isPast && match.kickoff > today + 21 * 24 * 3_600_000) continue

      const [homeGoals, awayGoals] = isPast
        ? guessFrom(match.homeGoals ?? 0, match.awayGoals ?? 0, skillAt(profile, match.matchday), random)
        : [randomGoals(random), randomGoals(random)]

      predictions.push({
        id: `${profile.nickname}__${match.id}`,
        userId: profile.nickname,
        matchId: match.id,
        matchday: match.matchday,
        homeGoals,
        awayGoals,
        updatedAt: match.kickoff - 86_400_000,
      })
    }

    extras.push({
      userId: profile.nickname,
      topScorer: pick(['Kylian Mbappé', 'Erling Haaland', 'Vinícius Júnior', 'Harry Kane', 'Lamine Yamal'], random),
      champion: pick(teams, random).name,
      updatedAt: madridToUtc('2026-09-06T20:00'),
    })
  }

  // Las puntuaciones se dejan ya calculadas: si no, la clasificación y las
  // gráficas del perfil aparecerían a cero hasta que el admin recalculase.
  const predictionsByUser = new Map<string, Prediction[]>()
  for (const prediction of predictions) {
    const bucket = predictionsByUser.get(prediction.userId)
    if (bucket) bucket.push(prediction)
    else predictionsByUser.set(prediction.userId, [prediction])
  }
  const extrasByUser = new Map(extras.map((entry) => [entry.userId, entry]))

  const scores = users.map((user) =>
    computeUserScore({
      userId: user.id,
      predictions: predictionsByUser.get(user.id) ?? [],
      matches: played,
      extras: extrasByUser.get(user.id),
      config: DEFAULT_CONFIG,
    }),
  )

  write('teams', teams)
  write('matches', played)
  write('users', users)
  write('predictions', predictions)
  write('extras', extras)
  write('config', DEFAULT_CONFIG)
  write('scores', scores)
  localStorage.setItem(key('seeded'), '1')
}

/** Marcador plausible: casi siempre entre 0 y 3 goles. */
function randomGoals(random: () => number): number {
  const roll = random()
  if (roll < 0.24) return 0
  if (roll < 0.55) return 1
  if (roll < 0.79) return 2
  if (roll < 0.93) return 3
  return 4
}

/** Apuesta que acierta más o menos según la habilidad del participante ficticio. */
function guessFrom(
  homeGoals: number,
  awayGoals: number,
  skill: number,
  random: () => number,
): [number, number] {
  if (random() < skill * 0.45) return [homeGoals, awayGoals]
  if (random() < skill) {
    // Mismo signo, marcador distinto.
    const shift = random() < 0.5 ? 1 : -1
    if (homeGoals === awayGoals) return [homeGoals + 1, awayGoals + 1]
    return homeGoals > awayGoals
      ? [Math.max(homeGoals + shift, awayGoals + 1), awayGoals]
      : [homeGoals, Math.max(awayGoals + shift, homeGoals + 1)]
  }
  return [randomGoals(random), randomGoals(random)]
}

function pick<T>(items: T[], random: () => number): T {
  const index = Math.floor(random() * items.length)
  return items[index] ?? (items[0] as T)
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

/**
 * Borra el almacén de demostración y lo vuelve a sembrar desde cero.
 * Útil para probar la app con datos limpios y para los tests.
 */
export async function resetDemoData(): Promise<void> {
  for (const stored of Object.keys(localStorage)) {
    if (stored.startsWith(PREFIX)) localStorage.removeItem(stored)
  }
  await seed()
}

export const DEMO_CREDENTIALS = { nickname: 'joncarre', password: DEMO_PASSWORD }
