import { useEffect, useMemo, useState } from 'react';
import { useBranch } from '@/contexts/branch';
import { enrollmentService } from '@/services/enrollment.service';
import { paymentService } from '@/services/payment.service';
import { expenseService } from '@/services/expense.service';
import { cn } from '@/lib/utils';
import {
  Building2,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

interface DashboardStats {
  activeStudents: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingDebt: number;
}

interface BranchDashboardStats extends DashboardStats {
  branchId: string;
  branchName: string;
}

export function DashboardPage() {
  const { branches, selectedBranchId } = useBranch();
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    pendingDebt: 0,
  });
  const [branchStats, setBranchStats] = useState<BranchDashboardStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        const currentMonth = new Date().toISOString().slice(0, 7);

        const [activeStudents, income, expenses, debt] = await Promise.all([
          enrollmentService.getActiveCount(selectedBranchId || undefined),
          paymentService.getTotalMonthlyIncome(currentMonth, selectedBranchId || undefined),
          expenseService.getTotalMonthlyExpenses(currentMonth, selectedBranchId || undefined),
          paymentService.getPendingDebt(selectedBranchId || undefined),
        ]);

        setStats({
          activeStudents,
          monthlyIncome: income,
          monthlyExpenses: expenses,
          pendingDebt: debt,
        });

        const perBranch = await Promise.all(
          branches.map(async (branch) => {
            const [branchStudents, branchIncome, branchExpenses, branchDebt] = await Promise.all([
              enrollmentService.getActiveCount(branch.id),
              paymentService.getTotalMonthlyIncome(currentMonth, branch.id),
              expenseService.getTotalMonthlyExpenses(currentMonth, branch.id),
              paymentService.getPendingDebt(branch.id),
            ]);

            return {
              branchId: branch.id,
              branchName: branch.name,
              activeStudents: branchStudents,
              monthlyIncome: branchIncome,
              monthlyExpenses: branchExpenses,
              pendingDebt: branchDebt,
            };
          })
        );

        setBranchStats(perBranch);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [selectedBranchId, branches]);

  const selectedBranchName = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId)?.name,
    [branches, selectedBranchId]
  );

  const formatMoney = (amount: number) =>
    `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

  const StatCard = ({
    title,
    value,
    color,
    icon: Icon,
  }: {
    title: string;
    value: string | number;
    color: string;
    icon: typeof Users;
  }) => (
    <div
      className={cn(
        'rounded-3xl p-6 shadow-lg transition-all hover:shadow-xl',
        'bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={cn(
              'text-sm font-semibold mb-4 uppercase tracking-[0.2em]',
              'text-slate-500 dark:text-slate-400'
            )}
          >
            {title}
          </p>
          <p className={cn('text-4xl font-bold leading-tight', color)}>
            {isLoading ? '...' : value}
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          <Icon size={22} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={cn('text-3xl font-bold mb-2', 'text-slate-900 dark:text-slate-50')}>
          Dashboard
        </h1>
        <p className={cn('text-slate-600 dark:text-slate-400')}>
          {selectedBranchName
            ? `Resumen de la sucursal ${selectedBranchName}`
            : 'Resumen general de todas las sucursales'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Estudiantes Activos"
          value={stats.activeStudents}
          color="text-blue-700 dark:text-blue-300"
          icon={Users}
        />
        <StatCard
          title="Ingresos del Mes"
          value={formatMoney(stats.monthlyIncome)}
          color="text-green-700 dark:text-green-300"
          icon={TrendingUp}
        />
        <StatCard
          title="Egresos del Mes"
          value={formatMoney(stats.monthlyExpenses)}
          color="text-yellow-700 dark:text-yellow-300"
          icon={TrendingDown}
        />
        <StatCard
          title="Deuda Pendiente"
          value={formatMoney(stats.pendingDebt)}
          color="text-red-700 dark:text-red-300"
          icon={CreditCard}
        />
      </div>

      {branches.length > 0 && (
        <div
          className={cn(
            'rounded-3xl p-6',
            'bg-white dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700'
          )}
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className={cn('text-lg font-bold', 'text-slate-900 dark:text-slate-50')}>
                Resumen por sucursal
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Comparativa del mes actual en cada sede.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {branchStats.map((branch) => (
              <article
                key={branch.branchId}
                className={cn(
                  'rounded-2xl border p-5 transition-colors',
                  selectedBranchId === branch.branchId
                    ? 'border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-fuchsia-950/20'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                )}
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
                    <Building2 size={16} />
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                    {branch.branchName}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Estudiantes</p>
                    <p className="mt-1 font-semibold text-blue-700 dark:text-blue-300">
                      {isLoading ? '...' : branch.activeStudents}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Ingresos</p>
                    <p className="mt-1 font-semibold text-green-700 dark:text-green-300">
                      {isLoading ? '...' : formatMoney(branch.monthlyIncome)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Egresos</p>
                    <p className="mt-1 font-semibold text-yellow-700 dark:text-yellow-300">
                      {isLoading ? '...' : formatMoney(branch.monthlyExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Deuda</p>
                    <p className="mt-1 font-semibold text-red-700 dark:text-red-300">
                      {isLoading ? '...' : formatMoney(branch.pendingDebt)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          'rounded-lg p-6',
          'bg-white dark:bg-slate-800',
          'border border-slate-200 dark:border-slate-700'
        )}
      >
        <h2 className={cn('text-lg font-bold mb-4', 'text-slate-900 dark:text-slate-50')}>
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            className={cn(
              'px-4 py-2 rounded-lg font-semibold transition-colors',
              'bg-fuchsia-100 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400',
              'hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900/30'
            )}
          >
            Nuevo estudiante
          </button>
          <button
            className={cn(
              'px-4 py-2 rounded-lg font-semibold transition-colors',
              'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
              'hover:bg-blue-200 dark:hover:bg-blue-900/30'
            )}
          >
            Nuevo grupo
          </button>
          <button
            className={cn(
              'px-4 py-2 rounded-lg font-semibold transition-colors',
              'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
              'hover:bg-green-200 dark:hover:bg-green-900/30'
            )}
          >
            Registrar pago
          </button>
          <button
            className={cn(
              'px-4 py-2 rounded-lg font-semibold transition-colors',
              'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
              'hover:bg-yellow-200 dark:hover:bg-yellow-900/30'
            )}
          >
            Registrar egreso
          </button>
          <button
            className={cn(
              'px-4 py-2 rounded-lg font-semibold transition-colors',
              'bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
              'hover:bg-violet-200 dark:hover:bg-violet-900/30'
            )}
          >
            Nueva sucursal
          </button>
          <button
            className={cn(
              'px-4 py-2 rounded-lg font-semibold transition-colors',
              'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
              'hover:bg-indigo-200 dark:hover:bg-indigo-900/30'
            )}
          >
            Configuración
          </button>
        </div>
      </div>

      <div
        className={cn(
          'rounded-lg p-6',
          'bg-linear-to-r from-fuchsia-50 to-blue-50',
          'dark:from-fuchsia-900/20 dark:to-blue-900/20',
          'border border-fuchsia-200 dark:border-fuchsia-800'
        )}
      >
        <h3 className={cn('font-semibold mb-2', 'text-fuchsia-900 dark:text-fuchsia-100')}>
          Tip del Sistema
        </h3>
        <p className={cn('text-sm', 'text-fuchsia-800 dark:text-fuchsia-200')}>
          Usa el selector de sucursal en la barra superior para filtrar las tarjetas principales.
          El resumen por sucursal siempre muestra el detalle de cada sede. Puedes agregar nuevas
          sucursales desde la sección Configuración → Sucursales.
        </p>
      </div>
    </div>
  );
}
