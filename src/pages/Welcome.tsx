import { Link } from 'react-router-dom'
import { CalendarDays, Trophy, Users } from 'lucide-react'
import { GithubIcon } from '@/components/icons'
import { EXTRAS_DEADLINE } from '@/data/calendar'
import { formatFullDate } from '@/lib/date'
import { POINTS } from '@/lib/scoring'

const HIGHLIGHTS = [
  {
    Icon: CalendarDays,
    title: 'Los 144 partidos de la fase liga',
    body: 'Pronostica el marcador de cada jornada. Cada partido se cierra justo cuando arranca.',
  },
  {
    Icon: Trophy,
    title: `${POINTS.sign} punto por el signo, ${POINTS.exact} por el marcador`,
    body: `Y las dos apuestas gordas: ${POINTS.topScorer} puntos por el máximo goleador y ${POINTS.champion} por el campeón.`,
  },
  {
    Icon: Users,
    title: 'Solo entre nosotros',
    body: 'Una porra privada. Nada de dinero en la web: eso se arregla como siempre, en persona.',
  },
]

export default function Welcome() {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5">
      {/* Resplandor decorativo detrás del titular. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 opacity-70"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 0%, color-mix(in oklab, var(--color-brand) 32%, transparent) 0%, transparent 70%)',
        }}
      />
      <main className="safe-top flex flex-1 flex-col justify-center py-12">
        <p className="font-mono text-xs tracking-[0.22em] text-gold uppercase">Temporada 2026/27</p>

        <h1 className="mt-3 font-display text-5xl leading-[0.95] font-extrabold tracking-tight text-balance text-ink">
          La porra de la <span className="text-brand-soft">Champions</span>
        </h1>

        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Ocho jornadas de fase liga, treinta y seis equipos y una clasificación que no perdona. Aquí apostamos
          los resultados, se cuentan los aciertos y se ve quién manda de verdad.
        </p>

        <ul className="mt-9 space-y-3">
          {HIGHLIGHTS.map(({ Icon, title, body }) => (
            <li key={title} className="card flex gap-3.5 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-soft">
                <Icon size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-mute">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-9 space-y-3">
          <Link to="/registro" className="btn-primary w-full">
            Crear cuenta
          </Link>
          <Link to="/login" className="btn-ghost w-full">
            Iniciar sesión
          </Link>
        </div>

        <p className="mt-5 text-center text-xs text-ink-mute">
          Las apuestas de máximo goleador y campeón se cierran el {formatFullDate(EXTRAS_DEADLINE)}.
        </p>
      </main>

      <footer className="safe-bottom border-t border-line-soft py-6 text-center">
        <p className="text-xs text-ink-mute">
          Desarrollado por <span className="font-medium text-ink-soft">Jonathan Carrero</span>
        </p>
        <a
          href="https://github.com/joncarre"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2.5 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          <GithubIcon className="size-[18px]" />
          <span>@joncarre</span>
        </a>
      </footer>
    </div>
  )
}
