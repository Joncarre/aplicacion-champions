import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import type { Extras, Match, Prediction, Team, TournamentConfig, User, UserScore } from '@/types'
import { BackendError, DEFAULT_CONFIG, type Backend } from './backend'
import { getDb } from './firebase'

/**
 * Implementación sobre Firestore.
 *
 * Estructura de colecciones:
 *   users/{nickname}              perfil y credenciales
 *   teams/{teamId}                los 36 participantes de la fase liga
 *   matches/{matchId}             calendario y resultados oficiales
 *   predictions/{userId__matchId} apuestas
 *   extras/{userId}               máximo goleador y campeón
 *   scores/{userId}               puntuación ya calculada, para la clasificación
 *   config/tournament             ajustes del torneo
 */

const COLLECTIONS = {
  users: 'users',
  teams: 'teams',
  matches: 'matches',
  predictions: 'predictions',
  extras: 'extras',
  scores: 'scores',
  config: 'config',
} as const

const CONFIG_DOC = 'tournament'

/** Firestore rechaza `undefined`; se limpia antes de escribir. */
function clean<T extends object>(value: T): DocumentData {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))
}

/** Los lotes de Firestore admiten 500 operaciones; se trocea por si acaso. */
async function commitInChunks(operations: ((batch: ReturnType<typeof writeBatch>) => void)[]): Promise<void> {
  const db = getDb()
  const size = 400
  for (let i = 0; i < operations.length; i += size) {
    const batch = writeBatch(db)
    for (const apply of operations.slice(i, i + size)) apply(batch)
    await batch.commit()
  }
}

async function listAll<T>(name: string): Promise<T[]> {
  const snapshot = await getDocs(collection(getDb(), name))
  return snapshot.docs.map((d) => d.data() as T)
}

export function createFirestoreBackend(): Backend {
  const db = getDb()
  const ref = (name: string, id: string) => doc(db, name, id)

  /** Sustituye el contenido completo de una colección respetando los ids nuevos. */
  async function replaceCollection<T extends { id: string }>(name: string, items: T[]): Promise<void> {
    const existing = await getDocs(collection(db, name))
    const keep = new Set(items.map((item) => item.id))
    const operations: ((batch: ReturnType<typeof writeBatch>) => void)[] = []

    for (const snapshot of existing.docs) {
      if (!keep.has(snapshot.id)) operations.push((batch) => batch.delete(snapshot.ref))
    }
    for (const item of items) {
      operations.push((batch) => batch.set(ref(name, item.id), clean(item)))
    }
    await commitInChunks(operations)
  }

  return {
    kind: 'firestore',

    listUsers: () => listAll<User>(COLLECTIONS.users),

    async getUser(id) {
      const snapshot = await getDoc(ref(COLLECTIONS.users, id))
      return snapshot.exists() ? (snapshot.data() as User) : null
    },

    async createUser(user) {
      // La transacción garantiza que dos registros simultáneos no se pisen el nickname.
      await runTransaction(db, async (transaction) => {
        const target = ref(COLLECTIONS.users, user.id)
        const snapshot = await transaction.get(target)
        if (snapshot.exists()) throw new BackendError('Ese nickname ya está cogido')
        transaction.set(target, clean(user))
      })
    },

    async updateUser(id, patch) {
      const { id: _ignored, ...rest } = patch
      await updateDoc(ref(COLLECTIONS.users, id), clean(rest))
    },

    async deleteUser(id) {
      const predictions = await getDocs(
        query(collection(db, COLLECTIONS.predictions), where('userId', '==', id)),
      )
      const operations: ((batch: ReturnType<typeof writeBatch>) => void)[] = [
        (batch) => batch.delete(ref(COLLECTIONS.users, id)),
        (batch) => batch.delete(ref(COLLECTIONS.extras, id)),
        (batch) => batch.delete(ref(COLLECTIONS.scores, id)),
        ...predictions.docs.map((snapshot) => (batch: ReturnType<typeof writeBatch>) => batch.delete(snapshot.ref)),
      ]
      await commitInChunks(operations)
    },

    listTeams: () => listAll<Team>(COLLECTIONS.teams),

    replaceTeams: (teams) => replaceCollection(COLLECTIONS.teams, teams),

    listMatches: () => listAll<Match>(COLLECTIONS.matches),

    replaceMatches: (matches) => replaceCollection(COLLECTIONS.matches, matches),

    async updateMatch(id, patch) {
      const { id: _ignored, ...rest } = patch
      await updateDoc(ref(COLLECTIONS.matches, id), clean(rest))
    },

    listPredictions: () => listAll<Prediction>(COLLECTIONS.predictions),

    async listPredictionsByUser(userId) {
      const snapshot = await getDocs(
        query(collection(db, COLLECTIONS.predictions), where('userId', '==', userId)),
      )
      return snapshot.docs.map((d) => d.data() as Prediction)
    },

    async savePredictions(predictions) {
      await commitInChunks(
        predictions.map((prediction) => (batch) => batch.set(ref(COLLECTIONS.predictions, prediction.id), clean(prediction))),
      )
    },

    deletePrediction: (id) => deleteDoc(ref(COLLECTIONS.predictions, id)),

    listExtras: () => listAll<Extras>(COLLECTIONS.extras),

    async getExtras(userId) {
      const snapshot = await getDoc(ref(COLLECTIONS.extras, userId))
      return snapshot.exists() ? (snapshot.data() as Extras) : null
    },

    saveExtras: (extras) => setDoc(ref(COLLECTIONS.extras, extras.userId), clean(extras)),

    listScores: () => listAll<UserScore>(COLLECTIONS.scores),

    replaceScores: (scores) =>
      replaceCollection(
        COLLECTIONS.scores,
        scores.map((score) => ({ ...score, id: score.userId })),
      ),

    async getConfig() {
      const snapshot = await getDoc(ref(COLLECTIONS.config, CONFIG_DOC))
      return snapshot.exists()
        ? { ...DEFAULT_CONFIG, ...(snapshot.data() as Partial<TournamentConfig>) }
        : DEFAULT_CONFIG
    },

    saveConfig: (patch) => setDoc(ref(COLLECTIONS.config, CONFIG_DOC), clean(patch), { merge: true }),
  }
}
