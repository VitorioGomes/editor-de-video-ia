// A câmera de diálogo (o Estilo Conversa): plano e contraplano a partir das falas da voz.
//   - close de quem fala, de frente, quase olhando para a lente, com o fundo bem desfocado;
//   - fala longa (mais de `max` s) se divide: o close e depois um plano médio, ou o plano dos dois juntos;
//   - a cada `conjuntoACada` trocas de quem fala, o plano dos dois juntos entra no lugar do close;
//   - o corte cai 2 quadros antes da primeira palavra de cada fala; todo plano empurra devagar, até um limite;
//   - A RÉGUA (vale em todo quadro): os olhos de quem fala ficam entre 700 e 1000 px; com cartão no alto, os olhos
//     de todos ficam `margem` px abaixo da base dele (o cartão pode cobrir o cabelo, nunca os olhos); a boca fica
//     acima da legenda, e a legenda acima de 1560 px (a área segura dos Reels).
// Devolve os planos (para camera()), os focos (para foco()), os cortes, a altura da legenda em cada quadro e
// `medir(f)`, que a cena exporta como REGUA para o conferir.mjs reprovar o quadro que sai da régua.
import * as THREE from "three";
import { Plano, Foco, Shot, dolly, empurra, camera } from "./camera";
import { TURNOS, Turno } from "./fala";
import { FPS, TOTAL, V3, lerp } from "./tempo";

export type Ator = {
  /** o centro do rosto (m) e a direção para onde ele olha (no chão, x e z) */
  rosto: V3; frente: [number, number];
  /** tamanho do rosto (m): o close se afasta na proporção. Padrões em TAMANHO (use ator()) */
  tamanho?: number;
  /** quanto os olhos ficam acima do `rosto` e a boca abaixo dele (m), e quanto a cara fica à frente do centro */
  olho?: number; boca?: number; face?: number;
  /** metade da altura do olho (m): o cartão para acima do ALTO do olho (os do Claude têm 22 cm) */
  meioOlho?: number;
};
export type Tipo = "close" | "medio" | "conjunto";
export type PlanoDialogo = { f: number; ate: number; tipo: Tipo; quem: string };

/** o rosto de uma peça que conversa: olhos e boca (m, do chão), a cara à frente do centro, metade da altura do olho e
 *  o tamanho que enquadra o close sem cortar (a cabeça inteira, ou o corpo inteiro de largura no Claude) */
export type RostoInfo = { olhos: number; boca: number; face: number; meioOlho: number; tamanho: number };
/** as peças que conversam. Personagem novo entra com registrarRosto("gato", {...}) (o contrato do rosto, no guia) */
export const ROSTO: Record<string, RostoInfo> = {
  boneco: { olhos: 1.36, boca: 1.15, face: 0.29, meioOlho: 0.035, tamanho: 0.74 },
  claude: { olhos: 0.75, boca: 0.56, face: 0.37, meioOlho: 0.11, tamanho: 1.15 },
  robo: { olhos: 1.16, boca: 0.99, face: 0.26, meioOlho: 0.065, tamanho: 0.8 },
  boneco_magro: { olhos: 1.36, boca: 1.15, face: 0.29, meioOlho: 0.035, tamanho: 0.7 },
  boneco_gordo: { olhos: 1.36, boca: 1.15, face: 0.3, meioOlho: 0.035, tamanho: 0.8 },
  boneco_crianca: { olhos: 0.975, boca: 0.816, face: 0.25, meioOlho: 0.056, tamanho: 0.66 },
  gato: { olhos: 1.05, boca: 0.845, face: 0.27, meioOlho: 0.078, tamanho: 0.85 },
  coruja: { olhos: 0.8, boca: 0.655, face: 0.29, meioOlho: 0.085, tamanho: 0.78 },
};
export const registrarRosto = (nome: string, r: RostoInfo) => { ROSTO[nome] = r; };
/** o tamanho do close de cada peça (o mesmo que está no ROSTO) */
export const TAMANHO = new Proxy({} as Record<string, number>, { get: (_, k: string) => ROSTO[k]?.tamanho });
/** a régua do quadro (px, num vídeo 1080 x 1920) */
export const REGUA_OLHOS: [number, number] = [700, 1000];
export const LEGENDA_MAX = 1560;

/**
 * O ator pronto para o dialogo(): a peça (o nome no ROSTO: "boneco", "claude" para o claude_rosto, "robo", ou um
 * registrado) ou o próprio RostoInfo (rostoDoBoneco(ficha), para a criança), onde está e a rotação y.
 */
export const ator = (peca: string | RostoInfo, pos: V3, rot: number, tamanho?: number): Ator => {
  const r = typeof peca === "string" ? ROSTO[peca] : peca;
  if (!r) throw new Error(`ator: "${String(peca)}" não está no ROSTO. Registre com registrarRosto("${String(peca)}", { olhos, boca, face, meioOlho, tamanho })`);
  const meio = (r.olhos + r.boca) / 2;
  return { rosto: [pos[0], pos[1] + meio, pos[2]], frente: [Math.sin(rot), Math.cos(rot)], tamanho: tamanho ?? r.tamanho, olho: r.olhos - meio, boca: meio - r.boca, face: r.face, meioOlho: r.meioOlho };
};

const unit = (x: number, z: number): [number, number] => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };

export type Medida = { f: number; tipo: Tipo; quem: string; olhos: { quem: string; y: number; x: number; topo: number }[]; boca: number | null; legenda: number; cartao: number | null };

/**
 * `cartao(f)`: há cartão no alto neste quadro; `cartaoBase(f)`: a base dele (px do topo). Use baseDoCartao(CARTOES),
 * que pega a base medida pelo conferir.mjs (ou a `base` do cartão, ou 900).
 */
export const dialogo = (atores: Record<string, Ator>, o: { max?: number; conjuntoACada?: number; cartao?: (f: number) => boolean; cartaoBase?: (f: number) => number; margem?: number; comeco?: Tipo; fim?: Tipo } = {}) => {
  const max = o.max ?? 3.2, cada = o.conjuntoACada ?? 3;
  const cartao = o.cartao ?? (() => false);
  const cartaoBase = o.cartaoBase ?? (() => 840);
  const margem = o.margem ?? 40;
  const nomes = Object.keys(atores);
  for (const n of nomes) if (atores[n].olho === undefined || atores[n].boca === undefined)
    throw new Error(`dialogo: o ator "${n}" não tem a altura dos olhos e da boca. Monte com ator("boneco" | "claude", posicao, rotacao): sem ela, a régua mede o olho no lugar errado e o cartão pode cobrir os olhos.`);
  const meio: V3 = [0, 0, 0];
  for (const n of nomes) for (let i = 0; i < 3; i++) meio[i] += atores[n].rosto[i] / nomes.length;
  const frenteMedia = unit(nomes.reduce((a, n) => a + atores[n].frente[0], 0), nomes.reduce((a, n) => a + atores[n].frente[1], 0));
  const outro = (quem: string) => nomes.find((n) => n !== quem) ?? quem;
  const tamDe = (a: Ator) => a.tamanho ?? 0.74;
  const olhoDe = (a: Ator): V3 => { const f = a.face ?? 0; return [a.rosto[0] + a.frente[0] * f, a.rosto[1] + (a.olho ?? 0.04), a.rosto[2] + a.frente[1] * f]; };
  const topoOlhoDe = (a: Ator): V3 => { const o = olhoDe(a); return [o[0], o[1] + (a.meioOlho ?? 0.04), o[2]]; };
  const bocaDe = (a: Ator): V3 => { const f = a.face ?? 0; return [a.rosto[0] + a.frente[0] * f, a.rosto[1] - (a.boca ?? 0.3 * tamDe(a)), a.rosto[2] + a.frente[1] * f]; };

  // ---- a lista de planos a partir dos turnos
  const lista: PlanoDialogo[] = [];
  let trocas = 0;
  TURNOS.forEach((t: Turno, i) => {
    const f0 = i === 0 ? 0 : Math.round(t.de * FPS) - 2;
    const f1 = i + 1 < TURNOS.length ? Math.round(TURNOS[i + 1].de * FPS) - 2 : TOTAL;
    const quem = atores[t.quem] ? t.quem : nomes[0];
    const troca = i > 0 && TURNOS[i - 1].quem !== t.quem;
    if (troca) trocas++;
    let primeiro: Tipo = i === 0 ? o.comeco ?? "close" : troca && trocas % cada === 0 ? "conjunto" : "close";
    if (i === TURNOS.length - 1 && o.fim) primeiro = o.fim;
    const dur = (f1 - f0) / FPS;
    if (dur > max && primeiro !== "conjunto") {
      const meioF = Math.round(f0 + (f1 - f0) * 0.55);
      lista.push({ f: f0, ate: meioF, tipo: primeiro, quem }, { f: meioF, ate: f1, tipo: (trocas + i) % 2 ? "medio" : "conjunto", quem });
    } else lista.push({ f: f0, ate: f1, tipo: primeiro, quem });
  });
  const planoEm = (f: number) => [...lista].reverse().find((x) => f >= x.f) ?? lista[0];

  // ---- projetar um ponto na tela de uma câmera
  const camAux = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.05, 100);
  const naTela = (s: { pos: V3; look: V3; fov?: number; roll?: number }, pt: V3) => {
    camAux.fov = s.fov ?? 38; camAux.updateProjectionMatrix();
    camAux.position.set(...s.pos); camAux.up.set(0, 1, 0); camAux.lookAt(...s.look); camAux.rotateZ(s.roll ?? 0); camAux.updateMatrixWorld();
    const v = new THREE.Vector3(...pt).project(camAux);
    return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, z: v.z };
  };
  const visivel = (p: { x: number; z: number }) => p.z < 1 && p.x > -100 && p.x < 1180;

  /**
   * A régua: corrige a altura do olhar da câmera (sobe ou desce o `look`) até os olhos caberem.
   *   - com cartão: o alto dos olhos de quem fala (no plano dos dois, de todos) `margem` px (40) abaixo da base;
   *   - os olhos de quem fala (no close e no médio) entre 700 e 1000 px; no plano dos dois, o mais alto abaixo de 700
   *     e o mais baixo acima de 1150;
   *   - a boca mais baixa acima de LEGENDA_MAX - 60 (a legenda vai embaixo dela).
   * Quando o cartão pede os olhos abaixo de 1000, o cartão vence (os olhos nunca atrás dele): o conferir.mjs reprova
   * esse cartão, que é alto demais para o close.
   */
  const regua = (s: Shot, f: number, p: PlanoDialogo): Shot => {
    let r = s;
    for (let it = 0; it < 4; it++) {
      const todos = nomes.map((n) => ({ n, p: naTela(r, olhoDe(atores[n])), t: naTela(r, topoOlhoDe(atores[n])), b: naTela(r, bocaDe(atores[n])) })).filter((x) => visivel(x.p));
      if (!todos.length) return r;
      const fala = p.tipo === "conjunto" ? todos : todos.filter((x) => x.n === p.quem);
      const usar = fala.length ? fala : todos;
      const alto = Math.min(...usar.map((x) => x.p.y)), baixo = Math.max(...usar.map((x) => x.p.y));
      const bocaBaixa = Math.max(...usar.map((x) => x.b.y));
      const [lo0, hi0] = p.tipo === "conjunto" ? [REGUA_OLHOS[0] - 200, 1150] : REGUA_OLHOS;
      // com cartão: o ALTO do olho fica `margem` px abaixo da base (o olho inteiro à mostra, com folga)
      const loCartao = cartao(f) ? cartaoBase(f) + margem : -1e9;
      // no close e no médio, quem conta é quem fala (o outro, quando aparece, é fundo desfocado na borda)
      const altoTodos = Math.min(...usar.map((x) => x.t.y));
      let dpx = 0; // > 0: o rosto precisa descer no quadro
      if (cartao(f) && altoTodos < loCartao) dpx = loCartao - altoTodos;
      else if (alto < lo0) dpx = lo0 - alto;
      else if (baixo > hi0) dpx = -(baixo - hi0);
      if (bocaBaixa + dpx > LEGENDA_MAX - 90) dpx = Math.min(dpx, LEGENDA_MAX - 90 - bocaBaixa);
      if (cartao(f) && altoTodos + dpx < loCartao) dpx = loCartao - altoTodos; // o cartão vence: olho nunca atrás dele
      if (Math.abs(dpx) < 1) return r;
      const ref = atores[usar[0].n].rosto;
      const dist = Math.hypot(r.pos[0] - ref[0], r.pos[1] - ref[1], r.pos[2] - ref[2]);
      const mpp = (2 * dist * Math.tan(((r.fov ?? 38) * Math.PI) / 360)) / 1920;
      r = { ...r, look: [r.look[0], r.look[1] + dpx * mpp, r.look[2]] };
    }
    return r;
  };

  // ---- cada plano vira uma câmera
  // o empurrão tem limite: numa fala longa, o close chega no máximo 14% mais perto (o médio 10%, o dos dois 7%)
  const LIMITE = { close: 0.86, medio: 0.9, conjunto: 0.93 } as const;
  const enquadrar0 = (p: PlanoDialogo) => (f: number): Shot => {
    const a = atores[p.quem], b = atores[outro(p.quem)];
    // com cartão no alto, quem desce o rosto é a régua, pela base medida do cartão (e só o necessário)
    const tam = tamDe(a);
    const k = Math.max(LIMITE[p.tipo], empurra(f, p.f, p.tipo === "close" ? 0.0022 : 0.001));
    if (p.tipo === "close") {
      // de frente, um pouco para o lado de quem escuta (o olhar fica perto da lente)
      const [fx, fz] = a.frente;
      const lado = unit(b.rosto[0] - a.rosto[0], b.rosto[2] - a.rosto[2]);
      const d = tam * 4.1; // o rosto enche a tela, como na referência
      const pos: V3 = [a.rosto[0] + fx * d + lado[0] * d * 0.22, a.rosto[1] + 0.06, a.rosto[2] + fz * d + lado[1] * d * 0.22];
      const look: V3 = [a.rosto[0], a.rosto[1] - 0.08 * tam / 0.6, a.rosto[2]];
      return dolly(pos, look, k, { fov: 30, roll: (p.f % 2 ? 1 : -1) * 0.02 });
    }
    if (p.tipo === "medio") {
      const [fx, fz] = a.frente;
      const lado = unit(b.rosto[0] - a.rosto[0], b.rosto[2] - a.rosto[2]);
      const d = tam * 7.2;
      const pos: V3 = [a.rosto[0] + fx * d - lado[0] * d * 0.15, a.rosto[1] - 0.05, a.rosto[2] + fz * d - lado[1] * d * 0.15];
      const look: V3 = [lerp(a.rosto[0], b.rosto[0], 0.15), a.rosto[1] - 0.25 * tam / 0.6, lerp(a.rosto[2], b.rosto[2], 0.15)];
      return dolly(pos, look, k, { fov: 34, roll: -0.025 });
    }
    // conjunto: os dois lado a lado, de frente, a câmera um pouco abaixo dos olhos
    // o plano dos dois abre pela lente (fov 42), e não afastando: afastar demais leva a câmera para trás da mureta
    const d = 5.8;
    const pos: V3 = [meio[0] + frenteMedia[0] * d, meio[1] - 0.1, meio[2] + frenteMedia[1] * d];
    const look: V3 = [meio[0], meio[1] - 0.35, meio[2]];
    return dolly(pos, look, k, { fov: 42, roll: 0.015 });
  };
  const enquadrar = (p: PlanoDialogo) => (f: number) => regua(enquadrar0(p)(f), f, p);
  const planos: Plano[] = lista.map((p, i) => ({ f: p.f, corte: i > 0, s: enquadrar(p) }));
  const cortes = lista.slice(1).map((p) => p.f);
  const focos: Foco[] = lista.map((p) => ({
    f: p.f, cInf: p.tipo === "close" ? 20 : p.tipo === "medio" ? 13 : 8,
    alvo: () => (p.tipo === "conjunto" ? meio : atores[p.quem].rosto),
  }));

  /** a câmera do quadro, sem o balanço de mão */
  const camDo = (f: number) => { const c = camera(planos, [], f, { mao: 0 }); return { pos: c.pos, look: c.look, fov: c.fov, roll: c.roll }; };
  /** a altura da legenda (px): logo abaixo da boca de quem fala, projetada pela câmera do quadro (entre 960 e 1560) */
  const legendaY = (f: number) => {
    const p = planoEm(f);
    const b = naTela(camDo(f), bocaDe(atores[p.quem]));
    return Math.round(Math.min(LEGENDA_MAX, Math.max(960, b.y + 75))); // o meio da legenda 75 px abaixo da boca: o texto não encosta nela
  };
  /** o que a régua mede no quadro f (o conferir.mjs reprova o que sair dela) */
  const medir = (f: number): Medida => {
    const p = planoEm(f), c = camDo(f);
    const olhos = nomes.map((n) => ({ quem: n, ...naTela(c, olhoDe(atores[n])), topo: naTela(c, topoOlhoDe(atores[n])).y })).filter(visivel).map((x) => ({ quem: x.quem, y: Math.round(x.y), x: Math.round(x.x), topo: Math.round(x.topo) }));
    const bp = naTela(c, bocaDe(atores[p.quem]));
    return { f, tipo: p.tipo, quem: p.quem, olhos, boca: visivel(bp) ? Math.round(bp.y) : null, legenda: legendaY(f), cartao: cartao(f) ? cartaoBase(f) : null };
  };
  /** a luz de cada plano: de lado no close (sombra no outro lado do rosto), de frente nos outros */
  const luzEm = (f: number): "lado" | "frente" => (planoEm(f).tipo === "close" ? "lado" : "frente");
  return { planos, focos, cortes, lista, legendaY, planoEm, luzEm, medir };
};
