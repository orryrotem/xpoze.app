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
export type Snapshot = { observedAt: string; counts: Record<Kind, number | null> };
export type PostData = {
  post: { id: string; url: string; text: string; createdAt: string | null; author: { name: string; username: string } | null };
  snapshots: Snapshot[];
  cached: boolean;
  nextRefreshAt: string;
};
export function chartRows(snapshots: Snapshot[], mode: 'totals' | 'change') {
  return snapshots.map((row, index) => ({ observedAt: row.observedAt, counts: Object.fromEntries(kinds.map(kind => {
    const previous = snapshots[index - 1]?.counts[kind];
    return [kind, mode === 'totals' ? row.counts[kind] : previous == null || row.counts[kind] == null ? null : row.counts[kind]! - previous];
  })) as Record<Kind, number | null> }));
}
