import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PublicUser } from '@/types'
import { getBackend } from '@/services/backend'
import { login as loginService, register as registerService, toPublicUser, type RegisterInput } from '@/services/auth'
import { clearSession, readSession, writeSession } from '@/services/session'

interface AuthContextValue {
  user: PublicUser | null
  /** `true` mientras se comprueba si había una sesión guardada. */
  initializing: boolean
  login: (nickname: string, password: string) => Promise<PublicUser>
  register: (input: RegisterInput) => Promise<PublicUser>
  logout: () => void
  /** Vuelve a leer el usuario, por ejemplo tras cambiar la foto o que el admin marque el pago. */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [initializing, setInitializing] = useState(true)

  // Al arrancar, se recupera la sesión guardada y se releen los datos del usuario.
  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      const userId = readSession()
      if (!userId) {
        if (!cancelled) setInitializing(false)
        return
      }
      try {
        const backend = await getBackend()
        const stored = await backend.getUser(userId)
        if (cancelled) return
        if (stored) setUser(toPublicUser(stored))
        else clearSession()
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (nickname: string, password: string) => {
    const logged = await loginService(nickname, password)
    writeSession(logged.id)
    setUser(logged)
    return logged
  }, [])

  // El registro no inicia sesión: el usuario vuelve a Bienvenida, como pediste.
  const register = useCallback((input: RegisterInput) => registerService(input), [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const userId = readSession()
    if (!userId) return
    const backend = await getBackend()
    const stored = await backend.getUser(userId)
    setUser(stored ? toPublicUser(stored) : null)
    if (!stored) clearSession()
  }, [])

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, refreshUser }),
    [user, initializing, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return context
}
