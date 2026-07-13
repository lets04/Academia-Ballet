import { useEffect, useState } from 'react';
import type { Student, CreateStudentForm } from '@/types';
import { studentService } from '@/services/students.service';
import { Modal } from '@/components/ui/modal';
import { AlertTriangle, Pencil, UserMinus, UserRound } from 'lucide-react';

const initialFormState: CreateStudentForm = {
  full_name: '',
  document_number: '',
  birth_date: '',
  phone: '',
  guardian_name: '',
  guardian_phone: '',
  notes: '',
};

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState<CreateStudentForm>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateStudentForm, string>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateStudentForm>(initialFormState);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof CreateStudentForm, string>>>({});
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [studentToDeactivate, setStudentToDeactivate] = useState<{ id: string; name: string } | null>(null);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await studentService.list(true);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
      setMessage('No se pudieron cargar los estudiantes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const sanitizeField = (field: keyof CreateStudentForm, value: string): string => {
    if (field === 'full_name' || field === 'guardian_name') {
      // Solo letras (incluyendo acentuadas), espacios y ñ/Ñ
      return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    }
    if (field === 'phone' || field === 'guardian_phone' || field === 'document_number') {
      // Solo números, máximo 8 dígitos para teléfonos (Bolivia)
      const digitsOnly = value.replace(/\D/g, '');
      return field === 'document_number' ? digitsOnly : digitsOnly.slice(0, 8);
    }
    return value;
  };

  const handleChange = (field: keyof CreateStudentForm, value: string) => {
    const sanitized = sanitizeField(field, value);
    setFormData((current) => ({
      ...current,
      [field]: sanitized,
    }));
    // Clear error for this field on change
    if (formErrors[field]) {
      setFormErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validateStudent = (): boolean => {
    const errors: Partial<Record<keyof CreateStudentForm, string>> = {};

    // Full name: required, solo letras y espacios, min 3 chars
    const name = formData.full_name.trim();
    if (!name) {
      errors.full_name = 'El nombre es obligatorio.';
    } else if (name.length < 3) {
      errors.full_name = 'El nombre debe tener al menos 3 caracteres.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
      errors.full_name = 'El nombre solo puede contener letras y espacios.';
    }

    // Document number: duplicate check
    const doc = formData.document_number?.trim();
    if (doc) {
      const duplicate = students.find(
        (s) => s.document_number?.trim().toLowerCase() === doc.toLowerCase()
      );
      if (duplicate) {
        errors.document_number = `Ya existe un estudiante con este documento (${duplicate.full_name}).`;
      }
    }

    // Birth date: cannot be in the future
    if (formData.birth_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(formData.birth_date) > today) {
        errors.birth_date = 'La fecha de nacimiento no puede ser en el futuro.';
      }
    }

    // Phone: exactamente 8 dígitos si se proporciona (Bolivia)
    const phone = formData.phone?.trim();
    if (phone && !/^\d{8}$/.test(phone)) {
      errors.phone = 'Ingresa exactamente 8 dígitos numéricos.';
    }

    // Guardian name: solo letras y espacios si se proporciona
    const guardianName = formData.guardian_name?.trim();
    if (guardianName) {
      if (guardianName.length < 3) {
        errors.guardian_name = 'El nombre del responsable debe tener al menos 3 caracteres.';
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(guardianName)) {
        errors.guardian_name = 'El nombre solo puede contener letras y espacios.';
      }
    }

    // Guardian phone: exactamente 8 dígitos si se proporciona (Bolivia)
    const guardianPhone = formData.guardian_phone?.trim();
    if (guardianPhone && !/^\d{8}$/.test(guardianPhone)) {
      errors.guardian_phone = 'Ingresa exactamente 8 dígitos numéricos.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!validateStudent()) {
      setMessage('Corrige los errores antes de guardar.');
      return;
    }

    setIsLoading(true);
    try {
      await studentService.create(formData);
      setFormData(initialFormState);
      setFormErrors({});
      setMessage('Estudiante agregado correctamente.');
      await loadStudents();
    } catch (error) {
      console.error('Error creando estudiante:', error);
      setMessage('No se pudo crear el estudiante. Revisa los datos e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.document_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      await studentService.deactivate(studentToDeactivate.id);
      setMessage('Estudiante dado de baja correctamente.');
      await loadStudents();
      if (selectedStudent?.id === studentToDeactivate.id) setSelectedStudent(null);
    } catch (error) {
      console.error('Error deactivating student:', error);
      setMessage('No se pudo dar de baja al estudiante.');
    } finally {
      setIsLoading(false);
      closeDeactivateConfirm();
    }
  };

  const openEditMode = () => {
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
    setEditErrors({});
    setIsEditing(true);
  };

  const closeEditMode = () => {
    setIsEditing(false);
    setEditFormData(initialFormState);
    setEditErrors({});
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
        (s) =>
          s.id !== selectedStudent?.id &&
          s.document_number?.trim().toLowerCase() === doc.toLowerCase()
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
      setMessage('Corrige los errores antes de guardar.');
      return;
    }

    setIsLoading(true);
    try {
      await studentService.update(selectedStudent.id, editFormData);
      setMessage('Estudiante actualizado correctamente.');
      setIsEditing(false);
      await loadStudents();
      // Refresh selected student data
      const updated = await studentService.getById(selectedStudent.id);
      if (updated) setSelectedStudent(updated);
    } catch (error) {
      console.error('Error updating student:', error);
      setMessage('No se pudo actualizar el estudiante.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Estudiantes</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Administra los estudiantes inscritos en BAFOLDANZ.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por nombre o documento"
              className="w-full max-w-sm rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
            />
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-900 dark:text-slate-50">Listado de estudiantes</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Aquí verás los estudiantes activos registrados.</p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Documento</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Teléfono</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</th>
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
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-4 py-4">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="font-semibold text-fuchsia-600 dark:text-fuchsia-400 hover:underline hover:text-fuchsia-700 dark:hover:text-fuchsia-300 text-left transition focus:outline-none"
                          >
                            {student.full_name}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{student.document_number || '-'}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{student.phone || '-'}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                            Activo
                          </span>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Agregar estudiante</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Llena los datos básicos para registrar un nuevo alumno.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Nombre completo <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(event) => handleChange('full_name', event.target.value)}
                    required
                    placeholder="Ej: María González"
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900 ${
                      formErrors.full_name
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    }`}
                  />
                  {formErrors.full_name && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.full_name}</p>
                  )}
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Documento
                  <input
                    type="text"
                    value={formData.document_number ?? ''}
                    onChange={(event) => handleChange('document_number', event.target.value)}
                    placeholder="Número de CI o pasaporte"
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900 ${
                      formErrors.document_number
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    }`}
                  />
                  {formErrors.document_number && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.document_number}</p>
                  )}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Fecha de nacimiento
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(event) => handleChange('birth_date', event.target.value)}
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900 ${
                      formErrors.birth_date
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    }`}
                  />
                  {formErrors.birth_date && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.birth_date}</p>
                  )}
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Teléfono
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(event) => handleChange('phone', event.target.value)}
                    placeholder="Ej: 77712345"
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900 ${
                      formErrors.phone
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>
                  )}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Nombre del responsable
                  <input
                    type="text"
                    value={formData.guardian_name || ''}
                    onChange={(event) => handleChange('guardian_name', event.target.value)}
                    placeholder="Ej: Juan González"
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900 ${
                      formErrors.guardian_name
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    }`}
                  />
                  {formErrors.guardian_name && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.guardian_name}</p>
                  )}
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Teléfono del responsable
                  <input
                    type="text"
                    value={formData.guardian_phone || ''}
                    onChange={(event) => handleChange('guardian_phone', event.target.value)}
                    placeholder="Ej: 77712345"
                    className={`mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900 ${
                      formErrors.guardian_phone
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                        : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                    }`}
                  />
                  {formErrors.guardian_phone && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.guardian_phone}</p>
                  )}
                </label>
              </div>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Notas
                <textarea
                  value={formData.notes || ''}
                  onChange={(event) => handleChange('notes', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Guardando...' : 'Agregar estudiante'}
              </button>
            </form>
          </section>
        </div>
      </div>

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
            )}
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
                      className={`w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800 ${
                        editErrors.full_name
                          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                          : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                      }`}
                    />
                    {editErrors.full_name && (
                      <p className="mt-1 text-xs text-red-500">{editErrors.full_name}</p>
                    )}
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
                          className={`w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800 ${
                            editErrors.document_number
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          }`}
                        />
                        {editErrors.document_number && (
                          <p className="mt-1 text-xs text-red-500">{editErrors.document_number}</p>
                        )}
                      </label>
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Teléfono</span>
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={(e) => handleEditChange('phone', e.target.value)}
                          placeholder="Ej: 77712345"
                          className={`w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800 ${
                            editErrors.phone
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          }`}
                        />
                        {editErrors.phone && (
                          <p className="mt-1 text-xs text-red-500">{editErrors.phone}</p>
                        )}
                      </label>
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Fecha de Nacimiento</span>
                        <input
                          type="date"
                          value={editFormData.birth_date}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={(e) => handleEditChange('birth_date', e.target.value)}
                          className={`w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800 ${
                            editErrors.birth_date
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          }`}
                        />
                        {editErrors.birth_date && (
                          <p className="mt-1 text-xs text-red-500">{editErrors.birth_date}</p>
                        )}
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
                          className={`w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800 ${
                            editErrors.guardian_name
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          }`}
                        />
                        {editErrors.guardian_name && (
                          <p className="mt-1 text-xs text-red-500">{editErrors.guardian_name}</p>
                        )}
                      </label>
                      <label className="block">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Teléfono del responsable</span>
                        <input
                          type="text"
                          value={editFormData.guardian_phone}
                          onChange={(e) => handleEditChange('guardian_phone', e.target.value)}
                          placeholder="Ej: 77712345"
                          className={`w-full rounded-lg border px-3 py-1.5 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-800 ${
                            editErrors.guardian_phone
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                              : 'border-slate-300 bg-white focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                          }`}
                        />
                        {editErrors.guardian_phone && (
                          <p className="mt-1 text-xs text-red-500">{editErrors.guardian_phone}</p>
                        )}
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

            {/* Notes */}
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
    </div>
  );
}