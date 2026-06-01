import { supabase } from '@/lib/supabase';
import type { Expense, CreateExpenseForm } from '@/types';

export const expenseService = {
  async list(branchId?: string, month?: string): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select('*');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    if (month) {
      // Filter by month (YYYY-MM)
      const startDate = `${month}-01`;
      const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
        .toISOString()
        .split('T')[0];

      query = query
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);
    }

    const { data, error } = await query.order('expense_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async create(form: CreateExpenseForm): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert([form])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, form: Partial<CreateExpenseForm>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(form)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getTotalMonthlyExpenses(month?: string, branchId?: string): Promise<number> {
    let query = supabase
      .from('expenses')
      .select('amount');

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    if (month) {
      const startDate = `${month}-01`;
      const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
        .toISOString()
        .split('T')[0];

      query = query
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.reduce((sum, e) => sum + e.amount, 0) || 0;
  },
};
