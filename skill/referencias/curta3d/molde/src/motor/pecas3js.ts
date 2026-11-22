// Peças feitas no próprio three.js, sem o Blender: o que é simples ou muda com o vídeo (chão, trilho, caixa,
// placa com texto, janela de programa, faíscas, confete, poeira e as nuvens ao longe).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { NOINK } from "./fx/ink";
import { Kit, peca, muitas, Desenho, texto } from "./kit";
import { clamp01, smooth, rng, V3 } from "./tempo";

const std = (color: string, rough = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

// ---------------- chão ----------------
/**
 * Chão de grama da maquete, com pouco peso: verde menos saturado e um pouco mais escuro, manchas grandes de valor
 * (mais escuro longe da ação, para o olho ficar no assunto), tufos em grupos (e não espalhados por igual) e terra
 * batida onde a ação acontece (`terra`). `livres`: os pontos da ação (o chão fica plano em volta, num raio `plano`).
 */
export const chao = (o: { tamanho?: number; cores?: [string, string, string]; terra?: string; livres?: V3[]; plano?: number; tufos?: number; semente?: number; raioTerra?: number } = {}) => {
  const T = o.tamanho ?? 260, n = Math.round(T * 0.9);
  const g = new THREE.PlaneGeometry(T, T, n, n);
  g.rotateX(-Math.PI / 2);
  const [ca, cb, cc] = (o.cores ?? ["#6a9150", "#7f9f5a", "#527c45"]).map((c) => new THREE.Color(c));
  const terra = new THREE.Color(o.terra ?? "#bfa47c");
  const livres = o.livres ?? [[0, 0, 0]];
  const raio = o.plano ?? 12, rTerra = o.raioTerra ?? 2.6;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col: number[] = [];
  const c = new THREE.Color();
  const dist = (x: number, z: number) => Math.min(...livres.map((p) => Math.hypot(x - p[0], z - p[2])));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = dist(x, z);
    const h = (2.2 * Math.sin(x * 0.031 + 1.3) * Math.cos(z * 0.027 - 0.4) + 1.2 * Math.sin(x * 0.083 + z * 0.061) + 1.1) * smooth((d - raio) / 30) + Math.max(0, d - 70) * 0.12;
    pos.setY(i, h);
    const v = 0.5 + 0.5 * Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * Math.cos(z * 0.09 - x * 0.02);
    c.copy(ca).lerp(cb, v * 0.7).lerp(cc, clamp01((Math.sin(x * 0.045 + z * 0.05) - 0.3) * 0.9));
    const fino = 0.5 + 0.5 * Math.sin(x * 1.7 + Math.sin(z * 1.3) * 1.5) * Math.sin(z * 1.9 - x * 0.4); // manchinhas
    const grande = 0.5 + 0.5 * Math.sin(x * 0.06 + 2.1) * Math.sin(z * 0.05 + 0.7);             // manchas grandes de valor
    c.multiplyScalar((0.93 + 0.08 * fino) * (0.9 + 0.12 * grande) * (1 - 0.16 * smooth((d - 8) / 40)));
    if (o.terra !== undefined || o.raioTerra) {
      const borda = 0.5 + 0.5 * Math.sin(x * 2.3 + z * 1.7) * Math.sin(z * 2.9 - x);              // borda irregular
      c.lerp(terra, (1 - smooth((d - rTerra + 0.6 * borda) / 1.4)) * 0.55);
    }
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.receiveShadow = true;
  const grupo = new THREE.Group();
  grupo.add(m);
  // tufos em grupos: centros espalhados e 6 a 18 tufos em volta de cada um, fora das áreas de terra
  const N = o.tufos ?? 600;
  if (N > 0) {
    const R = rng(o.semente ?? 3);
    const geo = new THREE.ConeGeometry(0.07, 0.16, 5); geo.translate(0, 0.07, 0);
    const im = new THREE.InstancedMesh(geo, std("#6f9a50", 0.95), N);
    const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let k = 0;
    while (k < N) {
      const a = R() * Math.PI * 2, r = 3 + Math.pow(R(), 1.3) * 45;
      const lv = livres[Math.floor(R() * livres.length)];
      const cx = lv[0] + Math.cos(a) * r, cz = lv[2] + Math.sin(a) * r;
      const quantos = 6 + Math.floor(R() * 12);
      for (let j = 0; j < quantos && k < N; j++, k++) {
        const x = cx + (R() - 0.5) * 1.6, z = cz + (R() - 0.5) * 1.6;
        if (dist(x, z) < rTerra + 0.6) { im.setMatrixAt(k, mt.makeScale(0, 0, 0)); continue; }
        p.set(x, 0, z); q.setFromEuler(new THREE.Euler((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4)); sc.set(1 + R() * 0.8, 0.45 + R() * 0.6, 1 + R() * 0.8);
        im.setMatrixAt(k, mt.compose(p, q, sc));
      }
    }
    im.receiveShadow = true;
    grupo.add(im);
  }
  return grupo;
};

/** árvores, arbustos e pedras espalhados num anel em volta do centro (sem cobrir a câmera: deixe `livre` m de raio) */
export const natureza = (kit: Kit, o: { centro?: V3; livre?: number; raio?: number; quantas?: number; semente?: number; tipos?: string[]; evitar?: V3[] } = {}) => {
  const R = rng(o.semente ?? 7), cen = o.centro ?? [0, 0, 0];
  const tipos = (o.tipos ?? ["arvore_cone", "arvore_redonda", "arvore_cone_baixa", "arvore_redonda_b", "arbusto", "arbusto_b", "pedra", "pedra_b"]).filter((t) => kit[t]);
  const por: Record<string, THREE.Matrix4[]> = {};
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < (o.quantas ?? 60); i++) {
    const a = R() * Math.PI * 2, r = (o.livre ?? 10) + Math.pow(R(), 0.8) * ((o.raio ?? 60) - (o.livre ?? 10));
    const x = cen[0] + Math.cos(a) * r, z = cen[2] + Math.sin(a) * r;
    if ((o.evitar ?? []).some((e) => Math.hypot(x - e[0], z - e[2]) < 4)) continue;
    const t = tipos[Math.floor(R() * tipos.length)];
    p.set(x, 0, z); q.setFromEuler(new THREE.Euler(0, R() * 6, 0)); s.setScalar(0.8 + R() * 0.5);
    (por[t] ??= []).push(new THREE.Matrix4().compose(p, q, s));
  }
  const g = new THREE.Group();
  for (const [t, ms] of Object.entries(por)) g.add(muitas(kit, t, ms));
  return g;
};

/** nuvens do kit ao longe, sem neblina e sem contorno, levemente acesas */
export const nuvens = (kit: Kit, o: { quantas?: number; semente?: number; centro?: V3 } = {}) => {
  const g = new THREE.Group();
  const R = rng(o.semente ?? 91), cen = o.centro ?? [0, 0, 0];
  for (let i = 0; i < (o.quantas ?? 12); i++) {
    const cl = peca(kit, i % 2 ? "nuvem" : "nuvem_b");
    const ang = (i / (o.quantas ?? 12)) * Math.PI * 2 + (R() - 0.5) * 0.3;
    const d = 330 + R() * 160;
    cl.position.set(cen[0] + Math.cos(ang) * d, 70 + R() * 55, cen[2] + Math.sin(ang) * d);
    cl.scale.setScalar(4.5 + R() * 4);
    cl.rotation.y = R() * 6;
    cl.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { const mm = m.material as THREE.MeshStandardMaterial; mm.fog = false; mm.emissive = new THREE.Color("#ffe9d6"); mm.emissiveIntensity = 0.45; m.castShadow = false; m.receiveShadow = false; m.layers.set(NOINK); } });
    g.add(cl);
  }
  return g;
};

// ---------------- caixas e placas ----------------
/** caixa de cantos arredondados, pivô no chão */
export const caixa = (l: number, a: number, p: number, cor: string, o: { raio?: number; rough?: number; brilho?: number } = {}) => {
  const geo = new RoundedBoxGeometry(l, a, p, 4, o.raio ?? Math.min(l, a, p) * 0.12);
  geo.translate(0, a / 2, 0);
  const m = new THREE.Mesh(geo, std(cor, o.rough ?? 0.55, o.brilho ? { emissive: new THREE.Color(cor), emissiveIntensity: o.brilho } : {}));
  m.castShadow = true; m.receiveShadow = true;
  return m;
};

/**
 * Placa (cartaz em pé, sem poste) com texto trocável: uma placa grossa arredondada e o texto na frente (+Z),
 * pintado nela (recebe a luz e a sombra) e sem contorno. Pivô no meio da base. `redesenhar(chave, desenho)` troca o texto.
 */
export const placaTexto = (t: string, o: { largura?: number; altura?: number; cor?: string; corTexto?: string; fonte?: string; espessura?: number; destaque?: { palavra: string; cor: string } } = {}) => {
  const L = o.largura ?? 2.4, A = o.altura ?? 1.0, E = o.espessura ?? 0.16;
  const grupo = new THREE.Group();
  const corpo = caixa(L, A, E, o.cor ?? "#f6efe2", { raio: Math.min(0.12, A * 0.18) });
  grupo.add(corpo);
  const W = 2048, H = Math.round((2048 * A) / L);
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // só as letras no desenho, num material que recebe a luz e a sombra da cena, como tinta na tábua
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.94, A * 0.9), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.8 }));
  plano.receiveShadow = true;
  plano.position.set(0, A / 2, E / 2 + 0.003);
  plano.layers.set(NOINK); plano.renderOrder = 3;
  grupo.add(plano);
  let chave = "";
  const redesenhar = (k: string, d: Desenho) => {
    if (k === chave) return;
    chave = k;
    const g = canvas.getContext("2d")!; g.clearRect(0, 0, W, H); d(g, W, H); tex.needsUpdate = true;
  };
  redesenhar(t, texto(t, { cor: o.corTexto ?? "#2a1d14", fonte: o.fonte, destaque: o.destaque, margem: 0.08 }));
  return { grupo, corpo, redesenhar };
};

/** janela de programa escura (estilo terminal) com o desenho na frente: `redesenhar(chave, desenho)` */
export const janela = (largura: number, altura: number, o: { cor?: string; px?: number } = {}) => {
  const grupo = new THREE.Group();
  const E = 0.12;
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(largura, altura, E, 5, Math.min(0.09, altura * 0.2)), std(o.cor ?? "#1b1b1d", 0.38));
  corpo.castShadow = true; corpo.receiveShadow = true;
  grupo.add(corpo);
  const W = o.px ?? 2048, H = Math.round((W * altura) / largura);
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  tela.position.z = E / 2 + 0.004; tela.layers.set(NOINK); tela.renderOrder = 2;
  grupo.add(tela);
  let chave = "";
  const redesenhar = (k: string, d: Desenho) => {
    if (k === chave) return;
    chave = k;
    const g = canvas.getContext("2d")!; g.clearRect(0, 0, W, H); d(g, W, H); tex.needsUpdate = true;
  };
  return { grupo, corpo, redesenhar };
};

// ---------------- partículas ----------------
let _brilho: THREE.Texture | null = null;
/** textura de brilho estrela de 4 pontas */
export const texturaBrilho = () => {
  if (_brilho) return _brilho;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,240,200,0.6)"); grd.addColorStop(1, "rgba(255,220,150,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#ffffff"; g.beginPath();
  g.moveTo(64, 2); g.quadraticCurveTo(70, 58, 126, 64); g.quadraticCurveTo(70, 70, 64, 126); g.quadraticCurveTo(58, 70, 2, 64); g.quadraticCurveTo(58, 58, 64, 2);
  g.fill();
  _brilho = new THREE.CanvasTexture(c); _brilho.colorSpace = THREE.SRGBColorSpace;
  return _brilho;
};

/** Faíscas que estouram de um ponto num quadro: estourar(onde, quadro). Chame posar(f) a cada quadro. */
export class Faiscas {
  readonly grupo = new THREE.Group();
  private sp: THREE.Sprite[] = [];
  private estouros: { p: V3; f: number; n: number; cor: THREE.Color; forca: number }[] = [];
  constructor(max = 80) {
    for (let i = 0; i < max; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaBrilho(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.layers.set(NOINK); s.visible = false; this.grupo.add(s); this.sp.push(s);
    }
  }
  estourar(p: V3, f: number, o: { n?: number; cor?: string; forca?: number } = {}) { this.estouros.push({ p, f, n: o.n ?? 14, cor: new THREE.Color(o.cor ?? "#ffd36b").multiplyScalar(2.2), forca: o.forca ?? 1 }); }
  posar(f: number) {
    let k = 0;
    for (const e of this.estouros) {
      const R = rng(Math.round(e.f * 7 + e.p[0] * 13));
      for (let i = 0; i < e.n; i++) {
        const a = R() * Math.PI * 2, el = R() * 1.2 - 0.2, v = (1.6 + R() * 2.2) * e.forca, vida = 12 + R() * 10;
        const t = f - e.f;
        if (t < 0 || t > vida || k >= this.sp.length) { R(); continue; }
        const s = this.sp[k++];
        const d = v * (1 - Math.exp(-t / 6)) * 0.5;
        s.position.set(e.p[0] + Math.cos(a) * Math.cos(el) * d, e.p[1] + Math.sin(el) * d - 0.004 * t * t * 0.3, e.p[2] + Math.sin(a) * Math.cos(el) * d);
        const vivo = 1 - t / vida;
        s.scale.setScalar((0.12 + 0.18 * R()) * (0.4 + vivo) * e.forca);
        (s.material as THREE.SpriteMaterial).color.copy(e.cor).multiplyScalar(vivo);
        s.visible = true;
      }
    }
    for (; k < this.sp.length; k++) this.sp[k].visible = false;
  }
}

/** Confete que sobe e cai girando: soltar(onde, quadro). Chame posar(f). */
export class Confete {
  readonly grupo = new THREE.Group();
  private pedacos: { m: THREE.Mesh; v: THREE.Vector3; w: THREE.Vector3 }[] = [];
  private soltas: { p: V3; f: number }[] = [];
  constructor(n = 90, cores = ["#ffc107", "#d97757", "#4eba65", "#b1b9f9", "#f4f0e6", "#ff7aa8"]) {
    const R = rng(5);
    const geo = new THREE.PlaneGeometry(0.16, 0.09);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, std(cores[i % cores.length], 0.6, { side: THREE.DoubleSide }));
      m.visible = false; m.layers.set(NOINK); this.grupo.add(m);
      const a = R() * Math.PI * 2, sp = 2 + R() * 4;
      this.pedacos.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, 3 + R() * 5, Math.sin(a) * sp), w: new THREE.Vector3(R() * 12, R() * 12, R() * 12) });
    }
  }
  soltar(p: V3, f: number) { this.soltas.push({ p, f }); }
  posar(f: number) {
    const s = [...this.soltas].reverse().find((x) => f >= x.f);
    for (const c of this.pedacos) {
      if (!s) { c.m.visible = false; continue; }
      const t = (f - s.f) / 30;
      if (t > 3) { c.m.visible = false; continue; }
      const arr = Math.min(t, 0.6);
      c.m.position.set(s.p[0] + c.v.x * arr * 0.5 + c.v.x * 0.05 * t, s.p[1] + c.v.y * t - 4.9 * t * t * 0.55, s.p[2] + c.v.z * arr * 0.5 + c.v.z * 0.05 * t);
      c.m.position.y = Math.max(c.m.position.y, 0.02);
      c.m.rotation.set(c.w.x * t, c.w.y * t, c.w.z * t);
      c.m.visible = true;
    }
  }
}

let _macia: THREE.Texture | null = null;
const texturaMacia = () => {
  if (_macia) return _macia;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,0.9)"); grd.addColorStop(0.45, "rgba(255,255,255,0.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  _macia = new THREE.CanvasTexture(c); _macia.colorSpace = THREE.SRGBColorSpace;
  return _macia;
};

/** Poeira do pouso: nuvenzinhas macias que saem rente ao chão, crescem e somem (o peso de quem pousa). levantar(onde, quadro). */
export class Poeira {
  readonly grupo = new THREE.Group();
  private sp: THREE.Sprite[] = [];
  private nuvens: { p: V3; f: number; raio: number }[] = [];
  constructor(max = 40, private cor = "#efe4d0") {
    for (let i = 0; i < max; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaMacia(), color: cor, transparent: true, depthWrite: false }));
      s.visible = false; s.layers.set(NOINK); this.grupo.add(s); this.sp.push(s);
    }
  }
  levantar(p: V3, f: number, raio = 0.6) { this.nuvens.push({ p, f, raio }); }
  posar(f: number) {
    let k = 0;
    for (const n of this.nuvens) {
      const t = f - n.f;
      if (t < 0 || t > 24) continue;
      const R = rng(n.f);
      for (let i = 0; i < 9 && k < this.sp.length; i++) {
        const s = this.sp[k++];
        const a = (i / 9) * Math.PI * 2 + R() * 0.6;
        const d = n.raio * (0.5 + 1.0 * (1 - Math.exp(-t / 5))) * (0.8 + R() * 0.4);
        s.position.set(n.p[0] + Math.cos(a) * d, n.p[1] + 0.08 + t * 0.008 * (0.5 + R()), n.p[2] + Math.sin(a) * d);
        s.scale.setScalar(n.raio * (0.45 + t / 22) * (0.8 + R() * 0.5));
        (s.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - t / 24) ** 1.5;
        s.visible = true;
      }
    }
    for (; k < this.sp.length; k++) this.sp[k].visible = false;
  }
}

/**
 * Sombra-bolha: um disco escuro e macio no chão, debaixo de quem pula. Encolhe e clareia conforme a peça sobe, e
 * mostra onde ela vai cair. No posar: `bolha.posar(x, z, altura)` (a altura vem do `entra()`).
 */
export const sombraBolha = (raio = 0.5, forca = 0.45) => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(20,14,10,1)"); grd.addColorStop(0.5, "rgba(20,14,10,0.6)"); grd.addColorStop(1, "rgba(20,14,10,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: forca });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(raio * 2, raio * 2), mat);
  m.rotation.x = -Math.PI / 2; m.layers.set(NOINK); m.renderOrder = 1;
  const posar = (x: number, z: number, altura: number, y = 0) => {
    m.visible = altura > 0.02;
    m.position.set(x, y + 0.015, z);
    m.scale.setScalar(Math.max(0.35, 1 - altura * 0.22));
    mat.opacity = forca / (1 + altura * 0.9);
  };
  return { malha: m, posar };
};

/** sombra de contato parada debaixo de quem está no chão (os pés, o Claude): ancora o personagem; `posar(x, z)` */
export const sombraContato = (raio = 0.5, forca = 0.38) => {
  const b = sombraBolha(raio, forca);
  return { malha: b.malha, posar: (x: number, z: number) => b.posar(x, z, 0.03) };
};

/**
 * Lascas: nos pousos pesados, 4 a 8 pedacinhos sólidos (com contorno) que saem em arco e quicam uma vez.
 * `soltar(onde, quadro)` e, a cada quadro, `posar(f)`.
 */
export class Lascas {
  readonly grupo = new THREE.Group();
  private peca: THREE.Mesh[] = [];
  private soltas: { p: V3; f: number; n: number; forca: number }[] = [];
  constructor(max = 24, cor = "#b79a72") {
    const geo = new THREE.DodecahedronGeometry(0.05, 0);
    for (let i = 0; i < max; i++) {
      const m = new THREE.Mesh(geo, std(cor, 0.9)); m.castShadow = true; m.visible = false; this.grupo.add(m); this.peca.push(m);
    }
  }
  soltar(p: V3, f: number, o: { n?: number; forca?: number } = {}) { this.soltas.push({ p, f, n: o.n ?? 6, forca: o.forca ?? 1 }); }
  posar(f: number) {
    let k = 0;
    for (const s of this.soltas) {
      const t = (f - s.f) / 30;
      if (t < 0 || t > 1.1) continue;
      const R = rng(s.f * 3 + 1);
      for (let i = 0; i < s.n && k < this.peca.length; i++) {
        const m = this.peca[k++];
        const a = R() * Math.PI * 2, v = (1.2 + R() * 1.4) * s.forca, vy = (1.6 + R() * 1.4) * s.forca;
        // primeiro arco até o chão, depois um quique com 35 % da velocidade
        const t1 = (2 * vy) / 9.8;
        let y: number, d: number;
        if (t < t1) { y = vy * t - 4.9 * t * t; d = v * t; }
        else { const t2 = t - t1, vy2 = vy * 0.35; y = Math.max(0, vy2 * t2 - 4.9 * t2 * t2); d = v * t1 + v * 0.4 * Math.min(t2, (2 * vy2) / 9.8); }
        m.position.set(s.p[0] + Math.cos(a) * d, s.p[1] + y + 0.04, s.p[2] + Math.sin(a) * d);
        m.rotation.set(t * 9 * R(), t * 7, t * 5 * R());
        m.scale.setScalar((0.7 + R() * 0.8) * (t > 0.9 ? 1 - (t - 0.9) / 0.2 : 1));
        m.visible = true;
      }
    }
    for (; k < this.peca.length; k++) this.peca[k].visible = false;
  }
}

// ---------------- trilho ----------------
/** caminho no chão por pontos (x, z), com posição, direção e lado por distância s (metros) */
export class Caminho {
  readonly p: THREE.Vector3[]; readonly s: number[]; readonly len: number;
  constructor(ctrl: [number, number][], passo = 0.25) {
    const c = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
    this.p = c.getSpacedPoints(Math.ceil(c.getLength() / passo));
    this.s = [0];
    for (let i = 1; i < this.p.length; i++) this.s.push(this.s[i - 1] + this.p[i].distanceTo(this.p[i - 1]));
    this.len = this.s[this.s.length - 1];
  }
  private idx(s: number) { let lo = 0, hi = this.s.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.s[m] <= s) lo = m; else hi = m; } return lo; }
  pos(s: number, out = new THREE.Vector3()) {
    if (s <= 0) return out.copy(this.p[0]).addScaledVector(this.tan(0), s);
    if (s >= this.len) return out.copy(this.p[this.p.length - 1]).addScaledVector(this.tan(this.len), s - this.len);
    const i = this.idx(s), k = (s - this.s[i]) / Math.max(1e-6, this.s[i + 1] - this.s[i]);
    return out.copy(this.p[i]).lerp(this.p[i + 1], k);
  }
  tan(s: number, out = new THREE.Vector3()) {
    const a = Math.max(0, Math.min(this.len - 0.5, s - 0.25));
    return out.copy(this.p[Math.min(this.p.length - 1, this.idx(a + 0.5) + 1)]).sub(this.p[this.idx(a)]).setY(0).normalize();
  }
  /** ponto `lado` m à esquerda de quem anda (negativo = direita), `alto` m acima */
  rel(s: number, lado = 0, alto = 0): V3 { const p = this.pos(s), t = this.tan(s); return [p.x + t.z * lado, p.y + alto, p.z - t.x * lado]; }
  /** põe um veículo no caminho: centro em s, olhando para a frente (+Z da peça) */
  colocar(o: THREE.Object3D, s: number, meio = 1, alto = 0) {
    const f = this.pos(s + meio), r = this.pos(s - meio);
    o.position.set((f.x + r.x) / 2, alto, (f.z + r.z) / 2);
    o.lookAt(f.x, alto, f.z);
  }
}

/** trilho de trem (brita, dormentes e dois trilhos) ao longo de um caminho. A roda pousa a 0,3 m de altura. */
export const trilho = (cam: Caminho, de = 0, ate = cam.len) => {
  const g = new THREE.Group();
  const varrer = (perfil: [number, number][], mat: THREE.Material) => {
    const pos: number[] = [], idx: number[] = [];
    const ss: number[] = []; for (let s = de; s < ate; s += 0.5) ss.push(s); ss.push(ate);
    for (let e = 0; e < perfil.length; e++) {
      const p0 = perfil[e], p1 = perfil[(e + 1) % perfil.length], base = pos.length / 3;
      for (const s of ss) for (const p of [p0, p1]) { const r = cam.rel(s, p[0], p[1]); pos.push(...r); }
      for (let i = 0; i < ss.length - 1; i++) { const A = base + i * 2; idx.push(A, A + 2, A + 1, A + 1, A + 2, A + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  };
  varrer([[-1.6, 0.0], [-1.1, 0.14], [1.1, 0.14], [1.6, 0.0]], std("#a49684", 0.95));
  for (const lado of [-0.6, 0.6]) varrer([[lado - 0.05, 0.2], [lado - 0.05, 0.3], [lado + 0.05, 0.3], [lado + 0.05, 0.2]], std("#8b9199", 0.35, { metalness: 0.65 }));
  const n = Math.floor((ate - de) / 0.7);
  const dorm = new THREE.InstancedMesh(new RoundedBoxGeometry(1.9, 0.08, 0.26, 2, 0.03), std("#6e4b36", 0.85), n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { cam.colocar(o, de + i * 0.7 + 0.35, 0.3, 0.17); o.updateMatrix(); dorm.setMatrixAt(i, o.matrix); }
  dorm.castShadow = true; dorm.receiveShadow = true; g.add(dorm);
  return g;
};
