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
    const { data, error } = await supabase
      .from('groups')
      .insert([form])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, form: Partial<CreateGroupForm>): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update(form)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
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
