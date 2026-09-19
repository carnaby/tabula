import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { PageProps } from '../App';
import { ProjectSelect } from '../components/ProjectSelect';
import type { RecallPreview as Preview } from '../types';

export function RecallPreview({ projects }: PageProps) {
  const [project, setProject] = useState('global');
  const [data, setData] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    api.recall(project).then(setData, (e: Error) => setError(e.message));
  }, [project]);
  useEffect(load, [load]);

  return (
    <section>
      <div className="toolbar">
        <h2>Recall preview</h2>
        <ProjectSelect projects={projects} value={project} onChange={setProject} />
        <button onClick={load}>Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}
      {data && (
        <p className={data.overBudget ? 'warn' : 'muted'}>
          ~{data.tokens} / {data.budget} tokens
          {data.trimmed.length > 0 && ` · trimmed: ${data.trimmed.join(', ')}`}
        </p>
      )}
      <pre className="digest">{data?.text}</pre>
    </section>
  );
}
