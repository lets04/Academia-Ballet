import { supabase } from '@/lib/supabase';
import type { Payment, CreatePaymentForm } from '@/types';
import { MonthlyPaymentStatus } from '@/types';

function parseYearMonth(month?: string) {
  if (!month) return null;
  const [year, monthPart] = month.split('-').map(Number);
  if (!year || !monthPart) return null;
  return { year, month: monthPart };
}

export const paymentService = {
  async list(studentId?: string, month?: string): Promise<Payment[]> {
    let periodIds: string[] | null = null;

    if (studentId) {
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId);

      if (enrollmentError) throw enrollmentError;
      const enrollmentIds = enrollments?.map(e => e.id) || [];
      if (enrollmentIds.length === 0) return [];

      const { data: periods, error: periodsError } = await supabase
        .from('payment_periods')
        .select('id')
        .in('enrollment_id', enrollmentIds);

      if (periodsError) throw periodsError;
      periodIds = periods?.map(p => p.id) || [];
      if (periodIds.length === 0) return [];
    }

    const parsed = parseYearMonth(month);
    if (parsed) {
      const { data: monthPeriods, error: monthPeriodsError } = await supabase
        .from('payment_periods')
        .select('id')
        .eq('year', parsed.year)
        .eq('month', parsed.month);

      if (monthPeriodsError) throw monthPeriodsError;
      const monthPeriodIds = monthPeriods?.map(p => p.id) || [];

      if (periodIds !== null) {
        periodIds = periodIds.filter(id => monthPeriodIds.includes(id));
      } else {
        periodIds = monthPeriodIds;
      }

      if (periodIds.length === 0) return [];
    }

    let query = supabase.from('payments').select('*');
    if (periodIds !== null) {
      query = query.in('payment_period_id', periodIds);
    }

    const { data, error } = await query.order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async create(form: CreatePaymentForm): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          ...form,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getMonthlyStatus(paymentPeriodId: string): Promise<{ status: MonthlyPaymentStatus; totalPaid: number; totalDue: number }> {
    const { data: period, error: periodError } = await supabase
      .from('payment_periods')
      .select('total_amount')
      .eq('id', paymentPeriodId)
      .single();

    if (periodError) throw periodError;
    if (!period) throw new Error('Payment period not found');

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('payment_period_id', paymentPeriodId);

    if (paymentsError) throw paymentsError;

    const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const totalDue = period.total_amount;

    let status: MonthlyPaymentStatus;
    if (totalPaid >= totalDue) {
      status = MonthlyPaymentStatus.PAID;
    } else if (totalPaid > 0) {
      status = MonthlyPaymentStatus.PARTIAL;
    } else {
      status = MonthlyPaymentStatus.PENDING;
    }

    return { status, totalPaid, totalDue };
  },

  async getTotalMonthlyIncome(month?: string, branchId?: string): Promise<number> {
    const parsed = parseYearMonth(month);
    let periodIds: string[] | null = null;

    if (branchId) {
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('branch_id', branchId);

      if (groupsError) throw groupsError;

      const groupIds = groups?.map(g => g.id) || [];
      if (groupIds.length === 0) return 0;

      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id')
        .in('group_id', groupIds);

      if (enrollmentsError) throw enrollmentsError;

      const enrollmentIds = enrollments?.map(e => e.id) || [];
      if (enrollmentIds.length === 0) return 0;

      const { data: periods, error: periodsError } = await supabase
        .from('payment_periods')
        .select('id')
        .in('enrollment_id', enrollmentIds);

      if (periodsError) throw periodsError;
      periodIds = periods?.map(p => p.id) || [];
      if (periodIds.length === 0) return 0;
    }

    if (parsed) {
      const { data: monthPeriods, error: monthPeriodsError } = await supabase
        .from('payment_periods')
        .select('id')
        .eq('year', parsed.year)
        .eq('month', parsed.month);

      if (monthPeriodsError) throw monthPeriodsError;

      const monthPeriodIds = monthPeriods?.map(p => p.id) || [];
      if (periodIds !== null) {
        periodIds = periodIds.filter(id => monthPeriodIds.includes(id));
      } else {
        periodIds = monthPeriodIds;
      }

      if (periodIds.length === 0) return 0;
    }

    let query = supabase.from('payments').select('amount');
    if (periodIds !== null) {
      query = query.in('payment_period_id', periodIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data?.reduce((sum, p) => sum + p.amount, 0) || 0;
  },

  async getPendingDebt(branchId?: string): Promise<number> {
    let enrollmentIds: string[] = [];
    if (branchId) {
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('branch_id', branchId);

      if (groupsError) throw groupsError;

      const groupIds = groups?.map(g => g.id) || [];
      if (groupIds.length === 0) return 0;

      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id')
        .in('group_id', groupIds);

      if (enrollmentsError) throw enrollmentsError;
      enrollmentIds = enrollments?.map(e => e.id) || [];
      if (enrollmentIds.length === 0) return 0;
    }

    let periodQuery = supabase
      .from('payment_periods')
      .select('id, total_amount');

    if (enrollmentIds.length) {
      periodQuery = periodQuery.in('enrollment_id', enrollmentIds);
    }

    const { data: periods, error: periodsError } = await periodQuery;
    if (periodsError) throw periodsError;
    if (!periods || periods.length === 0) return 0;

    const periodIds = periods.map(period => period.id);
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('payment_period_id, amount')
      .in('payment_period_id', periodIds);

    if (paymentsError) throw paymentsError;

    const paymentSums: Record<string, number> = {};
    (payments || []).forEach(payment => {
      paymentSums[payment.payment_period_id] = (paymentSums[payment.payment_period_id] || 0) + payment.amount;
    });

    const totalDue = periods.reduce((sum, period) => sum + period.total_amount, 0);
    const totalPaid = Object.values(paymentSums).reduce((sum, amount) => sum + amount, 0);

    return Math.max(0, totalDue - totalPaid);
  },
};
