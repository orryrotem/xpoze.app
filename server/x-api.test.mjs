import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ApiError, createPostService, normalizePost, apiMiddleware } from './x-api.mjs';
const id = '18400000000000000001';
const payload = { data: { id, author_id: '55', text: 'Response fixture', created_at: '2026-10-01T12:00:00Z', public_metrics: { like_count: 100, retweet_count: 10, reply_count: 5, quote_count: 2 } }, includes: { users: [{ id: '55', name: 'Author', username: 'author' }] } };
test('maps metrics and author, keeps absent counts unavailable', () => {
  const result = normalizePost(payload, id, '2026-10-10T12:00:00Z');
  assert.equal(result.post.author.username, 'author');
  assert.equal(result.snapshot.counts.Reposts, 10);
  const missing = normalizePost({ data: { ...payload.data, public_metrics: { like_count: 0 } } }, id, '2026-10-10T12:00:00Z');
  assert.equal(missing.snapshot.counts.Likes, 0);
  assert.equal(missing.snapshot.counts.Replies, null);
  assert.throws(() => normalizePost({ data: { ...payload.data, id: 'wrong' } }, id, '2026-10-10T12:00:00Z'), ApiError);
});
test('persists observations, caches and deduplicates requests, survives restart', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'xpoze-api-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let time = Date.parse('2026-10-10T12:00:00Z'); let calls = 0;
  const options = { token: 'test-server-token', directory, now: () => time, fetcher: async (url, options) => {
    calls++;
    assert.equal(url.origin, 'https://api.x.com');
    assert.equal(url.pathname, `/2/tweets/${id}`);
    assert.equal(url.searchParams.get('post.fields'), 'created_at,public_metrics,note_post');
    assert.equal(options.headers.Authorization, 'Bearer test-server-token');
    return new Response(JSON.stringify(payload));
  } };
  const service = createPostService(options);
  const [first, concurrent] = await Promise.all([service.getPost(id), service.getPost(id)]);
  assert.deepEqual(first, concurrent); assert.equal(calls, 1); assert.equal(first.snapshots.length, 1);
  assert.equal((await service.getPost(id)).cached, true);
  time += 61_000;
  assert.equal((await createPostService(options).getPost(id)).snapshots.length, 2);
  assert.equal(calls, 2);
  assert.ok(!(await readFile(join(directory, `${id}.json`), 'utf8')).includes('test-server-token'));
});
test('configuration and provider failures do not fabricate observations or leak provider details', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'xpoze-api-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(createPostService({ directory }).getPost(id), error => error.status === 503);
  const service = createPostService({ token: 'secret', directory, fetcher: async () => new Response('secret provider details', { status: 403 }) });
  await assert.rejects(service.getPost(id), error => error.status === 403 && !error.message.includes('secret'));
  await assert.rejects(readFile(join(directory, `${id}.json`)), error => error.code === 'ENOENT');
  await assert.rejects(service.getPost('../bad'), error => error.status === 400);
});
test('rate limits stop immediate additional requests', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'xpoze-api-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let calls = 0;
  const service = createPostService({ token: 'secret', directory, fetcher: async () => { calls++; return new Response('', { status: 429 }); } });
  await assert.rejects(service.getPost(id), error => error.status === 429);
  await assert.rejects(service.getPost('123'), error => error.status === 429);
  assert.equal(calls, 1);
});
test('API rejects wrong methods and reports missing setup', async () => {
  const middleware = apiMiddleware(createPostService({ directory: '.' }));
  for (const [method, url, status] of [['POST', '/api/posts/123', 405], ['GET', '/api/posts/123', 503], ['GET', '/api/posts/nope', 404]]) {
    let body; const response = { statusCode: 200, setHeader() {}, end(value) { body = value; } };
    await middleware({ method, url }, response, () => assert.fail('API request must not fall through'));
    assert.equal(response.statusCode, status); assert.equal(typeof JSON.parse(body).error, 'string');
  }
});
