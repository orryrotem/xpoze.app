import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePostUrl, chartRows, type Snapshot } from './model.ts';
test('accepts X and legacy Twitter links without losing large ID precision', () => {
  for (const host of ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']) assert.equal(parsePostUrl(`https://${host}/someone/status/18400000000000000001?s=20`)?.id, '18400000000000000001');
  assert.ok(parsePostUrl('https://x.com/i/web/status/123'));
});
test('rejects deceptive hosts, credentials, non-HTTPS and unrelated paths', () => {
  for (const url of ['https://x.com.evil.test/user/status/123', 'https://evil.test/x.com/user/status/123', 'http://x.com/user/status/123', 'https://user:pass@x.com/user/status/123', 'https://x.com/user', 'https://x.com/user/status/abc', 'https://x.com:444/user/status/123', 'not a link']) assert.equal(parsePostUrl(url), null);
});
test('changes preserve unknown values, use preceding observations, and allow falling counts', () => {
  const snapshots: Snapshot[] = [
    { observedAt: '2026-10-10T00:00:00Z', counts: { Likes: 10, Reposts: null, Replies: 2, Quotes: 1 } },
    { observedAt: '2026-10-10T00:05:00Z', counts: { Likes: 8, Reposts: 4, Replies: null, Quotes: 3 } },
    { observedAt: '2026-10-10T00:10:00Z', counts: { Likes: 15, Reposts: 5, Replies: 4, Quotes: 3 } },
  ];
  const rows = chartRows(snapshots, 'change');
  assert.deepEqual(rows[0].counts, { Likes: null, Reposts: null, Replies: null, Quotes: null });
  assert.deepEqual(rows[1].counts, { Likes: -2, Reposts: null, Replies: null, Quotes: 2 });
  assert.deepEqual(rows[2].counts, { Likes: 7, Reposts: 1, Replies: null, Quotes: 0 });
  assert.deepEqual(chartRows(snapshots, 'totals'), snapshots);
  assert.deepEqual(chartRows([], 'change'), []);
});
