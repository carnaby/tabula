import { type ComponentType, useCallback, useEffect, useState } from 'react';
import { api, clearToken } from './api';
import { NewProjectForm } from './components/NewProjectForm';
import { Memories } from './pages/Memories';
import { Notes } from './pages/Notes';
import { RecallPreview } from './pages/RecallPreview';
import type { Project } from './types';

export type PageProps = { projects: Project[]; onChanged: () => void };

const PAGES: Record<string, { label: string; Page: ComponentType<PageProps> }> = {
  '#/memories': { label: 'Memories', Page: Memories },
  '#/notes': { label: 'Notes', Page: Notes },
  '#/recall': { label: 'Recall preview', Page: RecallPreview },
};
const DEFAULT = '#/memories';

function useHash() {
  const [hash, setHash] = useState(window.location.hash || DEFAULT);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || DEFAULT);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export function App() {
  const hash = useHash();
  const [projects, setProjects] = useState<Project[]>([]);
  const reload = useCallback(() => {
    void api.projects().then(setProjects);
  }, []);
  useEffect(reload, [reload]);
  const { Page } = PAGES[hash] ?? PAGES[DEFAULT]!;

  return (
    <div className="app">
      <header>
        <strong>Tabula</strong>
        <nav>
          {Object.entries(PAGES).map(([href, p]) => (
            <a key={href} href={href} className={href === hash ? 'active' : ''}>
              {p.label}
            </a>
          ))}
        </nav>
        <NewProjectForm onCreated={reload} />
        <button
          className="link"
          onClick={() => {
            clearToken();
            window.location.reload();
          }}
        >
          Forget token
        </button>
      </header>
      <main>
        <Page projects={projects} onChanged={reload} />
      </main>
    </div>
  );
}
