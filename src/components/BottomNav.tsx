import { NavLink } from 'react-router-dom'
import { CalendarDays, Trophy, UserRound, Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Tab {
  to: string
  label: string
  Icon: LucideIcon
}

const TABS: Tab[] = [
  { to: '/clasificacion', label: 'Clasificación', Icon: Trophy },
  { to: '/jornadas', label: 'Jornadas', Icon: CalendarDays },
  { to: '/cruces', label: 'Cruces', Icon: Workflow },
  { to: '/perfil', label: 'Perfil', Icon: UserRound },
]

/**
 * Barra de navegación inferior.
 *
 * Va con iconos, como pediste, pero la pestaña activa despliega su nombre: así
 * la barra no se satura y se sigue sabiendo en todo momento dónde estás.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-base/85 backdrop-blur-xl"
    >
      <ul className="safe-bottom mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2 pt-2">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                [
                  'group flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5',
                  'transition-colors duration-200',
                  isActive ? 'text-brand-soft' : 'text-ink-mute hover:text-ink-soft',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'flex size-9 items-center justify-center rounded-lg transition-colors duration-200',
                      isActive ? 'bg-brand/15' : 'bg-transparent',
                    ].join(' ')}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" />
                  </span>
                  <span
                    aria-hidden="true"
                    className={[
                      'overflow-hidden text-[10px] font-semibold tracking-wide transition-all duration-200',
                      isActive ? 'max-h-4 opacity-100' : 'max-h-0 opacity-0',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
