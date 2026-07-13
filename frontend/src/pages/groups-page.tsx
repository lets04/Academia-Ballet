import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Building2, Calendar, Clock, Layers, Pencil, Plus, Search, Trash2, UserRound, Users } from 'lucide-react';
import { useBranch } from '@/contexts/branch';
import { SchedulePicker } from '@/components/schedule-picker';
import { Modal } from '@/components/ui/modal';
import { groupService } from '@/services/group.service';
import { enrollmentService } from '@/services/enrollment.service';
import {
  buildScheduleLabel,
  isScheduleComplete,
  parseScheduleLabel,
} from '@/lib/schedule';
import type { CreateGroupForm, Group } from '@/types';

const initialForm: CreateGroupForm = {
  branch_id: '',
  name: '',
  schedule: '',
};

const initialSchedule = {
  days: [] as number[],
  startTime: '17:00',
  endTime: '',
};

export function GroupsPage() {
  const { branches, selectedBranchId } = useBranch();
  const [groups, setGroups] = useState<Group[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<CreateGroupForm>(initialForm);
  const [scheduleDays, setScheduleDays] = useState<number[]>(initialSchedule.days);
  const [startTime, setStartTime] = useState(initialSchedule.startTime);
  const [endTime, setEndTime] = useState(initialSchedule.endTime);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editFormData, setEditFormData] = useState<CreateGroupForm>(initialForm);
  const [editScheduleDays, setEditScheduleDays] = useState<number[]>(initialSchedule.days);
  const [editStartTime, setEditStartTime] = useState(initialSchedule.startTime);
  const [editEndTime, setEditEndTime] = useState(initialSchedule.endTime);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [groupNameError, setGroupNameError] = useState<string | null>(null);

  // Detail modal state
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [detailStudents, setDetailStudents] = useState<Array<{ enrollment: any; student: any }>>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Confirm modal states
  const [confirmDeleteGroupOpen, setConfirmDeleteGroupOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((branch) => [branch.id, branch.name])),
    [branches]
  );

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const data = await groupService.list(selectedBranchId || undefined);
      setGroups(data);

      const counts = await Promise.all(
        data.map(async (group) => [group.id, await groupService.getStudentCount(group.id)] as const)
      );
      setStudentCounts(Object.fromEntries(counts));
    } catch (error) {
      console.error('Error loading groups:', error);
      setMessage('No se pudieron cargar los grupos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [selectedBranchId]);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      branch_id: selectedBranchId || branches[0]?.id || '',
    }));
  }, [branches, selectedBranchId]);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      schedule: buildScheduleLabel(scheduleDays, startTime, endTime || undefined),
    }));
  }, [scheduleDays, startTime, endTime]);

  const resetSchedule = () => {
    setScheduleDays(initialSchedule.days);
    setStartTime(initialSchedule.startTime);
    setEndTime(initialSchedule.endTime);
  };

  const validateGroup = (): boolean => {
    const name = formData.name.trim();
    if (!name) {
      setGroupNameError('El nombre del grupo es obligatorio.');
      return false;
    }
    const duplicate = groups.find(
      (g) =>
        g.name.trim().toLowerCase() === name.toLowerCase() &&
        g.branch_id === formData.branch_id
    );
    if (duplicate) {
      setGroupNameError(`Ya existe un grupo con el nombre "${duplicate.name}" en esta sucursal.`);
      return false;
    }
    setGroupNameError(null);
    return true;
  };

  const validateSchedule = (days: number[], start: string, end: string) => {
    if (!isScheduleComplete(days, start)) {
      setMessage('Selecciona al menos un día y la hora de inicio.');
      return false;
    }
    if (end && end <= start) {
      setMessage('La hora de fin debe ser posterior a la hora de inicio.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateGroup()) return;
    if (!validateSchedule(scheduleDays, startTime, endTime)) return;

    setIsLoading(true);
    try {
      await groupService.create({
        ...formData,
        schedule: buildScheduleLabel(scheduleDays, startTime, endTime || undefined),
      });
      setFormData({ ...initialForm, branch_id: selectedBranchId || branches[0]?.id || '' });
      resetSchedule();
      setGroupNameError(null);
      setMessage('Grupo agregado correctamente.');
      await loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      setMessage('No se pudo crear el grupo. Revisa los datos e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (group: Group) => {
    const parsed = parseScheduleLabel(group.schedule);
    setEditingGroup(group);
    setEditFormData({
      branch_id: group.branch_id,
      name: group.name,
      schedule: group.schedule,
    });
    setEditScheduleDays(parsed.days);
    setEditStartTime(parsed.startTime);
    setEditEndTime(parsed.endTime);
    setMessage(null);
  };

  const closeEditModal = () => {
    setEditingGroup(null);
    setEditFormData(initialForm);
    setEditScheduleDays(initialSchedule.days);
    setEditStartTime(initialSchedule.startTime);
    setEditEndTime(initialSchedule.endTime);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingGroup) return;
    if (!validateSchedule(editScheduleDays, editStartTime, editEndTime)) return;

    setIsLoading(true);
    try {
      await groupService.update(editingGroup.id, {
        branch_id: editFormData.branch_id,
        name: editFormData.name,
        schedule: buildScheduleLabel(editScheduleDays, editStartTime, editEndTime || undefined),
      });
      closeEditModal();
      setMessage('Grupo actualizado correctamente.');
      await loadGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      setMessage('No se pudo actualizar el grupo.');
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteGroupConfirm = (group: Group) => {
    const count = studentCounts[group.id] || 0;
    if (count > 0) {
      setMessage('No puedes eliminar un grupo con estudiantes inscritos.');
      return;
    }
    setGroupToDelete(group);
    setConfirmDeleteGroupOpen(true);
  };

  const closeDeleteGroupConfirm = () => {
    setConfirmDeleteGroupOpen(false);
    setGroupToDelete(null);
  };

  const handleDeleteGroupConfirm = async () => {
    if (!groupToDelete) return;

    setIsLoading(true);
    try {
      await groupService.delete(groupToDelete.id);
      if (editingGroup?.id === groupToDelete.id) closeEditModal();
      setMessage('Grupo eliminado correctamente.');
      await loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      setMessage('No se pudo eliminar el grupo.');
    } finally {
      setIsLoading(false);
      closeDeleteGroupConfirm();
    }
  };

  const filteredGroups = groups.filter((group) =>
    `${group.name} ${group.schedule} ${branchNameById[group.branch_id] || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const openDetailModal = async (group: Group) => {
    setDetailGroup(group);
    setDetailStudents([]);
    setIsDetailLoading(true);
    try {
      const data = await enrollmentService.getStudentsForGroup(group.id);
      setDetailStudents(data);
    } catch (error) {
      console.error('Error loading group students:', error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailGroup(null);
    setDetailStudents([]);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Grupos</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Organiza horarios, sucursales y cupos activos.</p>
            </div>
          </div>

          <label className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar grupo u horario"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
            />
          </label>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px] items-start">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Cargando grupos...
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No se encontraron grupos.
              </div>
            ) : (
              filteredGroups.map((group) => (
                <article
                  key={group.id}
                  onClick={() => openDetailModal(group)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-fuchsia-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-fuchsia-700"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900 dark:text-slate-50">{group.name}</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{branchNameById[group.branch_id] || 'Sucursal'}</p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(group)}
                        disabled={isLoading}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                        title="Editar grupo"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteGroupConfirm(group)}
                        disabled={isLoading}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Eliminar grupo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    {(() => {
                      const { days, time } = (() => {
                        if (!group.schedule) return { days: '', time: '' };
                        if (group.schedule.includes('·')) {
                          const [d, t] = group.schedule.split('·');
                          return { days: d.trim(), time: t.trim() };
                        }
                        if (group.schedule.includes(' a las ')) {
                          const [d, t] = group.schedule.split(' a las ');
                          return { days: d.trim(), time: `a las ${t.trim()}` };
                        }
                        return { days: group.schedule.trim(), time: '' };
                      })();

                      return (
                        <>
                          <div className="flex items-start gap-2">
                            <Calendar size={17} className="mt-0.5 shrink-0" />
                            <span className="font-medium text-slate-900 dark:text-slate-100">{days}</span>
                          </div>
                          {time && (
                            <div className="flex items-center gap-2">
                              <Clock size={17} className="shrink-0" />
                              <span>{time}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <p className="flex items-center gap-2"><Users size={17} />{studentCounts[group.id] || 0} estudiantes</p>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Nuevo grupo</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Define sucursal y horario.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Sucursal
                <div className="relative mt-2">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={formData.branch_id}
                    onChange={(event) => setFormData((current) => ({ ...current, branch_id: event.target.value }))}
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
                Nombre del grupo
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => {
                    setFormData((current) => ({ ...current, name: event.target.value }));
                    if (groupNameError) setGroupNameError(null);
                  }}
                  required
                  placeholder="Ej: Grupo Infantil, Grupo 67..."
                  className={`mt-2 w-full rounded-xl border px-3 py-2 text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900 ${
                    groupNameError
                      ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                      : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                  }`}
                />
                {groupNameError && (
                  <p className="mt-1 text-xs text-red-500">{groupNameError}</p>
                )}
              </label>

              <div className="block text-sm text-slate-700 dark:text-slate-300">
                Horario
                <div className="mt-2">
                  <SchedulePicker
                    days={scheduleDays}
                    startTime={startTime}
                    endTime={endTime}
                    onDaysChange={setScheduleDays}
                    onStartTimeChange={setStartTime}
                    onEndTimeChange={setEndTime}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isScheduleComplete(scheduleDays, startTime)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                {isLoading ? 'Guardando...' : 'Agregar grupo'}
              </button>
            </form>
          </section>
        </div>
      </div>

      <Modal
        isOpen={Boolean(editingGroup)}
        onClose={closeEditModal}
        title="Editar grupo"
        footer={
          <>
            <button
              type="button"
              onClick={closeEditModal}
              disabled={isLoading}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="edit-group-form"
              disabled={isLoading || !isScheduleComplete(editScheduleDays, editStartTime)}
              className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        <form id="edit-group-form" className="space-y-4" onSubmit={handleEditSubmit}>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Sucursal
            <div className="relative mt-2">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={editFormData.branch_id}
                onChange={(event) => setEditFormData((current) => ({ ...current, branch_id: event.target.value }))}
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
            Nombre del grupo
            <input
              type="text"
              value={editFormData.name}
              onChange={(event) => setEditFormData((current) => ({ ...current, name: event.target.value }))}
              required
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <div className="block text-sm text-slate-700 dark:text-slate-300">
            Horario
            <div className="mt-2">
              <SchedulePicker
                days={editScheduleDays}
                startTime={editStartTime}
                endTime={editEndTime}
                onDaysChange={setEditScheduleDays}
                onStartTimeChange={setEditStartTime}
                onEndTimeChange={setEditEndTime}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Group detail modal: students list */}
      <Modal
        isOpen={Boolean(detailGroup)}
        onClose={closeDetailModal}
        title={detailGroup?.name ?? ''}
        footer={
          <button
            type="button"
            onClick={closeDetailModal}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cerrar
          </button>
        }
      >
        {/* Group meta */}
        {detailGroup && (
          <div className="mb-5 flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers size={15} className="text-fuchsia-500" />
              {branchNameById[detailGroup.branch_id] || 'Sucursal'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={15} className="text-fuchsia-500" />
              {detailGroup.schedule.split('·')[0]?.trim()}
            </span>
            {detailGroup.schedule.includes('·') && (
              <span className="flex items-center gap-1.5">
                <Clock size={15} className="text-fuchsia-500" />
                {detailGroup.schedule.split('·')[1]?.trim()}
              </span>
            )}
          </div>
        )}

        {/* Students list */}
        {isDetailLoading ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Cargando estudiantes...
          </div>
        ) : detailStudents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-slate-400 dark:text-slate-500">
            <Users size={36} className="opacity-40" />
            <p className="text-sm">Este grupo no tiene estudiantes inscritos.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {detailStudents.map(({ enrollment, student }) => (
              <li key={enrollment.id} className="flex items-center gap-4 py-3">
                {/* Avatar */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-bold text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300">
                  {student?.full_name?.[0]?.toUpperCase() ?? <UserRound size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-50">
                    {student?.full_name ?? 'Estudiante'}
                  </p>
                  {student?.document_number && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{student.document_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Bs. {enrollment.monthly_fee.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400">mensualidad</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Confirm delete group modal */}
      <Modal
        isOpen={confirmDeleteGroupOpen}
        onClose={closeDeleteGroupConfirm}
        title="Eliminar grupo"
        footer={
          <>
            <button
              type="button"
              onClick={closeDeleteGroupConfirm}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteGroupConfirm}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              {isLoading ? 'Eliminando...' : 'Eliminar'}
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
              ¿Estás seguro de que deseas eliminar el grupo <strong className="text-slate-900 dark:text-slate-100">{groupToDelete?.name}</strong>?
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer.</p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
