// Junta o que o vídeo usa, antes de cada render (os outros scripts já chamam este):
//   - a voz e o palavras.json da pasta "fala" do curta.json (saída do `voz`, do `cortar` de um áudio ou do `falas-gravadas`);
//   - as cores, as fontes e a legenda da pessoa (o padrao.json da ferramenta com o meu-estilo/marca.json por cima);
//   - as peças 3D: as do kit (skill/referencias/curta3d/pecas/glb, na ferramenta) e as do projeto (pecas/), que valem por cima;
//   - os efeitos sonoros: todo id do kit de sons escrito entre aspas em src/ é copiado, com o ponto de
//     sincronia e o pico medido; e cada .wav da pasta sons/ do projeto. O nível da fala também é medido:
//     o Som.tsx põe cada efeito na régua contra ele (contato 9 dB abaixo, curto 13, contínuo 20).
// Uso: node scripts/preparar.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PROJETO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A ferramenta (com sistema/editar.py) e a pasta do editor (com o meu-estilo/ da pessoa). A ferramenta mora em
 *  .ferramenta/, dentro da pasta do editor, e o projeto em .projetos/NOME/, ao lado dela; sem .ferramenta/ (a oficina),
 *  as duas são a mesma pasta. Projeto fora da pasta do editor: "editor" no curta.json (ou CURTA_EDITOR) diz onde ela está. */
const pastas = (d) => {
  if (fs.existsSync(path.join(d, ".ferramenta", "sistema", "editar.py"))) return { ferramenta: path.join(d, ".ferramenta"), editor: d };
  if (fs.existsSync(path.join(d, "sistema", "editar.py"))) return { ferramenta: d, editor: path.basename(d) === ".ferramenta" ? path.dirname(d) : d };
  return null;
};
const acharPastas = () => {
  const curta = fs.existsSync(path.join(PROJETO, "curta.json")) ? JSON.parse(fs.readFileSync(path.join(PROJETO, "curta.json"), "utf8").replace(/^﻿/, "")) : {};
  const dito = process.env.CURTA_EDITOR ?? curta.editor;
  if (dito) {
    const r = pastas(path.resolve(PROJETO, dito));
    if (!r) throw new Error(`"editor" no curta.json não é a pasta do editor (sem .ferramenta/sistema/editar.py): ${path.resolve(PROJETO, dito)}`);
    return r;
  }
  let d = PROJETO;
  for (let i = 0; i < 8; i++) {
    const r = pastas(d);
    if (r) return r;
    d = path.dirname(d);
  }
  throw new Error("Não achei a pasta do editor (com .ferramenta/sistema/editar.py) acima de " + PROJETO);
};
/** a ferramenta: sistema/ e skill/ */
export const acharRaiz = () => acharPastas().ferramenta;
/** a pasta do editor: o meu-estilo/ da pessoa */
export const acharEditor = () => acharPastas().editor;

const lerJson = (p) => JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, ""));
const juntar = (base, cima) => {
  for (const [k, v] of Object.entries(cima)) {
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) juntar(base[k], v);
    else base[k] = v;
  }
  return base;
};
const copiar = (de, para) => { fs.mkdirSync(path.dirname(para), { recursive: true }); fs.copyFileSync(de, para); };


// ---- medidas de volume (as mesmas janelas do `escutar`): fala em 100 ms, pico do efeito em 5 ms
const amostras = (arquivo) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", arquivo, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const b = r.stdout ?? Buffer.alloc(0);
  return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4));
};
const janelasDb = (x, n, passo) => {
  const out = [];
  let soma = 0;
  const q = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) { soma += x[i] * x[i]; q[i + 1] = soma; }
  for (let i = 0; i + n <= x.length; i += passo) out.push(10 * Math.log10((q[i + n] - q[i]) / n + 1e-18));
  return out;
};
/** nível da fala: mediana das janelas de 100 ms com voz (acima de -40 dB) */
const nivelDaFala = (arquivo) => {
  const d = janelasDb(amostras(arquivo), 4800, 480).filter((v) => v > -40).sort((a, b) => a - b);
  return d.length ? d[Math.floor(d.length / 2)] : -25;
};
/** pico de um efeito: o maior nível em janelas de 5 ms */
const picoDoSom = (arquivo) => Math.max(...janelasDb(amostras(arquivo), 240, 120), -90);

export const preparar = () => {
  const RAIZ = acharRaiz(), EDITOR = acharEditor();
  const SKILL = path.join(RAIZ, "skill", "referencias", "curta3d");
  const PUB = path.join(PROJETO, "public"), GER = path.join(PROJETO, "src", "gerado");
  fs.mkdirSync(GER, { recursive: true });
  const curta = lerJson(path.join(PROJETO, "curta.json"));

  // ---- voz e palavras
  const fala = path.resolve(PROJETO, curta.fala);
  for (const f of ["voz.wav", "palavras.json"]) {
    if (!fs.existsSync(path.join(fala, f))) throw new Error(`Falta ${f} em ${fala}. Gere a voz antes (de IA: python .ferramenta/sistema/editar.py voz .projetos/NOME/texto.txt --saida .projetos/NOME/corte; gravada: transcrever e cortar, ou falas-gravadas)`);
  }
  copiar(path.join(fala, "voz.wav"), path.join(PUB, "voz", "voz.wav"));
  const palavras = lerJson(path.join(fala, "palavras.json"));
  fs.writeFileSync(path.join(GER, "palavras.json"), JSON.stringify(palavras));
  // a base de cada cartão, medida pelo conferir.mjs (out/bases.json); sem medida, o Cartao.tsx usa a `base` ou 900
  const bases = path.join(PROJETO, "out", "bases.json");
  fs.writeFileSync(path.join(GER, "bases.json"), fs.existsSync(bases) ? fs.readFileSync(bases, "utf8") : "{}");

  // ---- marca da pessoa
  const cfg = lerJson(path.join(RAIZ, "sistema", "padrao.json"));
  const marca = path.join(EDITOR, "meu-estilo", "marca.json");
  if (fs.existsSync(marca)) juntar(cfg, lerJson(marca));
  const fontes = [];
  for (const f of cfg.arquivos_de_fonte ?? []) {
    const origem = [path.join(EDITOR, "meu-estilo", "fontes", f.arquivo), path.join(RAIZ, "sistema", "fontes", f.arquivo)].find((p) => fs.existsSync(p));
    if (!origem) { console.log("aviso: fonte não encontrada:", f.arquivo); continue; }
    copiar(origem, path.join(PUB, "fontes", f.arquivo));
    fontes.push({ familia: f.familia, arquivo: f.arquivo, peso: f.peso ?? 400, estilo: f.estilo ?? "normal" });
  }
  const legenda = { ...cfg.legenda, ...(curta.legenda ?? {}) };
  legenda.destaques = [...(cfg.legenda?.destaques ?? []), ...(curta.legenda?.destaques ?? [])];
  const ganho = curta.efeitos?.ganho ?? 0; // a régua já vem da fala medida: o ganho geral só ajusta por cima

  // ---- peças 3D
  const pastas = [path.join(SKILL, "pecas", "glb"), path.join(PROJETO, "pecas")];
  const todas = {};
  for (const p of pastas) if (fs.existsSync(p)) for (const f of fs.readdirSync(p)) if (f.endsWith(".glb")) todas[f.slice(0, -4)] = path.join(p, f);
  const pedidas = curta.pecas === "todas" || !curta.pecas ? Object.keys(todas) : curta.pecas;
  fs.rmSync(path.join(PUB, "modelos"), { recursive: true, force: true });
  for (const n of pedidas) {
    if (!todas[n]) throw new Error(`Peça "${n}" não existe no kit nem em pecas/ do projeto. Peças: ${Object.keys(todas).join(", ")}`);
    copiar(todas[n], path.join(PUB, "modelos", n + ".glb"));
  }

  // ---- efeitos sonoros
  const EF = path.join(RAIZ, "sistema", "efeitos");
  const catalogo = Object.fromEntries(lerJson(path.join(EF, "sounds.json")).sounds.map((s) => [s.id, s]));
  const fontesTs = [];
  const varrer = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== "gerado") varrer(p); } else if (/\.(ts|tsx)$/.test(f.name)) fontesTs.push(fs.readFileSync(p, "utf8")); } };
  varrer(path.join(PROJETO, "src"));
  const ids = new Set();
  for (const t of fontesTs) for (const m of t.matchAll(/["'`]([a-z0-9]+(?:-[a-z0-9]+)+)["'`]/g)) if (catalogo[m[1]]) ids.add(m[1]);
  const efeitos = {};
  fs.rmSync(path.join(PUB, "sfx"), { recursive: true, force: true });
  for (const id of ids) {
    const s = catalogo[id];
    copiar(path.join(EF, s.file), path.join(PUB, "sfx", id + ".wav"));
    efeitos[id] = { arquivo: `sfx/${id}.wav`, sinc: s.sync.at, dura: s.duration, ataque: s.timing?.onset ?? 0, pico: +picoDoSom(path.join(EF, s.file)).toFixed(1), categoria: s.category };
  }
  const sons = path.join(PROJETO, "sons");
  if (fs.existsSync(sons)) for (const f of fs.readdirSync(sons)) {
    if (!/\.(wav|mp3|m4a|ogg)$/i.test(f)) continue;
    const r = spawnSync("ffmpeg", ["-hide_banner", "-i", path.join(sons, f), "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
    const media = Number((r.stderr.match(/mean_volume: (-?[\d.]+)/) ?? [0, -20])[1]);
    const pico = Number((r.stderr.match(/max_volume: (-?[\d.]+)/) ?? [0, -6])[1]);
    const nivel = -20 - Math.min(-20 - media, -6 - pico); // como no `montar`: média em -20 dB, sem o pico passar de -6 dB
    const d = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(sons, f)], { encoding: "utf8" });
    copiar(path.join(sons, f), path.join(PUB, "sons", f));
    efeitos["sons/" + f] = { arquivo: "sons/" + f, sinc: 0, dura: Number(d.stdout) || 2, ataque: 0, pico: +picoDoSom(path.join(sons, f)).toFixed(1), categoria: "proprio" };
    void nivel;
  }

  // texturas assadas no Blender (pecas/texturas): material de verdade para o Claude, o tecido e a pele
  const TEX = path.join(SKILL, "pecas", "texturas");
  const texturas = [];
  fs.rmSync(path.join(PUB, "texturas"), { recursive: true, force: true });
  if (fs.existsSync(TEX)) for (const f of fs.readdirSync(TEX)) if (/\.(png|jpg)$/.test(f)) { copiar(path.join(TEX, f), path.join(PUB, "texturas", f)); texturas.push(f); }
  const voz = +nivelDaFala(path.join(fala, "voz.wav")).toFixed(1);
  fs.writeFileSync(path.join(GER, "config.json"), JSON.stringify({ cores: cfg.cores, fontes: cfg.fontes, arquivos: fontes, legenda, ganho, voz, efeitos, pecas: pedidas, texturas }, null, 1));
  const fim = palavras.length ? palavras[palavras.length - 1].fim : 0;
  console.log(`Preparado: ${palavras.length} palavras (${fim.toFixed(2)} s), ${pedidas.length} peças, ${Object.keys(efeitos).length} efeitos, ${fontes.length} fontes.`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) preparar();
