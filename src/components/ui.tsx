import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'

/* ────────────────────────────── Cabecera de página ────────────────────────────── */

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="safe-top flex items-start justify-between gap-3 pt-6 pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-mute">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </header>
  )
}

/* ────────────────────────────── Avisos ────────────────────────────── */

const TONES = {
  info: { icon: Info, box: 'border-brand/30 bg-brand/10 text-brand-soft' },
  success: { icon: CircleCheck, box: 'border-exact/30 bg-exact/10 text-exact' },
  warning: { icon: TriangleAlert, box: 'border-sign/30 bg-sign/10 text-sign' },
  error: { icon: CircleAlert, box: 'border-miss/30 bg-miss/10 text-miss' },
} as const

interface AlertProps {
  tone?: keyof typeof TONES
  children: ReactNode
  className?: string
}

export function Alert({ tone = 'info', children, className = '' }: AlertProps) {
  const { icon: Icon, box } = TONES[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${box} ${className}`}
    >
      <Icon size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 leading-relaxed">{children}</span>
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

export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid grid-flow-col rounded-xl border border-line bg-surface p-1"
    >
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
              'min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors duration-200',
              selected ? 'bg-raised text-ink shadow-lift' : 'text-ink-mute hover:text-ink-soft',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
