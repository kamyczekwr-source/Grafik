import type { Employee, MonthSchedule, ShiftCode, ShiftEntry } from '../types';
import { daysInMonth, monthlyNormHours, validateRestPeriods, SHIFT_HOURS } from './rules';

const SHIFTS: Exclude<ShiftCode, 'W'>[] = ['6-14', '14-22', '22-6'];

/**
 * Heurystyka: dla każdego dnia i każdej wymaganej zmiany (uwzględniając podwójną
 * obsadę) wybiera osobę, która ma najwięcej "zaległości" względem normy godzin
 * narastająco od początku okresu rozliczeniowego, o ile nie łamie to 12h przerwy
 * i dana osoba nie ma już przydzielonej zmiany tego dnia.
 */
export function autoGenerateMonth(
  employees: Employee[],
  year: number,
  month: number,
  priorEntries: ShiftEntry[], // wszystkie zmiany z poprzednich miesięcy okresu rozliczeniowego
  specialStaffing: MonthSchedule['specialStaffing'],
): ShiftEntry[] {
  const priorNorm = new Map<string, number>();
  const priorWorked = new Map<string, number>();
  for (const emp of employees) {
    priorWorked.set(
      emp.id,
      priorEntries.filter((e) => e.employeeId === emp.id && e.code !== 'W').length * SHIFT_HOURS,
    );
  }

  const result: ShiftEntry[] = [];
  const days = daysInMonth(year, month);
  const assignedTodayCount = new Map<string, number>();

  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    assignedTodayCount.clear();

    for (const shift of SHIFTS) {
      const slots = specialStaffing[dateStr]?.[shift] === 2 ? 2 : 1;
      for (let slot = 0; slot < slots; slot++) {
        // Wybierz osobę z największym niedoborem godzin, która nie pracuje dziś
        // i dla której przydział nie złamie 12h przerwy.
        const candidates = employees
          .filter((emp) => !assignedTodayCount.has(emp.id))
          .map((emp) => {
            const norm = priorNorm.get(emp.id) ?? monthlyNormHours(year, month, emp.etat);
            const worked = priorWorked.get(emp.id) ?? 0;
            return { emp, deficit: norm - worked };
          })
          .sort((a, b) => b.deficit - a.deficit);

        for (const cand of candidates) {
          const trial: ShiftEntry = { date: dateStr, employeeId: cand.emp.id, code: shift, slotIndex: slot as 0 | 1 };
          const issues = validateRestPeriods([...priorEntries, ...result, trial]);
          const hasNewIssue = issues.some((i) => i.date === dateStr && i.employeeId === cand.emp.id);
          if (!hasNewIssue) {
            result.push(trial);
            assignedTodayCount.set(cand.emp.id, 1);
            priorWorked.set(cand.emp.id, (priorWorked.get(cand.emp.id) ?? 0) + SHIFT_HOURS);
            break;
          }
        }
      }
    }
  }

  return result;
}
