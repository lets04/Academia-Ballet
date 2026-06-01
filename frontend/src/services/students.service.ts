import { supabase } from '@/lib/supabase';
import type { Student, CreateStudentForm, MonthlyPaymentSummary } from '@/types';
import { MonthlyPaymentStatus } from '@/types';

export const studentService = {
  async list(isActive?: boolean): Promise<Student[]> {
    let query = supabase
      .from('students')
      .select('*');

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    const { data, error } = await query.order('full_name');

    if (error) throw error;
    return data || [];
  },

  async search(query: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .or(`full_name.ilike.%${query}%,document_number.ilike.%${query}%`)
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async create(form: CreateStudentForm): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          ...form,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, form: Partial<CreateStudentForm>): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .update(form)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deactivate(id: string): Promise<Student> {
    return this.update(id, { is_active: false } as any);
  },

  async getPaymentHistory(studentId: string): Promise<MonthlyPaymentSummary[]> {
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, monthly_fee')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single();

    if (enrollmentError && enrollmentError.code !== 'PGRST116') throw enrollmentError;
    if (!enrollment) return [];

    const { data: periods, error: periodsError } = await supabase
      .from('payment_periods')
      .select('id, month, year, total_amount')
      .eq('enrollment_id', enrollment.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (periodsError) throw periodsError;
    if (!periods || periods.length === 0) return [];

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

    return periods.map(period => {
      const paid = paymentSums[period.id] || 0;
      const due = period.total_amount;
      let status: MonthlyPaymentStatus;

      if (paid >= due) {
        status = MonthlyPaymentStatus.PAID;
      } else if (paid > 0) {
        status = MonthlyPaymentStatus.PARTIAL;
      } else {
        status = MonthlyPaymentStatus.PENDING;
      }

      return {
        month: `${period.year}-${String(period.month).padStart(2, '0')}`,
        total_due: due,
        total_paid: paid,
        remaining: Math.max(0, due - paid),
        status,
      };
    });
  },

  async getTotalDebt(studentId: string): Promise<number> {
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId);

    if (enrollmentError) throw enrollmentError;
    if (!enrollments || enrollments.length === 0) return 0;

    const enrollmentIds = enrollments.map(e => e.id);
    const { data: periods, error: periodsError } = await supabase
      .from('payment_periods')
      .select('id, total_amount')
      .in('enrollment_id', enrollmentIds);

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