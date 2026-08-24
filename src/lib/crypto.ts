/**
 * Hashing de contraseñas con Web Crypto.
 *
 * La sesión vive en `localStorage` y los usuarios en Firestore, como acordamos,
 * pero la contraseña nunca se guarda en claro. Como el documento del usuario es
 * legible desde el cliente (es lo que permite iniciar sesión sin Firebase Auth),
 * un SHA-256 pelado se rompería en un rato con una GPU: se usa PBKDF2 con
 * muchas iteraciones, que encarece muchísimo probar contraseñas a lo bruto.
 *
 * Contrapartida asumida: no hay forma de recuperar una contraseña olvidada.
 * El admin la restablece desde su panel.
 */

const encoder = new TextEncoder()

/**
 * Los navegadores solo exponen `crypto.subtle` en contextos seguros: localhost
 * o HTTPS. Si se abre la app por IP y sin certificado —típico al probar desde
 * el móvil en la red local— no existe, así que conviene explicarlo en vez de
 * dejar que reviente con un error incomprensible.
 */
function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle
  if (!api) {
    throw new Error(
      'Tu navegador solo cifra contraseñas en conexiones seguras. Abre la aplicación en localhost o por HTTPS.',
    )
  }
  return api
}

/** Iteraciones actuales. Se guarda dentro del hash para poder subirlas más adelante. */
const ITERATIONS = 150_000
const KEY_BITS = 256
const ALGORITHM = 'pbkdf2'

export function randomSalt(bytes = 16): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return toHex(buffer)
}

/** Devuelve `pbkdf2$150000$<hex>`, con los parámetros incrustados. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const digest = await derive(password, salt, ITERATIONS)
  return `${ALGORITHM}$${ITERATIONS}$${digest}`
}

export async function verifyPassword(password: string, salt: string, stored: string): Promise<boolean> {
  const [algorithm, iterations, digest] = stored.split('$')
  if (algorithm !== ALGORITHM || !iterations || !digest) return false

  const rounds = Number(iterations)
  if (!Number.isInteger(rounds) || rounds <= 0) return false

  return timingSafeEqual(await derive(password, salt, rounds), digest)
}

/** `true` si el hash guardado usa menos iteraciones de las que se usan ahora. */
export function needsRehash(stored: string): boolean {
  const [algorithm, iterations] = stored.split('$')
  return algorithm !== ALGORITHM || Number(iterations) < ITERATIONS
}

async function derive(password: string, salt: string, iterations: number): Promise<string> {
  const api = subtle()
  const key = await api.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await api.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  )
  return toHex(new Uint8Array(bits))
}

/** Comparación de longitud constante, para no filtrar información por el tiempo de respuesta. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
