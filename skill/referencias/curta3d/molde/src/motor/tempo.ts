// O tempo do vídeo sai da fala: src/gerado/palavras.json (o preparar.mjs copia da pasta "fala" do curta.json).
// Tudo é posado por quadro, a partir de funções puras do quadro: o mesmo quadro sempre dá a mesma imagem.
import raw from "../gerado/palavras.json";

export const FPS = 30;
export type Palavra = { texto: string; inicio: number; fim: number };
export const PALAVRAS = raw as Palavra[];
/** o vídeo acaba meio segundo depois da última palavra: só o respiro, sem o personagem parado balançando no fim
 *  (com 1 s, o dono do primeiro vídeo achou que sobrava). O conferir.mjs reprova mais de 0,7 s. */
export const FIM = 0.5;
export const TOTAL = Math.ceil(((PALAVRAS.length ? PALAVRAS[PALAVRAS.length - 1].fim : 5) + FIM) * FPS);

export const normal = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%]/g, "");

/** segundo em que a palavra começa (n = a enésima vez que ela aparece na fala) */
/**
 * Onde a palavra (ou a sequência de palavras, "se chama") aparece pela n-ésima vez. Compara a palavra inteira,
 * sem maiúscula nem pontuação: "chama" casa só com "chama" (e "Chama,"), nunca com um pedaço de outra palavra.
 * Para ver cada palavra com o número da vez: python sistema/editar.py palavras projetos/NOME/corte/palavras.json
 */
const achar = (palavra: string, n: number) => {
  const alvo = palavra.trim().split(/\s+/).map(normal).filter(Boolean);
  let k = 0;
  for (let i = 0; i + alvo.length <= PALAVRAS.length; i++) {
    if (alvo.every((a, j) => normal(PALAVRAS[i + j].texto) === a) && ++k === n) return [PALAVRAS[i], PALAVRAS[i + alvo.length - 1]];
  }
  throw new Error(`palavra não encontrada na fala: "${palavra}" (vez ${n}). Veja as palavras com: python sistema/editar.py palavras projetos/NOME/corte/palavras.json`);
};
export const em = (palavra: string, n = 1): number => achar(palavra, n)[0].inicio;
/** segundo em que a palavra (ou a sequência) acaba */
export const ate = (palavra: string, n = 1): number => achar(palavra, n)[1].fim;
/** quadro da reação: `antes` quadros antes da palavra (a imagem chega 0 a 3 quadros antes da fala) */
export const q = (palavra: string, n = 1, antes = 2) => Math.round(em(palavra, n) * FPS) - antes;
/** segundos -> quadro */
export const qs = (s: number) => Math.round(s * FPS);

// ---------------- curvas ----------------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** smootherstep: o deslize da câmera (sai e chega devagar) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeOut = (u: number, p = 3) => 1 - (1 - clamp01(u)) ** p;
export const easeIn = (u: number, p = 2) => clamp01(u) ** p;
/** 0 -> 1 passando um pouco do ponto e assentando, em `dur` quadros a partir de f0 */
export const spring = (f: number, f0: number, dur = 12, over = 0.12) => {
  const u = (f - f0) / dur;
  if (u <= 0) return 0;
  if (u >= 1.6) return 1;
  return 1 - Math.exp(-5 * u) * Math.cos(u * Math.PI * (1.25 + over * 4));
};
/** curva por pontos (quadro -> valor), linear entre eles */
export const ramp = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
/** pseudo-aleatório determinístico (mesma semente, mesma sequência) */
export const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------------- princípios de movimento ----------------
export type V3 = [number, number, number];

/**
 * Comprimir e esticar no impacto: [largura, altura] para a escala da peça, a partir do quadro do toque.
 * Achata (altura 1 - força), estica um pouco ao voltar e assenta em `dur` quadros. O volume se mantém:
 * a largura é 1/raiz(altura) (achatou, alargou; esticou, afinou).
 * Antes do toque, com `queda` > 0, estica na direção do movimento (a peça caindo fica mais alta).
 */
export const achata = (f: number, toque: number, forca = 0.28, dur = 12, queda = 0): [number, number] => {
  let h = 1;
  if (f < toque) h = 1 + (queda > 0 ? smooth(1 - (toque - f) / 6) * queda : 0);
  else {
    const u = (f - toque) / dur;
    if (u < 1) h = 1 - forca * Math.exp(-4.2 * u) * Math.cos(u * Math.PI * 2.2);
  }
  return [1 / Math.sqrt(h), h];
};

/**
 * Mola: o balanço que sobra nas partes presas (capacete, crachá, antena, placa pendurada) depois de cada evento
 * (pouso, susto, parada). Soma a resposta de cada evento: sobe a 1, balança e some. Use como ângulo vezes a força.
 * `frequencia` em voltas por quadro (0,07 = um balanço a cada 14 quadros), `amortecimento` por quadro.
 */
export const mola = (f: number, eventos: number[], frequencia = 0.07, amortecimento = 0.09) => {
  let v = 0;
  for (const e of eventos) { const t = f - e; if (t >= 0 && t < 90) v += Math.exp(-amortecimento * t) * Math.sin(t * frequencia * Math.PI * 2); }
  return v;
};

/** Antecipação: de 0 a -1 e de volta a 0 nos `dur` quadros antes de `inicio` (o recuo antes do movimento grande). */
export const antecipa = (f: number, inicio: number, dur = 5) => {
  if (f < inicio - dur || f >= inicio) return 0;
  const u = (f - (inicio - dur)) / dur;
  return -Math.sin(u * Math.PI * 0.5) * (u < 0.85 ? 1 : (1 - u) / 0.15);
};

/**
 * Entrada de uma peça num arco: recua e agacha (antecipação), salta de `de` até `para` num arco de `altura` m,
 * e achata ao pousar. Devolve a posição, a escala [largura, altura, largura], a altura do arco (para a sombra-bolha)
 * e os quadros `decola` e `pouso` (para o som: use `pulo()` do contatos.ts, que já registra os dois).
 * `inicio` é o quadro em que ela sai do chão; o pouso é `inicio + dur`.
 */
export const entra = (f: number, o: { de: V3; para: V3; inicio: number; dur?: number; altura?: number; agacha?: number; forca?: number }) => {
  const dur = o.dur ?? 12, alt = o.altura ?? 1.2, ag = o.agacha ?? 0.18;
  const pouso = o.inicio + dur;
  const base = { decola: o.inicio, pouso };
  if (f < o.inicio) {
    const a = antecipa(f, o.inicio, 6); // agacha antes de saltar
    const h = 1 + a * ag;
    return { ...base, pos: o.de, escala: [1 / Math.sqrt(h), h, 1 / Math.sqrt(h)] as V3, voando: false, altura: 0 };
  }
  if (f < pouso) {
    const u = (f - o.inicio) / dur;
    const k = easeOut(u, 1.6);                         // x e z desaceleram...
    const sobe = 4 * alt * u * (1 - u);
    const y = sobe + lerp(o.de[1], o.para[1], u * u); // ...e a altura faz o arco (curvas diferentes)
    const [w, h] = achata(f, pouso, 0, 1, 0.22);
    return { ...base, pos: [lerp(o.de[0], o.para[0], k), y, lerp(o.de[2], o.para[2], k)] as V3, escala: [w, h, w] as V3, voando: true, altura: sobe };
  }
  const [w, h] = achata(f, pouso, o.forca ?? 0.3);
  return { ...base, pos: o.para, escala: [w, h, w] as V3, voando: false, altura: 0 };
};

/**
 * Piscar: escala da altura do olho (1 aberto, 0,1 fechado). Assimétrico, como o de verdade: fecha rápido (3 quadros)
 * e abre devagar (6). Sozinho a cada 1,5 a 3 s; e nos quadros de `extras` (a virada do olhar, o susto, o pouso).
 */
const PISCA = [1, 0.5, 0.1, 0.15, 0.35, 0.55, 0.75, 0.9, 1];
export const piscar = (f: number, semente = 1, extras: number[] = []) => {
  for (const e of extras) if (f >= e && f < e + PISCA.length) return PISCA[f - e];
  const r = rng(semente);
  let t = Math.round(r() * 30);
  while (t < f + 10) {
    if (f >= t && f < t + PISCA.length) return PISCA[f - t];
    t += 45 + Math.round(r() * 45);
  }
  return 1;
};
