import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Calendar, CreditCard, DollarSign, Plus, Search, Wallet } from 'lucide-react';
import { paymentService } from '@/services/payment.service';
import type { CreatePaymentForm, Payment } from '@/types';

const today = new Date().toISOString().split('T')[0];
const currentMonth = new Date().toISOString().slice(0, 7);

const initialForm: CreatePaymentForm = {
  payment_period_id: '',
  amount: 0,
  payment_date: today,
  payment_method: '',
  notes: '',
};

const formatMoney = (amount: number) =>
  `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [formData, setFormData] = useState<CreatePaymentForm>(initialForm);
  const [month, setMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const data = await paymentService.list(undefined, month);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
      setMessage('No se pudieron cargar los pagos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [month]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await paymentService.create({
        ...formData,
        amount: Number(formData.amount),
      });
      setFormData(initialForm);
      setMessage('Pago registrado correctamente.');
      await loadPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
      setMessage('No se pudo registrar el pago. Verifica el periodo de pago e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) =>
    `${payment.payment_period_id} ${payment.payment_method || ''} ${payment.notes || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const total = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Pagos</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Registra pagos parciales o completos de mensualidades.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:w-[460px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar pago"
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

        {message && (
          <div className="mt-6 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><Wallet size={17} />Total cobrado</p>
                <p className="mt-3 text-3xl font-bold text-emerald-700 dark:text-emerald-200">{formatMoney(total)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><CreditCard size={17} />Registros</p>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{filteredPayments.length}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Periodo</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Método</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Monto</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {isLoading ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando pagos...</td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No se encontraron pagos.</td></tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-4 py-4 text-slate-900 dark:text-slate-100">
                          <p className="font-mono text-xs">{payment.payment_period_id}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{payment.notes || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{new Date(payment.payment_date).toLocaleDateString('es-BO')}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{payment.payment_method || '-'}</td>
                        <td className="px-4 py-4 font-semibold text-emerald-700 dark:text-emerald-200">{formatMoney(payment.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Registrar pago</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Usa el ID de la mensualidad generada.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                ID del periodo de pago
                <input type="text" value={formData.payment_period_id} onChange={(event) => setFormData((current) => ({ ...current, payment_period_id: event.target.value }))} required className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Monto
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="number" min="0" step="0.01" value={formData.amount || ''} onChange={(event) => setFormData((current) => ({ ...current, amount: Number(event.target.value) }))} required className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  </div>
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Fecha
                  <div className="relative mt-2">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="date" value={formData.payment_date || today} onChange={(event) => setFormData((current) => ({ ...current, payment_date: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  </div>
                </label>
              </div>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Método de pago
                <input type="text" value={formData.payment_method || ''} onChange={(event) => setFormData((current) => ({ ...current, payment_method: event.target.value }))} placeholder="Efectivo, transferencia..." className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Notas
                <textarea value={formData.notes || ''} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              </label>

              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Plus size={18} />
                {isLoading ? 'Guardando...' : 'Registrar pago'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
