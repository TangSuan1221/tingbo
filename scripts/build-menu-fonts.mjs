// 生成主菜单使用的宋体子集字体。
// 用法：node scripts/build-menu-fonts.mjs [源字体路径]
// 源字体默认读取 .tmp/fonts/NotoSerifSC-VF.ttf（Noto Serif SC 可变字体，SIL OFL 1.1）。
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] || path.join(root, ".tmp/fonts/NotoSerifSC-VF.ttf");
// 主菜单之外，档案公告板（论坛、公开资料、调查终端）的标题与条目也使用这套宋体。
const textSources = [
  "src/MainMenu.tsx",
  "src/IntroTerminal.tsx",
  "src/saveData.ts",
  "src/Prologue.tsx",
  "src/E3EndingForum.tsx",
  "src/App.tsx",
  "src/archive/ArchiveChrome.tsx"
];

const ascii = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("");
const extra = "·—…“”「」《》，。、：；？！（）↑↓←→▶●○";

let text = ascii + extra;
for (const file of textSources) {
  text += await readFile(path.join(root, file), "utf8");
}
const glyphs = Array.from(new Set(Array.from(text).filter((char) => /[\u3000-\u9fff\uff00-\uffef\u2000-\u27ff]/.test(char) || char.charCodeAt(0) < 127)))
  .join("");

const font = await readFile(source);
await mkdir(path.join(root, "public/fonts"), { recursive: true });

for (const weight of [600, 900]) {
  const output = await subsetFont(font, glyphs, {
    targetFormat: "woff2",
    variationAxes: { wght: weight }
  });
  const target = path.join(root, `public/fonts/qinghe-song-${weight}.woff2`);
  await writeFile(target, output);
  console.log(`${path.relative(root, target)}  ${(output.length / 1024).toFixed(1)} KB  (${Array.from(glyphs).length} glyphs)`);
}
