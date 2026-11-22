// Renderiza o vídeo.
//   node scripts/render.mjs                    -> out/render.mp4 e out/deixas.json (para o `escutar`)
//   node scripts/render.mjs --sem-efeitos      -> out/sem.mp4 (só a voz; é o outro lado da escuta)
//   node scripts/render.mjs --rascunho         -> metade da resolução, para ver o movimento rápido
//   node scripts/render.mjs --saida OUTRO.mp4  --processos 4
//   node scripts/render.mjs --ate 12           -> só os 12 primeiros segundos (para testar um cenário e medir o tempo)
// Depois: python sistema/editar.py finalizar projetos/NOME/out/render.mp4   (sai em editor/versoes/NOME-vN.mp4)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { montar, limpar, browserExecutable, chromiumOptions, avisosDoNavegador, args, PROJETO } from "./comum.mjs";

const a = args();
const semEfeitos = !!a["sem-efeitos"];
const saida = path.resolve(PROJETO, a.saida ?? (semEfeitos ? "out/sem.mp4" : "out/render.mp4"));
const processos = Number(a.processos ?? Math.max(1, Math.min(4, Math.floor(os.cpus().length / 4))));
fs.mkdirSync(path.dirname(saida), { recursive: true });

const serveUrl = await montar();
const { renderMedia, selectComposition } = await import("@remotion/renderer");
const inputProps = { semEfeitos };
const composition = await selectComposition({ serveUrl, id: "Curta", browserExecutable, chromiumOptions, inputProps, logLevel: "error" });
if (!semEfeitos) fs.writeFileSync(path.join(PROJETO, "out", "deixas.json"), JSON.stringify(composition.props.deixas ?? [], null, 1));
const t0 = Date.now();
let ultimo = -1;
await renderMedia({
  composition, serveUrl, codec: "h264", frameRange: a.ate ? [0, Math.min(composition.durationInFrames - 1, Math.round(Number(a.ate) * composition.fps) - 1)] : undefined, crf: a.rascunho ? 23 : 16, pixelFormat: "yuv420p", colorSpace: "bt709", outputLocation: saida,
  browserExecutable, chromiumOptions, inputProps, concurrency: processos, imageFormat: "jpeg", jpegQuality: 95, scale: a.rascunho ? 0.5 : 1,
  audioCodec: "aac", audioBitrate: "320k", timeoutInMilliseconds: 240000, onBrowserLog: avisosDoNavegador, logLevel: "error",
  onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== ultimo) { ultimo = p; console.log(`${(progress * 100).toFixed(0)}%  ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
    // o progresso também num arquivo (para quem roda em segundo plano): out/progresso.txt
    try { fs.writeFileSync(path.join(PROJETO, "out", "progresso.txt"), `${(progress * 100).toFixed(0)}% em ${((Date.now() - t0) / 1000).toFixed(0)} s`); } catch { /* sem pasta */ } },
});
limpar(serveUrl);
const seg = (Date.now() - t0) / 1000;
const durVideo = a.ate ? Math.min(Number(a.ate), composition.durationInFrames / composition.fps) : composition.durationInFrames / composition.fps;
console.log(`Pronto: ${saida} (${durVideo.toFixed(2)} s de vídeo em ${seg.toFixed(0)} s de render, ${(seg / durVideo).toFixed(1)} s por segundo)`);
