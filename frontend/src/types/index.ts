// Auth
export interface User {
  id: string;
  email: string;
  role: 'admin';
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Branch (Sucursal)
export interface Branch {
  id: string;
  name: string;
  created_at: string;
}

// Student
export interface Student {
  id: string;
  full_name: string;
  birth_date: string | null;
  phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  notes: string | null;
  document_number: string | null;
  is_active: boolean;
  created_at: string;
}

// Group (Grupo)
export interface Group {
  id: string;
  branch_id: string;
  name: string;
  schedule: string;
  created_at: string;
}

// Enrollment (Inscripción)
export interface Enrollment {
  id: string;
  student_id: string;
  group_id: string;
  monthly_fee: number;
  is_active: boolean;
  is_scholarship?: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

// Payment
export interface Payment {
  id: string;
  payment_period_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaymentPeriod {
  id: string;
  enrollment_id: string;
  month: number;
  year: number;
  total_amount: number;
  created_at: string;
}

// Monthly Status (Estado de mensualidad)
export const MonthlyPaymentStatus = {
  PAID: 'paid',
  PARTIAL: 'partial',
  PENDING: 'pending',
} as const;

export type MonthlyPaymentStatus = (typeof MonthlyPaymentStatus)[keyof typeof MonthlyPaymentStatus];

export interface MonthlyPaymentSummary {
  month: string;
  total_due: number;
  total_paid: number;
  remaining: number;
  status: MonthlyPaymentStatus;
}

// Expense (Egreso)
export interface Expense {
  id: string;
  branch_id: string;
  title: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

// Dashboard Statistics
export interface DashboardStats {
  active_students: number;
  monthly_income: number;
  monthly_expenses: number;
  pending_debt: number;
  by_branch: {
    [branchId: string]: {
      active_students: number;
      monthly_income: number;
      monthly_expenses: number;
      pending_debt: number;
    };
  };
}

// Notification
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export * from './forms';
