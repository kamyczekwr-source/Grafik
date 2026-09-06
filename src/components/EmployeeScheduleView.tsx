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
      <button onClick={onBack} style={{ marginBottom: 14, fontSize: 12 }}>
        ← Wróć do listy pracowników
      </button>
      <h2 style={{ fontSize: 19, fontWeight: 600 }}>
        {employee.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {schedule.month}/{schedule.year}</span>
      </h2>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginTop: 4,
          marginBottom: 14,
        }}
      >
        Suma: <strong style={{ color: worked > norm ? 'var(--danger-text)' : 'var(--text)' }}>{worked}h</strong> / {norm}h ·{' '}
        {employee.etat === 1 ? 'pełny etat' : `${employee.etat} etatu`}
      </div>
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          background: 'var(--surface)',
          overflow: 'hidden',
          maxWidth: 340,
        }}
      >
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
          <tbody>
            {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
              const dateStr = `${schedule.year}-${String(schedule.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const free = isFreeDay(dateStr, holidays);
              const entry = schedule.entries.find((e) => e.date === dateStr && e.employeeId === employee.id);
              return (
                <tr key={d} style={{ borderTop: '1px solid var(--border)', background: free ? 'var(--warning-bg)' : 'transparent' }}>
                  <td style={{ padding: '6px 12px', width: 32, color: 'var(--text-muted)' }}>{d}</td>
                  <td style={{ padding: '6px 12px', fontWeight: entry ? 600 : 400, color: entry ? 'var(--text)' : 'var(--text-faint)' }}>
                    {entry?.code ?? (free ? '—' : 'W')}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{entry ? '8h' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
