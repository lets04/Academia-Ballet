import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '@/contexts/branch';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import { enrollmentService } from '@/services/enrollment.service';
import { paymentService } from '@/services/payment.service';
import { expenseService } from '@/services/expense.service';
import { groupService } from '@/services/group.service';
import { cn } from '@/lib/utils';
import { parseScheduleLabel } from '@/lib/schedule';
import {
  FileDown,
  Plus,
} from 'lucide-react';

interface DashboardStats {
  activeStudents: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingDebt: number;
}



interface ActivityItem {
  id: string;
  type: 'payment' | 'enrollment' | 'expense' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  color: string;
}

interface GroupWithCount {
  id: string;
  name: string;
  schedule: string;
  branchName: string;
  studentCount: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { branches, selectedBranchId } = useBranch();
  const { user } = useAuth();

  const userName = useMemo(() => {
    if (!user?.email) return '';
    const namePart = user.email.split('@')[0];
    return namePart
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }, [user]);
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    pendingDebt: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [dayCounts, setDayCounts] = useState<Record<number, number>>({});

  const today = new Date();
  const todayDayIndex = today.getDay(); // 0=Sun, 1=Mon...
  // Map JS getDay() to our weekday order: Mon=1, Tue=2, ... Sun=0
  const todayWeekdayId = todayDayIndex === 0 ? 0 : todayDayIndex;

  const formatMoney = (amount: number) =>
    `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();

        // Stats
        const [activeStudents, income, expenses, debt] = await Promise.all([
          enrollmentService.getActiveCount(selectedBranchId || undefined),
          paymentService.getTotalMonthlyIncome(currentMonth, selectedBranchId || undefined),
          expenseService.getTotalMonthlyExpenses(currentMonth, selectedBranchId || undefined),
          paymentService.getPendingDebt(selectedBranchId || undefined),
        ]);
        setStats({ activeStudents, monthlyIncome: income, monthlyExpenses: expenses, pendingDebt: debt });

        // Groups with counts
        const groupsData = await groupService.list(selectedBranchId || undefined);
        const groupsWithCounts = await Promise.all(
          groupsData.map(async (g) => {
            const count = await groupService.getStudentCount(g.id);
            const branch = branches.find((b) => b.id === g.branch_id);
            return {
              id: g.id,
              name: g.name,
              schedule: g.schedule,
              branchName: branch?.name || '',
              studentCount: count,
            };
          })
        );
        setGroups(groupsWithCounts);

        // Day counts from schedules
        const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        groupsData.forEach((g) => {
          const parsed = parseScheduleLabel(g.schedule);
          parsed.days.forEach((d) => {
            counts[d] = (counts[d] || 0) + 1;
          });
        });
        setDayCounts(counts);

        // Recent activity
        const activityItems: ActivityItem[] = [];

        // Recent payments
        const { data: recentPayments } = await supabase
          .from('payments')
          .select('id, amount, payment_date, payment_periods!inner(enrollment_id, enrollments!inner(students!inner(full_name)))')
          .gte('payment_date', sevenDaysAgoStr.split('T')[0])
          .order('payment_date', { ascending: false })
          .limit(5);

        (recentPayments || []).forEach((p: any) => {
          const name = p.payment_periods?.enrollments?.students?.full_name || 'Alumno';
          activityItems.push({
            id: `pay-${p.id}`,
            type: 'payment',
            title: name,
            description: 'pagó una mensualidad',
            timestamp: p.payment_date,
            color: 'bg-emerald-500',
          });
        });

        // Recent enrollments
        const { data: recentEnrollments } = await supabase
          .from('enrollments')
          .select('id, start_date, students!inner(full_name), groups!inner(name)')
          .eq('is_active', true)
          .gte('start_date', sevenDaysAgoStr.split('T')[0])
          .order('start_date', { ascending: false })
          .limit(5);

        (recentEnrollments || []).forEach((e: any) => {
          activityItems.push({
            id: `enr-${e.id}`,
            type: 'enrollment',
            title: e.students?.full_name || 'Alumno',
            description: `se inscribió en ${e.groups?.name || 'grupo'}`,
            timestamp: e.start_date,
            color: 'bg-fuchsia-500',
          });
        });

        // Recent expenses
        const { data: recentExpenses } = await supabase
          .from('expenses')
          .select('id, title, amount, expense_date')
          .gte('expense_date', sevenDaysAgoStr.split('T')[0])
          .order('expense_date', { ascending: false })
          .limit(5);

        (recentExpenses || []).forEach((e: any) => {
          activityItems.push({
            id: `exp-${e.id}`,
            type: 'expense',
            title: 'Egreso registrado',
            description: e.title || 'Gasto',
            timestamp: e.expense_date,
            color: 'bg-amber-500',
          });
        });

        // Sort by timestamp desc, take top 6
        activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivities(activityItems.slice(0, 6));
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [selectedBranchId, branches]);

  const todayLabel = useMemo(() => {
    const weekday = today.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = today.getDate();
    const month = today.toLocaleDateString('es-ES', { month: 'long' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} de ${month}`;
  }, []);

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return 'Ayer';
    }
    if (diffDays < 7) {
      const weekday = date.toLocaleDateString('es-ES', { weekday: 'short' });
      return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Sort groups by student count desc, take top 5
  const topGroups = useMemo(() => {
    return [...groups].sort((a, b) => b.studentCount - a.studentCount).slice(0, 5);
  }, [groups]);

  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  const dayLabels: Record<number, string> = { 0: 'DOM', 1: 'LUN', 2: 'MAR', 3: 'MIÉ', 4: 'JUE', 5: 'VIE', 6: 'SÁB' };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            {userName ? `Buen día, ${userName}` : 'Buen día'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {todayLabel} · así está la academia hoy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileDown size={16} />
            Exportar resumen
          </button>
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-500"
          >
            <Plus size={16} />
            Nuevo alumno
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Alumnos activos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Alumnos activos
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {isLoading ? '...' : stats.activeStudents}
          </p>
          <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Activos actualmente
          </p>
        </div>

        {/* Cobros pendientes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Cobros pendientes
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {isLoading ? '...' : formatMoney(stats.pendingDebt)}
          </p>
          <p className="mt-1 text-sm font-medium text-red-500 dark:text-red-400">
            Deuda acumulada
          </p>
        </div>

        {/* Ingresos del mes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Ingresos del mes
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {isLoading ? '...' : formatMoney(stats.monthlyIncome)}
          </p>
          <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Ingresos operativos
          </p>
        </div>

        {/* Egresos del mes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Egresos del mes
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {isLoading ? '...' : formatMoney(stats.monthlyExpenses)}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Gastos operativos
          </p>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left — Classes & Groups */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          {/* Clases de la semana */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Clases de la semana
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {groups.length} {groups.length === 1 ? 'grupo activo' : 'grupos activos'}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dayOrder.map((dayId) => {
              const isToday = dayId === todayWeekdayId;
              return (
                <div
                  key={dayId}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition',
                    isToday
                      ? 'border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-fuchsia-950/20'
                      : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                  )}
                >
                  <span className={cn('text-xs font-medium', isToday ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-500 dark:text-slate-400')}>
                    {dayLabels[dayId]}
                  </span>
                  <span className={cn('text-lg font-bold', isToday ? 'text-fuchsia-700 dark:text-fuchsia-300' : 'text-slate-900 dark:text-slate-100')}>
                    {isLoading ? '-' : (dayCounts[dayId] || 0)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grupos con cupo casi lleno */}
          <h3 className="mt-8 text-lg font-bold text-slate-900 dark:text-slate-50">
            Grupos con cupo casi lleno
          </h3>
          <div className="mt-4 space-y-1">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Cargando...</div>
            ) : topGroups.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No hay grupos registrados.</div>
            ) : (
              topGroups.map((group) => {
                const scheduleParts = group.schedule.split('·');
                const daysPart = scheduleParts[0]?.trim() || '';
                const timePart = scheduleParts[1]?.trim() || '';
                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {group.name} · {daysPart} {timePart}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {group.branchName}
                      </p>
                    </div>
                    <span className={cn(
                      'text-sm font-bold',
                      group.studentCount >= 20 ? 'text-red-500 dark:text-red-400' :
                        group.studentCount >= 15 ? 'text-amber-600 dark:text-amber-400' :
                          'text-emerald-600 dark:text-emerald-400'
                    )}>
                      {group.studentCount} alumnos
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right — Activity */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-5 text-lg font-bold text-slate-900 dark:text-slate-50">
            Actividad reciente
          </h2>
          <div className="space-y-1">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Cargando...</div>
            ) : activities.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Sin actividad reciente.
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', activity.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{activity.title}</span>{' '}
                      {activity.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {formatActivityTime(activity.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
