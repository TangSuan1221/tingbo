import { ComponentProps, FormEvent, type ReactNode, useEffect } from "react";
import { ArrowIcon } from "./icons";
import { IntroTerminal } from "./IntroTerminal";
import { MainMenu } from "./MainMenu";
import {
  ActionBar,
  ArchiveFx,
  ArchiveKeys,
  ArchiveTopBar,
  Dossier,
  ReplyBoard,
  ReplyStrip,
  UserStamp
} from "./archive/ArchiveChrome";

type MainMenuBindings = Omit<ComponentProps<typeof MainMenu>, "onStart">;

const coverImageUrl = "/media/runtime-references/WEB-G00-live-preview.jpg";
const nightPhotoUrl = "/media/runtime-references/WEB-G00-night-station.jpg?v=3";

export type ProloguePage = "cover" | "intro" | "forum" | "thread" | "road" | "radio" | "notice" | "photo" | "join";

type GmAction = {
  label: string;
  onClick: () => void;
};

type PrologueProps = {
  page: ProloguePage;
  usernameInput: string;
  usernameValid: boolean;
  usernameChecking?: boolean;
  usernameWarning?: string;
  seenNotice: boolean;
  seenPhoto: boolean;
  gmOpen: boolean;
  serviceReady: boolean | null;
  onUsernameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onOpen: (page: ProloguePage) => void;
  onToggleGm: () => void;
  gmActions: GmAction[];
  menu: MainMenuBindings;
};

type PageChrome = {
  site: string;
  title: string;
  source: string;
  back?: ProloguePage;
  backLabel?: string;
};

const mainThreadTitle = "明天就要拆的青河电视台，今晚里面怎么还有灯？";

const chrome: Record<Exclude<ProloguePage, "cover" | "intro">, PageChrome> = {
  forum: {
    site: "青河同城",
    title: "本地热帖",
    source: "bbs.qinghe-tongcheng.cn",
    back: "cover",
    backLabel: "返回"
  },
  thread: {
    site: "青河同城",
    title: mainThreadTitle,
    source: "bbs.qinghe-tongcheng.cn/t/2317",
    back: "forum",
    backLabel: "返回列表"
  },
  road: {
    site: "青河同城",
    title: "青河路北段今晚临时封路",
    source: "bbs.qinghe-tongcheng.cn/t/2315",
    back: "forum",
    backLabel: "返回列表"
  },
  radio: {
    site: "青河同城",
    title: "有人收旧收音机和磁带机吗",
    source: "bbs.qinghe-tongcheng.cn/t/2298",
    back: "forum",
    backLabel: "返回列表"
  },
  notice: {
    site: "公开资料",
    title: "青河电视台停播及拆除公告",
    source: "archive.qinghe-service.cn/notice/2014-0318",
    back: "thread",
    backLabel: "返回讨论帖"
  },
  photo: {
    site: "青河同城",
    title: "现场照片 · 今晚 20:47 北口夜景",
    source: "bbs.qinghe-tongcheng.cn/t/2317/photo",
    back: "thread",
    backLabel: "返回讨论帖"
  },
  join: {
    site: "临时直播",
    title: "访客接入",
    source: "live.qinghe-now.cn/guest",
    back: "thread",
    backLabel: "返回讨论帖"
  }
};

export function Prologue({
  page,
  usernameInput,
  usernameValid,
  usernameChecking = false,
  usernameWarning = "",
  seenNotice,
  seenPhoto,
  gmOpen,
  serviceReady,
  onUsernameChange,
  onSubmit,
  onOpen,
  onToggleGm,
  gmActions,
  menu
}: PrologueProps) {
  const liveUnlocked = seenNotice && seenPhoto;

  useEffect(() => {
    if (page !== "thread" || !liveUnlocked) return;
    document.querySelector(".ab-live-card")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [liveUnlocked, page]);

  const gm = (
    <div className="prologue-gm">
      {import.meta.env.DEV && (
        <>
          <button type="button" className="gm-entry gm-entry-trigger" onClick={onToggleGm}>
            {gmOpen ? "收起开发入口" : "开发入口"}
          </button>
          {gmOpen && (
            <div className="gm-entries prologue-gm-list" aria-label="GM测试入口">
              {gmActions.map((action) => (
                <button key={action.label} className="gm-entry" type="button" onClick={action.onClick}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {serviceReady === false && <small>中继服务未接通，缓存记录仍可播放。</small>}
    </div>
  );

  if (page === "cover" || page === "intro") {
    return (
      <section className="prologue-veil is-cover" aria-label={page === "cover" ? "游戏封面" : "序章"}>
        <div className="prologue-cover">
          {page === "cover" ? (
            <MainMenu {...menu} onStart={() => onOpen("intro")} />
          ) : (
            <IntroTerminal onDone={() => onOpen("forum")} />
          )}
        </div>
        {page === "intro" && gm}
      </section>
    );
  }

  const current = chrome[page];
  const back = current.back;
  const browse = page === "forum" || page === "thread";

  return (
    <section className={`prologue-veil ab ab-page-${page}`} aria-label="玩家正在浏览的网页">
      {page === "forum" && (
        <div className="fh-scene" aria-hidden="true">
          <img src={nightPhotoUrl} alt="" />
        </div>
      )}
      <ArchiveTopBar
        site={current.site}
        title={current.title}
        source={current.source}
        onBack={back ? () => onOpen(back) : undefined}
        backLabel={current.backLabel}
        hideTitle={page === "forum"}
      />

      <div className="ab-board">
        {page === "forum" && (
          <ForumHome
            onOpenThread={() => onOpen("thread")}
            onOpenRoad={() => onOpen("road")}
            onOpenRadio={() => onOpen("radio")}
          />
        )}
        {page === "thread" && (
          <ForumThread
            seenNotice={seenNotice}
            seenPhoto={seenPhoto}
            liveUnlocked={liveUnlocked}
            onOpenNotice={() => onOpen("notice")}
            onOpenPhoto={() => onOpen("photo")}
            onOpenLive={() => onOpen("join")}
          />
        )}
        {page === "notice" && <ShutdownNotice onBack={() => onOpen("thread")} />}
        {page === "photo" && <NightPhoto onBack={() => onOpen("thread")} />}
        {page === "road" && (
          <ForumSideThread
            number="2315"
            section="本地 / 公告转发"
            author="市政公告转发"
            authorNote="青河本地用户"
            time="今晚 18:40"
            paragraphs={[
              "施工单位通知：今晚二十点起，青河路北段至旧电视台路口临时封闭，预计明早恢复通行。",
              "行人可以从东侧巷口绕行。旧电视台周边正在做拆除前清场，请勿翻越围挡。"
            ]}
            replies={[
              ["夜班司机", "北口已经放了路障，出租车也进不去。"],
              ["路过青河路", "我刚才从人行道经过，楼里还有灯。"]
            ]}
          />
        )}
        {page === "radio" && (
          <ForumSideThread
            number="2298"
            section="二手交换"
            author="旧物仓"
            authorNote="青河本地用户"
            time="昨天 16:22"
            paragraphs={[
              "清仓翻出几台旧收音机、一台双卡磁带机，都很久没通电了。青河本地自取，能修的人优先。",
              "另外还有一小箱没有标签的空磁带，不保证还能用。"
            ]}
            replies={[
              ["失眠电台", "磁带机什么型号？能正常倒带的话我想收。"],
              ["旧物仓", "型号牌掉了，外壳上只有电视台后勤处的旧章。"]
            ]}
          />
        )}
        {page === "join" && (
          <LiveJoin
            usernameInput={usernameInput}
            usernameValid={usernameValid}
            usernameChecking={usernameChecking}
            usernameWarning={usernameWarning}
            onUsernameChange={onUsernameChange}
            onSubmit={onSubmit}
          />
        )}
      </div>

      <ArchiveKeys
        back={back ? current.backLabel : undefined}
        browse={browse}
        status={page === "forum" ? "今日在线 86" : page === "join" || page === "notice" ? undefined : "主题尚未关闭"}
      />
      <ArchiveFx />
      {gm}
    </section>
  );
}

const forumChannels = [
  { no: 1, name: "本地" },
  { no: 2, name: "旧闻" },
  { no: 3, name: "房屋" },
  { no: 4, name: "求助" }
];

function ForumHome({
  onOpenThread,
  onOpenRoad,
  onOpenRadio
}: {
  onOpenThread: () => void;
  onOpenRoad: () => void;
  onOpenRadio: () => void;
}) {
  const rows = [
    {
      tag: "转发",
      no: "02",
      title: "青河路北段今晚临时封路",
      meta: ["市政公告转发", "18:40", "回帖 2"],
      onClick: onOpenRoad
    },
    {
      tag: "交换",
      no: "03",
      title: "有人收旧收音机和磁带机吗",
      meta: ["二手交换", "昨天", "回帖 2"],
      onClick: onOpenRadio
    }
  ];

  return (
    <div className="fh">
      <header className="fh-mast">
        <h1 className="fh-title" aria-label="青河同城 第一频道 今夜热帖">
          <span className="fh-title-word" aria-hidden="true">
            青河同城
          </span>
          <span className="fh-title-ch" aria-hidden="true">
            <i />1
          </span>
        </h1>
        <p className="fh-latin" aria-hidden="true">
          QINGHE LOCAL BOARD
        </p>
        <div className="fh-sub" aria-hidden="true">
          <strong>
            <span>今夜</span>
            <span>热帖</span>
          </strong>
          <small>CH.1 / LOCAL</small>
        </div>
      </header>

      <nav className="fh-channels" aria-label="论坛分区">
        {forumChannels.map((channel) => (
          <span key={channel.no} className={channel.no === 1 ? "is-on" : ""} aria-current={channel.no === 1 ? "page" : undefined}>
            <small>CH.{channel.no}</small>
            {channel.name}
          </span>
        ))}
      </nav>

      <ol className="ab-nav fh-list" aria-label="本地热帖">
        <li>
          <button type="button" className="fh-item is-lead is-default" onClick={onOpenThread}>
            <span className="fh-tag">
              置顶
              <b>01</b>
            </span>
            <strong className="fh-headline">
              <span>明天就要拆的青河电视台，</span>
              <span>今晚里面怎么还有灯？</span>
            </strong>
            <time className="fh-time">今晚 21:08</time>
            <small className="fh-crumb">
              <span>路过青河路</span>
              <span>本地旧闻</span>
            </small>
            <span className="fh-go">
              回帖 7
              <ArrowIcon />
            </span>
          </button>
        </li>
        {rows.map((row) => (
          <li key={row.no}>
            <button type="button" className="fh-item" onClick={row.onClick}>
              <span className="fh-tag">
                {row.tag}
                <b>{row.no}</b>
              </span>
              <strong className="fh-headline">{row.title}</strong>
              <small className="fh-meta">
                {row.meta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </small>
            </button>
          </li>
        ))}
      </ol>

      <aside className="fh-rail" aria-label="版面状态">
        <header className="fh-rail-head">
          <svg className="fh-emblem" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="23" />
            <path d="M24 12v25M16.5 37 24 12l7.5 25M19 29h10" />
            <path d="M17.5 14.5a9 9 0 0 0 0 9M30.5 14.5a9 9 0 0 1 0 9" />
          </svg>
          <div>
            <strong>版面状态</strong>
            <small>BOARD STATUS · CH.1</small>
          </div>
        </header>
        <dl className="fh-stats">
          <div className="is-count">
            <dt>今日在线</dt>
            <dd>
              86
              <i aria-hidden="true" />
            </dd>
          </div>
          <div className="is-text">
            <dt>当前分区</dt>
            <dd>本地 / 旧闻</dd>
          </div>
          <div>
            <dt>置顶主题</dt>
            <dd>1</dd>
          </div>
        </dl>
        <footer className="fh-signal" aria-label="信号强度 七格">
          <span>信号</span>
          <span className="fh-signal-bars" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <i key={index} className={index < 7 ? "is-on" : undefined} />
            ))}
          </span>
          <small>CH.1 · 07</small>
        </footer>
      </aside>
    </div>
  );
}

function PostSheet({
  author,
  authorNote,
  time,
  children
}: {
  author: string;
  authorNote: string;
  time: string;
  children: ReactNode;
}) {
  return (
    <article className="ab-paper ab-post">
      <span className="ab-paper-tab">主楼</span>
      <header className="ab-post-head">
        <UserStamp name={author} tone="brick" />
        <div>
          <strong>{author}</strong>
          <small>{authorNote}</small>
        </div>
        <time>{time}</time>
        <span className="ab-floor">#1</span>
      </header>
      <div className="ab-post-body">{children}</div>
    </article>
  );
}

function ForumSideThread({
  number,
  section,
  author,
  authorNote,
  time,
  paragraphs,
  replies
}: {
  number: string;
  section: string;
  author: string;
  authorNote: string;
  time: string;
  paragraphs: string[];
  replies: [string, string][];
}) {
  return (
    <div className="ab-split">
      <div className="ab-thread-main">
        <PostSheet author={author} authorNote={authorNote} time={time}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </PostSheet>
        <ReplyBoard note={`共 ${replies.length} 条 · 按楼层`}>
          {replies.map(([name, reply], index) => (
            <ReplyStrip key={`${name}-${reply}`} floor={index + 2} name={name}>
              <p>{reply}</p>
            </ReplyStrip>
          ))}
        </ReplyBoard>
      </div>
      <aside className="ab-rail">
        <Dossier
          title="主题档案"
          rows={[
            ["编号", number],
            ["分区", section],
            ["楼主", author],
            ["回帖", String(replies.length)]
          ]}
        />
      </aside>
    </div>
  );
}

function ForumThread({
  seenNotice,
  seenPhoto,
  liveUnlocked,
  onOpenNotice,
  onOpenPhoto,
  onOpenLive
}: {
  seenNotice: boolean;
  seenPhoto: boolean;
  liveUnlocked: boolean;
  onOpenNotice: () => void;
  onOpenPhoto: () => void;
  onOpenLive: () => void;
}) {
  const seenCount = Number(seenNotice) + Number(seenPhoto);

  return (
    <div className="ab-split">
      <div className="ab-thread-main">
        <PostSheet author="路过青河路" authorNote="注册于 2019" time="今晚 21:08">
          <p>路过北口的时候看见旧楼里有灯。这地方停了十二年了，门口还贴着拆除告示。</p>
          <p>楼里应该没人值班才对。有人知道里面现在还能开什么设备吗？</p>
          <div className="ab-nav ab-attachments" aria-label="主楼附件">
            <button type="button" className={`ab-tag ${seenNotice ? "is-seen" : "is-default"}`} onClick={onOpenNotice}>
              <span className="ab-tag-head">公开资料</span>
              <strong>青河电视台停播及拆除公告</strong>
              <small>archive.qinghe-service.cn</small>
              {seenNotice && <span className="ab-seen">已阅</span>}
            </button>
            <button
              type="button"
              className={`ab-tag has-thumb ${seenPhoto ? "is-seen" : seenNotice ? "is-default" : ""}`}
              onClick={onOpenPhoto}
            >
              <span className="ab-tag-head">现场照片</span>
              <strong>今晚 20:47 北口夜景</strong>
              <small>{seenPhoto ? "已查看" : "未打开"}</small>
              <img src={nightPhotoUrl} alt="" />
              {seenPhoto && <span className="ab-seen">已阅</span>}
            </button>
          </div>
        </PostSheet>

        <ReplyBoard note={liveUnlocked ? "刚刚更新 · 按楼层排列" : "按楼层排列"}>
          <ReplyStrip floor={2} name="夜班司机">
            <p>可能是拆迁队提前进场。别进去，里面线乱得很。</p>
          </ReplyStrip>
          <ReplyStrip floor={3} name="匿名107">
            <p>以前不是说节目资料都没归档完吗。这种旧楼最容易留着没断电的房间。</p>
          </ReplyStrip>
          {liveUnlocked && (
            <ReplyStrip floor={4} name="折耳猫" className="is-live">
              <p>不是拆迁队。刚才好像有人从里面开了直播。</p>
              <div className="ab-nav">
                <button type="button" className="ab-live-card" onClick={onOpenLive}>
                  <span className="ab-live-thumb">
                    <img src={coverImageUrl} alt="" />
                  </span>
                  <span className="ab-live-copy">
                    <small>
                      <i className="ab-lamp" aria-hidden="true" />
                      正在直播
                    </small>
                    <strong>好像有人开了直播</strong>
                  </span>
                  <span className="ab-live-go">
                    点进去看看
                    <ArrowIcon />
                  </span>
                </button>
              </div>
            </ReplyStrip>
          )}
        </ReplyBoard>
      </div>

      <aside className="ab-rail">
        <Dossier
          title="主题档案"
          rows={[
            ["编号", "2317"],
            ["分区", "本地 / 旧闻"],
            ["回帖", "7"],
            ["状态", "主题尚未关闭"]
          ]}
        />
        <section className="ab-card ab-checklist" aria-live="polite">
          <h2>
            附件查阅
            <span>{seenCount} / 2</span>
          </h2>
          <ul>
            <li className={seenNotice ? "is-done" : ""}>公开资料 · 停播公告</li>
            <li className={seenPhoto ? "is-done" : ""}>现场照片 · 北口夜景</li>
          </ul>
          <p>
            {liveUnlocked
              ? "帖子刚刚更新了一条回复。"
              : seenCount > 0
                ? "帖子还在更新。先把另一份附件也看完。"
                : "楼主在帖子里留了两份附件。"}
          </p>
        </section>
      </aside>
    </div>
  );
}

function ShutdownNotice({ onBack }: { onBack: () => void }) {
  return (
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
          <p>
            资料编号 QH-GD-2014-0318
            <br />
            网页归档节点 004
          </p>
        </header>
        <nav className="ab-doc-tabs" aria-label="资料栏目">
          <span>网站首页</span>
          <span>公共文化</span>
          <strong>停播公告</strong>
          <span>拆除计划</span>
        </nav>
        <div className="ab-doc-body">
          <p className="ab-doc-source">
            <span>青河市广播电视局</span>
            <time>发布于 2014-03-18</time>
          </p>
          <h2 className="ab-doc-title">关于青河电视台停止播出及旧址腾退的公告</h2>
          <p>青河电视台自2014年3月18日起停止全部节目播出。旧址建筑将于2026年9月18日开始拆除。</p>
          <dl className="ab-records">
            <div>
              <dt>停播日期</dt>
              <dd>2014年3月18日</dd>
            </div>
            <div>
              <dt>拆除日期</dt>
              <dd>2026年9月18日</dd>
            </div>
            <div>
              <dt>旧址状态</dt>
              <dd>已封闭，原则上不再安排值守</dd>
            </div>
            <div>
              <dt>资料归档</dt>
              <dd>部分旧节目资料尚未完成数字化</dd>
            </div>
          </dl>
          <aside className="ab-note">
            <strong>附注</strong>
            <p>旧播出系统已切断对外信号。现场如仍有设备指示灯，按未完成清点处理。</p>
          </aside>
          <div className="ab-doc-actions">
            <ActionBar onClick={onBack}>返回讨论帖</ActionBar>
          </div>
        </div>
      </article>
    </div>
  );
}

function NightPhoto({ onBack }: { onBack: () => void }) {
  return (
    <div className="ab-split ab-photo">
      <figure className="ab-print">
        <img src={nightPhotoUrl} alt="青河电视台大厅前台仍亮着灯，旁边有旧电视和警戒线" />
        <figcaption>拍摄者：路过青河路。从北口玻璃门拍到的大厅，前台灯还开着。</figcaption>
      </figure>
      <aside className="ab-rail">
        <ReplyBoard label="照片回复" note="2 条" compact>
          <ReplyStrip floor={2} name="南窗">
            <p>前台那盏灯不像应急灯。应急灯不会一直亮着。</p>
          </ReplyStrip>
          <ReplyStrip floor={3} name="失眠电台">
            <p>警戒线还在，旁边还有台旧电视。这种地方谁会进去直播？</p>
          </ReplyStrip>
        </ReplyBoard>
        <ActionBar onClick={onBack}>返回讨论帖</ActionBar>
      </aside>
    </div>
  );
}

function LiveJoin({
  usernameInput,
  usernameValid,
  usernameChecking,
  usernameWarning,
  onUsernameChange,
  onSubmit
}: {
  usernameInput: string;
  usernameValid: boolean;
  usernameChecking: boolean;
  usernameWarning: string;
  onUsernameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="ab-split ab-join">
      <div className="ab-monitor">
        <img src={coverImageUrl} alt="" />
        <span className="ab-monitor-tag">
          <i className="ab-lamp" aria-hidden="true" />
          正在直播
        </span>
      </div>
      <section className="ab-paper ab-join-form">
        <span className="ab-paper-tab">访客登记</span>
        <h2>临时接入</h2>
        <form onSubmit={onSubmit}>
          <label htmlFor="username-input">用户名</label>
          <div className="ab-field">
            <input
              id="username-input"
              value={usernameInput}
              maxLength={12}
              autoComplete="nickname"
              placeholder="输入2～12个字符"
              disabled={usernameChecking}
              onChange={(event) => onUsernameChange(event.target.value)}
            />
            <ActionBar type="submit" disabled={!usernameValid || usernameChecking}>
              {usernameChecking ? "验证中" : "进入"}
            </ActionBar>
          </div>
          {usernameWarning && (
            <p className="ab-name-warning" role="alert">
              {usernameWarning}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
