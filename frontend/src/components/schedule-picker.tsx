import { CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WEEKDAYS, buildScheduleLabel } from '@/lib/schedule';

interface SchedulePickerProps {
  days: number[];
  startTime: string;
  endTime: string;
  onDaysChange: (days: number[]) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export function SchedulePicker({
  days,
  startTime,
  endTime,
  onDaysChange,
  onStartTimeChange,
  onEndTimeChange,
}: SchedulePickerProps) {
  const toggleDay = (dayId: number) => {
    if (days.includes(dayId)) {
      onDaysChange(days.filter((id) => id !== dayId));
      return;
    }
    onDaysChange([...days, dayId]);
  };

  const preview = buildScheduleLabel(days, startTime, endTime || undefined);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <CalendarDays size={17} className="text-fuchsia-500" />
          Días de clase
        </p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => {
              const isSelected = days.includes(day.id);

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  title={day.label}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center rounded-xl text-[11px] font-semibold leading-tight transition-all',
                    isSelected
                      ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30 ring-2 ring-fuchsia-300 dark:ring-fuchsia-700'
                      : 'bg-white text-slate-600 hover:bg-fuchsia-50 hover:text-fuchsia-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-fuchsia-950/40 dark:hover:text-fuchsia-300'
                  )}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            Toca los días en los que tiene clase el grupo
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Clock size={17} className="text-fuchsia-500" />
          Horario
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-500 dark:text-slate-400">
            Hora de inicio
            <div className="relative mt-1.5">
              <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="time"
                value={startTime}
                onChange={(event) => onStartTimeChange(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
              />
            </div>
          </label>

          <label className="block text-xs text-slate-500 dark:text-slate-400">
            Hora de fin
            <span className="ml-1 text-slate-400">(opcional)</span>
            <div className="relative mt-1.5">
              <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="time"
                value={endTime}
                min={startTime || undefined}
                onChange={(event) => onEndTimeChange(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-fuchsia-400 dark:focus:ring-fuchsia-900/30"
              />
            </div>
          </label>
        </div>
      </div>

      {preview && (
        <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fuchsia-600 dark:text-fuchsia-300">
            Vista previa
          </p>
          <p className="mt-1 text-sm font-medium text-fuchsia-900 dark:text-fuchsia-100">{preview}</p>
        </div>
      )}
    </div>
  );
}
