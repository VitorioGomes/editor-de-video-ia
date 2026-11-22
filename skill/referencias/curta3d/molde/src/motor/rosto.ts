// Personagens com rosto que fala e reage (o Estilo Conversa).
//   boneco(kit, ficha)          a pessoa de blocos montada pela ficha (pele, cabelo, óculos, barba, boné, roupa)
//   animarBoneco(b, f, g)       boca pelas sílabas, sobrancelha pela emoção, piscar, olhar, cabeça e ombros
//   animarClaudeFala(c, f, g)   o Claude (peça claude_rosto): boca, olhos normais ou "^ ^", bochecha corada
//   animarRosto(p, nome, f, g)  QUALQUER personagem que segue o contrato do rosto (o robô de exemplo, um gato, uma
//                               xícara): boca pelas sílabas, piscar, emoção nos olhos e na sobrancelha, cabeça e braços
//   rostoDoBoneco(ficha)        a altura dos olhos e da boca do boneco daquela ficha (a criança é menor), para o ator()
// A emoção muda por chaves [quadro, emoção] e passa de uma para a outra em 6 quadros.
import * as THREE from "three";
import { Kit, peca, no, materiais, escrever } from "./kit";
import { boca } from "./fala";
import { piscar, mola, smooth, clamp01, lerp } from "./tempo";
import { animarClaude, Gesto } from "./bonecos";
import { RostoInfo, ROSTO } from "./dialogo";

/** A ficha de uma pessoa: o que muda de um boneco para outro. */
export type Ficha = {
  pele?: string; cabelo?: "padrao" | "curto" | "topete" | "longo" | "coque" | "cacheado" | "careca"; corCabelo?: string;
  /** cílios (três tracinhos em cima de cada olho) */
  cilios?: boolean;
  /** "crianca": a peça boneco_crianca (proporção de criança: cabeça grande, rosto redondo, olhos grandes, membros
   *  curtos). Use rostoDoBoneco(ficha) no ator() */
  idade?: "adulto" | "crianca";
  /** o corpo: "magro", "medio" (o padrão) ou "gordo" */
  corpo?: "magro" | "medio" | "gordo";
  /** a altura, em relação à pessoa média (1 = 1,8 m no adulto): 0,85 a 1,15 */
  altura?: number;
  /** a roupa de cima: "moletom" (o padrão), "camiseta", "camisa" (social, de botão), "blazer" (terno), "jaqueta" ou "vestido" */
  cima?: "moletom" | "camiseta" | "camisa" | "blazer" | "jaqueta" | "vestido";
  /** a de baixo: "calca" (o padrão), "shorts" ou "saia" (com o vestido, não conta) */
  baixo?: "calca" | "shorts" | "saia";
  /** o calçado: "tenis" (o padrão), "social", "bota" ou "sandalia" */
  calcado?: "tenis" | "social" | "bota" | "sandalia";
  oculos?: boolean; corOculos?: string; barba?: boolean; bigode?: boolean; bone?: boolean; corBone?: string;
  /** fone de ouvido grande no pescoço (o acessório que muda a silhueta) e a cor dele */
  fone?: boolean; corFone?: string;
  /** o que vai bordado no peito da roupa ("IA") e a cor do bordado */
  peito?: string; corPeito?: string;
  roupa?: string; detalheRoupa?: string; calca?: string; sapato?: string;
};

/** O boneco do Vitório, o personagem fixo do perfil: óculos de armação preta grossa, pele clara,
 *  o cabelo "padrão" (curto, escuro, franja de lado), o fone grande verde-limão no pescoço (a silhueta dele) e o moletom grafite com "IA" bordado em verde-limão. */
export const FICHA_VITORIO: Ficha = { pele: "#efc4a4", cabelo: "padrao", corCabelo: "#2e211a", oculos: true, corOculos: "#141416", roupa: "#3a3d45", detalheRoupa: "#2e3137", calca: "#2a3346", sapato: "#e8e3da",
  fone: true, corFone: "#c8f560", peito: "IA", corPeito: "#c8f560" };

export const boneco = (kit: Kit, ficha: Ficha = {}) => {
  const f = { pele: "#e8b48f", cabelo: "curto", corCabelo: "#3b2a20", roupa: "#4f7fd1", calca: "#2f3a52", sapato: "#2a2522", ...ficha };
  const b = peca(kit, pecaDoBoneco(ficha), { cores: { pele: f.pele!, cabelo: f.corCabelo!, roupa: f.roupa!, calca: f.calca!, sapato: f.sapato!, oculos: f.corOculos ?? "#2a2a2e", bone: f.corBone ?? "#4a7a3a", roupa2: f.detalheRoupa ?? "#d8d4cc", fone: f.corFone ?? "#c8f560" } });
  // a placa onde o bordado fica não aparece (sem ela, não há retângulo nem disputa de profundidade com o moletom)
  const peitoFace = no(b, "boneco_peito_face") as THREE.Mesh;
  peitoFace.material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  peitoFace.castShadow = false;
  if (f.peito) escrever(b, "boneco_peito_face", (g, W, H) => {
    g.font = `900 ${H * 0.9}px "Inter"`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = H * 0.06; g.strokeStyle = "rgba(0,0,0,0.35)"; g.strokeText(f.peito!, W / 2, H * 0.55); // o relevo do bordado
    g.fillStyle = f.corPeito ?? "#c8f560"; g.fillText(f.peito!, W / 2, H * 0.52);
  });
  const ver = (n: string, v: boolean) => { no(b, n).visible = v; };
  ver("boneco_cabelo_padrao", f.cabelo === "padrao" && !f.bone);
  ver("boneco_cabelo_curto", (f.cabelo === "curto" || f.cabelo === "topete") && !f.bone);
  ver("boneco_cabelo_topete", f.cabelo === "topete" && !f.bone);
  ver("boneco_cabelo_longo", f.cabelo === "longo");
  ver("boneco_cabelo_coque", f.cabelo === "coque" && !f.bone);
  ver("boneco_cabelo_cacheado", f.cabelo === "cacheado" && !f.bone);
  ver("boneco_ciliosE", !!f.cilios); ver("boneco_ciliosD", !!f.cilios);
  ver("boneco_bone", !!f.bone);
  ver("boneco_oculos", !!f.oculos);
  ver("boneco_barba", !!f.barba);
  ver("boneco_bigode", !!f.bigode);
  ver("boneco_fone", !!f.fone);
  // a roupa: em cima, embaixo, o calçado e as mangas
  const cima = f.cima ?? "moletom", baixo = cima === "vestido" ? "nada" : f.baixo ?? "calca", calcado = f.calcado ?? "tenis";
  for (const c of ["moletom", "camiseta", "camisa", "blazer", "jaqueta", "vestido"]) ver(`boneco_cima_${c}`, c === cima);
  const curta = cima === "camiseta" || cima === "vestido";
  for (const l of ["E", "D"]) {
    ver(`boneco_mangaLonga${l}`, !curta); ver(`boneco_mangaCurta${l}`, curta);
    ver(`boneco_calca${l}`, baixo === "calca"); ver(`boneco_shorts${l}`, baixo === "shorts"); ver(`boneco_pernaNua${l}`, baixo !== "calca");
    for (const c of ["tenis", "social", "bota", "sandalia"]) ver(`boneco_${c}${l}`, c === calcado);
  }
  ver("boneco_saia", baixo === "saia");
  ver("boneco_peito_face", !!f.peito && (cima === "moletom" || cima === "camiseta" || cima === "jaqueta"));
  // o corpo (magro, médio, gordo) é a peça (boneco_magro, boneco, boneco_gordo); a altura escala tudo
  const alt = f.altura ?? 1;
  if (alt !== 1) { b.scale.multiplyScalar(alt); b.userData.escala = (b.userData.escala ?? 1) * alt; }
  return b;
};

/** a peça de cada ficha: a criança, ou o adulto magro, médio ou gordo */
export const pecaDoBoneco = (f: Ficha) => (f.idade === "crianca" ? "boneco_crianca" : f.corpo === "magro" ? "boneco_magro" : f.corpo === "gordo" ? "boneco_gordo" : "boneco");
/**
 * A altura dos olhos e da boca do boneco desta ficha, para o ator(): a criança (boneco_crianca), a altura (escala
 * tudo) e o cabelo volumoso (o close abre um pouco mais, para o cacheado caber inteiro).
 */
export const rostoDoBoneco = (ficha: Ficha = {}): RostoInfo => {
  const r = ROSTO[pecaDoBoneco(ficha)], a = ficha.altura ?? 1;
  const cab = ficha.cabelo === "cacheado" ? 1.18 : ficha.cabelo === "coque" ? 1.08 : 1;
  return { olhos: r.olhos * a, boca: r.boca * a, face: r.face * a, meioOlho: r.meioOlho * a, tamanho: r.tamanho * a * cab };
};

export type Emocao = "neutro" | "bravo" | "surpreso" | "duvida" | "sem_graca" | "feliz" | "pensando";
/** [sobrancelha esquerda: sobe (m), gira (rad)], [direita], olhos (escala da altura) */
const EMO: Record<Emocao, { e: [number, number]; d: [number, number]; olho: number }> = {
  neutro: { e: [0, 0], d: [0, 0], olho: 1 },
  bravo: { e: [-0.025, -0.32], d: [-0.025, 0.32], olho: 0.8 },
  surpreso: { e: [0.05, 0.08], d: [0.05, -0.08], olho: 1.25 },
  duvida: { e: [0.045, 0.12], d: [-0.01, 0.05], olho: 1 },
  sem_graca: { e: [0.03, 0.28], d: [0.03, -0.28], olho: 0.9 },
  feliz: { e: [0.025, 0.1], d: [0.025, -0.1], olho: 0.85 },
  pensando: { e: [0.02, -0.1], d: [0.04, 0.15], olho: 0.9 },
};
const emocaoEm = (f: number, chaves: [number, Emocao][]) => {
  let a: Emocao = "neutro", b: Emocao = "neutro", k = 1;
  for (const [q, e] of [...chaves].sort((x, y) => x[0] - y[0])) if (f >= q) { a = b; b = e; k = smooth((f - q) / 6); }
  const A = EMO[a], B = EMO[b];
  const mix = (x: [number, number], y: [number, number]): [number, number] => [lerp(x[0], y[0], k), lerp(x[1], y[1], k)];
  return { e: mix(A.e, B.e), d: mix(A.d, B.d), olho: lerp(A.olho, B.olho, k) };
};

export type GestoFala = {
  /** o nome na voz ([vitorio] no texto): a boca segue as sílabas dele */
  quem: string;
  emocoes?: [number, Emocao][];
  /** olhar: [x, y] de -1 a 1 (para a câmera é [0, 0]); a cabeça acompanha um pouco */
  olhar?: (f: number) => [number, number];
  /** quadros em que o olhar vira (pisca junto) */
  viradas?: number[];
  /** dar de ombros: quadros em que os braços sobem e descem */
  ombros?: number[];
  /** apontar com a mão direita (para a frente e um pouco para cima) em [início, fim] */
  aponta?: [number, number];
  /** as duas mãos abertas para a frente ("e agora?", "apago tudo?") em [início, fim] */
  maos?: [number, number];
  /** acenar com a mão direita (o braço sobe por cima da cabeça e balança) em [início, fim] */
  aceno?: [number, number];
  semente?: number;
};


/**
 * O apontar que se lê de frente (vale para o boneco e para todo personagem com braço, pata ou asa): o braço direito
 * (o nó ..._bracoD, que no quadro fica do lado direito) sai na DIAGONAL, para a frente e para o lado do que ele
 * aponta; o dedo (..._dedoD: um dedo, uma ponta fina, o dedinho da pata, a pena da ponta da asa) aparece; a cabeça e
 * o corpo viram um pouco para lá, e os olhos vão junto. De frente, o braço não some na direção da lente.
 */
const BRACO_APONTA = { x: -1.05, z: 0.95, cabeca: 0.38, corpo: 0.1, inclina: 0.05, olhar: 0.75 };
const base = new WeakMap<THREE.Object3D, Record<string, [number, number, number]>>();
const pos0 = (o: THREE.Object3D, n: string) => {
  let m = base.get(o); if (!m) { m = {}; base.set(o, m); }
  if (!m[n]) { const x = no(o, n); m[n] = [x.position.x, x.position.y, x.position.z]; }
  return m[n];
};

/** A pessoa conversando: boca pelas sílabas, sobrancelha pela emoção, piscar, pupila, aceno de cabeça ao falar. */
export const animarBoneco = (b: THREE.Object3D, f: number, g: GestoFala) => {
  const em = emocaoEm(f, g.emocoes ?? []);
  const bc = boca(g.quem, f);
  const fala = no(b, "boneco_boca");
  fala.scale.set(bc.redonda ? 0.72 : 1 + bc.abre * 0.1, 0.14 + bc.abre * 1.25, 1);
  // sobrancelhas: a emoção mais um pulinho nas sílabas fortes
  const pulo = bc.abre > 0.85 ? 0.008 : 0;
  for (const [lado, v] of [["E", em.e], ["D", em.d]] as const) {
    const s = no(b, `boneco_sobrancelha${lado}`), p = pos0(b, `boneco_sobrancelha${lado}`);
    s.position.set(p[0], p[1] + v[0] + pulo, p[2]);
    s.rotation.set(0, 0, v[1]); // no Blender, giro em y (a frente é -Y); no three.js, em z
  }
  const pisca = piscar(f, g.semente ?? 3, g.viradas ?? []);
  const janela0 = (j?: [number, number]) => (j ? Math.min(smooth((f - j[0]) / 7), 1 - smooth((f - (j[1] - 7)) / 7)) : 0);
  const apo = janela0(g.aponta);
  const olhar0 = g.olhar ? g.olhar(f) : [0, 0];
  const olhar = [lerp(olhar0[0], BRACO_APONTA.olhar, apo), lerp(olhar0[1], 0.05, apo)];
  for (const lado of ["E", "D"]) {
    const o = no(b, `boneco_olho${lado}`);
    o.scale.set(1, pisca * em.olho, 1);
    const pu = no(b, `boneco_pupila${lado}`), p = pos0(b, `boneco_pupila${lado}`);
    pu.position.set(p[0] + olhar[0] * 0.03, p[1] + olhar[1] * 0.022, p[2]);
  }
  // cabeça: segue o olhar um pouco, acena ao falar e respira
  const cab = no(b, "boneco_cabeca");
  const fal = bc.abre;
  cab.rotation.set(-olhar[1] * 0.12 + Math.sin(f * 0.11 + (g.semente ?? 0)) * 0.015 + fal * 0.035, olhar0[0] * 0.25 + BRACO_APONTA.cabeca * apo, Math.sin(f * 0.07) * 0.02 - BRACO_APONTA.inclina * apo);
  // braços: soltos, um balanço leve; dar de ombros sobe os dois
  const bE = no(b, "boneco_bracoE"), bD = no(b, "boneco_bracoD");
  const om = (g.ombros ?? []).reduce((a, q) => a + Math.max(0, Math.sin(clamp01((f - q) / 14) * Math.PI)), 0);
  const bal = Math.sin(f * 0.1) * 0.04;
  bE.rotation.set(0, 0, -0.06 - bal - om * 0.5); bD.rotation.set(0, 0, 0.06 + bal + om * 0.5);
  const janela = (j?: [number, number]) => (j ? Math.min(smooth((f - j[0]) / 7), 1 - smooth((f - (j[1] - 7)) / 7)) : 0);
  const ap = janela(g.aponta), ma = janela(g.maos);
  if (ap > 0) { bD.rotation.x = BRACO_APONTA.x * ap; bD.rotation.z += BRACO_APONTA.z * ap; }
  const dedo = b.getObjectByName("boneco_dedoD"); if (dedo) dedo.visible = ap > 0.3;
  if (ma > 0) { bE.rotation.x = bD.rotation.x = Math.min(bD.rotation.x, -0.9 * ma); bE.rotation.z -= 0.45 * ma; bD.rotation.z += 0.45 * ma; }
  bE.position.y = bD.position.y = pos0(b, "boneco_bracoE")[1] + om * 0.06;
  const resp = Math.sin(f * 0.13 + (g.semente ?? 0)) * 0.006;
  const tr = no(b, "boneco_tronco"), tb = (tr.userData.base as number[] | undefined) ?? [1, 1, 1];
  tr.scale.set(tb[0], tb[1] * (1 + resp), tb[2]);
  tr.rotation.set(0, BRACO_APONTA.corpo * ap, -BRACO_APONTA.inclina * 0.6 * ap); // o corpo vira e inclina para o lado do que aponta
  cab.position.y = pos0(b, "boneco_cabeca")[1] + resp * 0.5 + om * 0.04;
};

/**
 * QUALQUER personagem com rosto, pelo CONTRATO DO ROSTO (os nós da peça, com o nome dela na frente):
 *   NOME_boca              escala na altura = abertura da sílaba (obrigatório)
 *   NOME_olhoE, NOME_olhoD escala na altura = piscar e emoção (obrigatório)
 *   NOME_sobrancelhaE/D    sobe e gira com a emoção (opcional)
 *   NOME_pupilaE/D         segue o olhar (opcional)
 *   NOME_cabeca            acena ao falar e segue o olhar (opcional)
 *   NOME_bracoE/D          balança e dá de ombros (opcional)
 * As alturas (olhos, boca, frente da cara, tamanho do close) entram com registrarRosto(NOME, {...}) em dialogo.ts.
 */
export const animarRosto = (p: THREE.Object3D, nome: string, f: number, g: GestoFala) => {
  const ach = (n: string) => p.getObjectByName(`${nome}_${n}`);
  const em = emocaoEm(f, g.emocoes ?? []);
  const bc = boca(g.quem, f);
  const fala = ach("boca");
  if (!fala || !ach("olhoE") || !ach("olhoD")) throw new Error(`animarRosto: a peça "${nome}" precisa de ${nome}_boca, ${nome}_olhoE e ${nome}_olhoD (o contrato do rosto, no guia)`);
  fala.scale.set(bc.redonda ? 0.72 : 1 + bc.abre * 0.1, 0.2 + bc.abre * 1.3, 1);
  const pulo = bc.abre > 0.85 ? 0.008 : 0;
  for (const [lado, v] of [["E", em.e], ["D", em.d]] as const) {
    const s = ach(`sobrancelha${lado}`);
    if (!s) continue;
    const q = pos0(p, `${nome}_sobrancelha${lado}`);
    s.position.set(q[0], q[1] + v[0] + pulo, q[2]); s.rotation.set(0, 0, v[1]);
  }
  const pisca = piscar(f, g.semente ?? 3, g.viradas ?? []);
  const janela0 = (j?: [number, number]) => (j ? Math.min(smooth((f - j[0]) / 7), 1 - smooth((f - (j[1] - 7)) / 7)) : 0);
  const apo = janela0(g.aponta);
  const olhar0 = g.olhar ? g.olhar(f) : [0, 0];
  const olhar = [lerp(olhar0[0], BRACO_APONTA.olhar, apo), lerp(olhar0[1], 0.05, apo)];
  for (const lado of ["E", "D"]) {
    ach(`olho${lado}`)!.scale.set(1, pisca * em.olho, 1);
    const pu = ach(`pupila${lado}`);
    if (pu) { const q = pos0(p, `${nome}_pupila${lado}`); pu.position.set(q[0] + olhar[0] * 0.03, q[1] + olhar[1] * 0.022, q[2]); }
  }
  const cab = ach("cabeca");
  if (cab) cab.rotation.set(-olhar[1] * 0.12 + Math.sin(f * 0.11 + (g.semente ?? 0)) * 0.015 + bc.abre * 0.035, olhar0[0] * 0.25 + BRACO_APONTA.cabeca * apo, Math.sin(f * 0.07) * 0.02 - BRACO_APONTA.inclina * apo);
  const corpo = ach("tronco") ?? ach("corpo");
  if (corpo) corpo.rotation.set(0, BRACO_APONTA.corpo * apo, -BRACO_APONTA.inclina * 0.6 * apo);
  // os braços (ou as patas, ou as asas): os mesmos gestos do boneco e do Claude
  const bE = ach("bracoE"), bD = ach("bracoD");
  if (bE && bD) {
    const om = (g.ombros ?? []).reduce((a, q) => a + Math.max(0, Math.sin(clamp01((f - q) / 14) * Math.PI)), 0);
    const bal = Math.sin(f * 0.1) * 0.04 + bc.abre * 0.03; // gesticula um pouco ao falar
    bE.rotation.set(0, 0, -0.06 - bal - om * 0.5); bD.rotation.set(0, 0, 0.06 + bal + om * 0.5);
    const janela = (j?: [number, number]) => (j ? Math.min(smooth((f - j[0]) / 7), 1 - smooth((f - (j[1] - 7)) / 7)) : 0);
    const ap = janela(g.aponta), ma = janela(g.maos), ac = janela(g.aceno);
    if (ap > 0) { bD.rotation.x = BRACO_APONTA.x * ap; bD.rotation.z += BRACO_APONTA.z * ap; }
    const dedo = ach("dedoD"); if (dedo) dedo.visible = ap > 0.3;
    if (ma > 0) { bE.rotation.x = bD.rotation.x = Math.min(bD.rotation.x, -0.9 * ma); bE.rotation.z -= 0.45 * ma; bD.rotation.z += 0.45 * ma; }
    if (ac > 0) { bD.rotation.z += ac * (2.5 + Math.sin(f * 0.7) * 0.35); bD.rotation.x -= ac * 0.25; }
  }
};

/** O Claude conversando (peça claude_rosto): boca pelas sílabas, olhos normais ou felizes ("^ ^"), bochecha corada. */
export const animarClaudeFala = (c: THREE.Object3D, f: number, g: { quem?: string; olhos?: [number, "normal" | "feliz"][]; bochecha?: [number, number][]; gesto?: Gesto }) => {
  animarClaude(c, f, g.gesto ?? {});
  const bc = boca(g.quem ?? "claude", f);
  no(c, "claude_boca").scale.set(bc.redonda ? 0.7 : 1, 0.25 + bc.abre * 1.5, 1);
  let feliz = false;
  for (const [q, o] of g.olhos ?? []) if (f >= q) feliz = o === "feliz";
  no(c, "claude_feliz").visible = feliz;
  for (const n of ["claude_olhoE", "claude_olhoD"]) no(c, n).visible = !feliz;
  let cora = 0;
  for (const [a, b] of g.bochecha ?? []) cora = Math.max(cora, Math.min(smooth((f - a) / 8), 1 - smooth((f - (b - 8)) / 8)));
  const boch = no(c, "claude_bochechas");
  boch.visible = cora > 0.02;
  boch.scale.set(cora, cora, 1);
  void mola; void materiais;
};
