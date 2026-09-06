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
    <div style={{ background: '#f4f3ee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Generowanie grafiku przez AI (Gemini)</div>
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder='Np. "Fokt chce mieć wolne w drugi weekend miesiąca. Markiewicz woli zmiany poranne."'
        rows={3}
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13, padding: 6 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generuję...' : 'Generuj z AI'}
        </button>
        <span style={{ fontSize: 12, color: '#888' }}>Zastąpi bieżący grafik tego miesiąca (możesz cofnąć).</span>
      </div>
      {error && <div style={{ color: '#a32d2d', fontSize: 12, marginTop: 6 }}>{error}</div>}
      {note && <div style={{ color: '#185fa5', fontSize: 12, marginTop: 6 }}>Uwaga od AI: {note}</div>}
    </div>
  );
}
