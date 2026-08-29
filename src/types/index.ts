/** Modelo de dominio de la porra. Todas las fechas son epoch en milisegundos (UTC). */

export interface Team {
  id: string
  name: string
  shortName: string
  league: string
  country: string
  /** Color de acento del club, usado solo en la interfaz. */
  color: string
}

export interface Match {
  id: string
  matchday: number
  homeTeamId: string
  awayTeamId: string
  kickoff: number
  homeGoals: number | null
  awayGoals: number | null
}

/** Signo del partido tal y como se apuesta en una porra. */
export type Sign = '1' | 'X' | '2'

/** Cómo de bien acertó una apuesta concreta. */
export type Outcome = 'exact' | 'sign' | 'miss'

export interface Prediction {
  /** `${userId}__${matchId}` */
  id: string
  userId: string
  matchId: string
  matchday: number
  homeGoals: number
  awayGoals: number
  updatedAt: number
}

export interface User {
  /** Coincide con el nickname en minúsculas, lo que garantiza que sea único. */
  id: string
  nickname: string
  nombre: string
  apellidos: string
  passwordHash: string
  passwordSalt: string
  /** Data URL de 240×240, o null si aún no ha subido foto. */
  photo: string | null
  isAdmin: boolean
  hasPaid: boolean
  createdAt: number
}

/** Un usuario sin sus credenciales. Es lo único que sale del servicio de usuarios. */
export type PublicUser = Omit<User, 'passwordHash' | 'passwordSalt'>

export interface Extras {
  userId: string
  /** Texto libre: el nombre del jugador tal y como lo escribe el usuario. */
  topScorer: string
  /** Texto libre también: el nombre del equipo campeón. */
  champion: string
  updatedAt: number
}

export interface TournamentConfig {
  actualTopScorer: string | null
  actualChampion: string | null
  /** Si el admin quiere forzar qué jornada está abierta. null = se deduce del calendario. */
  currentMatchdayOverride: number | null
  /** Cuota por participante, en euros. */
  entryFee: number
}

/** Rendimiento de un usuario en una jornada concreta. */
export interface MatchdayScore {
  matchday: number
  points: number
  signHits: number
  exactHits: number
  /** Partidos de la jornada con resultado oficial. */
  resolved: number
  /** De esos, en cuántos había apostado el usuario. */
  predicted: number
}

export interface UserScore {
  userId: string
  matchdays: MatchdayScore[]
  matchPoints: number
  extraPoints: number
  totalPoints: number
  signHits: number
  exactHits: number
  topScorerHit: boolean
  championHit: boolean
}

/** Fila de la tabla de la porra. */
export interface InternalRow extends UserScore {
  position: number
  user: PublicUser
}

/** Fila de la clasificación real de la fase liga. */
export interface TeamStanding {
  position: number
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}
