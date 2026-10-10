import { useState } from 'react';
import { chartRows, colors, kinds, parsePostUrl, snapshots, type Kind } from './model';

const number = (n: number) => n.toLocaleString('en-US');
const clock = (hour: number) => `${String((9 + hour) % 24).padStart(2, '0')}:00${hour >= 15 ? ' +1d' : ''}`;
export default function App() {
  const [input, setInput] = useState('');
  const [post, setPost] = useState<ReturnType<typeof parsePostUrl>>(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState<Kind[]>([...kinds]);
  const [hours, setHours] = useState(24);
  const [mode, setMode] = useState<'totals' | 'change'>('totals');
  const [focus, setFocus] = useState(13);
  const rows = chartRows(hours, mode);
  const visibleFocus = Math.min(focus, hours);
  const max = Math.max(1, ...rows.flatMap(row => active.map(kind => row.counts[kind] ?? 0)));
  const ceiling = Math.ceil(max / (max > 1000 ? 2000 : 100)) * (max > 1000 ? 2000 : 100);
  const x = (h: number) => 64 + h / hours * 820;
  const y = (n: number) => 275 - n / ceiling * 235;
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = parsePostUrl(input);
    if (!result) { setError('Enter a valid HTTPS X post link, such as https://x.com/username/status/123456789.'); return; }
    setPost(result); setError(''); setFocus(13); setHours(24);
  }
  function toggle(kind: Kind) { setActive(current => current.includes(kind) ? current.filter(k => k !== kind) : [...current, kind]); }
  return <div className="app">
    <header><a className="logo" href="#">xpoze<span>↗</span></a><span className="header-label">POST INTELLIGENCE</span><span className="prototype"><i/> Interactive prototype</span></header>
    <main>
      <div className="intro"><div><div className="eyebrow">EVERY POST HAS A STORY</div><h1>See how the conversation unfolds.</h1><p>One post. Every interaction. A clearer picture of momentum.</p></div><span className="edition">01 / TIMELINE</span></div>
      <form onSubmit={submit} className="link-form"><span aria-hidden="true">↗</span><label className="sr-only" htmlFor="post-link">X post link</label><input id="post-link" type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Paste an X post link…" aria-describedby="sample-note" aria-invalid={!!error}/><button type="submit">Explore sample timeline <span>→</span></button></form>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="sample-note" id="sample-note"><span className="badge">SAMPLE DATA</span><span>Explore a synthetic 24-hour story. Links are validated locally; no X data is fetched.</span></div>
      {post && <div className="submitted" role="status">Sample view for post ID <strong>{post.id}</strong> · <a href={post.url} target="_blank" rel="noreferrer">Open submitted post ↗</a><br/><span>The post preview and every value below remain fictional sample data.</span></div>}
      <section className="overview" aria-label="Sample post and interaction totals"><article className="post-card"><div className="post-head"><span className="avatar">S</span><div><strong>Studio Notes</strong><small>@studio_notes · Fictional post</small></div><span className="x-mark">𝕏</span></div><p>Small ideas can start big conversations.<br/>What’s one thing you’re building that you wish existed?</p><div className="post-foot">Oct 9, 2026 · 09:00 UTC <span>Sample post</span></div></article><div className="metrics">{kinds.map((kind, index) => <article className="metric" key={kind}><span className="metric-name"><i style={{ background: colors[kind] }}/>{kind}<span>{['♡', '⇄', '◯', '❞'][index]}</span></span><strong>{number(snapshots[hours].counts[kind])}</strong><small>Synthetic total at +{hours}h</small></article>)}</div></section>
      <section className="timeline"><div className="section-top"><div><h2>Interaction timeline <span>UTC</span></h2><p>{mode === 'totals' ? 'Observed totals at each sample snapshot' : 'Net count change between hourly sample snapshots'}</p></div><div className="range" aria-label="Time range">{[6, 12, 24].map(n => <button key={n} aria-pressed={hours === n} onClick={() => setHours(n)}>{n}h</button>)}</div></div>
        <div className="chart-controls"><div className="legend">{kinds.map(kind => <button key={kind} aria-pressed={active.includes(kind)} onClick={() => toggle(kind)} className={active.includes(kind) ? '' : 'disabled'}><i style={{ background: colors[kind] }}/>{kind}</button>)}</div><label className="mode"><span>View</span><select value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="totals">Count totals</option><option value="change">Hourly net change</option></select></label></div>
        <div className="chart-wrap"><svg viewBox="0 0 920 325" role="img" aria-label={`${mode === 'totals' ? 'Synthetic interaction totals' : 'Synthetic hourly net changes'} over ${hours} hours. Use the snapshot slider or table below for values.`}>
          {[0, 1, 2, 3, 4].map(t => <g key={t}><line x1="64" x2="884" y1={y(ceiling * t / 4)} y2={y(ceiling * t / 4)} stroke="#e8ece8" strokeDasharray="3 5"/><text x="52" y={y(ceiling * t / 4) + 4} textAnchor="end">{number(ceiling * t / 4)}</text></g>)}
          {[0, hours / 4, hours / 2, hours * 3 / 4, hours].map(h => <text key={h} x={x(h)} y="306" textAnchor="middle">+{h}h</text>)}
          {active.map(kind => <polyline key={kind} fill="none" stroke={colors[kind]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={rows.filter(row => row.counts[kind] !== null).map(row => `${x(row.hour)},${y(row.counts[kind]!)}`).join(' ')}/>)}
          <line x1={x(visibleFocus)} x2={x(visibleFocus)} y1="25" y2="275" stroke="#718277" strokeDasharray="4 5"/>
          {active.map(kind => rows[visibleFocus].counts[kind] !== null && <circle key={kind} cx={x(visibleFocus)} cy={y(rows[visibleFocus].counts[kind]!)} r="5" fill={colors[kind]} stroke="#fff" strokeWidth="2"/>)}
          {rows.map(row => <rect key={row.hour} x={Math.max(64, x(row.hour) - 820 / hours / 2)} y="20" width={820 / hours} height="255" fill="transparent" onMouseEnter={() => setFocus(row.hour)} onClick={() => setFocus(row.hour)}/>) }
        </svg>{active.length === 0 && <div className="chart-empty">Choose an interaction type to show its timeline.</div>}</div>
        <div className="inspection"><label htmlFor="snapshot">Inspect snapshot <strong>+{visibleFocus}h · {clock(visibleFocus)} UTC</strong></label><input id="snapshot" type="range" min="0" max={hours} value={visibleFocus} onChange={e => setFocus(Number(e.target.value))}/><div className="inspection-values" aria-live="polite">{active.map(kind => <span key={kind}><i style={{ background: colors[kind] }}/>{kind} <strong>{rows[visibleFocus].counts[kind] === null ? 'Unavailable' : number(rows[visibleFocus].counts[kind]!)}</strong></span>)}</div></div>
        <div className="coverage"><span>ⓘ</span><p><strong>Know what you’re seeing.</strong> Synthetic hourly count snapshots, not individual interaction timestamps. The first snapshot includes earlier engagement; its hourly change is unavailable. Live historical coverage will depend on the data source.</p></div>
        <details><summary>View timeline data table</summary><div className="table-scroll"><table><caption>Synthetic {mode === 'totals' ? 'totals' : 'net changes'} · UTC · current filters</caption><thead><tr><th scope="col">Time since first snapshot</th>{active.map(kind => <th scope="col" key={kind}>{kind}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.hour}><th scope="row">+{row.hour}h · {clock(row.hour)}</th>{active.map(kind => <td key={kind}>{row.counts[kind] === null ? 'Unavailable' : number(row.counts[kind]!)}</td>)}</tr>)}</tbody></table></div></details>
      </section>
      <section className="bottom"><div><span className="eyebrow">READ THE MOMENTUM</span><h3>A second wave at hour 13.</h3><p>In this sample, likes and reposts rise together after a quieter stretch. Explore hourly net changes to see the shift.</p><button onClick={() => { setHours(24); setMode('change'); setFocus(13); setActive([...kinds]); }}>Inspect the sample surge →</button></div><div className="future"><span className="badge">FUTURE EXPLORATION</span><h3>Where does a post travel?</h3><p>Geographic spread is a possible next chapter. Location signals, coverage, and uncertainty need further product development.</p><span className="future-link">Geographic spread · Planned exploration</span></div></section>
    </main><footer><span>xpoze · Turn interactions into perspective.</span><span>Sample data only · No live X connection</span></footer>
  </div>;
}

