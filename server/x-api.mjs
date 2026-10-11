import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

const fields = { Likes: 'like_count', Reposts: 'retweet_count', Replies: 'reply_count', Quotes: 'quote_count' };
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function normalizePost(payload, id, observedAt) {
  const post = payload?.data;
  if (post?.id !== id || typeof post.text !== 'string' || !post.public_metrics) {
    throw new ApiError(502, 'X returned an incomplete post response. Try again later.');
  }
  const author = payload.includes?.users?.find(user => user.id === post.author_id);
  return {
    post: {
      id, url: `https://x.com/i/web/status/${id}`,
      text: typeof post.note_post?.text === 'string' ? post.note_post.text : typeof post.note_tweet?.text === 'string' ? post.note_tweet.text : post.text,
      createdAt: typeof post.created_at === 'string' && Number.isFinite(Date.parse(post.created_at)) ? post.created_at : null,
      author: author && typeof author.name === 'string' && typeof author.username === 'string' ? { name: author.name, username: author.username } : null,
    },
    snapshot: { observedAt, counts: Object.fromEntries(Object.entries(fields).map(([kind, field]) => {
      // Some documentation uses repost_count; the v2 response traditionally uses retweet_count.
      const value = post.public_metrics[field] ?? (kind === 'Reposts' ? post.public_metrics.repost_count : undefined);
      return [kind, Number.isSafeInteger(value) && value >= 0 ? value : null];
    })) },
  };
}

export function createPostService({ token, directory, fetcher = fetch, now = Date.now }) {
  const inFlight = new Map();
  let cooldownUntil = 0;
  async function lookup(id) {
    if (!/^[0-9]{1,20}$/.test(id)) throw new ApiError(400, 'Invalid post ID.');
    if (!token?.trim()) throw new ApiError(503, 'Live data is not configured. Set X_BEARER_TOKEN in the server’s .env file and restart the app.');
    const filename = join(directory, `${id}.json`);
    let stored;
    try { stored = JSON.parse(await readFile(filename, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new ApiError(500, 'Saved observations could not be read. Check the server data directory.'); }
    const latest = stored?.snapshots?.at(-1);
    const nextRefreshAt = latest ? Date.parse(latest.observedAt) + 60_000 : 0;
    if (latest && now() < nextRefreshAt) return { ...stored, cached: true, nextRefreshAt: new Date(nextRefreshAt).toISOString() };
    if (now() < cooldownUntil) throw new ApiError(429, 'X requests are temporarily rate limited. Wait before refreshing.');
    const url = new URL(`https://api.x.com/2/tweets/${id}`);
    url.searchParams.set('post.fields', 'created_at,public_metrics,note_post');
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('user.fields', 'name,username');
    let response;
    try {
      response = await fetcher(url, { headers: { Authorization: `Bearer ${token.trim()}` }, signal: AbortSignal.timeout(15_000), redirect: 'error' });
    } catch { throw new ApiError(502, 'Could not reach X. Check the server connection and try again.'); }
    if (!response.ok) {
      if (response.status === 429) {
        const reset = Number(response.headers.get('x-rate-limit-reset')) * 1000;
        cooldownUntil = Math.max(now() + 60_000, Number.isFinite(reset) ? reset : 0);
      }
      const messages = {
        401: 'X rejected the server credentials. Check X_BEARER_TOKEN and restart the app.',
        402: 'X API credits are unavailable. Check the app’s API billing.',
        403: 'X denied access to this post. Check API permissions or whether the post is protected.',
        404: 'This post was not found. It may have been deleted or be unavailable.',
        429: 'X rate limit reached. Wait before refreshing.',
      };
      throw new ApiError(messages[response.status] ? response.status : 502, messages[response.status] ?? 'X is temporarily unavailable. Try again later.');
    }
    let payload;
    try { payload = await response.json(); } catch { throw new ApiError(502, 'X returned an unreadable response.'); }
    if (!payload.data && payload.errors?.length) throw new ApiError(404, 'This post could not be retrieved. It may be deleted, protected, or unavailable.');
    const result = normalizePost(payload, id, new Date(now()).toISOString());
    const record = { post: result.post, snapshots: [...(stored?.snapshots ?? []), result.snapshot] };
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(`${filename}.tmp`, JSON.stringify(record), { mode: 0o600 });
      await rename(`${filename}.tmp`, filename);
    } catch { throw new ApiError(500, 'Could not save the observation. Check server data directory permissions.'); }
    return { ...record, cached: false, nextRefreshAt: new Date(now() + 60_000).toISOString() };
  }
  return {
    configured: Boolean(token?.trim()),
    getPost(id) {
      if (!inFlight.has(id)) {
        const request = lookup(id).finally(() => inFlight.delete(id));
        inFlight.set(id, request);
      }
      return inFlight.get(id);
    },
  };
}

export function apiMiddleware(service) {
  return async (request, response, next) => {
    const path = (request.url ?? '').split('?')[0];
    if (!path.startsWith('/api/')) return next();
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.');
      if (path === '/api/status') { response.end(JSON.stringify({ configured: service.configured })); return; }
      const match = path.match(/^\/api\/posts\/([0-9]{1,20})$/);
      if (!match) throw new ApiError(404, 'API route not found.');
      response.end(JSON.stringify(await service.getPost(match[1])));
    } catch (error) {
      response.statusCode = error instanceof ApiError ? error.status : 500;
      response.end(JSON.stringify({ error: error instanceof ApiError ? error.message : 'The server could not load this post.' }));
    }
  };
}
