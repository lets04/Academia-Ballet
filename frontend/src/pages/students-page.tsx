import { useEffect, useState } from 'react';
import type { Student, CreateStudentForm } from '@/types';
import { studentService } from '@/services/students.service';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const handleChange = (field: keyof CreateStudentForm, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await studentService.create(formData);
      setFormData(initialFormState);
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
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando estudiantes...</td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No se encontraron estudiantes.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-4 py-4 text-slate-900 dark:text-slate-100">{student.full_name}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{student.document_number || '-'}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{student.phone || '-'}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                            Activo
                          </span>
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
                  Nombre completo
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(event) => handleChange('full_name', event.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  />
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Documento
                  <input
                    type="text"
                    value={formData.document_number}
                    onChange={(event) => handleChange('document_number', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Fecha de nacimiento
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(event) => handleChange('birth_date', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  />
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Teléfono
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(event) => handleChange('phone', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Nombre del responsable
                  <input
                    type="text"
                    value={formData.guardian_name || ''}
                    onChange={(event) => handleChange('guardian_name', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  />
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Teléfono del responsable
                  <input
                    type="text"
                    value={formData.guardian_phone || ''}
                    onChange={(event) => handleChange('guardian_phone', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  />
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
    </div>
  );
}