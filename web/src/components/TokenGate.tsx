import { type ReactNode, useState } from 'react';
import { getToken, setToken } from '../api';

export function TokenGate({ children }: { children: ReactNode }) {
  const [token, setTok] = useState(getToken());
  const [draft, setDraft] = useState('');
  if (token) return <>{children}</>;
  return (
    <form
      className="gate"
      onSubmit={(e) => {
        e.preventDefault();
        setToken(draft.trim());
        setTok(draft.trim());
      }}
    >
      <h1>Tabula</h1>
      <p>Paste the bearer token (TABULA_TOKEN). It is stored in this browser only.</p>
      <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      <button type="submit" disabled={!draft.trim()}>Save</button>
    </form>
  );
}
