// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { getBackend } from './services/backend'
import { resetDemoData } from './services/demoBackend'
import { clearSession } from './services/session'

/**
 * La aplicación contra una base de datos vacía.
 *
 * Es el estado real del primer día en Firestore: sin equipos, sin calendario y
 * sin nadie registrado. Todo tiene que aguantar y explicar qué falta, en vez de
 * quedarse en blanco o reventar.
 */
async function emptyEverything() {
  const backend = await getBackend()
  await backend.replaceTeams([])
  await backend.replaceMatches([])
  await backend.replaceScores([])
  for (const user of await backend.listUsers()) await backend.deleteUser(user.id)
}

/** Descarta lo pintado y monta la app de nuevo, como una recarga del navegador. */
function cleanupAndRender(route: string) {
  cleanup()
  return renderApp(route)
}

function renderApp(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

describe('con la base de datos vacía', () => {
  beforeEach(async () => {
    clearSession()
    await resetDemoData()
    await emptyEverything()
  })

  it('deja registrar al primer participante', async () => {
    const user = userEvent.setup()
    renderApp('/registro')

    await user.type(await screen.findByLabelText('Nombre'), 'Jonathan')
    await user.type(screen.getByLabelText('Apellidos'), 'Carrero')
    await user.type(screen.getByLabelText('Nickname'), 'joncarre')
    await user.type(screen.getByLabelText('Contraseña'), 'unaclave')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(/cuenta creada/i)).toBeVisible()

    // Y ese primer usuario es el administrador, que es quien siembra el resto.
    const backend = await getBackend()
    expect((await backend.getUser('joncarre'))?.isAdmin).toBe(true)
  })

  it('explica que faltan datos en vez de quedarse en blanco', async () => {
    const backend = await getBackend()
    await backend.createUser({
      id: 'joncarre',
      nickname: 'joncarre',
      nombre: 'Jonathan',
      apellidos: 'Carrero',
      passwordHash: 'pbkdf2$1$00',
      passwordSalt: '00',
      photo: null,
      isAdmin: true,
      hasPaid: false,
      createdAt: Date.now(),
    })

    const user = userEvent.setup()
    renderApp('/login')
    await user.type(await screen.findByLabelText('Nickname'), 'joncarre')
    await user.type(screen.getByLabelText('Contraseña'), 'loquesea')
    // Con un hash inventado el acceso falla, pero sin romperse.
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/incorrectos/i)).toBeVisible()
  })

  it('la bienvenida funciona igual sin ningún dato', async () => {
    renderApp('/')
    expect(await screen.findByRole('link', { name: 'Crear cuenta' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy()
  })

  it('la primera sesión del administrador le dice qué le falta por hacer', async () => {
    const user = userEvent.setup()

    // Registro y acceso, tal cual lo hará el día que se estrene.
    renderApp('/registro')
    await user.type(await screen.findByLabelText('Nombre'), 'Jonathan')
    await user.type(screen.getByLabelText('Apellidos'), 'Carrero')
    await user.type(screen.getByLabelText('Nickname'), 'joncarre')
    await user.type(screen.getByLabelText('Contraseña'), 'unaclave')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await screen.findByText(/cuenta creada/i)

    cleanupAndRender('/login')
    await user.type(await screen.findByLabelText('Nickname'), 'joncarre')
    await user.type(screen.getByLabelText('Contraseña'), 'unaclave')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    // La clasificación no está vacía sin más: explica que no hay nadie aún.
    expect(await screen.findByRole('heading', { name: 'Clasificación' })).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: 'Champions' }))
    expect(await screen.findByText(/sin equipos cargados/i)).toBeTruthy()

    // Y las jornadas mandan al panel de administración a sembrar el calendario.
    await user.click(screen.getByRole('link', { name: 'Jornadas' }))
    expect(await screen.findByText(/todavía no hay partidos/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /panel de administración/i })).toHaveAttribute('href', '/admin')
  })
})
