import { useEffect, useRef, useState } from 'react';
import { chartRows, colors, kinds, parsePostUrl, type Kind, type PostData } from './model';

const number = (value: number | null) => value === null ? 'Unavailable' : value.toLocaleString('en-US');
const date = (value: string) => new Date(value).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export default function App() {
  const [input, setInput] = useState('');
  const [data, setData] = useState<PostData | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Kind[]>([...kinds]);
  const [hours, setHours] = useState(24);
  const [mode, setMode] = useState<'totals' | 'change'>('totals');
  const [focus, setFocus] = useState(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/status', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then(status => setConfigured(status.configured)).catch(() => {});
    return () => { controller.abort(); request.current?.abort(); };
  }, []);
  async function load(id: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(''); setLoading(true);
    try {
      const response = await fetch(`/api/posts/${id}`, { signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load the post.');
      if (controller !== request.current) return;
      setData(payload); setConfigured(true); setFocus(payload.snapshots.length - 1);
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : 'Could not load this post. Check your connection.');
    } finally { if (controller === request.current) setLoading(false); }
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const post = parsePostUrl(input);
    if (!post) { setError('Enter a valid HTTPS X post link, such as https://x.com/username/status/123456789.'); return; }
    setData(null); setMode('totals'); void load(post.id);
  }
  function toggle(kind: Kind) { setActive(current => current.includes(kind) ? current.filter(k => k !== kind) : [...current, kind]); }
  const allRows = chartRows(data?.snapshots ?? [], mode);
  const latestTime = Date.parse(allRows.at(-1)?.observedAt ?? '');
  const rows = allRows.filter(row => Date.parse(row.observedAt) >= latestTime - hours * 3_600_000);
  const selected = rows[Math.min(focus, rows.length - 1)];
  const values = rows.flatMap(row => active.map(kind => row.counts[kind]).filter((v): v is number => v !== null));
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const span = Math.max(1, maximum - minimum);
  const start = Date.parse(rows[0]?.observedAt ?? '');
  const end = Date.parse(rows.at(-1)?.observedAt ?? '');
  const x = (time: string) => rows.length === 1 ? 474 : 64 + (Date.parse(time) - start) / Math.max(1, end - start) * 820;
  const y = (value: number) => 275 - (value - minimum) / span * 235;
  const latest = data?.snapshots.at(-1);
  function previousTime(time: string) {
    const index = data!.snapshots.findIndex(row => row.observedAt === time);
    return index > 0 ? date(data!.snapshots[index - 1].observedAt) : 'Unavailable';
  }
  return <div className="app">
    <header><a className="logo" href="#">xpoze<span>↗</span></a><span className="header-label">POST INTELLIGENCE</span><span className="prototype"><i style={{ background: configured ? '#a9efbb' : '#ffc88a' }} />{configured === null ? 'Checking X API setup' : configured ? 'X API configured' : 'X API setup required'}</span></header>
    <main>
      <div className="intro"><div><div className="eyebrow">EVERY POST HAS A STORY</div><h1>See how the conversation unfolds.</h1><p>One post. Real interactions. A clearer picture of momentum.</p></div><span className="edition">01 / TIMELINE</span></div>
      <form onSubmit={submit} className="link-form"><span aria-hidden="true">↗</span><label className="sr-only" htmlFor="post-link">X post link</label><input id="post-link" value={input} onChange={event => setInput(event.target.value)} placeholder="Paste an X post link…" aria-describedby="data-note" aria-invalid={!!error} /><button type="submit" disabled={loading}>{loading ? 'Loading post…' : 'Analyze post'} <span>→</span></button></form>
      <div className="sample-note" id="data-note"><span className="badge">REAL DATA</span><span>Counts come from X. The timeline starts with the first observation; refresh to collect another.</span></div>
      {configured === false && <div className="setup"><strong>Connect your X API access</strong><p>Add <code>X_BEARER_TOKEN</code> to a local <code>.env</code> file using <code>.env.example</code>, then restart the server. Your token stays on the server.</p></div>}
      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p role="status" className="loading-note">Retrieving the post and its latest public interaction counts…</p>}
      {!data && !loading && <section className="empty-state"><span className="eyebrow">START WITH A POST</span><h2>Your timeline begins here.</h2><p>Paste a post link above to load its author, text, and interaction totals. Saved observations build a timeline as you return and refresh.</p><div className="empty-kinds">{kinds.map(kind => <span key={kind}><i style={{ background: colors[kind] }} />{kind}</span>)}</div><small>Earlier interaction history cannot be reconstructed from today’s counts.</small></section>}
      {data && latest && <>
        <div className="result-top"><a href={data.post.url} target="_blank" rel="noreferrer">Open post on X ↗</a><button disabled={loading} onClick={() => void load(data.post.id)}>Refresh counts ↻</button></div>
        <section className="overview" aria-label="Post and interaction totals"><article className="post-card"><div className="post-head"><span className="avatar">{data.post.author?.name.slice(0, 1) ?? '?'}</span><div><strong>{data.post.author?.name ?? 'Author unavailable'}</strong><small>{data.post.author ? `@${data.post.author.username}` : 'Author information was not returned'}</small></div><span className="x-mark">𝕏</span></div><p className="post-text">{data.post.text}</p><div className="post-foot"><span>{data.post.createdAt ? `${date(data.post.createdAt)} UTC` : 'Publication time unavailable'}</span><span>Post {data.post.id}</span></div></article><div className="metrics">{kinds.map((kind, index) => <article className="metric" key={kind}><span className="metric-name"><i style={{ background: colors[kind] }} />{kind}<span>{['♡', '⇄', '◯', '❞'][index]}</span></span><strong>{number(latest.counts[kind])}</strong><small>Latest public count from X</small></article>)}</div></section>
        <div className="observation-note" role="status">Observed {date(latest.observedAt)} UTC · {data.snapshots.length} saved observation{data.snapshots.length === 1 ? '' : 's'}{data.cached ? ' · Using recent cached data' : ''}. A new X lookup is available after {date(data.nextRefreshAt)} UTC.</div>
        <section className="timeline"><div className="section-top"><div><h2>Interaction timeline <span>UTC</span></h2><p>{mode === 'totals' ? 'Public counts at each recorded observation' : 'Net count change since the preceding recorded observation'}</p></div><div className="range" aria-label="Time range">{[6, 12, 24].map(value => <button key={value} aria-pressed={hours === value} onClick={() => { setHours(value); setFocus(0); }}>Last {value}h</button>)}</div></div>
          <div className="chart-controls"><div className="legend">{kinds.map(kind => <button key={kind} aria-pressed={active.includes(kind)} onClick={() => toggle(kind)} className={active.includes(kind) ? '' : 'disabled'}><i style={{ background: colors[kind] }} />{kind}</button>)}</div><label className="mode"><span>View</span><select value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="totals">Count totals</option><option value="change">Interval net change</option></select></label></div>
          {rows.length < 2 && <div className="history-note">Only one observation is available. Refresh after the cache window to add another point. Earlier history is unavailable.</div>}
          <div className="chart-wrap"><svg viewBox="0 0 920 325" role="img" aria-label={`Real ${mode === 'totals' ? 'interaction totals' : 'interval net changes'} from ${rows.length} observations. Use the observation slider or table below to inspect values.`}>
            {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="64" x2="884" y1={y(minimum + span * tick / 4)} y2={y(minimum + span * tick / 4)} stroke="#e8ece8" strokeDasharray="3 5" /><text x="52" y={y(minimum + span * tick / 4) + 4} textAnchor="end">{number(Math.round(minimum + span * tick / 4))}</text></g>)}
            {active.map(kind => <g key={kind}>{rows.map((row, index) => {
              const previous = rows[index - 1]; const value = row.counts[kind];
              if (value === null) return null;
              return <g key={row.observedAt}>{previous && previous.counts[kind] !== null && <line x1={x(previous.observedAt)} y1={y(previous.counts[kind]!)} x2={x(row.observedAt)} y2={y(value)} stroke={colors[kind]} strokeWidth="3" />}<circle cx={x(row.observedAt)} cy={y(value)} r="4" fill={colors[kind]} /></g>;
            })}</g>)}
            {selected && <line x1={x(selected.observedAt)} x2={x(selected.observedAt)} y1="25" y2="275" stroke="#718277" strokeDasharray="4 5" />}
            {rows.length > 0 && <text x="64" y="306">{date(rows[0].observedAt)}</text>}{rows.length > 1 && <text x="884" y="306" textAnchor="end">{date(rows.at(-1)!.observedAt)}</text>}
          </svg>{active.length === 0 && <div className="chart-empty">Choose an interaction type to show its timeline.</div>}{mode === 'change' && rows.every(row => active.every(kind => row.counts[kind] === null)) && active.length > 0 && <div className="chart-empty">Net change needs two available count observations.</div>}</div>
          {selected && <div className="inspection"><label htmlFor="snapshot">Inspect observation <strong>{date(selected.observedAt)} UTC</strong></label><input id="snapshot" type="range" min="0" max={Math.max(0, rows.length - 1)} value={Math.min(focus, rows.length - 1)} disabled={rows.length < 2} onChange={event => setFocus(Number(event.target.value))} /><div className="inspection-values" aria-live="polite">{active.map(kind => <span key={kind}><i style={{ background: colors[kind] }} />{kind} <strong>{number(selected.counts[kind])}</strong></span>)}</div></div>}
          <div className="coverage"><span>ⓘ</span><p><strong>Know what you’re seeing.</strong> These are count observations, not individual interaction timestamps. Interval changes are net changes and can be negative. Connecting lines show changes between observations; they do not reveal activity within each interval. Observation times are when the server received X’s response.</p></div>
          <details><summary>View timeline data table</summary><div className="table-scroll"><table><caption>Real {mode === 'totals' ? 'counts' : 'interval net changes'} · UTC · current filters</caption><thead><tr><th scope="col">Observed at (UTC)</th>{mode === 'change' && <th scope="col">Interval starts (UTC)</th>}{active.map(kind => <th scope="col" key={kind}>{kind}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.observedAt}><th scope="row">{date(row.observedAt)}</th>{mode === 'change' && <td>{previousTime(row.observedAt)}</td>}{active.map(kind => <td key={kind}>{number(row.counts[kind])}</td>)}</tr>)}</tbody></table></div></details>
        </section>
      </>}
      <section className="bottom"><div><span className="eyebrow">OBSERVE THE MOMENTUM</span><h3>Build the story over time.</h3><p>Refresh a post to save another observation. Public counts may rise or fall as interactions change. Missing observations remain unavailable.</p></div><div className="future"><span className="badge">FUTURE EXPLORATION</span><h3>Where does a post travel?</h3><p>Geographic spread is a possible next chapter. Location signals, coverage, and uncertainty need further product development.</p><span className="future-link">Geographic spread · Planned exploration</span></div></section>
    </main><footer><span>xpoze · Turn interactions into perspective.</span><span>Source: X API · Observed counts</span></footer>
  </div>;
}
