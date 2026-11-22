// A folha de quadros: N quadros espalhados pelo vídeo renderizado, numa folha só, com o tempo de cada um.
//   node scripts/folha.mjs                      -> out/folha.jpg, 12 quadros de out/render.mp4
//   node scripts/folha.mjs --n 20 --video out/render.mp4 --saida out/folha.jpg --colunas 6
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { args, PROJETO } from "./comum.mjs";

const a = args();
const video = path.resolve(PROJETO, a.video ?? "out/render.mp4");
const saida = path.resolve(PROJETO, a.saida ?? "out/folha.jpg");
const n = Number(a.n ?? 12), col = Number(a.colunas ?? 6);
if (!fs.existsSync(video)) { console.error("Renderize antes: node scripts/render.mjs (ou passe --video)"); process.exit(1); }
const dur = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], { encoding: "utf8" }).stdout);
const tmp = path.join(PROJETO, ".tmp", "folha"); fs.mkdirSync(tmp, { recursive: true });
const quadros = [];
for (let i = 0; i < n; i++) {
  const t = ((i + 0.5) / n) * dur, f = path.join(tmp, `f${i}.jpg`);
  spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(2), "-i", video, "-frames:v", "1", "-vf", `scale=270:480,drawtext=text='${t.toFixed(1)} s':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55`, f]);
  if (!fs.existsSync(f)) spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(2), "-i", video, "-frames:v", "1", "-vf", "scale=270:480", f]); // sem fonte para o texto
  quadros.push(f);
}
const ent = quadros.flatMap((f) => ["-i", f]);
const lay = quadros.map((_, i) => `${(i % col) * 270}_${Math.floor(i / col) * 480}`).join("|");
const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...ent, "-filter_complex", `${quadros.map((_, i) => `[${i}]`).join("")}xstack=inputs=${n}:layout=${lay}:fill=black`, saida], { encoding: "utf8" });
if (r.status) { console.error(r.stderr); process.exit(1); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log("Folha:", saida);
