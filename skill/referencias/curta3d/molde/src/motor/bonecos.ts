// O Claude e as pessoas vivos: respirar, piscar, olhar, acenar, andar, se assustar e ficar tonto.
// Tudo a partir do quadro, sem estado. Chame a cada quadro, depois de posicionar a peça.
import * as THREE from "three";
import { no } from "./kit";
import { piscar, spring, smooth, clamp01, achata, mola, V3 } from "./tempo";

export type Gesto = {
  /** quadros [início, fim] do aceno com o braço direito */
  aceno?: [number, number];
  /** quadros [início, fim] apontando com o braço direito para a frente-direita */
  aponta?: [number, number];
  /** os dois braços para cima (comemorar) em [início, fim] */
  comemora?: [number, number];
  /** olhar: deslocamento dos olhos de -1 (esquerda) a 1 (direita) e de -1 (baixo) a 1 (cima) */
  olhar?: [number, number];
  /** quadro do susto: pulinho, olhos arregalados e achata ao voltar */
  susto?: number;
  /** quadro em que fica tonto (balança por 1,5 s) */
  tonto?: number;
  /** velocidade de caminhada em m/s (0 = parado): perninhas alternando; a fase sai da distância andada */
  anda?: { distancia: number };
  /** quadro de um pouso (achata o corpo) */
  pouso?: number;
  /** quadros em que o olhar muda de alvo: pisca junto (o piscar na virada é o que faz o olho parecer pensar) */
  viradas?: number[];
  /** outros quadros que sacodem as partes presas (parada da corrida, uma batida perto) */
  sacode?: number[];
  semente?: number;
};

/**
 * As partes presas balançam depois de cada evento (pouso, susto, parada): capacete, crachá e o que mais estiver
 * pendurado no corpo (filhos do `claude_corpo` cujo nome não começa com "claude_"). Fica de pé de novo sozinho.
 */
const balancarPresas = (corpo: THREE.Object3D, f: number, eventos: number[], semente = 0) => {
  if (!eventos.length) return;
  const m = mola(f, eventos, 0.065, 0.085), m2 = mola(f, eventos.map((e) => e + 2), 0.05, 0.08);
  for (const ch of corpo.children) {
    if (ch.name.startsWith("claude_") || !ch.userData) continue;
    if (ch.userData.rot0 === undefined) ch.userData.rot0 = [ch.rotation.x, ch.rotation.y, ch.rotation.z];
    const [x0, y0, z0] = ch.userData.rot0 as number[];
    const forte = ch.name.startsWith("cracha") ? 0.35 : 0.12;
    ch.rotation.set(x0 + m2 * forte * 0.6, y0, z0 + m * forte * (semente % 2 ? -1 : 1));
  }
};

const janela = (f: number, [a, b]: [number, number], entra = 6, sai = 6) => Math.min(smooth((f - a) / entra), 1 - smooth((f - (b - sai)) / sai));

/** Claude: respira (o corpo sobe e desce 1 %), pisca, mexe os braços de leve e faz os gestos pedidos. */
export const animarClaude = (c: THREE.Object3D, f: number, g: Gesto = {}) => {
  const corpo = no(c, "claude_corpo"), olhos = no(c, "claude_olhos");
  const bE = no(c, "claude_bracoE"), bD = no(c, "claude_bracoD");
  const resp = Math.sin(f * 0.16 + (g.semente ?? 0)) * 0.012;
  let [w, h] = [1, 1 + resp];
  if (g.pouso !== undefined) { const [aw, ah] = achata(f, g.pouso, 0.25); w *= aw; h *= ah; }
  let pulo = 0, arregala = 1;
  if (g.susto !== undefined && f >= g.susto - 3) {
    const t = f - g.susto;
    pulo = t < 0 ? -0.04 * (t + 3) / 3 : Math.max(0, Math.sin(Math.min(t, 9) / 9 * Math.PI)) * 0.28;
    if (t >= 9) { const [aw, ah] = achata(f, g.susto + 9, 0.22); w *= aw; h *= ah; }
    arregala = 1 + 0.35 * clamp01(1 - (t - 20) / 15) * clamp01((t + 3) / 3);
  }
  // o achatar do pouso pode somar com o do pulo (o `entra` na escala da peça): o corpo nunca passa de 30% amassado
  h = Math.max(h, 0.7); w = Math.min(w, 1.25);
  corpo.scale.set(w, h, w);
  // achata a partir da base do corpo (z 0,27), não do meio: a peça continua no chão
  corpo.position.y = 0.27 + 0.4 * h + pulo;
  olhos.position.y = 0.27 + 0.48 * h + pulo;
  const extras = [...(g.viradas ?? []), ...(g.pouso !== undefined ? [g.pouso + 1] : [])];
  const pisca = g.susto !== undefined && f >= g.susto && f < g.susto + 20 ? 1 : piscar(f, g.semente ?? 1, extras);
  olhos.scale.set(arregala, pisca * arregala, 1);
  olhos.position.x = (g.olhar?.[0] ?? 0) * 0.09;
  olhos.position.y += (g.olhar?.[1] ?? 0) * 0.06;
  // braços: balanço leve
  const bal = Math.sin(f * 0.12 + 1) * 0.06;
  bE.rotation.set(0, 0, -bal); bD.rotation.set(0, 0, bal);
  bE.position.y = bD.position.y = 0.27 + 0.33 * h + pulo;
  bE.scale.set(1, 1, 1); bD.scale.set(1, 1, 1);
  if (g.aceno) {
    // o braço é um toco: no aceno ele cresce, sobe por cima da cabeça e o corpo balança junto, para se ver
    const k = janela(f, g.aceno);
    bD.rotation.z = bal + k * 2.6 + k * Math.sin(f * 0.7) * 0.45;
    bD.scale.set(1 + 0.6 * k, 1 + 0.6 * k, 1 + 0.6 * k);
    corpo.rotation.z = -k * Math.sin(f * 0.7) * 0.05;
  } else corpo.rotation.z = 0;
  if (g.aponta) {
    const k = spring(f, g.aponta[0], 10) * (1 - smooth((f - (g.aponta[1] - 6)) / 6));
    bD.rotation.z = bal + k * 1.4; bD.rotation.y = -k * 0.6;
  }
  if (g.comemora) {
    const k = janela(f, g.comemora, 5);
    bE.rotation.z = -bal - k * (2.3 + Math.sin(f * 0.8) * 0.2); bD.rotation.z = bal + k * (2.3 + Math.sin(f * 0.8 + 1) * 0.2);
  }
  // os braços também sobram um pouco depois do pouso e do susto (continuidade)
  const ev = [...(g.pouso !== undefined ? [g.pouso] : []), ...(g.susto !== undefined ? [g.susto + 9] : []), ...(g.sacode ?? [])];
  if (ev.length && !g.aceno && !g.aponta && !g.comemora) { const m = mola(f, ev, 0.08, 0.1) * 0.35; bE.rotation.z -= m; bD.rotation.z += m; }
  balancarPresas(corpo, f, ev, g.semente ?? 0);
  // perninhas
  for (let i = 0; i < 4; i++) {
    const p = no(c, `claude_perna${i}`);
    const fase = g.anda ? Math.sin(g.anda.distancia * 9 + (i % 2) * Math.PI) * 0.5 : 0;
    p.rotation.x = fase;
    p.position.y = 0.3 + pulo;
  }
  // tonto: o corpo todo balança em círculo e os olhos giram. Cada quadro é calculado do zero: fora do tonto, os
  // olhos e a inclinação voltam a zero (antes, o giro ficava preso e os olhos seguiam tortos até o fim do vídeo)
  olhos.rotation.z = 0;
  if (g.tonto !== undefined) {
    const t = f - g.tonto, k = t >= 0 ? Math.exp(-t / 30) * (t < 120 ? 1 : 0) : 0;
    c.rotation.z = Math.sin(t * 0.35) * 0.12 * k;
    c.rotation.x = Math.cos(t * 0.35) * 0.08 * k;
    olhos.rotation.z = Math.sin(t * 0.5) * 1.2 * k;
  }
};

/** Pessoa (pessoa ou pessoa_b): respira, pisca, olha, acena, aponta, comemora e anda. */
export const animarPessoa = (p: THREE.Object3D, f: number, g: Gesto = {}) => {
  const n = p.name.startsWith("pessoa_b") ? "pessoa_b" : "pessoa";
  const cab = no(p, `${n}_cabeca`), olhos = no(p, `${n}_olhos`);
  const bE = no(p, `${n}_bracoE`), bD = no(p, `${n}_bracoD`), pE = no(p, `${n}_pernaE`), pD = no(p, `${n}_pernaD`);
  const resp = Math.sin(f * 0.14 + (g.semente ?? 0)) * 0.015;
  olhos.scale.y = piscar(f, g.semente ?? 2, g.viradas ?? []);
  olhos.position.x = (g.olhar?.[0] ?? 0) * 0.04;
  cab.rotation.set(-(g.olhar?.[1] ?? 0) * 0.2 + resp, (g.olhar?.[0] ?? 0) * 0.35, 0);
  const bal = Math.sin(f * 0.11) * 0.05;
  bE.rotation.set(0, 0, -0.08 - bal); bD.rotation.set(0, 0, 0.08 + bal);
  pE.rotation.set(0, 0, 0); pD.rotation.set(0, 0, 0);
  if (g.anda) {
    const fase = Math.sin(g.anda.distancia * 3.4);
    pE.rotation.x = fase * 0.45; pD.rotation.x = -fase * 0.45;
    bE.rotation.x = -fase * 0.4; bD.rotation.x = fase * 0.4;
    p.position.y += Math.abs(Math.cos(g.anda.distancia * 3.4)) * 0.03;
  }
  if (g.aceno) { const k = janela(f, g.aceno); bD.rotation.z = 0.08 + k * 2.6 + k * Math.sin(f * 0.6) * 0.3; }
  if (g.aponta) { const k = spring(f, g.aponta[0], 10) * (1 - smooth((f - (g.aponta[1] - 6)) / 6)); bD.rotation.x = -k * 1.5; }
  if (g.comemora) { const k = janela(f, g.comemora, 5); bE.rotation.z = -k * 2.7; bD.rotation.z = k * 2.7; }
  if (g.susto !== undefined && f >= g.susto - 3) {
    const t = f - g.susto;
    p.position.y += t < 0 ? 0 : Math.max(0, Math.sin(Math.min(t, 9) / 9 * Math.PI)) * 0.18;
    olhos.scale.y = t >= 0 && t < 20 ? 1.3 : olhos.scale.y;
  }
};

/** olhar de um ponto para outro: [x, y] para o `olhar` (aprox., no plano da peça virada para +Z) */
export const olharPara = (de: THREE.Object3D, alvo: V3): [number, number] => {
  const p = new THREE.Vector3(...alvo);
  de.worldToLocal(p);
  return [clamp01((p.x / Math.max(0.5, Math.abs(p.z) + 0.5) + 1) / 2) * 2 - 1, Math.max(-1, Math.min(1, (p.y - 1) / 3))];
};
