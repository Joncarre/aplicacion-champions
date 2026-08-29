import { describe, expect, it } from 'vitest'
import { formatTime, madridDayKey } from '@/lib/date'
import { MATCHDAY_WINDOWS, MATCHES_PER_MATCHDAY, TOTAL_MATCHES } from './calendar'
import { DEFAULT_TEAMS, TEAM_COUNT } from './teams'
import { buildOfficialMatches } from './fixtures'

/**
 * Validación del calendario oficial transcrito a mano.
 *
 * El formato de fase liga impone unas reglas muy estrictas —36 equipos, 8
 * rivales distintos cada uno, 4 partidos en casa y 4 fuera—, así que estas
 * comprobaciones detectan cualquier errata de transcripción: un equipo repetido,
 * uno que falte o un enfrentamiento duplicado rompen alguna de ellas.
 */
const matches = buildOfficialMatches()
const teamIds = new Set(DEFAULT_TEAMS.map((team) => team.id))

describe('calendario oficial', () => {
  it('tiene los 144 partidos repartidos en 8 jornadas de 18', () => {
    expect(matches).toHaveLength(TOTAL_MATCHES)
    for (const window of MATCHDAY_WINDOWS) {
      expect(matches.filter((m) => m.matchday === window.matchday)).toHaveLength(MATCHES_PER_MATCHDAY)
    }
  })

  it('no repite identificadores', () => {
    expect(new Set(matches.map((m) => m.id)).size).toBe(TOTAL_MATCHES)
  })

  it('solo menciona equipos que existen', () => {
    const desconocidos = matches
      .flatMap((m) => [m.homeTeamId, m.awayTeamId])
      .filter((id) => !teamIds.has(id))
    expect([...new Set(desconocidos)]).toEqual([])
  })

  it('nunca enfrenta a un equipo consigo mismo', () => {
    expect(matches.filter((m) => m.homeTeamId === m.awayTeamId)).toEqual([])
  })

  it('hace jugar a los 36 equipos una vez en cada jornada', () => {
    for (const window of MATCHDAY_WINDOWS) {
      const jugando = matches
        .filter((m) => m.matchday === window.matchday)
        .flatMap((m) => [m.homeTeamId, m.awayTeamId])
      expect(jugando).toHaveLength(TEAM_COUNT)
      expect(new Set(jugando).size).toBe(TEAM_COUNT)
    }
  })

  it('da a cada equipo 8 rivales distintos', () => {
    for (const team of DEFAULT_TEAMS) {
      const suyos = matches.filter((m) => m.homeTeamId === team.id || m.awayTeamId === team.id)
      expect(suyos, `${team.name} no juega 8 partidos`).toHaveLength(MATCHDAY_WINDOWS.length)

      const rivales = suyos.map((m) => (m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId))
      expect(new Set(rivales).size, `${team.name} repite rival`).toBe(MATCHDAY_WINDOWS.length)
    }
  })

  it('reparte 4 partidos en casa y 4 fuera por equipo', () => {
    for (const team of DEFAULT_TEAMS) {
      expect(matches.filter((m) => m.homeTeamId === team.id), `${team.name} como local`).toHaveLength(4)
      expect(matches.filter((m) => m.awayTeamId === team.id), `${team.name} como visitante`).toHaveLength(4)
    }
  })

  it('no repite ningún emparejamiento, ni siquiera con los papeles cambiados', () => {
    const parejas = matches.map((m) => [m.homeTeamId, m.awayTeamId].sort().join(' vs '))
    expect(new Set(parejas).size).toBe(TOTAL_MATCHES)
  })

  it('coloca cada partido en su fecha oficial y a las 18:45 o las 21:00', () => {
    for (const match of matches) {
      const window = MATCHDAY_WINDOWS.find((w) => w.matchday === match.matchday)
      expect(window?.days, `partido ${match.id} fuera de fecha`).toContain(madridDayKey(match.kickoff))
      expect(['18:45', '21:00']).toContain(formatTime(match.kickoff))
    }
  })

  it('respeta el cambio de horario: las tres primeras jornadas en CEST y el resto en CET', () => {
    const kickoffOf = (id: string) => matches.find((m) => m.id === id)?.kickoff

    // 8 de septiembre a las 21:00 en España son las 19:00 UTC (UTC+2).
    expect(kickoffOf('md1-03')).toBe(Date.UTC(2026, 8, 8, 19, 0))
    // 27 de enero a las 21:00 son las 20:00 UTC (UTC+1).
    expect(kickoffOf('md8-01')).toBe(Date.UTC(2027, 0, 27, 20, 0))
  })

  it('juega la última jornada entera en simultáneo', () => {
    const ultima = matches.filter((m) => m.matchday === 8)
    expect(new Set(ultima.map((m) => m.kickoff)).size).toBe(1)
  })

  it('empieza sin resultados', () => {
    expect(matches.every((m) => m.homeGoals === null && m.awayGoals === null)).toBe(true)
  })

  it('es determinista', () => {
    expect(buildOfficialMatches()).toEqual(matches)
  })
})
