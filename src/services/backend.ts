import type { Extras, Match, Prediction, Team, TournamentConfig, User, UserScore } from '@/types'

/**
 * Contrato de persistencia de la porra.
 *
 * Hay dos implementaciones intercambiables: Firestore (producción) y un almacén
 * sobre `localStorage` (modo demo). Todo lo que hay por encima —contextos,
 * páginas, lógica— habla solo con esta interfaz, así que la app entera se puede
 * desarrollar y probar sin credenciales de Firebase.
 */
export interface Backend {
  readonly kind: 'firestore' | 'demo'

  /* Usuarios */
  listUsers(): Promise<User[]>
  getUser(id: string): Promise<User | null>
  /** Crea el usuario o falla si el nickname ya está cogido. */
  createUser(user: User): Promise<void>
  updateUser(id: string, patch: Partial<User>): Promise<void>
  deleteUser(id: string): Promise<void>

  /* Equipos */
  listTeams(): Promise<Team[]>
  replaceTeams(teams: Team[]): Promise<void>

  /* Partidos */
  listMatches(): Promise<Match[]>
  replaceMatches(matches: Match[]): Promise<void>
  updateMatch(id: string, patch: Partial<Match>): Promise<void>

  /* Apuestas */
  listPredictions(): Promise<Prediction[]>
  listPredictionsByUser(userId: string): Promise<Prediction[]>
  savePredictions(predictions: Prediction[]): Promise<void>
  deletePrediction(id: string): Promise<void>

  /* Goleador y campeón */
  listExtras(): Promise<Extras[]>
  getExtras(userId: string): Promise<Extras | null>
  saveExtras(extras: Extras): Promise<void>

  /* Puntuaciones ya calculadas */
  listScores(): Promise<UserScore[]>
  replaceScores(scores: UserScore[]): Promise<void>

  /* Configuración del torneo */
  getConfig(): Promise<TournamentConfig>
  saveConfig(patch: Partial<TournamentConfig>): Promise<void>
}

export const DEFAULT_CONFIG: TournamentConfig = {
  actualTopScorer: null,
  actualChampion: null,
  currentMatchdayOverride: null,
  entryFee: 10,
}

/** Error de negocio que la interfaz puede mostrar tal cual al usuario. */
export class BackendError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackendError'
  }
}

const env = import.meta.env

const hasFirebaseConfig = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID)
const demoRequested = String(env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'

/**
 * Se usa el modo demo si se pide explícitamente o si aún no hay credenciales
 * de Firebase, de modo que la app nunca arranca rota.
 */
export const useDemoBackend = demoRequested || !hasFirebaseConfig

let instance: Backend | null = null

/** Devuelve el backend activo, cargando solo el módulo que hace falta. */
export async function getBackend(): Promise<Backend> {
  if (instance) return instance
  if (useDemoBackend) {
    const { createDemoBackend } = await import('./demoBackend')
    instance = createDemoBackend()
  } else {
    const { createFirestoreBackend } = await import('./firestoreBackend')
    instance = createFirestoreBackend()
  }
  return instance
}
