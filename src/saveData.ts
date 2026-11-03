export type ChapterId = "act1" | "act2" | "act3" | "act4" | "act5";

export type ChapterInfo = {
  id: ChapterId;
  number: string;
  act: string;
  name: string;
  location: string;
  /** 进入该章节时的首个步骤 ID，用于自动记录与读取。 */
  stepId: string;
};

export const chapters: ChapterInfo[] = [
  { id: "act1", number: "01", act: "第一幕", name: "大厅里的电视", location: "一楼大厅", stepId: "PRE-G-01" },
  { id: "act2", number: "02", act: "第二幕", name: "提前发生的直播", location: "总控室", stepId: "PRE-A2-02+03+04" },
  { id: "act3", number: "03", act: "第三幕", name: "一号演播厅", location: "一号演播厅", stepId: "PRE-A3-01+02" },
  { id: "act4", number: "04", act: "第四幕", name: "十三号屏幕", location: "总控室", stepId: "PRE-A3-06" },
  { id: "act5", number: "05", act: "第五幕", name: "最后一次提问", location: "总控室", stepId: "PRE-A5-01+02" }
];

export type SaveRecord = {
  chapter: ChapterId;
  username: string;
  firstMessage: string;
  routeMessage: string;
  routeIntent: string | null;
  savedAt: number;
};

export type SaveData = {
  version: 1;
  latest: SaveRecord | null;
  records: Partial<Record<ChapterId, SaveRecord>>;
};

export type GameSettings = {
  muted: boolean;
};

const SAVE_KEY = "tingbo-zhihou.save.v1";
const SETTINGS_KEY = "tingbo-zhihou.settings.v1";

const emptySave = (): SaveData => ({ version: 1, latest: null, records: {} });

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储不可用时（隐私模式等）静默跳过，游戏流程不受影响。
  }
}

export function loadSave(): SaveData {
  const data = readJson<SaveData>(SAVE_KEY);
  if (!data || data.version !== 1 || typeof data.records !== "object") return emptySave();
  return data;
}

export function writeCheckpoint(record: SaveRecord): SaveData {
  const data = loadSave();
  const next: SaveData = {
    version: 1,
    latest: record,
    records: { ...data.records, [record.chapter]: record }
  };
  writeJson(SAVE_KEY, next);
  return next;
}

export function clearSave(): SaveData {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
  return emptySave();
}

export function loadSettings(): GameSettings {
  const data = readJson<Partial<GameSettings>>(SETTINGS_KEY);
  return { muted: Boolean(data?.muted) };
}

export function saveSettings(settings: GameSettings) {
  writeJson(SETTINGS_KEY, settings);
}

export function chapterById(id: ChapterId) {
  return chapters.find((chapter) => chapter.id === id) ?? chapters[0];
}

export function formatSaveTime(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
