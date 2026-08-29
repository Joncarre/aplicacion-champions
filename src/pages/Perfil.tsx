import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, LogOut, Settings } from 'lucide-react'
import type { Extras, PublicUser, Team } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useNow } from '@/hooks/useNow'
import { EXTRAS_DEADLINE } from '@/data/calendar'
import { factOfTheDay } from '@/data/facts'
import { formatFullDate } from '@/lib/date'
import { areExtrasLocked } from '@/lib/locks'
import { loadImage } from '@/lib/image'
import { POINTS } from '@/lib/scoring'
import { buildEvolution } from '@/lib/standings'
import { getBackend } from '@/services/backend'
import { Avatar } from '@/components/Avatar'
import { AvatarEditor } from '@/components/AvatarEditor'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ProfileStats } from '@/components/ProfileStats'
import { Reveal } from '@/components/Reveal'
import { CumulativeChart, GapChart, HitsDonut } from '@/components/charts'
import { Alert, Field, PageHeader } from '@/components/ui'

export default function Perfil() {
  const { user, logout, refreshUser } = useAuth()
  const { internalStandings, teams, myExtras, refresh } = useData()
  const now = useNow(60_000)
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  const me = useMemo(
    () => internalStandings.find((row) => row.user.id === user?.id),
    [internalStandings, user?.id],
  )

  const evolution = useMemo(
    () => (user ? buildEvolution(user.id, internalStandings) : []),
    [user, internalStandings],
  )

  if (!user) return null

  const predicted = me?.matchdays.reduce((sum, bucket) => sum + bucket.predicted, 0) ?? 0
  const hits = (me?.signHits ?? 0) + (me?.exactHits ?? 0)
  const missed = Math.max(0, predicted - hits)

  return (
    <>
      <PageHeader
        title="Perfil"
        action={
          user.isAdmin ? (
            <Link to="/admin" className="btn-ghost min-h-11 px-3.5 text-xs">
              <Settings size={15} aria-hidden="true" />
              Admin
            </Link>
          ) : null
        }
      />

      <IdentityCard user={user} onPhotoSaved={refreshUser} />

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

      <section className="mt-4 space-y-3">
        <h2 className="px-1 text-xs font-semibold tracking-wide text-ink-mute uppercase">Tu evolución</h2>
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
        <DailyFact now={now} />
      </Reveal>

      <div className="mt-6">
        <button type="button" onClick={() => setConfirmingLogout(true)} className="btn-ghost w-full text-miss">
          <LogOut size={17} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>

      {confirmingLogout ? (
        <ConfirmDialog
          title="¿Cerrar sesión?"
          description="Tendrás que volver a entrar con tu nickname y tu contraseña. Tus apuestas guardadas no se pierden."
          confirmLabel="Cerrar sesión"
          destructive
          onConfirm={logout}
          onCancel={() => setConfirmingLogout(false)}
        />
      ) : null}
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
    <section className="card p-5">
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-display text-2xl leading-tight font-extrabold text-ink">{user.nickname}</p>
            <PaymentBadge paid={user.hasPaid} />
          </div>
          <p className="truncate text-sm text-ink-soft">
            {user.nombre} {user.apellidos}
          </p>
          <p className="mt-1 text-xs text-ink-mute">Miembro desde el {formatFullDate(user.createdAt)}</p>
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

/** Estado del pago, reducido a lo mínimo: un punto y una palabra. */
function PaymentBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        paid ? 'border-exact/30 bg-exact/10 text-exact' : 'border-sign/30 bg-sign/10 text-sign',
      ].join(' ')}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${paid ? 'bg-exact' : 'bg-sign'}`} />
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
    <section className="card mt-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink">Apuestas especiales</h2>
        <span className="shrink-0 font-mono text-xs text-gold">
          +{POINTS.topScorer} / +{POINTS.champion}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-mute">
        {locked
          ? `Se cerraron el ${formatFullDate(EXTRAS_DEADLINE)}.`
          : `Puedes cambiarlas hasta el ${formatFullDate(EXTRAS_DEADLINE)}.`}
      </p>

      <div className="mt-4 space-y-4">
        <Field label="Máximo goleador" htmlFor="top-scorer" hint={disabled ? undefined : 'Escribe el nombre del jugador.'}>
          <input
            id="top-scorer"
            className="field disabled:opacity-60"
            value={topScorer}
            onChange={(event) => setTopScorer(event.target.value)}
            placeholder="Sin apostar"
            disabled={disabled}
          />
        </Field>

        <Field
          label="Campeón de la Champions"
          htmlFor="champion"
          hint={disabled ? undefined : 'Escribe el equipo o elige de la lista.'}
        >
          <input
            id="champion"
            className="field disabled:opacity-60"
            list="equipos-porra"
            value={champion}
            onChange={(event) => setChampion(event.target.value)}
            placeholder="Sin apostar"
            disabled={disabled}
          />
          <datalist id="equipos-porra">
            {sortedTeams.map((team) => (
              <option key={team.id} value={team.name} />
            ))}
          </datalist>
        </Field>

        {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

        {!disabled ? (
          <button type="button" onClick={save} disabled={!dirty || saving} className="btn-primary w-full">
            {saving ? 'Guardando…' : 'Guardar apuestas especiales'}
          </button>
        ) : null}
      </div>
    </section>
  )
}

/* ────────────────────────────── Curiosidad del día ────────────────────────────── */

function DailyFact({ now }: { now: number }) {
  const fact = factOfTheDay(now)

  return (
    <section className="mt-6">
      <figure className="card-live-gold relative overflow-hidden p-5">
        {/* Resplandor dorado en la esquina, para que no sea una tarjeta más. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full opacity-50"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-gold) 26%, transparent) 0%, transparent 70%)',
          }}
        />

        <figcaption className="relative flex items-center gap-2">
          <span aria-hidden="true" className="h-px w-6 bg-gold/50" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-gold uppercase">Dato del día</span>
        </figcaption>

        <blockquote className="relative mt-3">
          <span
            aria-hidden="true"
            className="absolute -top-4 -left-1 font-display text-6xl leading-none text-gold/20"
          >
            &ldquo;
          </span>
          <p className="relative pl-6 font-display text-[13.5px] leading-relaxed text-ink-soft italic">{fact}</p>
        </blockquote>

      </figure>
    </section>
  )
}
