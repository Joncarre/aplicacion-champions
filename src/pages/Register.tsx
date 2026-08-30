import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { MIN_PASSWORD_LENGTH, normalizeNickname, validateRegistration, type RegisterInput } from '@/services/auth'
import { Alert, Field } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { Spinner } from '@/components/Spinner'

const EMPTY: RegisterInput = { nombre: '', apellidos: '', nickname: '', password: '' }

/** Tras crear la cuenta se vuelve a Bienvenida, con un respiro para leer el aviso. */
const REDIRECT_DELAY = 2200

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<RegisterInput>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const update = (field: keyof RegisterInput) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (status !== 'idle') return

    const found = validateRegistration(form)
    if (found) {
      setErrors(found)
      setMessage(null)
      return
    }

    setStatus('saving')
    setMessage(null)
    try {
      await register(form)
      setStatus('done')
      setMessage(`¡Cuenta creada! Ya puedes iniciar sesión como ${normalizeNickname(form.nickname)}.`)
      timer.current = setTimeout(() => navigate('/'), REDIRECT_DELAY)
    } catch (cause) {
      setStatus('idle')
      setMessage(cause instanceof Error ? cause.message : 'No se ha podido crear la cuenta')
    }
  }

  const disabled = status !== 'idle'

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-12">
      <div className="safe-top pt-5">
        <Link to="/" className="btn-quiet -ml-3 gap-1.5 px-3">
          <ArrowLeft size={17} aria-hidden="true" />
          Volver
        </Link>
      </div>

      <main className="flex-1 pt-6">
        <h1 className="font-display text-4xl leading-tight font-extrabold tracking-tight text-ink">Crear cuenta</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Cuando te registres tendré que marcarte como pagado antes de que puedas apostar. Avísame y lo hago.
        </p>

        <Reveal className="mt-8">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field label="Nombre" htmlFor="nombre" error={errors.nombre}>
            <input
              id="nombre"
              className="field"
              value={form.nombre}
              onChange={update('nombre')}
              autoComplete="given-name"
              disabled={disabled}
              aria-invalid={Boolean(errors.nombre)}
            />
          </Field>

          <Field label="Apellidos" htmlFor="apellidos" error={errors.apellidos}>
            <input
              id="apellidos"
              className="field"
              value={form.apellidos}
              onChange={update('apellidos')}
              autoComplete="family-name"
              disabled={disabled}
              aria-invalid={Boolean(errors.apellidos)}
            />
          </Field>

          <Field
            label="Nickname"
            htmlFor="nickname"
            error={errors.nickname}
            hint="Es único y no se puede cambiar después. Con él inicias sesión."
          >
            <input
              id="nickname"
              className="field lowercase"
              value={form.nickname}
              onChange={update('nickname')}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={disabled}
              aria-invalid={Boolean(errors.nickname)}
            />
          </Field>

          <Field
            label="Contraseña"
            htmlFor="password"
            error={errors.password}
            hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
          >
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="field pr-12"
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
                disabled={disabled}
                aria-invalid={Boolean(errors.password)}
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

          {message ? <Alert tone={status === 'done' ? 'success' : 'error'}>{message}</Alert> : null}

          <button type="submit" className="btn-primary btn-sm mx-auto block px-14" disabled={disabled}>
            {status === 'saving' ? <Spinner label="Creando la cuenta" /> : 'Crear cuenta'}
          </button>
          </form>
        </Reveal>

        <p className="mt-6 text-center text-sm text-ink-mute">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-soft hover:underline">
            Inicia sesión
          </Link>
        </p>
      </main>
    </div>
  )
}
