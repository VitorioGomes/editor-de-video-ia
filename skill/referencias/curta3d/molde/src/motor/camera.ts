// A câmera do estilo (gramática da skill cartoon-3d-short, MIT, Mr omi 2026, com os valores do vídeo do /btw):
// - corte seco quando o salto é grande (outro lugar, outro bloco da fala);
// - todo o resto é deslize smootherstep de 18 a 40 quadros;
// - plano parado nunca fica parado: empurra devagar para o que olha (0,15 a 0,35 % por quadro);
// - sacudida nos impactos: ruído suave em três eixos, mais giro que deslocamento, sumindo em uns 10 quadros;
// - um balanço de mão bem leve (0,1 a 0,3 grau) em todo plano, e o olhar chega um pouco depois da câmera nos deslizes;
// - inclinação (roll) de 2 a 4 graus para dar vida;
// - o foco (desfoque de fundo) acompanha o assunto de cada plano.
import { glide, V3 } from "./tempo";

export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
/** um plano: começa no quadro f; `corte` entra seco, senão desliza do anterior em `dur` quadros */
export type Plano = { f: number; dur?: number; corte?: boolean; s: (f: number) => Shot };

const cheio = (c: Shot): Cam => ({ fov: 38, roll: 0, ...c });
const misturar = (a: Cam, b: Cam, k: number, kLook = k): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * kLook) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
/** ruído suave e determinístico: soma de senos com frequências que não se repetem juntas */
const ruido = (t: number, s: number) => (Math.sin(t * 1.13 + s) * 0.5 + Math.sin(t * 2.71 + s * 1.7) * 0.3 + Math.sin(t * 4.37 + s * 2.3) * 0.2);

/** empurrão: fator de distância exp(-taxa * quadros desde f0) (0,0025 = 0,25 % por quadro) */
export const empurra = (f: number, f0: number, taxa = 0.0025) => Math.exp(-taxa * Math.max(0, f - f0));
/** câmera em `pos` olhando `look`, aproximada pelo fator k (1 = no lugar, 0,8 = 20 % mais perto) */
export const dolly = (pos: V3, look: V3, k: number, resto: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...resto });
/** câmera em órbita: ângulo (graus, 0 = de frente, olhando -Z), distância, altura, olhando `alvo` */
export const orbita = (alvo: V3, angulo: number, dist: number, altura: number, resto: Partial<Cam> = {}): Shot => {
  const a = (angulo * Math.PI) / 180;
  return { pos: [alvo[0] + Math.sin(a) * dist, alvo[1] + altura, alvo[2] + Math.cos(a) * dist], look: alvo, ...resto };
};

export const camera = (planos: Plano[], sacudidas: [number, number][], f: number, o: { mao?: number } = {}): Cam => {
  let cur = cheio(planos[0].s(f));
  for (let i = 1; i < planos.length; i++) {
    const k = planos[i];
    if (f < k.f) break;
    const u = (f - k.f) / (k.dur ?? 24);
    // o olhar atrasa um pouco em relação à posição, como um operador que segue o assunto
    cur = k.corte ? cheio(k.s(f)) : misturar(cur, cheio(k.s(f)), glide(u), glide(u * 0.88 - 0.04));
  }
  const s = sacudida(sacudidas, f);
  const d: V3 = [cur.look[0] - cur.pos[0], cur.look[1] - cur.pos[1], cur.look[2] - cur.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  // giro (em radianos) do balanço de mão e da sacudida, aplicado no ponto olhado
  const mao = (o.mao ?? 1) * 0.0035;
  const giroX = ruido(f / 30 * 0.9, 1.1) * mao + s.yaw, giroY = ruido(f / 30 * 0.7, 4.2) * mao + s.pitch;
  return {
    ...cur,
    look: [cur.look[0] - (d[2] / h) * L * giroX, cur.look[1] + L * giroY, cur.look[2] + (d[0] / h) * L * giroX],
    pos: [cur.pos[0] + s.dx * (d[2] / h), cur.pos[1] + s.dy, cur.pos[2] - s.dx * (d[0] / h)],
    roll: cur.roll + ruido(f / 30 * 0.5, 7.7) * mao * 0.8 + s.roll,
  };
};

/** sacudidas: [quadro, força] (1 = forte, 0,4 = leve). Ruído suave nos três eixos, decaindo pelo quadrado em 10 quadros. */
export const sacudida = (lista: [number, number][], f: number) => {
  const r = { yaw: 0, pitch: 0, roll: 0, dx: 0, dy: 0 };
  for (const [f0, g] of lista) {
    const n = f - f0;
    if (n < 0 || n >= 10) continue;
    const dec = (1 - n / 10) ** 2 * g, t = n * 0.8;
    r.yaw += ruido(t, f0) * 0.005 * dec; r.pitch += ruido(t, f0 + 3) * 0.007 * dec; r.roll += ruido(t, f0 + 6) * 0.012 * dec;
    r.dx += ruido(t, f0 + 9) * 0.01 * dec; r.dy += ruido(t, f0 + 12) * 0.015 * dec;
  }
  return r;
};

/** Foco por trecho: a partir de f, desfoque de fundo cInf (px a 1080: 0 nos planos abertos, 8-12 nos médios, 13-16 de perto). */
export type Foco = { f: number; dur?: number; cInf: number; alvo?: (f: number) => V3 };
export const foco = (lista: Foco[], cortes: number[], f: number) => {
  let i = 0; while (i + 1 < lista.length && f >= lista[i + 1].f) i++;
  const d = lista[i], p = lista[Math.max(0, i - 1)];
  const k = d.dur ? glide((f - d.f) / d.dur) : 1;
  const fp = p.alvo ? p.alvo(f) : null, fd = d.alvo ? d.alvo(f) : null;
  const alvo = fd && fp && k < 1 ? (fd.map((v, j) => fp[j] + (v - fp[j]) * k) as V3) : fd;
  // desfoque de passagem: 3 quadros antes e depois de cada corte o fundo abre um pouco mais
  let pulso = 0;
  for (const c of cortes) { const n = f - c; if (n >= -3 && n < 4) pulso = Math.max(pulso, 1 - Math.abs(n + 0.5) / 3.5); }
  return { cInf: p.cInf + (d.cInf - p.cInf) * k + 10 * pulso, alvo };
};
