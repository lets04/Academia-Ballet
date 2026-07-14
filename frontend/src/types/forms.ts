// Auth Forms
export interface LoginForm {
  email: string;
  password: string;
}

// Student Forms
export interface CreateStudentForm {
  full_name: string;
  document_number: string;
  birth_date?: string;
  phone?: string;
  guardian_name?: string;
  guardian_phone?: string;
  notes?: string;
  branch_id?: string;
  group_id?: string;
  monthly_fee?: number;
  is_scholarship?: boolean;
}

export interface UpdateStudentForm extends Partial<CreateStudentForm> {
  id: string;
  is_active?: boolean;
}

// Branch Forms
export interface CreateBranchForm {
  name: string;
}

// Group Forms
export interface CreateGroupForm {
  branch_id: string;
  name: string;
  schedule: string;
  instructor?: string;
  capacity?: number;
  level?: string;
}

export interface UpdateGroupForm extends Partial<CreateGroupForm> {
  id: string;
}

// Enrollment Forms
export interface CreateEnrollmentForm {
  student_id: string;
  group_id: string;
  monthly_fee: number;
  is_scholarship?: boolean;
}

export interface TransferStudentForm {
  student_id: string;
  current_enrollment_id: string;
  new_group_id: string;
  new_monthly_fee: number;
}

// Payment Forms
export interface CreatePaymentForm {
  payment_period_id: string;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
}

// Expense Forms
export interface CreateExpenseForm {
  branch_id: string;
  title: string;
  amount: number;
  expense_date: string;
  notes?: string;
}

export interface UpdateExpenseForm extends Partial<CreateExpenseForm> {
  id: string;
}