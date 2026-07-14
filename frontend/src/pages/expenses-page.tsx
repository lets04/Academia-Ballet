import { useEffect, useMemo, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Building2, Calendar, Plus, Receipt, Search, TrendingDown, Wallet } from 'lucide-react';
import { useBranch } from '@/contexts/branch';
import { expenseService } from '@/services/expense.service';
import { ToastContainer } from '@/components/ui/toast';
import type { CreateExpenseForm, Expense, Notification } from '@/types';

const today = new Date().toISOString().split('T')[0];
const currentMonth = new Date().toISOString().slice(0, 7);

const initialForm: CreateExpenseForm = {
  branch_id: '',
  title: '',
  amount: 0,
  expense_date: today,
  notes: '',
};

const formatMoney = (amount: number) =>
  `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

export function ExpensesPage() {
  const { branches, selectedBranchId } = useBranch();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [formData, setFormData] = useState<CreateExpenseForm>(initialForm);
  const [month, setMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, message, duration: 4000 }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await expenseService.list(selectedBranchId || undefined, month);
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      addNotification('error', 'No se pudieron cargar los egresos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedBranchId, month]);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      branch_id: selectedBranchId || branches[0]?.id || '',
    }));
  }, [branches, selectedBranchId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await expenseService.create({
        ...formData,
        amount: Number(formData.amount),
      });
      setFormData({ ...initialForm, branch_id: selectedBranchId || branches[0]?.id || '' });
      addNotification('success', 'Egreso registrado correctamente.');
      await loadExpenses();
    } catch (error) {
      console.error('Error creating expense:', error);
      addNotification('error', 'No se pudo registrar el egreso. Revisa los datos e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((expense) =>
    `${expense.title} ${expense.notes || ''} ${branchNameById[expense.branch_id] || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              <Receipt size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Egresos</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Registra y consulta gastos mensuales por sucursal.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:w-[460px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar egreso"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><TrendingDown size={17} />Total filtrado</p>
                <p className="mt-3 text-3xl font-bold text-amber-700 dark:text-amber-200">{formatMoney(total)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><Wallet size={17} />Registros</p>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{filteredExpenses.length}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Detalle</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Sucursal</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Monto</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {isLoading ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando egresos...</td></tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No se encontraron egresos.</td></tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-4 py-4 text-slate-900 dark:text-slate-100">
                          <p className="font-medium">{expense.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{expense.notes || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{branchNameById[expense.branch_id] || '-'}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{expense.expense_date}</td>
                        <td className="px-4 py-4 font-semibold text-amber-700 dark:text-amber-200">{formatMoney(expense.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Registrar egreso</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Guarda gastos operativos.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Sucursal
                <div className="relative mt-2">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select value={formData.branch_id} onChange={(event) => setFormData((current) => ({ ...current, branch_id: event.target.value }))} required className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <option value="">Selecciona una sucursal</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
              </label>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Título
                <input type="text" value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} required className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Monto
                  <input type="number" min="0" step="0.01" value={formData.amount || ''} onChange={(event) => setFormData((current) => ({ ...current, amount: Number(event.target.value) }))} required className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Fecha
                  <div className="relative mt-2">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="date" value={formData.expense_date} onChange={(event) => setFormData((current) => ({ ...current, expense_date: event.target.value }))} required className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  </div>
                </label>
              </div>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Notas
                <textarea value={formData.notes || ''} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>

              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Plus size={18} />
                {isLoading ? 'Guardando...' : 'Registrar egreso'}
              </button>
            </form>
          </section>
        </div>
      </div>
      <ToastContainer notifications={notifications} onClose={removeNotification} />
    </div>
  );
}
