import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardList,
  CreditCard,
  Home,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Receipt,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { useBranch } from '@/contexts/branch';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: Home },
  { id: 'students', label: 'Estudiantes', href: '/students', icon: Users },
  { id: 'groups', label: 'Grupos', href: '/groups', icon: Layers },
  { id: 'payments', label: 'Pagos', href: '/payments', icon: CreditCard },
  { id: 'expenses', label: 'Egresos', href: '/expenses', icon: Receipt },
];

const configItems = [
  { id: 'branches', label: 'Sucursales', href: '/branches', icon: MapPin },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { branches, selectedBranchId, selectBranch } = useBranch();

  const isActive = (href: string) => location.pathname === href;

  const userInitials = user?.email
    ? user.email
        .split('@')[0]
        .split(/[._-]/)
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : 'A';

  const userName = user?.email
    ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Admin';

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
            Academia de Ballet
          </p>
        </div>

        {/* Branch selector */}
        <div className={cn(
          'border-b border-slate-200 dark:border-slate-700',
          'p-4'
        )}>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Sucursal
          </label>
          <div className="relative">
            <select
              value={selectedBranchId || ''}
              onChange={(e) => selectBranch(e.target.value || null)}
              className={cn(
                'w-full appearance-none rounded-xl border px-3 py-2 pr-8 text-sm font-medium',
                'bg-slate-50 dark:bg-slate-700',
                'border-slate-200 dark:border-slate-600',
                'text-slate-900 dark:text-slate-50',
                'focus:outline-none focus:ring-2 focus:ring-fuchsia-500'
              )}
            >
              <option value="">Todas las sucursales</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
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
          'p-4 space-y-3'
        )}>
          {/* Modo visual toggle row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Modo visual
            </span>
            <button
              onClick={toggleTheme}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition',
                theme === 'dark' ? 'bg-fuchsia-600' : 'bg-slate-300'
              )}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span
                className={cn(
                  'inline-flex size-5 items-center justify-center rounded-full bg-white transition',
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                )}
              >
                {theme === 'dark' ? (
                  <Moon size={12} className="text-fuchsia-600" />
                ) : (
                  <Sun size={12} className="text-amber-500" />
                )}
              </span>
            </button>
          </div>

          {/* Account card */}
          <div className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-3',
            'bg-slate-50 dark:bg-slate-700/50'
          )}>
            <div className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
              'text-sm font-bold'
            )}>
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                {userName}
              </p>
              <span className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300'
              )}>
                Administrador
              </span>
            </div>
            <button
              onClick={logout}
              className={cn(
                'flex size-8 items-center justify-center rounded-lg transition',
                'text-slate-500 hover:bg-red-50 hover:text-red-600',
                'dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400'
              )}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
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
