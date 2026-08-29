import type { Team } from '@/types'

/**
 * Los 36 participantes de la fase liga 2026/27, según el sorteo oficial.
 *
 * El `id` es la clave con la que los referencia el calendario en `fixtures.ts`,
 * así que si se renombra un equipo hay que cambiarlo en los dos sitios. El
 * `color` solo se usa para la barrita de la interfaz.
 */
export const DEFAULT_TEAMS: Team[] = [
  // España
  { id: 'real-madrid', name: 'Real Madrid', shortName: 'RMA', league: 'LaLiga', country: 'España', color: '#dcdcdc' },
  { id: 'barcelona', name: 'FC Barcelona', shortName: 'BAR', league: 'LaLiga', country: 'España', color: '#a50044' },
  { id: 'atletico-madrid', name: 'Atlético de Madrid', shortName: 'ATM', league: 'LaLiga', country: 'España', color: '#cb3524' },
  { id: 'villarreal', name: 'Villarreal CF', shortName: 'VIL', league: 'LaLiga', country: 'España', color: '#ffe667' },
  { id: 'betis', name: 'Real Betis', shortName: 'BET', league: 'LaLiga', country: 'España', color: '#00954c' },

  // Inglaterra
  { id: 'liverpool', name: 'Liverpool FC', shortName: 'LIV', league: 'Premier League', country: 'Inglaterra', color: '#c8102e' },
  { id: 'arsenal', name: 'Arsenal FC', shortName: 'ARS', league: 'Premier League', country: 'Inglaterra', color: '#ef0107' },
  { id: 'manchester-city', name: 'Manchester City', shortName: 'MCI', league: 'Premier League', country: 'Inglaterra', color: '#6cabdd' },
  { id: 'manchester-united', name: 'Manchester United', shortName: 'MUN', league: 'Premier League', country: 'Inglaterra', color: '#da020e' },
  { id: 'aston-villa', name: 'Aston Villa', shortName: 'AVL', league: 'Premier League', country: 'Inglaterra', color: '#95bfe5' },

  // Italia
  { id: 'inter', name: 'Inter de Milán', shortName: 'INT', league: 'Serie A', country: 'Italia', color: '#0068a8' },
  { id: 'napoles', name: 'Nápoles', shortName: 'NAP', league: 'Serie A', country: 'Italia', color: '#12a0d7' },
  { id: 'roma', name: 'AS Roma', shortName: 'ROM', league: 'Serie A', country: 'Italia', color: '#8e1f2f' },
  { id: 'como', name: 'Como 1907', shortName: 'COM', league: 'Serie A', country: 'Italia', color: '#005baa' },

  // Alemania
  { id: 'bayern', name: 'Bayern de Múnich', shortName: 'BAY', league: 'Bundesliga', country: 'Alemania', color: '#dc052d' },
  { id: 'dortmund', name: 'Borussia Dortmund', shortName: 'BVB', league: 'Bundesliga', country: 'Alemania', color: '#fde100' },
  { id: 'leipzig', name: 'RB Leipzig', shortName: 'RBL', league: 'Bundesliga', country: 'Alemania', color: '#dd0741' },
  { id: 'stuttgart', name: 'VfB Stuttgart', shortName: 'VFB', league: 'Bundesliga', country: 'Alemania', color: '#e32219' },

  // Francia
  { id: 'psg', name: 'Paris Saint-Germain', shortName: 'PSG', league: 'Ligue 1', country: 'Francia', color: '#004170' },
  { id: 'lille', name: 'Lille OSC', shortName: 'LIL', league: 'Ligue 1', country: 'Francia', color: '#e01e13' },
  { id: 'lens', name: 'RC Lens', shortName: 'RCL', league: 'Ligue 1', country: 'Francia', color: '#ffcd00' },

  // Países Bajos
  { id: 'psv', name: 'PSV Eindhoven', shortName: 'PSV', league: 'Eredivisie', country: 'Países Bajos', color: '#ed1c24' },
  { id: 'feyenoord', name: 'Feyenoord', shortName: 'FEY', league: 'Eredivisie', country: 'Países Bajos', color: '#e30613' },

  // Portugal
  { id: 'porto', name: 'FC Porto', shortName: 'POR', league: 'Primeira Liga', country: 'Portugal', color: '#0033a0' },
  { id: 'sporting', name: 'Sporting CP', shortName: 'SCP', league: 'Primeira Liga', country: 'Portugal', color: '#008057' },

  // Turquía
  { id: 'galatasaray', name: 'Galatasaray', shortName: 'GAL', league: 'Süper Lig', country: 'Turquía', color: '#fdb913' },
  { id: 'fenerbahce', name: 'Fenerbahçe', shortName: 'FEN', league: 'Süper Lig', country: 'Turquía', color: '#ffed00' },

  // Noruega
  { id: 'bodo-glimt', name: 'Bodø/Glimt', shortName: 'BOD', league: 'Eliteserien', country: 'Noruega', color: '#ffe600' },
  { id: 'viking', name: 'Viking FK', shortName: 'VIK', league: 'Eliteserien', country: 'Noruega', color: '#003da5' },

  // Resto de Europa
  { id: 'brujas', name: 'Club Brujas', shortName: 'CLB', league: 'Pro League', country: 'Bélgica', color: '#1a4fa0' },
  { id: 'slavia', name: 'Slavia de Praga', shortName: 'SLA', league: 'Chance Liga', country: 'Chequia', color: '#d31245' },
  { id: 'lask', name: 'LASK', shortName: 'LSK', league: 'Bundesliga austríaca', country: 'Austria', color: '#b0b0b0' },
  { id: 'aek-atenas', name: 'AEK Atenas', shortName: 'AEK', league: 'Super League', country: 'Grecia', color: '#f5c518' },
  { id: 'shakhtar', name: 'Shakhtar Donetsk', shortName: 'SHK', league: 'Premier League ucraniana', country: 'Ucrania', color: '#ff6600' },
  { id: 'slovan', name: 'Slovan de Bratislava', shortName: 'SLO', league: 'Niké Liga', country: 'Eslovaquia', color: '#0b57a4' },
  { id: 'sabah', name: 'Sabah FK', shortName: 'SAB', league: 'Premier League azerbaiyana', country: 'Azerbaiyán', color: '#00a3e0' },
]

export const TEAM_COUNT = DEFAULT_TEAMS.length
