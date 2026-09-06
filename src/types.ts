export type ShiftCode = '6-14' | '14-22' | '22-6' | 'W';

export interface Employee {
  id: string;
  name: string;
  /** 1 = pełny etat, 0.75 = 3/4 etatu */
  etat: number;
}

/** Jedna obsadzona zmiana. slotIndex odróżnia dwie osoby w dniu z podwójną obsadą. */
export interface ShiftEntry {
  date: string; // 'YYYY-MM-DD'
  employeeId: string;
  code: ShiftCode;
  slotIndex: 0 | 1;
}

/** Ile slotów (1 lub 2) ma dana zmiana w danym dniu. Domyślnie 1 dla każdej z 3 zmian. */
export type SpecialStaffing = Record<string, Partial<Record<Exclude<ShiftCode, 'W'>, 2>>>;
// klucz = data 'YYYY-MM-DD', wartość = które zmiany tego dnia mają 2 sloty

export interface MonthSchedule {
  year: number;
  month: number; // 1-12
  entries: ShiftEntry[];
  specialStaffing: SpecialStaffing;
}

export interface ValidationIssue {
  date: string;
  employeeId: string;
  type: 'rest' | 'coverage';
  message: string;
}

/** Bilans godzin danej osoby w okresie rozliczeniowym (3 miesiące). */
export interface HourBalance {
  employeeId: string;
  normHours: number;
  workedHours: number;
  diff: number; // workedHours - normHours, dodatnie = nadgodziny
}
