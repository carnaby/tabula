import { useState } from 'react';
import { api } from '../api';
import { KINDS, type MemoryKind, type Project } from '../types';
import { Counter, splitTags } from '../util';
import { ProjectSelect } from './ProjectSelect';

const EMPTY = { projectId: 'global', kind: 'rule' as MemoryKind, title: '', body: '', tags: '' };

export function NewMemoryForm({ projects, onCreated }: { projects: Project[]; onCreated: () => void }) {
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState('');
  return (
    <details>
      <summary>New memory</summary>
      <div className="editor">
        <div className="actions">
          <ProjectSelect projects={projects} value={draft.projectId} onChange={(projectId) => setDraft({ ...draft, projectId })} />
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as MemoryKind })}>
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
          <input placeholder="tags, comma separated" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        </div>
        <label>
          <span>Title <Counter value={draft.title} max={120} /></span>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label>
          <span>Body <Counter value={draft.body} max={2000} /></span>
          <textarea rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button
            onClick={() =>
              api.createMemory({ ...draft, tags: splitTags(draft.tags) }).then(
                () => {
                  setDraft({ ...EMPTY, projectId: draft.projectId });
                  setError('');
                  onCreated();
                },
                (e: Error) => setError(e.message),
              )
            }
          >
            Create
          </button>
        </div>
      </div>
    </details>
  );
}
