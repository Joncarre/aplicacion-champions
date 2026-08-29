// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { DEMO_NICKNAMES, DEMO_UNPAID, resetDemoData } from './services/demoBackend'
import { clearSession } from './services/session'
import { factOfTheDay } from './data/facts'
import { now } from './lib/clock'

/**
 * Prueba de humo de la interfaz. Monta la aplicación de verdad sobre el
 * backend de demostración y recorre las pantallas como lo haría un usuario.
 * El reloj está fijado al 15 de diciembre de 2026 (ver `vite.config.ts`).
 */

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

async function loginAs(nickname: string) {
  const user = userEvent.setup()
  renderApp('/login')

  await user.type(await screen.findByLabelText('Nickname'), nickname)
  await user.type(screen.getByLabelText('Contraseña'), 'champions')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))

  // La sesión arranca en Clasificación; se espera a que los datos estén dentro
  // para que las comprobaciones no lleguen antes que la carga.
  await screen.findByRole('heading', { name: 'Clasificación' })
  await screen.findByText('joncarre')

  return user
}

describe('la aplicación', () => {
  // Se siembra y nada más: sin recalcular a mano, igual que lo ve un usuario al
  // abrir la aplicación. Si la semilla no dejara las puntuaciones hechas, la
  // clasificación saldría a cero y el perfil sin gráficas.
  beforeEach(async () => {
    clearSession()
    await resetDemoData()
  })

  it('da la bienvenida con los dos accesos y el crédito a GitHub', async () => {
    renderApp('/')

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/porra de la\s*champions/i)
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: /Jonathan Carrero/ })).toHaveAttribute(
      'href',
      'https://github.com/joncarre',
    )
  })

  it('crea una cuenta y avisa de que ha ido bien', async () => {
    const user = userEvent.setup()
    renderApp('/registro')

    await user.type(await screen.findByLabelText('Nombre'), 'Iván')
    await user.type(screen.getByLabelText('Apellidos'), 'Pérez Ruiz')
    await user.type(screen.getByLabelText('Nickname'), 'ivanp')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(/cuenta creada/i)).toBeVisible()
  })

  it('rechaza el registro con datos incompletos sin llamar al backend', async () => {
    const user = userEvent.setup()
    renderApp('/registro')

    await user.type(await screen.findByLabelText('Nickname'), 'x')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText(/escribe tu nombre/i)).toBeTruthy()
    expect(screen.getByText(/entre 3 y 20 caracteres/i)).toBeTruthy()
  })

  it('avisa cuando la contraseña no es correcta', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(await screen.findByLabelText('Nickname'), 'lucia')
    await user.type(screen.getByLabelText('Contraseña'), 'no-es-esta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(/nickname o contraseña incorrectos/i)).toBeVisible()
  })

  it('avisa si el navegador no puede cifrar, como al abrirla por IP en el móvil', async () => {
    const realCrypto = globalThis.crypto
    // Sin `crypto.subtle` no hay forma de derivar la contraseña, que es lo que
    // pasa al abrir la app por IP en la red local en vez de por localhost.
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) },
      configurable: true,
    })

    try {
      renderApp('/')
      expect(await screen.findByText(/conexión no segura/i)).toBeVisible()
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true })
    }
  })

  it('no molesta con ese aviso cuando sí se puede cifrar', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText(/conexión no segura/i)).toBeNull()
  })

  it('entra y muestra la clasificación de la porra con todos los participantes', async () => {
    await loginAs('lucia')

    expect(await screen.findByRole('heading', { name: 'Clasificación' })).toBeTruthy()

    // Todos los participantes de prueba, y quien mira aparece marcado como «tú».
    const nicknames = new RegExp('^(' + DEMO_NICKNAMES.join('|') + ')$')
    expect(await screen.findAllByText(nicknames)).toHaveLength(DEMO_NICKNAMES.length)
    expect(screen.getByText('tú')).toBeTruthy()
  })

  it('cambia a la clasificación real de la Champions', async () => {
    const user = await loginAs('lucia')

    await user.click(await screen.findByRole('tab', { name: 'Champions' }))

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Real Madrid')).toBeTruthy()
    // Las nueve columnas que pediste, más la de equipo.
    expect(within(table).getAllByRole('columnheader')).toHaveLength(9)
    expect(within(table).getAllByRole('row')).toHaveLength(37) // 36 equipos + cabecera
  })

  it('abre la jornada en curso y deja apostar a quien ha pagado', async () => {
    const user = await loginAs('lucia')

    await user.click(await screen.findByRole('link', { name: 'Jornadas' }))

    expect(await screen.findByRole('heading', { name: 'Jornadas' })).toBeTruthy()
    // La jornada 7 es la que está abierta el 15 de diciembre de 2026.
    await waitFor(() => expect(screen.getByRole('tab', { name: /Jornada 7/ })).toHaveAttribute('aria-selected', 'true'))

    const inputs = await screen.findAllByRole('textbox')
    expect(inputs.length).toBeGreaterThan(0)
    expect(inputs.every((input) => !(input as HTMLInputElement).disabled)).toBe(true)
  })

  it('bloquea las apuestas de quien todavía no ha pagado', async () => {
    const user = await loginAs('noa')

    await user.click(await screen.findByRole('link', { name: 'Jornadas' }))

    expect(await screen.findByText(/no constas como pagado/i)).toBeTruthy()
    // Sin pagar no hay ni un solo campo editable.
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('no deja tocar una jornada ya cerrada', async () => {
    const user = await loginAs('lucia')

    await user.click(await screen.findByRole('link', { name: 'Jornadas' }))
    await screen.findByRole('heading', { name: 'Jornadas' })
    await user.click(await screen.findByRole('tab', { name: /Jornada 3/ }))

    expect(await screen.findByText(/jornada terminada/i)).toBeTruthy()
    await waitFor(() => expect(screen.queryAllByRole('textbox')).toHaveLength(0))
  })

  it('anuncia que los cruces llegarán en febrero de 2027', async () => {
    const user = await loginAs('lucia')

    await user.click(await screen.findByRole('link', { name: 'Cruces' }))

    expect(await screen.findByText(/disponible próximamente/i)).toBeTruthy()
    expect(screen.getByText(/16 de febrero de 2027/)).toBeTruthy()
    expect(screen.getAllByText('Play-offs').length).toBeGreaterThan(0)
  })

  it('muestra el perfil con el estado de pago, la curiosidad y las gráficas', async () => {
    const user = await loginAs('lucia')

    await user.click(await screen.findByRole('link', { name: 'Perfil' }))

    expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeTruthy()
    expect(screen.getByText('Pagado')).toBeTruthy()
    expect(screen.getByText(/miembro desde el/i)).toBeTruthy()

    // La curiosidad del día, que es la misma para todos y cambia cada jornada.
    expect(screen.getByText(/dato del día/i)).toBeVisible()
    expect(screen.getByText(factOfTheDay(now()))).toBeVisible()

    // Las tres gráficas de evolución.
    expect(screen.getByRole('img', { name: /puntos acumulados por jornada/i })).toBeTruthy()
    expect(screen.getByRole('img', { name: /diferencia de puntos con el primer clasificado/i })).toBeTruthy()
    expect(screen.getByRole('img', { name: /de \d+ pronósticos/i })).toBeTruthy()
  })

  it('deja el panel de administración solo al administrador', async () => {
    const user = await loginAs('lucia')

    await user.click(await screen.findByRole('link', { name: 'Perfil' }))
    await screen.findByRole('heading', { name: 'Perfil' })
    expect(screen.queryByRole('link', { name: /admin/i })).toBeNull()
  })

  it('deja al administrador marcar pagos desde su panel', async () => {
    const user = await loginAs('joncarre')

    await user.click(await screen.findByRole('link', { name: 'Perfil' }))
    await user.click(await screen.findByRole('link', { name: /admin/i }))

    expect(await screen.findByRole('heading', { name: 'Administración' })).toBeTruthy()
    const pendientes = await screen.findAllByRole('button', { name: 'Sin pagar' })
    expect(pendientes).toHaveLength(DEMO_UNPAID.length)

    await user.click(pendientes[0]!)
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Sin pagar' })).toHaveLength(0))
  })
})
