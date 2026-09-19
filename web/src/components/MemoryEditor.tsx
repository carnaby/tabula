import { useState } from 'react';
import { api } from '../api';
import { KINDS, type Memory, type MemoryKind } from '../types';
import { Counter, splitTags } from '../util';

export function MemoryEditor({ memory, onChanged }: { memory: Memory; onChanged: () => void }) {
  const [draft, setDraft] = useState({
    title: memory.title,
    body: memory.body,
    kind: memory.kind,
    tags: memory.tags.join(', '),
  });
  const [chain, setChain] = useState<Memory[] | null>(null);
  const [error, setError] = useState('');
  const act = (p: Promise<unknown>) => p.then(onChanged, (e: Error) => setError(e.message));

  return (
    <div className="editor">
      <label>
        <span>Title <Counter value={draft.title} max={120} /></span>
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <div className="actions">
        <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as MemoryKind })}>
          {KINDS.map((k) => <option key={k}>{k}</option>)}
        </select>
        <input placeholder="tags, comma separated" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
      </div>
      <label>
        <span>Body <Counter value={draft.body} max={2000} /></span>
        <textarea rows={6} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button onClick={() => act(api.updateMemory(memory.id, { ...draft, tags: splitTags(draft.tags) }))}>Save</button>
        {memory.status === 'active' && (
          <button
            onClick={() => {
              const reason = window.prompt('Why is this memory no longer valid?');
              if (reason?.trim()) act(api.deprecateMemory(memory.id, reason));
            }}
          >
            Deprecate
          </button>
        )}
        <button
          className="danger"
          onClick={() => {
            if (window.confirm('Delete this memory permanently? This cannot be undone.')) act(api.deleteMemory(memory.id));
          }}
        >
          Delete
        </button>
        <button onClick={() => api.chain(memory.id).then(setChain, (e: Error) => setError(e.message))}>
          Supersedes chain
        </button>
      </div>
      <p className="muted">
        id {memory.id} · created {new Date(memory.createdAt).toLocaleString()}
        {memory.deprecatedReason && ` · deprecated: ${memory.deprecatedReason}`}
      </p>
      {chain && (
        <ol className="chain">
          {chain.map((c) => (
            <li key={c.id} className={c.id === memory.id ? 'current' : ''}>
              {c.title} ({c.status}, {c.source}, {new Date(c.createdAt).toLocaleDateString()})
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
