import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Calendar, Layers, MapPin, Plus, Search, Trash2, Users } from 'lucide-react';
import { useBranch } from '@/contexts/branch';
import { branchService } from '@/services/branch.service';
import { enrollmentService } from '@/services/enrollment.service';
import { groupService } from '@/services/group.service';
import type { Branch } from '@/types';

interface BranchStats {
  groups: number;
  students: number;
}

export function BranchesPage() {
  const { branches, refreshBranches } = useBranch();
  const [branchStats, setBranchStats] = useState<Record<string, BranchStats>>({});
  const [newBranchName, setNewBranchName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStats = async (branchList: Branch[]) => {
    const statsEntries = await Promise.all(
      branchList.map(async (branch) => {
        const [groups, students] = await Promise.all([
          groupService.list(branch.id),
          enrollmentService.getActiveCount(branch.id),
        ]);
        return [branch.id, { groups: groups.length, students }] as const;
      })
    );
    setBranchStats(Object.fromEntries(statsEntries));
  };

  useEffect(() => {
    loadStats(branches);
  }, [branches]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newBranchName.trim();
    if (!name) return;

    setIsLoading(true);
    try {
      await branchService.create(name);
      setNewBranchName('');
      setMessage('Sucursal agregada correctamente.');
      await refreshBranches();
    } catch (error) {
      console.error('Error creating branch:', error);
      setMessage('No se pudo crear la sucursal. Verifica que el nombre no exista ya.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    const stats = branchStats[branch.id];
    if (stats && (stats.groups > 0 || stats.students > 0)) {
      setMessage('No puedes eliminar una sucursal con grupos o estudiantes activos.');
      return;
    }

    if (!window.confirm(`¿Eliminar la sucursal "${branch.name}"?`)) return;

    setIsLoading(true);
    try {
      await branchService.delete(branch.id);
      setMessage('Sucursal eliminada correctamente.');
      await refreshBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      setMessage('No se pudo eliminar la sucursal.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-BO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
              <MapPin size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Sucursales</h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Administra las sedes de la academia y agrega nuevas ubicaciones.
              </p>
            </div>
          </div>

          <label className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar sucursal"
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
          <section className="grid gap-4 sm:grid-cols-2">
            {filteredBranches.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No se encontraron sucursales.
              </div>
            ) : (
              filteredBranches.map((branch) => {
                const stats = branchStats[branch.id] || { groups: 0, students: 0 };

                return (
                  <article
                    key={branch.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h2 className="font-semibold text-slate-900 dark:text-slate-50">{branch.name}</h2>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar size={14} />
                            Desde {formatDate(branch.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(branch)}
                        disabled={isLoading}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Eliminar sucursal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                      <p className="flex items-center gap-2">
                        <Layers size={16} />
                        {stats.groups} {stats.groups === 1 ? 'grupo' : 'grupos'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Users size={16} />
                        {stats.students} {stats.students === 1 ? 'estudiante activo' : 'estudiantes activos'}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Nueva sucursal</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Agrega una sede adicional a la academia.
                </p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Nombre de la sucursal
                <div className="relative mt-2">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(event) => setNewBranchName(event.target.value)}
                    required
                    placeholder="Ej: Norte, Centro..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} />
                {isLoading ? 'Guardando...' : 'Agregar sucursal'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
