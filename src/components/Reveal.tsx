import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Retardo en milisegundos, para escalonar listas. */
  delay?: number
  /** Etiqueta que se pinta; por defecto un div. */
  as?: ElementType
  className?: string
}

/**
 * Hace aparecer su contenido cuando entra en pantalla.
 *
 * Se apoya en `IntersectionObserver` y se desconecta en cuanto dispara: la
 * información aparece una vez y se queda, que al volver a subir vuelva a
 * desvanecerse resultaría mareante. Si el navegador no lo soporta —o estamos
 * en un entorno de pruebas sin maquetación— el contenido se muestra sin más.
 *
 * La animación en sí es una transición de CSS, así que la regla global de
 * `prefers-reduced-motion` la desactiva sola para quien lo pida.
 */
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (shown) return
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      // Se dispara un poco antes de que el elemento llegue al borde inferior.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref}
      // El desplazamiento va en línea y desaparece al mostrarse. Si se quedara
      // una transformación puesta, este elemento pasaría a ser el bloque
      // contenedor de cualquier `position: fixed` que tuviera dentro, y los
      // diálogos y barras flotantes se anclarían aquí en vez de a la ventana.
      style={{
        ...(delay > 0 ? { transitionDelay: `${delay}ms` } : null),
        ...(shown ? null : { translate: '0 1rem' }),
      }}
      className={[
        'transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
        shown ? 'opacity-100' : 'opacity-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  )
}

/** Escalona un índice sin que los últimos elementos de una lista larga tarden una eternidad. */
export function stagger(index: number, step = 45, max = 320): number {
  return Math.min(index * step, max)
}
