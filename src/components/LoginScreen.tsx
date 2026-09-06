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
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Grafik recepcji — logowanie</h1>
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
        {error && <div style={{ color: '#a32d2d', fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logowanie...' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
}
