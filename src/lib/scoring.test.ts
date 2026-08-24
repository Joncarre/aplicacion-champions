import { describe, expect, it } from 'vitest'
import type { Match, TournamentConfig } from '@/types'
import { POINTS, namesMatch, outcomeOf, scoreExtras, scorePrediction, signOf } from './scoring'

const match = (homeGoals: number | null, awayGoals: number | null): Match => ({
  id: 'md1-01',
  matchday: 1,
  homeTeamId: 'a',
  awayTeamId: 'b',
  kickoff: 0,
  homeGoals,
  awayGoals,
})

describe('signOf', () => {
  it('clasifica los tres signos', () => {
    expect(signOf(2, 1)).toBe('1')
    expect(signOf(1, 1)).toBe('X')
    expect(signOf(0, 3)).toBe('2')
  })
})

describe('outcomeOf', () => {
  const real = { ...match(2, 1), homeGoals: 2, awayGoals: 1 }

  it('el marcador exacto vale 3 puntos, no 4', () => {
    expect(outcomeOf({ homeGoals: 2, awayGoals: 1 }, real)).toBe('exact')
    expect(scorePrediction({ homeGoals: 2, awayGoals: 1 }, real)?.points).toBe(3)
  })

  it('acertar solo el signo vale 1 punto', () => {
    expect(outcomeOf({ homeGoals: 3, awayGoals: 0 }, real)).toBe('sign')
    expect(scorePrediction({ homeGoals: 3, awayGoals: 0 }, real)?.points).toBe(1)
  })

  it('fallar el signo no puntúa', () => {
    expect(outcomeOf({ homeGoals: 0, awayGoals: 1 }, real)).toBe('miss')
    expect(scorePrediction({ homeGoals: 0, awayGoals: 1 }, real)?.points).toBe(0)
  })

  it('distingue empates con marcadores distintos', () => {
    const empate = { ...match(1, 1), homeGoals: 1, awayGoals: 1 }
    expect(outcomeOf({ homeGoals: 1, awayGoals: 1 }, empate)).toBe('exact')
    expect(outcomeOf({ homeGoals: 2, awayGoals: 2 }, empate)).toBe('sign')
  })
})

describe('scorePrediction', () => {
  it('devuelve null si el partido aún no tiene resultado', () => {
    expect(scorePrediction({ homeGoals: 1, awayGoals: 0 }, match(null, null))).toBeNull()
  })

  it('devuelve null si el usuario no apostó', () => {
    expect(scorePrediction(undefined, { ...match(1, 0), homeGoals: 1, awayGoals: 0 })).toBeNull()
  })
})

describe('namesMatch', () => {
  it('ignora tildes, mayúsculas y espacios de más', () => {
    expect(namesMatch('  KYLIAN   MBAPPE ', 'Kylian Mbappé')).toBe(true)
  })

  it('acepta el apellido suelto frente al nombre completo', () => {
    expect(namesMatch('Mbappé', 'Kylian Mbappé')).toBe(true)
    expect(namesMatch('Erling Haaland', 'Haaland')).toBe(true)
  })

  it('no confunde a dos jugadores distintos', () => {
    expect(namesMatch('Vinicius', 'Kylian Mbappé')).toBe(false)
    expect(namesMatch('', 'Kylian Mbappé')).toBe(false)
  })
})

describe('scoreExtras', () => {
  const config: TournamentConfig = {
    actualTopScorer: 'Kylian Mbappé',
    actualChampionTeamId: 'real-madrid',
    currentMatchdayOverride: null,
    entryFee: 10,
  }
  const extras = (topScorer: string, championTeamId: string | null) => ({
    userId: 'u',
    topScorer,
    championTeamId,
    updatedAt: 0,
  })

  it('suma 25 y 50 por acertar goleador y campeón', () => {
    const result = scoreExtras(extras('Mbappé', 'real-madrid'), config)
    expect(result.points).toBe(POINTS.topScorer + POINTS.champion)
    expect(result.topScorerHit).toBe(true)
    expect(result.championHit).toBe(true)
  })

  it('puntúa cada acierto por separado', () => {
    expect(scoreExtras(extras('Haaland', 'real-madrid'), config).points).toBe(50)
    expect(scoreExtras(extras('Mbappé', 'barcelona'), config).points).toBe(25)
  })

  it('no puntúa mientras el admin no haya fijado los aciertos', () => {
    const sinResultado = { ...config, actualTopScorer: null, actualChampionTeamId: null }
    expect(scoreExtras(extras('Mbappé', 'real-madrid'), sinResultado).points).toBe(0)
  })

  it('no puntúa a quien no apostó', () => {
    expect(scoreExtras(undefined, config).points).toBe(0)
  })
})
