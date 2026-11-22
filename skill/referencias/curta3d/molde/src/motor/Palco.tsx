// O palco 3D com o acabamento do estilo (da skill cartoon-3d-short, MIT, Mr omi 2026, com os valores do /btw):
//   render (MSAA 4) -> sombra de contato (N8AO) -> contorno (InkPass) -> desfoque de profundidade (lens blur)
//   -> brilho só no que acende (bloom, limiar 1) -> tone map NEUTRAL -> tratamento de cor (grade)
// A cena (src/cena.ts) monta o mundo uma vez e diz, a cada quadro, a câmera, o ponto de foco e o desfoque.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { N8AOPostPass } from "n8ao";
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { InkPass, InkOptions } from "./fx/ink";
import { LensBlur } from "./fx/lensblur";
import { GradeEffect, GradeParams } from "./fx/grade";
import { Mundo, Look, LOOKS } from "./mundo";
import { Kit, carregarKit } from "./kit";
import { Cam } from "./camera";
import { V3 } from "./tempo";
import cfg from "../gerado/config.json";

export type Contexto = { kit: Kit; mundo: Mundo; root: THREE.Group; gl: THREE.WebGLRenderer };
/** `luz`: "frente" (padrão: a principal de três quartos pela frente do assunto), "contra" (o sol do look, para plano aberto)
 *  ou "lado" (close de rosto: a principal quente de lado, com sombra no outro lado do rosto) */
export type Pose = { cam: Cam; foco: V3 | null; cInf: number; luz?: "frente" | "contra" | "lado" };
/**
 * `contorno`: opções do traço (InkPass) por cima do padrão, ou false para tirar. No Estilo Conversa, o traço fica
 * discreto e só na silhueta (`CONTORNO_DISCRETO`): o volume vem da luz e do material, como na referência.
 * `vinheta`: força do escurecido nas bordas (0,24 no padrão; à noite, menos, para a borda não virar faixa preta).
 * `granulado`: a força do grão do tratamento de cor (0,012 no padrão) e se ele fica parado entre os quadros. À noite,
 *  com muita área escura, o grão que muda a cada quadro vira tremido: use { forca: 0.005, fixo: true }.
 */
export type Cena = { look?: Look; construir: (c: Contexto) => void; posar: (f: number) => Pose; contorno?: Partial<InkOptions> | false; vinheta?: number; granulado?: { forca: number; fixo?: boolean } };
/** traço fino, de espessura quase constante, só na silhueta (sem as linhas de dobra por dentro do corpo) */
export const CONTORNO_DISCRETO: Partial<InkOptions> = { widthNear: 1.7, widthFar: 1.3, creaseScale: 0, concaveGain: 0, strength: 0.75, farOpacity: 0.6, color: "#1a1210" };

/** grade do /btw: curva em S suave, um pouco mais de cor nos meios, sombra levemente fria, luz quente, vinheta leve */
const GRADE: GradeParams = {
  ky: [0.0, 0.075, 0.24, 0.56, 0.83, 0.945, 1],
  sat: [1.02, 1.16, 1.04],
  tintS: [0.018, -0.004], tintM: [0, 0.004], tintH: [-0.01, 0.008],
  vig: [0.24, 0.38],
};

type Chaves = { ink: boolean; lens: boolean; ao: boolean; bloom: boolean; grade: boolean };
const chaves = (): Chaves => ({ ink: true, lens: true, ao: true, bloom: true, grade: true, ...((getInputProps() as { post?: Partial<Chaves> }).post ?? {}) });

const fazerBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.62 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

/** as fontes da marca da pessoa (sistema/padrao.json + meu-estilo/marca.json), para a legenda e o texto das placas */
export const carregarFontes = async () => {
  for (const f of (cfg as { arquivos: { familia: string; arquivo: string; peso: number; estilo: string }[] }).arquivos) {
    const face = new FontFace(f.familia, `url(${staticFile("fontes/" + f.arquivo)})`, { weight: String(f.peso), style: f.estilo });
    await face.load(); document.fonts.add(face);
  }
  await document.fonts.ready;
};

const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();

const Dentro: React.FC<{ kit: Kit; cena: Cena }> = ({ kit, cena }) => {
  const f = useCurrentFrame();
  const { camera, scene, gl } = useThree();
  const on = useMemo(chaves, []);
  const mundo = useMemo(() => {
    const m = new Mundo(cena.look ?? LOOKS.tarde);
    cena.construir({ kit, mundo: m, root: m.root, gl });
    // o laranja do Claude segura à noite (ver Look.claudeProprio)
    const proprio = m.look.claudeProprio ?? 0;
    if (proprio > 0) m.root.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh) return;
      for (const mat of (Array.isArray(me.material) ? me.material : [me.material]) as THREE.MeshStandardMaterial[]) {
        if (mat.name !== "claude" || !mat.emissive) continue;
        mat.emissive.copy(mat.color).multiplyScalar(proprio); if (mat.map) mat.emissiveMap = mat.map;
      }
    });
    return m;
  }, [kit, gl, cena]);
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = mundo.look.env;
    scene.background = null;
    scene.fog = mundo.fog;
  }, [gl, scene, mundo]);
  const cam = camera as THREE.PerspectiveCamera;
  // compositor montado à mão (o <EffectComposer> do @react-three/postprocessing não desenha no render do Remotion)
  const fx = useMemo(() => {
    const ink = new InkPass(scene, cam, { widthNear: 4.0, widthFar: 2.2, distNear: 4, distFar: 80, color: "#160f0b", strength: 1.0, farOpacity: 0.8, creaseScale: 0.7, angleLo: 38, angleHi: 55, concaveGain: 0.45, ...(cena.contorno || {}) });
    const lens = new LensBlur({ maxCoC: 26, nearScale: 1.25 });
    const composer = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, cam));
    const W = gl.domElement.width, H = gl.domElement.height;
    if (on.ao) {
      const ao = new N8AOPostPass(scene, cam, W, H);
      Object.assign(ao.configuration, { aoRadius: 1.5, distanceFalloff: 0.9, intensity: 1.6, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 10, gammaCorrection: false, halfRes: false, color: new THREE.Color("#2e2724") });
      // intensidade 1,6 e cor quase neutra: com 2,4 e roxo, o laranja do Claude virava tijolo nas sombras
      composer.addPass(ao);
    }
    if (on.ink && cena.contorno !== false) composer.addPass(ink);
    if (on.lens) { composer.addPass(new EffectPass(cam, lens.pre)); composer.addPass(new EffectPass(cam, lens.main)); }
    const grade = new GradeEffect(cena.vinheta !== undefined ? { ...GRADE, vig: [cena.vinheta, GRADE.vig[1]] } : GRADE, 1);
    const fim = [on.bloom ? fazerBloom() : null, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), on.grade ? grade : null].filter(Boolean) as Effect[];
    composer.addPass(new EffectPass(cam, ...fim));
    composer.setSize(W, H, false);
    if (cena.granulado) grade.uniforms.get("gradeGrain")!.value = cena.granulado.forca;
    return { composer, lens, grade };
  }, [gl, scene, cam, on, cena]);
  useEffect(() => () => { fx.composer.dispose(); }, [fx]);
  useFrame(() => { fx.composer.render(); }, 1);

  const p = cena.posar(f);
  const c = p.cam;
  cam.position.set(...c.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(...c.look);
  cam.rotateZ(c.roll);
  if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
  const foco = new THREE.Vector3(...(p.foco ?? c.look));
  mundo.seguir(cam, foco, f, p.luz ?? "frente");
  fx.grade.semente = cena.granulado?.fixo ? 0 : f;
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, tmp.copy(foco).sub(cam.position).dot(fwd));
  fx.lens.cInf = p.cInf;
  return <primitive object={mundo.root} dispose={null} />;
};

/** o palco: carrega as peças e as fontes antes do primeiro quadro */
export const Palco: React.FC<{ cena: Cena; pecas?: string[] }> = ({ cena, pecas }) => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [h] = useState(() => delayRender("peças e fontes", { timeoutInMilliseconds: 120000 }));
  useEffect(() => { (async () => { await carregarFontes(); const k = await carregarKit(pecas); setKit(k); continueRender(h); })(); }, [h, pecas]);
  if (!kit) return null;
  return (
    <ThreeCanvas width={1080} height={1920} shadows="percentage" gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 38, near: 0.2, far: 2500 }}>
      <Dentro kit={kit} cena={cena} />
    </ThreeCanvas>
  );
};
