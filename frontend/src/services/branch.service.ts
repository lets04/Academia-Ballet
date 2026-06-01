import { supabase } from '@/lib/supabase';
import type { Branch } from '@/types';

export const branchService = {
  async list(): Promise<Branch[]> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Branch | null> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async create(name: string): Promise<Branch> {
    const { data, error } = await supabase
      .from('branches')
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Branch>): Promise<Branch> {
    const { data, error } = await supabase
      .from('branches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
