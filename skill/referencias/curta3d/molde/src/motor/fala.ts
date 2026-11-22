// A fala dos personagens: quem fala em cada quadro e quanto a boca abre, sílaba por sílaba.
// O palavras.json da voz com personagens (python .ferramenta/sistema/editar.py voz, com [nome] em cada linha) traz "quem" e
// "fala" em cada palavra. A boca abre em cada sílaba (os grupos de vogais da palavra), mais nas vogais abertas
// (a, é, ó) e menos nas fechadas (i, u), e fecha entre as palavras.
import { PALAVRAS, FPS, clamp01 } from "./tempo";

export type PalavraFalada = { texto: string; inicio: number; fim: number; quem?: string; fala?: number };
const P = PALAVRAS as PalavraFalada[];

/** as falas (turnos): quem, de/ate em segundos, e o índice */
export type Turno = { quem: string; de: number; ate: number; fala: number; texto: string };
export const TURNOS: Turno[] = (() => {
  const r: Turno[] = [];
  for (const p of P) {
    const k = p.fala ?? 0, quem = p.quem ?? "narrador";
    const ult = r[r.length - 1];
    if (ult && ult.fala === k) { ult.ate = p.fim; ult.texto += " " + p.texto; }
    else r.push({ quem, de: p.inicio, ate: p.fim, fala: k, texto: p.texto });
  }
  return r;
})();

/** quem está falando no quadro (ou o último que falou, numa pausa) */
export const quemFala = (f: number): string => {
  const t = f / FPS;
  let q = TURNOS[0]?.quem ?? "";
  for (const u of TURNOS) if (t >= u.de - 0.05) q = u.quem;
  return q;
};
/** o turno do quadro (o que está em curso ou o último) */
export const turnoEm = (f: number): Turno | undefined => {
  const t = f / FPS;
  let r: Turno | undefined;
  for (const u of TURNOS) if (t >= u.de - 0.05) r = u;
  return r;
};

const VOGAIS = /[aeiouáéíóúâêôãõày]+/gi;
const abertura = (v: string) => (/[aáãâà]/i.test(v) ? 1 : /[eéêoóô]/i.test(v) ? 0.78 : 0.5);
const redonda = (v: string) => /[oóôuú]/i.test(v);

/**
 * A boca de `quem` no quadro f: `abre` de 0 (fechada) a 1, e `redonda` (o, u: a boca estreita).
 * Média de três instantes dentro do quadro, para não piscar entre sílabas curtas.
 */
export const boca = (quem: string, f: number): { abre: number; redonda: boolean } => {
  let soma = 0, red = false;
  for (const d of [-0.33, 0, 0.33]) {
    const t = (f + d) / FPS;
    const p = P.find((x) => (x.quem ?? "narrador") === quem && t >= x.inicio && t < x.fim);
    if (!p) continue;
    const sil = p.texto.match(VOGAIS) ?? ["a"];
    const u = (t - p.inicio) / Math.max(0.05, p.fim - p.inicio) * sil.length;
    const i = Math.min(sil.length - 1, Math.floor(u)), k = u - i;
    soma += Math.pow(Math.sin(Math.PI * clamp01(k * 1.15)), 0.7) * abertura(sil[i]);
    if (d === 0) red = redonda(sil[i]);
  }
  return { abre: soma / 3, redonda: red };
};

/** o quanto `quem` está falando no quadro, suavizado (0 a 1): para o aceno de cabeça e o gesto */
export const falando = (quem: string, f: number) => {
  const t = f / FPS;
  return TURNOS.some((u) => u.quem === quem && t >= u.de && t <= u.ate) ? 1 : 0;
};
