import { Workflow } from 'lucide-react'
import { KNOCKOUT_ROUNDS, KNOCKOUT_START } from '@/data/calendar'
import { formatCountdown } from '@/lib/date'
import { useNow } from '@/hooks/useNow'
import { PageHeader } from '@/components/ui'

export default function Cruces() {
  const now = useNow(60_000)
  const remaining = KNOCKOUT_START - now

  return (
    <>
      <PageHeader title="Cruces" subtitle="La fase eliminatoria" />

      <div className="card flex flex-col items-center gap-4 px-6 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand/12 text-brand-soft">
          <Workflow size={26} aria-hidden="true" />
        </span>

        <div className="space-y-2">
          <p className="font-display text-xl font-bold text-ink">Disponible próximamente</p>
          <p className="text-sm leading-relaxed text-balance text-ink-soft">
            La fase eliminatoria comenzará con los <strong className="text-ink">Play-offs</strong> el{' '}
            <strong className="text-ink">16 de febrero de 2027</strong>.
          </p>
        </div>

        {remaining > 0 ? (
          <p className="font-mono text-xs tracking-wide text-gold uppercase">Faltan {formatCountdown(remaining)}</p>
        ) : null}
      </div>

      <section className="mt-5">
        <h2 className="px-1 pb-2.5 text-xs font-semibold tracking-wide text-ink-mute uppercase">Calendario previsto</h2>
        <ol className="card divide-y divide-line-soft">
          {KNOCKOUT_ROUNDS.map((round) => (
            <li key={round.id} className="flex items-baseline justify-between gap-4 px-4 py-3.5">
              <span className="text-[15px] font-semibold text-ink">{round.name}</span>
              <span className="shrink-0 text-right text-xs text-ink-mute">{round.label}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
