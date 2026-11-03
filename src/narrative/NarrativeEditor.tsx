import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  chapters,
  initialEdges,
  initialNodes,
  type AssetStatus,
  type NodeType,
  type StoryEdge,
  type StoryNode
} from "./storyData";

type Viewport = { x: number; y: number; zoom: number };
type DragState = { id: string; offsetX: number; offsetY: number } | null;
type PanState = { startX: number; startY: number; originX: number; originY: number } | null;

const STORAGE_KEY = "after-broadcast-narrative-blueprint-v8";
const NODE_WIDTH = 300;
const NODE_HEIGHT = 174;
const WORLD_WIDTH = 4900;
const WORLD_HEIGHT = 2400;

const typeMeta: Record<NodeType, { label: string; short: string }> = {
  story: { label: "剧情节点", short: "剧情" },
  interaction: { label: "交互节点", short: "交互" },
  evidence: { label: "证据节点", short: "证据" },
  ending: { label: "结局节点", short: "结局" }
};

const assetStatusMeta: Record<AssetStatus, { label: string; short: string }> = {
  "new-runtime": { label: "待制作 Runtime", short: "新增 RUNTIME" },
  "new-pre": { label: "待制作 Pre", short: "新增 PRE" }
};

function readInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nodes: initialNodes, edges: initialEdges };
    const parsed = JSON.parse(raw) as { nodes?: StoryNode[]; edges?: StoryEdge[] };
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return { nodes: initialNodes, edges: initialEdges };
    }
    return { nodes: parsed.nodes, edges: parsed.edges };
  } catch {
    return { nodes: initialNodes, edges: initialEdges };
  }
}

function Icon({
  name,
  size = 16
}: {
  name: "plus" | "save" | "export" | "import" | "reset" | "trash" | "fit" | "zoomIn" | "zoomOut" | "link";
  size?: number;
}) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    save: <path d="M5 4h12l3 3v13H4V4h1Zm3 0v6h8V4M8 20v-6h8v6" />,
    export: <path d="M12 3v12m0-12 4 4m-4-4L8 7M5 13v7h14v-7" />,
    import: <path d="M12 16V4m0 12 4-4m-4 4-4-4M5 20h14" />,
    reset: <path d="M5 7h5V2M5.8 6.2A8 8 0 1 1 4 14" />,
    trash: <path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6" />,
    fit: <path d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5" />,
    zoomIn: <path d="M11 7v8M7 11h8m4 8-4-4m1-4a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />,
    zoomOut: <path d="M7 11h8m4 8-4-4m1-4a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />,
    link: <path d="M10 13a4 4 0 0 0 5.7 0l2.3-2.3A4 4 0 0 0 12.3 5L11 6.3m3 4.7a4 4 0 0 0-5.7 0L6 13.3A4 4 0 1 0 11.7 19l1.3-1.3" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}

function edgePath(from: StoryNode, to: StoryNode) {
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_HEIGHT / 2;
  const distance = Math.max(90, Math.abs(x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + distance} ${y1}, ${x2 - distance} ${y2}, ${x2} ${y2}`;
}

export default function NarrativeEditor() {
  const initial = useMemo(readInitialState, []);
  const [nodes, setNodes] = useState<StoryNode[]>(initial.nodes);
  const [edges, setEdges] = useState<StoryEdge[]>(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initial.nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState("prologue");
  const [viewport, setViewport] = useState<Viewport>({ x: 70, y: 48, zoom: 0.78 });
  const [dragging, setDragging] = useState<DragState>(null);
  const [panning, setPanning] = useState<PanState>(null);
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("已载入本地蓝图");
  const canvasRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const normalizedSearch = search.trim().toLowerCase();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
      setStatus("更改已自动保存");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [nodes, edges]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveNow();
        return;
      }
      if (!typing && (event.key === "Delete" || event.key === "Backspace")) deleteSelection();
      if (event.key === "Escape") {
        setLinkingFrom(null);
        setStatus("已取消连线");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function saveNow() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    setStatus(`已保存 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
  }

  function updateNode(id: string, patch: Partial<StoryNode>) {
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, ...patch } : node)));
  }

  function addNode() {
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = rect ? (rect.width / 2 - viewport.x) / viewport.zoom : 400;
    const centerY = rect ? (rect.height / 2 - viewport.y) / viewport.zoom : 300;
    const id = `node-${Date.now()}`;
    const next: StoryNode = {
      id,
      code: "NEW-NODE",
      title: "未命名剧情节点",
      type: "story",
      chapter: activeChapter,
      description: "在右侧检视器中填写该节点发生的剧情。",
      notes: "",
      x: Math.round(centerX / 20) * 20,
      y: Math.round(centerY / 20) * 20
    };
    setNodes((current) => [...current, next]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setStatus("已创建节点，拖动端口可建立关系");
  }

  function deleteSelection() {
    if (selectedNodeId) {
      setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
      setEdges((current) => current.filter((edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId));
      setSelectedNodeId(null);
      setStatus("节点及关联线路已删除");
      return;
    }
    if (selectedEdgeId) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      setStatus("线路已删除");
    }
  }

  function resetBlueprint() {
    if (!window.confirm("恢复内置剧情蓝图？当前本地编辑内容会被覆盖。")) return;
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId(initialNodes[0].id);
    setSelectedEdgeId(null);
    setViewport({ x: 70, y: 48, zoom: 0.78 });
    setStatus("已恢复内置剧情蓝图");
  }

  function exportBlueprint() {
    const payload = JSON.stringify(
      {
        title: "停播之后：零号频道",
        exportedAt: new Date().toISOString(),
        nodes,
        edges
      },
      null,
      2
    );
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `停播之后-剧情蓝图-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("蓝图 JSON 已导出");
  }

  function importBlueprint(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as { nodes?: StoryNode[]; edges?: StoryEdge[] };
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error("文件缺少 nodes 或 edges。");
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        setSelectedNodeId(parsed.nodes[0]?.id ?? null);
        setSelectedEdgeId(null);
        setStatus(`已导入 ${parsed.nodes.length} 个节点`);
      })
      .catch((error: unknown) => {
        window.alert(`无法导入蓝图：${error instanceof Error ? error.message : "文件格式错误"}`);
      });
  }

  function worldPoint(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: (clientX - (rect?.left ?? 0) - viewport.x) / viewport.zoom,
      y: (clientY - (rect?.top ?? 0) - viewport.y) / viewport.zoom
    };
  }

  function beginNodeDrag(event: ReactPointerEvent<HTMLElement>, node: StoryNode) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-port]")) return;
    event.stopPropagation();
    const point = worldPoint(event.clientX, event.clientY);
    setDragging({ id: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y });
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setActiveChapter(node.chapter);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveNode(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging) return;
    const point = worldPoint(event.clientX, event.clientY);
    updateNode(dragging.id, {
      x: Math.round((point.x - dragging.offsetX) / 10) * 10,
      y: Math.round((point.y - dragging.offsetY) / 10) * 10
    });
  }

  function endNodeDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(null);
  }

  function beginPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as Element;
    if (event.button === 0 && target.closest(".story-node, .edge-hit, button, input, textarea, select")) return;
    event.preventDefault();
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setPanning({
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!panning) return;
    setViewport((current) => ({
      ...current,
      x: panning.originX + event.clientX - panning.startX,
      y: panning.originY + event.clientY - panning.startY
    }));
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPanning(null);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const nextZoom = Math.min(1.45, Math.max(0.3, viewport.zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
    const worldX = (event.clientX - rect.left - viewport.x) / viewport.zoom;
    const worldY = (event.clientY - rect.top - viewport.y) / viewport.zoom;
    setViewport({
      zoom: nextZoom,
      x: event.clientX - rect.left - worldX * nextZoom,
      y: event.clientY - rect.top - worldY * nextZoom
    });
  }

  function zoomBy(factor: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = Math.min(1.45, Math.max(0.3, viewport.zoom * factor));
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (centerX - viewport.x) / viewport.zoom;
    const worldY = (centerY - viewport.y) / viewport.zoom;
    setViewport({ zoom: next, x: centerX - worldX * next, y: centerY - worldY * next });
  }

  function fitView(targetNodes = nodes) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || targetNodes.length === 0) return;
    const minX = Math.min(...targetNodes.map((node) => node.x));
    const minY = Math.min(...targetNodes.map((node) => node.y));
    const maxX = Math.max(...targetNodes.map((node) => node.x + NODE_WIDTH));
    const maxY = Math.max(...targetNodes.map((node) => node.y + NODE_HEIGHT));
    const zoom = Math.min(1.05, Math.max(0.3, Math.min((rect.width - 120) / (maxX - minX), (rect.height - 120) / (maxY - minY))));
    setViewport({
      zoom,
      x: rect.width / 2 - ((minX + maxX) / 2) * zoom,
      y: rect.height / 2 - ((minY + maxY) / 2) * zoom
    });
  }

  function focusChapter(chapterId: string) {
    setActiveChapter(chapterId);
    const chapterNodes = nodes.filter((node) => node.chapter === chapterId);
    fitView(chapterNodes);
  }

  function clickPort(nodeId: string, direction: "in" | "out") {
    if (direction === "out") {
      setLinkingFrom(nodeId);
      setSelectedNodeId(nodeId);
      setStatus("连线模式：点击目标节点左侧输入端口");
      return;
    }
    if (!linkingFrom || linkingFrom === nodeId) return;
    const exists = edges.some((edge) => edge.from === linkingFrom && edge.to === nodeId);
    if (!exists) {
      setEdges((current) => [
        ...current,
        { id: `edge-${linkingFrom}-${nodeId}-${Date.now()}`, from: linkingFrom, to: nodeId }
      ]);
      setStatus("已建立节点线路");
    }
    setLinkingFrom(null);
  }

  return (
    <div className="blueprint-app">
      <header className="blueprint-topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div>
            <strong>剧情蓝图</strong>
            <small>停播之后：零号频道</small>
          </div>
        </div>
        <div className="topbar-status">
          <span className="status-light" />
          <span>{status}</span>
          <b>{nodes.length}</b> 节点
          <b>{edges.length}</b> 线路
        </div>
        <nav className="topbar-actions" aria-label="蓝图文件操作">
          <button type="button" onClick={addNode}><Icon name="plus" />新增节点</button>
          <button type="button" onClick={saveNow}><Icon name="save" />保存</button>
          <button type="button" onClick={exportBlueprint}><Icon name="export" />导出 JSON</button>
          <button type="button" onClick={() => importRef.current?.click()}><Icon name="import" />导入</button>
          <button type="button" className="danger-action" onClick={resetBlueprint}><Icon name="reset" />重置</button>
          <input ref={importRef} type="file" accept="application/json" onChange={importBlueprint} hidden />
        </nav>
      </header>

      <aside className="chapter-sidebar">
        <label className="blueprint-search">
          <span>搜索节点</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="标题、ID 或内容…" />
        </label>
        <div className="sidebar-heading">
          <span>剧情章节</span>
          <small>点击定位</small>
        </div>
        <nav className="chapter-list">
          {chapters.map((chapter) => {
            const count = nodes.filter((node) => node.chapter === chapter.id).length;
            return (
              <button
                type="button"
                key={chapter.id}
                className={activeChapter === chapter.id ? "active" : ""}
                onClick={() => focusChapter(chapter.id)}
              >
                <span>{chapter.label}</span>
                <strong>{chapter.title}</strong>
                <em>{count}</em>
              </button>
            );
          })}
        </nav>
        <div className="node-legend">
          <span>节点类型</span>
          {(Object.keys(typeMeta) as NodeType[]).map((type) => (
            <div key={type}><i className={`legend-dot ${type}`} />{typeMeta[type].label}</div>
          ))}
          <div><i className="legend-swatch new-runtime" />待制作 Runtime</div>
          <div><i className="legend-swatch new-pre" />待制作 Pre</div>
        </div>
        <div className="sidebar-help">
          <strong>操作提示</strong>
          <p>拖动节点改变布局；滚轮缩放；拖动画布空白处平移。</p>
          <p>先点节点右侧端口，再点目标节点左侧端口，即可建立新线路。</p>
        </div>
      </aside>

      <section className="canvas-shell">
        <div className="canvas-toolbar">
          <label className="mobile-chapter-select">
            <span>章节</span>
            <select value={activeChapter} onChange={(event) => focusChapter(event.target.value)}>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>{chapter.label} · {chapter.title}</option>
              ))}
            </select>
          </label>
          <button type="button" aria-label="缩小" onClick={() => zoomBy(0.85)}><Icon name="zoomOut" /></button>
          <span>{Math.round(viewport.zoom * 100)}%</span>
          <button type="button" aria-label="放大" onClick={() => zoomBy(1.15)}><Icon name="zoomIn" /></button>
          <button type="button" aria-label="适合全部节点" onClick={() => fitView()}><Icon name="fit" /></button>
          <i />
          <span className={linkingFrom ? "linking active" : "linking"}><Icon name="link" />{linkingFrom ? "选择目标端口" : "端口连线"}</span>
        </div>
        <div
          ref={canvasRef}
          className={`blueprint-canvas ${panning ? "is-panning" : ""}`}
          data-canvas
          role="region"
          aria-label="剧情蓝图画布"
          tabIndex={0}
          onPointerDown={beginPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onWheel={handleWheel}
        >
          <div
            className="world"
            style={{
              width: WORLD_WIDTH,
              height: WORLD_HEIGHT,
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
            }}
          >
            <svg className="edge-layer" width={WORLD_WIDTH} height={WORLD_HEIGHT} aria-hidden="true">
              <defs>
                <marker id="edge-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                const selected = edge.id === selectedEdgeId;
                const d = edgePath(from, to);
                const labelX = (from.x + NODE_WIDTH + to.x) / 2;
                const labelY = (from.y + to.y) / 2 + NODE_HEIGHT / 2 - 9;
                return (
                  <g key={edge.id} className={`edge-group ${selected ? "selected" : ""}`}>
                    <path
                      className="edge-hit"
                      d={d}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                      }}
                    />
                    <path className="edge-line" d={d} markerEnd="url(#edge-arrow)" />
                    {edge.label && (
                      <text x={labelX} y={labelY} textAnchor="middle">
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {chapters.map((chapter) => {
              const chapterNodes = nodes.filter((node) => node.chapter === chapter.id);
              if (chapterNodes.length === 0) return null;
              const minX = Math.min(...chapterNodes.map((node) => node.x));
              const minY = Math.min(...chapterNodes.map((node) => node.y));
              return (
                <div
                  key={chapter.id}
                  className="chapter-flag"
                  style={{ left: minX, top: Math.max(22, minY - 54) }}
                >
                  <span>{chapter.label}</span>{chapter.title}
                </div>
              );
            })}

            {nodes.map((node) => {
              const selected = node.id === selectedNodeId;
              const dimmed =
                normalizedSearch.length > 0 &&
                !`${node.code} ${node.title} ${node.description} ${node.storyboard ?? ""}`.toLowerCase().includes(normalizedSearch);
              return (
                <article
                  key={node.id}
                  className={`story-node ${node.type} ${node.assetStatus ?? ""} ${selected ? "selected" : ""} ${dimmed ? "dimmed" : ""}`}
                  style={{ left: node.x, top: node.y }}
                  onPointerDown={(event) => beginNodeDrag(event, node)}
                  onPointerMove={moveNode}
                  onPointerUp={endNodeDrag}
                  onPointerCancel={endNodeDrag}
                >
                  <button
                    type="button"
                    className="node-port in"
                    data-port
                    aria-label={`连接到 ${node.title}`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      clickPort(node.id, "in");
                    }}
                  />
                  <button
                    type="button"
                    className={`node-port out ${linkingFrom === node.id ? "armed" : ""}`}
                    data-port
                    aria-label={`从 ${node.title} 开始连线`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      clickPort(node.id, "out");
                    }}
                  />
                  <header>
                    <span>{node.assetStatus ? assetStatusMeta[node.assetStatus].short : typeMeta[node.type].short}</span>
                    <code>{node.code}</code>
                  </header>
                  <h3>{node.title}</h3>
                  <p>{node.description}</p>
                  {node.notes && <footer>{node.notes}</footer>}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="inspector">
        <header>
          <div>
            <span>属性检视器</span>
            <strong>{selectedNode ? "节点" : selectedEdge ? "线路" : "未选择"}</strong>
          </div>
          {(selectedNode || selectedEdge) && (
            <button type="button" className="icon-danger" aria-label="删除所选" onClick={deleteSelection}>
              <Icon name="trash" />
            </button>
          )}
        </header>

        {selectedNode ? (
          <form className="inspector-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              <span>节点标题</span>
              <input value={selectedNode.title} onChange={(event) => updateNode(selectedNode.id, { title: event.target.value })} />
            </label>
            <div className="field-row">
              <label>
                <span>节点 ID</span>
                <input value={selectedNode.code} onChange={(event) => updateNode(selectedNode.id, { code: event.target.value })} />
              </label>
              <label>
                <span>类型</span>
                <select
                  value={selectedNode.type}
                  onChange={(event) => updateNode(selectedNode.id, { type: event.target.value as NodeType })}
                >
                  {(Object.keys(typeMeta) as NodeType[]).map((type) => (
                    <option key={type} value={type}>{typeMeta[type].label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>所属章节</span>
              <select
                value={selectedNode.chapter}
                onChange={(event) => {
                  updateNode(selectedNode.id, { chapter: event.target.value });
                  setActiveChapter(event.target.value);
                }}
              >
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.label} · {chapter.title}</option>
                ))}
              </select>
            </label>
            <label>
              <span>视频制作状态</span>
              <select
                value={selectedNode.assetStatus ?? ""}
                onChange={(event) =>
                  updateNode(selectedNode.id, {
                    assetStatus: (event.target.value || undefined) as AssetStatus | undefined
                  })
                }
              >
                <option value="">现有节点 / 非视频节点</option>
                {(Object.keys(assetStatusMeta) as AssetStatus[]).map((status) => (
                  <option key={status} value={status}>{assetStatusMeta[status].label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>剧情内容</span>
              <textarea
                rows={6}
                value={selectedNode.description}
                onChange={(event) => updateNode(selectedNode.id, { description: event.target.value })}
              />
            </label>
            <label>
              <span>分镜概要</span>
              <textarea
                rows={5}
                value={selectedNode.storyboard ?? ""}
                onChange={(event) => updateNode(selectedNode.id, { storyboard: event.target.value })}
                placeholder="简述镜头顺序、主要动作和结束构图"
              />
            </label>
            <label>
              <span>交互条件 / 制作备注</span>
              <textarea
                rows={4}
                value={selectedNode.notes}
                onChange={(event) => updateNode(selectedNode.id, { notes: event.target.value })}
                placeholder="例如：玩家必须发送证据后才推进"
              />
            </label>
            <div className="position-fields">
              <label><span>X</span><input type="number" value={selectedNode.x} onChange={(event) => updateNode(selectedNode.id, { x: Number(event.target.value) })} /></label>
              <label><span>Y</span><input type="number" value={selectedNode.y} onChange={(event) => updateNode(selectedNode.id, { y: Number(event.target.value) })} /></label>
            </div>
            <div className="connection-list">
              <span>关联线路</span>
              {edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id).map((edge) => {
                const outgoing = edge.from === selectedNode.id;
                const other = nodeMap.get(outgoing ? edge.to : edge.from);
                return (
                  <button
                    type="button"
                    key={edge.id}
                    onClick={() => {
                      setSelectedNodeId(null);
                      setSelectedEdgeId(edge.id);
                    }}
                  >
                    <i>{outgoing ? "输出" : "输入"}</i>
                    <span>{other?.title ?? "缺失节点"}</span>
                  </button>
                );
              })}
            </div>
          </form>
        ) : selectedEdge ? (
          <form className="inspector-form" onSubmit={(event) => event.preventDefault()}>
            <div className="edge-summary">
              <span>{nodeMap.get(selectedEdge.from)?.title ?? selectedEdge.from}</span>
              <b>→</b>
              <span>{nodeMap.get(selectedEdge.to)?.title ?? selectedEdge.to}</span>
            </div>
            <label>
              <span>线路条件</span>
              <input
                value={selectedEdge.label ?? ""}
                placeholder="例如：发送证据 / 立即离开"
                onChange={(event) =>
                  setEdges((current) =>
                    current.map((edge) => edge.id === selectedEdge.id ? { ...edge, label: event.target.value } : edge)
                  )
                }
              />
            </label>
            <p className="inspector-note">线路条件会直接显示在蓝图连线上。删除线路不会删除两端节点。</p>
          </form>
        ) : (
          <div className="inspector-empty">
            <Icon name="link" size={30} />
            <strong>选择一个节点或线路</strong>
            <p>节点内容、类型、章节和坐标都可以在这里直接编辑。</p>
          </div>
        )}
      </aside>
    </div>
  );
}
