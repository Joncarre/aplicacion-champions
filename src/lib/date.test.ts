import { describe, expect, it } from 'vitest'
import { formatTime, madridDayKey, madridToUtc } from './date'

describe('madridToUtc', () => {
  it('interpreta el horario de verano (CEST, UTC+2)', () => {
    // La jornada 1 se juega en septiembre, con España en UTC+2.
    expect(madridToUtc('2026-09-08T21:00')).toBe(Date.UTC(2026, 8, 8, 19, 0))
  })

  it('interpreta el horario de invierno (CET, UTC+1)', () => {
    // La jornada 8 se juega en enero, con España en UTC+1.
    expect(madridToUtc('2027-01-27T21:00')).toBe(Date.UTC(2027, 0, 27, 20, 0))
  })

  it('cruza bien el cambio de hora de octubre', () => {
    // El cambio a horario de invierno es el 25 de octubre de 2026.
    expect(madridToUtc('2026-10-21T18:45')).toBe(Date.UTC(2026, 9, 21, 16, 45))
    expect(madridToUtc('2026-11-03T18:45')).toBe(Date.UTC(2026, 10, 3, 17, 45))
  })
})

describe('formateo', () => {
  it('muestra la hora en horario español, no en UTC', () => {
    expect(formatTime(madridToUtc('2026-09-08T21:00'))).toBe('21:00')
    expect(formatTime(madridToUtc('2027-01-27T18:45'))).toBe('18:45')
  })

  it('agrupa por día natural español', () => {
    // 00:30 en Madrid sigue siendo el día anterior en UTC.
    expect(madridDayKey(madridToUtc('2026-09-09T00:30'))).toBe('2026-09-09')
  })
})

describe('toDateTimeInputValue', () => {
  it('da la vuelta al valor sin perder la hora española', async () => {
    const { toDateTimeInputValue } = await import('./date')
    expect(toDateTimeInputValue(madridToUtc('2026-09-08T21:00'))).toBe('2026-09-08T21:00')
    expect(toDateTimeInputValue(madridToUtc('2027-01-27T18:45'))).toBe('2027-01-27T18:45')
    // Medianoche: el formateador puede devolver 24 en vez de 00.
    expect(toDateTimeInputValue(madridToUtc('2026-12-09T00:00'))).toBe('2026-12-09T00:00')
  })
})
