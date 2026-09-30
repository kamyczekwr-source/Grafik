import { useState } from 'react';
import type { Employee } from '../types';

interface Props {
  employees: Employee[];
  onSelect: (employee: Employee) => void;
  onAdd: (name: string, etat: number) => Promise<void> | void;
}

export function EmployeeList({ employees, onSelect, onAdd }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [etat, setEtat] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Wpisz imię i nazwisko.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd(trimmed, Number(etat));
      setName('');
      setEtat('1');
      setAdding(false);
    } catch {
      setError('Nie udało się zapisać pracownika. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>Pracownicy</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp)}
            style={{
              textAlign: 'left',
              padding: '14px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {emp.name}
              {emp.etat !== 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {emp.etat} etatu</span>}
            </span>
            <span style={{ color: 'var(--text-faint)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} style={{ marginTop: 12 }}>
          + Dodaj pracownika
        </button>
      ) : (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            type="text"
            placeholder="Imię i nazwisko, np. A. Kowalska"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: '8px 10px', fontSize: 14 }}
          />
          <select value={etat} onChange={(e) => setEtat(e.target.value)} style={{ padding: '8px 10px', fontSize: 14 }}>
            <option value="1">Pełny etat</option>
            <option value="0.75">3/4 etatu</option>
            <option value="0.5">1/2 etatu</option>
          </select>
          {error && <div style={{ color: 'var(--danger-text)', fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Zapisuję...' : 'Dodaj'}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              disabled={saving}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
