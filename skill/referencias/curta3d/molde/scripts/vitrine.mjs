// Uma imagem de cada peça no acabamento do estilo (contorno, luz, desfoque, cor), para conferir peça nova.
//   node scripts/vitrine.mjs                 todas as peças do curta.json -> out/vitrine/NOME.jpg
//   node scripts/vitrine.mjs lupa,cadeado    só essas
//   node scripts/vitrine.mjs --saida PASTA   --escala 0.5
import fs from "node:fs";
import path from "node:path";
import { montar, limpar, browserExecutable, chromiumOptions, avisosDoNavegador, args, PROJETO } from "./comum.mjs";

const a = args();
const pasta = path.resolve(PROJETO, a.saida ?? "out/vitrine");
fs.mkdirSync(pasta, { recursive: true });
const serveUrl = await montar();
const cfg = JSON.parse(fs.readFileSync(path.join(PROJETO, "src", "gerado", "config.json"), "utf8"));
const nomes = a._[0] ? String(a._[0]).split(",") : cfg.pecas;
const { renderStill, selectComposition } = await import("@remotion/renderer");
for (const peca of nomes) {
  const t0 = Date.now();
  const inputProps = { peca };
  const composition = await selectComposition({ serveUrl, id: "Vitrine", browserExecutable, chromiumOptions, inputProps, logLevel: "error" });
  await renderStill({ composition, serveUrl, frame: 20, output: path.join(pasta, peca + ".jpg"), imageFormat: "jpeg", jpegQuality: 88,
    scale: Number(a.escala ?? 0.5), browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 240000, onBrowserLog: avisosDoNavegador, logLevel: "error" });
  console.log(`${peca}.jpg  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
limpar(serveUrl);
