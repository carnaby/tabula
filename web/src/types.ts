export type MemoryKind = 'rule' | 'gotcha' | 'decision' | 'fact';
export const KINDS: MemoryKind[] = ['rule', 'gotcha', 'decision', 'fact'];

export type Project = { id: string; name: string; description: string; memory_count: number; note_count: number };

export type Memory = {
  id: string;
  projectId: string;
  kind: MemoryKind;
  title: string;
  body: string;
  tags: string[];
  status: 'active' | 'deprecated';
  supersedesId: string | null;
  deprecatedReason: string | null;
  source: 'agent' | 'human';
  agentLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  tokenEstimate: number;
};

export type RecallPreview = { text: string; tokens: number; budget: number; trimmed: string[]; overBudget: boolean };
