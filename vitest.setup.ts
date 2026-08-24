import { webcrypto } from 'node:crypto'
import { afterEach } from 'vitest'
// Matchers de DOM: toHaveTextContent, toHaveAttribute, toBeDisabled…
import '@testing-library/jest-dom/vitest'

/**
 * jsdom trae `crypto.getRandomValues` pero no `crypto.subtle`, que es lo que
 * usa el hashing de contraseñas. Se completa con la implementación de Node.
 */
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

if (typeof document !== 'undefined') {
  // jsdom no implementa el desplazamiento de elementos, que usa el selector de jornada.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }

  // Sin `globals: true`, Testing Library no limpia el DOM por su cuenta.
  afterEach(async () => {
    const { cleanup } = await import('@testing-library/react')
    cleanup()
  })
}
