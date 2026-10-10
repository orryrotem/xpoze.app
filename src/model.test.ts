import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePostUrl, chartRows, snapshots, kinds } from './model.ts';
test('accepts X and legacy Twitter links without losing large ID precision', () => {
  for (const host of ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']) assert.equal(parsePostUrl(`https://${host}/someone/status/18400000000000000001?s=20`)?.id, '18400000000000000001');
  assert.ok(parsePostUrl('https://x.com/i/web/status/123'));
});
test('rejects deceptive hosts, credentials, non-HTTPS and unrelated paths', () => {
  for (const url of ['https://x.com.evil.test/user/status/123', 'https://evil.test/x.com/user/status/123', 'http://x.com/user/status/123', 'https://user:pass@x.com/user/status/123', 'https://x.com/user', 'https://x.com/user/status/abc', 'https://x.com:444/user/status/123', 'not a link']) assert.equal(parsePostUrl(url), null);
});
test('net change leaves the first interval unknown and telescopes to observed growth', () => {
  const rows = chartRows(24, 'change');
  for (const kind of kinds) {
    assert.equal(rows[0].counts[kind], null);
    assert.equal(rows.slice(1).reduce((sum, row) => sum + row.counts[kind]!, 0), snapshots[24].counts[kind] - snapshots[0].counts[kind]);
  }
  assert.equal(chartRows(6, 'totals').length, 7);
});
