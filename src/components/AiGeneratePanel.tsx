import { useState } from 'react';
import type { Employee, MonthSchedule, ShiftEntry } from '../types';
import { generateScheduleWithAi } from '../lib/aiGenerate';

interface Props {
  employees: Employee[];
  schedule: MonthSchedule;
  onGenerated: (entries: ShiftEntry[]) => void;
}

export function AiGeneratePanel({ employees, schedule, onGenerated }: Props) {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const result = await generateScheduleWithAi(
        employees,
        schedule.year,
        schedule.month,
        schedule.specialStaffing,
        instructions,
      );
      onGenerated(result.entries);
      if (result.note) setNote(result.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wygenerować grafiku.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--accent-soft)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius)',
        padding: 14,
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--accent-strong)' }}>
        ✨ Generowanie grafiku przez AI (Gemini)
      </div>
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder='Np. "Fokt chce mieć wolne w drugi weekend miesiąca. Markiewicz woli zmiany poranne."'
        rows={3}
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="primary" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generuję...' : 'Generuj z AI'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Zastąpi bieżący grafik tego miesiąca (możesz cofnąć).</span>
      </div>
      {error && <div style={{ color: 'var(--danger-text)', fontSize: 12, marginTop: 8 }}>{error}</div>}
      {note && <div style={{ color: 'var(--info-text)', fontSize: 12, marginTop: 8 }}>Uwaga od AI: {note}</div>}
    </div>
  );
}
