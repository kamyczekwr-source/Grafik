import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Employee, MonthSchedule } from '../types';

const EMPLOYEES_COLLECTION = 'employees';
const SCHEDULES_COLLECTION = 'schedules';

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

/** Wczytuje wszystkie miesiące danego 3-miesięcznego okresu rozliczeniowego (do bilansu godzin). */
export async function loadQuarter(year: number, startMonth: number): Promise<MonthSchedule[]> {
  const months: MonthSchedule[] = [];
  for (let i = 0; i < 3; i++) {
    const m = startMonth + i;
    const s = await loadSchedule(year, m);
    months.push(s ?? { year, month: m, entries: [], specialStaffing: {} });
  }
  return months;
}
