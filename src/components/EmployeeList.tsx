import type { Employee } from '../types';

interface Props {
  employees: Employee[];
  onSelect: (employee: Employee) => void;
}

export function EmployeeList({ employees, onSelect }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Pracownicy</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp)}
            style={{
              textAlign: 'left',
              padding: '8px 12px',
              background: '#f4f3ee',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {emp.name}
            {emp.etat !== 1 && <span style={{ color: '#888' }}> · {emp.etat} etatu</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
