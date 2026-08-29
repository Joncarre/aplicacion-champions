import { Link } from 'react-router-dom'
import { GithubIcon } from '@/components/icons'

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
          Ocho jornadas de fase liga, treinta y seis equipos y una clasificación que no perdona. Aquí apostamos los
          resultados, se cuentan los aciertos y se ve quién manda de verdad.
        </p>

        <div className="mt-10 space-y-3">
          <Link to="/registro" className="btn-primary w-full">
            Crear cuenta
          </Link>
          <Link to="/login" className="btn-ghost w-full">
            Iniciar sesión
          </Link>
        </div>
      </main>

      <footer className="safe-bottom border-t border-line-soft py-6">
        <p className="flex items-center justify-center gap-2 text-xs text-ink-mute">
          Desarrollado por{' '}
          <a
            href="https://github.com/joncarre"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Jonathan Carrero
            <GithubIcon className="size-4" />
          </a>
        </p>
      </footer>
    </div>
  )
}
