/**
 * Utilidades de fecha ancladas a Europe/Madrid.
 *
 * Todo lo que se guarda son instantes absolutos (epoch ms). La zona horaria
 * solo interviene al convertir una hora de pared ("el 8 de septiembre a las
 * 21:00 en España") a instante, y al formatear de vuelta para el usuario.
 * Así los cambios de horario de verano salen bien sin depender de librerías.
 */

export const TIMEZONE = 'Europe/Madrid'

/** Desfase de la zona respecto a UTC, en ms, para un instante dado. */
function zoneOffset(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type)
    return part ? Number(part.value) : 0
  }

  // `hour` puede venir como 24 en lugar de 0 según el motor.
  const asIfUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % 24,
    read('minute'),
    read('second'),
  )
  return asIfUtc - utcMs
}

/**
 * Convierte una hora de pared de Madrid a epoch ms.
 * @param wallClock formato `YYYY-MM-DDTHH:mm`
 */
export function madridToUtc(wallClock: string, timeZone: string = TIMEZONE): number {
  const [datePart = '', timePart = '00:00'] = wallClock.split('T')
  const [year = 0, month = 1, day = 1] = datePart.split('-').map(Number)
  const [hour = 0, minute = 0] = timePart.split(':').map(Number)

  // Dos pasadas: la primera estimación puede caer en el lado equivocado de un
  // cambio de hora, la segunda lo corrige.
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const firstPass = guess - zoneOffset(guess, timeZone)
  return guess - zoneOffset(firstPass, timeZone)
}

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: TIMEZONE, ...options })

const timeFmt = fmt({ hour: '2-digit', minute: '2-digit', hour12: false })
const dayFmt = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const longDayFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const fullFmt = fmt({ day: 'numeric', month: 'long', year: 'numeric' })
const dayKeyFmt = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' })

/** `21:00` */
export const formatTime = (ms: number): string => timeFmt.format(ms)

/** `mié, 9 sept` */
export const formatDay = (ms: number): string => capitalize(dayFmt.format(ms).replace(/\./g, ''))

/** `miércoles, 9 de septiembre` */
export const formatLongDay = (ms: number): string => capitalize(longDayFmt.format(ms))

/** `9 de septiembre de 2026` */
export const formatFullDate = (ms: number): string => fullFmt.format(ms)

/** Clave estable `YYYY-MM-DD` en hora de Madrid, para agrupar partidos por día. */
export function madridDayKey(ms: number): string {
  const parts = dayKeyFmt.formatToParts(ms)
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${read('year')}-${read('month')}-${read('day')}`
}

/** Días transcurridos desde la época, en hora de Madrid. Sirve para rotar la curiosidad diaria. */
export function madridDayNumber(ms: number = Date.now()): number {
  const [year = 1970, month = 1, day = 1] = madridDayKey(ms).split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

/** `faltan 2 d 4 h`, `faltan 12 min`… para las cuentas atrás de bloqueo. */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'cerrado'
  const minutes = Math.floor(msRemaining / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} d ${hours % 24} h`
  if (hours > 0) return `${hours} h ${minutes % 60} min`
  return `${minutes} min`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const inputFmt = fmt({
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * Valor para un `<input type="datetime-local">` expresado en hora de Madrid,
 * independientemente de la zona horaria del navegador del administrador.
 */
export function toDateTimeInputValue(ms: number): string {
  const parts = inputFmt.formatToParts(ms)
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  const hour = String(Number(read('hour')) % 24).padStart(2, '0')
  return `${read('year')}-${read('month')}-${read('day')}T${hour}:${read('minute')}`
}
