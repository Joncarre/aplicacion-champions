import { madridToUtc } from './date'

/**
 * Reloj de la aplicación.
 *
 * Todo lo que decide bloqueos (jornada en curso, partidos cerrados, fecha
 * límite de goleador y campeón) pregunta aquí en vez de llamar a `Date.now()`
 * directamente. En modo demo se puede fijar una fecha con `VITE_DEMO_NOW` para
 * viajar en el tiempo y comprobar cómo se comporta la porra a mitad de
 * competición sin tener que esperar a septiembre.
 */

// Solo se congela el reloj en modo demo: así, si algún día se despliega con
// VITE_DEMO_NOW puesto por olvido, la aplicación real sigue usando la hora buena.
const demoMode = String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'
const rawDemoNow = demoMode ? String(import.meta.env.VITE_DEMO_NOW ?? '').trim() : ''

function parseDemoNow(value: string): number | null {
  if (!value) return null
  // Acepta `YYYY-MM-DD` y `YYYY-MM-DDTHH:mm`, siempre en hora de Madrid.
  const normalized = value.includes('T') ? value : `${value}T12:00`
  const parsed = madridToUtc(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const frozenNow = parseDemoNow(rawDemoNow)

/** Instante actual, o el simulado si se ha fijado uno en modo demo. */
export function now(): number {
  return frozenNow ?? Date.now()
}

/** `true` cuando la app está viajando en el tiempo. */
export const isTimeTravelling = frozenNow !== null

export const simulatedNow = frozenNow
