import { useState } from 'react';
import { login } from '../lib/auth';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Podaj e-mail i hasło.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError('Nieprawidłowy e-mail lub hasło.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 340,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)',
          padding: '28px 26px',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Grafik recepcji</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>Zaloguj się, aby kontynuować</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div style={{ color: 'var(--danger-text)', fontSize: 13 }}>{error}</div>}
          <button className="primary" type="submit" disabled={submitting} style={{ marginTop: 4 }}>
            {submitting ? 'Logowanie...' : 'Zaloguj'}
          </button>
        </form>
      </div>
    </div>
  );
}
