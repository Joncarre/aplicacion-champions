import type { PublicUser } from '@/types'

const SIZES = {
  sm: 'size-8 text-[11px]',
  md: 'size-11 text-sm',
  lg: 'size-24 text-2xl',
} as const

/** Iniciales de reserva mientras el usuario no suba foto. */
function initials(user: Pick<PublicUser, 'nombre' | 'apellidos' | 'nickname'>): string {
  const first = user.nombre.trim().charAt(0)
  const last = user.apellidos.trim().charAt(0)
  const fallback = user.nickname.trim().charAt(0).toUpperCase()
  return `${first}${last}`.toUpperCase() || fallback || '?'
}

interface AvatarProps {
  user: Pick<PublicUser, 'nombre' | 'apellidos' | 'nickname' | 'photo'>
  size?: keyof typeof SIZES
  className?: string
}

export function Avatar({ user, size = 'md', className = '' }: AvatarProps) {
  const classes = `${SIZES[size]} shrink-0 rounded-full border border-line object-cover ${className}`

  if (user.photo) {
    return <img src={user.photo} alt={`Foto de ${user.nickname}`} className={classes} loading="lazy" />
  }

  return (
    <span
      aria-hidden="true"
      className={`${classes} grid place-items-center bg-raised font-semibold text-ink-soft`}
    >
      {initials(user)}
    </span>
  )
}
