import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedLayout, PublicLayout } from '@/components/layouts'
import { InsecureContextBanner } from '@/components/InsecureContextBanner'
import Welcome from '@/pages/Welcome'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Clasificacion from '@/pages/Clasificacion'
import Jornadas from '@/pages/Jornadas'
import Cruces from '@/pages/Cruces'
import Perfil from '@/pages/Perfil'

export default function App() {
  return (
    <AuthProvider>
      <InsecureContextBanner />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
        </Route>

        <Route element={<ProtectedLayout />}>
          <Route path="/clasificacion" element={<Clasificacion />} />
          <Route path="/jornadas" element={<Jornadas />} />
          <Route path="/cruces" element={<Cruces />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
