export const DIGEST_BUDGET = 1500;

/** Hrubý odhad podľa spec: znaky / 4. Pre slovenčinu nepresný, kalibruje sa po prvom týždni. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export const wordCount = (text: string): number => {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
};
