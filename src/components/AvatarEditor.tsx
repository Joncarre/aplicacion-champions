import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampOffset,
  coverScale,
  cropToDataUrl,
  type CropTransform,
} from '@/lib/image'
import { Spinner } from './Spinner'

const VIEWPORT = 264

interface AvatarEditorProps {
  image: HTMLImageElement
  saving: boolean
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
}

/**
 * Editor de la foto de perfil: se arrastra para encuadrar y se acerca con el
 * control de zoom. Lo que se ve dentro del círculo es exactamente lo que se
 * guarda, porque el recorte usa la misma transformación.
 */
export function AvatarEditor({ image, saving, onCancel, onConfirm }: AvatarEditorProps) {
  const [transform, setTransform] = useState<CropTransform>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    viewport: VIEWPORT,
  })
  const dragging = useRef<{ pointerId: number; startX: number; startY: number } | null>(null)

  // Cerrar con Escape, como cualquier diálogo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const scale = coverScale(image, VIEWPORT) * transform.zoom
  const width = (image.naturalWidth || image.width) * scale
  const height = (image.naturalHeight || image.height) * scale

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = {
      pointerId: event.pointerId,
      startX: event.clientX - transform.offsetX,
      startY: event.clientY - transform.offsetY,
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragging.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setTransform((current) =>
      clampOffset(image, {
        ...current,
        offsetX: event.clientX - drag.startX,
        offsetY: event.clientY - drag.startY,
      }),
    )
  }

  function endDrag() {
    dragging.current = null
  }

  function setZoom(zoom: number) {
    setTransform((current) =>
      clampOffset(image, { ...current, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar la foto de perfil"
      className="fixed inset-0 z-50 flex items-end justify-center bg-base/85 backdrop-blur-sm sm:items-center"
    >
      <div className="safe-bottom w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 shadow-lift sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Ajusta tu foto</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar"
            className="btn-quiet min-h-10 px-2"
            disabled={saving}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-1 text-xs text-ink-mute">Arrastra para encuadrar y usa el control para acercar.</p>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ width: VIEWPORT, height: VIEWPORT }}
          className="relative mx-auto mt-4 touch-none overflow-hidden rounded-full border-2 border-line bg-base select-none"
        >
          <img
            src={image.src}
            alt=""
            draggable={false}
            style={{
              width,
              height,
              maxWidth: 'none',
              transform: `translate(${VIEWPORT / 2 - width / 2 + transform.offsetX}px, ${
                VIEWPORT / 2 - height / 2 + transform.offsetY
              }px)`,
            }}
            className="pointer-events-none absolute top-0 left-0"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom(transform.zoom - 0.25)}
            aria-label="Alejar"
            disabled={saving || transform.zoom <= MIN_ZOOM}
            className="btn-ghost min-h-10 px-3"
          >
            <Minus size={16} aria-hidden="true" />
          </button>

          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.02}
            value={transform.zoom}
            aria-label="Nivel de zoom"
            disabled={saving}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-[var(--color-brand)]"
          />

          <button
            type="button"
            onClick={() => setZoom(transform.zoom + 0.25)}
            aria-label="Acercar"
            disabled={saving || transform.zoom >= MAX_ZOOM}
            className="btn-ghost min-h-10 px-3"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onConfirm(cropToDataUrl(image, transform))}
            className="btn-primary flex-1"
          >
            {saving ? <Spinner label="Guardando" /> : 'Guardar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
