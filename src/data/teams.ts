import type { Team } from '@/types'

/**
 * Plantilla de los 36 participantes de la fase liga.
 *
 * Los clasificados reales de 2026/27 no se conocen todavía: esto es una
 * semilla plausible para poder desarrollar y probar. El admin puede editar,
 * añadir o sustituir equipos desde su panel antes del 8 de septiembre.
 */
export const DEFAULT_TEAMS: Team[] = [
  { id: 'real-madrid', name: 'Real Madrid', shortName: 'RMA', league: 'LaLiga', country: 'España', color: '#d8b45f' },
  { id: 'barcelona', name: 'FC Barcelona', shortName: 'BAR', league: 'LaLiga', country: 'España', color: '#a50044' },
  { id: 'atletico-madrid', name: 'Atlético de Madrid', shortName: 'ATM', league: 'LaLiga', country: 'España', color: '#cb3524' },
  { id: 'athletic-club', name: 'Athletic Club', shortName: 'ATH', league: 'LaLiga', country: 'España', color: '#ee2523' },
  { id: 'villarreal', name: 'Villarreal CF', shortName: 'VIL', league: 'LaLiga', country: 'España', color: '#ffe667' },

  { id: 'liverpool', name: 'Liverpool FC', shortName: 'LIV', league: 'Premier League', country: 'Inglaterra', color: '#c8102e' },
  { id: 'arsenal', name: 'Arsenal FC', shortName: 'ARS', league: 'Premier League', country: 'Inglaterra', color: '#ef0107' },
  { id: 'manchester-city', name: 'Manchester City', shortName: 'MCI', league: 'Premier League', country: 'Inglaterra', color: '#6cabdd' },
  { id: 'chelsea', name: 'Chelsea FC', shortName: 'CHE', league: 'Premier League', country: 'Inglaterra', color: '#034694' },
  { id: 'newcastle', name: 'Newcastle United', shortName: 'NEW', league: 'Premier League', country: 'Inglaterra', color: '#bbbbbb' },

  { id: 'inter', name: 'Inter de Milán', shortName: 'INT', league: 'Serie A', country: 'Italia', color: '#0068a8' },
  { id: 'milan', name: 'AC Milan', shortName: 'MIL', league: 'Serie A', country: 'Italia', color: '#fb090b' },
  { id: 'juventus', name: 'Juventus FC', shortName: 'JUV', league: 'Serie A', country: 'Italia', color: '#d0d0d0' },
  { id: 'napoli', name: 'SSC Napoli', shortName: 'NAP', league: 'Serie A', country: 'Italia', color: '#12a0d7' },
  { id: 'atalanta', name: 'Atalanta BC', shortName: 'ATA', league: 'Serie A', country: 'Italia', color: '#1d71b8' },

  { id: 'bayern', name: 'Bayern de Múnich', shortName: 'BAY', league: 'Bundesliga', country: 'Alemania', color: '#dc052d' },
  { id: 'leverkusen', name: 'Bayer Leverkusen', shortName: 'B04', league: 'Bundesliga', country: 'Alemania', color: '#e32221' },
  { id: 'dortmund', name: 'Borussia Dortmund', shortName: 'BVB', league: 'Bundesliga', country: 'Alemania', color: '#fde100' },
  { id: 'eintracht', name: 'Eintracht Frankfurt', shortName: 'SGE', league: 'Bundesliga', country: 'Alemania', color: '#e1000f' },

  { id: 'psg', name: 'Paris Saint-Germain', shortName: 'PSG', league: 'Ligue 1', country: 'Francia', color: '#004170' },
  { id: 'marsella', name: 'Olympique de Marsella', shortName: 'OM', league: 'Ligue 1', country: 'Francia', color: '#2faee0' },
  { id: 'monaco', name: 'AS Mónaco', shortName: 'ASM', league: 'Ligue 1', country: 'Francia', color: '#e63946' },
  { id: 'lille', name: 'Lille OSC', shortName: 'LIL', league: 'Ligue 1', country: 'Francia', color: '#e01e13' },

  { id: 'ajax', name: 'AFC Ajax', shortName: 'AJA', league: 'Eredivisie', country: 'Países Bajos', color: '#d2122e' },
  { id: 'psv', name: 'PSV Eindhoven', shortName: 'PSV', league: 'Eredivisie', country: 'Países Bajos', color: '#ed1c24' },
  { id: 'feyenoord', name: 'Feyenoord', shortName: 'FEY', league: 'Eredivisie', country: 'Países Bajos', color: '#e30613' },

  { id: 'benfica', name: 'SL Benfica', shortName: 'BEN', league: 'Primeira Liga', country: 'Portugal', color: '#e40521' },
  { id: 'sporting', name: 'Sporting CP', shortName: 'SCP', league: 'Primeira Liga', country: 'Portugal', color: '#008057' },
  { id: 'porto', name: 'FC Porto', shortName: 'POR', league: 'Primeira Liga', country: 'Portugal', color: '#0033a0' },

  { id: 'brujas', name: 'Club Brujas', shortName: 'CLB', league: 'Pro League', country: 'Bélgica', color: '#0d1e6e' },
  { id: 'union-sg', name: 'Union Saint-Gilloise', shortName: 'USG', league: 'Pro League', country: 'Bélgica', color: '#f5c518' },

  { id: 'celtic', name: 'Celtic FC', shortName: 'CEL', league: 'Scottish Premiership', country: 'Escocia', color: '#008a4f' },
  { id: 'olympiacos', name: 'Olympiacos FC', shortName: 'OLY', league: 'Super League', country: 'Grecia', color: '#d0021b' },
  { id: 'slavia', name: 'Slavia de Praga', shortName: 'SLA', league: 'Chance Liga', country: 'Chequia', color: '#d31245' },
  { id: 'salzburgo', name: 'Red Bull Salzburgo', shortName: 'RBS', league: 'Bundesliga austríaca', country: 'Austria', color: '#c8102e' },
  { id: 'bodo-glimt', name: 'Bodø/Glimt', shortName: 'BOD', league: 'Eliteserien', country: 'Noruega', color: '#ffe600' },
]

export const TEAM_COUNT = DEFAULT_TEAMS.length
