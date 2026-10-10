export const kinds = ['Likes', 'Reposts', 'Replies', 'Quotes'] as const;
export type Kind = typeof kinds[number];
export const colors: Record<Kind, string> = { Likes: '#98edb0', Reposts: '#8cbfff', Replies: '#c7a6ff', Quotes: '#ffc88a' };
export function parsePostUrl(value: string): { id: string; url: string } | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname) || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/(?:[A-Za-z0-9_]{1,15}\/status|i\/web\/status)\/([0-9]{1,20})\/?$/);
    return match ? { id: match[1], url: `https://x.com/i/web/status/${match[1]}` } : null;
  } catch { return null; }
}
export type Snapshot = { hour: number; counts: Record<Kind, number> };
// Deliberately synthetic snapshots, fixed so comparisons remain reproducible.
export const snapshots: Snapshot[] = Array.from({ length: 25 }, (_, hour) => ({ hour, counts: {
  Likes: Math.round(1120 + 6800 * (1 - Math.exp(-hour / 8)) + 2800 / (1 + Math.exp(-(hour - 13)))),
  Reposts: Math.round(180 + 1500 * (1 - Math.exp(-hour / 7)) + 850 / (1 + Math.exp(-(hour - 13)))),
  Replies: Math.round(70 + 610 * (1 - Math.exp(-hour / 10)) + 380 / (1 + Math.exp(-(hour - 14)))),
  Quotes: Math.round(25 + 235 * (1 - Math.exp(-hour / 8)) + 180 / (1 + Math.exp(-(hour - 12))))
} }));
export function chartRows(hours: number, mode: 'totals' | 'change') {
  return snapshots.slice(0, hours + 1).map((row, index) => ({ hour: row.hour, counts: Object.fromEntries(kinds.map(kind => [kind, mode === 'totals' ? row.counts[kind] : index === 0 ? null : row.counts[kind] - snapshots[index - 1].counts[kind]])) as Record<Kind, number | null> }));
}
