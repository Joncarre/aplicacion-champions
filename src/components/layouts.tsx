import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { DataProvider } from '@/context/DataContext'
import { BottomNav } from './BottomNav'
import { FullPageLoader } from './Spinner'

/** Zona privada: exige sesión y monta la capa de datos y la barra inferior. */
export function ProtectedLayout() {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <FullPageLoader label="Recuperando tu sesión" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return (
    <DataProvider>
      <div className="min-h-dvh bg-base">
        {/* La clave por ruta hace que cada pestaña entre con su propia animación. */}
        <main key={location.pathname} className="animate-page mx-auto w-full max-w-lg px-4 pb-28">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </DataProvider>
  )
}

/** Zona pública: si ya hay sesión, no tiene sentido volver a bienvenida o login. */
export function PublicLayout() {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <FullPageLoader label="Cargando" />
  if (user) return <Navigate to="/clasificacion" replace />

  return (
    <div key={location.pathname} className="animate-page min-h-dvh bg-base">
      <Outlet />
    </div>
  )
}
