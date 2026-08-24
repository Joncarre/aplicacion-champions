import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useDemoBackend } from '@/services/backend'
import { Alert, Field } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-12">
      <div className="safe-top pt-5">
        <Link to="/" className="btn-quiet -ml-3 gap-1.5 px-3">
          <ArrowLeft size={17} aria-hidden="true" />
          Volver
        </Link>
      </div>

      <main className="flex-1 pt-6">
        <h1 className="font-display text-4xl leading-tight font-extrabold tracking-tight text-ink">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-ink-soft">Con el nickname que elegiste al registrarte.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
          <Field label="Nickname" htmlFor="nickname">
            <input
              id="nickname"
              className="field lowercase"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={saving}
            />
          </Field>

          <Field label="Contraseña" htmlFor="password">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="field pr-12"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-mute hover:text-ink-soft"
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </Field>

          {error ? <Alert tone="error">{error}</Alert> : null}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? <Spinner label="Entrando" /> : 'Entrar'}
          </button>
        </form>

        {useDemoBackend ? (
          <Alert tone="info" className="mt-6">
            Modo demo: entra con <strong>joncarre</strong> y la contraseña <strong>champions</strong> para ver el
            panel de administración, o con <strong>lucia</strong> para ver la app como participante.
          </Alert>
        ) : null}

        <p className="mt-6 text-center text-sm text-ink-mute">
          ¿Todavía no tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-brand-soft hover:underline">
            Créala aquí
          </Link>
        </p>
      </main>
    </div>
  )
}
