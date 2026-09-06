import { useMemo } from 'react';
import type { Employee, MonthSchedule } from '../types';
import { daysInMonth, workedHoursForEmployee, monthlyNormHours } from '../lib/rules';
import { getPolishHolidays, isFreeDay } from '../lib/holidays';

interface Props {
  employee: Employee;
  schedule: MonthSchedule;
  onBack: () => void;
}

export function EmployeeScheduleView({ employee, schedule, onBack }: Props) {
  const holidays = useMemo(() => getPolishHolidays(schedule.year), [schedule.year]);
  const days = daysInMonth(schedule.year, schedule.month);
  const worked = workedHoursForEmployee(schedule.entries, employee.id);
  const norm = monthlyNormHours(schedule.year, schedule.month, employee.etat);

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 12 }}>
        ← Wróć do listy pracowników
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 500 }}>
        {employee.name} — {schedule.month}/{schedule.year}
      </h2>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
        Suma: {worked}h / {norm}h ({employee.etat === 1 ? 'pełny etat' : `${employee.etat} etatu`})
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', maxWidth: 320 }}>
        <tbody>
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
            const dateStr = `${schedule.year}-${String(schedule.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const free = isFreeDay(dateStr, holidays);
            const entry = schedule.entries.find((e) => e.date === dateStr && e.employeeId === employee.id);
            return (
              <tr key={d} style={{ borderTop: '1px solid #eee', background: free ? '#fdf3d0' : 'transparent' }}>
                <td style={{ padding: '4px 8px', width: 30, color: '#888' }}>{d}</td>
                <td style={{ padding: '4px 8px' }}>{entry?.code ?? (free ? '' : 'W')}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', color: '#888' }}>{entry ? '8h' : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
