import { useState } from 'react';
import { api } from '../api';

export function NewProjectForm({ onCreated }: { onCreated: () => void }) {
  const [draft, setDraft] = useState({ id: '', name: '', description: '' });
  const [error, setError] = useState('');
  return (
    <details className="new-project">
      <summary>New project</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          api.createProject(draft).then(
            () => {
              setDraft({ id: '', name: '', description: '' });
              setError('');
              onCreated();
            },
            (err: Error) => setError(err.message),
          );
        }}
      >
        <input placeholder="slug (e.g. omnistra)" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
        <input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input
          placeholder="One-sentence description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <button type="submit" disabled={!draft.id.trim()}>Create</button>
        {error && <p className="error">{error}</p>}
      </form>
    </details>
  );
}
