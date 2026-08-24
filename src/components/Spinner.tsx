export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink-soft" role="status">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-line border-t-brand"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** Pantalla de carga a página completa, para las esperas de arranque. */
export function FullPageLoader({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-base">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-line border-t-brand"
        />
        <p className="text-sm text-ink-mute">{label}…</p>
      </div>
    </div>
  )
}
