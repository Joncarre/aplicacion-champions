// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { MATCHES_PER_MATCHDAY, TOTAL_MATCHES } from '@/data/calendar'
import { TEAM_COUNT } from '@/data/teams'
import { now } from '@/lib/clock'
import { resolveCurrentMatchday } from '@/lib/locks'
import { buildChampionsStandings } from '@/lib/standings'
import { getBackend } from './backend'
import { login, register } from './auth'
import { recomputeScores } from './scores'
import { DEMO_NICKNAMES, resetDemoData } from './demoBackend'

/**
 * Prueba de extremo a extremo sobre el backend de demostración: registro,
 * apuestas, resultados del admin y clasificación. Es el recorrido completo de
 * la porra, con la misma lógica que se ejecuta contra Firestore.
 *
 * El reloj está fijado al 15 de diciembre de 2026 (ver `vite.config.ts`), o sea
 * con las jornadas 1 a 6 ya jugadas y la 7 abierta a apuestas.
 */
describe('recorrido completo de la porra', () => {
  // Cada prueba arranca con la porra recién sembrada.
  beforeEach(async () => {
    await resetDemoData()
  })

  it('siembra los 36 equipos y las 8 jornadas', async () => {
    const backend = await getBackend()
    expect(await backend.listTeams()).toHaveLength(TEAM_COUNT)
    expect(await backend.listMatches()).toHaveLength(TOTAL_MATCHES)
  })

  it('deja jugadas las jornadas pasadas y abre la que toca', async () => {
    const backend = await getBackend()
    const matches = await backend.listMatches()

    const jugadas = matches.filter((m) => m.homeGoals !== null)
    expect(jugadas.length).toBe(6 * MATCHES_PER_MATCHDAY)
    expect(resolveCurrentMatchday(matches, now())).toBe(7)
  })

  it('deja las puntuaciones listas nada más sembrar, sin recalcular', async () => {
    // Si la semilla dejara `scores` vacío, la clasificación saldría a cero y
    // el perfil no pintaría ninguna gráfica hasta que el admin recalculase.
    const backend = await getBackend()
    const scores = await backend.listScores()

    expect(scores).toHaveLength(DEMO_NICKNAMES.length)
    expect(scores.filter((score) => score.totalPoints > 0).length).toBeGreaterThan(3)
    // Y con seis jornadas jugadas, el desglose por jornada también está.
    const lucia = scores.find((score) => score.userId === 'lucia')
    expect(lucia?.matchdays.filter((m) => m.resolved > 0)).toHaveLength(6)
  })

  it('registra un usuario nuevo, que entra sin pagar y sin puntos', async () => {
    const created = await register({
      nombre: 'Iván',
      apellidos: 'Pérez Ruiz',
      nickname: 'IvanP',
      password: 'secreta',
    })

    expect(created.id).toBe('ivanp')
    expect(created.hasPaid).toBe(false)
    expect(created.isAdmin).toBe(false)

    const logged = await login('IVANP', 'secreta')
    expect(logged.id).toBe('ivanp')
    // Las credenciales nunca salen de la capa de servicios.
    expect(logged).not.toHaveProperty('passwordHash')
  })

  it('no permite repetir nickname ni entrar con la contraseña equivocada', async () => {
    await register({ nombre: 'Ana', apellidos: 'Gil Mora', nickname: 'ana', password: 'secreta' })

    await expect(
      register({ nombre: 'Otra', apellidos: 'Ana Vez', nickname: 'ANA', password: 'secreta' }),
    ).rejects.toThrow(/ya está cogido/i)

    await expect(login('ana', 'incorrecta')).rejects.toThrow(/incorrect/i)
  })

  it('marca al usuario como pagado y le deja apostar la jornada abierta', async () => {
    const backend = await getBackend()
    await register({ nombre: 'Ana', apellidos: 'Gil Mora', nickname: 'ana', password: 'secreta' })
    await backend.updateUser('ana', { hasPaid: true })

    const jornada7 = (await backend.listMatches()).filter((m) => m.matchday === 7)
    const primero = jornada7[0]
    expect(primero).toBeDefined()

    await backend.savePredictions([
      {
        id: `ana__${primero!.id}`,
        userId: 'ana',
        matchId: primero!.id,
        matchday: 7,
        homeGoals: 2,
        awayGoals: 1,
        updatedAt: now(),
      },
    ])

    const suyas = await backend.listPredictionsByUser('ana')
    expect(suyas).toHaveLength(1)
    expect(suyas[0]).toMatchObject({ homeGoals: 2, awayGoals: 1 })
  })

  it('puntúa la apuesta en cuanto el admin mete el resultado', async () => {
    const backend = await getBackend()
    await register({ nombre: 'Ana', apellidos: 'Gil Mora', nickname: 'ana', password: 'secreta' })
    await backend.updateUser('ana', { hasPaid: true })

    const partido = (await backend.listMatches()).find((m) => m.matchday === 7)
    expect(partido).toBeDefined()

    await backend.savePredictions([
      {
        id: `ana__${partido!.id}`,
        userId: 'ana',
        matchId: partido!.id,
        matchday: 7,
        homeGoals: 3,
        awayGoals: 1,
        updatedAt: now(),
      },
    ])

    // Marcador exacto: 3 puntos.
    await backend.updateMatch(partido!.id, { homeGoals: 3, awayGoals: 1 })
    let scores = await recomputeScores()
    let ana = scores.find((s) => s.userId === 'ana')
    expect(ana).toMatchObject({ totalPoints: 3, exactHits: 1, signHits: 0 })

    // El admin corrige: ahora solo acierta el signo, 1 punto.
    await backend.updateMatch(partido!.id, { homeGoals: 2, awayGoals: 0 })
    scores = await recomputeScores()
    ana = scores.find((s) => s.userId === 'ana')
    expect(ana).toMatchObject({ totalPoints: 1, exactHits: 0, signHits: 1 })

    // Y si lo deja sin jugar, se descuenta.
    await backend.updateMatch(partido!.id, { homeGoals: null, awayGoals: null })
    scores = await recomputeScores()
    expect(scores.find((s) => s.userId === 'ana')?.totalPoints).toBe(0)
  })

  it('suma los puntos de goleador y campeón cuando el admin los fija', async () => {
    const backend = await getBackend()
    await register({ nombre: 'Ana', apellidos: 'Gil Mora', nickname: 'ana', password: 'secreta' })
    await backend.saveExtras({
      userId: 'ana',
      topScorer: 'Haaland',
      champion: 'Liverpool',
      updatedAt: now(),
    })

    expect((await recomputeScores()).find((s) => s.userId === 'ana')?.extraPoints).toBe(0)

    await backend.saveConfig({ actualTopScorer: 'Erling Haaland', actualChampion: 'Liverpool FC' })
    const ana = (await recomputeScores()).find((s) => s.userId === 'ana')
    expect(ana).toMatchObject({ extraPoints: 75, topScorerHit: true, championHit: true })
  })

  it('cuadra la clasificación de la Champions con los resultados guardados', async () => {
    const backend = await getBackend()
    const [teams, matches] = await Promise.all([backend.listTeams(), backend.listMatches()])
    const table = buildChampionsStandings(teams, matches)

    expect(table).toHaveLength(TEAM_COUNT)
    // Seis jornadas jugadas: todo el mundo con seis partidos.
    expect(table.every((row) => row.played === 6)).toBe(true)
    // Los goles a favor de unos son los goles en contra de otros.
    const scoredFor = table.reduce((sum, row) => sum + row.goalsFor, 0)
    const scoredAgainst = table.reduce((sum, row) => sum + row.goalsAgainst, 0)
    expect(scoredFor).toBe(scoredAgainst)
    // Y la tabla va de más a menos puntos.
    const points = table.map((row) => row.points)
    expect([...points].sort((a, b) => b - a)).toEqual(points)
  })

  it('ordena la porra por puntos y da el mismo total que el desglose', async () => {
    const scores = await recomputeScores()
    expect(scores.length).toBeGreaterThan(0)

    for (const score of scores) {
      expect(score.matchPoints).toBe(score.signHits * 1 + score.exactHits * 3)
      expect(score.totalPoints).toBe(score.matchPoints + score.extraPoints)
      expect(score.matchdays.reduce((sum, m) => sum + m.points, 0)).toBe(score.matchPoints)
    }
  })

  it('borra las apuestas al eliminar a un participante', async () => {
    const backend = await getBackend()
    await register({ nombre: 'Ana', apellidos: 'Gil Mora', nickname: 'ana', password: 'secreta' })
    const partido = (await backend.listMatches())[0]

    await backend.savePredictions([
      {
        id: `ana__${partido!.id}`,
        userId: 'ana',
        matchId: partido!.id,
        matchday: 1,
        homeGoals: 1,
        awayGoals: 1,
        updatedAt: now(),
      },
    ])
    await backend.saveExtras({ userId: 'ana', topScorer: 'X', champion: '', updatedAt: now() })

    await backend.deleteUser('ana')

    expect(await backend.getUser('ana')).toBeNull()
    expect(await backend.listPredictionsByUser('ana')).toHaveLength(0)
    expect(await backend.getExtras('ana')).toBeNull()
  })
})
