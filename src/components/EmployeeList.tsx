import type { Employee } from '../types';

interface Props {
  employees: Employee[];
  onSelect: (employee: Employee) => void;
}

export function EmployeeList({ employees, onSelect }: Props) {
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
    </div>
  );
}
