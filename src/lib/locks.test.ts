import { describe, expect, it } from 'vitest'
import type { Match } from '@/types'
import { madridToUtc } from './date'
import { EXTRAS_DEADLINE, areExtrasLocked, isMatchOpen, lockReasonFor, resolveCurrentMatchday } from './locks'

const match = (
  id: string,
  matchday: number,
  kickoff: string,
  homeGoals: number | null = null,
  awayGoals: number | null = null,
): Match => ({
  id,
  matchday,
  homeTeamId: 'a',
  awayTeamId: 'b',
  kickoff: madridToUtc(kickoff),
  homeGoals,
  awayGoals,
})

const CALENDAR: Match[] = [
  match('md1-01', 1, '2026-09-08T21:00'),
  match('md1-02', 1, '2026-09-09T21:00'),
  match('md2-01', 2, '2026-10-13T21:00'),
  match('md2-02', 2, '2026-10-14T21:00'),
  match('md3-01', 3, '2026-10-20T21:00'),
]

const at = (wallClock: string) => madridToUtc(wallClock)

describe('isMatchOpen', () => {
  const partido = match('md1-01', 1, '2026-09-08T21:00')

  it('acepta apuestas hasta el saque inicial', () => {
    expect(isMatchOpen(partido, at('2026-09-08T20:59'))).toBe(true)
  })

  it('se cierra justo al empezar el partido', () => {
    expect(isMatchOpen(partido, at('2026-09-08T21:00'))).toBe(false)
    expect(isMatchOpen(partido, at('2026-09-08T21:01'))).toBe(false)
  })

  it('se cierra también si ya tiene resultado', () => {
    const jugado = match('md1-01', 1, '2026-09-08T21:00', 2, 1)
    expect(isMatchOpen(jugado, at('2026-09-01T12:00'))).toBe(false)
  })
})

describe('resolveCurrentMatchday', () => {
  it('antes de empezar todo, la jornada en curso es la primera', () => {
    expect(resolveCurrentMatchday(CALENDAR, at('2026-08-30T12:00'))).toBe(1)
  })

  it('sigue siendo la 1 mientras quede algún partido de la 1 por jugar', () => {
    expect(resolveCurrentMatchday(CALENDAR, at('2026-09-09T18:00'))).toBe(1)
  })

  it('pasa a la 2 en cuanto arranca el último partido de la 1', () => {
    expect(resolveCurrentMatchday(CALENDAR, at('2026-09-09T21:00'))).toBe(2)
  })

  it('durante el parón deja abierta ya la jornada siguiente', () => {
    expect(resolveCurrentMatchday(CALENDAR, at('2026-09-25T12:00'))).toBe(2)
  })

  it('cuando ya ha empezado todo se queda en la última jornada', () => {
    expect(resolveCurrentMatchday(CALENDAR, at('2027-05-01T12:00'))).toBe(8)
  })

  it('respeta el ajuste manual del admin', () => {
    expect(resolveCurrentMatchday(CALENDAR, at('2026-08-30T12:00'), 4)).toBe(4)
  })

  it('ignora un ajuste manual fuera de rango', () => {
    expect(resolveCurrentMatchday(CALENDAR, at('2026-08-30T12:00'), 99)).toBe(1)
    expect(resolveCurrentMatchday(CALENDAR, at('2026-08-30T12:00'), 0)).toBe(1)
  })
})

describe('lockReasonFor', () => {
  const partido = match('md2-01', 2, '2026-10-13T21:00')
  const now = at('2026-10-10T12:00')

  it('deja apostar al usuario que ha pagado en la jornada en curso', () => {
    expect(lockReasonFor(partido, { hasPaid: true, currentMatchday: 2, now })).toBeNull()
  })

  it('bloquea a quien no ha pagado, por encima de todo lo demás', () => {
    expect(lockReasonFor(partido, { hasPaid: false, currentMatchday: 2, now })).toBe('unpaid')
  })

  it('bloquea las jornadas futuras', () => {
    expect(lockReasonFor(partido, { hasPaid: true, currentMatchday: 1, now })).toBe('future-matchday')
  })

  it('bloquea las jornadas ya pasadas', () => {
    expect(lockReasonFor(partido, { hasPaid: true, currentMatchday: 3, now })).toBe('past-matchday')
  })

  it('bloquea el partido que ya ha empezado aunque sea de la jornada en curso', () => {
    expect(
      lockReasonFor(partido, { hasPaid: true, currentMatchday: 2, now: at('2026-10-13T21:00') }),
    ).toBe('kicked-off')
  })
})

/*
  Contra la propia fecha de cierre y no contra un día escrito a mano: esa fecha
  se mueve cuando se reabren las apuestas, y no tiene sentido tener que tocar
  el test cada vez que se abren o se cierran.
*/
describe('areExtrasLocked', () => {
  it('admite goleador y campeón hasta el instante del cierre', () => {
    expect(areExtrasLocked(EXTRAS_DEADLINE - 60_000)).toBe(false)
  })

  it('los cierra a partir de ese instante', () => {
    expect(areExtrasLocked(EXTRAS_DEADLINE)).toBe(true)
    expect(areExtrasLocked(EXTRAS_DEADLINE + 12 * 3_600_000)).toBe(true)
  })
})
