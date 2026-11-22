// Cenários prontos com cara de lugar (fundo escuro, luz de cena, chão com textura), para o Estilo Conversa.
//   terraco(kit, o)   o terraço de um prédio à noite: piso de cimento com rejunte, mureta em volta, caixa d'água,
//                     antena, condensadoras, vasos, banco, um cordão de lâmpadas quentes, a cidade acesa embaixo e
//                     uma lua enorme. Use com LOOKS.noite.
//   deposito(kit, o)  um galpão de arquivo enorme e escuro: estantes altas cheias de caixas em corredores,
//                     luminárias industriais com a luz caindo em cone, poeira no ar, piso de concreto com faixas.
//                     Use com LOOKS.interior. Serve a "perdido no meio de muita coisa", arquivo, memória, estoque.
//   estudio(o)        fundo infinito escuro, círculo de luz no chão, principal de estúdio e recorte colorido.
//                     Use com LOOKS.estudio. Serve a "apresentar uma coisa só" (um produto, um objeto).
//   escritorio(kit,o) escritório de dia ou de tarde: mesas com monitor e notebook, cadeiras, janelas com a cidade,
//                     quadro branco, estante, plantas. Use com LOOKS.escritorio.
//   quarto(kit, o)    o quarto de quem trabalha com IA, à noite: mesa com o monitor aceso, cadeira gamer, cama, fita
//                     de LED, prateleira, pôster, janela com a cidade. Use com LOOKS.quarto.
//   cafe(kit, o)      cafeteria de tarde: balcão com a máquina de espresso, cardápio de giz, mesinhas, banquetas,
//                     luminárias quentes, tijolinho. Use com LOOKS.cafe.
//   salaDeAula(kit,o) sala de aula de dia: lousa (ou quadro branco) escrita, carteiras, mesa do professor, janelas,
//                     cartazes. Use com LOOKS.sala.
// As partes também servem soltas: pisoTextura(), pisoMadeira(), paisagem(), cartaz(), telaCodigo(), telaGrafico(),
// cidade(), lua(), cordaoDeLuzes(), PoeiraNoAr, volumeDeLuz().
import * as THREE from "three";
import { NOINK } from "./fx/ink";
import { Kit, peca, escrever } from "./kit";
import { rng, V3 } from "./tempo";

const tex = (w: number, h: number, desenho: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  desenho(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
};

/** piso de placas de cimento com rejunte, manchas e grão (textura de verdade, que pega luz e sombra) */
export const pisoTextura = (largura = 16, profundidade = 16, placa = 0.6, cor = "#7d7770") => {
  const R = rng(17);
  const map = tex(1024, 1024, (g) => {
    g.fillStyle = cor; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 9000; i++) { const v = R(); g.fillStyle = `rgba(${v > 0.5 ? "255,255,255" : "0,0,0"},${0.025 + R() * 0.05})`; g.fillRect(R() * 1024, R() * 1024, 2 + R() * 6, 2 + R() * 6); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + R() * 0.05})`; g.beginPath(); g.ellipse(R() * 1024, R() * 1024, 30 + R() * 90, 20 + R() * 60, R() * 3, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(25,22,20,0.75)"; g.lineWidth = 5;
    const n = 4; // 4 placas por textura
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * 1024 / n, 0); g.lineTo(i * 1024 / n, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * 1024 / n); g.lineTo(1024, i * 1024 / n); g.stroke(); }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(largura / (placa * 4), profundidade / (placa * 4));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, profundidade), new THREE.MeshStandardMaterial({ map, roughness: 0.92 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
};

/** a cidade acesa lá embaixo: prédios com janelas que brilham (sem contorno, com neblina), num anel em volta */
export const cidade = (o: { centro?: V3; abaixo?: number; raioMin?: number; raioMax?: number; quantos?: number; semente?: number } = {}) => {
  const R = rng(o.semente ?? 23), g = new THREE.Group();
  const cen = o.centro ?? [0, 0, 0], abaixo = o.abaixo ?? 42;
  const janelas = [0, 1, 2].map((k) => tex(128, 256, (c) => {
    c.fillStyle = "#0d1020"; c.fillRect(0, 0, 128, 256);
    const r2 = rng(100 + k);
    for (let y = 6; y < 256; y += 14) for (let x = 6; x < 128; x += 14) {
      const v = r2();
      if (v < 0.42) { c.fillStyle = v < 0.08 ? "#9fd0ff" : v < 0.3 ? "#ffcf7a" : "#ffe7b0"; c.globalAlpha = 0.55 + r2() * 0.45; c.fillRect(x, y, 8, 9); c.globalAlpha = 1; }
    }
  }));
  const mats = janelas.map((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ color: "#1b2033", emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 1.25, roughness: 0.8 }); });
  const telhado = new THREE.MeshStandardMaterial({ color: "#161a2a", roughness: 0.9 });
  for (let i = 0; i < (o.quantos ?? 260); i++) {
    const a = R() * Math.PI * 2, r = (o.raioMin ?? 26) + Math.pow(R(), 0.7) * ((o.raioMax ?? 260) - (o.raioMin ?? 26));
    // perto, o topo fica abaixo do terraço (estamos no alto); longe, alguns passam (o horizonte da cidade)
    const w = 8 + R() * 16, d = 8 + R() * 16, h = Math.min(20 + R() * 70, r < 80 ? abaixo - 4 : r < 150 ? abaixo + 8 : abaixo + 30);
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = mats[i % 3].clone();
    (mat.emissiveMap as THREE.Texture) = janelas[i % 3].clone(); mat.emissiveMap!.needsUpdate = true;
    mat.emissiveMap!.repeat.set(w / 10, h / 18);
    const m = new THREE.Mesh(geo, [mat, mat, telhado, telhado, mat, mat]);
    m.position.set(cen[0] + Math.cos(a) * r, cen[1] - abaixo + h / 2, cen[2] + Math.sin(a) * r);
    m.rotation.y = R() * Math.PI;
    m.layers.set(NOINK);
    g.add(m);
  }
  // o brilho da cidade no chão lá embaixo
  const chaoCidade = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: "#0c0e18", emissive: "#3a2a20", emissiveIntensity: 0.6 }));
  chaoCidade.rotation.x = -Math.PI / 2; chaoCidade.position.set(cen[0], cen[1] - abaixo, cen[2]); chaoCidade.layers.set(NOINK);
  g.add(chaoCidade);
  return g;
};

/** a lua: um disco grande com crateras, que brilha (passa do limite do bloom) e tem um halo; sem neblina */
export const lua = (direcao: V3, o: { distancia?: number; raio?: number; brilho?: number } = {}) => {
  const R = rng(5);
  const map = tex(512, 512, (g) => {
    const grd = g.createRadialGradient(220, 210, 20, 256, 256, 256);
    grd.addColorStop(0, "#fffaf0"); grd.addColorStop(0.7, "#e9e2d2"); grd.addColorStop(1, "#cfc6b4");
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) { const r = 6 + Math.pow(R(), 2) * 50; g.fillStyle = `rgba(120,112,100,${0.12 + R() * 0.18})`; g.beginPath(); g.arc(R() * 512, R() * 512, r, 0, 7); g.fill(); }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.05})`; g.fillRect(R() * 512, R() * 512, 2, 2); }
  });
  const dist = o.distancia ?? 650, raio = o.raio ?? 85;
  const d = new THREE.Vector3(...direcao).normalize();
  const g = new THREE.Group();
  const disco = new THREE.Mesh(new THREE.SphereGeometry(raio, 48, 32), new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1, 1, 1).multiplyScalar(o.brilho ?? 1.9), fog: false }));
  disco.position.copy(d.clone().multiplyScalar(dist)); disco.layers.set(NOINK);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(256, 256, (c) => { const r = c.createRadialGradient(128, 128, 30, 128, 128, 128); r.addColorStop(0, "rgba(190,205,255,0.55)"); r.addColorStop(1, "rgba(190,205,255,0)"); c.fillStyle = r; c.fillRect(0, 0, 256, 256); }), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  halo.scale.setScalar(raio * 4.2); halo.position.copy(disco.position); halo.layers.set(NOINK);
  g.add(halo, disco);
  return g;
};

/** um cordão de lâmpadas quentes entre dois pontos, com a curva do fio; acende de verdade com `luzes` pontuais */
export const cordaoDeLuzes = (a: V3, b: V3, o: { lampadas?: number; caida?: number; luzes?: number; cor?: string } = {}) => {
  const g = new THREE.Group();
  const n = o.lampadas ?? 14, caida = o.caida ?? 0.6, cor = new THREE.Color(o.cor ?? "#ffb866");
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - caida * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u)); }
  const fio = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.012, 6), new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.7 }));
  g.add(fio);
  const geo = new THREE.SphereGeometry(0.06, 12, 8);
  const mat = new THREE.MeshStandardMaterial({ color: "#ffe0b0", emissive: cor, emissiveIntensity: 5 });
  for (let i = 1; i < n; i++) { const p = pts[Math.round((i / n) * 40)]; const l = new THREE.Mesh(geo, mat); l.position.copy(p).y -= 0.07; l.layers.set(NOINK); g.add(l); }
  for (let i = 0; i < (o.luzes ?? 2); i++) {
    const p = pts[Math.round(((i + 0.5) / (o.luzes ?? 2)) * 40)];
    const luz = new THREE.PointLight(cor, 6, 9, 1.6); luz.position.copy(p).y -= 0.2; g.add(luz);
  }
  return g;
};

/**
 * O terraço noturno inteiro, centrado na origem: piso de `lado` m, mureta em volta, as peças do kit nos cantos,
 * o cordão de luzes, a cidade embaixo e a lua na `direcaoLua`. Os personagens ficam perto do centro.
 * `livre`: pontos onde nada do terraço entra (onde a câmera passa).
 */
export const terraco = (kit: Kit, o: { lado?: number; direcaoLua?: V3; livre?: V3[] } = {}) => {
  const L = o.lado ?? 14, g = new THREE.Group();
  g.add(pisoTextura(L + 1, L + 1));
  // mureta em volta (segmentos de 4 m)
  const nSeg = Math.ceil(L / 4);
  for (let i = 0; i < nSeg; i++) {
    const x = -L / 2 + 2 + i * 4;
    for (const [px, pz, ry] of [[x, -L / 2, 0], [x, L / 2, 0], [-L / 2, x, Math.PI / 2], [L / 2, x, Math.PI / 2]] as [number, number, number][]) {
      const p = peca(kit, "parapeito"); p.position.set(px, 0, pz); p.rotation.y = ry; g.add(p);
    }
  }
  const livre = o.livre ?? [];
  const pos = (x: number, z: number) => !livre.some((l) => Math.hypot(l[0] - x, l[2] - z) < 2.5);
  const coisas: [string, number, number, number][] = [
    ["caixa_dagua", -L / 2 + 2.2, -L / 2 + 2.2, 0.3], ["antena", L / 2 - 1.6, -L / 2 + 1.8, 0], ["ar_condicionado", L / 2 - 1.2, -1.5, -Math.PI / 2],
    ["ar_condicionado", L / 2 - 1.2, -0.3, -Math.PI / 2], ["vaso_planta", -L / 2 + 1.0, 1.5, 0], ["vaso_planta", -2.2, -L / 2 + 0.9, 0.5],
    ["vaso_planta", 2.6, -L / 2 + 0.9, 1.2], ["banco", 0.3, -L / 2 + 1.2, 0], ["vaso_planta", L / 2 - 1.0, 2.8, 2],
  ];
  for (const [n, x, z, r] of coisas) if (kit[n] && pos(x, z)) { const p = peca(kit, n); p.position.set(x, 0, z); p.rotation.y = r; g.add(p); }
  // dois postes de madeira e o cordão de luzes em zigue-zague por cima
  const altura = 2.9;
  const postes: V3[] = [[-L / 2 + 0.6, 0, -L / 2 + 0.6], [L / 2 - 0.6, 0, -L / 2 + 0.6], [L / 2 - 0.6, 0, L / 2 - 2.5], [-L / 2 + 0.6, 0, L / 2 - 2.5]];
  for (const p of postes) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, altura, 0.1), new THREE.MeshStandardMaterial({ color: "#5a3c26", roughness: 0.85 }));
    m.position.set(p[0], altura / 2, p[2]); m.castShadow = true; g.add(m);
  }
  const topo = (p: V3): V3 => [p[0], altura, p[2]];
  g.add(cordaoDeLuzes(topo(postes[0]), topo(postes[2]), { lampadas: 18, luzes: 2 }), cordaoDeLuzes(topo(postes[1]), topo(postes[3]), { lampadas: 18, luzes: 2 }));
  g.add(cidade({ abaixo: 42 }));
  g.add(lua(o.direcaoLua ?? [0.42, 0.3, -0.85]));
  return g;
};


// ---------------- o depósito ----------------
/** poeira no ar: pontinhos macios que flutuam devagar dentro da luz. Chame posar(f) a cada quadro (sem estado:
 *  a posição sai só do quadro, então o render em paralelo dá o mesmo resultado) */
export class PoeiraNoAr {
  readonly grupo = new THREE.Group();
  private p: { s: THREE.Sprite; x: number; y: number; z: number; fase: number; v: number }[] = [];
  constructor(centros: V3[], o: { porCentro?: number; raio?: number; altura?: number; cor?: string } = {}) {
    const R = rng(77);
    const map = tex(64, 64, (c) => { const r = c.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,235,200,1)"); r.addColorStop(0.4, "rgba(255,235,200,0.5)"); r.addColorStop(1, "rgba(255,235,200,0)"); c.fillStyle = r; c.fillRect(0, 0, 64, 64); });
    const mat = new THREE.SpriteMaterial({ map, color: o.cor ?? "#ffe2b8", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, fog: false });
    for (const c of centros) for (let i = 0; i < (o.porCentro ?? 40); i++) {
      const s = new THREE.Sprite(mat.clone());
      s.layers.set(NOINK); s.scale.setScalar(0.02 + R() * 0.025);
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * (o.raio ?? 1.6);
      this.p.push({ s, x: c[0] + Math.cos(a) * r, y: 0.5 + R() * (o.altura ?? 5), z: c[2] + Math.sin(a) * r, fase: R() * 6, v: 0.004 + R() * 0.006 });
      this.grupo.add(s);
    }
  }
  posar(f: number) {
    for (const q of this.p) {
      q.s.position.set(q.x + Math.sin(f * 0.01 + q.fase) * 0.25, q.y + Math.sin(f * q.v + q.fase) * 0.35, q.z + Math.cos(f * 0.008 + q.fase) * 0.25);
      (q.s.material as THREE.SpriteMaterial).opacity = 0.3 + 0.25 * Math.sin(f * 0.03 + q.fase * 3);
    }
  }
}

/**
 * O volume de luz que desce da luminária (a luz no ar com poeira). Não é um cone chapado: a força cai nas bordas
 * (onde a superfície fica de lado para a câmera), ao longo do comprimento e perto da lâmpada, então não sobra
 * silhueta de triângulo, só um brilho macio. Aditivo e fraco. `forca` de 0 a 1 (0,3 é o padrão).
 */
export const volumeDeLuz = (altura: number, raio: number, o: { cor?: string; forca?: number } = {}) => {
  const mat = new THREE.ShaderMaterial({
    uniforms: { cor: { value: new THREE.Color(o.cor ?? "#ffc98a") }, forca: { value: o.forca ?? 0.3 }, altura: { value: altura } },
    vertexShader: [
      "varying vec3 vN; varying vec3 vV; varying float vH;",
      "uniform float altura;",
      "void main() {",
      "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
      "  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);",
      "  vH = position.y / altura + 0.5;",
      "  gl_Position = projectionMatrix * mv;",
      "}",
    ].join(String.fromCharCode(10)),
    fragmentShader: [
      "varying vec3 vN; varying vec3 vV; varying float vH;",
      "uniform vec3 cor; uniform float forca;",
      "void main() {",
      "  float frente = pow(abs(dot(normalize(vN), normalize(vV))), 2.5);",
      "  float comprimento = pow(clamp(vH, 0.0, 1.0), 1.6) * smoothstep(1.0, 0.9, vH);",
      "  float a = frente * comprimento * forca * 0.25;",
      "  gl_FragColor = vec4(cor * a, 1.0);",
      "}",
    ].join(String.fromCharCode(10)),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const m = new THREE.Mesh(new THREE.ConeGeometry(raio, altura, 48, 1, true), mat);
  m.layers.set(NOINK);
  return m;
};
const coneDeLuz = (altura: number, raio: number) => volumeDeLuz(altura, raio);

/**
 * O depósito de arquivos: um galpão enorme e escuro, com estantes de 3,2 m cheias de caixas em corredores,
 * luminárias industriais penduradas (a luz cai em cone, com poeira no ar), vigas no teto, paredes escuras e piso de
 * concreto com faixas amarelas em volta das áreas livres. Use com LOOKS.interior.
 *  - `livres`: as áreas abertas no meio das estantes ({p, r}), onde a história acontece. Cada uma ganha uma
 *    luminária que ilumina de verdade (SpotLight, no máximo 6) e a faixa no chão.
 *  - `luzes`: troque os pontos das luminárias que iluminam (padrão: o centro de cada área livre).
 * Devolve { grupo, posar(f) }: chame posar(f) a cada quadro (a poeira).
 */
const CUPULA = new THREE.MeshStandardMaterial({ color: "#3a2c22", roughness: 0.55, metalness: 0.15 });
export const deposito = (kit: Kit, o: { largura?: number; fundo?: number; centro?: V3; livres?: { p: V3; r: number }[]; luzes?: V3[]; alturaLuz?: number; forcaLuz?: number } = {}) => {
  const g = new THREE.Group();
  const cen = o.centro ?? [0, 0, 0], L = o.largura ?? 90, F = o.fundo ?? 90, H = o.alturaLuz ?? 6.5;
  const piso = pisoTextura(L, F, 1.5, "#57524b");
  piso.position.set(cen[0], 0, cen[2]); g.add(piso);
  const livres = o.livres ?? [{ p: cen, r: 8 }];
  const livre = (x: number, z: number, folga: number) => livres.some((l) => Math.hypot(x - l.p[0], z - l.p[2]) < l.r + folga);
  // faixas amarelas no chão em volta de cada área livre (o desenho de galpão de verdade)
  const faixa = new THREE.MeshStandardMaterial({ color: "#c9981f", roughness: 0.85 });
  for (const l of livres) {
    const anel = new THREE.Mesh(new THREE.RingGeometry(l.r + 0.2, l.r + 0.38, 96), faixa);
    anel.rotation.x = -Math.PI / 2; anel.position.set(l.p[0], 0.006, l.p[2]); anel.receiveShadow = true; anel.layers.set(NOINK); g.add(anel);
  }
  // as estantes em fileiras: cada fileira é um corredor ao longo de z; nada entra nas áreas livres
  const R = rng(9);
  if (kit.estante) {
    const passoX = 3.4, passoZ = 2.45;
    for (let x = cen[0] - L / 2 + 3; x < cen[0] + L / 2 - 3; x += passoX) {
      const ry = Math.round((x - cen[0]) / passoX) % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
      for (let z = cen[2] - F / 2 + 3; z < cen[2] + F / 2 - 3; z += passoZ) {
        if (livre(x, z, 1.4)) continue;
        if (R() < 0.05) continue; // um vão aqui e ali, para não parecer carimbado
        const e = peca(kit, "estante"); e.position.set(x, 0, z); e.rotation.y = ry + (R() < 0.5 ? 0 : Math.PI); g.add(e);
      }
    }
  }
  // paredes escuras de bloco e as vigas do teto (somem na neblina)
  const parede = new THREE.MeshStandardMaterial({ color: "#2c251f", roughness: 0.95 });
  for (const [px, pz, ry, w] of [[cen[0], cen[2] - F / 2, 0, L], [cen[0], cen[2] + F / 2, Math.PI, L], [cen[0] - L / 2, cen[2], Math.PI / 2, F], [cen[0] + L / 2, cen[2], -Math.PI / 2, F]] as [number, number, number, number][]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 14), parede); m.position.set(px, 7, pz); m.rotation.y = ry; m.receiveShadow = true; m.layers.set(NOINK); g.add(m);
  }
  const viga = new THREE.MeshStandardMaterial({ color: "#1b1816", roughness: 0.7, metalness: 0.4 });
  for (let x = cen[0] - L / 2; x <= cen[0] + L / 2; x += 6) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, F), viga); b.position.set(x, H + 6.5, cen[2]); b.layers.set(NOINK); g.add(b); }
  // as luminárias: as das áreas livres iluminam de verdade; as outras, espalhadas sobre os corredores, só acesas
  const luzes = (o.luzes ?? livres.map((l) => l.p)).slice(0, 6);
  const pendurar = (x: number, z: number, real: boolean) => {
    if (kit.luminaria_pendente) {
      const l = peca(kit, "luminaria_pendente"); l.position.set(x, H, z); g.add(l);
      // a cúpula esmaltada escura e quente: o aço escuro metálico refletia o céu e saía azul no quadro
      l.traverse((m) => { const me = m as THREE.Mesh; if (me.isMesh && /cupula/.test(me.name)) me.material = CUPULA; });
    }
    const c = coneDeLuz(H - 0.1, real ? 3.0 : 2.2); c.position.set(x, (H - 0.1) / 2, z); g.add(c);
    if (real) {
      const s = new THREE.SpotLight("#ffc27a", o.forcaLuz ?? 70, 22, 0.7, 0.6, 1.5);
      s.position.set(x, H - 0.1, z); s.target.position.set(x, 0, z); g.add(s, s.target);
    } else {
      const pl = new THREE.PointLight("#ffb866", 4, 7, 1.6); pl.position.set(x, H - 1.2, z); g.add(pl);
    }
  };
  luzes.forEach((p) => pendurar(p[0], p[2], true));
  let soltas = 0;
  for (let x = cen[0] - L / 2 + 6; x < cen[0] + L / 2 - 4; x += 10.2) for (let z = cen[2] - F / 2 + 7; z < cen[2] + F / 2 - 6; z += 11) {
    if (luzes.some((p) => Math.hypot(p[0] - x, p[2] - z) < 7)) continue;
    pendurar(x, z, soltas++ < 10); // as 10 primeiras dão uma luz fraca de verdade nos corredores (o resto só brilha)
  }
  const poeira = new PoeiraNoAr(luzes, { porCentro: 55, raio: 2.6, altura: H - 1 });
  g.add(poeira.grupo);
  return { grupo: g, posar: (f: number) => poeira.posar(f) };
};

// ---------------- o estúdio ----------------
/**
 * O estúdio: um fundo infinito (o chão vira parede numa curva, sem quina), escuro em degradê, com o círculo de luz
 * no chão, a principal de estúdio (faz sombra) e um recorte colorido por trás. Para apresentar uma coisa só (um
 * produto, um objeto da metáfora, o Claude explicando). Use com LOOKS.estudio. Frente da câmera: +z.
 */
export const estudio = (o: { centro?: V3; cor?: string; corRecorte?: string; raio?: number } = {}) => {
  const g = new THREE.Group();
  const cen = o.centro ?? [0, 0, 0], R = o.raio ?? 9;
  const mapa = tex(16, 512, (c) => { const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#04060a"); gr.addColorStop(0.6, o.cor ?? "#1c2538"); gr.addColorStop(1, "#283249"); c.fillStyle = gr; c.fillRect(0, 0, 16, 512); });
  const mat = new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.6, metalness: 0.02, side: THREE.DoubleSide });
  // o perfil do fundo infinito (girado em volta do centro): chão reto, curva de 4 m e a parede subindo
  // o perfil começa no centro: o chão e a parede são a mesma superfície (sem a emenda de um disco por cima, que
  // marcava uma linha clara no horizonte)
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.001, 0)];
  for (let i = 1; i <= 8; i++) pts.push(new THREE.Vector2((R * i) / 8, 0));
  for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; pts.push(new THREE.Vector2(R + Math.sin(a) * 4, 4 - Math.cos(a) * 4)); }
  pts.push(new THREE.Vector2(R + 4, 26));
  const fundo = new THREE.Mesh(new THREE.LatheGeometry(pts.map((v) => new THREE.Vector2(v.x, v.y)), 128), mat);
  fundo.position.set(cen[0], 0, cen[2]); fundo.receiveShadow = true; fundo.layers.set(NOINK); g.add(fundo);
  // o fundo gira os 360 graus: a câmera fica dentro dele, e o chão e a parede são uma superfície só
  const circ = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ map: tex(256, 256, (c) => { const r = c.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, "rgba(255,236,210,0.3)"); r.addColorStop(1, "rgba(255,236,210,0)"); c.fillStyle = r; c.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  circ.rotation.x = -Math.PI / 2; circ.position.set(cen[0], 0.01, cen[2]); circ.layers.set(NOINK); g.add(circ);
  const chave = new THREE.SpotLight("#fff0dc", 50, 30, 0.45, 0.5, 1.4); chave.position.set(cen[0] - 4, 9, cen[2] + 6); chave.target.position.set(cen[0], 0.5, cen[2]); chave.castShadow = true;
  chave.shadow.mapSize.set(2048, 2048); chave.shadow.bias = -0.0004;
  const rec = new THREE.SpotLight(o.corRecorte ?? "#7fb6ff", 80, 30, 0.5, 0.6, 1.4); rec.position.set(cen[0] + 3, 6, cen[2] - 7); rec.target.position.set(cen[0], 1, cen[2]);
  // o halo no fundo, atrás de quem está no centro: a luz de fundo dos estúdios
  const halo = new THREE.SpotLight(o.corRecorte ?? "#7fb6ff", 45, 30, 0.42, 0.9, 1.2); halo.position.set(cen[0], 0.25, cen[2] - 2.2); halo.target.position.set(cen[0], 2.2, cen[2] - R - 3);
  g.add(chave, chave.target, rec, rec.target, halo, halo.target);
  return g;
};


// ---------------- os cômodos (2026-11-21): escritório, quarto, café, sala de aula ----------------
// Todos seguem o mesmo jeito: a sala aberta para a câmera (que fica em +z), a parede do fundo em z = -fundo/2, as
// paredes dos lados, o teto com as luzes, o piso com textura, as janelas com a paisagem da hora do dia e os móveis
// em volta das áreas `livres` (onde os personagens ficam). Os personagens ficam perto da origem, de frente para +z.
export type Hora = "dia" | "tarde" | "noite";
type Livre = { p: V3; r: number };
const livreEm = (livres: Livre[], x: number, z: number, folga = 0.4) => livres.some((l) => Math.hypot(x - l.p[0], z - l.p[2]) < l.r + folga);

/** piso de tábuas de madeira (as emendas, os veios e o brilho do verniz) */
export const pisoMadeira = (largura: number, fundo: number, cor = "#9a6a42", tabua = 0.18) => {
  const R = rng(23);
  const map = tex(1024, 1024, (g) => {
    const n = 8, h = 1024 / n;
    for (let i = 0; i < n; i++) {
      let x = -R() * 600;
      while (x < 1024) {
        const w = 380 + R() * 420, v = 0.85 + R() * 0.3;
        const c = new THREE.Color(cor).multiplyScalar(v);
        g.fillStyle = `#${c.getHexString()}`; g.fillRect(x, i * h, w, h);
        for (let k = 0; k < 10; k++) { g.strokeStyle = `rgba(40,20,5,${0.05 + R() * 0.06})`; g.lineWidth = 1 + R() * 2; g.beginPath(); const y = i * h + R() * h; g.moveTo(x, y); g.bezierCurveTo(x + w * 0.3, y + (R() - 0.5) * 10, x + w * 0.7, y + (R() - 0.5) * 10, x + w, y + (R() - 0.5) * 6); g.stroke(); }
        g.fillStyle = "rgba(30,15,5,0.55)"; g.fillRect(x, i * h, 3, h);
        x += w;
      }
      g.fillStyle = "rgba(30,15,5,0.6)"; g.fillRect(0, i * h, 1024, 3);
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(largura / (tabua * 8 * 3.4), fundo / (tabua * 8));
  map.rotation = Math.PI / 2;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, fundo), new THREE.MeshStandardMaterial({ map, roughness: 0.55 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
};

/** a paisagem atrás da janela, na hora do dia: o céu em degradê, os prédios recortados e, à tarde e à noite, as
 *  janelas acesas. Acende sozinha (é a luz que entra), sem contorno. */
export const paisagem = (largura: number, altura: number, hora: Hora, semente = 3) => {
  const R = rng(semente);
  const ceu: Record<Hora, [string, string, string]> = { dia: ["#5d9be0", "#a9cdf2", "#e6f0f7"], tarde: ["#4a6fb0", "#f0a868", "#ffd7a0"], noite: ["#070b1c", "#141f45", "#2c2850"] };
  const predio: Record<Hora, string> = { dia: "#9fb3c8", tarde: "#5a4a5e", noite: "#141a30" };
  const map = tex(512, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512); const c = ceu[hora];
    gr.addColorStop(0, c[0]); gr.addColorStop(0.6, c[1]); gr.addColorStop(1, c[2]); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    if (hora === "noite") for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + R() * 0.5})`; g.fillRect(R() * 512, R() * 220, 2, 2); }
    for (const [camada, esc] of [[0, 0.7], [1, 1]] as [number, number][]) {
      let x = -20;
      while (x < 530) {
        const w = 40 + R() * 70, h = (120 + R() * 220) * esc;
        g.fillStyle = camada ? predio[hora] : new THREE.Color(predio[hora]).lerp(new THREE.Color(ceu[hora][2]), 0.45).getStyle();
        g.fillRect(x, 512 - h, w, h);
        if (camada) for (let yy = 512 - h + 10; yy < 500; yy += 16) for (let xx = x + 6; xx < x + w - 8; xx += 12) {
          const acesa = hora === "dia" ? R() < 0.15 : R() < (hora === "noite" ? 0.55 : 0.3);
          g.fillStyle = acesa ? (hora === "dia" ? "rgba(220,235,250,0.7)" : `rgba(255,${200 + R() * 40},120,0.95)`) : "rgba(0,0,0,0.18)";
          g.fillRect(xx, yy, 6, 8);
        }
        x += w + R() * 8;
      }
    }
    // o reflexo no vidro
    const rf = g.createLinearGradient(0, 0, 512, 512); rf.addColorStop(0.3, "rgba(255,255,255,0)"); rf.addColorStop(0.45, "rgba(255,255,255,0.12)"); rf.addColorStop(0.55, "rgba(255,255,255,0)");
    g.fillStyle = rf; g.fillRect(0, 0, 512, 512);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), new THREE.MeshBasicMaterial({ map, toneMapped: true }));
  m.layers.set(NOINK);
  return m;
};

/** um cartaz ou quadro de parede: o desenho do canvas numa placa fina com moldura */
export const cartaz = (largura: number, altura: number, desenho: (g: CanvasRenderingContext2D, W: number, H: number) => void, moldura = "#2a2a2e") => {
  const g = new THREE.Group();
  const W = 512, H = Math.round(512 * altura / largura);
  const map = tex(W, H, (c) => desenho(c, W, H));
  const fr = new THREE.Mesh(new THREE.BoxGeometry(largura + 0.04, altura + 0.04, 0.025), new THREE.MeshStandardMaterial({ color: moldura, roughness: 0.5 }));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), new THREE.MeshStandardMaterial({ map, roughness: 0.7 }));
  p.position.z = 0.014; p.layers.set(NOINK);
  fr.castShadow = true; g.add(fr, p);
  return g;
};

/** a sala: piso, as três paredes (fundo e lados) com rodapé, o teto com as luzes, e as janelas com a paisagem */
const sala = (o: { largura: number; fundo: number; altura: number; piso: THREE.Mesh; parede: string; teto?: string; hora: Hora;
  janelas?: { parede: "fundo" | "esquerda" | "direita"; pos: number }[]; kit: Kit; luzesTeto?: V3[]; corLuz?: string; forcaLuz?: number }) => {
  const g = new THREE.Group();
  const { largura: L, fundo: F, altura: A } = o;
  o.piso.position.set(0, 0, F / 2 - F / 2); g.add(o.piso);
  const R = rng(41);
  const tinta = tex(512, 512, (c) => { c.fillStyle = o.parede; c.fillRect(0, 0, 512, 512); for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(${R() > 0.5 ? "255,255,255" : "0,0,0"},${0.015 + R() * 0.02})`; c.fillRect(R() * 512, R() * 512, 3, 3); } });
  tinta.wrapS = tinta.wrapT = THREE.RepeatWrapping; tinta.repeat.set(3, 2);
  const matP = new THREE.MeshStandardMaterial({ map: tinta, roughness: 0.9 });
  const zFundo = -F / 2;
  const paredes: [V3, number, number][] = [[[0, A / 2, zFundo], 0, L], [[-L / 2, A / 2, 0], Math.PI / 2, F], [[L / 2, A / 2, 0], -Math.PI / 2, F]];
  const rod = new THREE.MeshStandardMaterial({ color: "#efe9df", roughness: 0.6 });
  for (const [p, ry, w] of paredes) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, A), matP); m.position.set(...p); m.rotation.y = ry; m.receiveShadow = true; m.layers.set(NOINK); g.add(m);
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.02), rod); r.position.set(p[0], 0.05, p[2]); r.rotation.y = ry; r.translateZ(0.01); g.add(r);
  }
  const teto = new THREE.Mesh(new THREE.PlaneGeometry(L, F), new THREE.MeshStandardMaterial({ color: o.teto ?? "#e8e4dc", roughness: 0.95 }));
  teto.rotation.x = Math.PI / 2; teto.position.set(0, A, 0); teto.layers.set(NOINK); g.add(teto);
  // as janelas: o batente do kit e a paisagem logo atrás, encostada na parede
  for (const j of o.janelas ?? []) {
    const jan = o.kit.janela ? peca(o.kit, "janela") : new THREE.Group();
    const pais = paisagem(1.42, 1.42, o.hora, 3 + Math.round(j.pos * 10));
    if (j.parede === "fundo") { jan.position.set(j.pos, 0.75, zFundo + 0.07); pais.position.set(j.pos, 1.5, zFundo + 0.012); }
    else { const sx = j.parede === "esquerda" ? -1 : 1; jan.position.set(sx * (L / 2 - 0.07), 0.75, j.pos); jan.rotation.y = -sx * Math.PI / 2; pais.position.set(sx * (L / 2 - 0.012), 1.5, j.pos); pais.rotation.y = -sx * Math.PI / 2; }
    g.add(jan, pais);
  }
  // as luzes do teto: a luminária (um disco aceso) e a luz de verdade
  for (const p of o.luzesTeto ?? []) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 32), new THREE.MeshStandardMaterial({ color: "#fff6e8", emissive: new THREE.Color(o.corLuz ?? "#fff1dc"), emissiveIntensity: 2.2 }));
    d.position.set(p[0], A - 0.02, p[2]); d.layers.set(NOINK); g.add(d);
    const l = new THREE.PointLight(o.corLuz ?? "#fff1dc", o.forcaLuz ?? 9, 9, 1.4); l.position.set(p[0], A - 0.4, p[2]); g.add(l);
  }
  return g;
};
const por = (g: THREE.Group, kit: Kit, nome: string, p: V3, ry = 0, livres: Livre[] = [], esc = 1) => {
  if (!kit[nome] || livreEm(livres, p[0], p[2])) return null;
  const o = peca(kit, nome, esc !== 1 ? { escala: esc } : {}); o.position.set(...p); o.rotation.y = ry; g.add(o); return o;
};

/** a tela do computador com o Claude Code (o terminal, as linhas de código e o cursor) */
export const telaCodigo = (titulo = "> Claude Code") => (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = "#14161c"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#d97757"; g.font = `600 ${H * 0.07}px "JetBrains Mono", monospace`; g.textBaseline = "top"; g.fillText(titulo, W * 0.05, H * 0.06);
  const R = rng(5), cores = ["#c792ea", "#82aaff", "#c3e88d", "#f2f2f2", "#ffcb6b"];
  for (let i = 0; i < 9; i++) { let x = W * 0.05 + (i % 3) * W * 0.04; const y = H * (0.2 + i * 0.085); for (let k = 0; k < 3; k++) { const w = W * (0.08 + R() * 0.2); g.fillStyle = cores[Math.floor(R() * cores.length)]; g.fillRect(x, y, w, H * 0.035); x += w + W * 0.02; } }
  g.fillStyle = "#f2f2f2"; g.fillRect(W * 0.05, H * 0.93, W * 0.02, H * 0.045);
};
/** a tela com um gráfico subindo (o escritório) */
export const telaGrafico = (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = "#f4f6fa"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#dfe5ee"; g.fillRect(0, 0, W, H * 0.12);
  const R = rng(9);
  for (let i = 0; i < 7; i++) { const h = H * (0.15 + i * 0.08 + R() * 0.05); g.fillStyle = i === 6 ? "#d97757" : "#4f86c6"; g.fillRect(W * (0.08 + i * 0.12), H * 0.9 - h, W * 0.08, h); }
  g.strokeStyle = "#2a2430"; g.lineWidth = H * 0.008; g.beginPath(); g.moveTo(W * 0.06, H * 0.9); g.lineTo(W * 0.94, H * 0.9); g.stroke();
};

/**
 * O escritório: piso de porcelanato claro, paredes claras, janelas grandes no fundo com a cidade (dia ou tarde), o
 * quadro branco entre elas, mesas com monitor (o Claude Code e um gráfico) e notebook, cadeiras, a estante de
 * livros, plantas, luminárias no teto e um quadro de parede. Use com LOOKS.escritorio.
 */
export const escritorio = (kit: Kit, o: { livres?: Livre[]; hora?: "dia" | "tarde"; parede?: string; quadro?: (g: CanvasRenderingContext2D, W: number, H: number) => void } = {}) => {
  const hora = o.hora ?? "dia", livres = o.livres ?? [{ p: [0, 0, 0], r: 1.6 }];
  const L = 9, F = 7.5, A = 3.0;
  const g = sala({ kit, largura: L, fundo: F, altura: A, hora, parede: o.parede ?? "#d6d9d4", piso: pisoTextura(L, F, 0.6, "#b4b0a8"),
    janelas: [{ parede: "fundo", pos: -2.6 }, { parede: "fundo", pos: 2.6 }, { parede: "esquerda", pos: -1.2 }],
    luzesTeto: [[-2, 0, -1.5], [2, 0, -1.5], [0, 0, 1.2]], forcaLuz: hora === "dia" ? 7 : 9 });
  const z = -F / 2;
  const qb = por(g, kit, "quadro_branco", [0, 1.02, z + 0.06], 0, []);
  if (qb) escrever(qb, "quadro_face", o.quadro ?? ((c, W, H) => {
    c.fillStyle = "#fbfbf8"; c.fillRect(0, 0, W, H);
    c.strokeStyle = "#2f5d8a"; c.lineWidth = H * 0.012; c.font = `700 ${H * 0.1}px "Caveat", "Inter", sans-serif`; c.fillStyle = "#2f5d8a"; c.textBaseline = "top";
    c.fillText("PLANO DO TRIMESTRE", W * 0.06, H * 0.07);
    [["1. automatizar o atendimento", "#2f5d8a"], ["2. lançar o curso", "#c94a3c"], ["3. dobrar os clientes", "#3f7d5a"]].forEach(([t, cor], k) => { c.fillStyle = cor; c.font = `600 ${H * 0.075}px "Caveat", "Inter", sans-serif`; c.fillText(t, W * 0.08, H * (0.3 + k * 0.15)); });
    c.strokeStyle = "#c94a3c"; c.beginPath(); c.moveTo(W * 0.62, H * 0.85); c.lineTo(W * 0.72, H * 0.7); c.lineTo(W * 0.8, H * 0.76); c.lineTo(W * 0.92, H * 0.5); c.stroke();
  }));
  // o lambri de madeira na parte de baixo da parede do fundo (o acabamento que tira a cara de sala vazia)
  const lam = pisoMadeira(L, 1.05, "#7a5236", 0.12); lam.rotation.set(0, 0, 0); lam.position.set(0, 0.525, z + 0.012); lam.layers.set(NOINK); g.add(lam);
  // as mesas: duas no fundo, de frente para a câmera (os monitores acesos aparecem atrás dos personagens), e as dos lados
  for (const [x, zz, ry, tela] of [[-1.9, -2.35, 0, 1], [1.9, -2.35, 0, 0], [-3.2, -0.2, Math.PI / 2, 0], [3.2, -0.2, -Math.PI / 2, 1]] as [number, number, number, number][]) {
    if (livreEm(livres, x, zz, 0.6)) continue;
    const m = por(g, kit, "mesa_escritorio", [x, 0, zz], ry); if (!m) continue;
    const pc = peca(kit, "computador"); pc.position.set(0, 0.755, 0.12); m.add(pc);
    escrever(pc, "computador_tela", tela ? telaCodigo() : telaGrafico);
    if (kit.luminaria_mesa) { const lm = peca(kit, "luminaria_mesa"); lm.position.set(-0.55, 0.755, 0.1); lm.rotation.y = 0.4; m.add(lm); }
    if (kit.notebook && tela) { const nb = peca(kit, "notebook"); nb.position.set(0.42, 0.755, -0.05); nb.rotation.y = -0.3; m.add(nb); escrever(nb, "notebook_tela", telaCodigo("~/projeto")); }
    const cd = peca(kit, "cadeira_escritorio"); cd.position.set(0.1, 0, 0.75); cd.rotation.y = 0.25; m.add(cd);
  }
  por(g, kit, "estante_livros", [3.75, 0, z + 0.2], 0, livres);
  for (const p of [[-4.1, 0, z + 0.45], [4.1, 0, 1.6], [-1.3, 0, z + 0.4], [1.3, 0, z + 0.4]] as V3[]) por(g, kit, "vaso_planta", p, 0, livres, 1.25);
  // o quadro de parede (uma pintura abstrata) na parede da direita
  const art = cartaz(1.0, 0.7, (c, W, H) => { c.fillStyle = "#f0e9dc"; c.fillRect(0, 0, W, H); const cs = ["#d97757", "#2f5d8a", "#f0c25a", "#3f7d5a"]; cs.forEach((cor, k) => { c.fillStyle = cor; c.beginPath(); c.arc(W * (0.25 + k * 0.17), H * (0.5 + (k % 2 ? -0.12 : 0.12)), H * (0.22 - k * 0.03), 0, 7); c.fill(); }); }, "#d8cfc0");
  art.position.set(L / 2 - 0.02, 1.7, 0.2); art.rotation.y = -Math.PI / 2; g.add(art);
  return g;
};

/**
 * O quarto de quem trabalha com IA, à noite: piso de madeira, parede escura, a mesa com o monitor aceso (o Claude
 * Code), a cadeira gamer, a cama ao fundo, a prateleira com livros e o bonequinho do Claude, o pôster, a janela com
 * a cidade à noite e a fita de LED colorida que acende o fundo. Use com LOOKS.quarto. `led`: a cor da fita.
 */
export const quarto = (kit: Kit, o: { livres?: Livre[]; led?: string; parede?: string; poster?: (g: CanvasRenderingContext2D, W: number, H: number) => void } = {}) => {
  const livres = o.livres ?? [{ p: [0, 0, 0], r: 1.6 }], led = o.led ?? "#8a5cff";
  const L = 7.5, F = 6.5, A = 2.8, z = -F / 2;
  const g = sala({ kit, largura: L, fundo: F, altura: A, hora: "noite", parede: o.parede ?? "#3a3f52", teto: "#2a2d38", piso: pisoMadeira(L, F, "#8a5a38"),
    janelas: [{ parede: "fundo", pos: 2.3 }], luzesTeto: [], forcaLuz: 0 });
  // a fita de LED: no alto da parede do fundo e da esquerda, acesa, com luz de verdade
  const fita = new THREE.MeshStandardMaterial({ color: led, emissive: new THREE.Color(led), emissiveIntensity: 3.5 });
  for (const [p, ry, w] of [[[0, A - 0.06, z + 0.03], 0, L], [[-L / 2 + 0.03, A - 0.06, 0], Math.PI / 2, F]] as [V3, number, number][]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, 0.02), fita); m.position.set(...p); m.rotation.y = ry; m.layers.set(NOINK); g.add(m);
  }
  for (const x of [-2.5, 0, 2.5]) { const l = new THREE.PointLight(led, 4, 6, 1.4); l.position.set(x, A - 0.3, z + 0.4); g.add(l); }
  const lL = new THREE.PointLight(led, 3, 6, 1.4); lL.position.set(-L / 2 + 0.4, A - 0.3, -0.5); g.add(lL);
  // a cama encostada no fundo, à direita
  por(g, kit, "cama", [1.6, 0, z + 1.12], 0, livres);
  // a mesa na parede da esquerda, com o monitor aceso e a cadeira gamer
  const m = livreEm(livres, -2.9, -1.4, 0.6) ? null : por(g, kit, "mesa_escritorio", [-2.95, 0, -1.4], Math.PI / 2);
  if (m) {
    const pc = peca(kit, "computador"); pc.position.set(0, 0.755, 0.12); m.add(pc); escrever(pc, "computador_tela", telaCodigo());
    const tela = new THREE.PointLight("#a8c8ff", 2.5, 3, 1.5); tela.position.set(0, 1.1, -0.3); m.add(tela);
    const cg = peca(kit, "cadeira_gamer"); cg.position.set(0.15, 0, -0.8); cg.rotation.y = Math.PI + 0.35; m.add(cg);
    if (kit.luminaria_mesa) { const lm = peca(kit, "luminaria_mesa"); lm.position.set(-0.55, 0.755, 0.1); lm.rotation.y = 0.4; m.add(lm); }
  }
  const pr = por(g, kit, "prateleira", [-L / 2 + 0.12, 0.1, -1.4], Math.PI / 2, []); void pr;
  const pr2 = por(g, kit, "prateleira", [-L / 2 + 0.12, 0.6, -1.4], Math.PI / 2, []); void pr2;
  // o pôster no fundo, à esquerda
  const pst = cartaz(0.8, 1.1, o.poster ?? ((c, W, H) => {
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#1a1033"); gr.addColorStop(1, "#d97757"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = "#f4efe6"; c.font = `900 ${H * 0.09}px "Inter", sans-serif`; c.textAlign = "center"; c.fillText("BUILD", W / 2, H * 0.2); c.fillText("WITH AI", W / 2, H * 0.3);
    c.fillStyle = "#d97757"; c.fillRect(W * 0.3, H * 0.5, W * 0.4, W * 0.32); c.fillStyle = "#141210"; c.fillRect(W * 0.4, H * 0.56, W * 0.05, W * 0.1); c.fillRect(W * 0.55, H * 0.56, W * 0.05, W * 0.1);
  }), "#141416");
  pst.position.set(-1.2, 1.55, z + 0.02); g.add(pst);
  por(g, kit, "vaso_planta", [3.2, 0, z + 0.4], 0, livres, 1.2);
  return g;
};

/**
 * O café de tarde: piso de madeira escura, parede de tijolinho claro, o balcão de mármore com a máquina de espresso
 * e as xícaras, o cardápio de giz atrás, as luminárias pendentes quentes, mesinhas com cadeiras e xícaras, banquetas,
 * plantas e as janelas da esquerda com a luz da tarde. Use com LOOKS.cafe. `cardapio`: o desenho da lousa.
 */
export const cafe = (kit: Kit, o: { livres?: Livre[]; hora?: "dia" | "tarde"; parede?: string; cardapio?: (g: CanvasRenderingContext2D, W: number, H: number) => void } = {}) => {
  const livres = o.livres ?? [{ p: [0, 0, 0], r: 1.6 }], hora = o.hora ?? "tarde";
  const L = 9, F = 7.5, A = 3.1, z = -F / 2;
  const g = sala({ kit, largura: L, fundo: F, altura: A, hora, parede: o.parede ?? "#d8c3a8", teto: "#3a2a20", piso: pisoMadeira(L, F, "#6a4428", 0.16),
    janelas: [{ parede: "esquerda", pos: -1.8 }, { parede: "esquerda", pos: 0.6 }], luzesTeto: [], forcaLuz: 0 });
  // o tijolinho na parede do fundo
  const tij = tex(512, 512, (c) => { c.fillStyle = "#c98f6a"; c.fillRect(0, 0, 512, 512); const R = rng(4); for (let y = 0; y < 512; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 512; x += 64) { const v = 0.88 + R() * 0.2; c.fillStyle = `rgb(${200 * v},${140 * v},${105 * v})`; c.fillRect(x + 2, y + 2, 60, 28); } });
  tij.wrapS = tij.wrapT = THREE.RepeatWrapping; tij.repeat.set(L / 2, A / 2);
  const parede = new THREE.Mesh(new THREE.PlaneGeometry(L, A), new THREE.MeshStandardMaterial({ map: tij, roughness: 0.9 }));
  parede.position.set(0, A / 2, z + 0.01); parede.receiveShadow = true; parede.layers.set(NOINK); g.add(parede);
  const balc = por(g, kit, "balcao", [0.6, 0, z + 1.0], 0, []);
  if (balc) {
    const mq = peca(kit, "maquina_cafe"); mq.position.set(0.1, 1.05, 0.08); balc.add(mq);
    for (const x of [-0.25, 0.55]) { const x2 = peca(kit, "xicara"); x2.position.set(x, 1.05, -0.2); balc.add(x2); }
  }
  for (const x of [-0.5, 0.2, 0.9]) por(g, kit, "banqueta", [x + 0.6, 0, z + 1.65], 0, livres);
  const cd = por(g, kit, "lousa_cardapio", [0.6, 1.2, z + 0.03], 0, []);
  if (cd) escrever(cd, "lousa_cardapio_face", o.cardapio ?? ((c, W, H) => {
    c.fillStyle = "#2c4a3a"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#f4efe6"; c.textAlign = "center"; c.font = `700 ${H * 0.1}px "Caveat", "Inter", sans-serif`; c.fillText("CARDÁPIO", W / 2, H * 0.14);
    c.textAlign = "left"; c.font = `600 ${H * 0.065}px "Caveat", "Inter", sans-serif`;
    [["espresso", "6"], ["cappuccino", "9"], ["latte", "10"], ["pão de queijo", "7"], ["bolo do dia", "12"]].forEach(([t, p], k) => { c.fillStyle = "#f4efe6"; c.fillText(t, W * 0.1, H * (0.32 + k * 0.13)); c.fillStyle = "#f0c25a"; c.textAlign = "right"; c.fillText(p, W * 0.9, H * (0.32 + k * 0.13)); c.textAlign = "left"; });
  }));
  // as luminárias pendentes quentes sobre o balcão e as mesas
  for (const p of [[-0.4, 0, z + 1.0], [1.6, 0, z + 1.0], [-2.9, 0, 0.2], [2.9, 0, 0.2]] as V3[]) {
    if (kit.luminaria_pendente) { const lp = peca(kit, "luminaria_pendente"); lp.position.set(p[0], A - 1.75, p[2]); g.add(lp); }
    const l = new THREE.PointLight("#ffbf7a", 6, 6, 1.4); l.position.set(p[0], A - 1.9, p[2]); g.add(l);
  }
  // as mesinhas com cadeiras e xícaras
  for (const [x, zz] of [[-2.9, 0.2], [2.9, 0.2], [-2.9, 2.4], [2.9, 2.4], [-3.0, -2.0]] as [number, number][]) {
    if (livreEm(livres, x, zz, 0.8)) continue;
    const ms = por(g, kit, "mesinha", [x, 0, zz]); if (!ms) continue;
    const xc = peca(kit, "xicara"); xc.position.set(0.1, 0.75, 0.05); ms.add(xc);
    for (const a of [0.3, Math.PI + 0.3]) { const c2 = peca(kit, "cadeira_cafe"); c2.position.set(Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55); c2.rotation.y = a + Math.PI; ms.add(c2); }
  }
  for (const p of [[-4.1, 0, z + 0.45], [4.1, 0, z + 0.45], [4.1, 0, 1.4]] as V3[]) por(g, kit, "vaso_planta", p, 0, livres, 1.3);
  const pr = por(g, kit, "prateleira", [3.0, 0.35, z + 0.12], 0, []); void pr;
  return g;
};

/**
 * A sala de aula de dia: piso vinílico claro, paredes de duas cores, a lousa verde (ou o quadro branco) no fundo
 * com o que você escrever, a mesa do professor, as carteiras em fileiras nos lados, as janelas da esquerda com a luz
 * do dia, cartazes na parede da direita e o relógio. Use com LOOKS.sala. `quadro`: "lousa" ou "branco"; `texto`: o
 * desenho do quadro (o padrão é uma aula de IA).
 */
export const salaDeAula = (kit: Kit, o: { livres?: Livre[]; quadro?: "lousa" | "branco"; texto?: (g: CanvasRenderingContext2D, W: number, H: number) => void } = {}) => {
  const livres = o.livres ?? [{ p: [0, 0, 0], r: 1.6 }];
  const L = 9.5, F = 8, A = 3.1, z = -F / 2;
  const g = sala({ kit, largura: L, fundo: F, altura: A, hora: "dia", parede: "#efe6d2", piso: pisoMadeira(L, F, "#b98f62", 0.14),
    janelas: [{ parede: "esquerda", pos: -2.2 }, { parede: "esquerda", pos: 0.0 }, { parede: "esquerda", pos: 2.2 }],
    luzesTeto: [[-2.2, 0, -2], [2.2, 0, -2], [-2.2, 0, 1.5], [2.2, 0, 1.5]], forcaLuz: 6 });
  // a barra de baixo da parede, de outra cor (sala de escola)
  const barra = new THREE.MeshStandardMaterial({ color: "#7fa59a", roughness: 0.85 });
  for (const [p, ry, w] of [[[0, 0.55, z + 0.006], 0, L], [[L / 2 - 0.006, 0.55, 0], -Math.PI / 2, F]] as [V3, number, number][]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.1), barra); m.position.set(...p); m.rotation.y = ry; m.layers.set(NOINK); g.add(m);
  }
  const branco = o.quadro === "branco";
  const q = branco ? por(g, kit, "quadro_branco", [0, 1.0, z + 0.06], 0, []) : por(g, kit, "lousa", [0, 0.9, z + 0.06], 0, []);
  if (q) escrever(q, branco ? "quadro_face" : "lousa_face", o.texto ?? ((c, W, H) => {
    c.fillStyle = branco ? "#fbfbf8" : "#2c4a3a"; c.fillRect(0, 0, W, H);
    const giz = branco ? "#2f5d8a" : "#f4efe6";
    c.fillStyle = giz; c.font = `700 ${H * 0.11}px "Caveat", "Inter", sans-serif`; c.textBaseline = "top"; c.fillText("Aula 3: o que é um agente de IA", W * 0.05, H * 0.08);
    c.font = `600 ${H * 0.08}px "Caveat", "Inter", sans-serif`;
    ["ele lê o pedido", "planeja os passos", "usa as ferramentas", "confere o resultado"].forEach((t, k) => c.fillText(`${k + 1}. ${t}`, W * 0.07, H * (0.32 + k * 0.14)));
    c.strokeStyle = giz; c.lineWidth = H * 0.01; c.beginPath(); c.arc(W * 0.78, H * 0.6, H * 0.2, 0, 7); c.stroke();
    c.fillText("IA", W * 0.745, H * 0.55);
  }));
  // a mesa do professor
  const mp = por(g, kit, "mesa_escritorio", [2.75, 0, z + 1.15], -0.2, livres);
  if (mp && kit.notebook) { const nb = peca(kit, "notebook"); nb.position.set(-0.2, 0.755, 0); mp.add(nb); escrever(nb, "notebook_tela", telaCodigo()); }
  // as carteiras nos lados, em fileiras (o meio fica livre para os personagens)
  for (const x of [-3.6, -2.5, 2.5, 3.6]) for (const zz of [-1.6, -0.2, 1.2, 2.6]) por(g, kit, "carteira", [x, 0, zz], Math.PI, livres);
  // os cartazes da parede da direita e o relógio
  const cart = [
    (c: CanvasRenderingContext2D, W: number, H: number) => { c.fillStyle = "#f0c25a"; c.fillRect(0, 0, W, H); c.fillStyle = "#2a2430"; c.font = `900 ${H * 0.16}px Inter`; c.textAlign = "center"; c.fillText("A B C", W / 2, H * 0.4); c.fillText("D E F", W / 2, H * 0.72); },
    (c: CanvasRenderingContext2D, W: number, H: number) => { c.fillStyle = "#e8f0f7"; c.fillRect(0, 0, W, H); c.fillStyle = "#4f86c6"; c.beginPath(); c.ellipse(W * 0.35, H * 0.5, W * 0.25, H * 0.3, 0.3, 0, 7); c.fill(); c.fillStyle = "#5aa469"; c.beginPath(); c.ellipse(W * 0.7, H * 0.45, W * 0.18, H * 0.25, -0.4, 0, 7); c.fill(); },
    (c: CanvasRenderingContext2D, W: number, H: number) => { c.fillStyle = "#f4efe6"; c.fillRect(0, 0, W, H); c.fillStyle = "#c94a3c"; c.font = `900 ${H * 0.2}px Inter`; c.textAlign = "center"; c.fillText("1+1", W / 2, H * 0.45); c.fillStyle = "#2f5d8a"; c.fillText("= 2", W / 2, H * 0.75); },
  ];
  cart.forEach((d, k) => { const p = cartaz(0.7, 0.9, d, "#f4efe6"); p.position.set(L / 2 - 0.02, 1.75, -2.2 + k * 1.6); p.rotation.y = -Math.PI / 2; g.add(p); });
  const rel = cartaz(0.4, 0.4, (c, W, H) => { c.fillStyle = "#f4efe6"; c.beginPath(); c.arc(W / 2, H / 2, W * 0.48, 0, 7); c.fill(); c.strokeStyle = "#2a2430"; c.lineWidth = W * 0.04; c.beginPath(); c.moveTo(W / 2, H / 2); c.lineTo(W / 2, H * 0.2); c.moveTo(W / 2, H / 2); c.lineTo(W * 0.72, H / 2); c.stroke(); }, "#2a2430");
  rel.position.set(2.3, 2.5, z + 0.03); g.add(rel);
  por(g, kit, "estante_livros", [-3.9, 0, z + 0.2], 0, livres);
  por(g, kit, "vaso_planta", [-4.5, 0, z + 1.0], 0, livres, 1.2);
  // o mural de recados na parede do fundo, ao lado da lousa
  const mural = cartaz(1.1, 0.8, (c, W, H) => { c.fillStyle = "#c79a5c"; c.fillRect(0, 0, W, H); const R2 = rng(12); const cs = ["#f0c25a", "#e8f0f7", "#f4b6c2", "#bfe3b4"]; for (let k = 0; k < 7; k++) { c.save(); c.translate(W * (0.15 + (k % 4) * 0.23), H * (0.28 + Math.floor(k / 4) * 0.42)); c.rotate((R2() - 0.5) * 0.3); c.fillStyle = cs[k % 4]; c.fillRect(-W * 0.09, -H * 0.13, W * 0.18, H * 0.26); c.fillStyle = "#c94a3c"; c.beginPath(); c.arc(0, -H * 0.11, W * 0.012, 0, 7); c.fill(); c.restore(); } }, "#7a5032");
  mural.position.set(-2.9, 1.75, z + 0.03); g.add(mural);
  return g;
};
