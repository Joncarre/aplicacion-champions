import { useMemo } from 'react'
import { MATCHDAY_WINDOWS } from '@/data/calendar'

interface MatchdayPickerProps {
  value: number
  onChange: (matchday: number) => void
  /** Jornada abierta a apuestas. */
  currentMatchday: number
}

/**
 * Selector de jornada en forma de línea de tiempo.
 *
 * En vez de ocho tarjetas que hay que arrastrar, se ven las ocho jornadas de
 * un vistazo sobre una línea que se va rellenando conforme avanza la
 * competición: sólidas las jugadas, con anillo verde la que está abierta y
 * huecas las que quedan. Debajo, la jornada elegida con sus fechas.
 */
export function MatchdayPicker({ value, onChange, currentMatchday }: MatchdayPickerProps) {
  const selected = useMemo(
    () => MATCHDAY_WINDOWS.find((w) => w.matchday === value) ?? MATCHDAY_WINDOWS[0],
    [value],
  )

  const total = MATCHDAY_WINDOWS.length
  // La línea de progreso llega hasta el centro de la jornada en curso.
  const progress = total > 1 ? (currentMatchday - 1) / (total - 1) : 0

  return (
    <section className="card overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 px-4 pt-4">
        <h2 className="font-display text-xl leading-none font-extrabold text-ink">Jornada {value}</h2>
        <p className="font-mono text-[11px] whitespace-nowrap text-ink-mute">{selected?.label}</p>
      </header>

      <div className="px-4 pt-5 pb-4">
        {/*
          El raíl se posiciona respecto a esta caja, cuya altura la marca la
          propia fila de botones: así `top-1/2` cae exactamente en el centro de
          los círculos, sin depender de los rellenos de alrededor. Los extremos
          se recortan a 1/16 del ancho, que es donde está el centro del primer
          y del último círculo con ocho columnas iguales.
        */}
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-[6.25%] left-[6.25%] h-0.5 -translate-y-1/2 rounded-full bg-line"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-[6.25%] h-0.5 -translate-y-1/2 rounded-full bg-brand/50 transition-[width] duration-500"
            style={{ width: `calc(87.5% * ${progress})` }}
          />

          <div role="tablist" aria-label="Jornadas de la fase liga" className="relative grid grid-cols-8">
            {MATCHDAY_WINDOWS.map((window) => {
              const isSelected = window.matchday === value
              const isCurrent = window.matchday === currentMatchday
              const isPast = window.matchday < currentMatchday

              return (
                <button
                  key={window.matchday}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`Jornada ${window.matchday}, ${window.label}${isCurrent ? ', en curso' : ''}`}
                  onClick={() => onChange(window.matchday)}
                  className="flex min-h-11 items-center justify-center"
                >
                  <span
                    className={[
                      'grid size-8 place-items-center rounded-full font-mono text-xs font-bold',
                      'transition-all duration-200',
                      isSelected
                        ? 'bg-brand text-white ring-4 ring-brand/20'
                        : isCurrent
                          ? 'border-2 border-exact bg-surface text-exact'
                          : isPast
                            ? 'border border-line bg-raised text-ink-soft'
                            : 'border border-line-soft bg-surface text-ink-mute',
                    ].join(' ')}
                  >
                    {window.matchday}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
