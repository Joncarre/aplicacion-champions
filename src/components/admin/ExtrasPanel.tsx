import { useMemo, useState, type ReactNode } from 'react'
import { Check, Goal, Trophy } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { POINTS, namesMatch } from '@/lib/scoring'
import { getBackend } from '@/services/backend'
import { recomputeScores } from '@/services/scores'
import { Alert } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

/**
 * Las apuestas especiales, de punta a punta: arriba se fijan las respuestas
 * oficiales y abajo se ve lo que apostó cada uno.
 *
 * Van juntas a propósito. En cuanto se escribe el goleador o el campeón de
 * verdad, la tabla de abajo marca a los que lo clavaron, que es la forma
 * rápida de comprobar que el reparto de 25 y 50 puntos cuadra.
 */
export function ExtrasPanel() {
  const { users, extras, config, teams, refresh } = useData()

  // La configuración ya está cargada cuando este panel se monta: el panel de
  // administración no pinta ninguna pestaña mientras haya datos en vuelo.
  const [topScorer, setTopScorer] = useState(config.actualTopScorer ?? '')
  const [champion, setChampion] = useState(config.actualChampion ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name, 'es')), [teams])

  const rows = useMemo(() => {
    const byUser = new Map(extras.map((entry) => [entry.userId, entry]))

    // El administrador no apuesta, así que no cuenta como pendiente.
    return users
      .filter((user) => !user.isAdmin)
      .map((user) => {
        const bet = byUser.get(user.id)
        const topScorerBet = bet?.topScorer?.trim() ?? ''
        const championBet = bet?.champion?.trim() ?? ''

        return {
          user,
          topScorer: topScorerBet,
          champion: championBet,
          topScorerHit: Boolean(
            topScorerBet && config.actualTopScorer && namesMatch(topScorerBet, config.actualTopScorer),
          ),
          championHit: Boolean(championBet && config.actualChampion && namesMatch(championBet, config.actualChampion)),
        }
      })
      .sort((a, b) => a.user.nickname.localeCompare(b.user.nickname, 'es'))
  }, [users, extras, config])

  const missing = rows.filter((row) => !row.topScorer && !row.champion).length

  const dirty =
    (topScorer.trim() || null) !== (config.actualTopScorer ?? null) ||
    (champion.trim() || null) !== (config.actualChampion ?? null)

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    setFeedback(null)
    try {
      const backend = await getBackend()
      await backend.saveConfig({
        actualTopScorer: topScorer.trim() || null,
        actualChampion: champion.trim() || null,
      })
      // Acertar el goleador o el campeón mueve 25 y 50 puntos: hay que rehacer
      // la clasificación entera, no solo la de quien acertó.
      await recomputeScores()
      await refresh()
      setFeedback({ tone: 'success', text: 'Aciertos guardados y puntos recalculados' })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se han podido guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-6 pb-1">
        <header className="text-center">
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.18em] text-brand-soft uppercase">
            Respuestas oficiales
          </h2>
          <p className="mt-1.5 text-xs text-ink-mute">Se comparan sin tildes ni mayúsculas, y vale el apellido suelto</p>
        </header>

        <OfficialAnswer
          id="actual-top-scorer"
          label="Máximo goleador"
          icon={<Goal size={13} aria-hidden="true" />}
          points={POINTS.topScorer}
          accent="brand"
          value={topScorer}
          onChange={setTopScorer}
        />

        <OfficialAnswer
          id="actual-champion"
          label="Campeón"
          icon={<Trophy size={13} aria-hidden="true" />}
          points={POINTS.champion}
          accent="gold"
          value={champion}
          onChange={setChampion}
          list="equipos-champions"
        >
          <datalist id="equipos-champions">
            {sortedTeams.map((team) => (
              <option key={team.id} value={team.name} />
            ))}
          </datalist>
        </OfficialAnswer>

        <div className="flex justify-center">
          <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary btn-sm px-6">
            {saving ? <Spinner label="Guardando" /> : 'Guardar aciertos'}
          </button>
        </div>
      </section>

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

      {missing > 0 ? (
        <Alert tone="warning">
          {missing} {missing === 1 ? 'participante sin apostar' : 'participantes sin apostar'}
        </Alert>
      ) : null}

      <div>
        <div className="flex items-center gap-2 px-2.5 pb-2 font-mono text-[10px] text-ink-mute">
          <span className="w-24 shrink-0">Participante</span>
          <span className="min-w-0 flex-1">Goleador (+{POINTS.topScorer})</span>
          <span className="min-w-0 flex-1">Campeón (+{POINTS.champion})</span>
        </div>

        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.user.id} className="flex items-center gap-2 rounded-2xl bg-surface px-2.5 py-2.5">
              <span className="w-24 shrink-0 truncate text-[13px] font-semibold text-ink">{row.user.nickname}</span>
              <BetCell value={row.topScorer} hit={row.topScorerHit} />
              <BetCell value={row.champion} hit={row.championHit} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Cada respuesta oficial se escribe como el nombre grabado en un palmarés: sin
 * caja, centrado y apoyado en un trazo que se enciende cuando hay respuesta.
 * Es el mismo gesto que el marcador de las apuestas, ampliado a un nombre.
 *
 * El campeón va en dorado y el goleador en azul, que es también el orden en
 * que reparten puntos: 50 contra 25.
 */
const ACCENTS = {
  brand: { text: 'text-brand-soft', lit: 'bg-brand/70' },
  gold: { text: 'text-gold', lit: 'bg-gold/70' },
} as const

interface OfficialAnswerProps {
  id: string
  label: string
  icon: ReactNode
  points: number
  accent: keyof typeof ACCENTS
  value: string
  onChange: (value: string) => void
  list?: string
  children?: ReactNode
}

function OfficialAnswer({
  id,
  label,
  icon,
  points,
  accent,
  value,
  onChange,
  list,
  children,
}: OfficialAnswerProps) {
  const { text, lit } = ACCENTS[accent]
  const decided = value.trim() !== ''

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-ink-mute uppercase"
        >
          <span className={text}>{icon}</span>
          {label}
        </label>
        <span className={`font-mono text-[11px] font-semibold ${text}`}>+{points}</span>
      </div>

      <input
        id={id}
        list={list}
        value={value}
        placeholder="Sin decidir"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2.5 w-full bg-transparent pb-2 text-center font-display text-xl font-bold tracking-tight
                    placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal
                    placeholder:text-ink-mute focus:outline-none ${decided ? 'text-ink' : 'text-ink-soft'}`}
      />
      {/* El trazo vive fuera del campo para poder encenderlo sin mover el nombre. */}
      <span
        aria-hidden="true"
        className={`block h-[2px] rounded-full transition-colors duration-300 ${decided ? lit : 'bg-line'}`}
      />

      {children}
    </div>
  )
}

function BetCell({ value, hit }: { value: string; hit: boolean }) {
  if (!value) {
    return <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-mute">—</span>
  }

  return (
    <span
      className={`flex min-w-0 flex-1 items-center gap-1 truncate font-mono text-[11px] ${
        hit ? 'text-exact' : 'text-ink-soft'
      }`}
    >
      {hit ? <Check size={12} className="shrink-0" aria-label="acertada" /> : null}
      <span className="truncate">{value}</span>
    </span>
  )
}
