import { POINTS } from '@/lib/scoring'

interface ProfileStatsProps {
  position: number | null
  participants: number
  totalPoints: number
  exactHits: number
  signHits: number
  /** Puntos venidos de máximo goleador y campeón, si ya los hay. */
  extraPoints: number
}

/**
 * Resumen del rendimiento del usuario en un solo bloque.
 *
 * Arriba la posición, que es lo primero que uno mira, con el anillo dorado del
 * podio si toca. Debajo, los tres números que la explican, separados por
 * divisorias: el total y de qué se compone.
 */
export function ProfileStats({
  position,
  participants,
  totalPoints,
  exactHits,
  signHits,
  extraPoints,
}: ProfileStatsProps) {
  const podium = position !== null && position <= 3
  const columns = [
    { value: totalPoints, label: 'Puntos totales', tone: 'text-ink' },
    { value: exactHits, label: 'Marcadores exactos', tone: 'text-exact' },
    { value: signHits, label: 'Signos acertados', tone: 'text-sign' },
  ]

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-4 px-5 pt-5 pb-4">
        <span
          className={[
            'grid size-16 shrink-0 place-items-center rounded-full border-2 font-display text-2xl font-extrabold',
            podium ? 'border-gold/45 bg-gold/10 text-gold' : 'border-line bg-raised text-ink',
          ].join(' ')}
        >
          {position === null ? '–' : `${position}º`}
        </span>

        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-mute uppercase">Posición</p>
          <p className="mt-1 text-sm text-ink-soft">
            de {participants} {participants === 1 ? 'participante' : 'participantes'}
          </p>
          {extraPoints > 0 ? (
            <p className="mt-0.5 text-xs text-gold">
              +{extraPoints} de las apuestas especiales
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft">
        {columns.map((column) => (
          <div key={column.label} className="px-2 py-3.5 text-center">
            <p className={`font-mono text-2xl leading-none font-bold tabular-nums ${column.tone}`}>{column.value}</p>
            <p className="mt-1.5 text-[11px] leading-tight text-ink-mute">{column.label}</p>
          </div>
        ))}
      </div>

      <p className="border-t border-line-soft px-5 py-2.5 text-center font-mono text-[10px] text-ink-mute">
        {POINTS.exact} pts por marcador exacto · {POINTS.sign} pt por signo
      </p>
    </section>
  )
}
