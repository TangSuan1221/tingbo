import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./mainMenu.css";
import { CrtDefs, barrelFilterStyle, useElementSize } from "./crt";
import { ChapterId, SaveData, chapterById, chapters, formatSaveTime } from "./saveData";

const sceneImageUrl = "/media/runtime-references/WEB-G00-live-preview.jpg";

type MenuView = "menu" | "load" | "settings" | "exit" | "off";

type MainMenuProps = {
  saveData: SaveData;
  muted: boolean;
  onStart: () => void;
  onContinue: () => void;
  onLoad: (chapter: ChapterId) => void;
  onToggleMute: () => void;
  onClearSave: () => void;
};

type NavItem = {
  key: string;
  disabled?: boolean;
  action: () => void;
};

export function MainMenu({ saveData, muted, onStart, onContinue, onLoad, onToggleMute, onClearSave }: MainMenuProps) {
  const [view, setView] = useState<MenuView>("menu");
  const [cursor, setCursor] = useState(0);
  const [clearArmed, setClearArmed] = useState(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [bendRef, bendSize] = useElementSize<HTMLDivElement>();
  const latest = saveData.latest;
  const latestChapter = latest ? chapterById(latest.chapter) : null;

  const openView = useCallback((next: MenuView, nextCursor = 0) => {
    setView(next);
    setCursor(nextCursor);
    setClearArmed(false);
  }, []);

  const menuItems: Array<NavItem & { label: string; note?: string }> = useMemo(
    () => [
      { key: "start", label: "开始游戏", action: onStart },
      {
        key: "continue",
        label: "继续游戏",
        note: latestChapter ? `${latestChapter.act} · ${latestChapter.name}` : "暂无记录",
        disabled: !latest,
        action: onContinue
      },
      { key: "load", label: "读取记录", action: () => openView("load", firstRecordIndex(saveData)) },
      { key: "settings", label: "设置", action: () => openView("settings") },
      { key: "exit", label: "退出", action: () => openView("exit", 1) }
    ],
    [latest, latestChapter, onContinue, onStart, openView, saveData]
  );

  const loadItems: NavItem[] = chapters.map((chapter) => ({
    key: chapter.id,
    disabled: !saveData.records[chapter.id],
    action: () => onLoad(chapter.id)
  }));

  const settingsItems: NavItem[] = [
    { key: "sound", action: onToggleMute },
    {
      key: "clear",
      disabled: !latest,
      action: () => {
        if (!clearArmed) {
          setClearArmed(true);
          return;
        }
        onClearSave();
        setClearArmed(false);
      }
    },
    { key: "back", action: () => openView("menu", 3) }
  ];

  const exitItems: NavItem[] = [
    {
      key: "confirm",
      action: () => {
        window.close();
        openView("off");
      }
    },
    { key: "cancel", action: () => openView("menu", 4) }
  ];

  const items =
    view === "menu" ? menuItems : view === "load" ? loadItems : view === "settings" ? settingsItems : view === "exit" ? exitItems : [];

  const goBack = useCallback(() => {
    if (view === "load") openView("menu", 2);
    else if (view === "settings") openView("menu", 3);
    else if (view === "exit" || view === "off") openView("menu", 4);
  }, [openView, view]);

  useEffect(() => {
    if (view === "off") {
      const wake = () => openView("menu", 0);
      const timer = window.setTimeout(() => {
        window.addEventListener("keydown", wake, { once: true });
        window.addEventListener("pointerdown", wake, { once: true });
      }, 900);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("keydown", wake);
        window.removeEventListener("pointerdown", wake);
      };
    }

    function move(direction: 1 | -1) {
      if (!items.length) return;
      let next = cursor;
      for (let step = 0; step < items.length; step += 1) {
        next = (next + direction + items.length) % items.length;
        if (!items[next].disabled) break;
      }
      setCursor(next);
      itemRefs.current[next]?.focus();
    }

    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea")) return;
      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "Escape" || event.key === "Backspace") {
        event.preventDefault();
        goBack();
      } else if ((event.key === "Enter" || event.key === " ") && !target?.closest("button")) {
        event.preventDefault();
        const item = items[cursor];
        if (item && !item.disabled) item.action();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cursor, goBack, items, openView, view]);

  const bindItem = (index: number) => ({
    ref: (node: HTMLButtonElement | null) => {
      itemRefs.current[index] = node;
    },
    onMouseEnter: () => {
      if (!items[index]?.disabled) setCursor(index);
    },
    onFocus: () => setCursor(index)
  });

  return (
    <article className={`mm mm-view-${view}`} aria-label="停播之后 主菜单">
      <CrtDefs width={bendSize.width} height={bendSize.height} />

      <div className="mm-tv">
        <div className="mm-screen">
          <div className="mm-scene" aria-hidden="true">
            <div className="mm-scene-bend" ref={bendRef} style={barrelFilterStyle(bendSize.width)}>
              <img className="mm-scene-wash" src={sceneImageUrl} alt="" />
              <div className="mm-scene-plate">
                <img src={sceneImageUrl} alt="" />
              </div>
              <div className="mm-scene-tint" />
              <div className="mm-scene-wordmark">QINGHE TV</div>
            </div>
            <div className="mm-scene-grain" />
            <div className="mm-scene-scan" />
            <div className="mm-scene-roll" />
            <div className="mm-scene-vignette" />
          </div>

          <header className="mm-meta" aria-hidden="true">
            <span className="mm-meta-status">
              <span className="mm-status-lamp" />
              <span>CH-00</span>
              <span className="mm-status-sep" />
              <span>信号待机</span>
            </span>
            <span>1997 — 2012</span>
            <span>QINGHE TELEVISION STATION</span>
          </header>

          <aside className="mm-epigraph" aria-hidden="true">
            <p>
              有些节目
              <br />
              从未真正停下
              <br />
              它只是换了一种方式
              <br />
              继续播放。
            </p>
          </aside>

          <div className="mm-column">
            <header className="mm-title">
              <h1>
                <span className="mm-title-print" data-text="停播之后">停播之后</span>
              </h1>
              <p>
                <span className="mm-title-rule" aria-hidden="true" />
                <span className="mm-title-sub">零号频道</span>
                <span className="mm-title-rule" aria-hidden="true" />
                <span className="mm-title-en">AFTER THE BROADCAST</span>
              </p>
            </header>

            {view === "menu" && (
              <nav className="mm-menu" aria-label="主菜单">
                {menuItems.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`mm-bar ${cursor === index ? "is-selected" : ""}`}
                    disabled={item.disabled}
                    onClick={item.action}
                    style={{ animationDelay: `${120 + index * 60}ms` }}
                    {...bindItem(index)}
                  >
                    <span className="mm-bar-label">{item.label}</span>
                    {item.note && <span className="mm-bar-note">{item.note}</span>}
                    <span className="mm-bar-mark" aria-hidden="true" />
                  </button>
                ))}
              </nav>
            )}

            {view === "load" && (
              <section className="mm-panel" aria-label="读取记录">
                <header className="mm-panel-head">
                  <strong>读取记录</strong>
                  <span>RECORDS · 自动记录于每一幕开始</span>
                </header>
                <ol className="mm-slots">
                  {chapters.map((chapter, index) => {
                    const record = saveData.records[chapter.id];
                    return (
                      <li key={chapter.id}>
                        <button
                          type="button"
                          className={`mm-slot ${cursor === index ? "is-selected" : ""}`}
                          disabled={!record}
                          onClick={() => onLoad(chapter.id)}
                          {...bindItem(index)}
                        >
                          <span className="mm-slot-no">{chapter.number}</span>
                          <span className="mm-slot-body">
                            <strong>
                              {chapter.act}
                              <em>{record ? chapter.name : "未录入"}</em>
                            </strong>
                            <small>
                              {record ? `${chapter.location} · 观众 ${record.username}` : "—— 信号未抵达 ——"}
                            </small>
                          </span>
                          <span className="mm-slot-time">{record ? formatSaveTime(record.savedAt) : "----.--.-- --:--"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <footer className="mm-panel-foot">
                  <button type="button" className="mm-text-action" onClick={goBack}>
                    <kbd>ESC</kbd>返回主菜单
                  </button>
                </footer>
              </section>
            )}

            {view === "settings" && (
              <section className="mm-panel" aria-label="设置">
                <header className="mm-panel-head">
                  <strong>设置</strong>
                  <span>CONFIGURATION</span>
                </header>
                <div className="mm-options">
                  <button
                    type="button"
                    className={`mm-option ${cursor === 0 ? "is-selected" : ""}`}
                    onClick={onToggleMute}
                    aria-pressed={!muted}
                    {...bindItem(0)}
                  >
                    <span className="mm-option-label">
                      声音
                      <small>环境音、视频与音效</small>
                    </span>
                    <span className="mm-switch" aria-hidden="true">
                      <i className={!muted ? "is-on" : ""}>开</i>
                      <i className={muted ? "is-on" : ""}>关</i>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`mm-option ${cursor === 1 ? "is-selected" : ""} ${clearArmed ? "is-armed" : ""}`}
                    disabled={!latest}
                    onClick={settingsItems[1].action}
                    {...bindItem(1)}
                  >
                    <span className="mm-option-label">
                      清除记录
                      <small>{latest ? "删除全部章节记录，无法恢复" : "当前没有可清除的记录"}</small>
                    </span>
                    <span className="mm-option-value">{clearArmed ? "再次确认" : latest ? "清除" : "——"}</span>
                  </button>
                  <button
                    type="button"
                    className={`mm-option mm-option-back ${cursor === 2 ? "is-selected" : ""}`}
                    onClick={() => openView("menu", 3)}
                    {...bindItem(2)}
                  >
                    <span className="mm-option-label">返回主菜单</span>
                  </button>
                </div>
              </section>
            )}

            {view === "exit" && (
              <section className="mm-panel mm-panel-exit" aria-label="退出确认">
                <header className="mm-panel-head">
                  <strong>退出</strong>
                  <span>END TRANSMISSION</span>
                </header>
                <p className="mm-exit-copy">切断信号并离开青河电视台？已抵达的章节会保留在读取记录中。</p>
                <div className="mm-exit-actions">
                  <button
                    type="button"
                    className={`mm-bar mm-bar-compact ${cursor === 0 ? "is-selected" : ""}`}
                    onClick={exitItems[0].action}
                    {...bindItem(0)}
                  >
                    <span className="mm-bar-label">切断信号</span>
                    <span className="mm-bar-mark" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`mm-bar mm-bar-compact ${cursor === 1 ? "is-selected" : ""}`}
                    onClick={exitItems[1].action}
                    {...bindItem(1)}
                  >
                    <span className="mm-bar-label">返回</span>
                    <span className="mm-bar-mark" aria-hidden="true" />
                  </button>
                </div>
              </section>
            )}
          </div>

          <footer className="mm-footbar">
            <div className="mm-footbar-left">
              <span>青河电视台 旧址</span>
              <span className="mm-mono">QHTV · 2026.09.17 拆除前夜</span>
            </div>
            <div className="mm-keys" aria-hidden="true">
              <span className="mm-mono mm-version">VER 0.1.0</span>
            </div>
          </footer>

          {view === "off" && (
            <div className="mm-off" role="status">
              <span className="mm-off-line" aria-hidden="true" />
              <div className="mm-off-copy">
                <strong>信号已切断</strong>
                <span className="mm-mono">SIGNAL LOST · 按任意键重新接入</span>
              </div>
            </div>
          )}

          <div className="mm-glass" aria-hidden="true" />
        </div>

        <div className="mm-bezel-strip" aria-hidden="true">
          <span className="mm-bezel-brand">
            QINGHE TELEVISION STATION
            <i className="mm-led mm-led-power" />
            <i className="mm-led" />
          </span>
          <span className="mm-bezel-tag">SOME PROGRAMS NEVER REALLY END.</span>
        </div>
      </div>
    </article>
  );
}

function firstRecordIndex(saveData: SaveData) {
  const index = chapters.findIndex((chapter) => saveData.records[chapter.id]);
  return index < 0 ? 0 : index;
}
