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