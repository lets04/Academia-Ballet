import { supabase } from '@/lib/supabase';
import type { Enrollment, CreateEnrollmentForm, TransferStudentForm } from '@/types';

export const enrollmentService = {
  async list(studentId?: string, branchId?: string): Promise<Enrollment[]> {
    let query = supabase
      .from('enrollments')
      .select('*')
      .eq('is_active', true);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (branchId) {
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('branch_id', branchId);

      const groupIds = groups?.map(g => g.id) || [];
      if (groupIds.length > 0) {
        query = query.in('group_id', groupIds);
      }
    }

    const { data, error } = await query.order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Enrollment | null> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async getActive(studentId: string): Promise<Enrollment | null> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async getActiveStudentIds(): Promise<string[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('is_active', true);

    if (error) throw error;
    return data?.map((e) => e.student_id) || [];
  },

  async getStudentsForGroup(groupId: string): Promise<Array<{ enrollment: Enrollment; student: { id: string; full_name: string; document_number: string | null; phone: string | null } }>> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, students(id, full_name, document_number, phone)')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      enrollment: {
        id: row.id,
        student_id: row.student_id,
        group_id: row.group_id,
        monthly_fee: row.monthly_fee,
        is_active: row.is_active,
        start_date: row.start_date,
        end_date: row.end_date,
        created_at: row.created_at,
      },
      student: row.students,
    }));
  },

  async create(form: CreateEnrollmentForm): Promise<Enrollment> {
    // Check if student already has an active enrollment
    const active = await this.getActive(form.student_id);
    if (active) {
      throw new Error('El estudiante ya cuenta con una inscripción activa en otra sucursal o grupo.');
    }

    const startDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('enrollments')
      .insert([
        {
          ...form,
          is_active: true,
          start_date: startDate,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Auto-create payment period for the current month
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const { error: periodError } = await supabase
        .from('payment_periods')
        .insert([{
          enrollment_id: data.id,
          month: currentMonth,
          year: currentYear,
          total_amount: form.monthly_fee || 0,
        }]);
      if (periodError) console.error('Error creating payment period:', periodError);
    } catch (e) {
      console.error('Error creating payment period:', e);
    }

    return data;
  },

  async update(id: string, updates: Partial<Enrollment>): Promise<Enrollment> {
    const { data, error } = await supabase
      .from('enrollments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async transfer(form: TransferStudentForm): Promise<{ oldEnrollment: Enrollment; newEnrollment: Enrollment }> {
    // Deactivate current enrollment
    const endDate = new Date().toISOString().split('T')[0];
    const oldEnrollment = await this.update(form.current_enrollment_id, {
      is_active: false,
      end_date: endDate,
    });

    // Create new enrollment
    const newEnrollment = await this.create({
      student_id: form.student_id,
      group_id: form.new_group_id,
      monthly_fee: form.new_monthly_fee,
    });

    return { oldEnrollment, newEnrollment };
  },

  async deactivate(id: string): Promise<Enrollment> {
    const endDate = new Date().toISOString().split('T')[0];
    return this.update(id, {
      is_active: false,
      end_date: endDate,
    });
  },

  async getActiveCount(branchId?: string): Promise<number> {
    if (branchId) {
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('branch_id', branchId);

      if (groupsError) throw groupsError;

      const groupIds = groups?.map((group) => group.id) || [];
      if (groupIds.length === 0) return 0;

      const { count, error } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .in('group_id', groupIds);

      if (error) throw error;
      return count || 0;
    }

    const { count, error } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) throw error;
    return count || 0;
  },
};
