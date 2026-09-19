export const charCount = (s: string) => [...s].length;
export const estimateTokens = (s: string) => Math.ceil(s.length / 4);
export const splitTags = (s: string) =>
  s.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

export function Counter({ value, max }: { value: string; max: number }) {
  const n = charCount(value.trim());
  return <span className={n > max ? 'counter over' : 'counter'}>{n}/{max}</span>;
}
