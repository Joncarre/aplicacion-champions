import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Extras, InternalRow, Match, Prediction, PublicUser, Team, TournamentConfig, UserScore } from '@/types'
import { MATCHDAY_WINDOWS } from '@/data/calendar'
import { now } from '@/lib/clock'
import { resolveCurrentMatchday } from '@/lib/locks'
import { buildChampionsStandings } from '@/lib/standings'
import type { TeamStanding } from '@/types'
import { DEFAULT_CONFIG, getBackend } from '@/services/backend'
import { toPublicUser } from '@/services/auth'
import { useAuth } from './AuthContext'

interface DataContextValue {
  loading: boolean
  error: string | null
  teams: Team[]
  teamById: Map<string, Team>
  matches: Match[]
  users: PublicUser[]
  scores: UserScore[]
  extras: Extras[]
  config: TournamentConfig
  /** Apuestas del usuario que ha iniciado sesión, indexadas por id de partido. */
  myPredictions: Map<string, Prediction>
  myExtras: Extras | null
  /** Jornada abierta a apuestas ahora mismo. */
  currentMatchday: number
  internalStandings: InternalRow[]
  championsStandings: TeamStanding[]
  matchesByMatchday: (matchday: number) => Match[]
  refresh: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const emptyScore = (userId: string): UserScore => ({
  userId,
  matchdays: MATCHDAY_WINDOWS.map((w) => ({
    matchday: w.matchday,
    points: 0,
    signHits: 0,
    exactHits: 0,
    resolved: 0,
    predicted: 0,
  })),
  matchPoints: 0,
  extraPoints: 0,
  totalPoints: 0,
  signHits: 0,
  exactHits: 0,
  topScorerHit: false,
  championHit: false,
})

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [users, setUsers] = useState<PublicUser[]>([])
  const [scores, setScores] = useState<UserScore[]>([])
  const [extras, setExtras] = useState<Extras[]>([])
  const [config, setConfig] = useState<TournamentConfig>(DEFAULT_CONFIG)
  const [predictions, setPredictions] = useState<Prediction[]>([])

  const userId = user?.id ?? null
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const backend = await getBackend()
      const [teamList, matchList, userList, scoreList, extrasList, configDoc] = await Promise.all([
        backend.listTeams(),
        backend.listMatches(),
        backend.listUsers(),
        backend.listScores(),
        backend.listExtras(),
        backend.getConfig(),
      ])
      const mine = userId ? await backend.listPredictionsByUser(userId) : []

      setTeams(teamList)
      setMatches(matchList)
      setUsers(userList.map(toPublicUser))
      setScores(scoreList)
      setExtras(extrasList)
      setConfig(configDoc)
      setPredictions(mine)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se han podido cargar los datos')
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  // Al volver a la pestaña se refrescan los datos: el admin puede haber metido resultados.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [load])

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])

  const currentMatchday = useMemo(
    () => resolveCurrentMatchday(matches, now(), config.currentMatchdayOverride),
    [matches, config.currentMatchdayOverride],
  )

  const myPredictions = useMemo(
    () => new Map(predictions.map((prediction) => [prediction.matchId, prediction])),
    [predictions],
  )

  const myExtras = useMemo(
    () => extras.find((entry) => entry.userId === userId) ?? null,
    [extras, userId],
  )

  /**
   * Tabla de la porra. Se apoya en las puntuaciones ya calculadas, pero cubre
   * también a quien se acaba de registrar y todavía no tiene documento propio.
   *
   * El administrador queda fuera: no participa, así que ni aparece en la tabla
   * ni cuenta como líder a la hora de medir al resto.
   */
  const internalStandings = useMemo<InternalRow[]>(() => {
    const byUser = new Map(scores.map((score) => [score.userId, score]))
    return users
      .filter((participant) => !participant.isAdmin)
      .map((participant) => ({
        user: participant,
        ...(byUser.get(participant.id) ?? emptyScore(participant.id)),
      }))
      .sort(
        (a, b) =>
          b.totalPoints - a.totalPoints ||
          b.exactHits - a.exactHits ||
          b.signHits - a.signHits ||
          a.user.nickname.localeCompare(b.user.nickname, 'es'),
      )
      .map((row, index) => ({ ...row, position: index + 1 }))
  }, [users, scores])

  const championsStandings = useMemo(() => buildChampionsStandings(teams, matches), [teams, matches])

  const matchesByMatchday = useCallback(
    (matchday: number) =>
      matches.filter((match) => match.matchday === matchday).sort((a, b) => a.kickoff - b.kickoff || a.id.localeCompare(b.id)),
    [matches],
  )

  const value = useMemo(
    () => ({
      loading,
      error,
      teams,
      teamById,
      matches,
      users,
      scores,
      extras,
      config,
      myPredictions,
      myExtras,
      currentMatchday,
      internalStandings,
      championsStandings,
      matchesByMatchday,
      refresh: load,
    }),
    [
      loading,
      error,
      teams,
      teamById,
      matches,
      users,
      scores,
      extras,
      config,
      myPredictions,
      myExtras,
      currentMatchday,
      internalStandings,
      championsStandings,
      matchesByMatchday,
      load,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData tiene que usarse dentro de <DataProvider>')
  return context
}
