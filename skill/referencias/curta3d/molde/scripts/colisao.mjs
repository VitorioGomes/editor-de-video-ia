// A conferência de colisão quadro a quadro: nada atravessa nada e nada flutua (ver src/motor/colisao.ts).
//   node scripts/colisao.mjs                  -> o vídeo inteiro, quadro a quadro (passo 1 = 0,033 s)
//   node scripts/colisao.mjs --passo 2        -> de 2 em 2 quadros (0,067 s; o máximo aceito é 3 = 0,1 s)
//   node scripts/colisao.mjs --de 300 --ate 500
// A cena exporta COLISAO() com os corpos, os pares que podem se tocar e os apoios. Sai com erro se achar algo, e
// grava a lista em out/colisao.json (os trechos: de que quadro a que quadro, quem com quem, quantos cm).
import fs from "node:fs";
import path from "node:path";
import { montar, limpar, browserExecutable, chromiumOptions, args, PROJETO } from "./comum.mjs";

const a = args();
const passo = Math.min(3, Number(a.passo ?? 1));
const serveUrl = await montar();
const { renderStill, selectComposition } = await import("@remotion/renderer");
const inputProps = { passo, ...(a.de ? { de: Number(a.de) } : {}), ...(a.ate ? { ate: Number(a.ate) } : {}) };
const composition = await selectComposition({ serveUrl, id: "Colisao", browserExecutable, chromiumOptions, inputProps, logLevel: "error" });
const achados = []; let fim = null, erro = null;
const t0 = Date.now();
await renderStill({ composition, serveUrl, frame: 0, output: path.join(PROJETO, ".tmp", "colisao.png"), browserExecutable, chromiumOptions, inputProps,
  timeoutInMilliseconds: 1800000, logLevel: "error",
  onBrowserLog: (l) => {
    const t = l.text ?? "";
    if (t.startsWith("COLISAO_PROGRESSO ")) console.log(t.slice(18));
    else if (t.startsWith("COLISAO_FIM ")) fim = JSON.parse(t.slice(12));
    else if (t.startsWith("COLISAO_ERRO ")) erro = t.slice(13);
    else if (t.startsWith("COLISAO ")) achados.push(JSON.parse(t.slice(8)));
    else if (l.type === "error") console.log("[navegador]", t.slice(0, 300));
  } });
limpar(serveUrl);
if (erro) { console.error("A conferência falhou:\n" + erro); process.exit(2); }
// junta os quadros seguidos do mesmo par num trecho só
const trechos = [];
for (const x of achados.sort((p, q) => (p.tipo + p.a + p.b).localeCompare(q.tipo + q.a + q.b) || p.f - q.f)) {
  const t = trechos[trechos.length - 1];
  if (t && t.tipo === x.tipo && t.a === x.a && t.b === x.b && x.f - t.ate <= passo * 2) { t.ate = x.f; t.n++; if (x.cm > t.cm) { t.cm = x.cm; t.onde = x.onde; t.fPior = x.f; } }
  else trechos.push({ tipo: x.tipo, a: x.a, b: x.b, de: x.f, ate: x.f, n: 1, cm: x.cm, onde: x.onde, fPior: x.f });
}
trechos.sort((p, q) => p.de - q.de);
fs.mkdirSync(path.join(PROJETO, "out"), { recursive: true });
fs.writeFileSync(path.join(PROJETO, "out", "colisao.json"), JSON.stringify({ ...fim, trechos }, null, 1));
const s = (f) => (f / 30).toFixed(2);
console.log(`\nColisão: ${fim?.quadros ?? "?"} quadros conferidos (passo ${passo} = ${(passo / 30).toFixed(3)} s) em ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
for (const t of trechos) console.log(`  ${t.tipo.toUpperCase()}  ${t.a} x ${t.b}  ${s(t.de)} a ${s(t.ate)} s (${t.n} quadros)  pior ${t.cm} cm no quadro ${t.fPior} em [${t.onde.join(", ")}]`);
if (trechos.length) { console.log(`\nREPROVADO: ${trechos.length} trecho(s) com peça atravessando ou flutuando (out/colisao.json).`); process.exit(1); }
console.log("Aprovado: zero interseções, nada flutuando, a câmera fora das peças, nenhum estado sobrando e nenhum tremor.");
