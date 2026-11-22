// Tira quadros soltos para conferir, sem renderizar o vídeo inteiro.
//   node scripts/quadros.mjs 1.2,3.5,4.1            (segundos do vídeo) -> out/quadros/q_1.20.jpg ...
//   node scripts/quadros.mjs 1.2,3.5 --escala 1     (tamanho cheio; o padrão é 0.5, mais rápido)
//   node scripts/quadros.mjs 0 --vitrine lupa       (a peça sozinha, na vitrine)
//   node scripts/quadros.mjs 1.2,3.5 --guias        (com as faixas do enquadramento: laterais, topo, olhos, selo e legenda;
//                                                    sai em 1080 x 1920, o tamanho cheio)
// A primeira montagem leva uns 30 s; cada quadro, de 2 a 8 s.
import fs from "node:fs";
import path from "node:path";
import { montar, limpar, browserExecutable, chromiumOptions, avisosDoNavegador, args, PROJETO } from "./comum.mjs";

const a = args();
const tempos = String(a._[0] ?? "0").split(",").map(Number);
// sem --guias, metade do tamanho (540 x 960, mais rápido); com --guias, o tamanho cheio (1080 x 1920), para ler as
// faixas em px de verdade
const escala = Number(a.escala ?? (a.guias ? 1 : 0.5));
const pasta = path.join(PROJETO, "out", "quadros");
fs.mkdirSync(pasta, { recursive: true });

const serveUrl = await montar();
const { renderStill, selectComposition } = await import("@remotion/renderer");
const id = a.vitrine ? "Vitrine" : "Curta";
const inputProps = a.vitrine ? { peca: a.vitrine } : a.guias ? { guias: true } : {};
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions, inputProps, logLevel: "error" });
for (const t of tempos) {
  const t0 = Date.now();
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
  const nome = a.vitrine ? `v_${a.vitrine}_${t.toFixed(2)}.jpg` : `q_${t.toFixed(2)}.jpg`;
  await renderStill({ composition, serveUrl, frame, output: path.join(pasta, nome), imageFormat: "jpeg", jpegQuality: 90, scale: escala,
    browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 240000, onBrowserLog: avisosDoNavegador, logLevel: "error" });
  console.log(`${nome}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
limpar(serveUrl);
