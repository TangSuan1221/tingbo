import { StrictMode, useEffect } from "react";
import { game, initialize, lifecycle } from "zaohua-platform-sdk";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GmRuntime } from "./GmRuntime";
import "./styles.css";
import "./archive/archive.css";
import "./archive/forumHome.css";
import "./relayTerminal.css";

await initialize({ capabilities: ["game.lifecycle", "game.loading"] });
game.loading();

let platformPaused = false;
const resumeMedia = new Set<HTMLMediaElement>();
const rootElement = document.getElementById("root")!;
document.addEventListener("play", (event) => {
  if (platformPaused && event.target instanceof HTMLMediaElement) {
    resumeMedia.add(event.target);
    event.target.pause();
  }
}, true);
lifecycle.register({
  pause() {
    if (platformPaused) return;
    platformPaused = true;
    rootElement.inert = true;
    rootElement.classList.add("platform-paused");
    document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((media) => {
      if (!media.paused && !media.ended) {
        resumeMedia.add(media);
        media.pause();
      }
    });
  },
  resume() {
    platformPaused = false;
    rootElement.inert = false;
    rootElement.classList.remove("platform-paused");
    resumeMedia.forEach((media) => {
      if (media.isConnected && !media.ended) void media.play().catch(() => undefined);
    });
    resumeMedia.clear();
  },
  getState: () => ({ paused: platformPaused })
});

function PlatformReady() {
  useEffect(() => { game.loaded(); }, []);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlatformReady />
    {import.meta.env.DEV && new URLSearchParams(window.location.search).get('gm') === 'runtime' ? <GmRuntime /> : <>
      <App />
      {import.meta.env.DEV && <a className="gm-runtime-link" href="/?gm=runtime" target="_blank" rel="noreferrer">GM 实时测试</a>}
    </>}
  </StrictMode>
);
