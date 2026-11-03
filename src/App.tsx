import {
  type CSSProperties,
  FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Prologue, type ProloguePage } from "./Prologue";
import { checkPlayerNameAllowed, checkPlayerTextAllowed } from "./safety";
import { E3EndingForum } from "./E3EndingForum";
import {
  ActionBar,
  ArchiveFx,
  ArchiveKeys,
  ArchiveTopBar,
  DeskContact,
  DeskFile,
  DeskKeywords,
  DeskLine,
  DeskQuery,
  DeskScreen,
  DeskTape,
  DeskTile,
  Dossier,
  LiveStatus,
  TerminalClock,
  TerminalDesk
} from "./archive/ArchiveChrome";
import {
  type ChapterId,
  type SaveData,
  chapters,
  clearSave,
  loadSave,
  loadSettings,
  saveSettings,
  writeCheckpoint
} from "./saveData";
import {
  generateRuntimeVideo,
  useZaohuaVideoBridge,
  type RuntimeVideoUpdate
} from "./runtimeVideo";
import {
  ArrowIcon,
  GiftIcon,
  GiftMiniIcon,
  HeartIcon,
  PhoneAppIcon,
  ReplayIcon,
  SignalIcon,
  SoundIcon
} from "./icons";

type VideoStep = {
  kind: "video";
  id: string;
  src: string;
  label: string;
};

type InteractionStep = {
  kind: "interaction";
  id: string;
  runtimeId: "RT-00" | "RT-01" | "RT-02" | "RT-02B" | "RT-03" | "RT-05" | "RT-06";
  prompt: string;
  placeholder: string;
  suggestions: string[];
  waitingSrc: string;
  waitingMode: "loop" | "hold";
};

type AutomaticRuntimeStep = {
  kind: "autoRuntime";
  id: "A3-DYNAMIC-EVENT";
  waitingSrc: string;
  waitingMode: "hold";
  label: string;
};

type PuzzleStep = {
  kind: "puzzle";
  id: "INT-A3-01" | "INT-A3-02" | "INT-A4-00";
  waitingSrc: string;
  waitingMode: "hold";
  label: string;
};

type Step = VideoStep | InteractionStep | AutomaticRuntimeStep | PuzzleStep;

type RuntimePromptId =
  | "RT-00"
  | "RT-01"
  | "RT-02"
  | "RT-02B"
  | "RT-03"
  | "RT-04"
  | "RT-05"
  | "RT-06"
  | "RTE-A3-01"
  | "RTE-A3-02"
  | "RTE-A3-03";

type EndingVideoId =
  | "PRE-E1-01"
  | "PRE-E1-02"
  | "PRE-E3-01"
  | "PRE-E3-02";

type PlaybackId = RuntimePromptId | EndingVideoId;

type RuntimeJob = {
  phase?: "reasoning" | "video";
  advance?: boolean;
  dialogueSource?: string;
  id: string;
  promptId: RuntimePromptId;
  status: "queued" | "submitting" | "generating" | "downloading" | "completed" | "failed";
  progress: number;
  reply: string;
  intent: string;
  videoUrl: string | null;
  error: string | null;
};

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  tone?: "viewer" | "player" | "system" | "gift";
  timestamp?: string;
  replayed?: boolean;
};

type RouteIntent = "CONTROL_ROOM" | "STUDIO" | "LOBBY" | "LEAVE" | "OTHER";
type EndingIntent = "PLAY_TAPE" | "SHUT_DOWN" | "CLARIFY";
type PhoneView = "live" | "home" | "browser" | "replay" | "dialer" | "call";
type A3Event = "PAST_ECHO" | "CHAIR_DIRECTION";
type A3ArchivePage = "program" | "accident" | null;

const routeOutcomes: Record<RouteIntent, { title: string; label: string; description: string; nextNode: string }> = {
  CONTROL_ROOM: {
    title: "控制室入口已完成",
    label: "路线结果｜直接前往控制室",
    description: "林岚已经按照你的建议推开控制室门。后续可从控制室环境建立镜头继续。",
    nextNode: "PRE-A2-02"
  },
  STUDIO: {
    title: "演播厅线索已记录",
    label: "路线结果｜先查演播厅",
    description: "林岚听见了十二年前的报幕，并沿同轴电缆抵达控制室；这条路线保留母亲声音线索。",
    nextNode: "PRE-A2-02"
  },
  LOBBY: {
    title: "断电证据已记录",
    label: "路线结果｜复查大厅",
    description: "林岚确认电视断电后仍在播放，并沿信号线抵达控制室；这条路线保留断电续播证据。",
    nextNode: "PRE-A2-02"
  },
  LEAVE: {
    title: "提前结局：失联",
    label: "你的决定｜立即离开",
    description: "林岚听从了你的建议并真正走出电视台。这条路线不会再把她强制送入控制室。",
    nextNode: "SYS-A2-EARLY-LEAVE"
  },
  OTHER: {
    title: "等待确认",
    label: "方向尚未确认",
    description: "林岚没有擅自决定路线。请重新接入并明确告诉她先调查哪里。",
    nextNode: "INT-A2-00"
  }
};

const endingOutcomes: Record<
  Exclude<EndingIntent, "CLARIFY">,
  { title: string; label: string; description: string; epilogue: string }
> = {
  PLAY_TAPE: {
    title: "直播结束",
    label: "零号频道",
    description: "零号母带完成播放。林岚留在了屏幕里，走出现实控制室的人已经不是她。",
    epilogue: "屏幕终于空了。只是从今以后，等人回应的，换成了林岚。"
  },
  SHUT_DOWN: {
    title: "直播结束",
    label: "零号频道",
    description: "林岚切断电源并毁掉母带。红衣女人让开出口，零号频道终于停止播出。",
    epilogue: "零号频道再也没有亮起。那一夜的最后一句话，只剩你还记得。"
  }
};

const endingVideos: Record<
  Exclude<EndingIntent, "CLARIFY">,
  [{ id: EndingVideoId; src: string }, { id: EndingVideoId; src: string }]
> = {
  PLAY_TAPE: [
    { id: "PRE-E1-01", src: "/media/endings/PRE-E1-01.mp4" },
    { id: "PRE-E1-02", src: "/media/endings/PRE-E1-02.mp4" }
  ],
  SHUT_DOWN: [
    { id: "PRE-E3-01", src: "/media/endings/PRE-E3-01.mp4" },
    { id: "PRE-E3-02", src: "/media/endings/PRE-E3-02.mp4" }
  ]
};

type RuntimeRequest = {
  history?: { role: "user" | "assistant"; content: string }[];
  promptId: RuntimePromptId;
  message: string;
  entryCamera: "front" | "rear";
  routeIntent?: RouteIntent;
  echoPhrase?: string;
  evidenceTags?: string[];
  continuityJobId?: string;
};

const steps: Step[] = [
  { kind: "video", id: "PRE-G-01", src: "/media/prologue/01.mp4", label: "信号接入" },
  { kind: "video", id: "PRE-G-02", src: "/media/prologue/02.mp4?v=20260922", label: "大厅建立" },
  { kind: "video", id: "PRE-A1-01", src: "/media/act-01/PRE-A1-01.mp4?v=20260922", label: "电视亮起" },
  {
    kind: "interaction",
    id: "INT-A1-00",
    runtimeId: "RT-00",
    prompt: "弹幕里已经有人察觉身后的电视不对，但刷得太快，林岚还没注意。把异常说得更明确一点。",
    placeholder: "写下你想让林岚听见的话…",
    suggestions: ["快看你身后的电视！", "先别回头，听我说。"],
    waitingSrc: "/media/act-01/SYS-A1-00.mp4?v=20260922",
    waitingMode: "loop"
  },
  {
    kind: "video",
    id: "PRE-A1-02+03",
    src: "/media/act-01/PRE-A1-02+PRE-A1-03.mp4",
    label: "未来警告"
  },
  { kind: "video", id: "PRE-A1-04", src: "/media/act-01/PRE-A1-04.mp4?v=20260922", label: "连接中断" },
  { kind: "video", id: "PRE-A1-05", src: "/media/act-01/PRE-A1-05.mp4?v=20260922", label: "请求判断" },
  {
    kind: "interaction",
    id: "INT-A1-01",
    runtimeId: "RT-01",
    prompt: "频道里只剩你还在线。林岚停在岔口，等你替她做决定。",
    placeholder: "写下你此刻最想告诉她的话…",
    suggestions: ["先去控制室。", "去演播厅看看。", "再检查一下大厅里的电视。", "现在离开这里。"],
    waitingSrc: "/media/act-01/INS-A1-06G.mp4?v=20260922",
    waitingMode: "hold"
  },
  {
    kind: "video",
    id: "PRE-A2-02+03+04",
    src: "/media/act-02/PRE-A2-02+PRE-A2-03+PRE-A2-04.mp4",
    label: "提前发生的直播"
  },
  {
    kind: "interaction",
    id: "INT-A2-01",
    runtimeId: "RT-02",
    prompt: "十三号屏幕已经抢先一步。林岚在等一个验证办法——答案也许不只在直播里。",
    placeholder: "写下你的办法…",
    suggestions: [
      "对比十三号屏幕和旁边的屏幕。",
      "先关掉控制台电源。",
      "先别动，等屏幕里的她自己行动。",
      "故意不要照屏幕里的动作做。"
    ],
    waitingSrc: "/media/act-02/SYS-A2-01-wait.mp4",
    waitingMode: "loop"
  },
  {
    kind: "video",
    id: "PRE-A2-05+06",
    src: "/media/act-02/PRE-A2-05+PRE-A2-06.mp4",
    label: "十二年前的用户名"
  },
  {
    kind: "interaction",
    id: "INT-A2-02",
    runtimeId: "RT-02B",
    prompt: "十二年前的纸上写着只属于本局的名字。林岚没有催你，但她在等一个解释。",
    placeholder: "写下你愿意告诉她的答案…",
    suggestions: ["我从没来过这里。", "也许我们已经经历过不止一次。", "别再查了，现在离开。"],
    waitingSrc: "/media/act-02/SYS-A2-02-wait.mp4",
    waitingMode: "loop"
  },
  {
    kind: "video",
    id: "PRE-A2-09+10",
    src: "/media/act-02/PRE-A2-09+PRE-A2-10.mp4",
    label: "前往一号演播厅"
  },
  {
    kind: "video",
    id: "PRE-A3-01+02",
    src: "/media/act-03/PRE-A3-01+PRE-A3-02.mp4",
    label: "进入一号演播厅"
  },
  {
    kind: "video",
    id: "PRE-A3-03+04",
    src: "/media/act-03/PRE-A3-03+PRE-A3-04.mp4",
    label: "母亲旧录像"
  },
  {
    kind: "interaction",
    id: "INT-A3-00",
    runtimeId: "RT-03",
    prompt: "十二年前的林秋正在等一个回答。你可以回应她，也可以问一个只有她可能知道的问题。",
    placeholder: "写下你想让林岚转告林秋的话…",
    suggestions: ["问她现在是否安全。", "问她为什么认识屏幕外的人。", "提醒她不要碰零号母带。"],
    waitingSrc: "/media/act-03/SYS-A3-00-wait.mp4",
    waitingMode: "hold"
  },
  {
    kind: "video",
    id: "PRE-A3-05",
    src: "/media/act-03/PRE-A3-05.mp4",
    label: "上一次的回答"
  },
  {
    kind: "autoRuntime",
    id: "A3-DYNAMIC-EVENT",
    waitingSrc: "/media/act-03/SYS-A3-01-event-wait.mp4?v=2",
    waitingMode: "hold",
    label: "环境异常"
  },
  {
    kind: "puzzle",
    id: "INT-A3-01",
    waitingSrc: "/media/act-03/SYS-A3-01-event-wait.mp4?v=2",
    waitingMode: "hold",
    label: "调查旧节目"
  },
  {
    kind: "video",
    id: "SYS-A3-02",
    src: "/media/act-03/SYS-A3-02.mp4?v=2",
    label: "21:03隐藏记录"
  },
  {
    kind: "puzzle",
    id: "INT-A3-02",
    waitingSrc: "/media/act-03/SYS-A3-01-event-wait.mp4?v=2",
    waitingMode: "hold",
    label: "新增事故附件"
  },
  {
    kind: "video",
    id: "SYS-A3-03",
    src: "/media/act-03/SYS-A3-03.mp4",
    label: "录像循环"
  },
  {
    kind: "video",
    id: "PRE-A3-06",
    src: "/media/act-03/PRE-A3-06.mp4",
    label: "带母带返回控制室"
  },
  {
    kind: "video",
    id: "PRE-A4-01+02+03",
    src: "/media/act-04/PRE-A4-01+02+03.mp4",
    label: "十三号屏幕校准"
  },
  {
    kind: "video",
    id: "PRE-A4-04+05",
    src: "/media/act-04/PRE-A4-04+05.mp4",
    label: "母亲身份疑问"
  },
  {
    kind: "video",
    id: "PRE-A4-06",
    src: "/media/act-04/PRE-A4-06.mp4",
    label: "未来林岚的残缺警告"
  },
  {
    kind: "puzzle",
    id: "INT-A4-00",
    waitingSrc: "/media/act-04/SYS-A4-00-wait.mp4",
    waitingMode: "hold",
    label: "查找21:03未发送留言"
  },
  {
    kind: "video",
    id: "PRE-A4-07+08",
    src: "/media/act-04/PRE-A4-07+08.mp4",
    label: "母带中的未来画面"
  },
  {
    kind: "interaction",
    id: "INT-A4-01",
    runtimeId: "RT-05",
    prompt: "未来画面提示换人风险，母带里又传出母亲的求救。你觉得林岚现在该怎么办？",
    placeholder: "告诉林岚你觉得该怎么办…",
    suggestions: [
      "相信未来的你。",
      "相信屏幕里的妈妈。",
      "先别相信任何人，只按证据行动。",
      "现在还不能判断，继续查。"
    ],
    waitingSrc: "/media/act-04/SYS-A4-01-wait.mp4",
    waitingMode: "hold"
  },
  {
    kind: "video",
    id: "PRE-A5-01+02",
    src: "/media/act-05/PRE-A5-01+02.mp4",
    label: "妈妈记得那件事"
  },
  {
    kind: "video",
    id: "PRE-A5-03",
    src: "/media/act-05/PRE-A5-03.mp4",
    label: "两块屏幕争夺林岚"
  },
  {
    kind: "video",
    id: "PRE-A5-04",
    src: "/media/act-05/PRE-A5-04.mp4",
    label: "熄屏后留下的另一个她"
  },
  {
    kind: "video",
    id: "PRE-A5-05",
    src: "/media/act-05/PRE-A5-05.mp4",
    label: "最后一次提问"
  },
  {
    kind: "interaction",
    id: "INT-A5-00",
    runtimeId: "RT-06",
    prompt: "林岚已经无法继续说下去。你觉得她最后该怎么办？",
    placeholder: "告诉林岚你的决定…",
    suggestions: [
      "播放母带。",
      "彻底停播，切断总电源并毁掉母带。"
    ],
    waitingSrc: "/media/act-05/SYS-A5-00-wait.mp4",
    waitingMode: "hold"
  }
];

const act2StartIndex = steps.findIndex((item) => item.id === "PRE-A2-02+03+04");
const act2VerificationIndex = steps.findIndex((item) => item.id === "INT-A2-01");
const act2RecordIndex = steps.findIndex((item) => item.id === "PRE-A2-05+06");
const act2IdentityIndex = steps.findIndex((item) => item.id === "INT-A2-02");
const act3StartIndex = steps.findIndex((item) => item.id === "PRE-A3-01+02");
const act3InteractionIndex = steps.findIndex((item) => item.id === "INT-A3-00");
const act3InvestigationIndex = steps.findIndex((item) => item.id === "INT-A3-01");
const act3SuccessIndex = steps.findIndex((item) => item.id === "SYS-A3-02");
const act3ArchiveIndex = steps.findIndex((item) => item.id === "INT-A3-02");
const act3SkipIndex = steps.findIndex((item) => item.id === "SYS-A3-03");
const act4StartIndex = steps.findIndex((item) => item.id === "PRE-A3-06");

const openingChat: ChatMessage[] = [
  { id: "opening-1", author: "纸飞机", text: "终于接上了，刚才一直黑屏。" },
  { id: "opening-2", author: "夜班司机", text: "主播听得到吗？" },
  { id: "opening-3", author: "南窗", text: "真的是废弃电视台？" },
  { id: "opening-4", author: "失眠电台", text: "大厅比照片里还暗。" },
  { id: "opening-5", author: "匿名107", text: "信号有点花，但能看清。" },
  { id: "opening-6", author: "吃瓜群众", text: "今晚蹲完全程。" },
  { id: "opening-7", author: "折耳猫", text: "注意脚下，地上好多线。" },
  { id: "opening-8", author: "纯爱战士", text: "别一个人走太里面。" }
];

const ambientChat = [
  ["玻璃汽水", "刚进来，走到哪了？"],
  ["路过的前端", "画面居然挺清楚。"],
  ["熬夜冠军", "右上角可以开声音。"],
  ["槐树下", "这里以前真是电视台吗？"],
  ["吃瓜群众", "主播胆子也太大了。"],
  ["纸飞机", "慢一点，镜头晃得厉害。"],
  ["南窗", "刚才是不是有电流声？"],
  ["匿名204", "后面那排门都锁了吗？"],
  ["折耳猫", "别离出口太远。"],
  ["夜班司机", "网络没断，我还在。"],
  ["海盐波子", "光线太暗了，开手电吧。"],
  ["磁带倒带", "以前好像看过这个台标。"],
  ["匿名318", "今天在线的人好多。"],
  ["槐树下", "门口那盏灯一直在闪。"],
  ["纸飞机", "能听到脚步声。"],
  ["旧城天气", "画面右边是不是还有条走廊？"]
] as const;

const anomalyChat = [
  ["南窗", "等下，主播身后那台电视是不是亮了？"],
  ["纸飞机", "这里以前是录节目的大厅吗？"],
  ["熬夜冠军", "镜头再往左一点。"],
  ["槐树下", "墙上的台标都褪色了。"],
  ["折耳猫", "先看看出口在哪边。"],
  ["玻璃汽水", "主播今天收音挺清楚。"],
  ["匿名107", "我也看到了，那台电视刚才明明是黑的。"],
  ["夜班司机", "里面还有其他工作人员吗？"],
  ["匿名318", "有人录屏了吗？"],
  ["旧城天气", "这栋楼看起来比想象中大。"],
  ["磁带倒带", "刚才好像听见了一下电流声。"],
  ["海盐波子", "别离门口太远。"]
] as const;

const giftOptions = ["荧光棒", "旧胶片", "应援灯"] as const;
const guaranteedGlitchSteps = new Set(["PRE-A1-02+03", "PRE-A1-05"]);
const intermittentGlitchSteps = new Set([
  ...guaranteedGlitchSteps,
  "INT-A1-01",
  "PRE-A2-02+03+04",
  "INT-A2-01",
  "INT-A2-02",
  "PRE-A2-09+10",
  "PRE-A3-03+04",
  "INT-A3-00",
  "PRE-A3-05",
  "A3-DYNAMIC-EVENT",
  "INT-A3-01"
]);

const seededChat: Record<string, ChatMessage[]> = {
  "PRE-G-01": openingChat,
  "PRE-G-02": [
    { id: "g3", author: "夜班司机", text: "这里真要拆了？" },
    { id: "g4", author: "匿名107", text: "大厅右边那台电视好旧。" }
  ],
  "PRE-A1-02+03": [
    { id: "a2", author: "南窗", text: "屏幕里也是你？" },
    { id: "a3", author: "纸飞机", text: "这不是现在的画面。" }
  ],
  "PRE-A1-04": [
    { id: "sys1", author: "频道系统", text: "多数观众已断开连接", tone: "system" }
  ],
  "PRE-A2-02+03+04": [
    { id: "a2-system", author: "频道系统", text: "十三号监视器恢复信号", tone: "system" }
  ],
  "PRE-A2-05+06": [
    { id: "a2-record", author: "频道系统", text: "检出十二年前的停播记录", tone: "system" }
  ],
  "PRE-A2-09+10": [
    { id: "a2-studio", author: "频道系统", text: "信号源转向一号演播厅", tone: "system" }
  ],
  "PRE-A3-01+02": [
    { id: "a3-studio", author: "频道系统", text: "当前位置：一号演播厅", tone: "system" }
  ],
  "PRE-A3-03+04": [
    { id: "a3-program", author: "频道系统", text: "检测到旧节目返看信号", tone: "system" }
  ],
  "PRE-A3-05": [
    { id: "a3-loop", author: "频道系统", text: "记录时间与当前连接不一致", tone: "system" }
  ]
};

function normalizeUsername(value: string) {
  return Array.from(value.trim().replace(/\s+/g, " ")).slice(0, 12).join("");
}

function runtimeEndpoint(pathname: string) {
  if (typeof window === "undefined") return pathname;
  const { hostname, port } = window.location;
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (isLocalHost && port !== "5173" && port !== "8797") {
    return `http://127.0.0.1:8797${pathname}`;
  }
  return pathname;
}

function runtimeAssetUrl(url: string | null) {
  if (!url?.startsWith("/generated/")) return url;
  const endpoint = runtimeEndpoint(url);
  return endpoint === url ? url : endpoint;
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

const GAME_CANVAS_WIDTH = 1920;
const GAME_CANVAS_HEIGHT = 1080;
const TOUCH_HIT_SLOP = 14;

function chooseA3Event(seed: string, hasEcho: boolean): A3Event {
  if (!hasEcho) return "CHAIR_DIRECTION";
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100 < 55 ? "CHAIR_DIRECTION" : "PAST_ECHO";
}

export default function App() {
  const gameViewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogueHistoryRef = useRef<Record<string, { role: "user" | "assistant"; content: string }[]>>({});
  const activeDialogueRef = useRef<RuntimeRequest | null>(null);
  const rememberedDialogueJobsRef = useRef(new Set<string>());
  const callAudioRef = useRef<HTMLAudioElement>(null);
  const ambienceAudioRef = useRef<HTMLAudioElement>(null);
  const stingAudioRef = useRef<HTMLAudioElement>(null);
  const lastAtmosphericStingRef = useRef<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const swipeOffsetRef = useRef(0);
  const touchHitStartRef = useRef<{ x: number; y: number } | null>(null);
  const rt01WaitingVideoFinishedRef = useRef(false);
  const nameCheckRef = useRef(false);
  const textCheckRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [prologuePage, setProloguePage] = useState<ProloguePage>("cover");
  const [prologueSeen, setPrologueSeen] = useState({ notice: false, photo: false });
  const [gmToolsOpen, setGmToolsOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameWarning, setUsernameWarning] = useState("");
  const [username, setUsername] = useState("");
  const [videoTime, setVideoTime] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [runtimeUrl, setRuntimeUrl] = useState<string | null>(null);
  const [, setRuntimeReply] = useState("");
  const [input, setInput] = useState("");
  const [inputWarning, setInputWarning] = useState("");
  const [textChecking, setTextChecking] = useState(false);
  const [job, setJob] = useState<RuntimeJob | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [complete, setComplete] = useState(false);
  const [muted, setMuted] = useState(() => loadSettings().muted);
  const [saveData, setSaveData] = useState<SaveData>(() => loadSave());
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);
  const [routeIntent, setRouteIntent] = useState<RouteIntent | null>(null);
  const [endingIntent, setEndingIntent] = useState<EndingIntent | null>(null);
  const [finalDecisionMessage, setFinalDecisionMessage] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [routeMessage, setRouteMessage] = useState("");
  const [playingPromptId, setPlayingPromptId] = useState<PlaybackId | null>(null);
  const [pendingRuntime, setPendingRuntime] = useState<RuntimeRequest | null>(null);
  const [clarifying, setClarifying] = useState(false);
  const [hintStepId, setHintStepId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likeCount, setLikeCount] = useState(368);
  const [giftTrayOpen, setGiftTrayOpen] = useState(false);
  const [socialToast, setSocialToast] = useState("");
  const [likeBursts, setLikeBursts] = useState<Array<{ id: string; offset: number; delay: number }>>([]);
  const [intermittentGlitchPhase, setIntermittentGlitchPhase] = useState(0);
  const [phoneView, setPhoneView] = useState<PhoneView>("live");
  const [phoneNudge, setPhoneNudge] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [browserSearched, setBrowserSearched] = useState(false);
  const [browserArchiveOpen, setBrowserArchiveOpen] = useState(false);
  const [breakerEvidence, setBreakerEvidence] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [selectedA3Event, setSelectedA3Event] = useState<A3Event | null>(null);
  const [a3Message, setA3Message] = useState("");
  const [a3SearchAttempts, setA3SearchAttempts] = useState(0);
  const [a3ReplayViewed, setA3ReplayViewed] = useState<string[]>([]);
  const [a3ArchivePage, setA3ArchivePage] = useState<A3ArchivePage>(null);
  const [a3ExtensionSaved, setA3ExtensionSaved] = useState(false);
  const [a3DialInput, setA3DialInput] = useState("");
  const [a3CallState, setA3CallState] = useState<"idle" | "wrong" | "playing" | "complete">("idle");
  const [a3TapeTimecode, setA3TapeTimecode] = useState(false);
  const [a3EvidenceAttached, setA3EvidenceAttached] = useState(false);
  const [a3TapeAbsent, setA3TapeAbsent] = useState(false);
  const [a3IncidentLogRead, setA3IncidentLogRead] = useState(false);
  const [a3MissedArchive, setA3MissedArchive] = useState(false);
  const [a3SkipConfirm, setA3SkipConfirm] = useState(false);
  const [a4PuzzleActive, setA4PuzzleActive] = useState(false);
  const [a4PuzzleSolved, setA4PuzzleSolved] = useState(false);
  const [a4PuzzlePieces, setA4PuzzlePieces] = useState<Array<number | null>>([null, null, null, null]);
  const [a4DragState, setA4DragState] = useState<{ piece: number; x: number; y: number } | null>(null);
  const [a4DragOverSlot, setA4DragOverSlot] = useState<number | null>(null);
  const [a4SearchQuery, setA4SearchQuery] = useState("");
  const [a4SearchComplete, setA4SearchComplete] = useState(false);
  const [a4ArchiveOpen, setA4ArchiveOpen] = useState(false);
  const [a4MessageSent, setA4MessageSent] = useState(false);

  const step = steps[stepIndex];
  const isInteraction = step?.kind === "interaction";
  const isAct2Verification = step?.id === "INT-A2-01";
  const isAct3Investigation = step?.id === "INT-A3-01";
  const isAct3Archive = step?.id === "INT-A3-02";
  const isAct4Investigation = step?.id === "INT-A4-00";
  const isAct4PuzzleVideo = step?.id === "PRE-A4-01+02+03";
  const isAct3PhoneEnabled = isAct3Investigation || isAct3Archive;
  const isPhoneExitEnabled = isAct2Verification || isAct3PhoneEnabled || isAct4Investigation;
  const endingOutcome =
    endingIntent && endingIntent !== "CLARIFY" ? endingOutcomes[endingIntent] : null;
  const isWaitingForRt01Shot =
    step?.id === "INT-A1-01" && job?.promptId === "RT-01" && job.status === "completed" && !runtimeUrl;
  const isGenerating = Boolean(
    job && ((job.status !== "completed" && job.status !== "failed") || isWaitingForRt01Shot)
  );
  const canUseRuntimeCache =
    !useZaohuaVideoBridge() && (pendingRuntime?.promptId || job?.promptId) === "RT-00";
  const currentSrc = runtimeUrl || (step?.kind === "video" ? step.src : step?.waitingSrc);
  const pastEchoPhrase = firstMessage || routeMessage || "我还在";
  const isAudienceDisconnect = !runtimeUrl && step?.id === "PRE-A1-04";
  const disconnectPhase = !isAudienceDisconnect ? 0 : videoTime < 4 ? 0 : videoTime < 8.5 ? 1 : videoTime < 12.2 ? 2 : 3;
  const onlineCount = isAudienceDisconnect
    ? [59, 18, 3, 1][disconnectPhase]
    : stepIndex > 5
      ? 1
      : Math.max(34, 127 - stepIndex * 17);
  const playerSurvivor =
    [...messages].reverse().find((message) => message.tone === "player") ||
    ({
      id: "disconnect-player-survivor",
      author: username || "你",
      text: firstMessage || "我还在。",
      tone: "player"
    } satisfies ChatMessage);
  const audienceMessages = messages.filter((message) => message.tone !== "player" && message.tone !== "system");
  const baseVisibleMessages = !isAudienceDisconnect
    ? messages
    : disconnectPhase === 0
      ? messages
      : disconnectPhase === 1
        ? [...audienceMessages.slice(-5), playerSurvivor]
        : disconnectPhase === 2
          ? [...audienceMessages.slice(-2), playerSurvivor]
          : [playerSurvivor];
  const echoedChatMessage: ChatMessage | null =
    runtimeUrl && playingPromptId === "RTE-A3-01" && videoTime >= 1.4
      ? {
          id: "a3-past-echo-replay",
          author: username || "最后一名观众",
          text: pastEchoPhrase,
          tone: "player",
          timestamp: "20:47",
          replayed: true
        }
      : null;
  const visibleMessages = echoedChatMessage
    ? [...baseVisibleMessages.filter((message) => message.id !== echoedChatMessage.id), echoedChatMessage].slice(-10)
    : baseVisibleMessages;
  const disconnectNotice =
    disconnectPhase === 1
      ? "连接波动 · 部分观众已断开"
      : disconnectPhase === 2
        ? "信号衰减 · 仅剩3人在线"
        : disconnectPhase === 3
          ? "多数观众已断开连接"
          : "";
  const activeGlitchPhase = isAudienceDisconnect ? disconnectPhase : intermittentGlitchPhase;
  const chapterProgress = Math.round(((stepIndex + (runtimeUrl ? 0.55 : 0)) / steps.length) * 100);
  const thirdActComplete =
    complete && ["SYS-A3-02", "INT-A3-02", "SYS-A3-03"].includes(step?.id || "");
  const usernameCandidate = normalizeUsername(usernameInput);
  const usernameValid = Array.from(usernameCandidate).length >= 2;
  const isUsernameRecordShot = !runtimeUrl && step?.id === "PRE-A2-05+06";
  const recordPushInProgress = Math.min(1, Math.max(0, (videoTime - 7.6) / 2.4));
  const recordHoldProgress = Math.min(1, Math.max(0, (videoTime - 10) / 5.8));
  const recordTop =
    recordPushInProgress < 0.58
      ? lerp(88, 84.1, recordPushInProgress / 0.58)
      : videoTime <= 10
        ? lerp(84.1, 91.5, (recordPushInProgress - 0.58) / 0.42)
        : lerp(91.5, 71.8, recordHoldProgress);
  const recordOpacity =
    videoTime < 7.9
      ? Math.max(0, (videoTime - 7.6) / 0.3)
      : videoTime > 15.5
        ? Math.max(0, (16 - videoTime) / 0.5)
        : 1;
  const showUsernameRecord =
    Boolean(username) && isUsernameRecordShot && videoTime >= 7.6 && videoTime <= 16;
  const usernameRecordStyle = {
    left: `${videoTime <= 10 ? lerp(28.4, 27.2, recordPushInProgress) : lerp(27.2, 24.6, recordHoldProgress)}%`,
    top: `${recordTop}%`,
    opacity: recordOpacity,
    transform: `rotate(${
      videoTime <= 10
        ? lerp(-0.7, 0.25, recordPushInProgress)
        : lerp(0.25, -0.1, recordHoldProgress)
    }deg) skewX(-0.5deg) scale(${
      videoTime <= 10
        ? lerp(0.94, 1.08, recordPushInProgress)
        : lerp(1.08, 1.16, recordHoldProgress)
    })`
  };
  const interactionPrompt =
    step?.id === "INT-A2-02" && username
      ? `十二年前的纸上写着“${username}”。林岚没有催你，但她在等一个解释。`
      : step?.kind === "interaction"
        ? step.prompt
        : "";
  const horrorAmbience =
    !started || complete || playingPromptId?.startsWith("PRE-E")
      ? null
      : stepIndex < act3StartIndex
        ? "/audio/horror/lost-in-a-bad-place.m4a"
        : stepIndex < act4StartIndex
          ? "/audio/horror/ambient-horror.m4a"
          : "/audio/horror/abandoned-passages.m4a";
  const horrorAmbienceVolume =
    horrorAmbience?.includes("abandoned-passages")
      ? isInteraction || step?.kind === "puzzle"
        ? 0.065
        : 0.038
      : isInteraction || step?.kind === "puzzle"
        ? 0.09
        : 0.052;
  const normalizedSearchQuery = searchQuery.replace(/\s+/g, "");
  const searchMatchesArchive =
    /(青河|电视台)/.test(normalizedSearchQuery) &&
    /(13号|十三号|监视器|设备|电源)/.test(normalizedSearchQuery);
  const searchMatchesA3Program =
    /晚安青河/.test(normalizedSearchQuery) ||
    (/林秋/.test(normalizedSearchQuery) && /(青河|电视台)/.test(normalizedSearchQuery)) ||
    (/青河电视台/.test(normalizedSearchQuery) && /(节目表|主持人|旧节目)/.test(normalizedSearchQuery));
  const normalizedA4SearchQuery = a4SearchQuery.replace(/\s+/g, "");
  const a4SearchMatches =
    /(21:?03|二十一点零三分)/.test(normalizedA4SearchQuery) &&
    /(林秋|未发送|值班留言)/.test(normalizedA4SearchQuery);
  const canSkipA3 = a3SearchAttempts >= 2 || a3ReplayViewed.length > 0;

  const statusText = useMemo(() => {
    if (!started) return "待接入";
    if (complete) return step?.id === "INT-A5-00" ? "结局已完成" : routeIntent === "LEAVE" ? "直播已结束" : "流程结束";
    if (isWaitingForRt01Shot) return "异常镜头播放中";
    if (isGenerating) return `中继锁定 ${Math.max(8, job?.progress || 0)}%`;
    if (playingPromptId === "RT-02") return "验证回传";
    if (playingPromptId === "RT-02B") return "屏幕追踪";
    if (playingPromptId === "RT-03") return "旧录像回应";
    if (playingPromptId === "RT-04") return "未发送留言已送达";
    if (playingPromptId === "RT-05") return "林岚正在回应";
    if (playingPromptId === "RT-06") return "最终决定已送达";
    if (playingPromptId?.startsWith("PRE-E")) return "结局预制片播放中";
    if (playingPromptId === "RTE-A3-03") return "林岚正在回应";
    if (playingPromptId === "RTE-A3-01" || playingPromptId === "RTE-A3-02") return "异常信号";
    if (isAct3Investigation) return "主线暂停 · 等待调查";
    if (isAct3Archive) return "新增关联附件";
    if (isAct4Investigation) return "主线暂停 · 查找未发送留言";
    if (isInteraction) return "等待你的弹幕";
    return step?.kind === "video" ? step.label : "直播中";
  }, [
    complete,
    isAct3Archive,
    isAct3Investigation,
    isAct4Investigation,
    isGenerating,
    isInteraction,
    isWaitingForRt01Shot,
    job?.progress,
    playingPromptId,
    routeIntent,
    started,
    step
  ]);

  useEffect(() => {
    const viewport = gameViewportRef.current;
    if (!viewport) return;

    const updateCanvasScale = () => {
      const style = window.getComputedStyle(viewport);
      const horizontalSafeArea =
        Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
      const verticalSafeArea =
        Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const availableWidth = Math.max(1, viewport.clientWidth - horizontalSafeArea);
      const availableHeight = Math.max(1, viewport.clientHeight - verticalSafeArea);
      const scale = Math.min(
        availableWidth / GAME_CANVAS_WIDTH,
        availableHeight / GAME_CANVAS_HEIGHT
      );
      const compactReadability = scale < 0.72;
      const compactTextAdjust = Math.min(260, Math.max(100, (0.78 / scale) * 100));
      const relayTextAdjust = Math.min(320, Math.max(100, (1.05 / scale) * 100));

      viewport.style.setProperty("--game-scale", scale.toFixed(6));
      viewport.style.setProperty("--compact-text-adjust", `${compactTextAdjust.toFixed(1)}%`);
      viewport.style.setProperty("--relay-text-adjust", `${relayTextAdjust.toFixed(1)}%`);
      viewport.dataset.compactReadability = String(compactReadability);
    };

    updateCanvasScale();
    const resizeObserver = new ResizeObserver(updateCanvasScale);
    resizeObserver.observe(viewport);
    window.visualViewport?.addEventListener("resize", updateCanvasScale);
    window.addEventListener("orientationchange", updateCanvasScale);

    return () => {
      resizeObserver.disconnect();
      window.visualViewport?.removeEventListener("resize", updateCanvasScale);
      window.removeEventListener("orientationchange", updateCanvasScale);
    };
  }, []);

  useEffect(() => {
    const viewport = gameViewportRef.current;
    if (!viewport) return;

    const interactiveSelector =
      "button:not(:disabled), input:not(:disabled), a[href], [role='button']:not([aria-disabled='true'])";

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      touchHitStartRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const start = touchHitStartRef.current;
      touchHitStartRef.current = null;
      if (event.pointerType !== "touch" || !start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
      if ((event.target as Element | null)?.closest?.(interactiveSelector)) return;

      const frame = viewport.querySelector<HTMLElement>(".broadcast-frame");
      if (!frame) return;

      let nearest:
        | { element: HTMLElement; distance: number }
        | undefined;

      frame.querySelectorAll<HTMLElement>(interactiveSelector).forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
        const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
        if (dx > TOUCH_HIT_SLOP || dy > TOUCH_HIT_SLOP) return;
        const distance = Math.hypot(dx, dy);
        if (!nearest || distance < nearest.distance) nearest = { element, distance };
      });

      if (!nearest) return;
      event.preventDefault();
      if (nearest.element instanceof HTMLInputElement) {
        nearest.element.focus();
      } else {
        nearest.element.click();
      }
    };

    viewport.addEventListener("pointerdown", handlePointerDown, true);
    viewport.addEventListener("pointerup", handlePointerUp, true);
    return () => {
      viewport.removeEventListener("pointerdown", handlePointerDown, true);
      viewport.removeEventListener("pointerup", handlePointerUp, true);
    };
  }, []);

  useEffect(() => {
    if (useZaohuaVideoBridge()) {
      setServiceReady(true);
      return;
    }
    fetch(runtimeEndpoint("/api/health"))
      .then((response) => response.json())
      .then((data) => setServiceReady(Boolean(data.h3Configured)))
      .catch(() => setServiceReady(false));
  }, []);

  useEffect(() => {
    return () => {
      if (runtimeUrl?.startsWith("blob:")) URL.revokeObjectURL(runtimeUrl);
    };
  }, [runtimeUrl]);

  useEffect(() => {
    const audio = ambienceAudioRef.current;
    if (!audio) return;
    audio.muted = muted;
    audio.volume = muted ? 0 : horrorAmbienceVolume;
  }, [horrorAmbienceVolume, muted]);

  useEffect(() => {
    saveSettings({ muted });
  }, [muted]);

  useEffect(() => {
    if (!started || complete || !username) return;
    const stepId = steps[stepIndex]?.id;
    const chapter = chapters.find((item) => item.stepId === stepId);
    if (!chapter) return;
    setSaveData(
      writeCheckpoint({
        chapter: chapter.id,
        username,
        firstMessage,
        routeMessage,
        routeIntent,
        savedAt: Date.now()
      })
    );
    // 只在抵达章节起点时记录一次；对话内容取当时的值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, stepIndex, complete, username]);

  useEffect(() => {
    const audio = ambienceAudioRef.current;
    if (!audio) return;
    if (!horrorAmbience) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }
    if (audio.getAttribute("src") !== horrorAmbience) {
      audio.src = horrorAmbience;
      audio.currentTime = 0;
      audio.load();
    }
    audio.loop = true;
    void audio.play().catch(() => undefined);
  }, [horrorAmbience]);

  useEffect(() => {
    if (!started || runtimeUrl || complete || !step) return;
    const stingByStep: Record<string, { src: string; volume: number }> = {
      "PRE-A1-04": { src: "/audio/horror/horror-hit-high.m4a", volume: 0.72 },
      "PRE-A3-03+04": { src: "/audio/horror/piano-sting.m4a", volume: 0.58 },
      "PRE-A5-03": { src: "/audio/horror/abyss-sting.m4a", volume: 0.5 }
    };
    const sting = stingByStep[step.id];
    if (!sting || lastAtmosphericStingRef.current === step.id) return;
    lastAtmosphericStingRef.current = step.id;
    playHorrorSting(sting.src, sting.volume);
  }, [complete, runtimeUrl, started, step]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      const ambience = ambienceAudioRef.current;
      const sting = stingAudioRef.current;
      if (document.hidden) {
        video?.pause();
        ambience?.pause();
        sting?.pause();
        return;
      }
      if (started && !complete && video && !video.ended && !a4PuzzleActive) {
        void video.play().catch(() => undefined);
      }
      if (started && !complete && ambience?.src) {
        void ambience.play().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [a4PuzzleActive, complete, started]);

  useEffect(() => {
    if (!started || complete || stepIndex >= 5) return;
    let timer = 0;
    let cursor = 0;
    const scheduleNext = () => {
      timer = window.setTimeout(() => {
        const pool = stepIndex >= 2 ? anomalyChat : ambientChat;
        const [author, text] = pool[cursor % pool.length];
        cursor += 1;
        setMessages((current) => [
          ...current,
          {
            id: `ambient-${stepIndex}-${cursor}-${Date.now()}`,
            author,
            text
          }
        ].slice(-10));
        scheduleNext();
      }, 900 + Math.round(Math.random() * 850));
    };
    scheduleNext();
    return () => window.clearTimeout(timer);
  }, [complete, started, stepIndex]);

  useEffect(() => {
    setIntermittentGlitchPhase(0);
    const stepId = step?.id || "";
    const shouldGlitch =
      started &&
      !complete &&
      !isAudienceDisconnect &&
      (Boolean(runtimeUrl) || intermittentGlitchSteps.has(stepId));
    if (!shouldGlitch) return;

    let startTimer = 0;
    let endTimer = 0;
    let cancelled = false;
    const scheduleBurst = (firstBurst: boolean) => {
      const guaranteedAdjacent = firstBurst && guaranteedGlitchSteps.has(stepId);
      const runtimeFirstBurst = firstBurst && Boolean(runtimeUrl);
      const minimumDelay = guaranteedAdjacent ? 1200 : runtimeFirstBurst ? 1500 : firstBurst ? 4200 : 7200;
      const delayRange = guaranteedAdjacent ? 1400 : runtimeFirstBurst ? 1700 : firstBurst ? 4800 : 7600;

      startTimer = window.setTimeout(() => {
        if (cancelled) return;
        setIntermittentGlitchPhase(Math.random() > 0.58 ? 2 : 1);
        const burstDuration = 1900 + Math.round(Math.random() * 950);
        endTimer = window.setTimeout(() => {
          if (cancelled) return;
          setIntermittentGlitchPhase(0);
          scheduleBurst(false);
        }, burstDuration);
      }, minimumDelay + Math.round(Math.random() * delayRange));
    };

    scheduleBurst(true);
    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
      setIntermittentGlitchPhase(0);
    };
  }, [complete, isAudienceDisconnect, runtimeUrl, started, step?.id]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!started || !currentSrc || complete) return;
    const video = videoRef.current;
    if (!video) return;
    setVideoTime(0);
    video.load();
    void video.play().catch(() => undefined);
  }, [complete, currentSrc, started, stepIndex]);

  useEffect(() => {
    if (step?.id === "INT-A1-01") {
      rt01WaitingVideoFinishedRef.current = false;
    }
  }, [step?.id]);

  useEffect(() => {
    if (!step) return;
    setHintStepId(null);
    setInputWarning("");
    setPhoneView("live");
    const incoming = seededChat[step.id] || [];
    if (step.id === "PRE-A1-04") return;
    if (stepIndex > 5) {
      setMessages((current) => [
        ...current.filter((item) => item.tone === "player").slice(-1),
        ...incoming
      ].slice(-10));
    } else if (incoming.length) {
      setMessages((current) => {
        const incomingIds = new Set(incoming.map((item) => item.id));
        const uniqueCurrent = current.filter((item) => !incomingIds.has(item.id));
        return [...uniqueCurrent, ...incoming].slice(-10);
      });
    }
  }, [step, stepIndex]);

  useEffect(() => {
    setPhoneNudge(0);
    if (!started || !isAct2Verification || runtimeUrl || complete || breakerEvidence) return;
    const recognizeTimer = window.setTimeout(() => setPhoneNudge((current) => Math.max(current, 1)), 6000);
    const browserTimer = window.setTimeout(() => setPhoneNudge((current) => Math.max(current, 2)), 20000);
    const hintTimer = window.setTimeout(() => setPhoneNudge((current) => Math.max(current, 3)), 40000);
    return () => {
      window.clearTimeout(recognizeTimer);
      window.clearTimeout(browserTimer);
      window.clearTimeout(hintTimer);
    };
  }, [breakerEvidence, complete, isAct2Verification, runtimeUrl, started]);

  useEffect(() => {
    if (phoneView === "home" && isAct2Verification && !breakerEvidence) {
      setPhoneNudge((current) => Math.max(current, 2));
    }
  }, [breakerEvidence, isAct2Verification, phoneView]);

  useEffect(() => {
    if (!isAct3Investigation) return;
    setPhoneView("live");
    setPhoneNudge(2);
    setSearchQuery("");
    setBrowserSearched(false);
    setBrowserArchiveOpen(false);
    setA3ArchivePage(null);
    setA3SearchAttempts(0);
    setA3ReplayViewed([]);
    setA3ExtensionSaved(false);
    setA3DialInput("");
    setA3CallState("idle");
    setA3TapeTimecode(false);
    setA3EvidenceAttached(false);
    setA3SkipConfirm(false);
  }, [isAct3Investigation]);

  useEffect(() => {
    if (!isAct4PuzzleVideo) return;
    setA4PuzzleActive(false);
    setA4PuzzleSolved(false);
    setA4PuzzlePieces([null, null, null, null]);
    setA4DragState(null);
    setA4DragOverSlot(null);
  }, [isAct4PuzzleVideo]);

  useEffect(() => {
    if (!isAct4Investigation) return;
    setPhoneView("live");
    setA4SearchQuery("");
    setA4SearchComplete(false);
    setA4ArchiveOpen(false);
    setA4MessageSent(false);
  }, [isAct4Investigation]);

  useEffect(() => {
    if (
      step?.kind !== "autoRuntime" ||
      runtimeUrl ||
      pendingRuntime ||
      job ||
      !selectedA3Event
    ) {
      return;
    }
    const promptId = selectedA3Event === "PAST_ECHO" ? "RTE-A3-01" : "RTE-A3-02";
    void requestRuntime({
      promptId,
      message:
        selectedA3Event === "PAST_ECHO"
          ? pastEchoPhrase
          : "椅子的朝向在弹幕发送后发生变化",
      entryCamera: "rear",
      echoPhrase: pastEchoPhrase
    });
  }, [job, pastEchoPhrase, pendingRuntime, runtimeUrl, selectedA3Event, step]);

  useEffect(() => {
    if (phoneView !== "call" || a3CallState !== "playing") return;
    const audio = callAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [a3CallState, phoneView]);

  async function startBroadcast(event: FormEvent) {
    event.preventDefault();
    if (!usernameValid || nameCheckRef.current) return;
    nameCheckRef.current = true;
    setUsernameChecking(true);
    setUsernameWarning("");
    try {
      const verdict = await checkPlayerNameAllowed(usernameCandidate);
      if (!verdict.allowed) {
        setUsernameWarning(verdict.message || "输入的内容不可用，请重新输入。");
        return;
      }
      playHorrorAmbience("/audio/horror/lost-in-a-bad-place.m4a", 0.052);
      setUsername(usernameCandidate);
      setStarted(true);
      setPhoneView("live");
    } finally {
      nameCheckRef.current = false;
      setUsernameChecking(false);
    }
  }

  function playHorrorAmbience(src: string, volume: number) {
    const audio = ambienceAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = src;
    audio.currentTime = 0;
    audio.loop = true;
    audio.muted = muted;
    audio.volume = muted ? 0 : volume;
    void audio.play().catch(() => undefined);
  }

  function openProloguePage(next: ProloguePage) {
    if (next === "notice") setPrologueSeen((current) => ({ ...current, notice: true }));
    if (next === "photo") setPrologueSeen((current) => ({ ...current, photo: true }));
    setProloguePage(next);
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    await submitPlayerMessage(input.trim(), true);
  }

  async function submitPlayerMessage(playerMessage: string, review = false) {
    if (!isInteraction || !playerMessage || isGenerating || textCheckRef.current) return;
    if (review) {
      textCheckRef.current = true;
      setTextChecking(true);
      try {
        const verdict = await checkPlayerTextAllowed(playerMessage);
        if (!verdict.allowed) {
          setInputWarning(verdict.message || "输入的内容不可用，请重新输入。");
          return;
        }
      } finally {
        textCheckRef.current = false;
        setTextChecking(false);
      }
      if (!isInteraction || isGenerating) return;
    }
    setInputWarning("");
    if (step.runtimeId === "RT-00") setFirstMessage(playerMessage);
    if (step.runtimeId === "RT-01") {
      setRouteMessage(playerMessage);
      setClarifying(false);
      if (rt01WaitingVideoFinishedRef.current) {
        rt01WaitingVideoFinishedRef.current = false;
        const waitingVideo = videoRef.current;
        if (waitingVideo) {
          waitingVideo.currentTime = 0;
          void waitingVideo.play().catch(() => undefined);
        }
      }
    }
    if (step.runtimeId === "RT-03") {
      setA3Message(playerMessage);
      setSelectedA3Event(
        chooseA3Event(
          `${username}|${firstMessage}|${routeMessage}|${playerMessage}|A3`,
          Boolean(firstMessage || routeMessage)
        )
      );
    }
    if (step.runtimeId === "RT-06") {
      setClarifying(false);
      setEndingIntent(null);
      setFinalDecisionMessage(playerMessage);
    }
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), author: username || "你", text: playerMessage, tone: "player" as const }
    ].slice(-10));
    setInput("");
    setRuntimeReply("");

    await requestRuntime({
      promptId: step.runtimeId,
      message: playerMessage,
      entryCamera: step.runtimeId === "RT-01" ? "rear" : "front",
      evidenceTags: step.runtimeId === "RT-02" && breakerEvidence ? ["BREAKER_MAP"] : undefined,
      echoPhrase:
        step.runtimeId === "RT-01"
          ? firstMessage
          : step.runtimeId === "RT-02B"
            ? firstMessage || routeMessage
            : step.runtimeId === "RT-03"
              ? firstMessage || routeMessage
              : playerMessage
    });
  }

  function submitArchiveSearch(event: FormEvent) {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    setBrowserSearched(true);
    setBrowserArchiveOpen(false);
    if (isAct3PhoneEnabled) {
      setA3ArchivePage(null);
      if (!searchMatchesA3Program) {
        setA3SearchAttempts((current) => current + 1);
      }
    }
  }

  function sendBreakerEvidenceToLive() {
    setBreakerEvidence(true);
    setPhoneView("live");
    setPhoneNudge(0);
    setInput("我找到检修记录了：切断C-04总控电源，不要碰十三号机器。");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author: "手机系统",
        text: "已附加证据：《2014年监视器墙供电改造记录》",
        tone: "system" as const
      }
    ].slice(-10));
  }

  function markA3ReplayViewed(cacheId: "CACHE-A3-01" | "CACHE-A3-02") {
    setA3ReplayViewed((current) => (current.includes(cacheId) ? current : [...current, cacheId]));
  }

  function pasteA3ReplayText() {
    const watchedProgram = a3ReplayViewed.includes("CACHE-A3-01");
    const watchedIdentity = a3ReplayViewed.includes("CACHE-A3-02");
    setSearchQuery(
      watchedProgram && watchedIdentity
        ? "晚安青河 林秋"
        : watchedProgram
          ? "晚安青河"
          : "林秋 青河电视台"
    );
    setBrowserSearched(false);
    setA3ArchivePage(null);
    setPhoneView("browser");
  }

  function saveA3Extension() {
    setA3ExtensionSaved(true);
    setPhoneNudge(3);
    setPhoneView("home");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author: "手机系统",
        text: "已保存旧节目内部热线。",
        tone: "system" as const
      }
    ].slice(-10));
  }

  function dialA3Extension() {
    if (!a3DialInput) return;
    if (a3DialInput === "0313" && a3ExtensionSaved) {
      setA3CallState("playing");
      setPhoneView("call");
      return;
    }
    setA3CallState("wrong");
  }

  function finishA3Voicemail() {
    setA3CallState("complete");
    setA3TapeTimecode(true);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author: "手机系统",
        text: "已保存语音证据：旧节目内线留言 · 21:03",
        tone: "system" as const
      }
    ].slice(-10));
  }

  function attachA3EvidenceToLive() {
    if (!a3TapeTimecode) return;
    setA3EvidenceAttached(true);
    setPhoneView("live");
    setInput("把屏幕里的节目调回21:03，不要动椅子上的母带。");
  }

  function confirmA3Evidence() {
    if (!a3EvidenceAttached || !a3TapeTimecode) return;
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author: username || "你",
        text: "把屏幕里的节目调回21:03，不要动椅子上的母带。",
        tone: "player" as const
      }
    ].slice(-10));
    setStepIndex(act3SuccessIndex);
    setPhoneView("live");
  }

  function skipA3Investigation() {
    if (!canSkipA3) return;
    if (!a3SkipConfirm) {
      setA3SkipConfirm(true);
      return;
    }
    setA3MissedArchive(true);
    setA3EvidenceAttached(false);
    setStepIndex(act3SkipIndex);
    setPhoneView("live");
  }

  function openA3AccidentArchive() {
    setA3ArchivePage("accident");
    setBrowserArchiveOpen(true);
    setPhoneView("browser");
  }

  function finishA3ArchiveAndReact() {
    if (a3IncidentLogRead || isGenerating) return;
    setA3IncidentLogRead(true);
    setPhoneView("live");
    void requestRuntime({
      promptId: "RTE-A3-03",
      message: "已查看零号频道试播事故记录",
      entryCamera: "front"
    });
  }

  function finishA3BeforeTransition() {
    setPhoneView("live");
    setStepIndex(act4StartIndex);
  }

  function beginExitSwipe(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!isPhoneExitEnabled || runtimeUrl) return;
    swipeStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateExitSwipe(event: ReactPointerEvent<HTMLButtonElement>) {
    if (swipeStartYRef.current === null) return;
    const nextOffset = Math.min(110, Math.max(0, swipeStartYRef.current - event.clientY));
    swipeOffsetRef.current = nextOffset;
    setSwipeOffset(nextOffset);
  }

  function finishExitSwipe(event: ReactPointerEvent<HTMLButtonElement>) {
    if (swipeStartYRef.current === null) return;
    if (swipeOffsetRef.current >= 58) setPhoneView("home");
    swipeStartYRef.current = null;
    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function requestRuntime(runtimeRequest: RuntimeRequest) {
    runtimeRequest = { ...runtimeRequest, history: dialogueHistoryRef.current[runtimeRequest.promptId] || [] };
    activeDialogueRef.current = runtimeRequest;
    setPendingRuntime(runtimeRequest);
    try {
      if (useZaohuaVideoBridge()) {
        const completed = await generateRuntimeVideo(runtimeRequest, (update) => {
          setJob(asRuntimeJob(update, runtimeRequest.promptId));
        });
        completeRuntimeJob(asRuntimeJob(completed, runtimeRequest.promptId));
        return;
      }
      const response = await fetch(runtimeEndpoint("/api/videos"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runtimeRequest)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "无法开始Runtime生成。");
      setJob(data);
      pollJob(data.id);
    } catch (error) {
      setJob((current) => ({
        id: current?.id || "local-error",
        promptId: runtimeRequest.promptId,
        status: "failed",
        progress: current?.progress || 0,
        reply: current?.reply || "",
        intent: current?.intent || "",
        videoUrl: null,
        error: error instanceof Error ? error.message : "Runtime生成失败。"
      }));
    }
  }

  function asRuntimeJob(update: RuntimeVideoUpdate, promptId: RuntimePromptId): RuntimeJob {
    return { ...update, promptId };
  }

  function completeRuntimeJob(nextJob: RuntimeJob) {
    const active = activeDialogueRef.current;
    if (nextJob.dialogueSource === "ai" && active?.promptId === nextJob.promptId &&
        !rememberedDialogueJobsRef.current.has(nextJob.id)) {
      rememberedDialogueJobsRef.current.add(nextJob.id);
      dialogueHistoryRef.current[nextJob.promptId] = [
        ...(dialogueHistoryRef.current[nextJob.promptId] || []),
        { role: "user" as const, content: active.message },
        { role: "assistant" as const, content: nextJob.reply }
      ].slice(-12);
    }
    const resolvedJob = { ...nextJob, videoUrl: runtimeAssetUrl(nextJob.videoUrl) };
    setJob(resolvedJob);
    setRuntimeReply(nextJob.reply);
    setPlayingPromptId(nextJob.promptId);
    setPendingRuntime(null);
    if (nextJob.promptId === "RT-01") {
      setRouteIntent(
        ["CONTROL_ROOM", "STUDIO", "LOBBY", "LEAVE"].includes(nextJob.intent)
          ? (nextJob.intent as RouteIntent)
          : "OTHER"
      );
      if (!rt01WaitingVideoFinishedRef.current) return;
    }
    if (nextJob.promptId === "RT-06") {
      setEndingIntent(
        ["PLAY_TAPE", "SHUT_DOWN", "CLARIFY"].includes(nextJob.intent)
          ? (nextJob.intent as EndingIntent)
          : "CLARIFY"
      );
    }
    if (resolvedJob.videoUrl) setRuntimeUrl(resolvedJob.videoUrl);
  }

  function pollJob(id: string) {
    const poll = async () => {
      try {
        const response = await fetch(runtimeEndpoint(`/api/videos/${encodeURIComponent(id)}`));
        const nextJob: RuntimeJob = await response.json();
        if (!response.ok) throw new Error((nextJob as unknown as { error?: string }).error || "任务查询失败。");
        setJob(nextJob);

        if (nextJob.status === "completed" && nextJob.videoUrl) {
          completeRuntimeJob(nextJob);
          return;
        }
        if (nextJob.status === "failed") return;
        window.setTimeout(poll, 2500);
      } catch (error) {
        setJob((current) => ({
          id,
          promptId: current?.promptId || "RT-00",
          status: "failed",
          progress: current?.progress || 0,
          reply: current?.reply || "",
          intent: current?.intent || "",
          videoUrl: null,
          error: error instanceof Error ? error.message : "任务查询失败。"
        }));
      }
    };
    window.setTimeout(poll, 1200);
  }

  function handleBroadcastTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    setVideoTime(video.currentTime);
    if (
      isAct4PuzzleVideo &&
      !runtimeUrl &&
      !a4PuzzleSolved &&
      !a4PuzzleActive &&
      video.currentTime >= 13.2
    ) {
      video.pause();
      setA4PuzzleActive(true);
    }
  }

  function playHorrorSting(src: string, volume: number) {
    const audio = stingAudioRef.current;
    if (!audio || muted) return;
    const ambience = ambienceAudioRef.current;
    const restoreAmbience = () => {
      if (ambience) ambience.volume = muted ? 0 : horrorAmbienceVolume;
    };
    audio.pause();
    audio.src = src;
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = volume;
    audio.onended = restoreAmbience;
    audio.onerror = restoreAmbience;
    if (ambience) ambience.volume = Math.min(ambience.volume, horrorAmbienceVolume * 0.2);
    void audio.play().catch(restoreAmbience);
  }

  function placeA4PuzzlePiece(piece: number, slot: number) {
    if (piece !== slot || a4PuzzlePieces[slot] !== null) return;
    const next = [...a4PuzzlePieces];
    next[slot] = piece;
    setA4PuzzlePieces(next);
    if (next.filter((piece) => piece !== null).length >= 3) {
      playHorrorSting("/audio/horror/horror-hit-bassy.m4a", 0.82);
      setA4PuzzleSolved(true);
      setA4PuzzleActive(false);
      const video = videoRef.current;
      if (video) {
        video.currentTime = 13.75;
        void video.play().catch(() => undefined);
      }
    }
  }

  function getA4PuzzleSlotAtPoint(x: number, y: number) {
    const target = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-a4-puzzle-slot]");
    const slot = Number(target?.dataset.a4PuzzleSlot);
    return Number.isInteger(slot) && slot >= 0 && slot < 4 ? slot : null;
  }

  function beginA4PuzzleDrag(event: ReactPointerEvent<HTMLButtonElement>, piece: number) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setA4DragState({ piece, x: event.clientX, y: event.clientY });
    setA4DragOverSlot(null);
  }

  function moveA4PuzzleDrag(event: ReactPointerEvent<HTMLButtonElement>, piece: number) {
    if (a4DragState?.piece !== piece) return;
    event.preventDefault();
    setA4DragState({ piece, x: event.clientX, y: event.clientY });
    setA4DragOverSlot(getA4PuzzleSlotAtPoint(event.clientX, event.clientY));
  }

  function endA4PuzzleDrag(event: ReactPointerEvent<HTMLButtonElement>, piece: number) {
    if (a4DragState?.piece !== piece) return;
    event.preventDefault();
    const slot = getA4PuzzleSlotAtPoint(event.clientX, event.clientY);
    if (slot !== null) placeA4PuzzlePiece(piece, slot);
    setA4DragState(null);
    setA4DragOverSlot(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function cancelA4PuzzleDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    setA4DragState(null);
    setA4DragOverSlot(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function submitA4Search(event: FormEvent) {
    event.preventDefault();
    if (!a4SearchQuery.trim()) return;
    setA4SearchComplete(true);
    setA4ArchiveOpen(false);
  }

  function sendA4ArchiveMessage() {
    if (a4MessageSent || isGenerating) return;
    setA4MessageSent(true);
    setPhoneView("live");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author: "频道系统",
        text: "已发送证据：林秋未发送的值班留言 · 21:03",
        tone: "system" as const
      }
    ].slice(-10));
    void requestRuntime({
      promptId: "RT-04",
      message: "林秋21:03未发送留言：先别照做，断开播出线路，用返看机查看母带最后一分钟。",
      entryCamera: "front",
      evidenceTags: ["LIN_QIU_UNSENT_MESSAGE"]
    });
  }

  function playEndingVideo(intent: Exclude<EndingIntent, "CLARIFY">, part: 1 | 2) {
    const video = endingVideos[intent][part - 1];
    setJob(null);
    setPendingRuntime(null);
    setRuntimeReply("");
    setPlayingPromptId(video.id);
    setRuntimeUrl(`${video.src}?v=20261008`);
  }

  function handleVideoEnded() {
    if (runtimeUrl) {
      const finishedPromptId = playingPromptId;

      if (job?.advance === false || job?.intent.startsWith("SOCIAL_")) {
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        setPendingRuntime(null);
        setClarifying(false);
        if (finishedPromptId === "RT-06") {
          setEndingIntent(null);
        }
        return;
      }

      if (finishedPromptId === "RT-01") {
        if (routeIntent === "OTHER" || !routeIntent) {
          setRuntimeUrl(null);
          setRuntimeReply("");
          setPlayingPromptId(null);
          setJob(null);
          setRouteIntent(null);
          setClarifying(true);
          rt01WaitingVideoFinishedRef.current = false;
          return;
        }
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        if (routeIntent === "LEAVE") {
          setComplete(true);
        } else {
          setStepIndex(act2StartIndex);
        }
        return;
      }

      if (finishedPromptId === "RT-02") {
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        advance();
        return;
      }

      if (finishedPromptId === "RT-02B") {
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        advance();
        return;
      }

      if (finishedPromptId === "RT-06" && endingIntent === "CLARIFY") {
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        setEndingIntent(null);
        setClarifying(true);
        return;
      }

      if (finishedPromptId === "RT-06" && endingIntent && endingIntent !== "CLARIFY") {
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        playEndingVideo(endingIntent, 1);
        return;
      }

      if (
        finishedPromptId === "PRE-E1-01" ||
        finishedPromptId === "PRE-E3-01"
      ) {
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        if (endingIntent && endingIntent !== "CLARIFY") {
          playEndingVideo(endingIntent, 2);
        }
        return;
      }

      if (
        finishedPromptId === "PRE-E1-02" ||
        finishedPromptId === "PRE-E3-02"
      ) {
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        setComplete(true);
        return;
      }

      if (finishedPromptId === "RTE-A3-03") {
        setRuntimeUrl(null);
        setRuntimeReply("");
        setPlayingPromptId(null);
        setJob(null);
        setStepIndex(act4StartIndex);
        return;
      }

      setRuntimeUrl(null);
      setRuntimeReply("");
      setPlayingPromptId(null);
      setJob(null);
      advance();
      return;
    }

    if (step && step.kind !== "video") {
      if (step.id === "INT-A1-01") {
        rt01WaitingVideoFinishedRef.current = true;
        if (job?.promptId === "RT-01" && job.status === "completed" && job.videoUrl) {
          setRuntimeReply(job.reply);
          setPlayingPromptId("RT-01");
          setPendingRuntime(null);
          setRuntimeUrl(job.videoUrl);
        }
        return;
      }
      if (step.waitingMode === "loop" && !job) {
        videoRef.current?.play().catch(() => undefined);
      }
      return;
    }

    if (step?.id === "SYS-A3-02") {
      setA3TapeAbsent(true);
    }
    advance();
  }

  function advance() {
    if (stepIndex >= steps.length - 1) {
      setComplete(true);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  function skipFailedRuntime() {
    const failedPromptId = pendingRuntime?.promptId || job?.promptId;
    setJob(null);
    setRuntimeUrl(null);
    setRuntimeReply("");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    if (failedPromptId === "RTE-A3-03") {
      setStepIndex(act4StartIndex);
      return;
    }
    advance();
  }

  async function playCachedRuntime() {
    const promptId = pendingRuntime?.promptId || job?.promptId;
    if (promptId !== "RT-00") {
      skipFailedRuntime();
      return;
    }

    try {
      const response = await fetch(
        runtimeEndpoint(`/api/runtime-cache/${encodeURIComponent(promptId)}`)
      );
      const cachedJob: RuntimeJob = await response.json();
      if (!response.ok || !cachedJob.videoUrl) {
        throw new Error((cachedJob as unknown as { error?: string }).error || "没有找到可播放的历史视频。");
      }
      setRuntimeReply("");
      setPlayingPromptId(promptId);
      setPendingRuntime(null);
      setJob(null);
      setRuntimeUrl(`${runtimeAssetUrl(cachedJob.videoUrl)}?cached=${Date.now()}`);
    } catch (error) {
      setJob((current) => ({
        id: current?.id || "cache-error",
        promptId,
        status: "failed",
        progress: current?.progress || 0,
        reply: "",
        intent: "",
        videoUrl: null,
        error: error instanceof Error ? error.message : "读取历史视频失败。"
      }));
    }
  }

  function retryPendingRuntime() {
    if (!pendingRuntime) return;
    setJob(null);
    void requestRuntime(pendingRuntime);
  }

  function restart() {
    dialogueHistoryRef.current = {};
    activeDialogueRef.current = null;
    rememberedDialogueJobsRef.current.clear();
    rt01WaitingVideoFinishedRef.current = false;
    lastAtmosphericStingRef.current = null;
    setStarted(false);
    setProloguePage("cover");
    setPrologueSeen({ notice: false, photo: false });
    setGmToolsOpen(false);
    setStepIndex(0);
    setRuntimeUrl(null);
    setRuntimeReply("");
    setInput("");
    setJob(null);
    setComplete(false);
    setRouteIntent(null);
    setEndingIntent(null);
    setFinalDecisionMessage("");
    setFirstMessage("");
    setRouteMessage("");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    setClarifying(false);
    setHintStepId(null);
    setIsFollowing(false);
    setLikeCount(368);
    setGiftTrayOpen(false);
    setSocialToast("");
    setLikeBursts([]);
    setMessages([]);
    setPhoneView("live");
    setPhoneNudge(0);
    setSearchQuery("");
    setBrowserSearched(false);
    setBrowserArchiveOpen(false);
    setBreakerEvidence(false);
    setSelectedA3Event(null);
    setA3Message("");
    setA3SearchAttempts(0);
    setA3ReplayViewed([]);
    setA3ArchivePage(null);
    setA3ExtensionSaved(false);
    setA3DialInput("");
    setA3CallState("idle");
    setA3TapeTimecode(false);
    setA3EvidenceAttached(false);
    setA3TapeAbsent(false);
    setA3IncidentLogRead(false);
    setA3MissedArchive(false);
    setA3SkipConfirm(false);
    setA4PuzzleActive(false);
    setA4PuzzleSolved(false);
    setA4PuzzlePieces([null, null, null, null]);
    setA4DragState(null);
    setA4DragOverSlot(null);
    setA4SearchQuery("");
    setA4SearchComplete(false);
    setA4ArchiveOpen(false);
    setA4MessageSent(false);
  }

  function resumeFromRecord(chapterId: ChapterId) {
    const record = saveData.records[chapterId];
    const chapter = chapters.find((item) => item.id === chapterId);
    if (!record || !chapter) return;
    const targetIndex = steps.findIndex((item) => item.id === chapter.stepId);
    if (targetIndex < 0) return;
    restart();
    const ambience =
      targetIndex < act3StartIndex
        ? "/audio/horror/lost-in-a-bad-place.m4a"
        : targetIndex < act4StartIndex
          ? "/audio/horror/ambient-horror.m4a"
          : "/audio/horror/abandoned-passages.m4a";
    playHorrorAmbience(ambience, ambience.includes("abandoned") ? 0.038 : 0.052);
    setUsername(record.username);
    setUsernameInput(record.username);
    setFirstMessage(record.firstMessage);
    setRouteMessage(record.routeMessage);
    setRouteIntent(
      (record.routeIntent as RouteIntent | null) ?? (targetIndex >= act2StartIndex ? "CONTROL_ROOM" : null)
    );
    setStepIndex(targetIndex);
    setStarted(true);
    setMessages(
      targetIndex === 0
        ? []
        : [
            {
              id: `resume-${chapterId}`,
              author: "频道系统",
              text: `信号已恢复 · ${chapter.act}《${chapter.name}》`,
              tone: "system"
            }
          ]
    );
  }

  function jumpToSecondInteraction() {
    const testUsername = usernameCandidate || username || "GM_001";
    playHorrorAmbience("/audio/horror/lost-in-a-bad-place.m4a", 0.09);
    setUsername(testUsername);
    setUsernameInput(testUsername);
    setStarted(true);
    setStepIndex(steps.findIndex((item) => item.id === "INT-A1-01"));
    setRuntimeUrl(null);
    setRuntimeReply("");
    setInput("");
    setJob(null);
    setComplete(false);
    setRouteIntent(null);
    setFirstMessage("快看你背后的电视！");
    setRouteMessage("");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    setClarifying(false);
    setPhoneView("live");
    setBreakerEvidence(false);
    setMessages([
      { id: "gm-system", author: "频道系统", text: "GM测试：已跳过序章与第一幕前段", tone: "system" },
      { id: "gm-player", author: testUsername, text: "快看你背后的电视！", tone: "player" }
    ]);
  }

  function jumpToFirstInteraction() {
    const testUsername = usernameCandidate || username || "GM_001";
    playHorrorAmbience("/audio/horror/lost-in-a-bad-place.m4a", 0.052);
    setUsername(testUsername);
    setUsernameInput(testUsername);
    setStarted(true);
    setStepIndex(steps.findIndex((item) => item.id === "INT-A1-00"));
    setRuntimeUrl(null);
    setRuntimeReply("");
    setInput("");
    setJob(null);
    setComplete(false);
    setRouteIntent(null);
    setFirstMessage("");
    setRouteMessage("");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    setClarifying(false);
    setPhoneView("live");
    setBreakerEvidence(false);
    setMessages([
      ...openingChat,
      {
        id: "gm-first-interaction",
        author: "频道系统",
        text: "GM测试：已跳到第一幕异常验证",
        tone: "system"
      }
    ]);
  }

  function jumpToDisconnectTest() {
    const testUsername = usernameCandidate || username || "GM_001";
    playHorrorAmbience("/audio/horror/lost-in-a-bad-place.m4a", 0.052);
    lastAtmosphericStingRef.current = "PRE-A1-04";
    playHorrorSting("/audio/horror/horror-hit-high.m4a", 0.72);
    setUsername(testUsername);
    setUsernameInput(testUsername);
    setStarted(true);
    setStepIndex(steps.findIndex((item) => item.id === "PRE-A1-04"));
    setRuntimeUrl(null);
    setRuntimeReply("");
    setInput("");
    setJob(null);
    setComplete(false);
    setRouteIntent(null);
    setFirstMessage("快看你背后的电视！");
    setRouteMessage("");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    setClarifying(false);
    setPhoneView("live");
    setBreakerEvidence(false);
    setMessages([
      ...openingChat,
      { id: "gm-disconnect-extra", author: ambientChat[0][0], text: ambientChat[0][1] },
      {
        id: "gm-disconnect-player",
        author: testUsername,
        text: "快看你背后的电视！",
        tone: "player"
      }
    ]);
  }

  function jumpToAct2Interaction(target: "verification" | "record" | "identity") {
    const testUsername = usernameCandidate || username || "GM_001";
    setUsername(testUsername);
    setUsernameInput(testUsername);
    setStarted(true);
    setStepIndex(
      target === "verification" ? act2VerificationIndex : target === "record" ? act2RecordIndex : act2IdentityIndex
    );
    setRuntimeUrl(null);
    setRuntimeReply("");
    setInput("");
    setJob(null);
    setComplete(false);
    setRouteIntent("CONTROL_ROOM");
    setFirstMessage("快看你背后的电视！");
    setRouteMessage("先去控制室看看。");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    setClarifying(false);
    setPhoneView("live");
    setPhoneNudge(0);
    setSearchQuery("");
    setBrowserSearched(false);
    setBrowserArchiveOpen(false);
    setBreakerEvidence(false);
    setMessages([
      {
        id: `gm-${target}`,
        author: "频道系统",
        text:
          target === "verification"
            ? "GM测试：已跳到十三号屏幕验证"
            : target === "record"
              ? `GM测试：正在检查停播记录中的“${testUsername}”`
              : "GM测试：已跳到十二年前用户名解释",
        tone: "system"
      }
    ]);
  }

  function jumpToAct3(target: "start" | "mother" | "interaction" | "puzzle") {
    const testUsername = usernameCandidate || username || "GM_001";
    playHorrorAmbience("/audio/horror/ambient-horror.m4a", 0.052);
    if (target === "mother") {
      lastAtmosphericStingRef.current = "PRE-A3-03+04";
      playHorrorSting("/audio/horror/piano-sting.m4a", 0.58);
    }
    setUsername(testUsername);
    setUsernameInput(testUsername);
    setStarted(true);
    setStepIndex(
      target === "start"
        ? act3StartIndex
        : target === "mother"
          ? steps.findIndex((item) => item.id === "PRE-A3-03+04")
          : target === "interaction"
            ? act3InteractionIndex
            : act3InvestigationIndex
    );
    setRuntimeUrl(null);
    setRuntimeReply("");
    setInput("");
    setJob(null);
    setComplete(false);
    setRouteIntent("CONTROL_ROOM");
    setFirstMessage("快看你背后的电视！");
    setRouteMessage("先去控制室看看。");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    setClarifying(false);
    setPhoneView("live");
    setPhoneNudge(target === "puzzle" ? 2 : 0);
    setSearchQuery("");
    setBrowserSearched(false);
    setBrowserArchiveOpen(false);
    setSelectedA3Event(target === "puzzle" ? "CHAIR_DIRECTION" : null);
    setA3Message("");
    setA3SearchAttempts(0);
    setA3ReplayViewed([]);
    setA3ArchivePage(null);
    setA3ExtensionSaved(false);
    setA3DialInput("");
    setA3CallState("idle");
    setA3TapeTimecode(false);
    setA3EvidenceAttached(false);
    setA3TapeAbsent(false);
    setA3IncidentLogRead(false);
    setA3MissedArchive(false);
    setA3SkipConfirm(false);
    setMessages([
      {
        id: `gm-a3-${target}`,
        author: "频道系统",
        text:
          target === "start"
            ? "GM测试：已跳到第三幕入口"
            : target === "mother"
              ? "GM测试：已跳到林秋旧录像"
            : target === "interaction"
              ? "GM测试：已跳到林秋回应"
              : "GM测试：已跳到第三幕跨App调查",
        tone: "system"
      }
    ]);
  }

  function jumpToAct4(
    target: "start" | "puzzle" | "archive" | "judgment" | "a5" | "a5-03" | "a5-05" | "decision"
  ) {
    const targetId =
      target === "start"
        ? "PRE-A3-06"
        : target === "puzzle"
          ? "PRE-A4-01+02+03"
          : target === "archive"
            ? "INT-A4-00"
            : target === "judgment"
              ? "INT-A4-01"
              : target === "a5-03"
                ? "PRE-A5-03"
                : target === "a5-05"
                  ? "PRE-A5-05"
                  : target === "decision"
                    ? "INT-A5-00"
                    : "PRE-A5-01+02";
    const testUsername = usernameCandidate || username || "GM_001";
    playHorrorAmbience("/audio/horror/abandoned-passages.m4a", 0.038);
    if (target === "a5-03") {
      lastAtmosphericStingRef.current = "PRE-A5-03";
      playHorrorSting("/audio/horror/abyss-sting.m4a", 0.5);
    }
    setUsername(testUsername);
    setUsernameInput(testUsername);
    setStarted(true);
    setStepIndex(steps.findIndex((item) => item.id === targetId));
    setRuntimeUrl(null);
    setRuntimeReply("");
    setInput("");
    setJob(null);
    setComplete(false);
    setEndingIntent(null);
    setFinalDecisionMessage("");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    setClarifying(false);
    setPhoneView("live");
    setA4PuzzleActive(false);
    setA4PuzzleSolved(false);
    setA4PuzzlePieces([null, null, null, null]);
    setA4DragState(null);
    setA4DragOverSlot(null);
    setA4SearchQuery("");
    setA4SearchComplete(false);
    setA4ArchiveOpen(false);
    setA4MessageSent(false);
    setMessages([
      {
        id: `gm-a4-${target}`,
        author: "频道系统",
        text: `GM测试：已跳到${targetId}`,
        tone: "system"
      }
    ]);
  }

  function jumpToE3EndingForum() {
    const testUsername = usernameCandidate || username || "GM_001";
    setUsername(testUsername);
    setUsernameInput(testUsername);
    setStarted(true);
    setStepIndex(steps.findIndex((item) => item.id === "INT-A5-00"));
    setRuntimeUrl(null);
    setRuntimeReply("");
    setInput("");
    setJob(null);
    setComplete(true);
    setEndingIntent("SHUT_DOWN");
    setFinalDecisionMessage("彻底停播。");
    setPlayingPromptId(null);
    setPendingRuntime(null);
    setClarifying(false);
    setPhoneView("live");
    setGmToolsOpen(false);
  }

  function showSocialToast(message: string) {
    setSocialToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setSocialToast(""), 2200);
  }

  function toggleFollow() {
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    if (nextFollowing) {
      setMessages((current) => [
        ...current,
        {
          id: `follow-${Date.now()}`,
          author: "频道系统",
          text: `${username || "你"}已关注林岚`,
          tone: "system" as const
        }
      ].slice(-10));
      showSocialToast("已关注林岚的直播");
    } else {
      showSocialToast("已取消关注");
    }
  }

  function handleLike() {
    const burst: Array<{ id: string; offset: number; delay: number }> = Array.from({ length: 3 }, (_, index) => ({
      id: crypto.randomUUID(),
      offset: (index - 1) * 13 + Math.round(Math.random() * 8 - 4),
      delay: index * 70
    }));
    setLikeCount((value) => value + 1);
    setLikeBursts((current) => [...current, ...burst].slice(-18));
    window.setTimeout(() => {
      const expiredIds = new Set(burst.map((item) => item.id));
      setLikeBursts((current) => current.filter((item) => !expiredIds.has(item.id)));
    }, 1500);
  }

  function sendGift(gift: (typeof giftOptions)[number]) {
    setGiftTrayOpen(false);
    setMessages((current) => [
      ...current,
      {
        id: `gift-${Date.now()}`,
        author: username || "你",
        text: `送出了 ${gift}`,
        tone: "gift" as const
      }
    ].slice(-10));
    showSocialToast(`${username || "你"} 送出了 ${gift}`);
  }

  return (
    <main className="game-shell">
      <audio ref={ambienceAudioRef} aria-hidden="true" preload="auto" />
      <audio ref={stingAudioRef} aria-hidden="true" preload="auto" />
      <div className="game-viewport" ref={gameViewportRef}>
        <section className="broadcast-frame" aria-label={started ? "林岚的手机直播" : "进入直播前的网页"}>
        {started && currentSrc && !complete ? (
          <video
            ref={videoRef}
            className={`broadcast-video ${activeGlitchPhase > 0 ? `signal-drop-${activeGlitchPhase}` : ""}`}
            src={currentSrc}
            muted={muted}
            playsInline
            loop={isInteraction && step.waitingMode === "loop" && !runtimeUrl}
            onTimeUpdate={handleBroadcastTimeUpdate}
            onSeeked={(event) => setVideoTime(event.currentTarget.currentTime)}
            onEnded={handleVideoEnded}
          />
        ) : (
          <div className="signal-dark" aria-hidden="true" />
        )}

        {started && <div className="paper-falloff" aria-hidden="true" />}
        {started && <div className="scanline" aria-hidden="true" />}
        {activeGlitchPhase > 0 && (
          <>
            <div className={`signal-interference phase-${activeGlitchPhase}`} aria-hidden="true">
              <i className="signal-slice slice-a" />
              <i className="signal-slice slice-b" />
              <i className="signal-slice slice-c" />
            </div>
            <span className={`signal-black-flicker phase-${activeGlitchPhase}`} aria-hidden="true" />
            <span className={`signal-bloom-flicker phase-${activeGlitchPhase}`} aria-hidden="true" />
          </>
        )}
        {showUsernameRecord && (
          <span
            className="record-username"
            style={usernameRecordStyle}
            aria-label={`停播记录中的观众用户名：${username}`}
          >
            {username}
          </span>
        )}

        {step?.id === "SYS-A3-02" && (
          <div className="a3-tape-timecode" role="status" aria-label="返看记录时间二十一点零三分">
            <span>返看记录</span>
            <strong>21:03</strong>
          </div>
        )}

        {step?.id === "SYS-A3-03" && (
          <div className="a3-tape-overlay missed" role="status">
            <span>录像再次回到同一等待帧</span>
            {videoTime >= 2 && <p>林岚：“它又重复了。先把那盘带带回控制室。”</p>}
          </div>
        )}

        {a4PuzzleActive && (
          <section className="a4-calibration" aria-label="十三号屏幕图像校准">
            <div className="a4-puzzle-workspace">
              <div className="a4-piece-tray" aria-label="待放置碎片">
                {[2, 0, 3, 1].map((piece) =>
                  a4PuzzlePieces.includes(piece) ? (
                    <i key={piece} />
                  ) : (
                    <button
                      type="button"
                      key={piece}
                      className={`a4-puzzle-piece piece-${piece} ${a4DragState?.piece === piece ? "dragging" : ""}`}
                      onPointerDown={(event) => beginA4PuzzleDrag(event, piece)}
                      onPointerMove={(event) => moveA4PuzzleDrag(event, piece)}
                      onPointerUp={(event) => endA4PuzzleDrag(event, piece)}
                      onPointerCancel={cancelA4PuzzleDrag}
                      aria-label={`拖动第${piece + 1}块图像`}
                      aria-grabbed={a4DragState?.piece === piece}
                    />
                  )
                )}
              </div>
              <div className="a4-puzzle-board" role="grid" aria-label="图像缺口">
                {[0, 1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    role="gridcell"
                    data-a4-puzzle-slot={slot}
                    className={`a4-puzzle-slot ${
                      a4PuzzlePieces[slot] === slot
                        ? `filled piece-${slot}`
                        : a4DragOverSlot === slot
                          ? a4DragState?.piece === slot
                            ? "drop-target valid"
                            : "drop-target invalid"
                          : ""
                    }`}
                    aria-label={`第${slot + 1}个图像缺口`}
                  >
                    {a4PuzzlePieces[slot] === null && <span>{slot + 1}</span>}
                  </div>
                ))}
              </div>
            </div>
            {a4DragState && (
              <div
                className={`a4-puzzle-piece a4-drag-ghost piece-${a4DragState.piece}`}
                style={{ left: a4DragState.x, top: a4DragState.y }}
                aria-hidden="true"
              />
            )}
          </section>
        )}

        {started && phoneView === "live" && (
          <header className="broadcast-header">
            <div className="channel-ident">
              <span className="live-lamp" aria-hidden="true" />
              <div>
                <strong>零号频道</strong>
                <span>青河电视台 · 临时直播</span>
              </div>
              {started && !complete && (
                <button
                  className={`follow-control ${isFollowing ? "following" : ""}`}
                  type="button"
                  aria-pressed={isFollowing}
                  onClick={toggleFollow}
                >
                  {isFollowing ? "已关注" : "关注"}
                </button>
              )}
            </div>
            <div className="transmission-data" aria-live="polite">
              <span>{onlineCount.toString().padStart(3, "0")} 在线</span>
              <span className={isGenerating ? "status-pulse" : ""}>{statusText}</span>
              <button
                className="icon-button"
                type="button"
                onClick={() => setMuted((value) => !value)}
                aria-label={muted ? "打开声音" : "关闭声音"}
              >
                <SoundIcon muted={muted} />
              </button>
            </div>
          </header>
        )}

        {disconnectNotice && (
          <div className="disconnect-notice" key={disconnectPhase} role="status">
            <span>频道系统</span>
            {disconnectNotice}
          </div>
        )}

        {started &&
          isAct2Verification &&
          phoneView === "live" &&
          phoneNudge > 0 &&
          !breakerEvidence &&
          !runtimeUrl && (
            <button className="phone-ocr-notice" type="button" onClick={() => setPhoneView("home")}>
              <PhoneAppIcon kind="scan" />
              <span>
                <strong>画面信息已识别</strong>
                <small>
                  {phoneNudge >= 3
                    ? "实况文本已复制到剪贴板"
                    : phoneNudge >= 2
                      ? "识别到地点与设备编号"
                      : "青河电视台 · 13号监视器"}
                </small>
              </span>
            </button>
          )}

        {started && phoneView === "live" && !complete && (
          <aside
            className="chat-stream"
            key={`${visibleMessages.at(-1)?.id}-${disconnectPhase}`}
            aria-label="直播弹幕"
            aria-live="polite"
          >
            {visibleMessages.map((message) => (
              <p
                key={message.id}
                className={`chat-line ${message.tone || "viewer"} ${message.replayed ? "replayed" : ""}`}
              >
                {message.tone === "gift" && <GiftMiniIcon />}
                {message.timestamp && <time className="chat-time">{message.timestamp}</time>}
                <span className="chat-author">{message.author}</span>
                {message.text}
              </p>
            ))}
          </aside>
        )}

        {started && phoneView === "live" && !complete && (
          <>
            {socialToast && (
              <div className="social-toast" role="status">
                {socialToast}
              </div>
            )}
            <div className="like-burst-layer" aria-hidden="true">
              {likeBursts.map((heart) => (
                <span
                  key={heart.id}
                  style={
                    {
                      "--heart-offset": `${heart.offset}px`,
                      "--heart-delay": `${heart.delay}ms`
                    } as CSSProperties
                  }
                >
                  <HeartIcon filled />
                </span>
              ))}
            </div>
            <aside className="social-actions" aria-label="直播互动">
              <button type="button" onClick={handleLike} aria-label={`点赞，当前${likeCount}次`}>
                <HeartIcon />
                <small>{likeCount}</small>
              </button>
              <div className="gift-control">
                {giftTrayOpen && (
                  <div className="gift-tray" aria-label="选择礼物">
                    {giftOptions.map((gift) => (
                      <button type="button" key={gift} onClick={() => sendGift(gift)}>
                        {gift}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  aria-expanded={giftTrayOpen}
                  aria-label="送礼物"
                  onClick={() => setGiftTrayOpen((value) => !value)}
                >
                  <GiftIcon />
                  <small>送礼</small>
                </button>
              </div>
            </aside>
          </>
        )}

        {started && !complete && (
          <div className="chapter-track" aria-hidden="true">
            <span style={{ transform: `scaleX(${chapterProgress / 100})` }} />
          </div>
        )}

        {started &&
          isPhoneExitEnabled &&
          phoneView === "live" &&
          !runtimeUrl &&
          !complete && (
          <button
            className="ios-exit-gesture"
            type="button"
            style={{ "--swipe-offset": `${swipeOffset}px` } as CSSProperties}
            onPointerDown={beginExitSwipe}
            onPointerMove={updateExitSwipe}
            onPointerUp={finishExitSwipe}
            onPointerCancel={finishExitSwipe}
            onClick={(event) => {
              if (event.detail === 0) setPhoneView("home");
            }}
            aria-label="上滑离开直播，返回手机桌面"
          >
            <small>上滑离开直播</small>
            <span />
          </button>
        )}

        {started && isAct2Verification && phoneView !== "live" && !runtimeUrl && !complete && (
          <section className={`phone-surface ab ab-terminal phone-${phoneView}`} aria-label="玩家手机">
            {phoneView === "home" && (
              <>
                <ArchiveTopBar
                  site="随身终端"
                  title="零号频道 · 现场核验"
                  meta="9月17日 周四"
                  source="电量 87%"
                  onBack={() => setPhoneView("live")}
                  backLabel="返回直播"
                />
                <div className="ab-board">
                  <TerminalDesk
                    clock={<TerminalClock time="16:12" date="9月17日 周四" place="青河市　多云 19°" />}
                    status={
                      <LiveStatus state="正在播放" note="林岚还在等待你的回答" onOpen={() => setPhoneView("live")} />
                    }
                  >
                    <DeskTile
                      kind="search"
                      slot="main"
                      icon="browser"
                      label="VEIL 检索"
                      tag="浏览器 · 北星检索"
                      attention={phoneNudge >= 2 && !breakerEvidence}
                      badge={phoneNudge >= 2 && !breakerEvidence ? 1 : undefined}
                      onClick={() => {
                        setPhoneNudge((current) => Math.max(current, 3));
                        setPhoneView("browser");
                      }}
                    >
                      <DeskQuery text={browserSearched ? searchQuery : ""} placeholder="输入关键词" />
                      {breakerEvidence ? (
                        <DeskLine>已保存：青河电视台监视器墙供电改造记录</DeskLine>
                      ) : phoneNudge > 0 ? (
                        <>
                          <DeskKeywords label="实况文本识别到" words={["青河电视台", "13号监视器"]} />
                          <DeskLine fresh>可以把识别到的内容粘贴到检索框</DeskLine>
                        </>
                      ) : (
                        <DeskLine muted>检索旧站缓存里的电视台、设备与人员资料</DeskLine>
                      )}
                    </DeskTile>
                    <DeskTile
                      kind="evidence"
                      slot="aside"
                      icon="evidence"
                      label="照片"
                      tag="个人档案"
                      disabled={!breakerEvidence}
                      lockedNote="还没有保存任何照片或网页"
                      onClick={() => {
                        setSearchQuery("青河电视台 13号");
                        setBrowserSearched(true);
                        setBrowserArchiveOpen(true);
                        setPhoneView("browser");
                      }}
                    >
                      <DeskFile type="网页" title="监视器墙供电改造记录" state="已保存 1 页" />
                    </DeskTile>
                    <DeskTile kind="evidence" slot="sub" icon="evidence" label="备忘录" disabled lockedNote="没有备忘内容" />
                    <DeskTile kind="phone" slot="sub" icon="phone" label="电话" tag="通讯记录" disabled lockedNote="通讯录为空" />
                  </TerminalDesk>
                </div>
                <ArchiveKeys back="返回直播" browse status="零号频道 · 直播中" />
              </>
            )}

            {phoneView === "browser" && (
              <>
                <ArchiveTopBar
                  site="VEIL 检索"
                  title={browserArchiveOpen ? "监视器墙供电改造记录" : "北星检索"}
                  source={browserArchiveOpen ? "archive.qinghe-service.cn" : "search.northstar"}
                  onBack={() => (browserArchiveOpen ? setBrowserArchiveOpen(false) : setPhoneView("home"))}
                  backLabel={browserArchiveOpen ? "返回检索" : "返回桌面"}
                />
                <div className="ab-board">
                  {!browserArchiveOpen && (
                    <div className="ab-split">
                      <div className="ab-thread-main">
                        <form className="ab-paper ab-search" onSubmit={submitArchiveSearch}>
                          <span className="ab-paper-tab">检索卡</span>
                          <label htmlFor="archive-query">北星检索 · 关键词</label>
                          <div className="ab-field">
                            <input
                              id="archive-query"
                              value={searchQuery}
                              autoComplete="off"
                              placeholder="输入关键词"
                              onChange={(event) => {
                                setSearchQuery(event.target.value);
                                setBrowserSearched(false);
                                setBrowserArchiveOpen(false);
                              }}
                            />
                            <ActionBar type="submit" disabled={!searchQuery.trim()}>
                              检索
                            </ActionBar>
                          </div>
                          {phoneNudge >= 3 && !browserSearched && (
                            <button className="ab-hint" type="button" onClick={() => setSearchQuery("青河电视台 13号")}>
                              粘贴来自实况文本的2项内容
                            </button>
                          )}
                        </form>

                        {browserSearched && !searchMatchesArchive && (
                          <div className="ab-empty" role="status">
                            <p>没有找到与“{searchQuery}”完全对应的结果。</p>
                            <small>试着组合电视台名称和设备编号。</small>
                          </div>
                        )}

                        {browserSearched && searchMatchesArchive && (
                          <section className="ab-results" aria-label="搜索结果">
                            <p className="ab-results-meta">北星为您找到相关结果约3条　用时0.18秒</p>
                            <ol className="ab-nav ab-bars">
                              <li>
                                <button
                                  type="button"
                                  className="ab-bar is-stack is-default"
                                  onClick={() => setBrowserArchiveOpen(true)}
                                >
                                  <span className="ab-chip">档案</span>
                                  <strong>青河电视台监视器墙供电改造记录</strong>
                                  <span className="ab-bar-sub">archive.qinghe-service.cn / 广播电视 / 设备改造</span>
                                  <small>C-04回路、13号设备备用电源拆除记录及夜间测试要求……</small>
                                </button>
                              </li>
                              <li>
                                <button type="button" className="ab-bar is-stack" disabled>
                                  <span className="ab-chip is-quiet">公示</span>
                                  <strong>青河电视台旧址设备清点公示</strong>
                                  <span className="ab-bar-sub">qinghe-service.cn / 资料公开 / 文化设施</span>
                                  <small>部分播出设备于2014年停用并封存。</small>
                                </button>
                              </li>
                              <li>
                                <button type="button" className="ab-bar is-stack" disabled>
                                  <span className="ab-chip is-quiet">规范</span>
                                  <strong>地方播出机构夜间检修管理办法</strong>
                                  <span className="ab-bar-sub">qh-media.org / 行业资料 / 安全规范</span>
                                  <small>播出机房总控回路、备用供电与停机记录管理要求。</small>
                                </button>
                              </li>
                            </ol>
                          </section>
                        )}
                      </div>

                      <aside className="ab-rail">
                        {browserSearched && searchMatchesArchive ? (
                          <section className="ab-card ab-related">
                            <h2>相关检索</h2>
                            <div className="ab-nav">
                              <button type="button" className="ab-link" onClick={() => setSearchQuery("青河电视台 停播记录")}>
                                青河电视台 停播记录
                              </button>
                              <button type="button" className="ab-link" onClick={() => setSearchQuery("13号监视器 备用电源")}>
                                13号监视器 备用电源
                              </button>
                            </div>
                          </section>
                        ) : (
                          <section className="ab-card ab-suggest">
                            <h2>搜索建议</h2>
                            <ol aria-label="搜索建议">
                              <li>青河电视台旧址重新规划</li>
                              <li>地方电视台停播设备如何处理</li>
                              <li>老式监视器供电检修方法</li>
                            </ol>
                          </section>
                        )}
                        <Dossier
                          title="实况文本"
                          rows={[
                            ["来源", "零号频道直播画面"],
                            ["识别", phoneNudge > 0 ? "青河电视台 · 13号监视器" : "等待识别"]
                          ]}
                        />
                      </aside>
                    </div>
                  )}

                  {browserArchiveOpen && (
                    <div className="ab-split">
                      <article className="ab-doc">
                        <header className="ab-doc-head">
                          <span className="ab-seal" aria-hidden="true">
                            青
                          </span>
                          <div>
                            <strong>青河城市公共信息服务</strong>
                            <span>QINGHE PUBLIC INFORMATION SERVICE</span>
                          </div>
                          <p>
                            资料编号 QH-GD-2014-0317
                            <br />
                            网页归档节点 013
                          </p>
                        </header>
                        <nav className="ab-doc-tabs" aria-label="资料栏目">
                          <span>信息公开</span>
                          <span>公共文化</span>
                          <strong>广播电视</strong>
                          <span>资料查询</span>
                        </nav>
                        <div className="ab-doc-body">
                          <p className="ab-doc-source">
                            <span>青河电视台技术播出部</span>
                            <time>发布于 2014-03-17　浏览 0313 次</time>
                          </p>
                          <h2 className="ab-doc-title">监视器墙供电改造记录</h2>
                          <p className="ab-doc-lead">
                            为配合夜间播出系统停机检修，技术播出部已完成控制室监视器墙供电回路调整。以下内容为当日设备状态及操作要求。
                          </p>
                          <h3>改造内容</h3>
                          <dl className="ab-records">
                            <div>
                              <dt>总控回路</dt>
                              <dd>C-04，统一控制11至16号监视器墙</dd>
                            </div>
                            <div>
                              <dt>13号设备</dt>
                              <dd>独立备用电源已于停播前拆除，不应具备持续供电能力</dd>
                            </div>
                            <div className="is-key">
                              <dt>夜间测试</dt>
                              <dd>仅切断C-04总控回路；禁止操作13号机身开关</dd>
                            </div>
                          </dl>
                          <aside className="ab-note">
                            <strong>缓存恢复备注</strong>
                            <p>总控断开后，13号设备仍产生过一次活动记录。</p>
                            <small>记录时间：2014-03-18 00:13　来源字段缺失</small>
                          </aside>
                          <footer className="ab-doc-foot">
                            <span>责任编辑：播出保障组</span>
                            <span>归档状态：已停止维护 · 当前读取连接 1</span>
                          </footer>
                          <div className="ab-doc-actions ab-nav">
                            <ActionBar onClick={sendBreakerEvidenceToLive} className={breakerEvidence ? "is-done" : ""}>
                              {breakerEvidence ? "已发送到直播" : "保存此页并发送到直播"}
                            </ActionBar>
                          </div>
                        </div>
                      </article>
                      <aside className="ab-rail">
                        <Dossier
                          title="资料分类"
                          rows={[
                            ["栏目", "播出设施"],
                            ["当前", "设备改造记录"],
                            ["相邻", "夜间检修 / 停播归档"]
                          ]}
                        />
                        <Dossier
                          title="归档统计"
                          rows={[
                            ["公开记录", "28"],
                            ["离线附件", "127"],
                            ["恢复页面", "1"]
                          ]}
                        >
                          <p className="ab-card-note">本页数据来自停止维护的旧站缓存，仅供资料核验。</p>
                        </Dossier>
                      </aside>
                    </div>
                  )}
                </div>
                <ArchiveKeys
                  back={browserArchiveOpen ? "返回检索" : "返回桌面"}
                  browse
                  status={breakerEvidence ? "证据已附加" : "旧站缓存 · 只读"}
                />
              </>
            )}
            <ArchiveFx />
          </section>
        )}

        {started && isAct3PhoneEnabled && phoneView !== "live" && !runtimeUrl && !complete && (
          <section className={`phone-surface ab ab-terminal phone-${phoneView} a3-phone-surface`} aria-label="第三幕调查手机">
            {phoneView === "home" && (
              <>
                <ArchiveTopBar
                  site="随身终端"
                  title="零号频道 · 跨应用调查"
                  meta="9月17日 周四"
                  source="电量 61%"
                  onBack={() => setPhoneView("live")}
                  backLabel="返回直播"
                />
                <div className="ab-board">
                  <TerminalDesk
                    clock={<TerminalClock time="21:16" date="9月17日 周四" place="青河市　小雨 15°" />}
                    status={
                      <LiveStatus
                        state="直播已暂停"
                        note={isAct3Archive ? "等待你决定是否查看附件" : "林岚在等你查清：屏幕里的女人为什么认识你"}
                        onOpen={() => setPhoneView("live")}
                      />
                    }
                  >
                    <DeskTile
                      kind="live"
                      slot="main"
                      icon="live"
                      label="最近实况"
                      tag="视频回放"
                      badge={a3ReplayViewed.length < 2 ? 2 - a3ReplayViewed.length : undefined}
                      attention={!isAct3Archive && a3ReplayViewed.length === 0}
                      onClick={() => setPhoneView("replay")}
                    >
                      <DeskScreen src="/media/act-03/CACHE-A3-01-poster.jpg" rec="已保存 2 段" timecode="21:14" />
                      <span className="ab-tile-tapes">
                        <DeskTape
                          time="21:14"
                          title="屏幕里的旧节目"
                          detail="画面角标《晚安青河》"
                          done={a3ReplayViewed.includes("CACHE-A3-01")}
                        />
                        <DeskTape
                          time="21:15"
                          title="林岚确认身份"
                          detail="林岚提到的人：林秋"
                          done={a3ReplayViewed.includes("CACHE-A3-02")}
                        />
                      </span>
                    </DeskTile>
                    <DeskTile
                      kind="search"
                      slot="aside"
                      icon="browser"
                      label="VEIL 检索"
                      tag="信息检索"
                      badge={isAct3Archive || !a3ExtensionSaved ? 1 : undefined}
                      attention={isAct3Archive || (a3ReplayViewed.length > 0 && !a3ExtensionSaved)}
                      onClick={() => {
                        setPhoneNudge((current) => Math.max(current, 3));
                        if (isAct3Archive) {
                          setA3ArchivePage("accident");
                          setBrowserArchiveOpen(true);
                        }
                        setPhoneView("browser");
                      }}
                    >
                      <DeskQuery
                        text={browserSearched ? searchQuery : ""}
                        placeholder="搜索节目、人物或电视台资料"
                      />
                      {isAct3Archive ? (
                        <DeskLine fresh>旧站缓存新增 1 份关联附件</DeskLine>
                      ) : a3ExtensionSaved ? (
                        <DeskLine>已找到：青河电视台节目资料存档 · 内部热线 0313</DeskLine>
                      ) : a3ReplayViewed.length > 0 ? (
                        <DeskKeywords
                          label="画面中识别到"
                          words={[
                            ...(a3ReplayViewed.includes("CACHE-A3-01") ? ["《晚安青河》"] : []),
                            ...(a3ReplayViewed.includes("CACHE-A3-02") ? ["林秋"] : [])
                          ]}
                        />
                      ) : (
                        <DeskLine muted>先回看画面，找到可以检索的名字</DeskLine>
                      )}
                    </DeskTile>
                    <DeskTile
                      kind="evidence"
                      slot="sub"
                      icon="evidence"
                      label="证据"
                      tag="个人档案"
                      disabled={!a3TapeTimecode}
                      lockedNote="还没有可以交给林岚的证据"
                      attention={a3TapeTimecode && !a3EvidenceAttached}
                      onClick={attachA3EvidenceToLive}
                    >
                      <DeskFile
                        type="语音"
                        title="旧内线留言 · 21:03"
                        state={a3EvidenceAttached ? "已附加到直播" : "可发送到直播"}
                      />
                    </DeskTile>
                    <DeskTile
                      kind="phone"
                      slot="sub"
                      icon="phone"
                      label="电话"
                      tag="通讯记录"
                      disabled={!a3ExtensionSaved}
                      lockedNote="通讯录为空"
                      attention={a3ExtensionSaved && !a3TapeTimecode}
                      badge={a3ExtensionSaved && !a3TapeTimecode ? 1 : undefined}
                      onClick={() => setPhoneView("dialer")}
                    >
                      <DeskContact
                        name="晚安青河"
                        number="0313"
                        state={a3TapeTimecode ? "已接通 · 留言已保存" : "内部热线 · 未拨打"}
                        live={a3TapeTimecode}
                      />
                    </DeskTile>
                  </TerminalDesk>
                </div>
                <ArchiveKeys back="返回直播" browse status="零号频道 · 已暂停" />
              </>
            )}

            {phoneView === "browser" && (
              <>
                <ArchiveTopBar
                  site="VEIL 检索"
                  title={
                    a3ArchivePage === "program"
                      ? "节目资料存档"
                      : a3ArchivePage === "accident"
                        ? "零号频道试播异常记录"
                        : "北星检索"
                  }
                  source={a3ArchivePage ? "archive.qinghe-service.cn" : "search.northstar"}
                  onBack={() => {
                    if (a3ArchivePage) {
                      setA3ArchivePage(null);
                      setBrowserArchiveOpen(false);
                    } else {
                      setPhoneView("home");
                    }
                  }}
                  backLabel={a3ArchivePage ? "返回检索" : "返回桌面"}
                />
                <div className="ab-board">
                  {!a3ArchivePage && (
                    <div className="ab-split">
                      <div className="ab-thread-main">
                        <form className="ab-paper ab-search" onSubmit={submitArchiveSearch}>
                          <span className="ab-paper-tab">检索卡</span>
                          <label htmlFor="a3-archive-query">北星检索 · 节目 / 人物 / 电视台</label>
                          <div className="ab-field">
                            <input
                              id="a3-archive-query"
                              value={searchQuery}
                              autoComplete="off"
                              placeholder="搜索节目、人物或电视台资料"
                              onChange={(event) => {
                                setSearchQuery(event.target.value);
                                setBrowserSearched(false);
                                setA3ArchivePage(null);
                              }}
                            />
                            <ActionBar type="submit" disabled={!searchQuery.trim()}>
                              检索
                            </ActionBar>
                          </div>
                          {a3ReplayViewed.length > 0 && !browserSearched && (
                            <button className="ab-hint" type="button" onClick={pasteA3ReplayText}>
                              使用画面中识别到的节目名和姓名
                            </button>
                          )}
                        </form>

                        {browserSearched && !searchMatchesA3Program && (
                          <div className="ab-empty" role="status">
                            <p>没有找到与“{searchQuery}”对应的旧站资料。</p>
                            <small>
                              {a3SearchAttempts >= 2
                                ? "旧节目资料通常需要节目名称、主持人或电视台名称。"
                                : "当前关键词没有对应的公开缓存。"}
                            </small>
                            <div className="ab-nav">
                              <ActionBar className="is-quiet" onClick={() => setPhoneView("replay")}>
                                查看最近实况
                              </ActionBar>
                            </div>
                          </div>
                        )}

                        {browserSearched && searchMatchesA3Program && (
                          <section className="ab-results" aria-label="搜索结果">
                            <p className="ab-results-meta">北星为您找到相关结果约2条　用时0.21秒</p>
                            <ol className="ab-nav ab-bars">
                              <li>
                                <button
                                  type="button"
                                  className="ab-bar is-stack is-default"
                                  onClick={() => {
                                    setA3ArchivePage("program");
                                    setBrowserArchiveOpen(true);
                                  }}
                                >
                                  <span className="ab-chip">档案</span>
                                  <strong>青河电视台节目资料存档（2013—2014）</strong>
                                  <span className="ab-bar-sub">archive.qinghe-service.cn / 公共文化 / 旧节目</span>
                                  <small>节目名称、主持人、演播地点与内部联络资料……</small>
                                </button>
                              </li>
                              <li>
                                <button type="button" className="ab-bar is-stack" disabled>
                                  <span className="ab-chip is-quiet">公示</span>
                                  <strong>青河电视台停播设备清点公示</strong>
                                  <span className="ab-bar-sub">qinghe-service.cn / 广播电视 / 资料公开</span>
                                  <small>部分栏目资料未完成数字化。</small>
                                </button>
                              </li>
                            </ol>
                          </section>
                        )}
                      </div>

                      <aside className="ab-rail">
                        <section className="ab-card ab-suggest">
                          <h2>搜索建议</h2>
                          <ol aria-label="搜索建议">
                            <li>青河电视台旧址重新规划</li>
                            <li>地方电视节目资料如何查询</li>
                            <li>青河市旧媒体公开档案</li>
                          </ol>
                        </section>
                        <Dossier
                          title="画面识别"
                          rows={[
                            ["节目", a3ReplayViewed.includes("CACHE-A3-01") ? "《晚安青河》" : "未查看"],
                            ["人物", a3ReplayViewed.includes("CACHE-A3-02") ? "林秋" : "未查看"]
                          ]}
                        />
                      </aside>
                    </div>
                  )}

                  {a3ArchivePage === "program" && (
                    <div className="ab-docwrap">
                      <article className="ab-doc">
                        <header className="ab-doc-head">
                          <span className="ab-seal" aria-hidden="true">
                            青
                          </span>
                          <div>
                            <strong>青河城市公共信息服务</strong>
                            <span>QINGHE PUBLIC INFORMATION SERVICE</span>
                          </div>
                          <p>资料编号 QH-TV-PG-0313</p>
                        </header>
                        <nav className="ab-doc-tabs" aria-label="资料栏目">
                          <span>公共文化</span>
                          <strong>节目存档</strong>
                          <span>人员资料</span>
                        </nav>
                        <div className="ab-doc-body">
                          <p className="ab-doc-source">
                            <span>青河电视台节目编排室</span>
                            <time>归档于 2014-03-18</time>
                          </p>
                          <h2 className="ab-doc-title">青河电视台节目资料存档（2013—2014）</h2>
                          <dl className="ab-records">
                            <div>
                              <dt>节目</dt>
                              <dd>《晚安青河》</dd>
                            </div>
                            <div>
                              <dt>主持人</dt>
                              <dd>林秋</dd>
                            </div>
                            <div>
                              <dt>播出地点</dt>
                              <dd>一号演播厅</dd>
                            </div>
                            <div className="is-key">
                              <dt>内部热线</dt>
                              <dd>0313</dd>
                            </div>
                          </dl>
                          <aside className="ab-note">
                            <strong>缓存状态</strong>
                            <p>该分机在停播后仍保留一条未读取线路记录。</p>
                          </aside>
                          <div className="ab-doc-actions ab-nav">
                            <ActionBar onClick={saveA3Extension} className={a3ExtensionSaved ? "is-done" : ""}>
                              {a3ExtensionSaved ? "分机0313已保存" : "保存分机0313"}
                            </ActionBar>
                          </div>
                        </div>
                      </article>
                    </div>
                  )}

                  {a3ArchivePage === "accident" && (
                    <div className="ab-docwrap">
                      <article className="ab-doc is-damaged">
                        <header className="ab-doc-head">
                          <span className="ab-seal" aria-hidden="true">
                            零
                          </span>
                          <div>
                            <strong>青河电视台技术播出部缓存附件</strong>
                            <span>RECOVERED TECHNICAL ATTACHMENT</span>
                          </div>
                          <p>附件 Z0-2103</p>
                        </header>
                        <div className="ab-doc-body">
                          <p className="ab-doc-source">
                            <span>青河电视台技术播出部旧日志</span>
                            <time>源字段：缺失</time>
                          </p>
                          <h2 className="ab-doc-title">零号频道试播异常记录（部分损坏）</h2>
                          <div className="ab-log">
                            <p>
                              <time>21:17</time>零号母带接入播出线路
                            </p>
                            <p>
                              <time>21:18</time>现场主持位人员识别：0
                            </p>
                            <p>
                              <time>21:18</time>播出画面人员识别：1
                            </p>
                            <p>
                              <time>21:19</time>一号演播厅值班员失去联系
                            </p>
                          </div>
                          <aside className="ab-note is-hand">
                            <strong>手写备注</strong>
                            <p>画面里的人还在播。现场的人不见了。</p>
                            <p>不要再让任何人站到主持位。</p>
                          </aside>
                          <aside className="ab-note is-void">
                            <strong>后续内容</strong>
                            <p>[ 数据损坏 ]</p>
                          </aside>
                          <div className="ab-doc-actions ab-nav">
                            <ActionBar onClick={finishA3ArchiveAndReact}>保存到证据并返回直播</ActionBar>
                          </div>
                        </div>
                      </article>
                    </div>
                  )}
                </div>
                <ArchiveKeys back={a3ArchivePage ? "返回检索" : "返回桌面"} browse status="旧站缓存 · 只读" />
              </>
            )}

            {phoneView === "replay" && (
              <>
                <ArchiveTopBar
                  site="最近实况"
                  title="刚才自动保存的2段画面"
                  source="零号频道 · 本地缓存"
                  onBack={() => setPhoneView("home")}
                  backLabel="返回桌面"
                />
                <div className="ab-board">
                  <div className="ab-tapes">
                    {[
                      { id: "CACHE-A3-01" as const, label: "屏幕里的旧节目", time: "21:14" },
                      { id: "CACHE-A3-02" as const, label: "林岚确认身份", time: "21:15" }
                    ].map((tape) => {
                      const viewed = a3ReplayViewed.includes(tape.id);
                      return (
                        <article key={tape.id} className={`ab-tape ${viewed ? "is-done" : ""}`}>
                          <div className="ab-tape-screen">
                            <video
                              src={`/media/act-03/${tape.id}.mp4`}
                              controls
                              playsInline
                              onTimeUpdate={(event) => {
                                if (
                                  event.currentTarget.duration &&
                                  event.currentTarget.currentTime / event.currentTarget.duration >= 0.7
                                ) {
                                  markA3ReplayViewed(tape.id);
                                }
                              }}
                            />
                          </div>
                          <div className="ab-tape-label">
                            <span>{tape.id}</span>
                            <strong>
                              {tape.label} · {tape.time}
                            </strong>
                            <small>{viewed ? "已完整查看" : "未完整查看"}</small>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {a3ReplayViewed.length > 0 && (
                    <div className="ab-tapes-action ab-nav">
                      <ActionBar onClick={pasteA3ReplayText}>用画面中识别到的内容去VEIL查找</ActionBar>
                    </div>
                  )}
                </div>
                <ArchiveKeys back="返回桌面" status={`已查看 ${a3ReplayViewed.length} / 2`} />
              </>
            )}

            {phoneView === "dialer" && (
              <>
                <ArchiveTopBar
                  site="电话"
                  title="内部线路拨号"
                  meta="21:18"
                  onBack={() => setPhoneView("home")}
                  backLabel="完成"
                />
                <div className="ab-board">
                  <div className="ab-dial">
                    <div className="ab-dial-side">
                      <div className="ab-lcd" aria-live="polite">
                        <small>{a3ExtensionSaved ? "已保存分机" : "输入内部号码"}</small>
                        <strong>{a3DialInput || "————"}</strong>
                        {a3CallState === "wrong" && <span>线路不存在，请检查号码后重试。</span>}
                      </div>
                      {a3ExtensionSaved && (
                        <Dossier title="通讯录" rows={[["晚安青河", "内部热线 0313"]]}>
                          {!a3DialInput && (
                            <div className="ab-nav">
                              <button type="button" className="ab-link" onClick={() => setA3DialInput("0313")}>
                                填入已保存分机
                              </button>
                            </div>
                          )}
                        </Dossier>
                      )}
                    </div>
                    <div className="ab-dial-pad">
                      <div className="ab-keypad" aria-label="电话拨号键盘">
                        {"123456789".split("").map((digit) => (
                          <button
                            type="button"
                            key={digit}
                            onClick={() => setA3DialInput((current) => `${current}${digit}`.slice(0, 8))}
                          >
                            {digit}
                          </button>
                        ))}
                        <span />
                        <button type="button" onClick={() => setA3DialInput((current) => `${current}0`.slice(0, 8))}>
                          0
                        </button>
                        <button
                          type="button"
                          aria-label="删除一位"
                          onClick={() => setA3DialInput((current) => current.slice(0, -1))}
                        >
                          ⌫
                        </button>
                      </div>
                      <div className="ab-nav">
                        <ActionBar onClick={dialA3Extension} disabled={!a3DialInput}>
                          拨号
                        </ActionBar>
                      </div>
                    </div>
                  </div>
                </div>
                <ArchiveKeys back="完成" status="青河电视台 · 内部线路" />
              </>
            )}

            {phoneView === "call" && (
              <>
                <ArchiveTopBar
                  site="电话"
                  title="青河电视台 · 内部线路"
                  meta="0313"
                  onBack={() => setPhoneView("dialer")}
                  backLabel="返回拨号器"
                />
                <div className="ab-board">
                  <div className="ab-call">
                    <audio ref={callAudioRef} src="/media/act-03/CALL-A3-01.m4a" onEnded={finishA3Voicemail} />
                    <small>青河电视台 · 内部线路</small>
                    <strong>0313</strong>
                    <span>{a3CallState === "complete" ? "留言播放完毕" : "正在播放旧线路留言…"}</span>
                    <div className={`ab-wave ${a3CallState === "playing" ? "is-playing" : ""}`} aria-hidden="true">
                      {Array.from({ length: 23 }, (_, index) => (
                        <i key={index} />
                      ))}
                    </div>
                    <p>线路建立时间：2014-03-18 21:16</p>
                    <div className="ab-call-actions ab-nav">
                      {a3CallState === "complete" ? (
                        <ActionBar onClick={attachA3EvidenceToLive}>保存语音证据并发送到直播</ActionBar>
                      ) : (
                        <ActionBar
                          className="is-quiet"
                          onClick={() => {
                            setA3CallState("playing");
                            const audio = callAudioRef.current;
                            if (audio) {
                              audio.currentTime = 0;
                              void audio.play();
                            }
                          }}
                        >
                          重新播放
                        </ActionBar>
                      )}
                    </div>
                  </div>
                </div>
                <ArchiveKeys back="返回拨号器" status={a3CallState === "complete" ? "语音证据已保存" : "通话中"} />
              </>
            )}
            <ArchiveFx />
          </section>
        )}

        {started && isAct4Investigation && phoneView !== "live" && !runtimeUrl && !complete && (
          <section className={`phone-surface ab ab-terminal phone-${phoneView} a4-phone-surface`} aria-label="查找未发送留言">
            {phoneView === "home" && (
              <>
                <ArchiveTopBar
                  site="随身终端"
                  title="零号频道 · 恢复留言"
                  meta="9月17日 周四"
                  source="电量 63%"
                  onBack={() => setPhoneView("live")}
                  backLabel="返回直播"
                />
                <div className="ab-board">
                  <TerminalDesk
                    clock={<TerminalClock time="21:24" date="9月17日 周四" place="青河市　信号不稳定" />}
                    status={
                      <LiveStatus state="直播已暂停" note="林岚正在等你查清“21:03”" onOpen={() => setPhoneView("live")} />
                    }
                  >
                    <DeskTile
                      kind="search"
                      slot="main"
                      icon="browser"
                      label="VEIL 恢复"
                      tag="记录恢复"
                      badge={1}
                      attention
                      onClick={() => setPhoneView("browser")}
                    >
                      <DeskQuery text={a4SearchComplete ? a4SearchQuery : ""} placeholder="输入时间、姓名或记录类型" />
                      <DeskLine fresh>恢复索引：21:03记录检测到一条未发送值班留言</DeskLine>
                      <DeskKeywords label="索引字段" words={["21:03", "林秋", "未发送"]} />
                    </DeskTile>
                    <DeskTile
                      kind="live"
                      slot="aside"
                      icon="live"
                      label="最近实况"
                      tag="视频回放"
                      disabled
                      lockedNote="信号不稳定，缓存画面无法读取"
                    />
                    <DeskTile
                      kind="evidence"
                      slot="sub"
                      icon="evidence"
                      label="证据"
                      tag="个人档案"
                      disabled
                      lockedNote="信号不稳定，档案无法打开"
                    />
                    <DeskTile
                      kind="phone"
                      slot="sub"
                      icon="phone"
                      label="电话"
                      tag="通讯记录"
                      disabled
                      lockedNote="信号不稳定，无法拨出"
                    />
                  </TerminalDesk>
                </div>
                <ArchiveKeys back="返回直播" browse status="信号不稳定" />
              </>
            )}

            {phoneView === "browser" && (
              <>
                <ArchiveTopBar
                  site="VEIL 恢复"
                  title={a4ArchiveOpen ? "未发送的值班留言" : "恢复记录检索"}
                  source={a4ArchiveOpen ? "cache.qinghe-tv.cn" : "VEIL RECOVERY"}
                  onBack={() => (a4ArchiveOpen ? setA4ArchiveOpen(false) : setPhoneView("home"))}
                  backLabel={a4ArchiveOpen ? "返回检索" : "返回桌面"}
                />
                <div className="ab-board">
                  {!a4ArchiveOpen && (
                    <div className="ab-split">
                      <div className="ab-thread-main">
                        <form className="ab-paper ab-search" onSubmit={submitA4Search}>
                          <span className="ab-paper-tab">恢复卡</span>
                          <label htmlFor="a4-archive-query">恢复记录 · 时间 / 姓名 / 类型</label>
                          <div className="ab-field">
                            <input
                              id="a4-archive-query"
                              value={a4SearchQuery}
                              autoComplete="off"
                              placeholder="输入时间、姓名或记录类型"
                              onChange={(event) => {
                                setA4SearchQuery(event.target.value);
                                setA4SearchComplete(false);
                              }}
                            />
                            <ActionBar type="submit" disabled={!a4SearchQuery.trim()}>
                              检索
                            </ActionBar>
                          </div>
                          {!a4SearchComplete && (
                            <button
                              className="ab-hint"
                              type="button"
                              onClick={() => setA4SearchQuery("21:03 林秋 未发送值班留言")}
                            >
                              使用恢复索引：21:03 / 林秋 / 未发送
                            </button>
                          )}
                        </form>

                        {a4SearchComplete && !a4SearchMatches && (
                          <div className="ab-empty" role="status">
                            <p>没有找到完全对应的缓存。</p>
                            <small>组合恢复通知中的时间、姓名和记录状态。</small>
                          </div>
                        )}

                        {a4SearchComplete && a4SearchMatches && (
                          <section className="ab-results" aria-label="搜索结果">
                            <p className="ab-results-meta">找到1条损坏的本地缓存</p>
                            <ol className="ab-nav ab-bars">
                              <li>
                                <button
                                  type="button"
                                  className="ab-bar is-stack is-default"
                                  onClick={() => setA4ArchiveOpen(true)}
                                >
                                  <span className="ab-chip">草稿</span>
                                  <strong>林秋未发送的值班留言</strong>
                                  <span className="ab-bar-sub">2014-03-18 21:03 / 草稿缓存</span>
                                  <small>零号母带、返看机、播出线路……部分字段损坏</small>
                                </button>
                              </li>
                            </ol>
                          </section>
                        )}
                      </div>
                      <aside className="ab-rail">
                        <Dossier
                          title="恢复索引"
                          rows={[
                            ["时间", "21:03"],
                            ["姓名", "林秋"],
                            ["状态", "未发送"]
                          ]}
                        />
                      </aside>
                    </div>
                  )}

                  {a4ArchiveOpen && (
                    <div className="ab-docwrap">
                      <article className="ab-doc ab-letter">
                        <header className="ab-doc-head">
                          <span className="ab-seal" aria-hidden="true">
                            秋
                          </span>
                          <div>
                            <strong>未发送的值班留言</strong>
                            <span>LOCAL DRAFT / RECOVERED</span>
                          </div>
                          <p>21:03</p>
                        </header>
                        <div className="ab-doc-body">
                          <p className="ab-doc-source">
                            <span>发件人：林秋</span>
                            <time>2014-03-18 21:03</time>
                          </p>
                          <div className="ab-letter-copy">
                            <p>如果以后屏幕里的我让你播放零号母带，先别照做。</p>
                            <p>我不知道那时候屏幕里的……还是不是我。</p>
                            <p>零号母带会把最后一个站在主持位的人——</p>
                            <p className="is-damaged">[ 后半句数据损坏 ]</p>
                            <p>控制台旁边有返看机。断开播出线路，先看最后一分钟。</p>
                          </div>
                          <div className="ab-doc-actions ab-nav">
                            <ActionBar onClick={sendA4ArchiveMessage}>发送到直播</ActionBar>
                          </div>
                        </div>
                      </article>
                    </div>
                  )}
                </div>
                <ArchiveKeys back={a4ArchiveOpen ? "返回检索" : "返回桌面"} browse status="本地缓存 · 部分损坏" />
              </>
            )}
            <ArchiveFx />
          </section>
        )}

        {!started && (
          <Prologue
            page={prologuePage}
            usernameInput={usernameInput}
            usernameValid={usernameValid}
            usernameChecking={usernameChecking}
            usernameWarning={usernameWarning}
            seenNotice={prologueSeen.notice}
            seenPhoto={prologueSeen.photo}
            gmOpen={gmToolsOpen}
            serviceReady={serviceReady}
            onUsernameChange={(value) => {
              setUsernameInput(value);
              if (usernameWarning) setUsernameWarning("");
            }}
            onSubmit={startBroadcast}
            onOpen={openProloguePage}
            onToggleGm={() => setGmToolsOpen((current) => !current)}
            menu={{
              saveData,
              muted,
              onContinue: () => {
                if (saveData.latest) resumeFromRecord(saveData.latest.chapter);
              },
              onLoad: resumeFromRecord,
              onToggleMute: () => setMuted((value) => !value),
              onClearSave: () => setSaveData(clearSave())
            }}
            gmActions={[
              { label: "实时对话与视频测试", onClick: () => window.open('/?gm=runtime', '_blank', 'noopener,noreferrer') },
              { label: "第一幕验证", onClick: jumpToFirstInteraction },
              { label: "配乐实装·前段直播", onClick: jumpToSecondInteraction },
              { label: "音效实装·观众断线", onClick: jumpToDisconnectTest },
              { label: "音效实装·母亲旧录像", onClick: () => jumpToAct3("mother") },
              { label: "音效实装·拼图跳脸", onClick: () => jumpToAct4("puzzle") },
              { label: "音效实装·双屏争夺", onClick: () => jumpToAct4("a5-03") },
              { label: "第二幕验证", onClick: () => jumpToAct2Interaction("verification") },
              { label: "用户名镜头", onClick: () => jumpToAct2Interaction("record") },
              { label: "用户名解释", onClick: () => jumpToAct2Interaction("identity") },
              { label: "第三幕入口", onClick: () => jumpToAct3("start") },
              { label: "林秋回应", onClick: () => jumpToAct3("interaction") },
              { label: "第三幕解谜", onClick: () => jumpToAct3("puzzle") },
              { label: "第四幕入口", onClick: () => jumpToAct4("start") },
              { label: "21:03留言", onClick: () => jumpToAct4("archive") },
              { label: "相信谁", onClick: () => jumpToAct4("judgment") },
              { label: "第五幕入口", onClick: () => jumpToAct4("a5") },
              { label: "最后提问", onClick: () => jumpToAct4("a5-05") },
              { label: "最终决定", onClick: () => jumpToAct4("decision") },
              { label: "E3结局页", onClick: jumpToE3EndingForum }
            ]}
          />
        )}

        {started && step?.kind === "autoRuntime" && !runtimeUrl && !complete && (
          <section className="a3-event-dock" aria-label="环境异常生成状态">
            <span>
              {selectedA3Event === "PAST_ECHO"
                ? "林秋没有移开视线。屏幕里响起一阵断续的磁带声……"
                : "林秋沉默后，演播厅里传来一声很轻的木头摩擦声……"}
            </span>
            {isGenerating && (
              <div className="generation-status" role="status">
                <span style={{ transform: `scaleX(${Math.max(8, job?.progress || 0) / 100})` }} />
                <p>
                  {selectedA3Event === "PAST_ECHO"
                    ? "林岚没有说话，只把手机继续对着屏幕。"
                    : "林岚循着声音，慢慢把镜头转向身后。"}
                </p>
              </div>
            )}
            {job?.status === "failed" && (
              <div className="error-strip" role="alert">
                <p>{job.error}</p>
                <button type="button" onClick={retryPendingRuntime}>
                  重新锁定
                </button>
                <button type="button" onClick={skipFailedRuntime}>
                  读取信号残帧继续
                </button>
              </div>
            )}
          </section>
        )}

        {started && isAct3Investigation && phoneView === "live" && !runtimeUrl && !complete && (
          <section className="a3-investigation-dock" aria-label="第三幕跨应用调查">
            <div>
              <span>{a3EvidenceAttached ? "发送给林岚" : "林岚发现了不可能发生的事"}</span>
              <p>
                {a3EvidenceAttached
                  ? "“把屏幕里的节目调回21:03，不要动椅子上的母带。”"
                  : selectedA3Event === "PAST_ECHO"
                    ? `林秋刚才逐字念出了你在20:47发过的弹幕：“${pastEchoPhrase}”。手机保存了这段节目画面，也记下了林岚喊出的名字。`
                    : "椅子自己转向了镜头，屏幕里的林秋却像早就知道会发生。手机保存了节目画面和林岚喊出的名字，也许能查到她与这里的关系。"}
              </p>
              {!a3EvidenceAttached && (
                <small className="a3-investigation-goal">
                  <PhoneAppIcon kind="scan" />
                  想办法查清：屏幕里的女人为什么知道今晚发生的事
                </small>
              )}
              {a3EvidenceAttached && (
                <small>
                  <PhoneAppIcon kind="evidence" />
                  附带旧内线留言（21:03）
                </small>
              )}
            </div>
            {a3EvidenceAttached ? (
              <button type="button" className="primary-action" onClick={confirmA3Evidence}>
                发送弹幕
                <ArrowIcon />
              </button>
            ) : (
              <button type="button" className="primary-action" onClick={() => setPhoneView("home")}>
                查看保存下来的线索
                <ArrowIcon />
              </button>
            )}
            {canSkipA3 && !a3EvidenceAttached && (
              <button type="button" className="a3-skip-investigation" onClick={skipA3Investigation}>
                {a3SkipConfirm ? "再次确认：先带母带回控制室" : "暂时放弃调查"}
              </button>
            )}
          </section>
        )}

        {started && isAct3Archive && phoneView === "live" && !runtimeUrl && !complete && (
          a3IncidentLogRead ? (
            <section className="a3-event-dock" aria-label="林岚阅读事故记录后的反应生成状态">
              <span>林岚看完记录，慢慢把手机翻回前置摄像头……</span>
              {isGenerating && (
                <div className="generation-status" role="status">
                  <span style={{ transform: `scaleX(${Math.max(8, job?.progress || 0) / 100})` }} />
                  <p>她看向演播厅里的主持位，像是终于把两件事联系到了一起。</p>
                </div>
              )}
              {job?.status === "failed" && (
                <div className="error-strip" role="alert">
                  <p>{job.error}</p>
                  <button type="button" onClick={retryPendingRuntime}>重新生成反应</button>
                  <button type="button" onClick={skipFailedRuntime}>跳过反应，继续直播</button>
                </div>
              )}
            </section>
          ) : (
            <section className="a3-investigation-dock a3-archive-dock" aria-label="新增事故附件">
              <div>
                <span>21:03返看结束</span>
                <p>返看机停在雪花画面。手机收到1份与零号母带相关的试播事故附件。</p>
              </div>
              <button type="button" className="primary-action" onClick={openA3AccidentArchive}>
                查看新增附件
                <ArrowIcon />
              </button>
              <button type="button" onClick={finishA3BeforeTransition}>
                稍后查看，返回直播
              </button>
            </section>
          )
        )}

        {started && isAct4Investigation && phoneView === "live" && !runtimeUrl && !complete && (
          <section className="a3-investigation-dock a4-investigation-dock" aria-label="第四幕跨应用调查">
            <div>
              <span>{a4MessageSent ? "留言已送达林岚" : "未来林岚的信号在一句话中断了"}</span>
              <p>
                {a4MessageSent
                  ? "林岚正在按留言改用返看机检查母带，不再直接连接播出线路。"
                  : "她只来得及说出“别放进去，你会……”和“二十一点零三分……妈妈有一条没发——”。去VEIL恢复那条记录。"}
              </p>
              {!a4MessageSent && (
                <small className="a3-investigation-goal">
                  <PhoneAppIcon kind="evidence" />
                  目标：找到21:03林秋未发送的值班留言
                </small>
              )}
            </div>
            {!a4MessageSent && (
              <button type="button" className="primary-action" onClick={() => setPhoneView("home")}>
                离开直播去查找
                <ArrowIcon />
              </button>
            )}
            {a4MessageSent && isGenerating && (
              <div className="generation-status" role="status">
                <span style={{ transform: `scaleX(${Math.max(8, job?.progress || 0) / 100})` }} />
                <p>林岚正在读取留言并切换到返看线路。</p>
              </div>
            )}
            {job?.status === "failed" && (
              <div className="error-strip" role="alert">
                <p>{job.error}</p>
                <button type="button" onClick={retryPendingRuntime}>重新发送</button>
                <button type="button" onClick={skipFailedRuntime}>跳过生成继续</button>
              </div>
            )}
          </section>
        )}

        {started && phoneView === "live" && isInteraction && !runtimeUrl && !complete && (
          <section
            className="interaction-dock"
            data-relay={job?.status === "failed" ? "fault" : isGenerating ? "tx" : clarifying ? "retry" : "idle"}
            aria-label="发送弹幕"
          >
            <header className="relay-bar">
              <span className="relay-bar-id" aria-hidden="true">
                <i className="relay-lamp" />
                <span className="relay-bar-code">CH.00</span>
                <i className="relay-bar-rule" />
                <strong>弹幕回传</strong>
                <span className="relay-bar-tag">LIVE RELAY</span>
              </span>
              <span className="relay-bar-tools">
                {step.runtimeId !== "RT-06" && step.suggestions.length > 0 && (
                  <span className="relay-hints">
                    <button
                      className="hint-toggle"
                      type="button"
                      disabled={isGenerating}
                      aria-expanded={hintStepId === step.id}
                      onClick={() => setHintStepId((current) => (current === step.id ? null : step.id))}
                    >
                      {hintStepId === step.id ? "收起提示" : "不知道怎么说？"}
                    </button>
                    {hintStepId === step.id && (
                      <span className="suggestion-row" aria-label="可写入语句">
                        {step.suggestions.map((suggestion) => (
                          <button
                            type="button"
                            key={suggestion}
                            disabled={isGenerating}
                            onClick={() => {
                              setInput(suggestion);
                              setInputWarning("");
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </span>
                    )}
                  </span>
                )}
                <span className="relay-signal" aria-hidden="true">
                  <span className="relay-signal-label">
                    {job?.status === "failed"
                      ? "OFFLINE"
                      : isGenerating
                        ? "SENDING"
                        : clarifying
                          ? "NOISE"
                          : "ONLINE"}
                  </span>
                  <span className="relay-signal-bars">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              </span>
            </header>

            <span className="relay-speaker">零号频道</span>

            <div className="interaction-copy">
              <p>
                {clarifying
                  ? step.runtimeId === "RT-06"
                    ? "林岚没有听懂你的最终决定。请明确告诉她：播放母带，还是彻底停播。"
                    : "林岚没有听懂你的意思。把最重要的行动再说得明确一点。"
                  : interactionPrompt}
              </p>
              {isAct2Verification && breakerEvidence && (
                <span className="attached-evidence">
                  <PhoneAppIcon kind="evidence" />
                  已附加：监视器墙供电改造记录
                </span>
              )}
            </div>

            <div className="relay-console">
              {step.runtimeId === "RT-06" && (
                <div className="final-decision-choices" aria-label="最终决定快捷选项">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => void submitPlayerMessage("播放母带。")}
                  >
                    播放零号母带
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => void submitPlayerMessage("彻底停播，切断总电源并毁掉母带。")}
                  >
                    彻底停播
                    <small>切断电源并毁掉母带</small>
                  </button>
                </div>
              )}
              {step.runtimeId !== "RT-06" && (
                <form onSubmit={submitComment}>
                  <label htmlFor="bullet-input" className="sr-only">
                    输入弹幕
                  </label>
                  <input
                    id="bullet-input"
                    value={input}
                    disabled={isGenerating}
                    maxLength={280}
                    autoComplete="off"
                    placeholder={
                      isGenerating
                        ? "回传中，请保持连接…"
                        : clarifying
                          ? "明确告诉林岚先去哪里…"
                          : step.placeholder
                    }
                    onChange={(event) => {
                      setInput(event.target.value);
                      if (inputWarning) setInputWarning("");
                    }}
                  />
                  <button type="submit" disabled={!input.trim() || isGenerating || textChecking}>
                    {textChecking ? "验证中" : isGenerating ? "已发送" : "发送"}
                    <i className="relay-send-mark" aria-hidden="true" />
                  </button>
                </form>
              )}
              {inputWarning && (
                <p className="input-warning" role="alert">
                  {inputWarning}
                </p>
              )}

              {isGenerating && (
                <div className="generation-status" role="status">
                  <span style={{ transform: `scaleX(${Math.max(8, job?.progress || 0) / 100})` }} />
                  <p>{job?.phase === "reasoning" ? "林岚正在听你的话，组织回应…" : "回应画面正在生成，请保持连接…"}</p>
                </div>
              )}

              {job?.status === "failed" && (
                <div className="error-strip" role="alert">
                  <p>{job.error}</p>
                  <button type="button" onClick={retryPendingRuntime}>
                    重新发送
                  </button>
                  <button type="button" onClick={canUseRuntimeCache ? playCachedRuntime : skipFailedRuntime}>
                    {canUseRuntimeCache ? "播放上次生成" : "跳过生成"}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {complete && step?.id === "INT-A5-00" && endingIntent === "SHUT_DOWN" && (
          <E3EndingForum username={username} onRestart={restart} />
        )}

        {complete && !(step?.id === "INT-A5-00" && endingIntent === "SHUT_DOWN") && (
          <section className="complete-panel">
            <span className="route-label">
              {step?.id === "INT-A5-00"
                ? endingOutcome?.label || "最终决定已记录"
                : thirdActComplete
                ? a3MissedArchive
                  ? "第三幕完成｜调查暂缓"
                  : "第三幕完成｜21:03记录已恢复"
                : routeOutcomes[routeIntent || "OTHER"].label}
            </span>
            <h2>
              {step?.id === "INT-A5-00"
                ? endingOutcome?.title || "等待结局素材"
                : thirdActComplete
                  ? "等待返回控制室"
                  : routeOutcomes[routeIntent || "OTHER"].title}
            </h2>
            <p>
              {step?.id === "INT-A5-00"
                ? endingOutcome?.description || "最终决定已经保存，后续分支视频等待接入。"
                : thirdActComplete
                ? a3MissedArchive
                  ? "林岚决定先带上零号母带。节目资料仍保留在手机里，后续可以补做调查。"
                  : a3IncidentLogRead
                    ? "你确认了零号母带不属于十二年前的现场，也看到了试播事故留下的异常人数记录。"
                    : "你确认了零号母带不属于十二年前的现场；事故附件已经保存在VEIL中。"
                : routeOutcomes[routeIntent || "OTHER"].description}
            </p>
            {step?.id === "INT-A5-00" ? (
              <blockquote className="ending-epilogue">
                {endingOutcome?.epilogue || "直播已经结束。"}
              </blockquote>
            ) : (
              <small>
                后续节点：
                {thirdActComplete ? "PRE-A3-06" : routeOutcomes[routeIntent || "OTHER"].nextNode}
              </small>
            )}
            <button className="primary-action" type="button" onClick={restart}>
              重新接入
              <ReplayIcon />
            </button>
          </section>
        )}
        </section>
      </div>
      <aside className="portrait-guard" aria-label="请横屏游玩">
        <span className="portrait-device" aria-hidden="true">
          <i />
        </span>
        <strong>请横屏游玩</strong>
        <small>旋转设备以恢复完整的 16:9 直播画面</small>
      </aside>
    </main>
  );
}
