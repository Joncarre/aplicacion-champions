import type { UserScore } from '@/types'
import { computeUserScore } from '@/lib/standings'
import { getBackend } from './backend'

/**
 * Recalcula la puntuación de todos los participantes y la guarda.
 *
 * Se lanza cada vez que el admin toca un resultado o fija el goleador o el
 * campeón. Guardar el resultado en `scores` evita que cada usuario tenga que
 * descargarse las apuestas de todos los demás solo para pintar la clasificación.
 */
export async function recomputeScores(): Promise<UserScore[]> {
  const backend = await getBackend()

  const [users, matches, predictions, extras, config] = await Promise.all([
    backend.listUsers(),
    backend.listMatches(),
    backend.listPredictions(),
    backend.listExtras(),
    backend.getConfig(),
  ])

  const predictionsByUser = new Map<string, typeof predictions>()
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
      matches,
      extras: extrasByUser.get(user.id),
      config,
    }),
  )

  await backend.replaceScores(scores)
  return scores
}
