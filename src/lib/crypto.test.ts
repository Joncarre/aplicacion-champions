// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { hashPassword, needsRehash, randomSalt, verifyPassword } from './crypto'

describe('hashPassword', () => {
  it('nunca deja la contraseña a la vista', async () => {
    const salt = randomSalt()
    const hash = await hashPassword('champions', salt)
    expect(hash).not.toContain('champions')
    expect(hash).toMatch(/^pbkdf2\$\d+\$[0-9a-f]{64}$/)
  })

  it('da hashes distintos para la misma contraseña con distinta sal', async () => {
    const [a, b] = await Promise.all([
      hashPassword('champions', randomSalt()),
      hashPassword('champions', randomSalt()),
    ])
    expect(a).not.toBe(b)
  })

  it('genera sales distintas cada vez', () => {
    expect(randomSalt()).not.toBe(randomSalt())
    expect(randomSalt()).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('verifyPassword', () => {
  it('acepta la contraseña correcta y rechaza cualquier otra', async () => {
    const salt = randomSalt()
    const hash = await hashPassword('champions', salt)

    expect(await verifyPassword('champions', salt, hash)).toBe(true)
    expect(await verifyPassword('Champions', salt, hash)).toBe(false)
    expect(await verifyPassword('champion', salt, hash)).toBe(false)
    expect(await verifyPassword('', salt, hash)).toBe(false)
  })

  it('rechaza si la sal no es la que se usó', async () => {
    const hash = await hashPassword('champions', randomSalt())
    expect(await verifyPassword('champions', randomSalt(), hash)).toBe(false)
  })

  it('no se traga hashes con formato inválido', async () => {
    const salt = randomSalt()
    expect(await verifyPassword('champions', salt, '')).toBe(false)
    expect(await verifyPassword('champions', salt, 'texto-plano')).toBe(false)
    expect(await verifyPassword('champions', salt, 'md5$1$abc')).toBe(false)
    expect(await verifyPassword('champions', salt, 'pbkdf2$0$abc')).toBe(false)
  })
})

describe('needsRehash', () => {
  it('detecta los hashes hechos con menos iteraciones de las actuales', async () => {
    const actual = await hashPassword('champions', randomSalt())
    expect(needsRehash(actual)).toBe(false)
    expect(needsRehash('pbkdf2$1000$abc')).toBe(true)
    expect(needsRehash('sha256$1$abc')).toBe(true)
  })
})
