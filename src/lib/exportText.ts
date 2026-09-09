import type { Employee, MonthSchedule } from '../types';
import { daysInMonth, workedHoursForEmployee, monthlyNormHours } from './rules';
import { getPolishHolidays, isFreeDay } from './holidays';
import { MONTH_NAMES_PL } from './dates';

const DAY_NAMES_PL = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];

export function scheduleToText(employees: Employee[], schedule: MonthSchedule): string {
  const { year, month } = schedule;
  const days = daysInMonth(year, month);
  const holidays = getPolishHolidays(year);

  const lines: string[] = [];
  lines.push(`Grafik recepcji — ${MONTH_NAMES_PL[month - 1]} ${year}`);
  lines.push('');

  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    const free = isFreeDay(dateStr, holidays);
    const dayEntries = employees
      .map((emp) => {
        const entry = schedule.entries.find((e) => e.date === dateStr && e.employeeId === emp.id);
        return entry ? `${emp.name.split(' ').pop()} ${entry.code}` : null;
      })
      .filter(Boolean);
    const suffix = free ? ' (wolne/święto)' : '';
    lines.push(`${String(d).padStart(2, '0')} (${DAY_NAMES_PL[dow]})${suffix}: ${dayEntries.join(', ') || '—'}`);
  }

  lines.push('');
  lines.push('Suma godzin:');
  for (const emp of employees) {
    const worked = workedHoursForEmployee(schedule.entries, emp.id);
    const norm = monthlyNormHours(year, month, emp.etat);
    lines.push(`  ${emp.name}: ${worked}h / ${norm}h`);
  }

  return lines.join('\n');
}

export function scheduleToMailtoUrl(employees: Employee[], schedule: MonthSchedule): string {
  const subject = `Grafik recepcji — ${MONTH_NAMES_PL[schedule.month - 1]} ${schedule.year}`;
  const body = scheduleToText(employees, schedule);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
