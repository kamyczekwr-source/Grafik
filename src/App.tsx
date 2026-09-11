import { useEffect, useState } from 'react';
import type { Employee, MonthSchedule, ShiftEntry } from './types';
import { ScheduleTable } from './components/ScheduleTable';
import { LoginScreen } from './components/LoginScreen';
import { AiGeneratePanel } from './components/AiGeneratePanel';
import { PhotoImportPanel } from './components/PhotoImportPanel';
import { EmployeeList } from './components/EmployeeList';
import { EmployeeScheduleView } from './components/EmployeeScheduleView';
import { NormSettingsPanel } from './components/NormSettingsPanel';
import { autoGenerateMonth } from './lib/autoGenerate';
import { computeQuarterBalance } from './lib/rules';
import {
  loadEmployees,
  loadQuarter,
  loadSchedule,
  loadPeriodSettings,
  savePeriodSettings,
  loadNormSettings,
  saveNormSettings,
  saveEmployee,
  saveSchedule,
  type NormSettings,
} from './lib/storage';
import { watchAuth, logout } from './lib/auth';
import type { User } from 'firebase/auth';
import { addMonths, ymEqual, ymToIndex, MONTH_NAMES_PL, type YearMonth } from './lib/dates';
import { scheduleToText, scheduleToMailtoUrl } from './lib/exportText';

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'forysiak', name: 'I. Forysiak', etat: 1 },
  { id: 'fokt', name: 'I. Fokt', etat: 1 },
  { id: 'markiewicz', name: 'B. Markiewicz', etat: 1 },
  { id: 'trzaska', name: 'Z. Trzaska', etat: 1 },
  { id: 'moskwa', name: 'E. Moskwa', etat: 0.75 },
];

const DEFAULT_PERIOD_START: YearMonth = { year: 2026, month: 9 };
const MAX_HISTORY = 20;

function emptySchedule(year: number, month: number): MonthSchedule {
  return { year, month, entries: [], specialStaffing: {} };
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);
  const [current, setCurrent] = useState<YearMonth>(DEFAULT_PERIOD_START);
  const [periodStart, setPeriodStart] = useState<YearMonth>(DEFAULT_PERIOD_START);
  const [showPeriodSettings, setShowPeriodSettings] = useState(false);
  const [normSettings, setNormSettings] = useState<NormSettings>({ mode: 'auto', manualHours: {} });
  const [showNormSettings, setShowNormSettings] = useState(false);
  const [schedule, setSchedule] = useState<MonthSchedule>(emptySchedule(DEFAULT_PERIOD_START.year, DEFAULT_PERIOD_START.month));
  const [quarterMonths, setQuarterMonths] = useState<MonthSchedule[]>([]);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [view, setView] = useState<'grafik' | 'pracownicy'>('grafik');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ShiftEntry[][]>([]);

  useEffect(() => watchAuth(setUser), []);

  // Wczytaj pracowników i zapisany początek okresu rozliczeniowego raz po zalogowaniu.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const emps = await loadEmployees();
        if (emps.length > 0) setEmployees(emps);
        else await Promise.all(DEFAULT_EMPLOYEES.map(saveEmployee));

        const savedPeriod = await loadPeriodSettings();
        if (savedPeriod) {
          setPeriodStart(savedPeriod);
          setCurrent(savedPeriod);
        }

        const savedNorms = await loadNormSettings();
        setNormSettings(savedNorms);
      } catch (err) {
        console.error('Nie udało się połączyć z Firebase - uzupełnij konfigurację w src/firebase.ts', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Wczytaj bieżący miesiąc + cały okres rozliczeniowy (do bilansu) za każdym razem, gdy zmienia się wybrany miesiąc lub okres.
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const [currentSchedule, quarter] = await Promise.all([
          loadSchedule(current.year, current.month).then((s) => s ?? emptySchedule(current.year, current.month)),
          loadQuarter(periodStart.year, periodStart.month),
        ]);
        setSchedule(currentSchedule);
        setQuarterMonths(quarter);
        setHistory([]);
      } catch (err) {
        console.error('Błąd wczytywania grafiku', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, current, periodStart]);

  if (user === undefined) {
    return <p style={{ padding: 24 }}>Wczytywanie...</p>;
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

  // Miesiące z okresu rozliczeniowego, ale z podmienionym bieżącym miesiącem na jego świeżą wersję ze stanu (żeby bilans od razu odzwierciedlał edycje).
  const effectiveQuarter = quarterMonths.map((m) => (ymEqual(m, current) ? schedule : m));

  function priorEntriesFor(target: YearMonth): ShiftEntry[] {
    return effectiveQuarter
      .filter((m) => ymToIndex(m) < ymToIndex(target))
      .flatMap((m) => m.entries);
  }

  function handleAutoGenerate() {
    const entries = autoGenerateMonth(employees, current.year, current.month, priorEntriesFor(current), schedule.specialStaffing);
    applyEntries(entries);
  }

  async function handleSavePeriodStart(next: YearMonth) {
    setPeriodStart(next);
    try {
      await savePeriodSettings(next);
    } catch (err) {
      console.error('Nie udało się zapisać ustawień okresu rozliczeniowego', err);
    }
    setShowPeriodSettings(false);
  }

  async function handleSaveNormSettings(next: NormSettings) {
    setNormSettings(next);
    try {
      await saveNormSettings(next);
    } catch (err) {
      console.error('Nie udało się zapisać ustawień normy godzin', err);
    }
    setShowNormSettings(false);
  }

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    const text = scheduleToText(employees, schedule);
    const title = `Grafik recepcji — ${MONTH_NAMES_PL[schedule.month - 1]} ${schedule.year}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch {
        // użytkownik anulował - nic nie robimy
      }
    } else {
      window.location.href = scheduleToMailtoUrl(employees, schedule);
    }
  }

  const balances = computeQuarterBalance(employees, effectiveQuarter, normSettings);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 40px' }}>
      <div className="no-print" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Grafik recepcji</h1>
          <button onClick={() => logout()} style={{ fontSize: 12 }}>
            Wyloguj
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className={view === 'grafik' ? 'active' : ''} onClick={() => setView('grafik')} disabled={view === 'grafik'}>
            Grafik
          </button>
          <button
            className={view === 'pracownicy' ? 'active' : ''}
            onClick={() => {
              setView('pracownicy');
              setSelectedEmployee(null);
            }}
            disabled={view === 'pracownicy'}
          >
            Pracownicy
          </button>
        </div>
      </div>

      {loading ? (
        <p>Wczytywanie...</p>
      ) : view === 'pracownicy' ? (
        selectedEmployee ? (
          <EmployeeScheduleView
            employee={selectedEmployee}
            schedule={schedule}
            onBack={() => setSelectedEmployee(null)}
            normSettings={normSettings}
          />
        ) : (
          <EmployeeList employees={employees} onSelect={setSelectedEmployee} />
        )
      ) : (
        <>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setCurrent(addMonths(current, -1))} title="Poprzedni miesiąc">
              ‹
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 130, textAlign: 'center' }}>
              {MONTH_NAMES_PL[current.month - 1]} {current.year}
            </span>
            <button onClick={() => setCurrent(addMonths(current, 1))} title="Następny miesiąc">
              ›
            </button>
            <button onClick={() => setShowPeriodSettings((s) => !s)} style={{ fontSize: 12 }}>
              Okres rozliczeniowy: {MONTH_NAMES_PL[periodStart.month - 1]} {periodStart.year} –{' '}
              {MONTH_NAMES_PL[addMonths(periodStart, 2).month - 1]} {addMonths(periodStart, 2).year} ✎
            </button>
            <button onClick={() => setShowNormSettings((s) => !s)} style={{ fontSize: 12 }}>
              Norma godzin: {normSettings.mode === 'auto' ? 'automatyczna' : 'ręczna'} ✎
            </button>
          </div>

          {showNormSettings && (
            <NormSettingsPanel
              year={current.year}
              settings={normSettings}
              onSave={handleSaveNormSettings}
              onClose={() => setShowNormSettings(false)}
            />
          )}

          {showPeriodSettings && (
            <div
              className="no-print"
              style={{
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 12,
                marginBottom: 14,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: 13 }}>Nowy okres zaczyna się od:</span>
              <select
                value={periodStart.month}
                onChange={(e) => setPeriodStart({ ...periodStart, month: Number(e.target.value) })}
              >
                {MONTH_NAMES_PL.map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={periodStart.year}
                onChange={(e) => setPeriodStart({ ...periodStart, year: Number(e.target.value) })}
                style={{ width: 80 }}
              />
              <button className="primary" onClick={() => handleSavePeriodStart(periodStart)}>
                Zapisz
              </button>
            </div>
          )}

          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')} disabled={mode === 'manual'}>
              Ręczny
            </button>
            <button className={mode === 'auto' ? 'active' : ''} onClick={() => setMode('auto')} disabled={mode === 'auto'}>
              Auto
            </button>
            <span style={{ borderLeft: '1px solid var(--border-strong)', height: 20 }} />
            <button onClick={handleUndo} disabled={history.length === 0}>
              ↺ Cofnij
            </button>
            <button onClick={handleClear} disabled={schedule.entries.length === 0}>
              Wyczyść grafik
            </button>
            <span style={{ borderLeft: '1px solid var(--border-strong)', height: 20 }} />
            <button onClick={handlePrint}>🖨 Drukuj</button>
            <button onClick={handleShare}>↗ Udostępnij</button>
            <a href={scheduleToMailtoUrl(employees, schedule)} style={{ textDecoration: 'none' }}>
              <button type="button">✉ Wyślij mailem</button>
            </a>
          </div>

          <div className="no-print">
            <PhotoImportPanel employees={employees} schedule={schedule} onImported={applyEntries} />
            <AiGeneratePanel employees={employees} schedule={schedule} onGenerated={applyEntries} />

            {mode === 'auto' && (
              <div style={{ marginBottom: 18 }}>
                <button className="primary" onClick={handleAutoGenerate}>
                  Wygeneruj grafik automatycznie (algorytm)
                </button>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                  Algorytm respektuje 12h przerwy, podwójną obsadę i stara się wyrównać godziny względem normy
                  narastająco w okresie rozliczeniowym. Wynik możesz poprawić ręcznie.
                </p>
              </div>
            )}
          </div>

          <ScheduleTable employees={employees} schedule={schedule} onChange={handleTableChange} normSettings={normSettings} />

          <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 28, marginBottom: 10 }}>Bilans okresu rozliczeniowego</h2>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))`, gap: 8 }}>
            {balances.map((b) => {
              const emp = employees.find((e) => e.id === b.employeeId)!;
              return (
                <div
                  key={b.employeeId}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow)',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.name}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
                    {b.workedHours}h <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>/ {b.normHours}h</span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 2,
                      color: b.diff > 0 ? 'var(--danger-text)' : b.diff < 0 ? 'var(--info-text)' : 'var(--text-muted)',
                    }}
                  >
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
