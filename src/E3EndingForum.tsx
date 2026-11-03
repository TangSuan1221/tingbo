import { ReplayIcon } from "./icons";
import { ArchiveFx, ArchiveKeys, ArchiveTopBar, Dossier, ReplyBoard, ReplyStrip, UserStamp } from "./archive/ArchiveChrome";

type E3EndingForumProps = {
  username: string;
  onRestart: () => void;
};

export function E3EndingForum({ username, onRestart }: E3EndingForumProps) {
  const displayName = username || "最后一名观众";

  return (
    <section className="prologue-veil ab e3-ending-forum" aria-label="青河同城结局更新">
      <ArchiveTopBar
        site="青河同城"
        title="明天就要拆的青河电视台，今晚里面怎么还有灯？"
        source="bbs.qinghe-tongcheng.cn/t/2317"
      />

      <div className="ab-board">
        <div className="ab-split">
          <div className="ab-thread-main">
            <article className="ab-paper ab-post">
              <span className="ab-paper-tab">主楼 · 刚刚更新</span>
              <header className="ab-post-head">
                <UserStamp name="路过青河路" tone="brick" />
                <div>
                  <strong>路过青河路</strong>
                  <small>楼主</small>
                </div>
                <time>刚刚更新</time>
                <span className="ab-floor">#1</span>
              </header>
              <div className="ab-post-body">
                <p>补一张控制室内部照片。里面已经彻底断电，现场没有找到值班人员。</p>
                <figure className="ab-print is-inline">
                  <img
                    src="/media/runtime-references/RT-02-wide-control-console-composite.jpg?v=20261008"
                    alt="彻底断电的青河电视台控制室，熄灭的十三号屏中隐约映着一个人影"
                  />
                  <figcaption>
                    附件 4 / 拆除前内部复查照片
                    <span>上传时间无法读取</span>
                  </figcaption>
                </figure>
                <p className="ab-post-aside">照片里所有设备都已断电。十三号屏玻璃上的反光来源不明。</p>
              </div>
            </article>

            <ReplyBoard note="由直播观看记录自动同步">
              <ReplyStrip floor={8} name={displayName} note="直播最后在线观众" className="is-player">
                <p className="ab-player-line">里面好像还有人在直播。</p>
                <time>刚刚 · 由零号频道观看记录自动同步</time>
              </ReplyStrip>
            </ReplyBoard>
          </div>

          <aside className="ab-rail">
            <Dossier
              title="主题档案"
              rows={[
                ["编号", "2317"],
                ["状态", "主题自动更新"],
                ["在线", "1"]
              ]}
            />
            <section className="ab-card ab-ending">
              <p>零号频道再也没有亮起。那一夜的最后一句话，只剩你还记得。</p>
              <div className="ab-nav">
                <button type="button" className="ab-action" onClick={onRestart}>
                  <span>重新接入</span>
                  <ReplayIcon />
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <ArchiveKeys status="零号频道 · 已停播" />
      <ArchiveFx />
    </section>
  );
}
