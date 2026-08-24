import { madridToUtc } from '@/lib/date'

/** Ventana oficial de cada jornada de la fase liga 2026/27. */
export interface MatchdayWindow {
  matchday: number
  /** Días en los que se disputa, `YYYY-MM-DD`. */
  days: string[]
  label: string
}

export const MATCHDAY_WINDOWS: MatchdayWindow[] = [
  { matchday: 1, days: ['2026-09-08', '2026-09-09', '2026-09-10'], label: '8–10 sep 2026' },
  { matchday: 2, days: ['2026-10-13', '2026-10-14'], label: '13–14 oct 2026' },
  { matchday: 3, days: ['2026-10-20', '2026-10-21'], label: '20–21 oct 2026' },
  { matchday: 4, days: ['2026-11-03', '2026-11-04'], label: '3–4 nov 2026' },
  { matchday: 5, days: ['2026-11-24', '2026-11-25'], label: '24–25 nov 2026' },
  { matchday: 6, days: ['2026-12-08', '2026-12-09'], label: '8–9 dic 2026' },
  { matchday: 7, days: ['2027-01-19', '2027-01-20'], label: '19–20 ene 2027' },
  { matchday: 8, days: ['2027-01-27'], label: '27 ene 2027' },
]

export const TOTAL_MATCHDAYS = MATCHDAY_WINDOWS.length
export const MATCHES_PER_MATCHDAY = 18
export const TOTAL_MATCHES = TOTAL_MATCHDAYS * MATCHES_PER_MATCHDAY

/**
 * Cierre de las apuestas de máximo goleador y campeón: el arranque de la
 * competición, el 8 de septiembre de 2026.
 */
export const EXTRAS_DEADLINE = madridToUtc('2026-09-08T00:00')

/** Fases eliminatorias, solo informativas mientras la pantalla de Cruces esté pendiente. */
export const KNOCKOUT_ROUNDS = [
  { id: 'playoffs', name: 'Play-offs', label: '16/17 y 23/24 de febrero de 2027', start: madridToUtc('2027-02-16T21:00') },
  { id: 'r16', name: 'Octavos de final', label: '9/10 y 16/17 de marzo de 2027', start: madridToUtc('2027-03-09T21:00') },
  { id: 'qf', name: 'Cuartos de final', label: '6/7 y 13/14 de abril de 2027', start: madridToUtc('2027-04-06T21:00') },
  { id: 'sf', name: 'Semifinales', label: '27/28 de abril y 4/5 de mayo de 2027', start: madridToUtc('2027-04-27T21:00') },
  { id: 'final', name: 'Final', label: '5 de junio de 2027', start: madridToUtc('2027-06-05T21:00') },
] as const

export const KNOCKOUT_START = KNOCKOUT_ROUNDS[0].start
