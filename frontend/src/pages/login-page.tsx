import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center',
      'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'
    )}>
      <div className={cn(
        'w-full max-w-md p-8 rounded-lg shadow-lg',
        'bg-white dark:bg-slate-800'
      )}>
        <div className="text-center mb-8">
          <h1 className={cn(
            'text-3xl font-bold mb-2',
            'text-slate-900 dark:text-slate-50'
          )}>
            Academia Ballet
          </h1>
          <p className={cn(
            'text-slate-600 dark:text-slate-400'
          )}>
            Gestión de operaciones
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              'text-slate-900 dark:text-slate-100'
            )}>
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                'w-full px-4 py-2 rounded-lg border',
                'bg-slate-50 dark:bg-slate-700',
                'border-slate-300 dark:border-slate-600',
                'text-slate-900 dark:text-slate-50',
                'placeholder-slate-400 dark:placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-fuchsia-500'
              )}
              placeholder="admin@academia.com"
              required
            />
          </div>

          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              'text-slate-900 dark:text-slate-100'
            )}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                'w-full px-4 py-2 rounded-lg border',
                'bg-slate-50 dark:bg-slate-700',
                'border-slate-300 dark:border-slate-600',
                'text-slate-900 dark:text-slate-50',
                'placeholder-slate-400 dark:placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-fuchsia-500'
              )}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className={cn(
              'p-3 rounded-lg',
              'bg-red-50 dark:bg-red-900/20',
              'text-red-700 dark:text-red-400',
              'text-sm'
            )}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-2 rounded-lg font-semibold',
              'bg-fuchsia-600 hover:bg-fuchsia-700 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-700',
              'text-white',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <p className={cn(
          'text-center text-sm mt-6',
          'text-slate-600 dark:text-slate-400'
        )}>
          Sistema de administración de Academia Ballet
        </p>
      </div>
    </div>
  );
};
