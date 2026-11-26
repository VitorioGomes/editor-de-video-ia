// As peças 3D prontas (GLB do Blender): carregar, clonar, trocar cor e escrever nas telas e placas.
// Lista e medidas das peças: skill/estilos/curta-3d.md. Cada peça é um grupo com o nome dela; as partes que mexem
// (braço, tampa, roda, olhos) são nós com nome próprio: no(peca, "claude_bracoE").
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { NOINK } from "./fx/ink";
import cfg from "../gerado/config.json";

export type Kit = Record<string, THREE.Object3D>;

// ---------------- textura sutil e um pouco de desgaste (no lugar do plástico liso) ----------------
// Cada material ganha, pelo nome, um mapa de cor quase branco (multiplica a cor da peça) e um de aspereza:
//   pele: poros e manchinhas; tecido (roupa, calça, boné): trama; plástico (o Claude, amarelo, fone, capacete):
//   grão fino, riscos e as bordas um pouco gastas; madeira: veios; concreto e pedra: grão grosso.
// Para desligar num vídeo: carregarKit(nomes, { textura: false }).
type Tipo = "pele" | "tecido" | "plastico" | "madeira" | "pedra" | "claude" | "cabelo" | "pelo";
const TIPO: Record<string, Tipo> = {
  pele: "pele", roupa: "tecido", roupa2: "tecido", calca: "tecido", bone: "tecido", cabelo: "cabelo", sapato: "tecido",
  claude: "claude", amarelo: "plastico", fone: "plastico", capacete: "plastico", laranja: "plastico", vermelho: "plastico", azul: "plastico",
  carcaca: "plastico", caixa_dagua: "plastico", robo: "plastico", robo_escuro: "plastico",
  estofado: "tecido", lencol: "tecido", edredom: "tecido", marmore: "pedra",
  pelo: "pelo", pelo_claro: "pelo", pelo_escuro: "pelo", pena: "pelo", pena_clara: "pelo", pena_escura: "pelo", oculos: "plastico", balao: "plastico", branco: "plastico", verde: "plastico",
  madeira: "madeira", madeira_escura: "madeira", tronco: "madeira", papelao: "madeira",
  concreto: "pedra", pedra: "pedra", pedra_clara: "pedra", vaso: "pedra", creme: "pedra", parede: "pedra",
};
const opcoesTextura = { ligada: true };
const texturas: Partial<Record<Tipo, { cor: THREE.Texture; aspero: THREE.Texture }>> = {};
const fazerTextura = (tipo: Tipo) => {
  if (texturas[tipo]) return texturas[tipo]!;
  const N = 512, c = document.createElement("canvas"), a = document.createElement("canvas");
  c.width = c.height = a.width = a.height = N;
  const g = c.getContext("2d")!, h = a.getContext("2d")!;
  let seed = 7 + tipo.length * 13;
  const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = "#f4f4f4"; g.fillRect(0, 0, N, N);
  h.fillStyle = "#b0b0b0"; h.fillRect(0, 0, N, N);
  const pontos = (n: number, tam: number, alfa: number, claro = 0.4) => { for (let i = 0; i < n; i++) { const v = R() < claro ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${alfa * R()})`; g.fillRect(R() * N, R() * N, tam * (0.5 + R()), tam * (0.5 + R())); } };
  if (tipo === "pele") { pontos(9000, 2, 0.08); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(180,90,80,${0.03 + R() * 0.03})`; g.beginPath(); g.arc(R() * N, R() * N, 20 + R() * 60, 0, 7); g.fill(); } }
  if (tipo === "tecido") {
    for (let y = 0; y < N; y += 4) { g.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.04})`; g.fillRect(0, y, N, 1.5); }
    for (let x = 0; x < N; x += 4) { g.fillStyle = `rgba(255,255,255,${0.03 + R() * 0.03})`; g.fillRect(x, 0, 1.5, N); }
    pontos(4000, 3, 0.06);
  }
  if (tipo === "plastico") {
    pontos(12000, 1.5, 0.06);
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(255,255,255,${0.05 + R() * 0.08})`; g.lineWidth = 1; g.beginPath(); const x = R() * N, y = R() * N; g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 80, y + (R() - 0.5) * 30); g.stroke(); }
    // bordas um pouco gastas: um claro fino nas beiradas de cada face (o mapa cobre a face inteira)
    const grd = g.createLinearGradient(0, 0, N, 0); grd.addColorStop(0, "rgba(255,255,255,0.10)"); grd.addColorStop(0.04, "rgba(255,255,255,0)"); grd.addColorStop(0.96, "rgba(255,255,255,0)"); grd.addColorStop(1, "rgba(255,255,255,0.10)");
    g.fillStyle = grd; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 2500; i++) { const v = 90 + R() * 120; h.fillStyle = `rgba(${v},${v},${v},0.5)`; h.fillRect(R() * N, R() * N, 3, 3); }
  }
  if (tipo === "claude") {
    // o Claude com cara de material de verdade (metal escovado, couro): riscos finos na horizontal, manchas
    // largas e suaves de valor e um grão que aparece no celular; a aspereza varia junto (o brilho quebra)
    for (let y = 0; y < N; y += 1) { const v = R(); g.fillStyle = `rgba(${v > 0.5 ? "255,255,255" : "0,0,0"},${0.025 + R() * 0.045})`; g.fillRect(0, y, N, 1); }
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${R() > 0.5 ? "255,235,220" : "60,20,10"},${0.04 + R() * 0.05})`; g.beginPath(); g.ellipse(R() * N, R() * N, 40 + R() * 120, 20 + R() * 60, R() * 3, 0, 7); g.fill(); }
    pontos(9000, 1.5, 0.1);
    for (let y = 0; y < N; y += 1) { const v = 120 + R() * 110; h.fillStyle = `rgba(${v},${v},${v},0.35)`; h.fillRect(0, y, N, 1); }
    for (let i = 0; i < 20; i++) { h.fillStyle = `rgba(${R() > 0.5 ? 220 : 80},${R() > 0.5 ? 220 : 80},${R() > 0.5 ? 220 : 80},0.18)`; h.beginPath(); h.ellipse(R() * N, R() * N, 60 + R() * 120, 30 + R() * 80, R() * 3, 0, 7); h.fill(); }
  }
  if (tipo === "pelo") {
    // pelo de bicho de brinquedo: tufos curtos e largos, todos para o mesmo lado, de pouco contraste (o pelo fino
    // de verdade fica menor que um pixel no plano aberto e tremula); a aspereza acompanha
    for (let i = 0; i < 2600; i++) {
      const x = R() * N, y = R() * N, l = 10 + R() * 16, v = R() > 0.5 ? 255 : 0;
      g.strokeStyle = `rgba(${v},${v},${v},${0.018 + R() * 0.025})`; g.lineWidth = 3 + R() * 3; g.lineCap = "round";
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2, y + l * 0.5, x + (R() - 0.5) * 5, y + l); g.stroke();
    }
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${R() > 0.5 ? "255,255,255" : "0,0,0"},${0.025 + R() * 0.03})`; g.beginPath(); g.ellipse(R() * N, R() * N, 40 + R() * 90, 30 + R() * 60, R() * 3, 0, 7); g.fill(); }
  }
  if (tipo === "madeira") { for (let y = 0; y < N; y += 2) { g.fillStyle = `rgba(60,30,10,${0.04 + 0.05 * Math.abs(Math.sin(y * 0.09 + Math.sin(y * 0.013) * 3))})`; g.fillRect(0, y, N, 2); } pontos(3000, 2, 0.06); }
  if (tipo === "pedra") { pontos(16000, 3, 0.1); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + R() * 0.04})`; g.beginPath(); g.arc(R() * N, R() * N, 10 + R() * 50, 0, 7); g.fill(); } }
  if (tipo !== "plastico" && tipo !== "claude") for (let i = 0; i < 6000; i++) { const v = 140 + R() * 100; h.fillStyle = `rgba(${v},${v},${v},0.4)`; h.fillRect(R() * N, R() * N, 4, 4); }
  const cor = new THREE.CanvasTexture(c); cor.colorSpace = THREE.SRGBColorSpace; cor.wrapS = cor.wrapT = THREE.RepeatWrapping; cor.anisotropy = 8;
  const aspero = new THREE.CanvasTexture(a); aspero.wrapS = aspero.wrapT = THREE.RepeatWrapping;
  texturas[tipo] = { cor, aspero };
  return texturas[tipo]!;
};
/** as texturas assadas no Blender (pecas/blender/texturas.py), por tipo: cor, aspereza e relevo (normal) */
const assadas: Partial<Record<Tipo, { cor: THREE.Texture; aspero: THREE.Texture; normal: THREE.Texture }>> = {};
const carregarAssadas = async () => {
  const lista = ((cfg as unknown as { texturas?: string[] }).texturas ?? []);
  const loader = new THREE.TextureLoader();
  for (const tipo of ["claude", "tecido", "pele", "cabelo"] as Tipo[]) {
    const ach = (s: string) => lista.find((f) => f.startsWith(`${tipo}_${s}.`));
    const [c, a, n] = [ach("cor"), ach("aspero"), ach("normal")];
    if (!c || !a || !n) continue;
    const [cor, aspero, normal] = await Promise.all([c, a, n].map((f) => loader.loadAsync(staticFile("texturas/" + f))));
    cor.colorSpace = THREE.SRGBColorSpace;
    // mipmaps (o padrão do TextureLoader) e o máximo de anisotropia: a trama fina não serrilha de longe
    for (const t of [cor, aspero, normal]) { t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    assadas[tipo] = { cor, aspero, normal };
  }
};
const RELEVO: Partial<Record<Tipo, number>> = { claude: 0.7, tecido: 1.1, pele: 0.5, cabelo: 0.2 };
/**
 * O relevo (normal map) perde força com a distância da câmera: de perto a trama aparece; de longe ela ficaria menor
 * que um pixel e tremularia em movimento (o brilho de cada fio pulando de pixel em pixel). [começa, some] em metros.
 */
const FADE: Partial<Record<Tipo, [number, number]>> = { tecido: [2.6, 5.0], pele: [2.2, 4.5], claude: [3.2, 6.5], cabelo: [2.6, 5.0], pelo: [2.4, 4.8] };

const texturizar = (mat: THREE.MeshStandardMaterial) => {
  const tipo = TIPO[mat.name];
  if (!tipo || mat.map || mat.transparent) return;
  const b = assadas[tipo];
  if (b) {
    // material de verdade, assado no Blender: cor, aspereza e relevo
    mat.map = b.cor; mat.roughnessMap = b.aspero; mat.normalMap = b.normal;
    mat.normalScale.set(RELEVO[tipo] ?? 1, RELEVO[tipo] ?? 1);
    mat.needsUpdate = true;
    shaderDoMaterial(mat, tipo);
    return;
  }
  const t = fazerTextura(tipo);
  mat.map = t.cor; mat.roughnessMap = t.aspero; mat.needsUpdate = true;
  shaderDoMaterial(mat, tipo);
};

/**
 * O shader de cada material texturizado:
 *  - volume no Claude: o alto do corpo um pouco mais claro e a base mais escura, pela altura de cada ponto na peça
 *    (junto com o bisel largo, o olho envernizado e o recorte por trás, tira a cara de bloco chapado);
 *  - relevo que some de longe (FADE), para a textura não tremular no plano aberto.
 */
const shaderDoMaterial = (mat: THREE.MeshStandardMaterial, tipo: Tipo) => {
  const claude = tipo === "claude", cabelo = tipo === "cabelo", fade = FADE[tipo];
  if (!claude && !cabelo && !fade) return;
  // cabelo fosco (Vitório, 2026-11-20: "deixa mais fosco"): aspereza 0,7 sem o mapa (que multiplicava para baixo)
  // e menos reflexo do ambiente; o brilho fica largo e suave, e o volume vem da ponta mais clara de cada mecha
  if (cabelo) { mat.roughness = 0.7; mat.roughnessMap = null; mat.envMapIntensity = 0.5; }
  if (claude) mat.roughness = Math.max(mat.roughness, 0.55);
  mat.onBeforeCompile = (sh) => {
    const nl = String.fromCharCode(10);
    if (cabelo) {
      // cada mecha com a base mais escura e a ponta mais clara (pela altura do ponto na própria mecha)
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>" + nl + "varying float vAltura;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>" + nl + "vAltura = position.y;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>" + nl + "varying float vAltura;")
        .replace("#include <map_fragment>", "#include <map_fragment>" + nl + "diffuseColor.rgb *= mix(0.72, 1.22, smoothstep(-0.09, 0.08, vAltura));");
    }
    if (claude) {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>" + nl + "varying float vAltura;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>" + nl + "vAltura = position.y;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>" + nl + "varying float vAltura;")
        .replace("#include <map_fragment>", "#include <map_fragment>" + nl + "diffuseColor.rgb *= mix(0.74, 1.08, smoothstep(-0.42, 0.4, vAltura));");
    }
    if (fade && mat.normalMap) {
      const chunk = THREE.ShaderChunk.normal_fragment_maps.replace("mapN.xy *= normalScale;",
        `mapN.xy *= normalScale * (1.0 - 0.85 * smoothstep(${fade[0].toFixed(2)}, ${fade[1].toFixed(2)}, length(vViewPosition)));`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_maps>", chunk);
    }
  };
  mat.customProgramCacheKey = () => `tex-${tipo}`;
};

export const carregarKit = async (nomes: string[] = (cfg as { pecas: string[] }).pecas, opcoes: { textura?: boolean } = {}): Promise<Kit> => {
  if (opcoes.textura !== false) await carregarAssadas();
  const loader = new GLTFLoader();
  const kit: Kit = {};
  await Promise.all(nomes.map(async (n) => {
    const g = await loader.loadAsync(staticFile(`modelos/${n}.glb`));
    const root = g.scene.getObjectByName(n) ?? g.scene;
    // o dedo que aponta (..._dedoD) fica escondido até o gesto (rosto.ts)
    root.traverse((o) => { if (/_dedo[ED]$/.test(o.name)) o.visible = false; });
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.envMapIntensity = 1;
      opcoesTextura.ligada = opcoes.textura !== false;
      if (opcoes.textura !== false) texturizar(mat);
      if (mat.emissive && mat.emissive.getHex() > 0 && mat.emissiveIntensity > 1) m.castShadow = false; // lâmpada não faz sombra
      if (mat.transparent) { m.castShadow = false; mat.depthWrite = false; }
      // as placas finas de tela e de etiqueta ("_tela", "_face") ficam sem contorno: a borda delas, de poucos
      // milímetros, virava um tracejado que corria e tremulava em movimento
      if (/_(tela|face)$/.test(m.name)) m.layers.set(NOINK);
      // a pintura (material "tinta_*"): vão de porta, janelinha, boca do fogão, faixa. Detalhe fino desenhado em
      // geometria vira tracejado no contorno (o lado de 2 mm tem a normal virada e a dobra pisca); como tinta, ele
      // fica sem contorno e só a cor aparece (vídeo "Esc duas vezes", 2026-11-24)
      if (/^tinta/.test(mat.name)) m.layers.set(NOINK);
    });
    kit[n] = root;
  }));
  return kit;
};

/**
 * Uma cópia da peça, com materiais próprios (trocar a cor de uma não muda as outras).
 * `cores`: { nomeDoMaterial: "#hex" }, por exemplo { roupa: "#c84b3c", cabelo: "#e9c46a" } numa pessoa.
 * `brilho`: { nomeDoMaterial: intensidade } acende o material (passa do limite do bloom com mais de 1).
 */
export const peca = (kit: Kit, nome: string, o: { cores?: Record<string, string>; brilho?: Record<string, number>; escala?: number } = {}) => {
  const src = kit[nome];
  if (!src) throw new Error(`peça não carregada: ${nome}. Peças: ${Object.keys(kit).join(", ")}`);
  const c = src.clone(true);
  c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.setScalar(o.escala ?? 1);
  c.userData.escala = o.escala ?? 1; // a escala base: escalar(peca, [l, a, l]) multiplica por ela
  const feitos = new Map<THREE.Material, THREE.Material>();
  c.traverse((x) => {
    const m = x as THREE.Mesh;
    if (!m.isMesh) return;
    const orig = m.material as THREE.MeshStandardMaterial;
    if (!feitos.has(orig)) {
      const nm = orig.clone();
      if (TIPO[orig.name] && opcoesTextura.ligada) shaderDoMaterial(nm as THREE.MeshStandardMaterial, TIPO[orig.name]); // o clone não leva o shader
      const cor = o.cores?.[orig.name];
      if (cor) nm.color.set(cor);
      const b = o.brilho?.[orig.name];
      if (b !== undefined) { nm.emissive = new THREE.Color(cor ?? orig.color); nm.emissiveIntensity = b; }
      feitos.set(orig, nm);
    }
    m.material = feitos.get(orig)!;
  });
  return c;
};

/**
 * Põe o achatar/esticar (a escala [largura, altura, largura] do `entra`, do `pulo` ou do `achata`) na peça sem apagar
 * a escala base dela (o `escala` do `peca`): sempre use isto, e não `peca.scale.set(...e.escala)`.
 */
export const escalar = (o: THREE.Object3D, k: [number, number, number]) => {
  const b = (o.userData.escala as number | undefined) ?? 1;
  o.scale.set(b * k[0], b * k[1], b * k[2]);
};

/** uma parte da peça pelo nome (junta, tela, face) */
export const no = (raiz: THREE.Object3D, nome: string) => {
  const o = raiz.getObjectByName(nome);
  if (!o) throw new Error(`a peça não tem a parte "${nome}"`);
  return o;
};

/** os materiais de uma peça com aquele nome (para acender ou trocar cor a cada quadro) */
export const materiais = (raiz: THREE.Object3D, nome: string) => {
  const r = new Set<THREE.MeshStandardMaterial>();
  raiz.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).name === nome) r.add(m.material as THREE.MeshStandardMaterial); });
  return [...r];
};

/** a mesma peça em muitos lugares (árvores, pedras, tufos): uma InstancedMesh por malha */
export const muitas = (kit: Kit, nome: string, mats: THREE.Matrix4[]) => {
  const src = kit[nome];
  const g = new THREE.Group();
  src.updateMatrixWorld(true);
  const inv = src.matrixWorld.clone().invert();
  src.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = m.geometry.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld));
    const im = new THREE.InstancedMesh(geo, m.material, mats.length);
    mats.forEach((x, i) => im.setMatrixAt(i, x));
    im.castShadow = true; im.receiveShadow = true;
    im.computeBoundingSphere();
    g.add(im);
  });
  return g;
};

// ---------------- escrever em telas e placas ----------------
export type Desenho = (g: CanvasRenderingContext2D, W: number, H: number) => void;
export type Escrita = { redesenhar: (chave: string, d: Desenho) => void; plano: THREE.Mesh; largura: number; altura: number };

/**
 * Põe um desenho (texto, tela de programa) na frente de uma parte "_tela" ou "_face" da peça, sem contorno.
 * Na "_face" (placa, papel, etiqueta), o desenho recebe a luz e a sombra da cena: desenhe só as letras, com fundo
 * transparente, e a cor de fundo fica com a própria peça. Na "_tela", ele acende sozinho (tela de verdade).
 * Devolve `redesenhar(chave, desenho)`: só redesenha quando a chave muda (use o texto ou o número do quadro).
 */
export const escrever = (raiz: THREE.Object3D, parte: string, desenho: Desenho, pxPorMetro = 6000, luz = !parte.endsWith("_tela")): Escrita => {
  const face = no(raiz, parte) as THREE.Mesh;
  face.geometry.computeBoundingBox();
  const bb = face.geometry.boundingBox!;
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  const canvas = document.createElement("canvas");
  const esc = Math.min(1, 2048 / Math.max(w * pxPorMetro, h * pxPorMetro));
  // a escala da peça conta (uma caixa 2x maior pede a etiqueta 2x mais fina); no mínimo 512 px no lado maior
  raiz.updateMatrixWorld(true);
  const sw = new THREE.Vector3(); face.getWorldScale(sw);
  const fator = Math.max(1, sw.x, sw.y, 512 / Math.max(1, Math.max(w, h) * pxPorMetro));
  canvas.width = Math.min(2048, Math.max(64, Math.round(w * pxPorMetro * esc * fator))); canvas.height = Math.min(2048, Math.max(64, Math.round(h * pxPorMetro * esc * fator)));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  // placa e papel ("_face") recebem a luz da cena, como tinta; tela ("_tela") acende sozinha
  const mat = luz ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.8 }) : new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plano.receiveShadow = luz;
  // 3 mm à frente e com polygonOffset: sem isso, o desenho e a peça disputam a mesma profundidade e piscam
  plano.position.set((bb.max.x + bb.min.x) / 2, (bb.max.y + bb.min.y) / 2, bb.max.z + 0.003);
  (plano.material as THREE.Material).polygonOffset = true; (plano.material as THREE.Material).polygonOffsetFactor = -2; (plano.material as THREE.Material).polygonOffsetUnits = -2;
  plano.layers.set(NOINK);
  plano.renderOrder = 3;
  face.add(plano);
  let chave = "";
  const redesenhar = (k: string, d: Desenho) => {
    if (k === chave) return;
    chave = k;
    const g = canvas.getContext("2d")!;
    g.clearRect(0, 0, canvas.width, canvas.height);
    d(g, canvas.width, canvas.height);
    tex.needsUpdate = true;
  };
  redesenhar("inicio", desenho);
  return { redesenhar, plano, largura: w, altura: h };
};

/** desenho de texto centrado, com a maior fonte que cabe (até `linhas` linhas) */
export const texto = (t: string, o: { cor?: string; fundo?: string; fonte?: string; peso?: number; margem?: number; linhas?: number; destaque?: { palavra: string; cor: string } } = {}): Desenho => (g, W, H) => {
  if (o.fundo) { g.fillStyle = o.fundo; g.fillRect(0, 0, W, H); }
  const m = (o.margem ?? 0.1) * Math.min(W, H);
  const fam = o.fonte ?? "Inter", peso = o.peso ?? 900;
  const palavras = t.split(" ");
  const quebrar = (fs: number) => {
    g.font = `${peso} ${fs}px "${fam}"`;
    const ls: string[] = []; let cur = "";
    for (const p of palavras) { const tt = cur ? cur + " " + p : p; if (g.measureText(tt).width <= W - 2 * m || !cur) cur = tt; else { ls.push(cur); cur = p; } }
    if (cur) ls.push(cur);
    return ls;
  };
  let fs = H, ls = quebrar(fs);
  while (fs > 8 && (ls.length > (o.linhas ?? 3) || ls.length * fs * 1.08 > H - 2 * m || ls.some((l) => g.measureText(l).width > W - 2 * m))) { fs *= 0.94; ls = quebrar(fs); }
  g.textAlign = "center"; g.textBaseline = "middle";
  const y0 = H / 2 - ((ls.length - 1) * fs * 1.08) / 2;
  ls.forEach((l, i) => {
    if (o.destaque && l.includes(o.destaque.palavra)) {
      const [a, b] = l.split(o.destaque.palavra);
      const wa = g.measureText(a).width, wd = g.measureText(o.destaque.palavra).width, wt = g.measureText(l).width;
      let x = W / 2 - wt / 2;
      g.textAlign = "left";
      g.fillStyle = o.cor ?? "#2a1d14"; g.fillText(a, x, y0 + i * fs * 1.08); x += wa;
      g.fillStyle = o.destaque.cor; g.fillText(o.destaque.palavra, x, y0 + i * fs * 1.08); x += wd;
      g.fillStyle = o.cor ?? "#2a1d14"; g.fillText(b, x, y0 + i * fs * 1.08);
      g.textAlign = "center";
    } else {
      g.fillStyle = o.cor ?? "#2a1d14";
      g.fillText(l, W / 2, y0 + i * fs * 1.08);
    }
  });
};
