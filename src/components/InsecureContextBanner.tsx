import { TriangleAlert } from 'lucide-react'

/**
 * Aviso para cuando el navegador no puede cifrar contraseñas.
 *
 * `crypto.subtle` —lo que deriva las contraseñas— solo está disponible en
 * contextos seguros: `localhost` o HTTPS. Al abrir la app por IP en la red
 * local para probarla en el móvil, ese API no existe y tanto el registro como
 * el inicio de sesión fallan. Se comprueba el API en sí, y no
 * `window.isSecureContext`, porque es exactamente lo que se va a usar.
 */
export function canEncrypt(): boolean {
  return typeof globalThis.crypto !== 'undefined' && Boolean(globalThis.crypto.subtle)
}

export function InsecureContextBanner() {
  if (canEncrypt()) return null

  return (
    <div role="alert" className="safe-top sticky top-0 z-50 border-b border-sign/30 bg-sign/12 px-4 py-2.5">
      <div className="mx-auto flex max-w-lg items-start gap-2.5 text-sign">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-xs leading-relaxed">
          Estás en una conexión no segura, así que no podrás iniciar sesión. Abre la aplicación en{' '}
          <strong>localhost</strong> o arranca el servidor con <strong>npm run dev:https</strong>.
        </p>
      </div>
    </div>
  )
}
