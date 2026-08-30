import { ACHIEVEMENT_GROUPS, type AchievementState } from '@/lib/achievements'

/**
 * Logros personales.
 *
 * Los emojis salen en gris y se encienden al conseguirse. El truco es un
 * filtro de saturación, no dos imágenes distintas: así el bloqueado y el
 * conseguido son literalmente el mismo dibujo y se ve de un vistazo qué queda
 * por delante.
 */
export function Achievements({ states }: { states: AchievementState[] }) {
  const unlocked = states.filter((state) => state.unlocked).length

  return (
    <section className="mt-8 px-1">
      <h2 className="text-center font-mono text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
        Logros personales
      </h2>
      <span aria-hidden="true" className="rule-taper mt-2.5 block" />

      <p className="mt-3 text-center font-mono text-[10px] text-ink-mute">
        {unlocked} de {states.length} conseguidos
      </p>

      <div className="mt-4 space-y-6">
        {ACHIEVEMENT_GROUPS.map((group) => {
          const items = states.filter((state) => state.group === group.id)
          if (items.length === 0) return null

          return (
            <div key={group.id}>
              <p className="text-center font-mono text-[10px] tracking-[0.14em] text-brand-soft uppercase">{group.label}</p>

              <ul className="mt-2.5 grid grid-cols-3 gap-2">
                {items.map((state) => (
                  <li key={state.id} className="flex flex-col items-center gap-1.5 text-center">
                    <span
                      role="img"
                      aria-label={`${state.title}. ${state.unlocked ? 'Conseguido' : 'Pendiente'}. ${state.description}`}
                      title={state.description}
                      className={[
                        'text-3xl leading-none transition-[filter,opacity] duration-500',
                        state.unlocked ? 'grayscale-0 opacity-100' : 'opacity-30 grayscale',
                      ].join(' ')}
                    >
                      {state.emoji}
                    </span>
                    <span
                      className={[
                        'font-mono text-[9px] leading-tight',
                        state.unlocked ? 'text-ink-soft' : 'text-ink-mute',
                      ].join(' ')}
                    >
                      {state.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
