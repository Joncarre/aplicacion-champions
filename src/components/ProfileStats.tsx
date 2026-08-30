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
 * Arriba la posición, que es lo primero que uno mira, en dorado si está en el
 * podio. Debajo, los tres números que la explican, separados por divisorias.
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
    { value: totalPoints, label: 'Puntos totales', tone: 'text-brand-soft' },
    { value: exactHits, label: 'Marcadores exactos', tone: 'text-exact' },
    { value: signHits, label: 'Signos acertados', tone: 'text-sign' },
  ]

  return (
    <section>
      <div className="flex items-baseline gap-2.5 px-1 pt-2 pb-4">
        <span
          className={[
            'font-mono text-2xl leading-none font-bold tabular-nums',
            podium ? 'text-gold' : 'text-ink',
          ].join(' ')}
        >
          {position === null ? '–' : position}
          <span className="text-base">º</span>
        </span>

        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-mute uppercase">Posición</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            de {participants} {participants === 1 ? 'participante' : 'participantes'}
          </p>
          {extraPoints > 0 ? (
            <p className="mt-0.5 text-xs text-gold">+{extraPoints} de las apuestas especiales</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line-soft">
        {columns.map((column) => (
          <div key={column.label} className="px-2 py-3.5 text-center">
            <p className={`font-mono text-2xl leading-none font-bold tabular-nums ${column.tone}`}>{column.value}</p>
            <p className="mt-1.5 text-[11px] leading-tight text-ink-mute">{column.label}</p>
          </div>
        ))}
      </div>

      <p className="px-5 pt-4 text-center font-mono text-[10px] text-ink-mute">
        {POINTS.exact} pts por marcador exacto · {POINTS.sign} pt por signo
      </p>
    </section>
  )
}
