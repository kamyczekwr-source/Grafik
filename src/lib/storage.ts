import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Employee, MonthSchedule } from '../types';

const EMPLOYEES_COLLECTION = 'employees';
const SCHEDULES_COLLECTION = 'schedules';
const SETTINGS_COLLECTION = 'settings';
const PERIOD_DOC = 'period';
const NORMS_DOC = 'norms';

export interface PeriodSettings {
  year: number;
  month: number; // pierwszy miesiąc bieżącego 3-miesięcznego okresu rozliczeniowego
}

export interface NormSettings {
  mode: 'auto' | 'manual';
  /** Ręcznie wpisane godziny dla pełnego etatu, klucz "YYYY-MM". */
  manualHours: Record<string, number>;
}

export async function loadPeriodSettings(): Promise<PeriodSettings | null> {
  const snap = await getDoc(doc(db, SETTINGS_COLLECTION, PERIOD_DOC));
  if (!snap.exists()) return null;
  return snap.data() as PeriodSettings;
}

export async function savePeriodSettings(settings: PeriodSettings): Promise<void> {
  await setDoc(doc(db, SETTINGS_COLLECTION, PERIOD_DOC), settings);
}

export async function loadNormSettings(): Promise<NormSettings> {
  const snap = await getDoc(doc(db, SETTINGS_COLLECTION, NORMS_DOC));
  if (!snap.exists()) return { mode: 'auto', manualHours: {} };
  return snap.data() as NormSettings;
}

export async function saveNormSettings(settings: NormSettings): Promise<void> {
  await setDoc(doc(db, SETTINGS_COLLECTION, NORMS_DOC), settings);
}

function scheduleId(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function loadEmployees(): Promise<Employee[]> {
  const snap = await getDocs(collection(db, EMPLOYEES_COLLECTION));
  return snap.docs.map((d) => d.data() as Employee);
}

export async function saveEmployee(emp: Employee): Promise<void> {
  await setDoc(doc(db, EMPLOYEES_COLLECTION, emp.id), emp);
}

export async function loadSchedule(year: number, month: number): Promise<MonthSchedule | null> {
  const snap = await getDoc(doc(db, SCHEDULES_COLLECTION, scheduleId(year, month)));
  if (!snap.exists()) return null;
  return snap.data() as MonthSchedule;
}

export async function saveSchedule(schedule: MonthSchedule): Promise<void> {
  await setDoc(doc(db, SCHEDULES_COLLECTION, scheduleId(schedule.year, schedule.month)), schedule);
}

/** Wczytuje wszystkie miesiące danego 3-miesięcznego okresu rozliczeniowego (do bilansu godzin).
 *  Obsługuje przejście przez przełom roku (np. start w listopadzie -> listopad, grudzień, styczeń). */
export async function loadQuarter(year: number, startMonth: number): Promise<MonthSchedule[]> {
  const months: MonthSchedule[] = [];
  for (let i = 0; i < 3; i++) {
    let m = startMonth + i;
    let y = year;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    const s = await loadSchedule(y, m);
    months.push(s ?? { year: y, month: m, entries: [], specialStaffing: {} });
  }
  return months;
}
