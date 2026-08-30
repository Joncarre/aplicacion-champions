import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** `true` cuando lo que se va a hacer no tiene vuelta atrás. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Diálogo de confirmación.
 *
 * Sube desde el borde inferior, que es donde está el pulgar, y se apoya en un
 * fondo desenfocado en vez de en un marco. Se cierra con Escape, tocando fuera
 * o con el botón de cancelar, que es donde entra el foco: la salida segura
 * siempre es la más fácil de alcanzar.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-end justify-center bg-base/80 p-4 backdrop-blur-md sm:items-center"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="safe-bottom animate-page w-full max-w-xs rounded-3xl bg-surface px-6 pt-7 pb-6 text-center shadow-lift"
      >
        <span
          aria-hidden="true"
          className="mx-auto block h-[2px] w-10 rounded-full"
          style={{
            background: `linear-gradient(to right, transparent, var(--color-${destructive ? 'miss' : 'brand'}), transparent)`,
          }}
        />

        <h2 className="mt-5 font-display text-lg font-bold text-ink">{title}</h2>
        {description ? (
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-mute">{description}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={['btn btn-sm w-full', destructive ? 'bg-miss/90 text-white' : 'bg-brand text-white'].join(' ')}
          >
            {confirmLabel}
          </button>
          <button type="button" autoFocus onClick={onCancel} className="btn-quiet btn-sm w-full">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
