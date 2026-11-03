import { FormEvent, useEffect, useRef, useState } from 'react';
import './gmRuntime.css';

const nodes = [
  ['RT-00', '大厅 · 林岚'], ['RT-01', '调查路线 · 林岚'],
  ['RT-02', '控制室验证 · 林岚'], ['RT-02B', '用户名记录 · 未来林岚'],
  ['RT-03', '旧录像 · 林秋'], ['RT-05', '信任判断 · 林岚'], ['RT-06', '最终决定 · 林岚']
];
type Turn = { role: 'user' | 'assistant'; content: string };
type Job = { id: string; status: string; phase?: string; progress: number; reply: string;
  intent: string; advance?: boolean; dialogueModel?: string; videoUrl: string | null; error: string | null };
type Run = { message: string; node: string; job: Job };

export function GmRuntime() {
  const [node, setNode] = useState('RT-00');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [breaker, setBreaker] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const history = useRef<Record<string, Turn[]>>({});
  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || locked.current) return;
    locked.current = true;
    setBusy(true); setError(''); setJob(null); setSelected(null);
    const abort = new AbortController();
    controller.current = abort;
    const deadline = Date.now() + 13 * 60 * 1000;
    try {
      const response = await fetch('/api/videos', {
        method: 'POST', signal: abort.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: node, message, history: history.current[node] || [],
          evidenceTags: node === 'RT-02' && breaker ? ['BREAKER_MAP'] : [] })
      });
      let next: Job = await response.json();
      if (!response.ok) throw new Error(next.error || '无法提交生成任务');
      setJob(next);
      while (!['completed', 'failed'].includes(next.status)) {
        if (Date.now() > deadline) throw new Error('等待已超过13分钟，请检查后台任务状态。');
        await new Promise<void>((resolve, reject) => {
          const stop = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
          const timer = window.setTimeout(() => { abort.signal.removeEventListener('abort', stop); resolve(); }, 2000);
          abort.signal.addEventListener('abort', stop, { once: true });
          if (abort.signal.aborted) stop();
        });
        const poll = await fetch(`/api/videos/${encodeURIComponent(next.id)}`, { signal: abort.signal });
        next = await poll.json();
        if (!poll.ok) throw new Error(next.error || '查询任务失败');
        setJob(next);
      }
      if (next.status === 'failed' || !next.videoUrl) throw new Error(next.error || '没有返回视频');
      const run = { node, message, job: next };
      setSelected(run);
      setRuns(current => [run, ...current].slice(0, 20));
      history.current[node] = [...(history.current[node] || []),
        { role: 'user' as const, content: message }, { role: 'assistant' as const, content: next.reply }
      ].slice(-12);
      setTurnCount(history.current[node].length / 2);
      setInput('');
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : '生成失败');
    } finally {
      locked.current = false;
      if (!abort.signal.aborted) { setBusy(false); inputRef.current?.focus(); }
    }
  }

  const shown = selected?.job || job;
  return <main className="gm-runtime">
    <header><div><span>零号频道 / GM</span><h1>实时对话测试台</h1></div><a href="/">返回游戏</a></header>
    <p>固定在你选择的场景中连续对话，每次直接播放新生成的视频。不会推进主线或修改游戏存档。</p>
    <div className="gm-runtime-grid">
      <section aria-label="输入与生成">
        <form onSubmit={send}>
          <label htmlFor="gm-node">剧情节点</label>
          <select id="gm-node" disabled={busy} value={node} onChange={event => {
            setNode(event.target.value); setJob(null); setSelected(null); setError('');
            setTurnCount((history.current[event.target.value]?.length || 0) / 2);
          }}>{nodes.map(([id, label]) => <option key={id} value={id}>{id} · {label}</option>)}</select>
          {node === 'RT-02' && <label className="gm-check"><input type="checkbox" disabled={busy} checked={breaker}
            onChange={event => setBreaker(event.target.checked)} />已取得 C-04 检修记录</label>}
          <label htmlFor="gm-message">输入你想说的话</label>
          <textarea ref={inputRef} id="gm-message" value={input} maxLength={280} disabled={busy}
            onChange={event => setInput(event.target.value)} placeholder="例如：我陪着你，先别回头。你现在感觉怎么样？" />
          <div className="gm-actions"><button type="submit" disabled={busy || !input.trim()}>{busy ? '生成中…' : '发送并生成视频'}</button>
            <button type="button" disabled={busy} onClick={() => { history.current[node] = []; setTurnCount(0); }}>清空本节点对话</button></div>
          <small>保留最近 {turnCount} 轮对话 · 每次发送都会调用 AI 和 H3，可能产生接口费用。</small>
        </form>
        <div aria-live="polite">
          {busy && <><p>{job?.phase === 'reasoning' || !job ? 'AI 正在根据剧情组织回复…' : 'H3 正在生成音画视频…'}</p><progress max={100} value={job?.progress || 0} /></>}
          {error && <p role="alert" className="gm-error">{error} 输入已保留，可以重试。</p>}
          {shown?.reply && <div className="gm-reply"><h2>AI 回复</h2><p>{shown.reply}</p>
            <small>{shown.intent} · 主线判断：{shown.advance ? '允许推进（测试台保持当前节点）' : '继续对话'} · {shown.dialogueModel || 'AI'}</small></div>}
        </div>
      </section>
      <section aria-label="生成视频">
        <div className="gm-video">{selected?.job.videoUrl
          ? <video key={selected.job.id} src={selected.job.videoUrl} controls autoPlay playsInline onError={() => setError('视频加载失败，请打开原视频检查。')} />
          : <p>{busy ? '视频生成完成后会显示在这里' : '等待你的第一条对话'}</p>}</div>
        {selected && <><p>输入：{selected.message}</p><small>{selected.node} · 任务 {selected.job.id}</small>
          <p><a href={selected.job.videoUrl!} target="_blank" rel="noreferrer">打开原视频</a> · 如未自动播放，请点击播放按钮。</p></>}
        <h2>本次测试记录</h2>
        {runs.length === 0 ? <p>成功生成的最近20条视频会保留在这里。</p> : <ol className="gm-history">{runs.map(run => <li key={run.job.id}>
          <button disabled={busy} onClick={() => { setSelected(run); setError(''); }} aria-pressed={selected?.job.id === run.job.id}>{run.node} · {run.message}</button>
        </li>)}</ol>}
      </section>
    </div>
  </main>;
}
