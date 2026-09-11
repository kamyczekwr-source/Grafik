import { useRef, useState } from 'react';
import type { Employee, MonthSchedule, ShiftEntry } from '../types';
import { importScheduleFromPhoto } from '../lib/importPhoto';
import { MONTH_NAMES_PL } from '../lib/dates';

interface Props {
  employees: Employee[];
  schedule: MonthSchedule;
  onImported: (entries: ShiftEntry[]) => void;
}

export function PhotoImportPanel({ employees, schedule, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(f: File | null) {
    setFile(f);
    setError(null);
    setNote(null);
    setCount(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setNote(null);
    setCount(null);
    try {
      const result = await importScheduleFromPhoto(file, employees, schedule.year, schedule.month);
      // Scal z tym co już jest: nowe wpisy z tego samego dnia+osoby nadpisują stare.
      const merged = schedule.entries.filter(
        (existing) =>
          !result.entries.some(
            (n) => n.date === existing.date && n.employeeId === existing.employeeId && n.slotIndex === existing.slotIndex,
          ),
      );
      onImported([...merged, ...result.entries]);
      setCount(result.entries.length);
      if (result.note) setNote(result.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się odczytać zdjęcia.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ marginBottom: 12 }}>
        📷 Wczytaj ze zdjęcia papierowego grafiku
      </button>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 14,
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          📷 Wczytaj grafik ze zdjęcia — {MONTH_NAMES_PL[schedule.month - 1]} {schedule.year}
        </div>
        <button onClick={() => setOpen(false)} style={{ fontSize: 11, padding: '3px 8px' }}>
          Zamknij
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 0 }}>
        Zrób wyraźne zdjęcie papierowego grafiku (całą tabelę, dobre oświetlenie) i wgraj poniżej. AI odczyta zmiany i
        wstawi je do grafiku za {MONTH_NAMES_PL[schedule.month - 1]} {schedule.year} — upewnij się, że przeglądasz
        właściwy miesiąc.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Podgląd zdjęcia grafiku"
          style={{ display: 'block', maxWidth: '100%', maxHeight: 200, marginTop: 10, borderRadius: 'var(--radius-sm)' }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <button className="primary" onClick={handleImport} disabled={!file || loading}>
          {loading ? 'Odczytuję...' : 'Wczytaj do grafiku'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nowe wpisy nadpiszą istniejące na tych samych dniach.</span>
      </div>
      {error && <div style={{ color: 'var(--danger-text)', fontSize: 12, marginTop: 8 }}>{error}</div>}
      {count !== null && (
        <div style={{ color: 'var(--info-text)', fontSize: 12, marginTop: 8 }}>Wczytano {count} zmian.</div>
      )}
      {note && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Uwaga: {note}</div>}
    </div>
  );
}
