import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { PageProps } from '../App';
import { NoteEditor } from '../components/NoteEditor';
import { ProjectSelect } from '../components/ProjectSelect';
import type { Note } from '../types';

export function Notes({ projects, onChanged }: PageProps) {
  const [project, setProject] = useState('global');
  const [rows, setRows] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | 'new' | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.notes({ project }).then(setRows, (e: Error) => setError(e.message));
  }, [project]);
  useEffect(load, [load]);

  const done = () => {
    setEditing(null);
    load();
    onChanged();
  };

  return (
    <section>
      <div className="toolbar">
        <h2>Notes</h2>
        <ProjectSelect projects={projects} value={project} onChange={(p) => { setProject(p); setEditing(null); }} />
        <button onClick={() => setEditing('new')}>New note</button>
      </div>
      {error && <p className="error">{error}</p>}
      {editing && (
        <NoteEditor
          key={editing === 'new' ? 'new' : editing.id}
          note={editing === 'new' ? null : editing}
          projectId={project}
          onDone={done}
        />
      )}
      <table>
        <thead>
          <tr><th>Title</th><th>Summary</th><th>Pinned</th><th>Words</th><th>~Tokens</th></tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.id} className="row" onClick={() => setEditing(n)}>
              <td>{n.title}</td>
              <td>{n.summary}</td>
              <td>{n.pinned ? 'pinned' : ''}</td>
              <td>{n.wordCount}</td>
              <td>{n.tokenEstimate}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && !error && <p className="muted">No notes in this project.</p>}
    </section>
  );
}
