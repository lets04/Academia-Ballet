import { useEffect, useState } from 'react';
import { useBranch } from '@/contexts/branch';
import { studentService } from '@/services/students.service';
import { paymentService } from '@/services/payment.service';
import { expenseService } from '@/services/expense.service';
import { cn } from '@/lib/utils';

interface DashboardStats {
  activeStudents: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingDebt: number;
}

export function DashboardPage() {
  const { selectedBranchId } = useBranch();
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    pendingDebt: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Load active students
        const students = await studentService.list(true);
        const activeStudents = students.length;

        // Load income
        const income = await paymentService.getTotalMonthlyIncome(
          currentMonth,
          selectedBranchId || undefined
        );

        // Load expenses
        const expenses = await expenseService.getTotalMonthlyExpenses(
          currentMonth,
          selectedBranchId || undefined
        );

        // Load pending debt
        const debt = await paymentService.getPendingDebt(
          selectedBranchId || undefined
        );

        setStats({
          activeStudents,
          monthlyIncome: income,
          monthlyExpenses: expenses,
          pendingDebt: debt,
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [selectedBranchId]);

  const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) => (
    <div className={cn(
      'rounded-lg p-6 shadow-md transition-all hover:shadow-lg',
      'bg-white dark:bg-slate-800',
      'border border-slate-200 dark:border-slate-700'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            'text-sm font-medium mb-2',
            'text-slate-600 dark:text-slate-400'
          )}>
            {title}
          </p>
          <p className={cn(
            'text-3xl font-bold',
            color
          )}>
            {isLoading ? '...' : value}
          </p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={cn(
          'text-3xl font-bold mb-2',
          'text-slate-900 dark:text-slate-50'
        )}>
          Dashboard
        </h1>
        <p className={cn(
          'text-slate-600 dark:text-slate-400'
        )}>
          Bienvenido al sistema de administración
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Estudiantes Activos"
          value={stats.activeStudents}
          icon="👥"
          color="text-blue-600 dark:text-blue-400"
        />

        <StatCard
          title="Ingresos del Mes"
          value={`Bs. ${stats.monthlyIncome.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
          icon="💰"
          color="text-green-600 dark:text-green-400"
        />

        <StatCard
          title="Egresos del Mes"
          value={`Bs. ${stats.monthlyExpenses.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
          icon="💸"
          color="text-yellow-600 dark:text-yellow-400"
        />

        <StatCard
          title="Deuda Pendiente"
          value={`Bs. ${stats.pendingDebt.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
          icon="⚠️"
          color="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Quick Actions */}
      <div className={cn(
        'rounded-lg p-6',
        'bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700'
      )}>
        <h2 className={cn(
          'text-lg font-bold mb-4',
          'text-slate-900 dark:text-slate-50'
        )}>
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button className={cn(
            'px-4 py-2 rounded-lg font-semibold transition-colors',
            'bg-fuchsia-100 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400',
            'hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900/30'
          )}>
            ➕ Nuevo Estudiante
          </button>
          <button className={cn(
            'px-4 py-2 rounded-lg font-semibold transition-colors',
            'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
            'hover:bg-blue-200 dark:hover:bg-blue-900/30'
          )}>
            ➕ Nuevo Grupo
          </button>
          <button className={cn(
            'px-4 py-2 rounded-lg font-semibold transition-colors',
            'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
            'hover:bg-green-200 dark:hover:bg-green-900/30'
          )}>
            ➕ Registrar Pago
          </button>
          <button className={cn(
            'px-4 py-2 rounded-lg font-semibold transition-colors',
            'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
            'hover:bg-yellow-200 dark:hover:bg-yellow-900/30'
          )}>
            ➕ Registrar Egreso
          </button>
          <button className={cn(
            'px-4 py-2 rounded-lg font-semibold transition-colors',
            'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
            'hover:bg-purple-200 dark:hover:bg-purple-900/30'
          )}>
            📊 Ver Reportes
          </button>
          <button className={cn(
            'px-4 py-2 rounded-lg font-semibold transition-colors',
            'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
            'hover:bg-indigo-200 dark:hover:bg-indigo-900/30'
          )}>
            ⚙️ Configuración
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className={cn(
        'rounded-lg p-6',
        'bg-gradient-to-r from-fuchsia-50 to-blue-50',
        'dark:from-fuchsia-900/20 dark:to-blue-900/20',
        'border border-fuchsia-200 dark:border-fuchsia-800'
      )}>
        <h3 className={cn(
          'font-semibold mb-2',
          'text-fuchsia-900 dark:text-fuchsia-100'
        )}>
          💡 Tip del Sistema
        </h3>
        <p className={cn(
          'text-sm',
          'text-fuchsia-800 dark:text-fuchsia-200'
        )}>
          Utiliza el selector de sucursal en la parte superior para filtrar la información por sucursal Norte o Centro. También puedes ver todos los datos de ambas sucursales juntas.
        </p>
      </div>
    </div>
  );
}