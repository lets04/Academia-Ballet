import { useEffect, useMemo, useState, useCallback } from 'react';
import type {
  Student,
  CreateStudentForm,
  Enrollment,
  Group,
  Branch,
  Notification,
} from '@/types';
import { studentService } from '@/services/students.service';
import { enrollmentService } from '@/services/enrollment.service';
import { groupService } from '@/services/group.service';
import { branchService } from '@/services/branch.service';
import { useBranch } from '@/contexts/branch';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import {
  AlertTriangle,
  Award,
  ChevronDown,
  Funnel,
  Pencil,
  Plus,
  Search,
  UserMinus,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const initialFormState: CreateStudentForm = {
  full_name: '',
  document_number: '',
  birth_date: '',
  phone: '',
  guardian_name: '',
  guardian_phone: '',
  notes: '',
  branch_id: '',
  group_id: '',
  monthly_fee: undefined,
  is_scholarship: false,
};

/* ---------- helpers ---------- */
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/* ---------- page ---------- */
export function StudentsPage() {
  const { selectedBranchId } = useBranch();
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [formData, setFormData] = useState<CreateStudentForm>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateStudentForm, string>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScholarship, setFilterScholarship] = useState<'all' | 'scholarship' | 'no_scholarship'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, message, duration: 4000 }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateStudentForm>(initialFormState);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof CreateStudentForm, string>>>({});

  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [editEnrollmentData, setEditEnrollmentData] = useState({
    branch_id: '',
    group_id: '',
    monthly_fee: 0,
    is_scholarship: false,
  });

  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [studentToDeactivate, setStudentToDeactivate] = useState<{ id: string; name: string } | null>(null);

  /* ---- load data ---- */
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [st, en, gr, br] = await Promise.all([
        studentService.list(true),
        enrollmentService.list(),
        groupService.list(),
        branchService.list(),
      ]);
      setStudents(st);
      setEnrollments(en);
      setGroups(gr);
      setBranches(br);
    } catch (error) {
      console.error('Error loading data:', error);
      addNotification('error', 'No se pudieron cargar los datos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ---- derived data helpers ---- */
  const enrollmentByStudent = useMemo(() => {
    const map: Record<string, Enrollment> = {};
    enrollments.forEach((e) => {
      if (e.is_active) map[e.student_id] = e;
    });
    return map;
  }, [enrollments]);

  const groupById = useMemo(() => {
    const map: Record<string, Group> = {};
    groups.forEach((g) => (map[g.id] = g));
    return map;
  }, [groups]);

  const branchById = useMemo(() => {
    const map: Record<string, Branch> = {};
    branches.forEach((b) => (map[b.id] = b));
    return map;
  }, [branches]);

  const availableGroups = useMemo(() => {
    if (!formData.branch_id) return [];
    return groups.filter((g) => g.branch_id === formData.branch_id);
  }, [groups, formData.branch_id]);

  const availableGroupsForEdit = useMemo(() => {
    if (!editEnrollmentData.branch_id) return groups;
    return groups.filter((g) => g.branch_id === editEnrollmentData.branch_id);
  }, [groups, editEnrollmentData.branch_id]);

  // Load enrollment when selecting a student
  useEffect(() => {
    if (!selectedStudent) {
      setSelectedEnrollment(null);
      return;
    }
    const en = enrollmentByStudent[selectedStudent.id];
    if (en) {
      setSelectedEnrollment(en);
    } else {
      setSelectedEnrollment(null);
    }
  }, [selectedStudent, enrollmentByStudent]);

  /* ---- form helpers ---- */
  const sanitizeField = (field: keyof CreateStudentForm, value: string): string => {
    if (field === 'full_name' || field === 'guardian_name') {
      return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    }
    if (field === 'phone' || field === 'guardian_phone' || field === 'document_number') {
      const digitsOnly = value.replace(/\D/g, '');
      return field === 'document_number' ? digitsOnly : digitsOnly.slice(0, 8);
    }
    return value;
  };

  const handleChange = (field: keyof CreateStudentForm, value: string | boolean | number) => {
    if (typeof value === 'string') {
      value = sanitizeField(field as keyof CreateStudentForm, value);
    }
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
    if (formErrors[field as keyof CreateStudentForm]) {
      setFormErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validateStudent = (): boolean => {
    const errors: Partial<Record<keyof CreateStudentForm, string>> = {};

    const name = formData.full_name.trim();
    if (!name) {
      errors.full_name = 'El nombre es obligatorio.';
    } else if (name.length < 3) {
      errors.full_name = 'El nombre debe tener al menos 3 caracteres.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
      errors.full_name = 'El nombre solo puede contener letras y espacios.';
    }

    const doc = formData.document_number?.trim();
    if (doc) {
      const duplicate = students.find(
        (s) => s.document_number?.trim().toLowerCase() === doc.toLowerCase()
      );
      if (duplicate) {
        errors.document_number = `Ya existe un estudiante con este documento (${duplicate.full_name}).`;
      }
    }

    if (formData.birth_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(formData.birth_date) > today) {
        errors.birth_date = 'La fecha de nacimiento no puede ser en el futuro.';
      }
    }

    const phone = formData.phone?.trim();
    if (phone && !/^\d{8}$/.test(phone)) {
      errors.phone = 'Ingresa exactamente 8 dígitos numéricos.';
    }

    const guardianName = formData.guardian_name?.trim();
    if (guardianName) {
      if (guardianName.length < 3) {
        errors.guardian_name = 'El nombre del responsable debe tener al menos 3 caracteres.';
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(guardianName)) {
        errors.guardian_name = 'El nombre solo puede contener letras y espacios.';
      }
    }

    const guardianPhone = formData.guardian_phone?.trim();
    if (guardianPhone && !/^\d{8}$/.test(guardianPhone)) {
      errors.guardian_phone = 'Ingresa exactamente 8 dígitos numéricos.';
    }

    if (formData.branch_id || formData.group_id || formData.monthly_fee) {
      if (!formData.branch_id) errors.branch_id = 'Selecciona una sucursal.';
      if (!formData.group_id) errors.group_id = 'Selecciona un grupo.';
      if (!formData.monthly_fee || Number(formData.monthly_fee) <= 0) {
        errors.monthly_fee = 'Ingresa una mensualidad válida.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateStudent()) {
      addNotification('warning', 'Corrige los errores antes de guardar.');
      return;
    }

    setIsLoading(true);
    try {
      const created = await studentService.create({
        full_name: formData.full_name,
        document_number: formData.document_number,
        birth_date: formData.birth_date,
        phone: formData.phone,
        guardian_name: formData.guardian_name,
        guardian_phone: formData.guardian_phone,
        notes: formData.notes,
      });

      if (formData.group_id && formData.monthly_fee) {
        await enrollmentService.create({
          student_id: created.id,
          group_id: formData.group_id,
          monthly_fee: Number(formData.monthly_fee),
          is_scholarship: formData.is_scholarship || false,
        });
      }

      setFormData(initialFormState);
      setFormErrors({});
      addNotification('success', 'Estudiante registrado correctamente.');
      await loadData();
    } catch (error: any) {
      console.error('Error registrando estudiante:', error);
      addNotification('error', error?.message || 'No se pudo registrar el estudiante. Revisa los datos e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const en = enrollmentByStudent[student.id];
    const group = en ? groupById[en.group_id] : null;

    if (selectedBranchId && group && group.branch_id !== selectedBranchId) return false;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      student.full_name.toLowerCase().includes(q) ||
      (student.document_number || '').toLowerCase().includes(q) ||
      (() => {
        if (!en) return false;
        if (!group) return false;
        if (group.name.toLowerCase().includes(q)) return true;
        const branch = branchById[group.branch_id];
        if (branch && branch.name.toLowerCase().includes(q)) return true;
        return false;
      })();
    if (!matchesSearch) return false;
    if (filterScholarship === 'all') return true;
    const isScholarship = en?.is_scholarship || false;
    return filterScholarship === 'scholarship' ? isScholarship : !isScholarship;
  });

  /* ---- deactivate ---- */
  const openDeactivateConfirm = (studentId: string, studentName: string) => {
    setStudentToDeactivate({ id: studentId, name: studentName });
    setConfirmDeactivateOpen(true);
  };

  const closeDeactivateConfirm = () => {
    setConfirmDeactivateOpen(false);
    setStudentToDeactivate(null);
  };

  const handleDeactivateConfirm = async () => {
    if (!studentToDeactivate) return;
    setIsLoading(true);
    try {
      // Deactivate enrollment first
      const en = enrollmentByStudent[studentToDeactivate.id];
      if (en) await enrollmentService.deactivate(en.id);
      // Then deactivate student
      await studentService.deactivate(studentToDeactivate.id);
      addNotification('success', 'Estudiante dado de baja correctamente.');
      await loadData();
      if (selectedStudent?.id === studentToDeactivate.id) setSelectedStudent(null);
    } catch (error) {
      console.error('Error deactivating student:', error);
      addNotification('error', 'No se pudo dar de baja al estudiante.');
    } finally {
      setIsLoading(false);
      closeDeactivateConfirm();
    }
  };

  /* ---- edit ---- */
  const openEditMode = async () => {
    if (!selectedStudent) return;
    setEditFormData({
      full_name: selectedStudent.full_name,
      document_number: selectedStudent.document_number || '',
      birth_date: selectedStudent.birth_date || '',
      phone: selectedStudent.phone || '',
      guardian_name: selectedStudent.guardian_name || '',
      guardian_phone: selectedStudent.guardian_phone || '',
      notes: selectedStudent.notes || '',
    });

    // Cargar inscripción activa
    try {
      const en = await enrollmentService.getActive(selectedStudent.id);
      if (en) {
        setSelectedEnrollment(en);
        const currentGroup = groupById[en.group_id];
        setEditEnrollmentData({
          branch_id: currentGroup?.branch_id || '',
          group_id: en.group_id,
          monthly_fee: en.monthly_fee,
          is_scholarship: en.is_scholarship || false,
        });
      } else {
        setSelectedEnrollment(null);
        setEditEnrollmentData({ branch_id: '', group_id: '', monthly_fee: 0, is_scholarship: false });
      }
    } catch (e) {
      console.error('Error loading enrollment:', e);
    }

    setEditErrors({});
    setIsEditing(true);
  };

  const closeEditMode = () => {
    setIsEditing(false);
    setEditFormData(initialFormState);
    setEditErrors({});
    setSelectedEnrollment(null);
    setEditEnrollmentData({ branch_id: '', group_id: '', monthly_fee: 0, is_scholarship: false });
  };

  const handleEditChange = (field: keyof CreateStudentForm, value: string) => {
    const sanitized = sanitizeField(field, value);
    setEditFormData((current) => ({ ...current, [field]: sanitized }));
    if (editErrors[field]) {
      setEditErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validateEditStudent = (): boolean => {
    const errors: Partial<Record<keyof CreateStudentForm, string>> = {};
    const name = editFormData.full_name.trim();
    if (!name) {
      errors.full_name = 'El nombre es obligatorio.';
    } else if (name.length < 3) {
      errors.full_name = 'El nombre debe tener al menos 3 caracteres.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
      errors.full_name = 'El nombre solo puede contener letras y espacios.';
    }
    const doc = editFormData.document_number?.trim();
    if (doc) {
      const duplicate = students.find(
        (s) => s.id !== selectedStudent?.id && s.document_number?.trim().toLowerCase() === doc.toLowerCase()
      );
      if (duplicate) {
        errors.document_number = `Ya existe un estudiante con este documento (${duplicate.full_name}).`;
      }
    }
    if (editFormData.birth_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(editFormData.birth_date) > today) {
        errors.birth_date = 'La fecha de nacimiento no puede ser en el futuro.';
      }
    }
    const phone = editFormData.phone?.trim();
    if (phone && !/^\d{8}$/.test(phone)) {
      errors.phone = 'Ingresa exactamente 8 dígitos numéricos.';
    }
    const guardianName = editFormData.guardian_name?.trim();
    if (guardianName) {
      if (guardianName.length < 3) {
        errors.guardian_name = 'El nombre del responsable debe tener al menos 3 caracteres.';
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(guardianName)) {
        errors.guardian_name = 'El nombre solo puede contener letras y espacios.';
      }
    }
    const guardianPhone = editFormData.guardian_phone?.trim();
    if (guardianPhone && !/^\d{8}$/.test(guardianPhone)) {
      errors.guardian_phone = 'Ingresa exactamente 8 dígitos numéricos.';
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!selectedStudent) return;
    if (!validateEditStudent()) {
      addNotification('warning', 'Corrige los errores antes de guardar.');
      return;
    }
    setIsLoading(true);
    try {
      // 1. Actualizar estudiante (solo campos de la tabla students)
      await studentService.update(selectedStudent.id, {
        full_name: editFormData.full_name,
        document_number: editFormData.document_number,
        birth_date: editFormData.birth_date,
        phone: editFormData.phone,
        guardian_name: editFormData.guardian_name,
        guardian_phone: editFormData.guardian_phone,
        notes: editFormData.notes,
      });

      // 2. Actualizar o crear inscripción
      if (editEnrollmentData.group_id) {
        if (selectedEnrollment) {
          // Actualizar inscripción existente
          await enrollmentService.update(selectedEnrollment.id, {
            group_id: editEnrollmentData.group_id,
            monthly_fee: Number(editEnrollmentData.monthly_fee),
            is_scholarship: editEnrollmentData.is_scholarship,
          });
        } else {
          // Crear nueva inscripción
          await enrollmentService.create({
            student_id: selectedStudent.id,
            group_id: editEnrollmentData.group_id,
            monthly_fee: Number(editEnrollmentData.monthly_fee),
          });
        }
      }

      addNotification('success', 'Estudiante actualizado correctamente.');
      setIsEditing(false);
      await loadData();
      const updated = await studentService.getById(selectedStudent.id);
      if (updated) setSelectedStudent(updated);
    } catch (error) {
      console.error('Error updating student:', error);
      addNotification('error', 'No se pudo actualizar el estudiante.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---- render helpers ---- */
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200">
              <UserRound size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Estudiantes</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Administra las inscripciones de los estudiantes.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* ---- Left column: table ---- */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="relative block w-full md:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, CI, grupo o sucursal..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                />
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Funnel size={16} />
                  Filtros
                  {filterScholarship !== 'all' && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">1</span>
                  )}
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <p className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Beca</p>
                    {[
                      { value: 'all' as const, label: 'Todos' },
                      { value: 'scholarship' as const, label: 'Becados' },
                      { value: 'no_scholarship' as const, label: 'No becados' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setFilterScholarship(opt.value); setShowFilterMenu(false); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                          filterScholarship === opt.value
                            ? 'bg-fuchsia-50 font-semibold text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-300'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {filterScholarship === opt.value && <span className="size-1.5 rounded-full bg-fuchsia-500" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Alumno</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Grupo</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Sucursal</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Mensualidad</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando estudiantes...</td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No se encontraron estudiantes.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const en = enrollmentByStudent[student.id];
                      const group = en ? groupById[en.group_id] : null;
                      return (
                        <tr key={student.id} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative group">
                                <div
                                  className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                                    student.is_active
                                      ? 'bg-emerald-500/25 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                      : 'bg-slate-300/60 text-slate-600 dark:bg-slate-600/60 dark:text-slate-300'
                                  )}
                                >
                                  {getInitials(student.full_name)}
                                </div>
                                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold text-white bg-slate-800 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap dark:bg-slate-700 z-10">
                                  {student.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <button
                                  onClick={() => setSelectedStudent(student)}
                                  className="block truncate text-left font-semibold text-fuchsia-600 dark:text-fuchsia-400 hover:underline hover:text-fuchsia-700 dark:hover:text-fuchsia-300 transition focus:outline-none"
                                >
                                  {student.full_name}
                                </button>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-500 dark:text-slate-400">{student.document_number || 'Sin CI'}</span>
                                  {en?.is_scholarship && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                      <Award size={10} />
                                      Beca
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                            {group ? (
                              <div>
                                <span className="font-medium">{group.name}</span>
                                {group.level && (
                                  <span className="block text-xs text-slate-500 dark:text-slate-400">{group.level}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                            {group ? (
                              <span className="font-medium">{branchById[group.branch_id]?.name || '-'}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                            {en ? (
                              <span className="font-medium">Bs. {en.monthly_fee}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => openDeactivateConfirm(student.id, student.full_name)}
                              disabled={isLoading}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              title="Dar de baja"
                            >
                              <UserMinus size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ---- Right column: form ---- */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-blue-900/30 dark:text-blue-200">
                <Plus size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Agregar Estudiante</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ingresa la informacion y asigna un grupo.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Nombre completo <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    required
                    placeholder="Ej: María González"
                    className={cn(
                      'mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900',
                      formErrors.full_name
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    )}
                  />
                  {formErrors.full_name && <p className="mt-1 text-xs text-red-500">{formErrors.full_name}</p>}
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Documento
                  <input
                    type="text"
                    value={formData.document_number ?? ''}
                    onChange={(e) => handleChange('document_number', e.target.value)}
                    placeholder="Número de CI o pasaporte"
                    className={cn(
                      'mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900',
                      formErrors.document_number
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    )}
                  />
                  {formErrors.document_number && <p className="mt-1 text-xs text-red-500">{formErrors.document_number}</p>}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Fecha de nacimiento
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleChange('birth_date', e.target.value)}
                    className={cn(
                      'mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900',
                      formErrors.birth_date
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    )}
                  />
                  {formErrors.birth_date && <p className="mt-1 text-xs text-red-500">{formErrors.birth_date}</p>}
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Teléfono
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="Ej: 77712345"
                    className={cn(
                      'mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900',
                      formErrors.phone
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    )}
                  />
                  {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Nombre del responsable
                  <input
                    type="text"
                    value={formData.guardian_name || ''}
                    onChange={(e) => handleChange('guardian_name', e.target.value)}
                    placeholder="Ej: Juan González"
                    className={cn(
                      'mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900',
                      formErrors.guardian_name
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    )}
                  />
                  {formErrors.guardian_name && <p className="mt-1 text-xs text-red-500">{formErrors.guardian_name}</p>}
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Teléfono del responsable
                  <input
                    type="text"
                    value={formData.guardian_phone || ''}
                    onChange={(e) => handleChange('guardian_phone', e.target.value)}
                    placeholder="Ej: 77712345"
                    className={cn(
                      'mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900',
                      formErrors.guardian_phone
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    )}
                  />
                  {formErrors.guardian_phone && <p className="mt-1 text-xs text-red-500">{formErrors.guardian_phone}</p>}
                </label>
              </div>

              {/* Enrollment fields */}
              <div className="space-y-4">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Sucursal
                  <div className="relative mt-2">
                    <select
                      value={formData.branch_id || ''}
                      onChange={(e) => {
                        handleChange('branch_id', e.target.value);
                        handleChange('group_id', '');
                      }}
                      className={cn(
                        'w-full appearance-none rounded-xl border px-3 py-2 pr-8 text-sm outline-none transition dark:text-slate-100 dark:bg-slate-900',
                        formErrors.branch_id
                          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                          : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                      )}
                    >
                      <option value="">Seleccionar sucursal</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                  {formErrors.branch_id && <p className="mt-1 text-xs text-red-500">{formErrors.branch_id}</p>}
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Grupo
                  <div className="relative mt-2">
                    <select
                      value={formData.group_id || ''}
                      onChange={(e) => handleChange('group_id', e.target.value)}
                      disabled={!formData.branch_id}
                      className={cn(
                        'w-full appearance-none rounded-xl border px-3 py-2 pr-8 text-sm outline-none transition dark:text-slate-100 dark:bg-slate-900 disabled:opacity-50',
                        formErrors.group_id
                          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                          : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                      )}
                    >
                      <option value="">Seleccionar grupo</option>
                      {availableGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} {g.schedule ? `(${g.schedule})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                  {formErrors.group_id && <p className="mt-1 text-xs text-red-500">{formErrors.group_id}</p>}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-slate-700 dark:text-slate-300">
                    Mensualidad (Bs.)
                    <input
                      type="number"
                      min={0}
                      value={formData.monthly_fee ?? ''}
                      onChange={(e) => handleChange('monthly_fee', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ej: 150"
                      className={cn(
                        'mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900',
                        formErrors.monthly_fee
                          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                          : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                      )}
                    />
                    {formErrors.monthly_fee && <p className="mt-1 text-xs text-red-500">{formErrors.monthly_fee}</p>}
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pt-7">
                    <input
                      type="checkbox"
                      checked={formData.is_scholarship || false}
                      onChange={(e) => handleChange('is_scholarship', e.target.checked)}
                      className="rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500 dark:border-slate-600 dark:bg-slate-900"
                    />
                    Beca (sin costo)
                  </label>
                </div>
              </div>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Notas
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Guardando...' : 'Registrar estudiante'}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* ---- Detail / Edit Modal (unchanged structure) ---- */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title="Detalle del Estudiante"
          footer={
            isEditing ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isLoading}
                  className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={closeEditMode}
                  disabled={isLoading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openEditMode}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-900/40 transition"
                >
                  <Pencil size={16} />
                  Editar
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition"
                >
                  Cerrar
                </button>
              </div>
            )
          }
        >
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-950/20 border border-fuchsia-100 dark:border-fuchsia-900/30">
              <div className="p-3 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400">
                <UserRound size={24} />
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Nombre completo</label>
                    <input
                      type="text"
                      value={editFormData.full_name}
                      onChange={(e) => handleEditChange('full_name', e.target.value)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800',
                        editErrors.full_name
                          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                          : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                      )}
                    />
                    {editErrors.full_name && <p className="mt-1 text-xs text-red-500">{editErrors.full_name}</p>}
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate" title={selectedStudent.full_name}>
                      {selectedStudent.full_name}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {selectedStudent.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Student Details */}
              <div className="space-y-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  Datos del Alumno
                </h4>
                <div className="space-y-3 text-sm">
                  {isEditing ? (
                    <>
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Documento</span>
                        <input
                          type="text"
                          value={editFormData.document_number}
                          onChange={(e) => handleEditChange('document_number', e.target.value)}
                          className={cn(
                            'w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800',
                            editErrors.document_number
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          )}
                        />
                        {editErrors.document_number && <p className="mt-1 text-xs text-red-500">{editErrors.document_number}</p>}
                      </label>
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Teléfono</span>
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={(e) => handleEditChange('phone', e.target.value)}
                          placeholder="Ej: 77712345"
                          className={cn(
                            'w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800',
                            editErrors.phone
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          )}
                        />
                        {editErrors.phone && <p className="mt-1 text-xs text-red-500">{editErrors.phone}</p>}
                      </label>
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Fecha de Nacimiento</span>
                        <input
                          type="date"
                          value={editFormData.birth_date}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={(e) => handleEditChange('birth_date', e.target.value)}
                          className={cn(
                            'w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800',
                            editErrors.birth_date
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          )}
                        />
                        {editErrors.birth_date && <p className="mt-1 text-xs text-red-500">{editErrors.birth_date}</p>}
                      </label>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Documento</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium">{selectedStudent.document_number || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Teléfono</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium">{selectedStudent.phone || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Fecha de Nacimiento</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium">
                          {selectedStudent.birth_date
                            ? new Date(selectedStudent.birth_date).toLocaleDateString('es-ES', {
                              timeZone: 'UTC',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                            : 'No registrada'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Guardian/Responsible Details */}
              <div className="space-y-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  Datos del Responsable
                </h4>
                <div className="space-y-3 text-sm">
                  {isEditing ? (
                    <>
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Nombre del responsable</span>
                        <input
                          type="text"
                          value={editFormData.guardian_name}
                          onChange={(e) => handleEditChange('guardian_name', e.target.value)}
                          placeholder="Ej: Juan González"
                          className={cn(
                            'w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800',
                            editErrors.guardian_name
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          )}
                        />
                        {editErrors.guardian_name && <p className="mt-1 text-xs text-red-500">{editErrors.guardian_name}</p>}
                      </label>
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Teléfono del responsable</span>
                        <input
                          type="text"
                          value={editFormData.guardian_phone}
                          onChange={(e) => handleEditChange('guardian_phone', e.target.value)}
                          placeholder="Ej: 77712345"
                          className={cn(
                            'w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800',
                            editErrors.guardian_phone
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          )}
                        />
                        {editErrors.guardian_phone && <p className="mt-1 text-xs text-red-500">{editErrors.guardian_phone}</p>}
                      </label>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Nombre del responsable</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium">{selectedStudent.guardian_name || 'No registrado'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Teléfono del responsable</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium">{selectedStudent.guardian_phone || 'No registrado'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Inscripción + Notas - lado a lado */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Inscripción - izquierda */}
              <div className="space-y-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  Inscripción
                </h4>
                {isEditing ? (
                  <div className="space-y-3 text-sm">
                    <label className="block">
                      <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Sucursal</span>
                      <select
                        value={editEnrollmentData.branch_id}
                        onChange={(e) => setEditEnrollmentData((current) => ({ ...current, branch_id: e.target.value, group_id: '' }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                      >
                        <option value="">Seleccionar sucursal</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Grupo</span>
                      <select
                        value={editEnrollmentData.group_id}
                        onChange={(e) => setEditEnrollmentData((current) => ({ ...current, group_id: e.target.value }))}
                        disabled={!editEnrollmentData.branch_id}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30 disabled:opacity-50"
                      >
                        <option value="">Seleccionar grupo</option>
                        {availableGroupsForEdit.map((g) => (
                          <option key={g.id} value={g.id}>{g.name} ({g.schedule})</option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Mensualidad (Bs.)</span>
                        <input
                          type="number"
                          min={0}
                          value={editEnrollmentData.monthly_fee || ''}
                          onChange={(e) => setEditEnrollmentData((current) => ({ ...current, monthly_fee: Number(e.target.value) }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pt-5">
                        <input
                          type="checkbox"
                          checked={editEnrollmentData.is_scholarship}
                          onChange={(e) => setEditEnrollmentData((current) => ({ ...current, is_scholarship: e.target.checked }))}
                          className="rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500 dark:border-slate-600 dark:bg-slate-800"
                        />
                        Beca (sin costo)
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Sucursal</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium">
                        {selectedEnrollment ? (branchById[groupById[selectedEnrollment.group_id]?.branch_id]?.name || '-') : 'Sin inscripción'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Grupo</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium">
                        {selectedEnrollment ? (groupById[selectedEnrollment.group_id]?.name || '-') : 'Sin inscripción'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Mensualidad</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium">
                        {selectedEnrollment ? `Bs. ${selectedEnrollment.monthly_fee}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Beca</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium">
                        {selectedEnrollment?.is_scholarship ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notas - derecha */}
              <div className="space-y-2 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  Notas / Observaciones
                </h4>
                {isEditing ? (
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => handleEditChange('notes', e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  />
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {selectedStudent.notes || 'Ninguna nota registrada.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm deactivate student modal */}
      <Modal
        isOpen={confirmDeactivateOpen}
        onClose={closeDeactivateConfirm}
        title="Dar de baja al estudiante"
        footer={
          <>
            <button
              type="button"
              onClick={closeDeactivateConfirm}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeactivateConfirm}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserMinus size={16} />
              {isLoading ? 'Procesando...' : 'Dar de baja'}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              ¿Estás seguro de que deseas dar de baja a <strong className="text-slate-900 dark:text-slate-100">{studentToDeactivate?.name}</strong>?
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">El estudiante ya no aparecerá en la lista de estudiantes activos.</p>
          </div>
        </div>
      </Modal>
      <ToastContainer notifications={notifications} onClose={removeNotification} />
    </div>
  );
}
