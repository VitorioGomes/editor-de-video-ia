// A conferência automática, antes de mostrar o vídeo a alguém. Reprova o que dá para medir e monta as folhas para o
// que precisa de olho (ver "Conferir antes de mostrar" no guia do Curta 3D).
//   node scripts/conferir.mjs            -> confere a cena; com out/render.mp4, monta as folhas e roda a escuta
// Reprova (sai com erro):
//   1. texto na tela que entra antes da frase que fala dele (título, subtítulo, contador, cartão);
//   2. o mesmo número em dois textos separados (o dado aparece duas vezes);
//   3. o vídeo que segue mais de 0,7 s depois da última palavra;
//   4. a cena sem cenário trabalhado (o campo verde como fundo padrão);
//   5. efeito AUSENTE na escuta (quando out/sem.mp4 existe);
//   6. peça criada com `escala` que recebe scale.set (a escala base some; use escalar);
//   7. símbolo ou emoji no código da cena (★ ✕ ✓: caem na fonte do sistema; use Estrela, Xis, Certo);
//   8. no Estilo Conversa (a cena exporta REGUA = D.medir): olhos de quem fala fora de 700 a 1000 px, olhos atrás do
//      cartão, legenda em cima da boca ou abaixo de 1560 px, cartão com base abaixo de 930 px;
//   9. cartão vazio 0,4 s depois de entrar, cartão com conteúdo fora do vidro, cartão alto demais; a base medida de
//      cada cartão vai para out/bases.json (o motor desce os rostos por ela no próximo render);
//  10. com --tremido 12.5,30: tremido acima de 4,0 (em 255) nesses trechos.
// Monta, com out/render.mp4:
//   out/conferir-frases.jpg  um quadro no meio de cada frase da fala, numerado como a lista que ele imprime;
//   out/conferir-itens.jpg   um quadro logo depois de cada item de cada enumeração da fala ("o código, os documentos
//                            e os PDFs"): cada item tem que ter o seu elemento na tela, grande e legível.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { montar, limpar, browserExecutable, chromiumOptions, args, PROJETO } from "./comum.mjs";
const a = args();
import { acharRaiz } from "./preparar.mjs";

const FPS = 30;
const serveUrl = await montar();
const { selectComposition } = await import("@remotion/renderer");
const comp = await selectComposition({ serveUrl, id: "Curta", browserExecutable, chromiumOptions, logLevel: "error" });
const textos = comp.props.textos ?? [];
const palavras = JSON.parse(fs.readFileSync(path.join(PROJETO, "src", "gerado", "palavras.json"), "utf8"));

const normal = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%]/g, "");
const raiz = (s) => normal(s).replace(/s$/, "");
const VAZIAS = new Set("o a os as um uma uns umas de da do das dos no na nos nas em e ou que pra pro para por com sem se ele ela eles elas eu voce seu sua isso esse essa este esta mais menos muito ja nao sim tem ter como quando onde ate me te lhe mil".split(" "));
const chaves = (t) => [...new Set(t.split(/[\s:,.!?()/-]+/).map(raiz).filter((w) => w.length >= 3 && !VAZIAS.has(w) && !/^\d+%?$/.test(w)))];

// as frases da fala (quebra em . ! ? e no fim de cada fala)
const frases = [];
let atual = null;
palavras.forEach((p, i) => {
  if (!atual) { atual = { inicio: p.inicio, fim: p.fim, palavras: [] }; frases.push(atual); }
  atual.palavras.push(p); atual.fim = p.fim;
  const prox = palavras[i + 1];
  if (/[.!?]$/.test(p.texto) || (prox && prox.fala !== p.fala)) atual = null;
});
const fraseDe = (p) => frases.find((f) => f.palavras.includes(p));

const falhas = [];
const falha = (regra, texto) => { falhas.push(`${regra}: ${texto}`); };

// 1. o texto entra com a frase que fala dele
for (const t of textos) {
  if (t.tipo === "título" && t.de < 0.5) continue; // o título do gancho é a promessa do vídeo: pode vir antes
  for (const c of chaves(t.texto)) {
    const ditas = palavras.filter((p) => raiz(p.texto) === c);
    if (!ditas.length) continue;
    const inicio = fraseDe(ditas[0]).inicio;
    if (t.de < inicio - 0.15) falha("texto antes da fala", `${t.tipo} "${t.texto}" entra em ${t.de.toFixed(1)} s, e "${ditas[0].texto}" só é dito na frase que começa em ${inicio.toFixed(1)} s`);
  }
}
// 2. o mesmo número em dois textos separados
const numeros = textos.map((t) => ({ t, n: new Set((t.texto.match(/\d+([.,]\d+)?%?/g) ?? []).filter((x) => x !== "0" && x.length > 1)) }));
for (let i = 0; i < numeros.length; i++) for (let j = i + 1; j < numeros.length; j++) {
  const a = numeros[i], b = numeros[j];
  const separados = a.t.ate < b.t.de - 0.1 || b.t.ate < a.t.de - 0.1;
  for (const n of a.n) if (b.n.has(n) && (separados || a.t.tipo !== b.t.tipo)) falha("dado repetido", `"${n}" aparece em ${a.t.tipo} "${a.t.texto}" (${a.t.de.toFixed(1)} s) e em ${b.t.tipo} "${b.t.texto}" (${b.t.de.toFixed(1)} s): mostre uma vez só, quando for dito`);
}
// 3. o fim
const ultima = palavras[palavras.length - 1].fim, total = comp.durationInFrames / FPS;
if (total - ultima > 0.7) falha("fim longo", `o vídeo segue ${(total - ultima).toFixed(1)} s depois da última palavra (máximo 0,7 s)`);
// 4. o cenário
const fonte = ["cena.ts", "cena.tsx"].map((n) => path.join(PROJETO, "src", n)).filter(fs.existsSync).map((p) => fs.readFileSync(p, "utf8")).join("\n");
const pronto = /\b(terraco|deposito|estudio)\(/.test(fonte), proprio = /\/\/\s*cen[aá]rio:/i.test(fonte);
const campo = /\b(chao|natureza)\(/.test(fonte);
if (!pronto && !proprio) falha("cenário", "a cena não usa um cenário pronto (terraco, deposito, estudio) nem descreve o próprio numa linha \"// cenário: ...\"");
if (campo && !/\/\/\s*cen[aá]rio:.*ao ar livre/i.test(fonte)) falha("cenário", "a cena usa o chão de grama ou a natureza: só vale quando a metáfora é ao ar livre (escreva \"// cenário: ao ar livre, ...\" dizendo por quê)");

// 6. a escala da peça: peça criada com `escala` não pode ter a escala trocada por scale.set (use escalar)
// (passa quando o scale.set já multiplica pelo mesmo número da escala, como em placa.scale.set(1.1 * e[0], ...))
for (const m of fonte.matchAll(/(\w+)\s*=\s*peca\(kit,\s*"[^"]+",\s*\{[^}]*escala:\s*([\d.]+)/g)) {
  const usos = [...fonte.matchAll(new RegExp("\\b" + m[1] + "\\.scale\\.(?:set|setScalar)\\(([^;]*)\\)", "g"))];
  if (usos.some((u) => !u[1].includes(m[2]))) falha("escala apagada", `${m[1]} foi criada com escala e depois recebe ${m[1]}.scale.set(...): a peça volta ao tamanho de fábrica. Use escalar(${m[1]}, k)`);
}

// 7. símbolo e emoji no código da cena (★ ✕ ✓ e emoji caem na fonte do sistema): use Estrela, Xis, Certo do Cartao.tsx
{
  const semComentario = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const achados = [...new Set(semComentario.match(/[☀-➿⬀-⯿]|\p{Extended_Pictographic}/gu) ?? [])];
  if (achados.length) falha("símbolo da fonte do sistema", `${achados.join(" ")} no código da cena: desenhe (Estrela, Xis, Certo do Cartao.tsx) em vez de usar o caractere`);
}

// 8. a régua do Estilo Conversa (quando a cena exporta REGUA = D.medir)
{
  const comp2 = await selectComposition({ serveUrl, id: "Curta", browserExecutable, chromiumOptions, inputProps: { medir: true }, logLevel: "error" });
  const regua = comp2.props.regua ?? [];
  if (regua.length) fs.writeFileSync(path.join(PROJETO, "out", "regua.json"), JSON.stringify(regua));
  const tiras = {};
  const marca = (nome, f, txt) => { (tiras[nome] ??= []).push({ f, txt }); };
  for (const m of regua) {
    const fala = m.olhos.filter((o) => m.tipo === "conjunto" || o.quem === m.quem);
    if (m.tipo !== "conjunto") for (const o of fala) if (o.y < 690 || o.y > 1010) marca("olhos fora da régua (700 a 1000 px)", m.f, `${o.quem} ${o.y} px`);
    if (m.cartao !== null) {
      if (m.cartao > 930) marca("cartão alto demais para o close (base acima de 930 px)", m.f, `base ${m.cartao}`);
      for (const o of fala) if (o.topo < m.cartao + 30) marca("olhos atrás do cartão", m.f, `${o.quem}: alto do olho em ${o.topo} px, base ${m.cartao}`);
    }
    if (m.boca !== null && m.legenda < m.boca + 50) marca("legenda em cima da boca", m.f, `boca ${m.boca}, legenda ${m.legenda}`);
    if (m.legenda > 1560) marca("legenda abaixo da área segura (1560 px)", m.f, `legenda ${m.legenda}`);
  }
  for (const [nome, lista] of Object.entries(tiras)) {
    const trechos = []; // agrupa os quadros seguidos (de 2 em 2) num trecho só
    for (const x of lista) { const t = trechos[trechos.length - 1]; if (t && x.f - t.ate <= 2) t.ate = x.f; else trechos.push({ de: x.f, ate: x.f, txt: x.txt }); }
    for (const t of trechos.slice(0, 6)) falha(nome, `${(t.de / FPS).toFixed(1)} a ${(t.ate / FPS).toFixed(1)} s (${t.txt})`);
    if (trechos.length > 6) falha(nome, `e mais ${trechos.length - 6} trecho(s)`);
  }
  if (regua.length) console.log(`Régua: ${regua.length} quadros medidos.`);
}

// 9. os cartões, medidos no quadro de verdade (só os cartões, sobre fundo transparente): a base, o vazio e o que
//    transborda. A base medida vai para out/bases.json (o preparar leva para o motor, que desce os rostos por ela).
const cartoes = comp.props.cartoes ?? [];
if (cartoes.length) {
  const { renderStill } = await import("@remotion/renderer");
  const compC = await selectComposition({ serveUrl, id: "Cartoes", browserExecutable, chromiumOptions, logLevel: "error" });
  const tmp = path.join(PROJETO, ".tmp", "cartoes"); fs.mkdirSync(tmp, { recursive: true });
  const ler = (png) => {
    const r = spawnSync("ffmpeg", ["-v", "error", "-i", png, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: 1 << 26 });
    return r.stdout;
  };
  const analisar = (buf) => {
    const W = 1080, H = 1920;
    let topo = -1, base = -1, esq = W, dir = 0;
    for (let y = 0; y < H; y++) {
      let n = 0, a = W, b = 0;
      for (let x = 0; x < W; x++) if (buf[(y * W + x) * 4 + 3] > 150) { n++; if (x < a) a = x; if (x > b) b = x; }
      if (n > 600) { if (topo < 0) topo = y; base = y; esq = Math.min(esq, a); dir = Math.max(dir, b); }
    }
    let fora = 0, claro = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (buf[i + 3] <= 150) continue;
      if (topo >= 0 && y > topo && (y > base + 4 || x < esq - 4 || x > dir + 4)) fora++;
      else if (topo >= 0 && y > topo + 4 && y < base - 4 && 0.3 * buf[i] + 0.59 * buf[i + 1] + 0.11 * buf[i + 2] > 110) claro++;
    }
    return { topo, base, fora, claro };
  };
  const bases = {};
  for (const c of cartoes) {
    const nome = c.titulo ? `"${c.titulo}"` : `de ${(c.de / FPS).toFixed(1)} s`;
    const quadros = [...new Set([c.de + 12, c.de + 18, Math.round((c.de + c.ate) / 2), c.ate - 4].filter((f) => f >= c.de && f < c.ate))];
    let baseMax = 0;
    for (const f of quadros) {
      const png = path.join(tmp, `c${c.de}_${f}.png`);
      await renderStill({ composition: compC, serveUrl, frame: f, output: png, imageFormat: "png", browserExecutable, chromiumOptions, logLevel: "error" });
      const m = analisar(ler(png));
      if (m.topo < 0) { if (f === c.de + 12) falha("cartão vazio", `${nome} não aparece 0,4 s depois de entrar`); continue; }
      baseMax = Math.max(baseMax, m.base);
      if (m.fora > 400) falha("cartão transborda", `${nome} em ${(f / FPS).toFixed(1)} s: ${m.fora} px de conteúdo fora do vidro`);
      if (f === c.de + 12 && m.claro < 800) falha("cartão vazio", `${nome}: 0,4 s depois de entrar, o vidro ainda está quase vazio (o conteúdo entra junto com o título)`);
    }
    if (baseMax) {
      bases[String(c.de)] = baseMax + 6;
      if (baseMax > 930) falha("cartão alto demais", `${nome} desce até ${baseMax} px (máximo 930 px, para os olhos caberem abaixo dele no close)`);
    }
  }
  fs.mkdirSync(path.join(PROJETO, "out"), { recursive: true });
  const usado = (() => { try { return JSON.parse(fs.readFileSync(path.join(PROJETO, "src", "gerado", "bases.json"), "utf8")); } catch { return {}; } })();
  fs.writeFileSync(path.join(PROJETO, "out", "bases.json"), JSON.stringify(bases, null, 1));
  const mudou = Object.entries(bases).filter(([k, v]) => Math.abs((usado[k] ?? 0) - v) > 8);
  if (mudou.length) falha("base dos cartões nova", `medi a base de ${mudou.length} cartão(ões) (out/bases.json): renderize de novo, para a câmera descer os rostos pela base de verdade, e rode o conferir outra vez`);
  console.log(`Cartões: ${cartoes.length} medidos, bases ${JSON.stringify(bases)}`);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 10. o tremido, quando pedido: --tremido 12.5,30 (segundos de planos parados ou lentos, sem corte no meio)
if (a.tremido && fs.existsSync(path.join(PROJETO, "out", "render.mp4"))) {
  for (const t of String(a.tremido).split(",").map(Number)) {
    const r = spawnSync("ffmpeg", ["-v", "error", "-ss", String(t), "-i", path.join(PROJETO, "out", "render.mp4"), "-frames:v", "12", "-vf", "scale=540:960,format=gray", "-f", "rawvideo", "-"], { maxBuffer: 1 << 26 });
    const N = 540 * 960, n = Math.floor(r.stdout.length / N);
    const q = (k, i) => r.stdout[k * N + i];
    let soma = 0, cont = 0;
    // um corte no meio não é tremido: os trios de quadros que pegam um corte (salto médio acima de 20) ficam de fora
    const salto = (k) => { let d = 0; for (let i = 0; i < N; i += 7) d += Math.abs(q(k, i) - q(k - 1, i)); return d / (N / 7); };
    const corte = Array.from({ length: n }, (_, k) => k > 0 && salto(k) > 20);
    for (let k = 1; k < n - 1; k++) { if (corte[k] || corte[k + 1]) continue; let s = 0; for (let i = 0; i < N; i++) s += Math.abs(q(k, i) - (q(k - 1, i) + q(k + 1, i)) / 2); soma += s / N; cont++; }
    const v = cont ? soma / cont : 0;
    console.log(`Tremido em ${t} s: ${v.toFixed(2)} (limite 4,0)`);
    if (v > 4) falha("tremido", `${t} s: ${v.toFixed(2)} em 255, acima de 4,0 (veja os quadros seguidos: o que pisca de um para o outro?)`);
  }
}

// as enumerações da fala: "o seu código, os documentos e até os PDFs" (trechos curtos, de até 3 palavras, separados
// por vírgula, e o último depois de "e"/"ou"); o item é a última palavra de cada trecho
const enumeracoes = [];
for (const f of frases) {
  const ps = f.palavras;
  for (let i = 0; i < ps.length; i++) {
    if (!/,$/.test(ps[i].texto)) continue;
    const itens = [ps[i]];
    let k = i + 1, n = 0, fim = false;
    while (k < ps.length && !fim) {
      const w = ps[k], nw = normal(w.texto);
      if ((nw === "e" || nw === "ou") && n > 0) { itens.push(ps[k - 1]); n = 0; k++; continue; }
      n++;
      if (n > 3) break;
      if (/,$/.test(w.texto)) { itens.push(w); n = 0; }
      if (/[.!?]$/.test(w.texto)) { itens.push(w); fim = true; }
      k++;
    }
    const unicos = [...new Set(itens)];
    if (unicos.length >= 3) { enumeracoes.push(unicos); i = ps.indexOf(unicos[unicos.length - 1]); }
  }
}

console.log(`\n${textos.length} textos na tela, ${frases.length} frases, ${enumeracoes.length} enumeração(ões) na fala.`);
frases.forEach((f, i) => console.log(`  frase ${String(i + 1).padStart(2)}  ${f.inicio.toFixed(1).padStart(5)} s  ${f.palavras.map((p) => p.texto).join(" ")}`));
enumeracoes.forEach((e) => console.log(`  enumeração: ${e.map((p) => `${p.texto.replace(/[,.]$/, "")} (${p.fim.toFixed(1)} s)`).join(" · ")}`));

// as folhas, quando há render
const video = path.join(PROJETO, "out", "render.mp4");
const folha = (tempos, saida) => {
  const tmp = path.join(PROJETO, ".tmp", "conferir"); fs.mkdirSync(tmp, { recursive: true });
  const qs = tempos.map((t, i) => {
    const f = path.join(tmp, `q${i}.jpg`);
    spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(2), "-i", video, "-frames:v", "1", "-vf", `scale=270:480,drawtext=text='${i + 1}  ${t.toFixed(1)} s':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6`, f]);
    if (!fs.existsSync(f)) spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(2), "-i", video, "-frames:v", "1", "-vf", "scale=270:480", f]);
    return f;
  });
  const col = Math.min(6, qs.length);
  const lay = qs.map((_, i) => `${(i % col) * 270}_${Math.floor(i / col) * 480}`).join("|");
  const ent = qs.flatMap((f) => ["-i", f]);
  if (qs.length === 1) fs.copyFileSync(qs[0], saida);
  else spawnSync("ffmpeg", ["-v", "error", "-y", ...ent, "-filter_complex", `${qs.map((_, i) => `[${i}]`).join("")}xstack=inputs=${qs.length}:layout=${lay}:fill=black`, saida]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("Folha:", saida);
};
if (fs.existsSync(video)) {
  folha(frases.map((f) => (f.inicio + f.fim) / 2), path.join(PROJETO, "out", "conferir-frases.jpg"));
  const itens = enumeracoes.flat();
  if (itens.length) folha(itens.map((p) => p.fim + 0.25), path.join(PROJETO, "out", "conferir-itens.jpg"));
  // 5. a escuta
  const sem = path.join(PROJETO, "out", "sem.mp4"), deixas = path.join(PROJETO, "out", "deixas.json");
  if (fs.existsSync(sem) && fs.existsSync(deixas)) {
    const r = spawnSync("python", [path.join(acharRaiz(), "sistema", "editar.py"), "escutar", sem, video, deixas], { encoding: "utf8" });
    const aus = (r.stdout ?? "").split("\n").filter((l) => /AUSENTE/.test(l));
    aus.forEach((l) => falha("efeito mudo", l.trim()));
    console.log(`Escuta: ${(r.stdout ?? "").split("\n").find((l) => /efeitos no lugar/.test(l)) ?? "não rodou"}`);
  } else console.log("Escuta: falta out/sem.mp4 (node scripts/render.mjs --sem-efeitos --rascunho).");
} else console.log("Sem out/render.mp4: renderize e rode de novo para as folhas e a escuta.");

limpar(serveUrl);
if (falhas.length) {
  console.log(`\nREPROVADO (${falhas.length}):`);
  falhas.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log("\nAprovado no que dá para medir. Agora a lista \"Conferir antes de mostrar\" do guia, nas folhas.");
