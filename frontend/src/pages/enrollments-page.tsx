import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeCheck,
  Building2,
  ClipboardList,
  DollarSign,
  Layers,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';
import { useBranch } from '@/contexts/branch';
import { enrollmentService } from '@/services/enrollment.service';
import { groupService } from '@/services/group.service';
import { studentService } from '@/services/students.service';
import type { CreateEnrollmentForm, Enrollment, Group, Student } from '@/types';

const initialForm: CreateEnrollmentForm = {
  student_id: '',
  group_id: '',
  monthly_fee: 0,
};

const formatMoney = (amount: number) =>
  `Bs. ${amount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

export function EnrollmentsPage() {
  const { branches, selectedBranchId } = useBranch();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [formData, setFormData] = useState<CreateEnrollmentForm>(initialForm);
  const [formBranchId, setFormBranchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  const studentById = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, student])),
    [students]
  );

  const groupById = useMemo(
    () => Object.fromEntries(allGroups.map((group) => [group.id, group])),
    [allGroups]
  );

  const groupsForBranch = useMemo(
    () => allGroups.filter((group) => group.branch_id === formBranchId),
    [allGroups, formBranchId]
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [studentsData, groupsData, enrollmentsData] = await Promise.all([
        studentService.list(true),
        groupService.list(),
        enrollmentService.list(undefined, selectedBranchId || undefined),
      ]);

      setStudents(studentsData);
      setAllGroups(groupsData);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error loading enrollments:', error);
      setMessage('No se pudieron cargar las inscripciones.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  useEffect(() => {
    const defaultBranchId = selectedBranchId || branches[0]?.id || '';
    setFormBranchId(defaultBranchId);
  }, [branches, selectedBranchId]);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      group_id: groupsForBranch[0]?.id || '',
    }));
  }, [groupsForBranch]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await enrollmentService.create({
        ...formData,
        monthly_fee: Number(formData.monthly_fee),
      });
      setFormData({ ...initialForm, group_id: groupsForBranch[0]?.id || '' });
      setMessage('Inscripción registrada correctamente.');
      await loadData();
    } catch (error) {
      console.error('Error creating enrollment:', error);
      setMessage('No se pudo registrar la inscripción. Revisa los datos e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const student = studentById[enrollment.student_id];
    const group = groupById[enrollment.group_id];
    const branchName = group ? branchNameById[group.branch_id] : '';

    return `${student?.full_name || ''} ${student?.document_number || ''} ${group?.name || ''} ${branchName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const activeCount = filteredEnrollments.filter((enrollment) => enrollment.is_active).length;
  const monthlyTotal = filteredEnrollments
    .filter((enrollment) => enrollment.is_active)
    .reduce((sum, enrollment) => sum + enrollment.monthly_fee, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Inscripciones</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Asigna estudiantes a grupos y define su mensualidad.
              </p>
            </div>
          </div>

          <label className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar estudiante, grupo o sucursal"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
            />
          </label>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <BadgeCheck size={17} />Activas
                </p>
                <p className="mt-3 text-3xl font-bold text-sky-700 dark:text-sky-200">{activeCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <DollarSign size={17} />Mensualidad
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{formatMoney(monthlyTotal)}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Estudiante</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Grupo</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Sucursal</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Mensualidad</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                        Cargando inscripciones...
                      </td>
                    </tr>
                  ) : filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                        No se encontraron inscripciones.
                      </td>
                    </tr>
                  ) : (
                    filteredEnrollments.map((enrollment) => {
                      const student = studentById[enrollment.student_id];
                      const group = groupById[enrollment.group_id];

                      return (
                        <tr key={enrollment.id} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="px-4 py-4 text-slate-900 dark:text-slate-100">
                            <p className="font-medium">{student?.full_name || 'Estudiante'}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{student?.document_number || '-'}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{group?.name || '-'}</td>
                          <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                            {group ? branchNameById[group.branch_id] || '-' : '-'}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">
                            {formatMoney(enrollment.monthly_fee)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              enrollment.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {enrollment.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Nueva inscripción</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona estudiante y grupo.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Estudiante
                <div className="relative mt-2">
                  <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formData.student_id}
                    onChange={(event) => setFormData((current) => ({ ...current, student_id: event.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Selecciona un estudiante</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>{student.full_name}</option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Sucursal
                <div className="relative mt-2">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formBranchId}
                    onChange={(event) => setFormBranchId(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Selecciona una sucursal</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Grupo
                <div className="relative mt-2">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formData.group_id}
                    onChange={(event) => setFormData((current) => ({ ...current, group_id: event.target.value }))}
                    required
                    disabled={!formBranchId}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">
                      {formBranchId ? 'Selecciona un grupo' : 'Primero elige una sucursal'}
                    </option>
                    {groupsForBranch.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} - {group.schedule}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Mensualidad
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthly_fee || ''}
                    onChange={(event) => setFormData((current) => ({ ...current, monthly_fee: Number(event.target.value) }))}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading || !formBranchId || !formData.group_id}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                {isLoading ? 'Guardando...' : 'Registrar inscripción'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
