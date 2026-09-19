import type { Project } from '../types';

export function ProjectSelect(props: {
  projects: Project[];
  value: string;
  onChange: (id: string) => void;
  allowAll?: boolean;
}) {
  return (
    <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
      {props.allowAll && <option value="">All projects</option>}
      {props.projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.id}
        </option>
      ))}
    </select>
  );
}
