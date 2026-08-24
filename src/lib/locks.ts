import type { Match } from '@/types'
import { EXTRAS_DEADLINE, TOTAL_MATCHDAYS } from '@/data/calendar'
import { isResolved } from './scoring'

/**
 * Reglas de bloqueo de la porra. Hay tres candados encadenados:
 *
 * 1. Hasta que el admin no marca al usuario como pagado, no puede apostar nada.
 * 2. Cada partido se cierra en el momento de su saque inicial.
 * 3. Solo está abierta la jornada en curso; las futuras se ven pero no se tocan.
 */

/** Un partido acepta apuestas mientras no haya empezado. */
export function isMatchOpen(match: Match, now: number = Date.now()): boolean {
  return now < match.kickoff && !isResolved(match)
}

export function hasKickedOff(match: Match, now: number = Date.now()): boolean {
  return now >= match.kickoff
}

/**
 * Jornada en curso: la primera que aún tiene algún partido sin empezar.
 * En cuanto arranca el último partido de una jornada, pasa a estarlo la
 * siguiente, así que durante los parones el usuario ya puede ir apostando.
 */
export function resolveCurrentMatchday(
  matches: Match[],
  now: number = Date.now(),
  override: number | null = null,
): number {
  if (override && override >= 1 && override <= TOTAL_MATCHDAYS) return override

  const pending = matches
    .filter((match) => now < match.kickoff)
    .reduce<number | null>((min, match) => (min === null || match.matchday < min ? match.matchday : min), null)

  // Si ya han empezado todos los partidos, la última jornada es la vigente.
  return pending ?? TOTAL_MATCHDAYS
}

/** Solo la jornada en curso admite cambios. */
export function isMatchdayEditable(matchday: number, currentMatchday: number): boolean {
  return matchday === currentMatchday
}

export type LockReason = 'unpaid' | 'future-matchday' | 'past-matchday' | 'kicked-off' | null

/** Motivo por el que un partido concreto no admite apuesta, o `null` si sí la admite. */
export function lockReasonFor(
  match: Match,
  options: { hasPaid: boolean; currentMatchday: number; now?: number },
): LockReason {
  const now = options.now ?? Date.now()
  if (!options.hasPaid) return 'unpaid'
  if (match.matchday > options.currentMatchday) return 'future-matchday'
  if (match.matchday < options.currentMatchday) return 'past-matchday'
  if (hasKickedOff(match, now)) return 'kicked-off'
  return null
}

export const LOCK_MESSAGES: Record<NonNullable<LockReason>, string> = {
  unpaid: 'Tienes que pagar la porra para poder apostar',
  'future-matchday': 'Esta jornada se abrirá cuando termine la anterior',
  'past-matchday': 'Esta jornada ya está cerrada',
  'kicked-off': 'El partido ya ha empezado',
}

/** Las apuestas de máximo goleador y campeón se cierran al arrancar la competición. */
export function areExtrasLocked(now: number = Date.now()): boolean {
  return now >= EXTRAS_DEADLINE
}

export { EXTRAS_DEADLINE }
