import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { PageProps } from '../App';
import { MemoryEditor } from '../components/MemoryEditor';
import { NewMemoryForm } from '../components/NewMemoryForm';
import { ProjectSelect } from '../components/ProjectSelect';
import { KINDS, type Memory } from '../types';

export function Memories({ projects, onChanged }: PageProps) {
  const [filter, setFilter] = useState({ project: '', kind: '', status: 'active', q: '' });
  const [rows, setRows] = useState<Memory[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.memories(filter).then(
      (r) => {
        setRows(r);
        setError('');
      },
      (e: Error) => setError(e.message),
    );
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce fulltext
    return () => clearTimeout(t);
  }, [load]);

  const changed = () => {
    load();
    onChanged();
  };

  return (
    <section>
      <div className="toolbar">
        <h2>Memories</h2>
        <ProjectSelect projects={projects} value={filter.project} onChange={(project) => setFilter({ ...filter, project })} allowAll />
        <select value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })}>
          <option value="">All kinds</option>
          {KINDS.map((k) => <option key={k}>{k}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="active">active</option>
          <option value="deprecated">deprecated</option>
          <option value="all">all</option>
        </select>
        <input placeholder="Full-text search" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
      </div>
      <NewMemoryForm projects={projects} onCreated={changed} />
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Project</th><th>Kind</th><th>Title</th><th>Status</th><th>Source</th><th>Agent</th><th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <Fragment key={m.id}>
              <tr className={`row ${m.status}`} onClick={() => setOpen(open === m.id ? null : m.id)}>
                <td>{m.projectId}</td>
                <td>{m.kind}</td>
                <td>{m.title}</td>
                <td>{m.status}</td>
                <td>{m.source}</td>
                <td>{m.agentLabel ?? ''}</td>
                <td>{new Date(m.updatedAt).toLocaleString()}</td>
              </tr>
              {open === m.id && (
                <tr>
                  <td colSpan={7}>
                    <MemoryEditor key={m.updatedAt} memory={m} onChanged={changed} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && !error && <p className="muted">No memories match the filter.</p>}
    </section>
  );
}
