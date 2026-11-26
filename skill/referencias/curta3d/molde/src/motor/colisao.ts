// A conferência de colisão quadro a quadro: nada atravessa nada e nada flutua (vídeo "Lembrou de algo no meio da
// tarefa", teste 2, 2026-11-25: o Vitório reprovou três vezes por sobreposição, a última com o cabo do rolo dentro do
// Claude e a seta entrando no botão).
//
// Como funciona: a cena exporta COLISAO(), que diz os CORPOS (cada um é um grupo de malhas: o Claude sem os braços,
// o braço direito dele, o cabo do rolo, o balancim, o chão...), os pares que PODEM se tocar (a mão e o que ela segura,
// a roldana e o cabo em que ela corre) e os APOIOS (quem tem de estar apoiado em quem, e quando). O scripts/colisao.mjs
// monta a cena sozinha no navegador, anda pelo vídeo inteiro com passo curto e, em cada quadro:
//   - ATRAVESSA: para cada par de corpos que não podem se tocar e cujas caixas se cruzam, espalha pontos na superfície
//     de cada malha (pela área, mais os vértices) e pergunta quais estão DENTRO da malha do outro (raio com contagem
//     de cruzamentos, numa BVH). A profundidade é a distância do ponto até a superfície do outro. Acima da tolerância
//     (1 cm), é uma peça entrando na outra. Encostar (profundidade quase zero) passa;
//   - FLUTUA: para cada apoio ativo, mede a menor distância entre os pontos mais baixos do corpo e a superfície de
//     quem o sustenta. Acima da folga (1,5 cm), está flutuando.
// As malhas precisam ser fechadas (caixa, cilindro, esfera, toro, torno; o TubeGeometry aberto do three.js não serve).
// Planos (o texto das placas), vidro e o que não se vê ficam de fora.
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";

export type Corpo = { nome: string; malhas: () => THREE.Mesh[] };
/** dois corpos que podem se encostar e entrar um no outro (a mão e o cabo que ela segura), sempre ou só quando */
export type Toque = [string, string, ((f: number) => boolean)?];
/** o corpo `de` tem de estar apoiado num dos corpos `sobre` nos quadros em que `quando` é verdade */
export type Apoio = { de: string; sobre: string[]; quando?: (f: number) => boolean };
/** um ponto que não pode tremer fora das ações (a mão de um personagem parado): `ponto()` no mundo, `acao(f)` = em ação */
export type Quieto = { nome: string; ponto: () => THREE.Vector3; acao?: (f: number) => boolean };
export type RegrasColisao = { corpos: Corpo[]; podemTocar: Toque[]; apoios: Apoio[]; quietos?: Quieto[]; tolerancia?: number; folga?: number };
export type Achado = { f: number; tipo: "atravessa" | "flutua" | "camera" | "estado" | "treme"; a: string; b: string; cm: number; onde: [number, number, number] };

/** as malhas visíveis de uma raiz; `so`: só dentro destes nós; `sem`: tirando estes nós (pelo nome) */
export const malhasDe = (raiz: THREE.Object3D, o: { so?: string[]; sem?: string[] } = {}) => (): THREE.Mesh[] => {
  const r: THREE.Mesh[] = [];
  const andar = (x: THREE.Object3D, dentro: boolean) => {
    if (!x.visible) return;
    if (o.sem?.includes(x.name)) return;
    const d = dentro || !o.so || o.so.includes(x.name);
    const m = x as THREE.Mesh;
    if (m.isMesh && d && serve(m)) r.push(m);
    for (const c of x.children) andar(c, d);
  };
  andar(raiz, false);
  return r;
};
const serve = (m: THREE.Mesh) => {
  if (m.userData.semColisao) return false;
  const g = m.geometry as THREE.BufferGeometry;
  if (!g || !g.attributes.position || (g as THREE.PlaneGeometry).type === "PlaneGeometry") return false;
  const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
  if (mat && mat.transparent && !mat.depthWrite) return false; // texto por cima das placas, vidro
  if ((m as unknown as THREE.Points).isPoints || (m as unknown as THREE.InstancedMesh).isInstancedMesh) return false;
  return true;
};

type Dados = { bvh: MeshBVH; pts: Float32Array; caixa: THREE.Box3 };
const cache = new WeakMap<THREE.BufferGeometry, Dados>();
const dados = (g: THREE.BufferGeometry): Dados => {
  let d = cache.get(g);
  if (d) return d;
  const bvh = new MeshBVH(g, { indirect: true });
  const pos = g.attributes.position, idx = g.index;
  const tri = (k: number) => (idx ? [idx.getX(3 * k), idx.getX(3 * k + 1), idx.getX(3 * k + 2)] : [3 * k, 3 * k + 1, 3 * k + 2]);
  const n = idx ? idx.count / 3 : pos.count / 3;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const areas: number[] = []; let total = 0;
  for (let k = 0; k < n; k++) { const [a, b, c] = tri(k); A.fromBufferAttribute(pos, a); B.fromBufferAttribute(pos, b); C.fromBufferAttribute(pos, c); const s = B.sub(A).cross(C.sub(A)).length() / 2; areas.push(s); total += s; }
  // pontos pela área (1 a cada ~4 cm² até 2.500) e todos os vértices (até 1.500)
  const N = Math.max(150, Math.min(2500, Math.round(total / 0.0004)));
  const lista: number[] = [];
  let semente = 12345; const R = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
  const acum: number[] = []; let s = 0; for (const a of areas) { s += a; acum.push(s); }
  for (let i = 0; i < N; i++) {
    const alvo = R() * total; let lo = 0, hi = acum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (acum[m] < alvo) lo = m + 1; else hi = m; }
    const [a, b, c] = tri(lo); let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    A.fromBufferAttribute(pos, a); B.fromBufferAttribute(pos, b); C.fromBufferAttribute(pos, c);
    lista.push(A.x + (B.x - A.x) * u + (C.x - A.x) * v, A.y + (B.y - A.y) * u + (C.y - A.y) * v, A.z + (B.z - A.z) * u + (C.z - A.z) * v);
  }
  const passo = Math.max(1, Math.floor(pos.count / 1500));
  for (let i = 0; i < pos.count; i += passo) lista.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  g.computeBoundingBox();
  d = { bvh, pts: new Float32Array(lista), caixa: g.boundingBox!.clone() };
  cache.set(g, d);
  return d;
};

const DIRS = [new THREE.Vector3(0.5773, 0.5774, 0.5774).normalize(), new THREE.Vector3(-0.31, 0.83, -0.46).normalize()];
const raio = new THREE.Ray();
/** dentro da malha fechada: o raio cruza a superfície um número ímpar de vezes (nas duas direções, para não errar na quina) */
const dentro = (bvh: MeshBVH, p: THREE.Vector3) => {
  let votos = 0;
  for (const d of DIRS) {
    raio.origin.copy(p); raio.direction.copy(d);
    const hits = bvh.raycast(raio, THREE.DoubleSide).filter((h) => h.distance > 1e-6);
    if (hits.length % 2 === 1) votos++;
  }
  return votos === 2;
};

const P = new THREE.Vector3(), Q = new THREE.Vector3(), W = new THREE.Vector3(), inv = new THREE.Matrix4(), M = new THREE.Matrix4();
const alvoPerto = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 } as unknown as { point: THREE.Vector3; distance: number; faceIndex: number };

/** a maior entrada dos pontos de `a` dentro de `b` (em metros, no mundo) e onde */
const entrada = (a: THREE.Mesh, b: THREE.Mesh) => {
  const da = dados(a.geometry as THREE.BufferGeometry), db = dados(b.geometry as THREE.BufferGeometry);
  inv.copy(b.matrixWorld).invert();
  M.multiplyMatrices(inv, a.matrixWorld);
  const caixa = db.caixa;
  let pior = 0; const onde: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < da.pts.length; i += 3) {
    P.set(da.pts[i], da.pts[i + 1], da.pts[i + 2]).applyMatrix4(M);
    if (!caixa.containsPoint(P)) continue;
    if (!dentro(db.bvh, P)) continue;
    db.bvh.closestPointToPoint(P, alvoPerto as never);
    // a distância no mundo (a peça pode estar achatada ou esticada)
    W.copy(P).applyMatrix4(b.matrixWorld); Q.copy(alvoPerto.point).applyMatrix4(b.matrixWorld);
    const d = W.distanceTo(Q);
    if (d > pior) { pior = d; onde[0] = W.x; onde[1] = W.y; onde[2] = W.z; }
  }
  return { pior, onde };
};

const caixaMundo = (m: THREE.Mesh) => dados(m.geometry as THREE.BufferGeometry).caixa.clone().applyMatrix4(m.matrixWorld);

/** a menor distância entre os pontos mais baixos de `a` (até 1 cm acima do ponto mais baixo) e a superfície de `b` */
const vao = (a: THREE.Mesh[], b: THREE.Mesh[]) => {
  let ymin = Infinity;
  const pontos: THREE.Vector3[] = [];
  for (const m of a) { const d = dados(m.geometry as THREE.BufferGeometry); for (let i = 0; i < d.pts.length; i += 3) { const p = new THREE.Vector3(d.pts[i], d.pts[i + 1], d.pts[i + 2]).applyMatrix4(m.matrixWorld); pontos.push(p); if (p.y < ymin) ymin = p.y; } }
  const baixos = pontos.filter((p) => p.y < ymin + 0.01);
  const passo = Math.max(1, Math.floor(baixos.length / 80));
  let menor = Infinity; const onde: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < baixos.length; i += passo) {
    const p = baixos[i];
    for (const m of b) {
      const d = dados(m.geometry as THREE.BufferGeometry);
      inv.copy(m.matrixWorld).invert();
      P.copy(p).applyMatrix4(inv);
      d.bvh.closestPointToPoint(P, alvoPerto as never);
      Q.copy(alvoPerto.point).applyMatrix4(m.matrixWorld);
      const dist = p.distanceTo(Q);
      if (dist < menor) { menor = dist; onde[0] = p.x; onde[1] = p.y; onde[2] = p.z; }
    }
  }
  return { menor, onde };
};

/**
 * Anda pelo vídeo de `de` a `ate` com `passo` quadros: `posar(f)` põe a cena no quadro (e atualiza as matrizes).
 * Devolve todos os achados (um por par e por quadro: o pior ponto).
 */
export const conferirColisoes = (regras: RegrasColisao, posar: (f: number) => [number, number, number] | void, de: number, ate: number, passo = 1, aviso?: (s: string) => void): Achado[] => {
  const tol = regras.tolerancia ?? 0.01, folga = regras.folga ?? 0.015;
  const achados: Achado[] = [];
  const pode = (a: string, b: string, f: number) => regras.podemTocar.some(([x, y, q]) => ((x === a && y === b) || (x === b && y === a)) && (!q || q(f)));
  // a assinatura de um quadro: a caixa de cada corpo no mundo (para achar estado que sobra de um quadro para outro)
  const assinatura = () => regras.corpos.map((c) => { const cx = new THREE.Box3(); for (const m of c.malhas()) cx.union(caixaMundo(m)); return cx.isEmpty() ? [0, 0, 0, 0, 0, 0] : [cx.min.x, cx.min.y, cx.min.z, cx.max.x, cx.max.y, cx.max.z]; });
  const antes: Record<string, THREE.Vector3[]> = {};
  for (let f = de; f < ate; f += passo) {
    // ESTADO: o quadro tem de sair igual em qualquer ordem (o render divide o vídeo em pedaços paralelos). A cada 5
    // quadros, posa um quadro longe e volta: se algum corpo mudou mais de 2 mm, sobrou estado do outro quadro
    if ((f - de) % (5 * passo) === 0) {
      posar(f); const a1 = assinatura();
      posar((f + 397) % ate); posar(f); const a2 = assinatura();
      a1.forEach((v, i) => { const d = Math.max(...v.map((x, j) => Math.abs(x - a2[i][j]))); if (d > 0.002) achados.push({ f, tipo: "estado", a: regras.corpos[i].nome, b: "-", cm: +(d * 100).toFixed(1), onde: [0, 0, 0] }); });
    }
    const cam = posar(f);
    // TREME: a mão de quem está parado não pode sacudir (a segunda diferença da posição, fora das ações)
    for (const qz of regras.quietos ?? []) {
      const h = (antes[qz.nome] ??= []); h.push(qz.ponto().clone()); if (h.length > 3) h.shift();
      if (h.length === 3 && !(qz.acao && (qz.acao(f) || qz.acao(f - passo) || qz.acao(f - 2 * passo)))) {
        const acel = h[2].clone().sub(h[1]).sub(h[1].clone().sub(h[0])).length();
        if (acel > 0.004) achados.push({ f, tipo: "treme", a: qz.nome, b: "-", cm: +(acel * 100).toFixed(1), onde: h[2].toArray().map((v) => +v.toFixed(2)) as [number, number, number] });
      }
    }
    const corpos = regras.corpos.map((c) => { const ms = c.malhas(); const cx = new THREE.Box3(); const caixas = ms.map((m) => { const b = caixaMundo(m); cx.union(b); return b; }); return { nome: c.nome, ms, caixas, cx }; });
    for (let i = 0; i < corpos.length; i++) for (let j = i + 1; j < corpos.length; j++) {
      const A = corpos[i], B = corpos[j];
      if (!A.ms.length || !B.ms.length || !A.cx.intersectsBox(B.cx) || pode(A.nome, B.nome, f)) continue;
      let pior = 0; let onde: [number, number, number] = [0, 0, 0];
      A.ms.forEach((ma, ia) => B.ms.forEach((mb, ib) => {
        if (!A.caixas[ia].intersectsBox(B.caixas[ib])) return;
        for (const [x, y] of [[ma, mb], [mb, ma]] as const) { const e = entrada(x, y); if (e.pior > pior) { pior = e.pior; onde = e.onde; } }
      }));
      if (pior > tol) achados.push({ f, tipo: "atravessa", a: A.nome, b: B.nome, cm: +(pior * 100).toFixed(1), onde: onde.map((v) => +v.toFixed(2)) as [number, number, number] });
    }
    for (const ap of regras.apoios) {
      if (ap.quando && !ap.quando(f)) continue;
      const A = corpos.find((c) => c.nome === ap.de), Bs = corpos.filter((c) => ap.sobre.includes(c.nome));
      if (!A || !A.ms.length) continue;
      const v = vao(A.ms, Bs.flatMap((b) => b.ms));
      if (v.menor > folga) achados.push({ f, tipo: "flutua", a: ap.de, b: ap.sobre.join("/"), cm: +(v.menor * 100).toFixed(1), onde: v.onde.map((x) => +x.toFixed(2)) as [number, number, number] });
    }
    // CAMERA: a lente (o plano próximo, 0,2 m) não pode entrar em malha nenhuma: a tela inteira vira uma cor só
    if (cam) {
      const pc = new THREE.Vector3(...cam), R = 0.25;
      for (const c of corpos) {
        if (!c.ms.length || c.cx.distanceToPoint(pc) > R) continue;
        let menor = Infinity;
        c.ms.forEach((m, i) => {
          if (c.caixas[i].distanceToPoint(pc) > R) return;
          const d = dados(m.geometry as THREE.BufferGeometry); inv.copy(m.matrixWorld).invert(); P.copy(pc).applyMatrix4(inv);
          const dentroDela = d.caixa.containsPoint(P) && dentro(d.bvh, P);
          d.bvh.closestPointToPoint(P, alvoPerto as never); Q.copy(alvoPerto.point).applyMatrix4(m.matrixWorld);
          menor = Math.min(menor, dentroDela ? 0 : pc.distanceTo(Q));
        });
        if (menor < R) achados.push({ f, tipo: "camera", a: "camera", b: c.nome, cm: +(menor * 100).toFixed(1), onde: cam.map((v) => +v.toFixed(2)) as [number, number, number] });
      }
    }
    if (aviso && f % 60 === 0) aviso(`quadro ${f} de ${ate}: ${achados.length} achado(s) até aqui`);
  }
  return achados;
};
