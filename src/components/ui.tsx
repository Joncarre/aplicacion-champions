import type { ReactNode } from 'react'

/* ────────────────────────────── Cabecera de página ────────────────────────────── */

interface PageHeaderProps {
  title: string
  /** Acción opcional a la derecha, como el acceso al panel de administración. */
  action?: ReactNode
}

/**
 * Cabecera de pantalla con el título centrado.
 *
 * La rejilla de tres columnas con los laterales iguales es lo que mantiene el
 * título en el centro exacto, esté o no la acción de la derecha.
 */
export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="safe-top grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-6 pb-5">
      <span aria-hidden="true" />
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
      <div className="justify-self-end">{action}</div>
    </header>
  )
}

/* ────────────────────────────── Avisos ────────────────────────────── */

const TONES = {
  info: { text: 'text-brand-soft', tint: 'var(--color-brand)' },
  success: { text: 'text-exact', tint: 'var(--color-exact)' },
  warning: { text: 'text-sign', tint: 'var(--color-sign)' },
  pending: { text: 'text-pending', tint: 'var(--color-pending)' },
  error: { text: 'text-miss', tint: 'var(--color-miss)' },
} as const

interface AlertProps {
  tone?: keyof typeof TONES
  children: ReactNode
  className?: string
}

/**
 * Aviso breve, en una sola línea siempre que se pueda.
 *
 * Solo texto en monoespaciada sobre un tinte que se desvanece hacia la
 * derecha. Sin icono ni marco: el color ya dice de qué tipo de mensaje se
 * trata, y así se lee como una nota del sistema y no como un cartel.
 */
export function Alert({ tone = 'info', children, className = '' }: AlertProps) {
  const { text, tint } = TONES[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        background: `linear-gradient(to right, color-mix(in oklab, ${tint} 14%, transparent), transparent 65%)`,
      }}
      className={`overflow-hidden rounded-lg px-3.5 py-2.5 font-mono text-[11px] leading-snug tracking-tight ${text} ${className}`}
    >
      {children}
    </div>
  )
}

/* ────────────────────────────── Campo de formulario ────────────────────────────── */

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-miss">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-mute">{hint}</p>
      ) : null}
    </div>
  )
}

/* ────────────────────────────── Estados vacíos ────────────────────────────── */

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon ? <div className="text-ink-mute">{icon}</div> : null}
      <div className="space-y-1">
        <p className="font-display text-lg font-bold text-ink">{title}</p>
        {description ? <p className="text-sm text-ink-mute">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

/* ────────────────────────────── Selector de pestañas ────────────────────────────── */

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/**
 * Selector de pestañas con indicador deslizante.
 *
 * En vez de encender y apagar el fondo de cada opción, hay una sola pastilla
 * que se desplaza: el movimiento cuenta de dónde vienes y adónde vas, y la
 * transición hace que el cambio no sea un parpadeo.
 */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative isolate flex rounded-full bg-surface p-1"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 -z-10 rounded-full bg-brand/22 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />

      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={[
              'min-h-10 flex-1 rounded-full px-3 font-display text-sm font-semibold transition-colors duration-200',
              selected ? 'text-brand-light' : 'text-ink-mute hover:text-ink-soft',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
