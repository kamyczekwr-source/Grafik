import { Fragment, useMemo, useState } from 'react';
import type { Employee, MonthSchedule, ShiftCode, ShiftEntry, ValidationIssue } from '../types';
import { daysInMonth, validateRestPeriods, workedHoursForEmployee, monthlyNormHours } from '../lib/rules';
import { getPolishHolidays, isFreeDay } from '../lib/holidays';

const SHIFT_OPTIONS: ShiftCode[] = ['6-14', '14-22', '22-6', 'W'];

interface Props {
  employees: Employee[];
  schedule: MonthSchedule;
  onChange: (schedule: MonthSchedule) => void;
  readOnly?: boolean;
}

export function ScheduleTable({ employees, schedule, onChange, readOnly }: Props) {
  const [editing, setEditing] = useState<{ date: string; employeeId: string; slot: 0 | 1 } | null>(null);
  const holidays = useMemo(() => getPolishHolidays(schedule.year), [schedule.year]);
  const days = daysInMonth(schedule.year, schedule.month);
  const issues = useMemo(() => validateRestPeriods(schedule.entries), [schedule.entries]);

  const issueKey = (date: string, employeeId: string) =>
    issues.find((i: ValidationIssue) => i.date === date && i.employeeId === employeeId);

  const entryFor = (date: string, employeeId: string, slot: 0 | 1) =>
    schedule.entries.find((e) => e.date === date && e.employeeId === employeeId && e.slotIndex === slot);

  function setShift(date: string, employeeId: string, slot: 0 | 1, code: ShiftCode) {
    const others = schedule.entries.filter(
      (e) => !(e.date === date && e.employeeId === employeeId && e.slotIndex === slot),
    );
    const next: ShiftEntry[] = code === 'W' ? others : [...others, { date, employeeId, code, slotIndex: slot }];
    onChange({ ...schedule, entries: next });
    setEditing(null);
  }

  function toggleDoubleStaffing(date: string, code: Exclude<ShiftCode, 'W'>) {
    const dayFlags = { ...(schedule.specialStaffing[date] ?? {}) };
    if (dayFlags[code] === 2) delete dayFlags[code];
    else dayFlags[code] = 2;
    onChange({ ...schedule, specialStaffing: { ...schedule.specialStaffing, [date]: dayFlags } });
  }

  function isDoubleStaffed(date: string, code: ShiftCode) {
    return code !== 'W' && schedule.specialStaffing[date]?.[code] === 2;
  }

  return (
    <div>
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          background: 'var(--surface)',
        }}
      >
        <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: employees.length * 130, width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--surface-muted)' }}>
              {employees.map((emp) => (
                <th
                  key={emp.id}
                  colSpan={3}
                  style={{
                    padding: '9px 6px',
                    fontWeight: 600,
                    fontSize: 12.5,
                    borderLeft: '1px solid var(--border)',
                    color: 'var(--text)',
                    letterSpacing: 0.2,
                  }}
                >
                  {emp.name}
                  {emp.etat !== 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> {emp.etat}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: days }, (_, idx) => idx + 1).map((d) => {
              const dateStr = `${schedule.year}-${String(schedule.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const free = isFreeDay(dateStr, holidays);
              return (
                <tr key={d} style={{ borderTop: '1px solid var(--border)', background: free ? 'var(--warning-bg)' : 'transparent' }}>
                  {employees.map((emp) => {
                    const entry = entryFor(dateStr, emp.id, 0);
                    const issue = entry ? issueKey(dateStr, emp.id) : undefined;
                    const isEditing = editing?.date === dateStr && editing.employeeId === emp.id && editing.slot === 0;
                    return (
                      <Fragment key={emp.id}>
                        <td
                          key={emp.id + '-n'}
                          style={{
                            padding: '5px 3px',
                            fontWeight: 500,
                            color: 'var(--text-muted)',
                            borderLeft: '1px solid var(--border)',
                            width: 16,
                          }}
                        >
                          {d}
                        </td>
                        <td
                          key={emp.id + '-s'}
                          onClick={() => !readOnly && setEditing({ date: dateStr, employeeId: emp.id, slot: 0 })}
                          style={{
                            padding: '5px 3px',
                            textAlign: 'center',
                            cursor: readOnly ? 'default' : 'pointer',
                            minWidth: 46,
                            fontWeight: 500,
                            color: 'var(--text)',
                            background: issue ? 'var(--danger-bg)' : undefined,
                            borderRadius: issue ? 'var(--radius-sm)' : undefined,
                          }}
                          title={issue?.message}
                        >
                          {isEditing ? (
                            <select
                              autoFocus
                              defaultValue={entry?.code ?? 'W'}
                              onBlur={() => setEditing(null)}
                              onChange={(e) => setShift(dateStr, emp.id, 0, e.target.value as ShiftCode)}
                              style={{ fontSize: 11, padding: '2px 4px' }}
                            >
                              {SHIFT_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              {entry?.code ?? <span style={{ color: 'var(--text-faint)' }}>·</span>}
                              {entry && entry.code !== 'W' && (
                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    toggleDoubleStaffing(dateStr, entry.code as Exclude<ShiftCode, 'W'>);
                                  }}
                                  title="Podwójna obsada tej zmiany"
                                  style={{
                                    marginLeft: 3,
                                    fontSize: 9,
                                    fontWeight: 600,
                                    padding: '1px 4px',
                                    border: 'none',
                                    background: isDoubleStaffed(dateStr, entry.code) ? 'var(--accent)' : 'var(--surface-muted)',
                                    color: isDoubleStaffed(dateStr, entry.code) ? '#fff' : 'var(--text-faint)',
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                  }}
                                >
                                  x2
                                </button>
                              )}
                            </>
                          )}
                        </td>
                        <td
                          key={emp.id + '-h'}
                          style={{ padding: '5px 3px', textAlign: 'center', color: 'var(--text-faint)', width: 14 }}
                        >
                          {entry ? 8 : ''}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(110px, 1fr))`, gap: 8, marginTop: 14 }}>
        {employees.map((emp) => {
          const worked = workedHoursForEmployee(schedule.entries, emp.id);
          const norm = monthlyNormHours(schedule.year, schedule.month, emp.etat);
          const over = worked > norm;
          return (
            <div
              key={emp.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.name}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: over ? 'var(--danger-text)' : 'var(--text)' }}>
                {worked} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>/ {norm}h</span>
              </div>
            </div>
          );
        })}
      </div>

      {issues.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger-text)' }}>
          {issues.length} problem(y) z zachowaniem 12h przerwy między zmianami.
        </div>
      )}
    </div>
  );
}
