import { Suspense, lazy, useMemo, useRef, useState } from 'react'
import { Camera, LogOut } from 'lucide-react'
import type { Extras, PublicUser, Team } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useNow } from '@/hooks/useNow'
import { EXTRAS_DEADLINE } from '@/data/calendar'
import { factOfTheDay } from '@/data/facts'
import { formatFullDate, formatShortDate } from '@/lib/date'
import { areExtrasLocked } from '@/lib/locks'
import { loadImage } from '@/lib/image'
import { POINTS } from '@/lib/scoring'
import { evaluateAchievements } from '@/lib/achievements'
import { buildEvolution } from '@/lib/standings'
import { getBackend } from '@/services/backend'
import { Achievements } from '@/components/Achievements'
import { Avatar } from '@/components/Avatar'
import { AvatarEditor } from '@/components/AvatarEditor'
import { ProfileStats } from '@/components/ProfileStats'
import { Reveal } from '@/components/Reveal'
import { CumulativeChart, GapChart, HitsDonut } from '@/components/charts'
import { Alert, PageHeader } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

// Solo lo abre una persona: no tiene sentido cargarlo con el resto de la app.
const AdminPanels = lazy(() => import('@/components/admin/AdminPanels'))

export default function Perfil() {
  const { user, logout, refreshUser } = useAuth()
  const { internalStandings, teams, matches, myExtras, myPredictions, refresh } = useData()
  const now = useNow(60_000)

  const me = useMemo(
    () => internalStandings.find((row) => row.user.id === user?.id),
    [internalStandings, user?.id],
  )

  const evolution = useMemo(
    () => (user ? buildEvolution(user.id, internalStandings) : []),
    [user, internalStandings],
  )

  const achievements = useMemo(
    () =>
      evaluateAchievements({
        userId: user?.id ?? '',
        scores: internalStandings,
        predictions: [...myPredictions.values()],
        matches,
      }),
    [user?.id, internalStandings, myPredictions, matches],
  )

  if (!user) return null

  const predicted = me?.matchdays.reduce((sum, bucket) => sum + bucket.predicted, 0) ?? 0
  const hits = (me?.signHits ?? 0) + (me?.exactHits ?? 0)
  const missed = Math.max(0, predicted - hits)

  return (
    <>
      {/*
        Cerrar sesión vive en la cabecera. Abajo del todo obligaba a recorrer
        el perfil entero —o el panel de administración— para llegar hasta él, y
        además chocaba con lo que cada pestaña dejara flotando en el pie.
      */}
      <PageHeader
        title="Perfil"
        action={
          <button
            type="button"
            onClick={logout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="grid size-9 place-items-center rounded-full bg-surface text-miss transition-colors hover:bg-overlay"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        }
      />

      <IdentityCard user={user} onPhotoSaved={refreshUser} />

      {/*
        El perfil se bifurca. El administrador no juega la porra, así que su
        posición, sus gráficas y sus logros no tendrían nada que contar: en su
        lugar lleva encima el panel de gestión, que es lo que sí usa a diario.
      */}
      {user.isAdmin ? (
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner label="Abriendo el panel" />
            </div>
          }
        >
          <AdminPanels />
        </Suspense>
      ) : (
        <>
          <Reveal className="mt-4">
            <ProfileStats
              position={me?.position ?? null}
              participants={internalStandings.length}
              totalPoints={me?.totalPoints ?? 0}
              exactHits={me?.exactHits ?? 0}
              signHits={me?.signHits ?? 0}
              extraPoints={me?.extraPoints ?? 0}
            />
          </Reveal>

          <Reveal>
            <SpecialBets user={user} teams={teams} extras={myExtras} now={now} onSaved={refresh} />
          </Reveal>

          <Reveal>
            <DailyFact now={now} />
          </Reveal>

          <section className="mt-4 space-y-3">
            <Reveal>
              <CumulativeChart points={evolution} />
            </Reveal>
            <Reveal>
              <GapChart points={evolution} />
            </Reveal>
            <Reveal>
              <HitsDonut signHits={me?.signHits ?? 0} exactHits={me?.exactHits ?? 0} missed={missed} />
            </Reveal>
          </section>

          <Reveal>
            <Achievements states={achievements} />
          </Reveal>
        </>
      )}

    </>
  )
}

/* ────────────────────────────── Identidad y foto ────────────────────────────── */

function IdentityCard({ user, onPhotoSaved }: { user: PublicUser; onPhotoSaved: () => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<HTMLImageElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      setEditing(await loadImage(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido abrir la imagen')
    }
  }

  function closeEditor() {
    // La imagen se cargó desde un object URL: hay que soltarlo.
    if (editing) URL.revokeObjectURL(editing.src)
    setEditing(null)
  }

  async function confirm(dataUrl: string) {
    setSaving(true)
    setError(null)
    try {
      const backend = await getBackend()
      await backend.updateUser(user.id, { photo: dataUrl })
      await onPhotoSaved()
      closeEditor()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la foto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="px-1 py-2">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar user={user} size="lg" />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label="Cambiar foto de perfil"
            className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-2 border-surface bg-brand text-white transition-transform active:scale-95"
          >
            <Camera size={15} aria-hidden="true" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              void onPick(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Alineado a la línea base del nickname, no a su centro vertical. */}
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <p className="truncate font-display text-2xl leading-tight font-extrabold text-ink">{user.nickname}</p>
            {/* Al administrador no le corresponde estado de pago: no juega. */}
            {user.isAdmin ? <RoleBadge /> : <PaymentBadge paid={user.hasPaid} />}
          </div>
          <p className="truncate text-sm text-ink-soft">
            {user.nombre} {user.apellidos}
          </p>
          <p className="mt-1 text-xs text-ink-mute">Miembro desde el {formatShortDate(user.createdAt)}</p>
        </div>
      </div>

      {error ? (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {editing ? (
        <AvatarEditor image={editing} saving={saving} onCancel={closeEditor} onConfirm={confirm} />
      ) : null}
    </section>
  )
}

/** El administrador se identifica como tal, ya que no le corresponde pagar. */
function RoleBadge() {
  return (
    <span className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.14em] text-brand-soft uppercase">
      Administrador
    </span>
  )
}

/**
 * Estado del pago sin caja ni marco: solo la palabra en versalitas. Es un
 * indicador, no un botón, así que no necesita parecer una pastilla.
 */
function PaymentBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={[
        'shrink-0 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase',
        paid ? 'text-exact' : 'text-sign',
      ].join(' ')}
    >
      {paid ? 'Pagado' : 'Pendiente'}
    </span>
  )
}

/* ────────────────────────────── Goleador y campeón ────────────────────────────── */

interface SpecialBetsProps {
  user: PublicUser
  teams: Team[]
  extras: Extras | null
  now: number
  onSaved: () => Promise<void>
}

function SpecialBets({ user, teams, extras, now, onSaved }: SpecialBetsProps) {
  const locked = areExtrasLocked(now)
  const [topScorer, setTopScorer] = useState(extras?.topScorer ?? '')
  const [champion, setChampion] = useState(extras?.champion ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const dirty = topScorer.trim() !== (extras?.topScorer ?? '') || champion.trim() !== (extras?.champion ?? '')
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name, 'es')), [teams])
  const disabled = locked || !user.hasPaid

  async function save() {
    if (saving) return
    setSaving(true)
    setFeedback(null)
    try {
      const backend = await getBackend()
      await backend.saveExtras({
        userId: user.id,
        topScorer: topScorer.trim(),
        champion: champion.trim(),
        updatedAt: Date.now(),
      })
      await onSaved()
      setFeedback({ tone: 'success', text: 'Apuestas especiales guardadas' })
    } catch (cause) {
      setFeedback({ tone: 'error', text: cause instanceof Error ? cause.message : 'No se han podido guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8 px-1">
      <h2 className="text-center font-mono text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
        Apuestas especiales
      </h2>
      <span aria-hidden="true" className="rule-taper mt-2.5 block" />

      <div className="mt-5 space-y-5">
        <SpecialSlot
          id="top-scorer"
          label="Máximo goleador"
          points={POINTS.topScorer}
          value={topScorer}
          onChange={setTopScorer}
          disabled={disabled}
        />

        <SpecialSlot
          id="champion"
          label="Campeón"
          points={POINTS.champion}
          value={champion}
          onChange={setChampion}
          disabled={disabled}
          list="equipos-porra"
        />
        <datalist id="equipos-porra">
          {sortedTeams.map((team) => (
            <option key={team.id} value={team.name} />
          ))}
        </datalist>

        {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] leading-relaxed text-ink-mute">
            {locked ? 'Cerradas el' : 'Abiertas hasta el'} {formatFullDate(EXTRAS_DEADLINE)}
          </p>
          {!disabled ? (
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="btn-primary btn-sm shrink-0"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/**
 * Una apuesta especial: el nombre de la categoría, lo que vale y el hueco para
 * escribir. Comparte el trazo bajo el texto con el marcador de las jornadas,
 * para que apostar se sienta igual en toda la aplicación.
 */
function SpecialSlot({
  id,
  label,
  points,
  value,
  onChange,
  disabled,
  list,
}: {
  id: string
  label: string
  points: number
  value: string
  onChange: (value: string) => void
  disabled: boolean
  list?: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-mono text-[10px] tracking-[0.14em] text-ink-mute uppercase">
          {label}
        </label>
        <span className="shrink-0 font-mono text-[10px] text-gold">+{points}</span>
      </div>

      <input
        id={id}
        list={list}
        className="mt-1.5 w-full bg-transparent pb-1.5 font-display text-lg text-ink
                   placeholder:font-sans placeholder:text-sm placeholder:text-ink-mute
                   focus:text-brand-soft focus:outline-none disabled:text-ink-soft"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Sin apostar"
        disabled={disabled}
      />
      <span
        aria-hidden="true"
        className={[
          'block h-[2px] rounded-full transition-colors duration-200',
          disabled ? 'bg-line' : value === '' ? 'bg-gold/30' : 'bg-gold/70',
        ].join(' ')}
      />
    </div>
  )
}

/* ────────────────────────────── Curiosidad del día ────────────────────────────── */

function DailyFact({ now }: { now: number }) {
  const fact = factOfTheDay(now)

  return (
    <section className="mt-5">
      {/* Sin rótulo: la comilla y la cursiva ya dicen que es una cita. */}
      <figure className="card-live-gold relative overflow-hidden px-4 py-3.5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -right-10 size-32 rounded-full opacity-50"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-gold) 24%, transparent) 0%, transparent 70%)',
          }}
        />

        <blockquote className="relative">
          <span
            aria-hidden="true"
            className="absolute -top-2.5 -left-0.5 font-display text-4xl leading-none text-gold/25"
          >
            &ldquo;
          </span>
          <p className="relative pl-5 font-display text-xs leading-relaxed text-ink-soft italic">{fact}</p>
        </blockquote>
      </figure>
    </section>
  )
}
