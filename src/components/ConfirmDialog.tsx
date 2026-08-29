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
 * Diálogo de confirmación. Se cierra con Escape y el foco entra directamente
 * en el botón de cancelar, que es la salida segura.
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-base/85 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="safe-bottom animate-page w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-lift">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p> : null}

        <div className="mt-6 flex gap-2">
          <button type="button" autoFocus onClick={onCancel} className="btn-ghost flex-1">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={['btn flex-1', destructive ? 'bg-miss text-white' : 'bg-brand text-white'].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
