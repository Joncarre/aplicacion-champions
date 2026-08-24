/**
 * Registra en los tipos de Vitest los matchers de DOM que aporta jest-dom
 * (`toBeVisible`, `toHaveAttribute`, `toHaveTextContent`…). Se cargan en
 * tiempo de ejecución desde `vitest.setup.ts`.
 */
import '@testing-library/jest-dom/vitest'
