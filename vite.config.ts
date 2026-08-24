import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // `npm run dev:https` levanta el servidor con un certificado autofirmado.
    // Hace falta para probar en el móvil: los navegadores solo dan acceso a
    // `crypto.subtle`, que es lo que cifra las contraseñas, en contextos
    // seguros (localhost o HTTPS). Por IP y sin HTTPS no existe.
    ...(mode === 'https' ? [basicSsl()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    // Los tests corren siempre contra el backend de demostración y con el
    // reloj fijado a mitad de competición, para poder comprobar bloqueos,
    // clasificación y gráficas sin esperar a septiembre de 2026.
    env: {
      VITE_DEMO_MODE: 'true',
      VITE_DEMO_NOW: '2026-12-15T12:00',
      VITE_ADMIN_NICKNAME: 'joncarre',
    },
  },
}))
