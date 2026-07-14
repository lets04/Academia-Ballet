import { useEffect, useMemo, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, CreditCard, DollarSign, Funnel, Plus, Search, User, Wallet, X } from 'lucide-react';
import { paymentService } from '@/services/payment.service';
import { supabase } from '@/lib/supabase';
import { studentService } from '@/services/students.service';
import { enrollmentService } from '@/services/enrollment.service';
import { useBranch } from '@/contexts/branch';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import type { CreatePaymentForm, Payment, Student, Enrollment, PaymentPeriod, Notification } from '@/types';

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

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const AVAILABLE_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  const monthNum = i + 1;
  return {
    value: `${d.getFullYear()}-${String(monthNum).padStart(2, '0')}`,
    label: `${MONTH_NAMES[i]} ${d.getFullYear()}`,
  };
});

type PaymentWithStudent = Payment & {
  student_name?: string;
  student_doc?: string;
  group_name?: string;
  period_month?: number;
  period_year?: number;
  status?: 'paid' | 'partial' | 'pending';
  total_debt?: number;
};

export function PaymentsPage() {
  const { selectedBranchId } = useBranch();
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [formData, setFormData] = useState<CreatePaymentForm>(initialForm);
  const [month, setMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, message, duration: 4000 }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Student payment form state
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentEnrollment, setStudentEnrollment] = useState<Enrollment | null>(null);
  const [studentPeriods, setStudentPeriods] = useState<(PaymentPeriod & { paid: number; remaining: number })[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // History modal state
  const [historyStudent, setHistoryStudent] = useState<{ name: string; doc: string } | null>(null);
  const [historyPayments, setHistoryPayments] = useState<(PaymentWithStudent & { notes: string })[]>([]);
  const [historyMonths, setHistoryMonths] = useState<{ month: number; year: number; status: 'paid' | 'partial' | 'pending' | 'inactive' }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [paymentStats, setPaymentStats] = useState({
    collected: 0,
    pending: 0,
    overdue: 0,
    paidStudents: 0,
    pendingStudents: 0,
    overdueStudents: 0,
  });

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      // 1. Get all active enrollments with student and group info
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, student_id, group_id, monthly_fee, students(full_name, document_number), groups(name)')
        .eq('is_active', true);

      if (!enrollments || enrollments.length === 0) {
        setPayments([]);
        setPaymentStats({ collected: 0, pending: 0, overdue: 0, paidStudents: 0, pendingStudents: 0, overdueStudents: 0 });
        return;
      }

      const enrollmentIds = enrollments.map(e => e.id);

      // 2. Get ALL payment periods for these enrollments
      const { data: allPeriods } = await supabase
        .from('payment_periods')
        .select('id, enrollment_id, month, year, total_amount')
        .in('enrollment_id', enrollmentIds);

      const periodIds = (allPeriods || []).map(p => p.id);

      // 3. Get ALL payments for these periods
      const { data: allPaymentsData } = await supabase
        .from('payments')
        .select('id, payment_period_id, amount, payment_method, payment_date')
        .in('payment_period_id', periodIds);

      // 4. Get last payment per enrollment (for "last payment method" and "last month paid")
      const { data: lastPayments } = await supabase
        .from('payments')
        .select('id, payment_period_id, amount, payment_method, payment_date, payment_periods!inner(enrollment_id, month, year)')
        .in('payment_period_id', periodIds)
        .order('payment_date', { ascending: false });

      // Build last payment info per enrollment
      const lastPaymentByEnrollment: Record<string, { month: number; year: number; method: string }> = {};
      (lastPayments || []).forEach((p: any) => {
        const enId = p.payment_periods?.enrollment_id;
        if (enId && !lastPaymentByEnrollment[enId]) {
          lastPaymentByEnrollment[enId] = {
            month: p.payment_periods?.month || 0,
            year: p.payment_periods?.year || 0,
            method: p.payment_method || '',
          };
        }
      });

      // Build payments by period
      const paymentsByPeriod: Record<string, number> = {};
      (allPaymentsData || []).forEach(p => {
        paymentsByPeriod[p.payment_period_id] = (paymentsByPeriod[p.payment_period_id] || 0) + p.amount;
      });

      // Build periods by enrollment
      const periodsByEnrollment: Record<string, { id: string; month: number; year: number; total_amount: number }[]> = {};
      (allPeriods || []).forEach(p => {
        if (!periodsByEnrollment[p.enrollment_id]) periodsByEnrollment[p.enrollment_id] = [];
        periodsByEnrollment[p.enrollment_id].push(p);
      });

      // 5. Build the student rows
      const today = new Date();
      const currentDay = today.getDate();
      const [selYear, selMonth] = month ? month.split('-').map(Number) : [today.getFullYear(), today.getMonth() + 1];

      let collected = 0;
      let pending = 0;
      let overdue = 0;
      const paidEnrollments = new Set<string>();
      const pendingEnrollments = new Set<string>();
      const overdueEnrollments = new Set<string>();

      const studentRows: PaymentWithStudent[] = enrollments.map((enrollment: any) => {
        const studentName = enrollment.students?.full_name || '';
        const studentDoc = enrollment.students?.document_number || '';
        const groupName = enrollment.groups?.name || '';

        const periods = periodsByEnrollment[enrollment.id] || [];

        // Find current month period
        const currentPeriod = periods.find(p => p.month === selMonth && p.year === selYear);
        const currentPaid = currentPeriod ? (paymentsByPeriod[currentPeriod.id] || 0) : 0;
        const currentDue = currentPeriod ? currentPeriod.total_amount : (enrollment.monthly_fee || 0);

        // Status for current month
        let status: 'paid' | 'partial' | 'pending' = 'pending';
        if (currentPeriod) {
          if (currentPaid >= currentDue) status = 'paid';
          else if (currentPaid > 0) status = 'partial';
        }

        // Accumulated debt: sum all unpaid periods
        let totalDebt = 0;
        periods.forEach(p => {
          const paid = paymentsByPeriod[p.id] || 0;
          if (paid < p.total_amount) {
            totalDebt += p.total_amount - paid;
          }
        });

        // Stats
        if (status === 'paid') {
          collected += currentDue;
          paidEnrollments.add(enrollment.id);
        } else {
          const remaining = currentDue - currentPaid;
          if (currentDay <= 10) {
            pending += remaining;
            pendingEnrollments.add(enrollment.id);
          } else {
            overdue += remaining;
            overdueEnrollments.add(enrollment.id);
          }
        }

        // Last payment info
        const lastPay = lastPaymentByEnrollment[enrollment.id];

        return {
          id: enrollment.id,
          payment_period_id: currentPeriod?.id || '',
          amount: currentPaid || totalDebt,
          payment_date: '',
          payment_method: lastPay?.method || '',
          notes: null,
          created_at: '',
          student_name: studentName,
          student_doc: studentDoc,
          group_name: groupName,
          period_month: currentPeriod?.month || (lastPay?.month || 0),
          period_year: currentPeriod?.year || (lastPay?.year || 0),
          status,
          total_debt: totalDebt,
        };
      });

      setPayments(studentRows);
      setPaymentStats({
        collected,
        pending,
        overdue,
        paidStudents: paidEnrollments.size,
        pendingStudents: pendingEnrollments.size,
        overdueStudents: overdueEnrollments.size,
      });
    } catch (error) {
      console.error('Error loading payments:', error);
      addNotification('error', 'No se pudieron cargar los pagos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [month]);

  // Search students for payment form
  useEffect(() => {
    if (!studentSearchQuery.trim()) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const results = await studentService.search(studentSearchQuery);
        setStudentResults(results);
      } catch {
        setStudentResults([]);
      } finally {
        setIsSearchingStudents(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearchQuery]);

  // When student is selected, load their enrollment
  useEffect(() => {
    if (!selectedStudent) {
      setStudentEnrollment(null);
      setStudentPeriods([]);
      setSelectedPeriodId('');
      setSelectedMonth('');
      return;
    }
    const loadStudentData = async () => {
      try {
        const enrollment = await enrollmentService.getActive(selectedStudent.id);
        setStudentEnrollment(enrollment);
        setStudentPeriods([]);
        setSelectedPeriodId('');
        setSelectedMonth('');
      } catch (error) {
        console.error('Error loading student data:', error);
      }
    };
    loadStudentData();
  }, [selectedStudent]);

  // When month is selected, find or create payment period
  useEffect(() => {
    if (!selectedStudent || !studentEnrollment || !selectedMonth) {
      setStudentPeriods([]);
      setSelectedPeriodId('');
      return;
    }
    const loadOrCreatePeriod = async () => {
      try {
        const [year, monthNum] = selectedMonth.split('-').map(Number);

        let { data: periods } = await supabase
          .from('payment_periods')
          .select('id, enrollment_id, month, year, total_amount')
          .eq('enrollment_id', studentEnrollment.id)
          .eq('year', year)
          .eq('month', monthNum);

        if (!periods || periods.length === 0) {
          const { error: periodError } = await supabase
            .from('payment_periods')
            .insert([{
              enrollment_id: studentEnrollment.id,
              month: monthNum,
              year: year,
              total_amount: studentEnrollment.monthly_fee || 0,
            }]);
          if (periodError) {
            console.error('Error creating payment period:', periodError);
            setStudentPeriods([]);
            setSelectedPeriodId('');
            return;
          }
          const { data: newPeriods } = await supabase
            .from('payment_periods')
            .select('id, enrollment_id, month, year, total_amount')
            .eq('enrollment_id', studentEnrollment.id)
            .eq('year', year)
            .eq('month', monthNum);
          periods = newPeriods;
        }

        if (!periods || periods.length === 0) {
          setStudentPeriods([]);
          setSelectedPeriodId('');
          return;
        }

        const periodIds = periods.map(p => p.id);
        const { data: existingPayments } = await supabase
          .from('payments')
          .select('payment_period_id, amount')
          .in('payment_period_id', periodIds);

        const paidByPeriod: Record<string, number> = {};
        (existingPayments || []).forEach(p => {
          paidByPeriod[p.payment_period_id] = (paidByPeriod[p.payment_period_id] || 0) + p.amount;
        });

        const periodsWithStatus = periods.map(p => {
          const paid = paidByPeriod[p.id] || 0;
          return { ...p, paid, remaining: Math.max(0, p.total_amount - paid) };
        });

        setStudentPeriods(periodsWithStatus);
        setSelectedPeriodId(periodsWithStatus[0]?.id || '');
      } catch (error) {
        console.error('Error loading period:', error);
      }
    };
    loadOrCreatePeriod();
  }, [selectedStudent, studentEnrollment, selectedMonth]);

  const selectedPeriod = useMemo(
    () => studentPeriods.find(p => p.id === selectedPeriodId) || null,
    [studentPeriods, selectedPeriodId],
  );

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentSearchQuery(student.full_name);
    setStudentResults([]);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentSearchQuery('');
    setStudentResults([]);
    setStudentEnrollment(null);
    setStudentPeriods([]);
    setSelectedPeriodId('');
    setSelectedMonth('');
    setFormData(initialForm);
  };

  const handleSubmitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPeriodId) {
      addNotification('warning', 'Selecciona un mes para el pago.');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      addNotification('warning', 'Ingresa un monto válido.');
      return;
    }
    setIsSaving(true);
    try {
      await paymentService.create({
        payment_period_id: selectedPeriodId,
        amount: Number(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        notes: formData.notes,
      });
      addNotification('success', 'Pago registrado correctamente.');
      setSelectedStudent(null);
      setStudentSearchQuery('');
      setStudentEnrollment(null);
      setStudentPeriods([]);
      setSelectedPeriodId('');
      setSelectedMonth('');
      setFormData(initialForm);
      await loadPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
      addNotification('error', 'No se pudo registrar el pago.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const q = searchQuery.toLowerCase();
    const statusLabel = payment.status === 'paid' ? 'pagado' : payment.status === 'partial' ? 'parcial' : 'pendiente';
    const matchesSearch = `${payment.student_name || ''} ${payment.student_doc || ''} ${payment.group_name || ''} ${payment.payment_method || ''} ${payment.notes || ''} ${statusLabel}`
      .toLowerCase()
      .includes(q);
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'paid') return payment.status === 'paid';
    if (statusFilter === 'pending') return payment.status === 'pending' || payment.status === 'partial';
    if (statusFilter === 'overdue') return payment.status !== 'paid' && (payment.total_debt || 0) > 0;
    return true;
  });

  const total = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const openStudentHistory = async (studentName: string, studentDoc: string) => {
    setHistoryStudent({ name: studentName, doc: studentDoc });
    setIsLoadingHistory(true);
    try {
      const students = await studentService.search(studentName);
      const student = students.find(s => s.full_name === studentName);
      if (!student) { setHistoryPayments([]); setHistoryMonths([]); return; }

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, monthly_fee, start_date')
        .eq('student_id', student.id);

      if (!enrollments || enrollments.length === 0) { setHistoryPayments([]); setHistoryMonths([]); return; }

      const enrollmentIds = enrollments.map(e => e.id);
      const monthlyFee = enrollments[0]?.monthly_fee || 0;
      const startDate = enrollments[0]?.start_date || new Date().toISOString().split('T')[0];
      const startParts = startDate.split('-');
      const startYear = Number(startParts[0]);
      const startMonth = Number(startParts[1]);

      const { data: periods } = await supabase
        .from('payment_periods')
        .select('id, month, year, total_amount')
        .in('enrollment_id', enrollmentIds);

      if (!periods || periods.length === 0) { setHistoryPayments([]); setHistoryMonths([]); return; }

      const periodIds = periods.map(p => p.id);

      const { data: allPayments } = await supabase
        .from('payments')
        .select('*')
        .in('payment_period_id', periodIds)
        .order('payment_date', { ascending: false });

      // Map period month/year to payments
      const periodMap: Record<string, { month: number; year: number }> = {};
      periods.forEach(p => { periodMap[p.id] = { month: p.month, year: p.year }; });

      const enriched = (allPayments || []).map(p => ({
        ...p,
        period_month: periodMap[p.payment_period_id]?.month || 0,
        period_year: periodMap[p.payment_period_id]?.year || 0,
      }));

      setHistoryPayments(enriched as PaymentWithStudent[]);

      // Calculate status for each period
      const paymentsByPeriod: Record<string, number> = {};
      (allPayments || []).forEach(p => {
        paymentsByPeriod[p.payment_period_id] = (paymentsByPeriod[p.payment_period_id] || 0) + p.amount;
      });

      // Build status map for existing periods
      const statusMap: Record<string, 'paid' | 'partial' | 'pending'> = {};
      periods.forEach(p => {
        const paid = paymentsByPeriod[p.id] || 0;
        const due = p.total_amount || monthlyFee;
        let status: 'paid' | 'partial' | 'pending' = 'pending';
        if (paid >= due) status = 'paid';
        else if (paid > 0) status = 'partial';
        statusMap[`${p.year}-${p.month}`] = status;
      });

      // Generate all 12 months, months before enrollment are faded
      const currentYear = new Date().getFullYear();
      const monthsStatus = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const key = `${currentYear}-${monthNum}`;
        const isBeforeEnrollment = currentYear < startYear || (currentYear === startYear && monthNum < startMonth);
        return {
          month: monthNum,
          year: currentYear,
          status: isBeforeEnrollment ? 'inactive' as const : (statusMap[key] || 'pending' as const),
        };
      });

      setHistoryMonths(monthsStatus);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryPayments([]);
      setHistoryMonths([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            <CreditCard size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Pagos</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Registra pagos parciales o completos de mensualidades.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] items-start">
          {/* Left column */}
          <div className="space-y-4">
            {/* Stats cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Cobrado */}
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 transition hover:border-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Cobrado
                  </p>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">
                  {isLoading ? '...' : `Bs. ${paymentStats.collected.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {paymentStats.paidStudents} alumnos al día
                </p>
              </div>

              {/* Pendiente */}
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 transition hover:border-slate-600">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Pendiente
                  </p>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">
                  {isLoading ? '...' : `Bs. ${paymentStats.pending.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {paymentStats.pendingStudents} alumnos
                </p>
              </div>

              {/* Atrasado */}
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 transition hover:border-slate-600">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Atrasado (+15 días)
                  </p>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">
                  {isLoading ? '...' : `Bs. ${paymentStats.overdue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {paymentStats.overdueStudents} alumnos
                </p>
              </div>
            </div>

            {/* Search & filters bar */}
            <div className="flex items-center gap-3">
              <label className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar pago"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="w-52 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Todos los meses</option>
                {AVAILABLE_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Funnel size={16} />
                  Filtros
                  {statusFilter !== 'all' && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">1</span>
                  )}
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <p className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Estado de pago</p>
                    {[
                      { value: 'all' as const, label: 'Todos' },
                      { value: 'paid' as const, label: 'Al día' },
                      { value: 'pending' as const, label: 'Pendientes' },
                      { value: 'overdue' as const, label: 'Atrasados' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setStatusFilter(opt.value); setShowFilterMenu(false); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                          statusFilter === opt.value
                            ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {statusFilter === opt.value && <span className="size-1.5 rounded-full bg-emerald-500" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Alumno</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Grupo</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Método de pago</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Monto</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando pagos...</td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No se encontraron pagos.</td></tr>
                  ) : (
                    filteredPayments.map((payment) => {
                      const status = payment.status || 'paid';
                      return (
                        <tr key={payment.id} className="border-t border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition" onClick={() => openStudentHistory(payment.student_name || '', payment.student_doc || '')}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-[10px] font-bold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">
                                {payment.student_name ? payment.student_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() : '??'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400 truncate hover:underline">{payment.student_name || 'Desconocido'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{payment.student_doc || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{payment.group_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{payment.payment_method || '-'}</td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            {payment.total_debt && payment.total_debt > 0 && payment.status !== 'paid' ? (
                              <span className="text-red-600 dark:text-red-400">{formatMoney(payment.total_debt)}</span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-200">{formatMoney(payment.amount)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              status === 'paid'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : status === 'partial'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              <span className={`size-1.5 rounded-full ${
                                status === 'paid' ? 'bg-emerald-500' : status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                              {status === 'paid' ? 'Pagado' : status === 'partial' ? 'Parcial' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Registrar pago</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Busca al estudiante y selecciona el periodo.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmitPayment}>
              {/* Student search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Estudiante
                </label>
                {selectedStudent ? (
                  <div className="flex items-center gap-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/30">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">
                      <User size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{selectedStudent.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedStudent.document_number || 'Sin CI'}</p>
                    </div>
                    <button type="button" onClick={handleClearStudent} className="text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400">
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre o CI..."
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    {studentResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        {studentResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectStudent(s)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-[10px] font-bold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">
                              {s.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{s.full_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{s.document_number || 'Sin CI'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {isSearchingStudents && (
                      <p className="mt-1 text-xs text-slate-400">Buscando...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Alerts */}
              {selectedStudent && studentEnrollment && studentPeriods.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                  No hay periodos de pago para {MONTH_NAMES[Number(month.split('-')[1]) - 1]} {month.split('-')[0]}.
                </div>
              )}

              {selectedStudent && !studentEnrollment && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                  Este estudiante no tiene inscripción activa.
                </div>
              )}

              {/* Period summary */}
              {selectedPeriod && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Mensualidad:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatMoney(selectedPeriod.total_amount)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Ya pagado:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatMoney(selectedPeriod.paid)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Restante:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(selectedPeriod.remaining)}</span>
                  </div>
                </div>
              )}

              {/* Payment fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Monto
                  <div className="relative mt-1.5">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData((current) => ({ ...current, amount: Number(e.target.value) }))}
                      placeholder={selectedPeriod ? `Máximo: ${selectedPeriod.remaining}` : '0.00'}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Método de pago
                  <select
                    value={formData.payment_method || ''}
                    onChange={(e) => setFormData((current) => ({ ...current, payment_method: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="QR">QR</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Fecha de pago
                  <div className="relative mt-1.5">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={formData.payment_date || today}
                      onChange={(e) => setFormData((current) => ({ ...current, payment_date: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Mes
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    disabled={!selectedStudent || !studentEnrollment}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50"
                  >
                    <option value="">Seleccionar...</option>
                    {AVAILABLE_MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Notas
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData((current) => ({ ...current, notes: e.target.value }))}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <button
                type="submit"
                disabled={isSaving || !selectedStudent || !selectedMonth}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                {isSaving ? 'Guardando...' : 'Registrar pago'}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* Student payment history modal */}
      <Modal
        isOpen={!!historyStudent}
        onClose={() => { setHistoryStudent(null); setHistoryPayments([]); }}
        title={`Historial de pagos`}
        footer={
          <button
            type="button"
            onClick={() => { setHistoryStudent(null); setHistoryPayments([]); }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition"
          >
            Cerrar
          </button>
        }
      >
        {historyStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-bold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">
                {historyStudent.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{historyStudent.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{historyStudent.doc || 'Sin CI'}</p>
              </div>
            </div>

            {isLoadingHistory ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">Cargando historial...</p>
            ) : historyPayments.length === 0 && historyMonths.length === 0 ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No hay pagos registrados.</p>
            ) : (
              <>
                {/* Month circles */}
                {historyMonths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Estado de mensualidades</p>
                    <div className="flex flex-wrap gap-2">
                      {historyMonths.map((m) => (
                        <div key={`${m.year}-${m.month}`} className="flex flex-col items-center gap-1">
                          <div className={`flex size-9 items-center justify-center rounded-full text-xs font-bold ${
                            m.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : m.status === 'partial'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : m.status === 'inactive'
                              ? 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          }`}>
                            {m.month}
                          </div>
                          <span className={`text-[10px] ${
                            m.status === 'inactive'
                              ? 'text-slate-300 dark:text-slate-600'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>{MONTH_NAMES[m.month - 1].slice(0, 3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment list */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {historyPayments.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {payment.period_month && payment.period_year ? `${MONTH_NAMES[payment.period_month - 1]} ${payment.period_year}` : '-'}
                          </span>
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(payment.amount)}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Pagado
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(payment.payment_date).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {(payment.payment_method || payment.notes) && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {payment.payment_method && <span>{payment.payment_method}</span>}
                          {payment.payment_method && payment.notes && <span>·</span>}
                          {payment.notes && <span className="truncate">{payment.notes}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      <ToastContainer notifications={notifications} onClose={removeNotification} />
    </div>
  );
}
