import { supabase } from "@/lib/supabase";
import type { Student } from "@/types/student";

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Student[];
}