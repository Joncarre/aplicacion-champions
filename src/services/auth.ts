import type { PublicUser, User } from '@/types'
import { hashPassword, randomSalt, verifyPassword } from '@/lib/crypto'
import { BackendError, getBackend } from './backend'

/** Nickname del administrador: el primero que se registre con este nombre recibe el panel. */
const ADMIN_NICKNAME = String(import.meta.env.VITE_ADMIN_NICKNAME ?? 'joncarre').toLowerCase()

export const NICKNAME_PATTERN = /^[a-z0-9._-]{3,20}$/
export const MIN_PASSWORD_LENGTH = 6

export interface RegisterInput {
  nombre: string
  apellidos: string
  nickname: string
  password: string
}

/** Quita las credenciales antes de que el usuario salga de la capa de servicios. */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _hash, passwordSalt: _salt, ...rest } = user
  return rest
}

/** Normaliza el nickname: en minúsculas y sin espacios, que es también su id. */
export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/\s+/g, '')
}

/** Valida el formulario de registro. Devuelve un error por campo, o `null` si todo está bien. */
export function validateRegistration(input: RegisterInput): Partial<Record<keyof RegisterInput, string>> | null {
  const errors: Partial<Record<keyof RegisterInput, string>> = {}

  if (input.nombre.trim().length < 2) errors.nombre = 'Escribe tu nombre'
  if (input.apellidos.trim().length < 2) errors.apellidos = 'Escribe tus apellidos'

  const nickname = normalizeNickname(input.nickname)
  if (!NICKNAME_PATTERN.test(nickname)) {
    errors.nickname = 'Entre 3 y 20 caracteres: letras, números, punto, guion o guion bajo'
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres`
  }

  return Object.keys(errors).length > 0 ? errors : null
}

export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  const backend = await getBackend()
  return (await backend.getUser(normalizeNickname(nickname))) === null
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  const errors = validateRegistration(input)
  if (errors) {
    throw new BackendError(Object.values(errors)[0] ?? 'Revisa los datos del formulario')
  }

  const backend = await getBackend()
  const nickname = normalizeNickname(input.nickname)
  const salt = randomSalt()

  const user: User = {
    id: nickname,
    nickname,
    nombre: input.nombre.trim(),
    apellidos: input.apellidos.trim(),
    passwordHash: await hashPassword(input.password, salt),
    passwordSalt: salt,
    photo: null,
    isAdmin: nickname === ADMIN_NICKNAME,
    hasPaid: false,
    createdAt: Date.now(),
  }

  await backend.createUser(user)
  return toPublicUser(user)
}

export async function login(nickname: string, password: string): Promise<PublicUser> {
  const backend = await getBackend()
  const user = await backend.getUser(normalizeNickname(nickname))

  // Mismo mensaje en ambos casos: así no se puede averiguar qué nicknames existen.
  const invalid = new BackendError('Nickname o contraseña incorrectos')
  if (!user) throw invalid
  if (!(await verifyPassword(password, user.passwordSalt, user.passwordHash))) throw invalid

  return toPublicUser(user)
}
