import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  CreditCard,
  Home,
  Layers,
  MapPin,
  Menu,
  Receipt,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: Home },
  { id: 'students', label: 'Estudiantes', href: '/students', icon: Users },
  { id: 'groups', label: 'Grupos', href: '/groups', icon: Layers },
  { id: 'enrollments', label: 'Inscripciones', href: '/enrollments', icon: ClipboardList },
  { id: 'payments', label: 'Pagos', href: '/payments', icon: CreditCard },
  { id: 'expenses', label: 'Egresos', href: '/expenses', icon: Receipt },
];

const configItems = [
  { id: 'branches', label: 'Sucursales', href: '/branches', icon: MapPin },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed top-4 left-4 z-50 md:hidden',
          'p-2 rounded-lg',
          'bg-fuchsia-600 hover:bg-fuchsia-700 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-700',
          'text-white'
        )}
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:relative z-40 h-screen w-64 flex flex-col',
          'border-r border-slate-200 dark:border-slate-700',
          'bg-white dark:bg-slate-800',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h1 className={cn(
            'text-2xl font-bold',
            'text-fuchsia-600 dark:text-fuchsia-400'
          )}>
            BAFOLDANZ
          </h1>
          <p className={cn(
            'text-sm mt-1',
            'text-slate-600 dark:text-slate-400'
          )}>
            Gestión de operaciones
          </p>
        </div>

        {/* Navigation */}
        <nav className={cn(
          'flex-1 overflow-y-auto px-3 py-4 space-y-1'
        )}>
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 rounded-lg',
                'transition-colors',
                isActive(item.href)
                  ? 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              )}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>
              {item.label}
              </span>
            </Link>
            );
          })}

          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Configuración
            </p>
          </div>

          {configItems.map((item) => {
            const Icon = item.icon;

            return (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 rounded-lg',
                'transition-colors',
                isActive(item.href)
                  ? 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              )}
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>
              {item.label}
              </span>
            </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          'border-t border-slate-200 dark:border-slate-700',
          'p-4'
        )}>
          <div className={cn(
            'px-3 py-2 rounded-lg',
            'bg-slate-50 dark:bg-slate-700/50',
            'text-xs text-slate-600 dark:text-slate-400'
          )}>
            <p className="font-semibold mb-1">v1.0.0</p>
            <p>Sistema de Academia Ballet</p>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
