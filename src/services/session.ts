/** Sesión del usuario: solo el id, guardado en `localStorage`. */

const SESSION_KEY = 'porra-champions:session'

export function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function writeSession(userId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, userId)
  } catch {
    // Navegación privada con almacenamiento bloqueado: la sesión durará lo que la pestaña.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Nada que limpiar.
  }
}
