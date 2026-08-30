import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

/**
 * Vuelta atrás.
 *
 * Un disco discreto del mismo tono que las tarjetas, con un galón de trazo
 * fino en azul pastel. Al pasar por encima aparece un aro finísimo y el galón se
 * desplaza un punto; al pulsar, el disco se hunde. Todo el gesto está en el
 * movimiento, no en el contorno, que es lo que encaja con una interfaz sin
 * bordes.
 */
export function BackButton({ to = '/', label = 'Volver' }: { to?: string; label?: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="group grid size-12 place-items-center rounded-full bg-surface text-brand-soft
                 transition-[background-color,color,box-shadow,transform] duration-200
                 hover:bg-raised hover:text-brand-light
                 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-brand)_35%,transparent)]
                 active:scale-95"
    >
      <ChevronLeft
        size={24}
        strokeWidth={1.5}
        aria-hidden="true"
        className="transition-transform duration-200 ease-out group-hover:-translate-x-[2px]"
      />
    </Link>
  )
}
