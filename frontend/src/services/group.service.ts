import { supabase } from '@/lib/supabase';
import type { Group, CreateGroupForm } from '@/types';

export const groupService = {
  async list(branchId?: string): Promise<Group[]> {
    let query = supabase
      .from('groups')
      .select('*');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async create(form: CreateGroupForm): Promise<Group> {
    const payload = {
      branch_id: form.branch_id,
      name: form.name,
      schedule: form.schedule,
      instructor: form.instructor?.trim() || null,
      level: form.level?.trim() || null,
      capacity: form.capacity || null,
    };
    const { data, error } = await supabase
      .from('groups')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, form: Partial<CreateGroupForm>): Promise<Group> {
    const payload: Record<string, unknown> = {};
    if (form.branch_id !== undefined) payload.branch_id = form.branch_id;
    if (form.name !== undefined) payload.name = form.name;
    if (form.schedule !== undefined) payload.schedule = form.schedule;
    if (form.instructor !== undefined) payload.instructor = form.instructor?.trim() || null;
    if (form.level !== undefined) payload.level = form.level?.trim() || null;
    if (form.capacity !== undefined) payload.capacity = form.capacity || null;

    const { data, error } = await supabase
      .from('groups')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // Get all enrollments for this group
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('group_id', id);

    if (enrollmentsError) throw enrollmentsError;

    const enrollmentIds = enrollments?.map((e) => e.id) || [];

    if (enrollmentIds.length > 0) {
      // Get all payment_periods for these enrollments
      const { data: periods, error: periodsError } = await supabase
        .from('payment_periods')
        .select('id')
        .in('enrollment_id', enrollmentIds);

      if (periodsError) throw periodsError;

      const periodIds = periods?.map((p) => p.id) || [];

      if (periodIds.length > 0) {
        // Delete payments first (FK to payment_periods)
        const { error: paymentsDeleteError } = await supabase
          .from('payments')
          .delete()
          .in('payment_period_id', periodIds);

        if (paymentsDeleteError) throw paymentsDeleteError;
      }

      // Delete payment_periods (FK to enrollments)
      const { error: periodsDeleteError } = await supabase
        .from('payment_periods')
        .delete()
        .in('enrollment_id', enrollmentIds);

      if (periodsDeleteError) throw periodsDeleteError;

      // Delete enrollments
      const { error: enrollmentsDeleteError } = await supabase
        .from('enrollments')
        .delete()
        .in('id', enrollmentIds);

      if (enrollmentsDeleteError) throw enrollmentsDeleteError;
    }

    // Finally delete the group
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getStudentCount(groupId: string): Promise<number> {
    const { count, error } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (error) throw error;
    return count || 0;
  },
};
