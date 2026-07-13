import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ClipboardList,
  DollarSign,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Search,
  UserMinus,
  UserRound,
} from 'lucide-react';
import { useBranch } from '@/contexts/branch';
import { enrollmentService } from '@/services/enrollment.service';
import { groupService } from '@/services/group.service';
import { studentService } from '@/services/students.service';
import { Modal } from '@/components/ui/modal';
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
  const [activeStudentIds, setActiveStudentIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<CreateEnrollmentForm>(initialForm);
  const [formBranchId, setFormBranchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMonthlyFee, setEditMonthlyFee] = useState<number>(0);
  const [editGroupId, setEditGroupId] = useState<string>('');
  const [editBranchId, setEditBranchId] = useState<string>('');
  const [editIsScholarship, setEditIsScholarship] = useState(false);

  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [enrollmentToDeactivate, setEnrollmentToDeactivate] = useState<{ id: string; name: string } | null>(null);

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
      const [studentsData, groupsData, enrollmentsData, activeIds] = await Promise.all([
        studentService.list(true),
        groupService.list(),
        enrollmentService.list(undefined, selectedBranchId || undefined),
        enrollmentService.getActiveStudentIds(),
      ]);

      setStudents(studentsData);
      setAllGroups(groupsData);
      setEnrollments(enrollmentsData);
      setActiveStudentIds(new Set(activeIds));
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

    if (activeStudentIds.has(formData.student_id)) {
      setMessage('El estudiante ya cuenta con una inscripción activa en otra sucursal o grupo.');
      return;
    }

    setIsLoading(true);
    try {
      await enrollmentService.create({
        ...formData,
        monthly_fee: Number(formData.monthly_fee),
      });
      setFormData({ ...initialForm, group_id: groupsForBranch[0]?.id || '' });
      setMessage('Inscripción registrada correctamente.');
      await loadData();
    } catch (error: any) {
      console.error('Error creating enrollment:', error);
      setMessage(error.message || 'No se pudo registrar la inscripción. Revisa los datos e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };


  const openEditMode = () => {
    if (!selectedEnrollment) return;
    setEditMonthlyFee(selectedEnrollment.monthly_fee);
    setEditIsScholarship(selectedEnrollment.is_scholarship || false);
    setEditGroupId(selectedEnrollment.group_id);
    const group = groupById[selectedEnrollment.group_id];
    setEditBranchId(group?.branch_id || '');
    setIsEditing(true);
  };

  const closeEditMode = () => {
    setIsEditing(false);
    setEditMonthlyFee(0);
    setEditIsScholarship(false);
    setEditGroupId('');
    setEditBranchId('');
  };

  const handleSaveEdit = async () => {
    if (!selectedEnrollment) return;

    if (editMonthlyFee < 0) {
      setMessage('La mensualidad no puede ser negativa.');
      return;
    }

    setIsLoading(true);
    try {
      // Intentar guardar con is_scholarship
      await enrollmentService.update(selectedEnrollment.id, {
        group_id: editGroupId,
        monthly_fee: editMonthlyFee,
        is_scholarship: editIsScholarship,
      });
      setMessage('Inscripción actualizada correctamente.');
    } catch (firstError: any) {
      const msg = firstError?.message || '';
      // Si falla por columna desconocida, reintentar sin is_scholarship
      if (msg.includes('is_scholarship') || msg.includes('column') || msg.includes('does not exist')) {
        try {
          await enrollmentService.update(selectedEnrollment.id, {
            group_id: editGroupId,
            monthly_fee: editMonthlyFee,
          });
          setMessage('Inscripción actualizada, pero falta la columna "is_scholarship" en Supabase. Agrégala para que el flag de becado persista.');
        } catch (secondError: any) {
          console.error('Error updating enrollment:', secondError);
          setMessage(secondError?.message || 'No se pudo actualizar la inscripción.');
          setIsLoading(false);
          return;
        }
      } else {
        console.error('Error updating enrollment:', firstError);
        setMessage(firstError?.message || 'No se pudo actualizar la inscripción.');
        setIsLoading(false);
        return;
      }
    }
    setIsEditing(false);
    await loadData();
    const updated = await enrollmentService.getById(selectedEnrollment.id);
    if (updated) setSelectedEnrollment(updated);
    setIsLoading(false);
  };

  const openDeactivateConfirm = (enrollmentId: string, studentName: string) => {
    setEnrollmentToDeactivate({ id: enrollmentId, name: studentName });
    setConfirmDeactivateOpen(true);
  };

  const closeDeactivateConfirm = () => {
    setConfirmDeactivateOpen(false);
    setEnrollmentToDeactivate(null);
  };

  const handleDeactivateConfirm = async () => {
    if (!enrollmentToDeactivate) return;

    setIsLoading(true);
    try {
      await enrollmentService.deactivate(enrollmentToDeactivate.id);
      setMessage('Estudiante dado de baja correctamente.');
      await loadData();
      // If the selected enrollment modal is open and it's the same one, close it
      if (selectedEnrollment?.id === enrollmentToDeactivate.id) {
        setSelectedEnrollment(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deactivating enrollment:', error);
      setMessage('No se pudo dar de baja al estudiante.');
    } finally {
      setIsLoading(false);
      closeDeactivateConfirm();
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
  const scholarshipCount = filteredEnrollments.filter((enrollment) => enrollment.is_active && enrollment.is_scholarship).length;
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
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <BadgeCheck size={17} />Activas
                </p>
                <p className="mt-3 text-3xl font-bold text-sky-700 dark:text-sky-200">{activeCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <GraduationCap size={17} />Becados
                </p>
                <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-300">{scholarshipCount}</p>
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
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                        Cargando inscripciones...
                      </td>
                    </tr>
                  ) : filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
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
                            <button
                              onClick={() => setSelectedEnrollment(enrollment)}
                              className="font-medium text-fuchsia-600 dark:text-fuchsia-400 hover:underline hover:text-fuchsia-700 dark:hover:text-fuchsia-300 text-left transition focus:outline-none"
                            >
                              {student?.full_name || 'Estudiante'}
                            </button>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{student?.document_number || '-'}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{group?.name || '-'}</td>
                          <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                            {group ? branchNameById[group.branch_id] || '-' : '-'}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">
                            <span className="flex items-center gap-2">
                              {formatMoney(enrollment.monthly_fee)}
                              {enrollment.is_scholarship && (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                                  Becado
                                </span>
                              )}
                            </span>
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
                          <td className="px-4 py-4">
                            {enrollment.is_active && (
                              <button
                                type="button"
                                onClick={() => openDeactivateConfirm(enrollment.id, student?.full_name || 'Estudiante')}
                                disabled={isLoading}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                title="Dar de baja"
                              >
                                <UserMinus size={16} />
                              </button>
                            )}
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
                    {students.map((student) => {
                      const isEnrolled = activeStudentIds.has(student.id);
                      return (
                        <option key={student.id} value={student.id} disabled={isEnrolled}>
                          {student.full_name} {isEnrolled ? '— ya inscrito' : ''}
                        </option>
                      );
                    })}
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

      {/* Confirm deactivate enrollment modal */}
      <Modal
        isOpen={confirmDeactivateOpen}
        onClose={closeDeactivateConfirm}
        title="Dar de baja del grupo"
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
              ¿Estás seguro de que deseas dar de baja a <strong className="text-slate-900 dark:text-slate-100">{enrollmentToDeactivate?.name}</strong> de este grupo?
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">El estudiante será retirado de este grupo y ya no aparecerá en la lista de inscripciones activas.</p>
          </div>
        </div>
      </Modal>

      {selectedEnrollment && (
        <Modal
          isOpen={!!selectedEnrollment}
          onClose={() => { setSelectedEnrollment(null); setIsEditing(false); }}
          title="Detalle de Inscripción"
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
                  onClick={() => { setSelectedEnrollment(null); setIsEditing(false); }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition"
                >
                  Cerrar
                </button>
              </div>
            )
          }
        >
          <div className="space-y-6">
            {(() => {
              const student = studentById[selectedEnrollment.student_id];
              const group = groupById[selectedEnrollment.group_id];
              return (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
                    <div className="p-3 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400">
                      <UserRound size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate" title={student?.full_name}>
                        {student?.full_name || 'Estudiante'}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {selectedEnrollment.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                        Información del Estudiante
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Documento</span>
                          <span className="text-slate-900 dark:text-slate-200 font-medium">{student?.document_number || 'No registrado'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Teléfono</span>
                          <span className="text-slate-900 dark:text-slate-200 font-medium">{student?.phone || 'No registrado'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                        Información de la Inscripción
                      </h4>
                      <div className="space-y-3 text-sm">
                        {isEditing ? (
                          <>
                            <label className="block">
                              <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Sucursal</span>
                              <select
                                value={editBranchId}
                                onChange={(e) => setEditBranchId(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                              >
                                <option value="">Selecciona una sucursal</option>
                                {branches.map((branch) => (
                                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Grupo</span>
                              <select
                                value={editGroupId}
                                onChange={(e) => setEditGroupId(e.target.value)}
                                disabled={!editBranchId}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                              >
                                <option value="">{editBranchId ? 'Selecciona un grupo' : 'Primero elige una sucursal'}</option>
                                {allGroups
                                  .filter((g) => g.branch_id === editBranchId)
                                  .map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.name} - {g.schedule}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20 cursor-pointer transition hover:bg-amber-100 dark:hover:bg-amber-950/30">
                              <input
                                type="checkbox"
                                checked={editIsScholarship}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditIsScholarship(checked);
                                  if (checked) {
                                    setEditMonthlyFee(60);
                                  }
                                }}
                                className="size-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700"
                              />
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                Designar como becado
                              </span>
                            </label>
                            <label className="block">
                              <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                                {editIsScholarship ? 'Monto de beca' : 'Mensualidad'}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editMonthlyFee}
                                onChange={(e) => setEditMonthlyFee(Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                              />
                              {editIsScholarship && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  Esta inscripción está marcada como Becado.
                                </p>
                              )}
                            </label>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Sucursal</span>
                              <span className="text-slate-900 dark:text-slate-200 font-medium">{group ? branchNameById[group.branch_id] || '-' : '-'}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Grupo</span>
                              <span className="text-slate-900 dark:text-slate-200 font-medium">{group?.name || '-'}</span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {selectedEnrollment.is_scholarship ? 'Monto de beca' : 'Mensualidad'}
                              </span>
                              <span className="text-slate-900 dark:text-slate-200 font-medium">
                                {formatMoney(selectedEnrollment.monthly_fee)}
                                {selectedEnrollment.is_scholarship && (
                                  <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                                    Becado
                                  </span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Fecha de inicio</span>
                              <span className="text-slate-900 dark:text-slate-200 font-medium">
                                {selectedEnrollment.start_date
                                  ? new Date(selectedEnrollment.start_date).toLocaleDateString('es-ES', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })
                                  : 'No registrada'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}
