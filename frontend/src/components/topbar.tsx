import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { useBranch } from '@/contexts/branch';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, UserRound } from 'lucide-react';

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { branches, selectedBranchId, selectBranch } = useBranch();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className={cn(
      'h-16 border-b flex items-center justify-between px-4 md:px-6',
      'bg-white dark:bg-slate-800',
      'border-slate-200 dark:border-slate-700'
    )}>
      {/* Left section - Info */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className={cn(
            'font-semibold',
            'text-slate-900 dark:text-slate-50'
          )}>
            Sistema de Administración
          </h2>
          <p className={cn(
            'text-xs',
            'text-slate-500 dark:text-slate-400'
          )}>
            Academia de Ballet
          </p>
        </div>
      </div>

      {/* Middle section - Branch selector */}
      <div className="flex-1 flex justify-center">
        <select
          value={selectedBranchId || ''}
          onChange={(e) => selectBranch(e.target.value || null)}
          className={cn(
            'px-3 py-2 rounded-lg border',
            'bg-slate-50 dark:bg-slate-700',
            'border-slate-300 dark:border-slate-600',
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
      </div>

      {/* Right section - Controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
            'hover:bg-slate-100 dark:hover:bg-slate-700',
            'text-slate-600 dark:text-slate-300',
            'border border-slate-200 dark:border-slate-700'
          )}
          title={theme === 'dark' ? 'Modo día' : 'Modo noche'}
          aria-label={theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Día' : 'Noche'}</span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
              'hover:bg-slate-100 dark:hover:bg-slate-700',
              'text-slate-600 dark:text-slate-300',
              'border border-slate-200 dark:border-slate-700'
            )}
          >
            <UserRound size={18} />
            <span className="hidden sm:inline">Cuenta</span>
          </button>

          {showUserMenu && (
            <div className={cn(
              'absolute right-0 mt-2 w-48 rounded-lg shadow-lg',
              'bg-white dark:bg-slate-800',
              'border border-slate-200 dark:border-slate-700',
              'z-50'
            )}>
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <p className={cn(
                  'text-sm font-semibold',
                  'text-slate-900 dark:text-slate-50'
                )}>
                  {user?.email}
                </p>
                <p className={cn(
                  'text-xs',
                  'text-slate-500 dark:text-slate-400'
                )}>
                  Administrador
                </p>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setShowUserMenu(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-left text-sm',
                  'text-red-600 dark:text-red-400',
                  'hover:bg-red-50 dark:hover:bg-red-900/20',
                  'transition-colors'
                )}
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
