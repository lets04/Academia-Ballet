import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={cn(
        'min-h-screen flex items-center justify-center',
        'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'
      )}>
        <div className={cn(
          'text-center',
          'text-slate-600 dark:text-slate-400'
        )}>
          <div className="inline-block animate-spin">
            ⏳
          </div>
          <p className="mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
