import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { BackButton } from '@/components/BackButton'
import { Reveal } from '@/components/Reveal'
import { Spinner } from '@/components/Spinner'
import { Alert, UNDERLINE_INPUT, UnderlineField } from '@/components/ui'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError(null)
    try {
      await login(nickname, password)
      navigate('/clasificacion', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido iniciar sesión')
      setSaving(false)
    }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-12">
      {/* El mismo resplandor de la bienvenida, para que la entrada no cambie de mundo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 0%, color-mix(in oklab, var(--color-brand) 26%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="safe-top pt-5">
        <BackButton />
      </div>

      <main className="flex flex-1 flex-col justify-center py-8">
        <Reveal as="p" className="text-center font-mono text-[10px] tracking-[0.22em] text-gold uppercase">
          Temporada 2026/27
        </Reveal>

        <Reveal
          as="h1"
          delay={80}
          className="mt-3 text-center font-display text-3xl font-bold tracking-tight text-ink"
        >
          Bienvenido de vuelta
        </Reveal>

        <Reveal delay={160} className="mt-10">
          <form onSubmit={onSubmit} className="space-y-7" noValidate>
            <UnderlineField id="nickname" label="Nickname">
              <input
                id="nickname"
                className={`${UNDERLINE_INPUT} lowercase`}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={saving}
              />
            </UnderlineField>

            <UnderlineField id="password" label="Contraseña">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${UNDERLINE_INPUT} pr-11`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute -top-1 right-0 grid size-10 place-items-center text-ink-mute hover:text-ink-soft"
              >
                {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </UnderlineField>

            {error ? <Alert tone="error">{error}</Alert> : null}

            <button type="submit" className="btn-primary btn-sm mx-auto block px-14" disabled={saving}>
              {saving ? <Spinner label="Entrando" /> : 'Entrar'}
            </button>
          </form>
        </Reveal>

        <Reveal as="p" delay={240} className="mt-10 text-center font-mono text-[11px] text-ink-mute">
          ¿Todavía no tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-brand-soft hover:underline">
            Créala aquí
          </Link>
        </Reveal>
      </main>
    </div>
  )
}
