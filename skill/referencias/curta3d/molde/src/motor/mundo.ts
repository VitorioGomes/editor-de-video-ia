// A luz e o céu do estilo: sol quente (o único que faz sombra), céu frio de preenchimento (luz em dois tons),
// luz de recorte fria por trás, ambiente suave e neblina da cor do horizonte. Valores do vídeo do /btw.
// Luz pensada para o personagem em cada plano: com `luz: "frente"` (o padrão), a principal gira com a câmera e fica
// de três quartos pela frente do assunto (uns 43 graus para o lado, 36 de altura), e o recorte fica sempre atrás
// dele. Com `luz: "contra"`, o sol fica onde o look manda (o contraluz do fim de tarde, para plano aberto).
import * as THREE from "three";
import { NOINK } from "./fx/ink";

export type Look = {
  skyTop: string; skyMid: string; horizon: string; sunGlow: string; fog: string; fogNear: number; fogFar: number;
  sun: string; sunI: number; sunDir: [number, number, number]; hemiSky: string; hemiGround: string; hemiI: number; env: number; rim: number;
  /** estrelas no céu (0 = nenhuma, 1 = muitas) */
  estrelas?: number;
  /** a cor da luz de lado nos closes (`luz: "lado"`): na noite, a lâmpada quente do terraço */
  ladoCor?: string;
  /** quanto o Claude brilha na própria cor (0 a 0,3). À noite, a luz principal é a lua fria, e laranja sob luz azul
   *  vira vinho escuro: um pouco de cor própria segura o laranja da marca (o Claude nunca sai vinho) */
  claudeProprio?: number;
};

/** "tarde": o fim de tarde do /btw (sol baixo e quente). "dia": meio da manhã, mais neutro. */
export const LOOKS: Record<string, Look> = {
  tarde: {
    skyTop: "#4f8ddc", skyMid: "#8fbdf0", horizon: "#f7e6cf", sunGlow: "#ffd9a8", fog: "#e9e2d6", fogNear: 70, fogFar: 430,
    sun: "#ffd7a6", sunI: 3.1, sunDir: [-0.45, 0.42, -0.79], hemiSky: "#a9c9ff", hemiGround: "#6d8c4b", hemiI: 0.95, env: 0.38, rim: 0.9,
  },
  dia: {
    skyTop: "#3e7fd2", skyMid: "#86b6ec", horizon: "#dfeaf4", sunGlow: "#fff1d6", fog: "#dde6ee", fogNear: 60, fogFar: 380,
    sun: "#fff0dc", sunI: 3.0, sunDir: [-0.4, 0.62, -0.68], hemiSky: "#b8d4ff", hemiGround: "#6f8f50", hemiI: 1.0, env: 0.4, rim: 0.7,
  },
  /** noite com lua (o Estilo Conversa, o terraço): céu azul-marinho com estrelas, horizonte aceso pela cidade,
   *  a lua como luz principal fria (girada para a frente do assunto no plano de personagem), recorte frio forte;
   *  a luz quente vem das luzes da cena (cordão, poste), que a cena acende com luzes de verdade. */
  noite: {
    skyTop: "#070b1c", skyMid: "#111a38", horizon: "#3a2f4a", sunGlow: "#9fb4ff", fog: "#151b33", fogNear: 35, fogFar: 320,
    sun: "#c4d2ff", sunI: 2.2, sunDir: [0.42, 0.33, -0.84], hemiSky: "#3a4a80", hemiGround: "#2a1e18", hemiI: 0.42, env: 0.22, rim: 1.5, estrelas: 1, ladoCor: "#ffb062", claudeProprio: 0.26,
  },
  /** dentro de um galpão escuro (o depósito): sem céu (o alto some no escuro, como um teto), neblina morna e
   *  escura que apaga os fundos, principal quente (a das luminárias) e recorte frio por trás */
  interior: {
    skyTop: "#0b0908", skyMid: "#120e0b", horizon: "#22190f", sunGlow: "#000000", fog: "#1c150f", fogNear: 12, fogFar: 70,
    sun: "#ffc98a", sunI: 2.4, sunDir: [-0.3, 0.75, -0.55], hemiSky: "#6a5440", hemiGround: "#22180f", hemiI: 0.55, env: 0.22, rim: 1.3, ladoCor: "#ffb062",
  },
  /** os cômodos (escritório, quarto, café, sala de aula): o "sol" é a luz principal do cômodo, girada para a frente
   *  do assunto; o céu não aparece (as paredes fecham); a neblina, longe, só tira o duro do fundo */
  escritorio: {
    skyTop: "#cfd8e2", skyMid: "#dfe6ec", horizon: "#eef0f0", sunGlow: "#000000", fog: "#d6dbe0", fogNear: 25, fogFar: 140,
    sun: "#fff4e6", sunI: 2.1, sunDir: [-0.5, 0.6, 0.6], hemiSky: "#e2eaf3", hemiGround: "#7a7468", hemiI: 0.6, env: 0.28, rim: 0.9, ladoCor: "#ffe2c0",
  },
  quarto: {
    skyTop: "#0c0b16", skyMid: "#141228", horizon: "#201a33", sunGlow: "#000000", fog: "#1a1628", fogNear: 20, fogFar: 90,
    sun: "#c9d2ff", sunI: 1.7, sunDir: [0.4, 0.5, 0.75], hemiSky: "#4a4074", hemiGround: "#2a2018", hemiI: 0.5, env: 0.2, rim: 1.4, ladoCor: "#b48cff", claudeProprio: 0.22,
  },
  cafe: {
    skyTop: "#e9c9a2", skyMid: "#f0d8b8", horizon: "#f6e4cc", sunGlow: "#000000", fog: "#e4cfb4", fogNear: 25, fogFar: 140,
    sun: "#ffd2a0", sunI: 2.6, sunDir: [-0.7, 0.45, 0.4], hemiSky: "#ffdcb0", hemiGround: "#6a4a30", hemiI: 0.75, env: 0.3, rim: 1.1, ladoCor: "#ffb062",
  },
  sala: {
    skyTop: "#dfe8f0", skyMid: "#e8eef2", horizon: "#f2f2ee", sunGlow: "#000000", fog: "#e2e6e6", fogNear: 25, fogFar: 140,
    sun: "#fff6ea", sunI: 2.6, sunDir: [-0.7, 0.55, 0.3], hemiSky: "#e6eef5", hemiGround: "#9a9080", hemiI: 1.0, env: 0.38, rim: 0.7, ladoCor: "#fff0d8",
  },
  /** estúdio: fundo infinito escuro em degradê, luz principal de estúdio e recorte forte (uma coisa no centro) */
  estudio: {
    skyTop: "#0b0e15", skyMid: "#121722", horizon: "#1d2433", sunGlow: "#000000", fog: "#141925", fogNear: 25, fogFar: 120,
    sun: "#fff1de", sunI: 2.0, sunDir: [-0.45, 0.7, 0.55], hemiSky: "#5a6688", hemiGround: "#1a1a22", hemiI: 0.45, env: 0.25, rim: 1.6, ladoCor: "#ffd2a0",
  },
};

export class Mundo {
  readonly root = new THREE.Group();
  readonly sol: THREE.DirectionalLight;
  readonly sunDir: THREE.Vector3;
  readonly fog: THREE.Fog;
  private ceu: THREE.Mesh;
  private rim: THREE.DirectionalLight;
  private dir = new THREE.Vector3();
  private lado: number;
  constructor(readonly look: Look) {
    this.sunDir = new THREE.Vector3(...look.sunDir).normalize();
    this.fog = new THREE.Fog(look.fog, look.fogNear, look.fogFar);
    this.sol = new THREE.DirectionalLight(look.sun, look.sunI);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(4096, 4096);
    this.sol.shadow.bias = -0.0003; this.sol.shadow.normalBias = 0.025; this.sol.shadow.radius = 3.5;
    this.sol.shadow.camera.near = 1; this.sol.shadow.camera.far = 260;
    this.root.add(this.sol, this.sol.target);
    this.root.add(new THREE.HemisphereLight(look.hemiSky, look.hemiGround, look.hemiI));
    this.rim = new THREE.DirectionalLight("#a9c8ff", look.rim * 1.3);
    this.rim.position.set(-this.sunDir.x, 0.5, -this.sunDir.z).multiplyScalar(100);
    this.root.add(this.rim, this.rim.target);
    this.lado = this.sunDir.x >= 0 ? 1 : -1;
    const c = (h: string) => new THREE.Color(h);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: c(look.skyTop) }, mid: { value: c(look.skyMid) }, hor: { value: c(look.horizon) }, glow: { value: c(look.sunGlow) }, sunDir: { value: this.sunDir }, quadro: { value: 0 }, estrelas: { value: look.estrelas ?? 0 } },
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 glow; uniform vec3 sunDir; uniform float quadro; uniform float estrelas; varying vec3 vD;
        void main(){ float y = max(vD.y, 0.0);
          vec3 col = mix(hor, mid, smoothstep(0.0, 0.16, y)); col = mix(col, top, smoothstep(0.12, 0.6, y));
          float s = max(dot(normalize(vD), sunDir), 0.0); col += glow * (pow(s, 6.0) * 0.35 + pow(s, 60.0) * 0.8);
          if (vD.y < 0.0) col = hor;
          if (estrelas > 0.0 && vD.y > 0.04) {
            vec3 q = floor(normalize(vD) * 700.0);
            float h = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
            float tw = 0.6 + 0.4 * sin(quadro * 0.37 + h * 40.0);
            col += vec3(1.0, 0.97, 0.9) * step(1.0 - 0.0016 * estrelas, h) * tw * smoothstep(0.04, 0.25, vD.y) * 1.6;
          }
          // dither de 1 nível de cor, que muda com o quadro: o degradê grande não vira degraus depois da compressão
          float n = fract(sin(dot(gl_FragCoord.xy + quadro * vec2(17.0, 31.0), vec2(12.9898, 78.233))) * 43758.5453);
          col += (n - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0); }`,
    });
    this.ceu = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), mat);
    this.ceu.layers.set(NOINK);
    this.ceu.frustumCulled = false;
    this.ceu.renderOrder = -10;
    this.root.add(this.ceu);
  }

  /** a cada quadro: o céu acompanha a câmera e a sombra do sol cobre o ponto de foco (encaixada na grade, sem tremer) */
  /**
   * `luz`: "frente" (três quartos pela frente), "contra" (o sol do look) ou "lado" (o close de rosto: a principal
   * quente bem de lado e mais baixa, com o outro lado do rosto na sombra, como o sol da referência).
   */
  seguir(cam: THREE.Camera, foco: THREE.Vector3, f = 0, luz: "frente" | "contra" | "lado" = "frente") {
    this.ceu.position.copy(cam.position);
    (this.ceu.material as THREE.ShaderMaterial).uniforms.quadro.value = f % 97;
    // a direção da principal neste quadro
    const v = new THREE.Vector3().subVectors(cam.position, foco).setY(0);
    this.sol.color.set(luz === "lado" ? this.look.ladoCor ?? this.look.sun : this.look.sun);
    this.sol.intensity = this.look.sunI * (luz === "lado" ? 1.8 : 1);
    // o recorte frio por trás separa o personagem do fundo escuro; no close, mais forte
    this.rim.intensity = this.look.rim * 1.3 * (luz === "lado" ? 1.8 : 1);
    if (luz !== "contra" && v.lengthSq() > 1e-6) {
      v.normalize();
      const az = Math.atan2(v.x, v.z) + (luz === "lado" ? 1.32 : 0.75) * this.lado, el = luz === "lado" ? 0.38 : 0.62;
      this.dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      // recorte: atrás do assunto em relação à câmera, um pouco para o outro lado, alto
      const azr = Math.atan2(-v.x, -v.z) - 0.45 * this.lado;
      this.rim.position.set(foco.x + Math.sin(azr) * 80, foco.y + 55, foco.z + Math.cos(azr) * 80);
      this.rim.target.position.copy(foco);
    } else {
      this.dir.copy(this.sunDir);
      this.rim.position.set(foco.x - this.sunDir.x * 100, foco.y + 50, foco.z - this.sunDir.z * 100);
      this.rim.target.position.copy(foco);
    }
    this.rim.target.updateMatrixWorld();
    const dist = foco.distanceTo(cam.position);
    const half = THREE.MathUtils.clamp(dist * 1.15, 6, 46);
    const sc = this.sol.shadow.camera;
    if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
    const texel = (2 * half) / 4096;
    const zA = this.dir.clone().negate(), xA = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), zA).normalize(), yA = new THREE.Vector3().crossVectors(zA, xA);
    const fx = Math.round(foco.dot(xA) / texel) * texel, fy = Math.round(foco.dot(yA) / texel) * texel, fz = foco.dot(zA);
    const p = xA.multiplyScalar(fx).add(yA.multiplyScalar(fy)).add(zA.multiplyScalar(fz));
    this.sol.target.position.copy(p);
    this.sol.position.copy(p).addScaledVector(this.dir, 120);
    this.sol.target.updateMatrixWorld();
  }
}
