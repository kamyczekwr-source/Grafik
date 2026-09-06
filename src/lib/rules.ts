import type { Employee, MonthSchedule, ShiftCode, ShiftEntry, ValidationIssue, HourBalance } from '../types';
import { isFreeDay, getPolishHolidays } from './holidays';

export const SHIFT_HOURS = 8;

/** Godzina startu i długość zmiany w godzinach, dla liczenia przerwy między zmianami. */
const SHIFT_START: Record<Exclude<ShiftCode, 'W'>, number> = {
  '6-14': 6,
  '14-22': 14,
  '22-6': 22,
};

function shiftStartEnd(dateStr: string, code: ShiftCode): [Date, Date] | null {
  if (code === 'W') return null;
  const start = new Date(dateStr + 'T00:00:00');
  start.setHours(SHIFT_START[code], 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + SHIFT_HOURS);
  return [start, end];
}

/** Liczba dni kalendarzowych w miesiącu. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Norma godzin w miesiącu wg etatu: (dni robocze w miesiącu) * 8h * etat.
 *  Dni robocze = wszystkie dni minus weekendy i święta. */
export function monthlyNormHours(year: number, month: number, etat: number): number {
  const holidays = getPolishHolidays(year);
  const total = daysInMonth(year, month);
  let workingDays = 0;
  for (let d = 1; d <= total; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!isFreeDay(dateStr, holidays)) workingDays++;
  }
  return workingDays * SHIFT_HOURS * etat;
}

/** Waliduje min. 12h przerwy między kolejnymi zmianami tej samej osoby. */
export function validateRestPeriods(entries: ShiftEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byEmployee = new Map<string, ShiftEntry[]>();
  for (const e of entries) {
    if (e.code === 'W') continue;
    if (!byEmployee.has(e.employeeId)) byEmployee.set(e.employeeId, []);
    byEmployee.get(e.employeeId)!.push(e);
  }
  for (const [employeeId, list] of byEmployee) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const prev = shiftStartEnd(sorted[i - 1].date, sorted[i - 1].code);
      const curr = shiftStartEnd(sorted[i].date, sorted[i].code);
      if (!prev || !curr) continue;
      const restHours = (curr[0].getTime() - prev[1].getTime()) / (1000 * 60 * 60);
      if (restHours < 12 && restHours >= 0) {
        issues.push({
          date: sorted[i].date,
          employeeId,
          type: 'rest',
          message: `Tylko ${restHours}h przerwy przed zmianą ${sorted[i].code} (wymagane min. 12h)`,
        });
      }
    }
  }
  return issues;
}

/** Sumaryczne godziny przepracowane przez daną osobę w miesiącu (uwzględnia podwójną obsadę - to nadal 8h dla tej osoby). */
export function workedHoursForEmployee(entries: ShiftEntry[], employeeId: string): number {
  return entries.filter((e) => e.employeeId === employeeId && e.code !== 'W').length * SHIFT_HOURS;
}

/** Bilans godzin w oparciu o bieżący i poprzednie miesiące okresu rozliczeniowego (3 mies.). */
export function computeQuarterBalance(
  employees: Employee[],
  monthsInPeriod: MonthSchedule[],
): HourBalance[] {
  return employees.map((emp) => {
    let normHours = 0;
    let workedHours = 0;
    for (const m of monthsInPeriod) {
      normHours += monthlyNormHours(m.year, m.month, emp.etat);
      workedHours += workedHoursForEmployee(m.entries, emp.id);
    }
    return { employeeId: emp.id, normHours, workedHours, diff: workedHours - normHours };
  });
}
