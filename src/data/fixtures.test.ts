import { describe, expect, it } from 'vitest'
import { MATCHDAY_WINDOWS, MATCHES_PER_MATCHDAY, TOTAL_MATCHES } from './calendar'
import { DEFAULT_TEAMS } from './teams'
import { generateFixtures } from './fixtures'
import { formatTime, madridDayKey } from '@/lib/date'

const fixtures = generateFixtures(DEFAULT_TEAMS)

describe('generateFixtures', () => {
  it('genera las 8 jornadas completas', () => {
    expect(fixtures).toHaveLength(TOTAL_MATCHES)
    for (const window of MATCHDAY_WINDOWS) {
      expect(fixtures.filter((m) => m.matchday === window.matchday)).toHaveLength(MATCHES_PER_MATCHDAY)
    }
  })

  it('no repite identificadores', () => {
    expect(new Set(fixtures.map((m) => m.id)).size).toBe(TOTAL_MATCHES)
  })

  it('hace jugar a cada equipo una sola vez por jornada', () => {
    for (const window of MATCHDAY_WINDOWS) {
      const playing = fixtures
        .filter((m) => m.matchday === window.matchday)
        .flatMap((m) => [m.homeTeamId, m.awayTeamId])
      expect(playing).toHaveLength(DEFAULT_TEAMS.length)
      expect(new Set(playing).size).toBe(DEFAULT_TEAMS.length)
    }
  })

  it('da a cada equipo 8 rivales distintos', () => {
    for (const team of DEFAULT_TEAMS) {
      const own = fixtures.filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
      expect(own).toHaveLength(MATCHDAY_WINDOWS.length)
      const rivals = own.map((m) => (m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId))
      expect(new Set(rivals).size).toBe(MATCHDAY_WINDOWS.length)
      expect(rivals).not.toContain(team.id)
    }
  })

  it('reparte 4 partidos en casa y 4 fuera por equipo', () => {
    for (const team of DEFAULT_TEAMS) {
      expect(fixtures.filter((m) => m.homeTeamId === team.id)).toHaveLength(4)
      expect(fixtures.filter((m) => m.awayTeamId === team.id)).toHaveLength(4)
    }
  })

  it('coloca cada partido dentro de su ventana oficial y en horario de tarde/noche', () => {
    for (const match of fixtures) {
      const window = MATCHDAY_WINDOWS.find((w) => w.matchday === match.matchday)
      expect(window?.days).toContain(madridDayKey(match.kickoff))
      expect(['18:45', '21:00']).toContain(formatTime(match.kickoff))
    }
  })

  it('juega la última jornada entera en simultáneo', () => {
    const last = fixtures.filter((m) => m.matchday === 8)
    expect(new Set(last.map((m) => m.kickoff)).size).toBe(1)
  })

  it('es determinista: recargar no mueve los partidos', () => {
    expect(generateFixtures(DEFAULT_TEAMS)).toEqual(fixtures)
  })

  it('empieza sin resultados', () => {
    expect(fixtures.every((m) => m.homeGoals === null && m.awayGoals === null)).toBe(true)
  })
})
