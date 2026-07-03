export interface WeekDay {
  id: number;
  short: string;
  label: string;
}

export const WEEKDAYS: WeekDay[] = [
  { id: 1, short: 'Lun', label: 'Lunes' },
  { id: 2, short: 'Mar', label: 'Martes' },
  { id: 3, short: 'Mié', label: 'Miércoles' },
  { id: 4, short: 'Jue', label: 'Jueves' },
  { id: 5, short: 'Vie', label: 'Viernes' },
  { id: 6, short: 'Sáb', label: 'Sábado' },
  { id: 0, short: 'Dom', label: 'Domingo' },
];

export function formatTimeDisplay(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

export function buildScheduleLabel(days: number[], startTime: string, endTime?: string): string {
  if (days.length === 0 || !startTime) return '';

  const ordered = WEEKDAYS.filter((day) => days.includes(day.id)).map((day) => day.label);

  let daysPart: string;
  if (ordered.length === 1) {
    daysPart = ordered[0];
  } else if (ordered.length === 2) {
    daysPart = `${ordered[0]} y ${ordered[1]}`;
  } else {
    daysPart = `${ordered.slice(0, -1).join(', ')} y ${ordered[ordered.length - 1]}`;
  }

  let timePart = formatTimeDisplay(startTime);
  if (endTime) {
    timePart += ` - ${formatTimeDisplay(endTime)}`;
  }

  return `${daysPart} · ${timePart}`;
}

export function isScheduleComplete(days: number[], startTime: string): boolean {
  return days.length > 0 && Boolean(startTime);
}

export interface ScheduleParts {
  days: number[];
  startTime: string;
  endTime: string;
}

function normalizeTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

export function parseScheduleLabel(schedule: string): ScheduleParts {
  if (!schedule.trim()) {
    return { days: [], startTime: '17:00', endTime: '' };
  }

  const timeRangeMatch = schedule.match(/(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?/);
  const startTime = timeRangeMatch?.[1] ? normalizeTime(timeRangeMatch[1]) : '17:00';
  const endTime = timeRangeMatch?.[2] ? normalizeTime(timeRangeMatch[2]) : '';

  const daysText = schedule.split('·')[0] || schedule;
  const days = WEEKDAYS.filter((day) =>
    daysText.toLowerCase().includes(day.label.toLowerCase())
  ).map((day) => day.id);

  return { days, startTime, endTime };
}
