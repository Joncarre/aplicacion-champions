import { useEffect, useRef } from 'react'
import { MATCHDAY_WINDOWS } from '@/data/calendar'

interface MatchdayPickerProps {
  value: number
  onChange: (matchday: number) => void
  /** Jornada abierta a apuestas, que se señala con un punto. */
  currentMatchday: number
}

/**
 * Selector de jornada deslizable. En móvil se arrastra con el dedo y la
 * jornada elegida se centra sola al entrar en la pantalla.
 */
export function MatchdayPicker({ value, onChange, currentMatchday }: MatchdayPickerProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [value])

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Jornadas de la fase liga"
      className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {MATCHDAY_WINDOWS.map((window) => {
        const selected = window.matchday === value
        const isCurrent = window.matchday === currentMatchday

        return (
          <button
            key={window.matchday}
            ref={selected ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(window.matchday)}
            className={[
              'flex min-h-16 shrink-0 snap-center flex-col items-start justify-center gap-0.5 rounded-xl border px-4',
              'transition-colors duration-200',
              selected
                ? 'border-brand/50 bg-brand/12 text-ink'
                : 'border-line bg-surface text-ink-mute hover:border-line hover:text-ink-soft',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5 text-sm font-bold">
              Jornada {window.matchday}
              {isCurrent ? (
                <span
                  aria-label="jornada en curso"
                  className="size-1.5 rounded-full bg-exact"
                />
              ) : null}
            </span>
            <span className="text-[11px] whitespace-nowrap">{window.label}</span>
          </button>
        )
      })}
    </div>
  )
}
