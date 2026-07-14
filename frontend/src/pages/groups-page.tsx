import { useEffect, useMemo, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Building2, Clock, Funnel, Layers, MapPin, MoreVertical, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useBranch } from '@/contexts/branch';
import { SchedulePicker } from '@/components/schedule-picker';
import { Modal } from '@/components/ui/modal';
import { ToastContainer } from '@/components/ui/toast';
import { groupService } from '@/services/group.service';
import {
  buildScheduleLabel,
  isScheduleComplete,
  parseScheduleLabel,
} from '@/lib/schedule';
import type { CreateGroupForm, Group, Notification } from '@/types';
import { cn } from '@/lib/utils';

const LEVELS = [
  { value: '', label: 'Selecciona un nivel' },
  { value: 'Principiante', label: 'Principiante' },
  { value: 'Intermedio', label: 'Intermedio' },
  { value: 'Avanzado', label: 'Avanzado' },
  { value: 'Todos los niveles', label: 'Todos los niveles' },
];

const initialForm: CreateGroupForm = {
  branch_id: '',
  name: '',
  schedule: '',
  instructor: '',
  capacity: 20,
  level: '',
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
  const [levelFilter, setLevelFilter] = useState<'all' | 'Principiante' | 'Intermedio' | 'Avanzado' | 'Todos los niveles'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [groupNameError, setGroupNameError] = useState<string | null>(null);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, message, duration: 4000 }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Confirm modal states
  const [confirmDeleteGroupOpen, setConfirmDeleteGroupOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  // 3-dots menu state
  const [openMenuGroupId, setOpenMenuGroupId] = useState<string | null>(null);

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
      addNotification('error', 'No se pudieron cargar los grupos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [selectedBranchId]);

  // Close dots menu when clicking outside
  useEffect(() => {
    if (!openMenuGroupId) return;
    const handleClick = () => setOpenMenuGroupId(null);
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick, { once: true });
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [openMenuGroupId]);

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
    if (!formData.branch_id) {
      addNotification('warning', 'Selecciona una sucursal.');
      return false;
    }
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
      addNotification('warning', 'Selecciona al menos un día y la hora de inicio.');
      return false;
    }
    if (end && end <= start) {
      addNotification('warning', 'La hora de fin debe ser posterior a la hora de inicio.');
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
      addNotification('success', 'Grupo agregado correctamente.');
      await loadGroups();
    } catch (error: any) {
      console.error('Error creating group:', error);
      addNotification('error', error?.message || 'No se pudo crear el grupo. Revisa los datos e intenta nuevamente.');
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
      instructor: group.instructor || '',
      capacity: group.capacity || 20,
      level: group.level || '',
    });
    setEditScheduleDays(parsed.days);
    setEditStartTime(parsed.startTime);
    setEditEndTime(parsed.endTime);
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
        instructor: editFormData.instructor,
        capacity: editFormData.capacity,
        level: editFormData.level,
      });
      closeEditModal();
      addNotification('success', 'Grupo actualizado correctamente.');
      await loadGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      addNotification('error', 'No se pudo actualizar el grupo.');
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteGroupConfirm = (group: Group) => {
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
      addNotification('success', 'Grupo eliminado correctamente.');
      await loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      addNotification('error', 'No se pudo eliminar el grupo.');
    } finally {
      setIsLoading(false);
      closeDeleteGroupConfirm();
    }
  };

  const filteredGroups = groups.filter((group) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = `${group.name} ${group.schedule} ${branchNameById[group.branch_id] || ''} ${group.instructor || ''} ${group.level || ''}`
      .toLowerCase()
      .includes(q);
    if (!matchesSearch) return false;
    if (levelFilter === 'all') return true;
    return group.level === levelFilter;
  });

  const getLevelBadgeColor = (level?: string | null) => {
    switch (level?.toLowerCase()) {
      case 'principiante':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'intermedio':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'avanzado':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Grupos</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">Organiza horarios, instructores y cupos activos.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px] items-start">
          {/* Cards grid */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="relative block w-full md:max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar grupo, instructor o nivel..."
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
                  {levelFilter !== 'all' && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-fuchsia-100 text-xs font-bold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">1</span>
                  )}
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <p className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Nivel</p>
                    {[
                      { value: 'all' as const, label: 'Todos' },
                      { value: 'Principiante' as const, label: 'Principiante' },
                      { value: 'Intermedio' as const, label: 'Intermedio' },
                      { value: 'Avanzado' as const, label: 'Avanzado' },
                      { value: 'Todos los niveles' as const, label: 'Todos los niveles' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setLevelFilter(opt.value); setShowFilterMenu(false); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                          levelFilter === opt.value
                            ? 'bg-fuchsia-50 font-semibold text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-300'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {levelFilter === opt.value && <span className="size-1.5 rounded-full bg-fuchsia-500" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Cargando grupos...
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No se encontraron grupos.
              </div>
            ) : (
              filteredGroups.map((group) => {
                const count = studentCounts[group.id] || 0;
                const capacity = group.capacity || 20;
                const pct = Math.min(100, Math.round((count / capacity) * 100));
                const scheduleParts = group.schedule.split('·');
                const daysPart = scheduleParts[0]?.trim() || '';
                const timePart = scheduleParts[1]?.trim() || '';

                const menuOpen = openMenuGroupId === group.id;

                return (
                  <article
                    key={group.id}
                    className="relative flex flex-col rounded-2xl border border-slate-200 bg-white transition hover:border-fuchsia-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-fuchsia-700 overflow-hidden"
                  >
                    {/* 3-dots menu */}
                    <div className="absolute right-3 top-3 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuGroupId(menuOpen ? null : group.id);
                        }}
                        className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {menuOpen && (
                        <div
                          className={cn(
                            'absolute right-0 top-8 w-40 rounded-xl border shadow-lg',
                            'bg-white dark:bg-slate-800',
                            'border-slate-200 dark:border-slate-700',
                            'z-20 overflow-hidden'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuGroupId(null);
                              openEditModal(group);
                            }}
                            disabled={isLoading}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <div className="border-t border-slate-100 dark:border-slate-700" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuGroupId(null);
                              openDeleteGroupConfirm(group);
                            }}
                            disabled={isLoading}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Header - fondo claro */}
                    <div className="bg-slate-50 p-4 pr-10 dark:bg-slate-700/50">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {group.name}
                      </h2>
                      <div className="mt-2 flex items-center gap-2">
                        {group.level ? (
                          <span
                            className={cn(
                              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                              getLevelBadgeColor(group.level)
                            )}
                          >
                            {group.level}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300">
                            Sin nivel
                          </span>
                        )}
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-500" />
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <MapPin size={11} />
                          {branchNameById[group.branch_id] || 'Sucursal'}
                        </span>
                      </div>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-slate-200 dark:border-slate-700" />

                    {/* Body - fondo oscuro */}
                    <div className="flex-1 bg-slate-900 p-4 text-sm">
                      {/* Instructor */}
                      <div className="mb-3">
                        <p className="text-xs text-slate-400">Instructor</p>
                        <p className="text-base font-bold text-white">
                          {group.instructor || '-'}
                        </p>
                      </div>

                      {/* Horario */}
                      <div className="mb-3 flex items-start gap-2">
                        <Clock size={16} className="mt-0.5 shrink-0 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-400">{daysPart}</p>
                          {timePart && <p className="text-sm font-bold text-white">{timePart}</p>}
                        </div>
                      </div>

                      {/* Estudiantes */}
                      <div className="flex items-start gap-2">
                        <Users size={16} className="mt-0.5 shrink-0 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-400">Estudiantes</p>
                          <p className="text-sm font-bold text-white">
                            {count}/{capacity}
                          </p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                count >= capacity ? 'bg-red-500' :
                                count >= capacity * 0.8 ? 'bg-amber-500' :
                                'bg-emerald-500'
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
            </div>
          </section>

          {/* Create form */}
          <section className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                <Plus size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Nuevo grupo</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Define sucursal, instructor y horario.</p>
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Sucursal
                <div className="relative mt-1.5">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={formData.branch_id}
                    onChange={(event) => setFormData((current) => ({ ...current, branch_id: event.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                  placeholder="Ej: Salsa Principiantes"
                  className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm text-slate-900 outline-none transition dark:text-slate-100 dark:bg-slate-900 ${
                    groupNameError
                      ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20'
                      : 'border-slate-300 bg-slate-50 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30'
                  }`}
                />
                {groupNameError && (
                  <p className="mt-1 text-xs text-red-500">{groupNameError}</p>
                )}
              </label>

              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Instructor
                <input
                  type="text"
                  value={formData.instructor || ''}
                  onChange={(event) => setFormData((current) => ({ ...current, instructor: event.target.value }))}
                  placeholder="Ej: María López"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Capacidad
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.capacity || 20}
                    onChange={(event) => setFormData((current) => ({ ...current, capacity: Number(event.target.value) }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  />
                </label>

                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Nivel
                  <select
                    value={formData.level || ''}
                    onChange={(event) => setFormData((current) => ({ ...current, level: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
                  >
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="block text-sm text-slate-700 dark:text-slate-300">
                Horario
                <div className="mt-1.5">
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                {isLoading ? 'Guardando...' : 'Agregar grupo'}
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* Edit modal */}
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
        <form id="edit-group-form" className="space-y-3" onSubmit={handleEditSubmit}>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Sucursal
            <div className="relative mt-1.5">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={editFormData.branch_id}
                onChange={(event) => setEditFormData((current) => ({ ...current, branch_id: event.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
            />
          </label>

          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Instructor
            <input
              type="text"
              value={editFormData.instructor || ''}
              onChange={(event) => setEditFormData((current) => ({ ...current, instructor: event.target.value }))}
              placeholder="Ej: María López"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Capacidad
              <input
                type="number"
                min={1}
                max={100}
                value={editFormData.capacity || 20}
                onChange={(event) => setEditFormData((current) => ({ ...current, capacity: Number(event.target.value) }))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
              />
            </label>

            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Nivel
              <select
                value={editFormData.level || ''}
                onChange={(event) => setEditFormData((current) => ({ ...current, level: event.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="block text-sm text-slate-700 dark:text-slate-300">
            Horario
            <div className="mt-1.5">
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
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Se eliminarán permanentemente las inscripciones, pagos e historial asociados. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
      </Modal>
      <ToastContainer notifications={notifications} onClose={removeNotification} />
    </div>
  );
}
