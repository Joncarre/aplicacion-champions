import type { Match } from '@/types'
import { madridToUtc } from '@/lib/date'

/**
 * Calendario oficial de la fase liga 2026/27.
 *
 * Las horas son de pared en España, tal y como las publica la UEFA. Se
 * convierten a instante absoluto con `madridToUtc`, que ya se encarga del
 * cambio de horario de verano: las jornadas 1 a 3 se juegan en CEST (UTC+2) y
 * de la 4 en adelante en CET (UTC+1).
 *
 * Cada partido es `[hora, local, visitante]`, con los identificadores de
 * `teams.ts`.
 */

type RawMatch = readonly [time: string, home: string, away: string]

interface MatchDay {
  readonly date: string
  readonly matches: readonly RawMatch[]
}

interface MatchdayFixtures {
  readonly matchday: number
  readonly days: readonly MatchDay[]
}

export const OFFICIAL_FIXTURES: readonly MatchdayFixtures[] = [
  {
    matchday: 1,
    days: [
      {
        date: '2026-09-08',
        matches: [
          ['18:45', 'aek-atenas', 'lask'],
          ['18:45', 'brujas', 'aston-villa'],
          ['21:00', 'dortmund', 'villarreal'],
          ['21:00', 'porto', 'manchester-city'],
          ['21:00', 'lille', 'betis'],
          ['21:00', 'real-madrid', 'inter'],
        ],
      },
      {
        date: '2026-09-09',
        matches: [
          ['18:45', 'barcelona', 'feyenoord'],
          ['18:45', 'stuttgart', 'viking'],
          ['21:00', 'liverpool', 'atletico-madrid'],
          ['21:00', 'psg', 'slovan'],
          ['21:00', 'sporting', 'galatasaray'],
          ['21:00', 'napoles', 'arsenal'],
        ],
      },
      {
        date: '2026-09-10',
        matches: [
          ['18:45', 'fenerbahce', 'roma'],
          ['18:45', 'psv', 'shakhtar'],
          ['21:00', 'como', 'leipzig'],
          ['21:00', 'bayern', 'bodo-glimt'],
          ['21:00', 'manchester-united', 'sabah'],
          ['21:00', 'slavia', 'lens'],
        ],
      },
    ],
  },
  {
    matchday: 2,
    days: [
      {
        date: '2026-10-13',
        matches: [
          ['18:45', 'lens', 'sporting'],
          ['18:45', 'sabah', 'slavia'],
          ['21:00', 'arsenal', 'lille'],
          ['21:00', 'atletico-madrid', 'manchester-united'],
          ['21:00', 'inter', 'brujas'],
          ['21:00', 'galatasaray', 'barcelona'],
          ['21:00', 'leipzig', 'psv'],
          ['21:00', 'viking', 'bayern'],
          ['21:00', 'villarreal', 'napoles'],
        ],
      },
      {
        date: '2026-10-14',
        matches: [
          ['18:45', 'feyenoord', 'como'],
          ['18:45', 'lask', 'liverpool'],
          ['21:00', 'roma', 'real-madrid'],
          ['21:00', 'aston-villa', 'fenerbahce'],
          ['21:00', 'shakhtar', 'aek-atenas'],
          ['21:00', 'bodo-glimt', 'dortmund'],
          ['21:00', 'manchester-city', 'psg'],
          ['21:00', 'betis', 'porto'],
          ['21:00', 'slovan', 'stuttgart'],
        ],
      },
    ],
  },
  {
    matchday: 3,
    days: [
      {
        date: '2026-10-20',
        matches: [
          ['18:45', 'fenerbahce', 'slavia'],
          ['18:45', 'sabah', 'dortmund'],
          ['21:00', 'roma', 'slovan'],
          ['21:00', 'porto', 'psv'],
          ['21:00', 'liverpool', 'villarreal'],
          ['21:00', 'manchester-city', 'aek-atenas'],
          ['21:00', 'psg', 'barcelona'],
          ['21:00', 'napoles', 'bodo-glimt'],
          ['21:00', 'stuttgart', 'atletico-madrid'],
        ],
      },
      {
        date: '2026-10-21',
        matches: [
          ['18:45', 'como', 'manchester-united'],
          ['18:45', 'lille', 'galatasaray'],
          ['21:00', 'aston-villa', 'viking'],
          ['21:00', 'brujas', 'lens'],
          ['21:00', 'bayern', 'arsenal'],
          ['21:00', 'inter', 'shakhtar'],
          ['21:00', 'real-madrid', 'leipzig'],
          ['21:00', 'betis', 'feyenoord'],
          ['21:00', 'sporting', 'lask'],
        ],
      },
    ],
  },
  {
    matchday: 4,
    days: [
      {
        date: '2026-11-03',
        matches: [
          ['18:45', 'shakhtar', 'sporting'],
          ['18:45', 'galatasaray', 'stuttgart'],
          ['21:00', 'atletico-madrid', 'bayern'],
          ['21:00', 'barcelona', 'aston-villa'],
          ['21:00', 'feyenoord', 'inter'],
          ['21:00', 'bodo-glimt', 'lille'],
          ['21:00', 'lask', 'slovan'],
          ['21:00', 'manchester-united', 'roma'],
          ['21:00', 'villarreal', 'psg'],
        ],
      },
      {
        date: '2026-11-04',
        matches: [
          ['18:45', 'aek-atenas', 'real-madrid'],
          ['18:45', 'fenerbahce', 'liverpool'],
          ['21:00', 'dortmund', 'betis'],
          ['21:00', 'porto', 'napoles'],
          ['21:00', 'psv', 'brujas'],
          ['21:00', 'leipzig', 'manchester-city'],
          ['21:00', 'lens', 'como'],
          ['21:00', 'slavia', 'arsenal'],
          ['21:00', 'viking', 'sabah'],
        ],
      },
    ],
  },
  {
    matchday: 5,
    days: [
      {
        date: '2026-11-24',
        matches: [
          ['18:45', 'bodo-glimt', 'lask'],
          ['18:45', 'galatasaray', 'aston-villa'],
          ['21:00', 'arsenal', 'dortmund'],
          ['21:00', 'como', 'aek-atenas'],
          ['21:00', 'feyenoord', 'porto'],
          ['21:00', 'manchester-city', 'napoles'],
          ['21:00', 'leipzig', 'lens'],
          ['21:00', 'real-madrid', 'psv'],
          ['21:00', 'slovan', 'betis'],
        ],
      },
      {
        date: '2026-11-25',
        matches: [
          ['18:45', 'sabah', 'barcelona'],
          ['18:45', 'slavia', 'villarreal'],
          ['21:00', 'atletico-madrid', 'viking'],
          ['21:00', 'brujas', 'liverpool'],
          ['21:00', 'inter', 'stuttgart'],
          ['21:00', 'shakhtar', 'fenerbahce'],
          ['21:00', 'lille', 'bayern'],
          ['21:00', 'psg', 'roma'],
          ['21:00', 'sporting', 'manchester-united'],
        ],
      },
    ],
  },
  {
    matchday: 6,
    days: [
      {
        date: '2026-12-08',
        matches: [
          ['18:45', 'viking', 'feyenoord'],
          ['18:45', 'villarreal', 'sabah'],
          ['21:00', 'aek-atenas', 'galatasaray'],
          ['21:00', 'roma', 'sporting'],
          ['21:00', 'aston-villa', 'psg'],
          ['21:00', 'barcelona', 'manchester-city'],
          ['21:00', 'bayern', 'slavia'],
          ['21:00', 'manchester-united', 'leipzig'],
          ['21:00', 'napoles', 'brujas'],
        ],
      },
      {
        date: '2026-12-09',
        matches: [
          ['18:45', 'betis', 'como'],
          ['18:45', 'slovan', 'shakhtar'],
          ['21:00', 'arsenal', 'real-madrid'],
          ['21:00', 'dortmund', 'inter'],
          ['21:00', 'lask', 'fenerbahce'],
          ['21:00', 'liverpool', 'porto'],
          ['21:00', 'psv', 'atletico-madrid'],
          ['21:00', 'lens', 'bodo-glimt'],
          ['21:00', 'stuttgart', 'lille'],
        ],
      },
    ],
  },
  {
    matchday: 7,
    days: [
      {
        date: '2027-01-19',
        matches: [
          ['18:45', 'bodo-glimt', 'atletico-madrid'],
          ['18:45', 'galatasaray', 'feyenoord'],
          ['21:00', 'aek-atenas', 'roma'],
          ['21:00', 'aston-villa', 'dortmund'],
          ['21:00', 'inter', 'liverpool'],
          ['21:00', 'porto', 'slavia'],
          ['21:00', 'lille', 'slovan'],
          ['21:00', 'real-madrid', 'lask'],
          ['21:00', 'stuttgart', 'brujas'],
        ],
      },
      {
        date: '2027-01-20',
        matches: [
          ['18:45', 'fenerbahce', 'villarreal'],
          ['18:45', 'sabah', 'napoles'],
          ['21:00', 'como', 'psg'],
          ['21:00', 'manchester-united', 'bayern'],
          ['21:00', 'leipzig', 'shakhtar'],
          ['21:00', 'lens', 'manchester-city'],
          ['21:00', 'betis', 'arsenal'],
          ['21:00', 'sporting', 'barcelona'],
          ['21:00', 'viking', 'psv'],
        ],
      },
    ],
  },
  {
    // La última jornada se juega entera en simultáneo.
    matchday: 8,
    days: [
      {
        date: '2027-01-27',
        matches: [
          ['21:00', 'arsenal', 'sabah'],
          ['21:00', 'roma', 'lille'],
          ['21:00', 'atletico-madrid', 'fenerbahce'],
          ['21:00', 'dortmund', 'aek-atenas'],
          ['21:00', 'brujas', 'bodo-glimt'],
          ['21:00', 'bayern', 'betis'],
          ['21:00', 'barcelona', 'como'],
          ['21:00', 'shakhtar', 'real-madrid'],
          ['21:00', 'feyenoord', 'leipzig'],
          ['21:00', 'lask', 'porto'],
          ['21:00', 'liverpool', 'lens'],
          ['21:00', 'manchester-city', 'sporting'],
          ['21:00', 'psg', 'galatasaray'],
          ['21:00', 'psv', 'stuttgart'],
          ['21:00', 'slavia', 'aston-villa'],
          ['21:00', 'napoles', 'viking'],
          ['21:00', 'villarreal', 'manchester-united'],
          ['21:00', 'slovan', 'inter'],
        ],
      },
    ],
  },
]

/**
 * Convierte el calendario oficial en partidos listos para guardar.
 *
 * Los identificadores (`md1-01`, `md1-02`…) siguen el orden de esta lista y son
 * estables, que es lo que permite que las apuestas ya guardadas sigan apuntando
 * al partido correcto si hay que volver a sembrar el calendario.
 */
export function buildOfficialMatches(): Match[] {
  return OFFICIAL_FIXTURES.flatMap((matchday) => {
    let index = 0
    return matchday.days.flatMap((day) =>
      day.matches.map(([time, homeTeamId, awayTeamId]) => {
        index++
        return {
          id: `md${matchday.matchday}-${String(index).padStart(2, '0')}`,
          matchday: matchday.matchday,
          homeTeamId,
          awayTeamId,
          kickoff: madridToUtc(`${day.date}T${time}`),
          homeGoals: null,
          awayGoals: null,
        }
      }),
    )
  })
}
