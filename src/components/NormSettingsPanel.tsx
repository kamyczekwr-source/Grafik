import { useState } from 'react';
import type { NormSettings } from '../lib/storage';
import { monthlyNormHours } from '../lib/rules';
import { MONTH_NAMES_PL } from '../lib/dates';

interface Props {
  year: number;
  settings: NormSettings;
  onSave: (next: NormSettings) => void;
  onClose: () => void;
}

export function NormSettingsPanel({ year, settings, onSave, onClose }: Props) {
  const [mode, setMode] = useState<NormSettings['mode']>(settings.mode);
  const [hours, setHours] = useState<Record<string, number>>(settings.manualHours);

  function keyFor(month: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  function handleHourChange(month: number, value: string) {
    const num = Number(value);
    setHours((h) => ({ ...h, [keyFor(month)]: Number.isNaN(num) ? 0 : num }));
  }

  function handleSave() {
    onSave({ mode, manualHours: hours });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Norma godzin (pełny etat)</div>
        <button onClick={onClose} style={{ fontSize: 11, padding: '3px 8px' }}>
          Zamknij
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className={mode === 'auto' ? 'active' : ''} onClick={() => setMode('auto')}>
          Automatycznie (dni robocze × 8h)
        </button>
        <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
          Wpisz ręcznie
        </button>
      </div>

      {mode === 'manual' && (
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 0 }}>
            Wpisz liczbę godzin dla pełnego etatu w każdym miesiącu {year} r. (np. z oficjalnej tabeli wymiaru czasu
            pracy). Osoby na niepełny etat dostaną tę wartość pomnożoną przez ich etat.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {MONTH_NAMES_PL.map((name, i) => {
              const month = i + 1;
              const key = keyFor(month);
              const auto = monthlyNormHours(year, month, 1);
              return (
                <label key={month} style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {name}
                  <input
                    type="number"
                    value={hours[key] ?? ''}
                    placeholder={String(auto)}
                    onChange={(e) => handleHourChange(month, e.target.value)}
                    style={{ width: '100%' }}
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      <button className="primary" onClick={handleSave} style={{ marginTop: 12 }}>
        Zapisz
      </button>
    </div>
  );
}
