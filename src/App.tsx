import { useEffect, useState } from 'react';
import type { Employee, MonthSchedule, ShiftEntry } from './types';
import { ScheduleTable } from './components/ScheduleTable';
import { LoginScreen } from './components/LoginScreen';
import { AiGeneratePanel } from './components/AiGeneratePanel';
import { EmployeeList } from './components/EmployeeList';
import { EmployeeScheduleView } from './components/EmployeeScheduleView';
import { autoGenerateMonth } from './lib/autoGenerate';
import { computeQuarterBalance } from './lib/rules';
import { loadEmployees, loadQuarter, saveEmployee, saveSchedule } from './lib/storage';
import { watchAuth, logout } from './lib/auth';
import type { User } from 'firebase/auth';

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'forysiak', name: 'I. Forysiak', etat: 1 },
  { id: 'fokt', name: 'I. Fokt', etat: 1 },
  { id: 'markiewicz', name: 'B. Markiewicz', etat: 1 },
  { id: 'trzaska', name: 'Z. Trzaska', etat: 1 },
  { id: 'moskwa', name: 'E. Moskwa', etat: 0.75 },
];

// Pierwszy miesiąc bieżącego 3-miesięcznego okresu rozliczeniowego (dostosuj do swojego harmonogramu).
const PERIOD_START_MONTH = 9;
const YEAR = 2026;
const MAX_HISTORY = 20;

function emptySchedule(year: number, month: number): MonthSchedule {
  return { year, month, entries: [], specialStaffing: {} };
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);
  const [month, setMonth] = useState(PERIOD_START_MONTH);
  const [schedule, setSchedule] = useState<MonthSchedule>(emptySchedule(YEAR, PERIOD_START_MONTH));
  const [priorMonths, setPriorMonths] = useState<MonthSchedule[]>([]);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [view, setView] = useState<'grafik' | 'pracownicy'>('grafik');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ShiftEntry[][]>([]);

  useEffect(() => watchAuth(setUser), []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const emps = await loadEmployees();
        if (emps.length > 0) setEmployees(emps);
        else await Promise.all(DEFAULT_EMPLOYEES.map(saveEmployee));

        const quarter = await loadQuarter(YEAR, PERIOD_START_MONTH);
        const current = quarter.find((m) => m.month === month) ?? emptySchedule(YEAR, month);
        setSchedule(current);
        setPriorMonths(quarter.filter((m) => m.month < month));
        setHistory([]);
      } catch (err) {
        console.error('Nie udało się połączyć z Firebase - uzupełnij konfigurację w src/firebase.ts', err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, user]);

  if (user === undefined) {
    return <p style={{ fontFamily: 'sans-serif', padding: 24 }}>Wczytywanie...</p>;
  }

  if (user === null) {
    return <LoginScreen />;
  }

  async function persist(next: MonthSchedule) {
    setSchedule(next);
    try {
      await saveSchedule(next);
    } catch (err) {
      console.error('Zapis do Firebase nie powiódł się', err);
    }
  }

  /** Każda zmiana grafiku (auto, AI, wyczyszczenie) przechodzi przez to - zapisuje poprzedni stan do historii cofania. */
  function applyEntries(nextEntries: ShiftEntry[]) {
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), schedule.entries]);
    persist({ ...schedule, entries: nextEntries });
  }

  function handleTableChange(next: MonthSchedule) {
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), schedule.entries]);
    persist(next);
  }

  function handleUndo() {
    if (history.length === 0) return;
    const prevEntries = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    persist({ ...schedule, entries: prevEntries });
  }

  function handleClear() {
    if (!window.confirm('Na pewno wyczyścić cały grafik tego miesiąca? Będzie można to cofnąć.')) return;
    applyEntries([]);
  }

  function handleAutoGenerate() {
    const priorEntries = priorMonths.flatMap((m) => m.entries);
    const entries = autoGenerateMonth(employees, YEAR, month, priorEntries, schedule.specialStaffing);
    applyEntries(entries);
  }

  const balances = computeQuarterBalance(employees, [...priorMonths, schedule]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Grafik recepcji</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setView('grafik')} disabled={view === 'grafik'}>
            Grafik
          </button>
          <button
            onClick={() => {
              setView('pracownicy');
              setSelectedEmployee(null);
            }}
            disabled={view === 'pracownicy'}
          >
            Pracownicy
          </button>
          <button onClick={() => logout()}>Wyloguj</button>
        </div>
      </div>

      {loading ? (
        <p>Wczytywanie...</p>
      ) : view === 'pracownicy' ? (
        selectedEmployee ? (
          <EmployeeScheduleView employee={selectedEmployee} schedule={schedule} onBack={() => setSelectedEmployee(null)} />
        ) : (
          <EmployeeList employees={employees} onSelect={setSelectedEmployee} />
        )
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {[0, 1, 2].map((i) => {
                const m = PERIOD_START_MONTH + i;
                return (
                  <option key={m} value={m}>
                    {m}/{YEAR}
                  </option>
                );
              })}
            </select>
            <button onClick={() => setMode('manual')} disabled={mode === 'manual'}>
              Ręczny
            </button>
            <button onClick={() => setMode('auto')} disabled={mode === 'auto'}>
              Auto
            </button>
            <span style={{ borderLeft: '1px solid #ddd', height: 20 }} />
            <button onClick={handleUndo} disabled={history.length === 0}>
              Cofnij
            </button>
            <button onClick={handleClear} disabled={schedule.entries.length === 0}>
              Wyczyść grafik
            </button>
          </div>

          <AiGeneratePanel employees={employees} schedule={schedule} onGenerated={applyEntries} />

          {mode === 'auto' && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={handleAutoGenerate}>Wygeneruj grafik automatycznie (algorytm)</button>
              <p style={{ fontSize: 13, color: '#888' }}>
                Algorytm respektuje 12h przerwy, podwójną obsadę i stara się wyrównać godziny względem normy
                narastająco w okresie rozliczeniowym. Wynik możesz poprawić ręcznie.
              </p>
            </div>
          )}

          <ScheduleTable employees={employees} schedule={schedule} onChange={handleTableChange} />

          <h2 style={{ fontSize: 15, fontWeight: 500, marginTop: 24 }}>Bilans okresu rozliczeniowego</h2>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${employees.length}, 1fr)`, gap: 8, marginTop: 8 }}>
            {balances.map((b) => {
              const emp = employees.find((e) => e.id === b.employeeId)!;
              return (
                <div key={b.employeeId} style={{ background: '#f4f3ee', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>{emp.name}</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>
                    {b.workedHours}h / {b.normHours}h
                  </div>
                  <div style={{ fontSize: 12, color: b.diff > 0 ? '#a32d2d' : b.diff < 0 ? '#185fa5' : '#888' }}>
                    {b.diff > 0 ? `+${b.diff}h nadgodzin` : b.diff < 0 ? `${b.diff}h niedoboru` : 'zbilansowano'}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
