import { useEffect, useState } from 'react'
import { isTimeTravelling, now } from '@/lib/clock'

/**
 * Instante actual, refrescado cada cierto tiempo para que los partidos se
 * bloqueen solos al llegar su hora sin tener que recargar la página.
 */
export function useNow(intervalMs = 30_000): number {
  const [value, setValue] = useState(() => now())

  useEffect(() => {
    // Con el reloj congelado no hay nada que actualizar.
    if (isTimeTravelling) return
    const id = setInterval(() => setValue(now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return value
}
