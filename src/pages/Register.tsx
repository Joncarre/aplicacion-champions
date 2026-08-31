import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { MIN_PASSWORD_LENGTH, normalizeNickname, validateRegistration, type RegisterInput } from '@/services/auth'
import { BackButton } from '@/components/BackButton'
import { Reveal } from '@/components/Reveal'
import { Spinner } from '@/components/Spinner'
import { Alert, UNDERLINE_INPUT, UnderlineField } from '@/components/ui'

const EMPTY: RegisterInput = { nombre: '', apellidos: '', nickname: '', password: '' }

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<RegisterInput>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  /** Nickname ya normalizado, que es con el que tendrá que entrar. */
  const [created, setCreated] = useState<string | null>(null)

  const update = (field: keyof RegisterInput) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

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
      setCreated(normalizeNickname(form.nickname))
      setStatus('done')
    } catch (cause) {
      setStatus('idle')
      setMessage(cause instanceof Error ? cause.message : 'No se ha podido crear la cuenta')
    }
  }

  const disabled = status !== 'idle'

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-12">
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

      <main className="flex-1 pt-8">
        <Reveal as="p" className="text-center font-mono text-[10px] tracking-[0.22em] text-gold uppercase">
          Únete a la porra
        </Reveal>

        <Reveal
          as="h1"
          delay={80}
          className="mt-3 text-center font-display text-3xl font-bold tracking-tight text-ink"
        >
          Crear cuenta
        </Reveal>

        <Reveal as="p" delay={140} className="mx-auto mt-3 max-w-xs text-center font-mono text-[11px] leading-relaxed text-ink-mute">
          Tendré que marcarte como pagado antes de que puedas apostar.
        </Reveal>

        <Reveal delay={200} className="mt-10">
          <form onSubmit={onSubmit} className="space-y-7" noValidate>
            {/* Nombre y apellidos comparten línea: son dos mitades del mismo dato. */}
            <div className="grid grid-cols-2 gap-4">
              <UnderlineField id="nombre" label="Nombre" error={errors.nombre}>
                <input
                  id="nombre"
                  className={UNDERLINE_INPUT}
                  value={form.nombre}
                  onChange={update('nombre')}
                  autoComplete="given-name"
                  disabled={disabled}
                  aria-invalid={Boolean(errors.nombre)}
                />
              </UnderlineField>

              <UnderlineField id="apellidos" label="Apellidos" error={errors.apellidos}>
                <input
                  id="apellidos"
                  className={UNDERLINE_INPUT}
                  value={form.apellidos}
                  onChange={update('apellidos')}
                  autoComplete="family-name"
                  disabled={disabled}
                  aria-invalid={Boolean(errors.apellidos)}
                />
              </UnderlineField>
            </div>

            <UnderlineField
              id="nickname"
              label="Nickname"
              error={errors.nickname}
              hint="Único y para siempre. Con él inicias sesión."
            >
              <input
                id="nickname"
                className={`${UNDERLINE_INPUT} lowercase`}
                value={form.nickname}
                onChange={update('nickname')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={disabled}
                aria-invalid={Boolean(errors.nickname)}
              />
            </UnderlineField>

            <UnderlineField
              id="password"
              label="Contraseña"
              error={errors.password}
              hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
            >
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${UNDERLINE_INPUT} pr-11`}
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
                className="absolute -top-1 right-0 grid size-10 place-items-center text-ink-mute hover:text-ink-soft"
              >
                {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </UnderlineField>

            {message ? <Alert tone="error">{message}</Alert> : null}

            <button type="submit" className="btn-primary btn-sm mx-auto block px-14" disabled={disabled}>
              {status === 'saving' ? <Spinner label="Creando la cuenta" /> : 'Crear cuenta'}
            </button>
          </form>
        </Reveal>

        <p className="mt-10 text-center font-mono text-[11px] text-ink-mute">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-soft hover:underline">
            Inicia sesión
          </Link>
        </p>
      </main>

      {/*
        El nickname es lo único que no se puede recuperar desde la app: se
        normaliza al guardarlo y con él se inicia sesión. Así que en vez de un
        aviso que se va solo, la cuenta se estrena con una tarjeta en el centro
        que hay que cerrar a mano, y ahí queda escrito.
      */}
      {created ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cuenta-creada"
          className="fixed inset-0 z-50 grid place-items-center bg-base/85 px-6 backdrop-blur-sm"
        >
          <div className="w-full max-w-xs rounded-3xl border border-line bg-surface p-7 text-center shadow-lift">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-exact/12 text-exact">
              <Check size={26} aria-hidden="true" />
            </span>

            <h2 id="cuenta-creada" className="mt-5 font-display text-xl font-bold text-ink">
              ¡Cuenta creada!
            </h2>

            <p className="mt-2.5 text-sm leading-relaxed text-balance text-ink-soft">
              Recuerda usar tu nickname{' '}
              <strong className="font-mono font-semibold text-brand-soft">{created}</strong> para iniciar sesión.
            </p>

            <span aria-hidden="true" className="rule-taper mx-auto mt-5 block w-20" />

            <button type="button" autoFocus onClick={() => navigate('/')} className="btn-primary btn-sm mt-5 w-full">
              Aceptar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
