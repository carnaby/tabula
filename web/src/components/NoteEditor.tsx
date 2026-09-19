import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useMemo, useState } from 'react';
import { api } from '../api';
import type { Note } from '../types';
import { Counter, estimateTokens, splitTags } from '../util';

type Props = { note: Note | null; projectId: string; onDone: () => void };

export function NoteEditor({ note, projectId, onDone }: Props) {
  const [draft, setDraft] = useState({
    title: note?.title ?? '',
    summary: note?.summary ?? '',
    body: note?.body ?? '',
    tags: note?.tags.join(', ') ?? '',
    pinned: note?.pinned ?? false,
  });
  const [error, setError] = useState('');
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(draft.body, { async: false }) as string), [draft.body]);

  async function save() {
    const pinning = draft.pinned && !note?.pinned;
    if (
      pinning &&
      !window.confirm(
        `Pinned notes go into every recall digest of "${projectId}" in full. ` +
          `This note adds ~${estimateTokens(draft.body)} tokens (digest budget 1500). Pin it?`,
      )
    ) {
      return;
    }
    const payload = { ...draft, tags: splitTags(draft.tags) };
    try {
      if (note) await api.updateNote(note.id, payload);
      else await api.createNote({ ...payload, projectId });
      if (draft.pinned) {
        const preview = await api.recall(projectId);
        if (preview.overBudget || preview.tokens > preview.budget) {
          window.alert(
            `Recall digest for "${projectId}" is now ~${preview.tokens} tokens, over the ${preview.budget} budget. ` +
              'Pinned notes are never trimmed. Shorten them.',
          );
        }
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="editor">
      <label>
        Title
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <label>
        <span>Summary (goes into the digest) <Counter value={draft.summary} max={200} /></span>
        <input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
      </label>
      <div className="actions">
        <input placeholder="tags, comma separated" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        <label>
          <input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} /> pinned
        </label>
        <span className="muted">~{estimateTokens(draft.body)} tokens</span>
      </div>
      <div className="split">
        <textarea rows={20} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        <div className="preview" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button onClick={save}>Save</button>
        <button onClick={onDone}>Cancel</button>
        {note && (
          <button
            className="danger"
            onClick={() => {
              if (window.confirm('Delete this note permanently?')) {
                api.deleteNote(note.id).then(onDone, (e: Error) => setError(e.message));
              }
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
