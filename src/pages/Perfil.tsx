import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, CircleCheck, CircleDashed, LogOut, Quote, Settings } from 'lucide-react'
import type { Extras, PublicUser, Team } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useNow } from '@/hooks/useNow'
import { EXTRAS_DEADLINE } from '@/data/calendar'
import { factOfTheDay } from '@/data/facts'
import { formatFullDate } from '@/lib/date'
import { areExtrasLocked } from '@/lib/locks'
import { fileToAvatarDataUrl } from '@/lib/image'
import { POINTS } from '@/lib/scoring'
import { buildEvolution } from '@/lib/standings'
import { getBackend } from '@/services/backend'
import { Avatar } from '@/components/Avatar'
import { CumulativeChart, GapChart, HitsDonut, StatTile } from '@/components/charts'
import { Alert, Field, PageHeader } from '@/components/ui'
import { Spinner } from '@/components/Spinner'

export default function Perfil() {
  const { user, logout, refreshUser } = useAuth()
  const { internalStandings, teams, myExtras, refresh } = useData()
  const now = useNow(60_000)

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

      <section className="mt-4 grid grid-cols-2 gap-2.5">
        <StatTile
          label="Posición"
          value={me ? `${me.position}º` : '–'}
          hint={`de ${internalStandings.length}`}
          tone="gold"
        />
        <StatTile
          label="Puntos"
          value={me?.totalPoints ?? 0}
          hint={me && me.extraPoints > 0 ? `${me.extraPoints} de especiales` : undefined}
          tone="brand"
        />
        <StatTile
          label="Marcadores exactos"
          value={me?.exactHits ?? 0}
          hint={`${POINTS.exact} puntos cada uno`}
          tone="exact"
        />
        <StatTile label="Signos acertados" value={me?.signHits ?? 0} hint={`${POINTS.sign} punto cada uno`} />
      </section>

      <SpecialBets user={user} teams={teams} extras={myExtras} now={now} onSaved={refresh} />

      <section className="mt-4 space-y-3">
        <h2 className="px-1 text-xs font-semibold tracking-wide text-ink-mute uppercase">Tu evolución</h2>
        <CumulativeChart points={evolution} />
        <GapChart points={evolution} />
        <HitsDonut signHits={me?.signHits ?? 0} exactHits={me?.exactHits ?? 0} missed={missed} />
      </section>

      <DailyFact now={now} />

      <div className="mt-6">
        <button type="button" onClick={logout} className="btn-ghost w-full text-miss">
          <LogOut size={17} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

/* ────────────────────────────── Identidad y foto ────────────────────────────── */

function IdentityCard({ user, onPhotoSaved }: { user: PublicUser; onPhotoSaved: () => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const photo = await fileToAvatarDataUrl(file)
      const backend = await getBackend()
      await backend.updateUser(user.id, { photo })
      await onPhotoSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la foto')
    } finally {
      setUploading(false)
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
            disabled={uploading}
            aria-label="Cambiar foto de perfil"
            className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-2 border-surface bg-brand text-white transition-transform active:scale-95 disabled:opacity-60"
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
          <p className="truncate font-display text-2xl leading-tight font-extrabold text-ink">{user.nickname}</p>
          <p className="truncate text-sm text-ink-soft">
            {user.nombre} {user.apellidos}
          </p>
          <p className="mt-1 text-xs text-ink-mute">Miembro desde el {formatFullDate(user.createdAt)}</p>
        </div>
      </div>

      {uploading ? (
        <div className="mt-4">
          <Spinner label="Subiendo la foto" />
        </div>
      ) : null}
      {error ? (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <div
        className={[
          'mt-4 flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
          user.hasPaid ? 'border-exact/30 bg-exact/8 text-exact' : 'border-sign/30 bg-sign/8 text-sign',
        ].join(' ')}
      >
        {user.hasPaid ? (
          <CircleCheck size={18} className="shrink-0" aria-hidden="true" />
        ) : (
          <CircleDashed size={18} className="shrink-0" aria-hidden="true" />
        )}
        <span className="font-medium">
          {user.hasPaid ? 'Porra pagada' : 'Pendiente de pago: no puedes apostar todavía'}
        </span>
      </div>
    </section>
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
  const [championTeamId, setChampionTeamId] = useState(extras?.championTeamId ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const dirty = topScorer.trim() !== (extras?.topScorer ?? '') || championTeamId !== (extras?.championTeamId ?? '')
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
        championTeamId: championTeamId || null,
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
        <Field
          label="Máximo goleador"
          htmlFor="top-scorer"
          hint={disabled ? undefined : 'Escribe el nombre del jugador.'}
        >
          <input
            id="top-scorer"
            className="field disabled:opacity-60"
            value={topScorer}
            onChange={(event) => setTopScorer(event.target.value)}
            placeholder="Sin apostar"
            disabled={disabled}
          />
        </Field>

        <Field label="Campeón de la Champions" htmlFor="champion">
          <select
            id="champion"
            className="field disabled:opacity-60"
            value={championTeamId}
            onChange={(event) => setChampionTeamId(event.target.value)}
            disabled={disabled}
          >
            <option value="">Sin apostar</option>
            {sortedTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>

        {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

        {!disabled ? (
          <button type="button" onClick={save} disabled={!dirty || saving} className="btn-primary w-full">
            {saving ? <Spinner label="Guardando" /> : 'Guardar apuestas especiales'}
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
      <h2 className="px-1 pb-2.5 text-xs font-semibold tracking-wide text-ink-mute uppercase">Dato del día</h2>
      <figure className="card relative overflow-hidden px-5 py-5">
        <Quote size={56} aria-hidden="true" className="pointer-events-none absolute -top-2 -right-2 text-line-soft" />
        <blockquote className="relative text-[13px] leading-relaxed text-ink-soft italic">
          <p>&ldquo;{fact}&rdquo;</p>
        </blockquote>
      </figure>
    </section>
  )
}
