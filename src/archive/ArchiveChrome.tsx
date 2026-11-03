import { type ComponentProps, type ReactNode, useEffect, useRef } from "react";
import { ArrowIcon, PhoneAppIcon } from "../icons";

/*
 * 旧式档案公告板（Archive Board）通用外壳。
 * 论坛、公开资料、手机调查终端等解谜界面共用：
 * 顶部档案夹标签栏 + 墨绿信息板 + 底部按键提示 + 模拟信号叠层。
 */

type ArchiveTopBarProps = {
  site: string;
  title: string;
  source?: string;
  meta?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  /** 页面自带大标题（如论坛首页刊头）时，顶栏只保留返回键与来源 */
  hideTitle?: boolean;
};

const NAV_SELECTOR = ".ab-nav button:not(:disabled)";

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
}

export function ArchiveTopBar({ site, title, source, meta, onBack, backLabel = "返回", hideTitle }: ArchiveTopBarProps) {
  const headerRef = useRef<HTMLElement>(null);
  const backRef = useRef(onBack);
  backRef.current = onBack;

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "Escape") {
        if (isTypingTarget(event.target)) {
          (event.target as HTMLElement).blur();
          return;
        }
        if (!backRef.current) return;
        event.preventDefault();
        backRef.current();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (isTypingTarget(event.target)) return;
      const root = headerRef.current?.closest(".ab");
      const items = Array.from(root?.querySelectorAll<HTMLButtonElement>(NAV_SELECTOR) ?? []);
      if (!items.length) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = current < 0 ? (step > 0 ? 0 : items.length - 1) : (current + step + items.length) % items.length;
      items[next].focus();
      items[next].scrollIntoView({ block: "nearest" });
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <header className="ab-top" ref={headerRef}>
      <button type="button" className="ab-back" onClick={onBack} disabled={!onBack}>
        <i className="ab-back-dot" aria-hidden="true" />
        <kbd className="ab-key">ESC</kbd>
        <span>{backLabel}</span>
      </button>
      {hideTitle ? (
        <span className="ab-top-spacer" aria-hidden="true" />
      ) : (
        <div className="ab-top-title">
          <span className="ab-site">{site}</span>
          <h1 className="ab-title" data-text={title}>
            {title}
          </h1>
        </div>
      )}
      {(meta || source) && (
        <div className="ab-top-meta">
          {meta && <span>{meta}</span>}
          {source && <span className="ab-source">{source}</span>}
        </div>
      )}
    </header>
  );
}

/** 底部按键提示。返回键已固定在左上角（ESC），这里只保留浏览类按键与状态。 */
export function ArchiveKeys({ browse, status }: { back?: string; browse?: boolean; status?: ReactNode }) {
  return (
    <footer className="ab-keys">
      {browse && (
        <span>
          <kbd className="ab-key">↑↓</kbd>
          选择
        </span>
      )}
      {browse && (
        <span>
          <kbd className="ab-key">ENTER</kbd>
          打开
        </span>
      )}
      {status && <span className="ab-keys-status">{status}</span>}
    </footer>
  );
}

/** 扫描线、颗粒与缓慢下滚的显像管亮带，覆盖整张信息板 */
export function ArchiveFx() {
  return <div className="ab-fx" aria-hidden="true" />;
}

const stampTones = ["brick", "green", "ink"] as const;

export function UserStamp({ name, tone }: { name: string; tone?: "brick" | "green" | "ink" | "player" }) {
  const resolved =
    tone ?? stampTones[Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % stampTones.length];
  return (
    <span className={`ab-stamp is-${resolved}`} aria-hidden="true">
      {Array.from(name)[0]}
    </span>
  );
}

/** 回复登记板：墨绿信息板上的横线台账，回复按楼层纵向排列 */
export function ReplyBoard({
  label = "回复",
  note,
  compact,
  children
}: {
  label?: string;
  note?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="ab-reply-board">
      <header className="ab-reply-board-head">
        <strong>{label}</strong>
        {note && <small>{note}</small>}
      </header>
      <ol className={`ab-replies ${compact ? "is-compact" : ""}`} aria-label={label}>
        {children}
      </ol>
    </section>
  );
}

export function ReplyStrip({
  floor,
  name,
  note,
  children,
  className = ""
}: {
  floor: number;
  name: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={`ab-reply ${className}`}>
      <span className="ab-floor">#{floor}</span>
      <UserStamp name={name} tone={className.includes("is-player") ? "player" : undefined} />
      <div className="ab-reply-who">
        <strong>{name}</strong>
        {note && <small>{note}</small>}
      </div>
      <div className="ab-reply-body">{children}</div>
    </li>
  );
}

export function Dossier({ title, rows, children }: { title: string; rows: [string, ReactNode][]; children?: ReactNode }) {
  return (
    <section className="ab-card">
      <h2>{title}</h2>
      <dl className="ab-dossier">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}

export function ActionBar({
  children,
  onClick,
  disabled,
  type = "button",
  className = ""
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button type={type} className={`ab-action ${className}`} onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      <ArrowIcon />
    </button>
  );
}

/* ---------- 调查终端（玩家手机）专用组件 ---------- */

const liveThumbUrl = "/media/runtime-references/WEB-G00-live-preview.jpg";

type AppIconKind = ComponentProps<typeof PhoneAppIcon>["kind"];

export function TerminalClock({ time, date, place }: { time: string; date: string; place: string }) {
  const [hour, minute] = time.split(":");
  return (
    <section className="ab-clock" aria-label={`当前时间${hour}点${minute}分`}>
      <strong data-text={time}>
        {hour}
        <span>:</span>
        {minute}
      </strong>
      <small>
        {date}
        <em>{place}</em>
      </small>
    </section>
  );
}

/*
 * 手机桌面：左上大号时钟 + 右上直播状态，下方四个应用块。
 * 每个应用块按自身类型呈现不同的内容结构（视频回放 / 信息检索 / 个人档案 / 通讯记录），
 * 只显示玩家已经发现的内容，未解锁时用剧情内的说法说明原因。
 */
export function TerminalDesk({
  clock,
  status,
  label = "手机应用",
  children
}: {
  clock: ReactNode;
  status: ReactNode;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="ab-desk">
      <div className="ab-desk-head">
        {clock}
        <div className="ab-desk-status">{status}</div>
      </div>
      <div className="ab-desk-apps ab-nav" role="list" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

type DeskKind = "live" | "search" | "evidence" | "phone";

export function DeskTile({
  kind,
  slot,
  icon,
  label,
  tag,
  badge,
  attention,
  disabled,
  lockedNote,
  onClick,
  children
}: {
  kind: DeskKind;
  /** main：左侧大块；aside：右侧宽块；sub：右下小块 */
  slot: "main" | "aside" | "sub";
  icon: AppIconKind;
  label: string;
  tag?: string;
  badge?: ReactNode;
  attention?: boolean;
  disabled?: boolean;
  lockedNote?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <div role="listitem" className={`ab-tile is-${kind} is-${slot} ${attention && !disabled ? "is-attention" : ""}`}>
      <button type="button" className="ab-tile-hit" disabled={disabled} onClick={onClick}>
        <span className="ab-tile-head">
          <span className="ab-tile-icon">
            <PhoneAppIcon kind={icon} />
          </span>
          <strong>{label}</strong>
          {tag && <small>{tag}</small>}
          {badge !== undefined && !disabled && <i className="ab-badge">{badge}</i>}
        </span>
        <span className="ab-tile-body">
          {disabled ? <span className="ab-tile-locked">{lockedNote ?? "暂无内容"}</span> : children}
        </span>
      </button>
    </div>
  );
}

/** 视频回放：带取景框的画面帧 */
export function DeskScreen({ src, rec, timecode }: { src: string; rec: string; timecode?: string }) {
  return (
    <span className="ab-tile-screen">
      <img src={src} alt="" />
      <span className="ab-tile-rec">
        <i className="ab-lamp" aria-hidden="true" />
        {rec}
      </span>
      {timecode && <span className="ab-tile-tc">{timecode}</span>}
    </span>
  );
}

export function DeskTape({ time, title, detail, done }: { time: string; title: string; detail?: string; done?: boolean }) {
  return (
    <span className={`ab-tile-tape ${done ? "is-done" : ""}`}>
      <time>{time}</time>
      <span>
        <b>{title}</b>
        {detail && <em>{detail}</em>}
      </span>
      <small>{done ? "已看" : "未看"}</small>
    </span>
  );
}

/** 信息检索：伪搜索框 + 关键词 + 结果行 */
export function DeskQuery({ text, placeholder }: { text?: string; placeholder: string }) {
  return (
    <span className={`ab-tile-query ${text ? "" : "is-empty"}`}>
      <span aria-hidden="true">⌕</span>
      <span>{text || placeholder}</span>
      <i aria-hidden="true" />
    </span>
  );
}

export function DeskKeywords({ label, words }: { label: string; words: string[] }) {
  return (
    <span className="ab-tile-keywords">
      <small>{label}</small>
      {words.map((word) => (
        <b key={word}>{word}</b>
      ))}
    </span>
  );
}

export function DeskLine({ children, fresh, muted }: { children: ReactNode; fresh?: boolean; muted?: boolean }) {
  return (
    <span className={`ab-tile-line ${muted ? "is-muted" : ""}`}>
      <span>{children}</span>
      {fresh && <span className="ab-tile-new">新</span>}
    </span>
  );
}

/** 个人档案：一份归档文件 */
export function DeskFile({ type, title, state }: { type: string; title: string; state?: string }) {
  return (
    <span className="ab-tile-file">
      <span className="ab-tile-file-type">{type}</span>
      <b>{title}</b>
      {state && <small>{state}</small>}
    </span>
  );
}

/** 通讯记录：一条联系人 / 通话 */
export function DeskContact({ name, number, state, live }: { name: string; number: string; state: string; live?: boolean }) {
  return (
    <span className="ab-tile-contact">
      <span className="ab-tile-contact-who">
        <b>{name}</b>
        <small>{state}</small>
      </span>
      <span className="ab-tile-contact-num">{number}</span>
      {live && (
        <span className="ab-tile-contact-wave" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      )}
    </span>
  );
}

export function LiveStatus({ state, note, onOpen }: { state: string; note: string; onOpen: () => void }) {
  return (
    <button type="button" className="ab-live-card is-terminal" onClick={onOpen}>
      <span className="ab-live-thumb">
        <img src={liveThumbUrl} alt="" />
      </span>
      <span className="ab-live-copy">
        <small>
          <i className="ab-lamp" aria-hidden="true" />
          {state}
        </small>
        <strong>零号频道</strong>
        <em>{note}</em>
      </span>
      <span className="ab-live-go">
        返回直播
        <ArrowIcon />
      </span>
    </button>
  );
}
