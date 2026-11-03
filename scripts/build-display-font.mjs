// 生成档案公告板（论坛首页等）使用的几何标题字体子集。
// 用法：node scripts/build-display-font.mjs [源字体路径]
// 源字体默认读取 .tmp/fonts/ZCOOLQingKeHuangYou-Regular.ttf（站酷庆科黄油体，SIL OFL 1.1）。
// 下载：https://github.com/google/fonts/raw/main/ofl/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] || path.join(root, ".tmp/fonts/ZCOOLQingKeHuangYou-Regular.ttf");
const textSources = ["src/Prologue.tsx", "src/archive/ArchiveChrome.tsx", "src/E3EndingForum.tsx"];

const ascii = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("");
const extra = "·—…“”「」《》，。、：；？！（）／";

let text = ascii + extra;
for (const file of textSources) {
  text += await readFile(path.join(root, file), "utf8");
}
const glyphs = Array.from(
  new Set(Array.from(text).filter((char) => /[\u3000-\u9fff\uff00-\uffef\u2000-\u27ff]/.test(char) || char.charCodeAt(0) < 127))
).join("");

const font = await readFile(source);
await mkdir(path.join(root, "public/fonts"), { recursive: true });
const output = await subsetFont(font, glyphs, { targetFormat: "woff2" });
const target = path.join(root, "public/fonts/qinghe-display.woff2");
await writeFile(target, output);
console.log(`${path.relative(root, target)}  ${(output.length / 1024).toFixed(1)} KB  (${Array.from(glyphs).length} glyphs)`);

// 主菜单标题“停播之后”单独子集，避免主菜单加载整套档案字体。
const titleOutput = await subsetFont(font, "停播之后", { targetFormat: "woff2" });
const titleTarget = path.join(root, "public/fonts/title-qingke.woff2");
await writeFile(titleTarget, titleOutput);
console.log(`${path.relative(root, titleTarget)}  ${(titleOutput.length / 1024).toFixed(1)} KB  (4 glyphs)`);
