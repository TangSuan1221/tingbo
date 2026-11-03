import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./mainMenu.css";
import "./introTerminal.css";
import { CrtDefs, barrelFilterStyle, useElementSize } from "./crt";

type LineKind = "sys" | "rule" | "body" | "prompt";

type ScriptLine = {
  kind: LineKind;
  text: string;
  /** 与上一行之间空一行，并在开始打字前多停顿一下 */
  gap?: boolean;
};

const script: ScriptLine[] = [
  { kind: "sys", text: "QINGHE LOCAL BOARD // GUEST" },
  { kind: "sys", text: "2026.09.17  23:46  访客模式" },
  { kind: "rule", text: "--------------------------------" },
  { kind: "body", text: "青河电视台明天拆楼。", gap: true },
  { kind: "body", text: "停播这么多年，" },
  { kind: "body", text: "你都快忘了还有这么个地方。" },
  { kind: "body", text: "直到今晚，" },
  { kind: "body", text: "它又出现在了本地论坛的首页。" },
  { kind: "prompt", text: "> 正在连接 bbs.qinghe-tongcheng.cn_", gap: true }
];

/** 打字完毕后停留给玩家阅读的时间 */
const HOLD_MS = 3600;
/** 显像管收束成一条线再熄灭的时长，结束后进入论坛 */
const LEAVE_MS = 640;

const charDelay: Record<LineKind, number> = {
  sys: 26,
  rule: 7,
  body: 68,
  prompt: 34
};

const linePause: Record<LineKind, number> = {
  sys: 140,
  rule: 120,
  body: 420,
  prompt: 260
};

/** 每个字符出现前需要等待的毫秒数；标点处稍作停顿，模拟读句子的节奏。 */
function buildDelays(lines: ScriptLine[]) {
  const delays: number[] = [];
  lines.forEach((line, lineIndex) => {
    const chars = Array.from(line.text);
    chars.forEach((_, charIndex) => {
      let delay = charDelay[line.kind];
      if (charIndex === 0) {
        delay = lineIndex === 0 ? 520 : linePause[line.kind] + (line.gap ? 520 : 0);
      } else if (line.kind === "body") {
        const previous = chars[charIndex - 1];
        if (previous === "，") delay += 240;
        else if (previous === "。" || previous === "」") delay += 120;
      }
      delays.push(delay);
    });
  });
  return delays;
}

type Phase = "typing" | "hold" | "leaving";

export function IntroTerminal({ onDone }: { onDone: () => void }) {
  const [bendRef, bendSize] = useElementSize<HTMLDivElement>();
  const delays = useMemo(() => buildDelays(script), []);
  const total = delays.length;
  const [typed, setTyped] = useState(() => (prefersReducedMotion() ? total : 0));
  const [phase, setPhase] = useState<Phase>("typing");
  const mountedAt = useRef(performance.now());
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (phase !== "typing") return;
    if (typed >= total) {
      setPhase("hold");
      return;
    }
    const timer = window.setTimeout(() => setTyped((count) => count + 1), delays[typed]);
    return () => window.clearTimeout(timer);
  }, [delays, phase, total, typed]);

  useEffect(() => {
    if (phase === "hold") {
      const timer = window.setTimeout(() => setPhase("leaving"), HOLD_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "leaving") {
      const timer = window.setTimeout(() => onDoneRef.current(), LEAVE_MS);
      return () => window.clearTimeout(timer);
    }
  }, [phase]);

  /** 第一次操作补全全部文字，第二次直接接入论坛。 */
  const advance = useCallback(() => {
    // 避免“开始游戏”那一下的按键/点击残留直接跳过序章
    if (performance.now() - mountedAt.current < 350) return;
    if (phase === "typing") {
      setTyped(total);
      setPhase("hold");
    } else if (phase === "hold") {
      setPhase("leaving");
    }
  }, [phase, total]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
        event.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [advance]);

  // 光标停在第一行未打完的文字上（该行还没出字时也先显示光标）；全部打完后停在最后一行末尾
  let offset = 0;
  let caretLine = script.length - 1;
  const lineStarts = script.map((line) => {
    const start = offset;
    offset += Array.from(line.text).length;
    return start;
  });
  for (let index = 0; index < script.length; index += 1) {
    if (typed < lineStarts[index] + Array.from(script[index].text).length) {
      caretLine = index;
      break;
    }
  }

  const rendered = script.map((line, index) => {
    if (index > caretLine) return null;
    const chars = Array.from(line.text);
    const shown = Math.max(0, Math.min(chars.length, typed - lineStarts[index]));
    return (
      <p key={index} className={`it-line it-${line.kind} ${line.gap ? "has-gap" : ""}`}>
        {chars.slice(0, shown).join("")}
        {index === caretLine && <span className="it-caret" aria-hidden="true" />}
      </p>
    );
  });

  return (
    <article
      className={`mm it is-${phase}`}
      aria-label="序章"
      onPointerDown={(event) => {
        if (event.button === 0) advance();
      }}
    >
      <CrtDefs width={bendSize.width} height={bendSize.height} />

      <div className="mm-tv">
        <div className="mm-screen">
          <div className="it-content">
            <div className="mm-scene" aria-hidden="true">
              <div className="it-glow" />
              <div className="mm-scene-grain" />
              <div className="mm-scene-scan" />
              <div className="mm-scene-roll" />
            </div>

            <div className="it-bend" ref={bendRef} style={barrelFilterStyle(bendSize.width)} aria-hidden="true">
              <div className="it-text">{rendered}</div>
            </div>
          </div>

          <p className="it-sr">{script.filter((line) => line.kind === "body").map((line) => line.text).join("")}</p>

          <footer className="it-hint" aria-hidden="true">
            {phase === "typing" ? (
              <span>
                点击或按 <kbd>ENTER</kbd> 跳过
              </span>
            ) : (
              <span>
                点击或按 <kbd>ENTER</kbd> 继续
              </span>
            )}
          </footer>

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

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
