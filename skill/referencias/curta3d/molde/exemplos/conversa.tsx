// EXEMPLO DO ESTILO CONVERSA: copie este arquivo por cima de src/cena.tsx (no projeto, não no molde).
// Dois personagens no terraço à noite, plano e contraplano pelo dialogo() e um cartão no alto. Funciona com qualquer
// voz de conversa (as falas com [nome]): quem fala primeiro é o personagem A, o outro é o B.
// OS PERSONAGENS SÃO ESCOLHA DE QUEM FAZ O VÍDEO: troque em "os personagens", logo abaixo. O padrão é o boneco da
// pessoa (A) com o Claude (B); o B pode ser outro boneco (um cliente, um chefe, uma criança) ou um personagem que não
// é humano (o robô do kit, ou um gato ou uma xícara feitos no Blender pelo contrato do rosto, no guia).
// Leia junto: dialogo.ts (câmera, régua, ROSTO), rosto.ts (boneco, fichas, animarRosto), fala.ts (boca),
// Cartao.tsx (cartões), cenarios.ts (terraço). Troque o cartão pelo que a sua conversa diz (q("palavra")).
// cenário: o terraço noturno pronto (terraco), o lugar da conversa do Estilo Conversa.
import React from "react";
import * as THREE from "three";
import { Cena, CONTORNO_DISCRETO } from "./motor/Palco";
import { LOOKS } from "./motor/mundo";
import { peca, Kit } from "./motor/kit";
import { terraco } from "./motor/cenarios";
import { sombraContato } from "./motor/pecas3js";
import { olharPara } from "./motor/bonecos";
import { boneco, Ficha, FICHA_VITORIO, rostoDoBoneco, animarBoneco, animarClaudeFala, animarRosto, Emocao } from "./motor/rosto";
import { dialogo, ator } from "./motor/dialogo";
import { camera, foco } from "./motor/camera";
import { TURNOS } from "./motor/fala";
import { FPS, V3 } from "./motor/tempo";
import { Efeito } from "./motor/Som";
import { somDoCorte, somDoCartao } from "./motor/contatos";
import { Titulo, Contador } from "./motor/Selo";
import { Cartao, baseDoCartao, Medidor } from "./motor/Cartao";

// ---------------- os personagens (troque aqui) ----------------
// Cada um é { tipo, ficha? }: "boneco" (uma pessoa, montada pela ficha), "claude" (o claude_rosto) ou o nome de uma
// peça com o contrato do rosto ("robo", ou a sua: registre a altura dos olhos e da boca com registrarRosto).
type Personagem = { tipo: "boneco"; ficha: Ficha } | { tipo: "claude" } | { tipo: string };
const A: Personagem = { tipo: "boneco", ficha: FICHA_VITORIO }; // a pessoa (a ficha dela: rosto.ts)
const B: Personagem = { tipo: "claude" };                       // ou { tipo: "gato" }, { tipo: "coruja" }, { tipo: "robo" }, ou { tipo: "boneco", ficha: {...} }
// as vozes: os nomes das falas ([nome] no texto) na ordem em que aparecem
const VOZES = [...new Set(TURNOS.map((t) => t.quem))];
const VOZ_A = VOZES[0] ?? "pessoa", VOZ_B = VOZES[1] ?? "claude";

export const PECAS = [...new Set(["boneco", "parapeito", "caixa_dagua", "antena", "ar_condicionado", "vaso_planta", "banco",
  ...[A, B].map((p) => (p.tipo === "claude" ? "claude_rosto" : p.tipo))])];

// ---------------- onde ficam (um de frente para o outro, abertos para a câmera) ----------------
const POS_A: V3 = [-0.6, 0, 0], ROT_A = 0.72;
const POS_B: V3 = [0.62, 0, 0.05], ROT_B = -0.72;
// ator(): a altura dos olhos e da boca (ROSTO, ou rostoDoBoneco da ficha) e o tamanho do close que não corta
const rostoDe = (p: Personagem) => (p.tipo === "boneco" ? rostoDoBoneco((p as { ficha: Ficha }).ficha) : p.tipo);
const ATOR_A = ator(rostoDe(A), POS_A, ROT_A), ATOR_B = ator(rostoDe(B), POS_B, ROT_B);

// ---------------- os momentos ----------------
// Aqui, pelos turnos (funciona com qualquer voz). No seu vídeo, use q("palavra", n, antes): o cartão entra na palavra.
const quadro = (s: number) => Math.round(s * FPS);
const T2 = TURNOS[Math.min(1, TURNOS.length - 1)], T4 = TURNOS[Math.min(3, TURNOS.length - 1)];

// ---------------- o cartão ----------------
// O conteúdo entra JUNTO com o título (o conferir.mjs reprova cartão vazio por mais de 0,4 s), e cabe no vidro
// sozinho (o Cartao.tsx encolhe o que não cabe). Símbolo só desenhado (Estrela, Xis, Certo), nunca ★ ✕ ✓.
export const CARTOES: Cartao[] = [
  {
    de: quadro(T2.de) - 2, ate: quadro(T4.de) - 2, titulo: "EXEMPLO DO KIT", // o título usa as palavras da fala, e entra na frase que as diz
    conteudo: (f) => <Medidor rotulo="MEDIDOR" valor={Math.max(0.05, 0.8 - (f - quadro(T2.de)) / 400)} detalhe="troque pelo que a fala diz" />,
  },
];
const ATIVO = (f: number) => CARTOES.some((c) => f >= c.de - 2 && f < c.ate);

// ---------------- a câmera de diálogo ----------------
const D = dialogo({ [VOZ_A]: ATOR_A, [VOZ_B]: ATOR_B }, { cartao: ATIVO, cartaoBase: baseDoCartao(CARTOES), fim: "close" });
export const LEGENDA_Y = D.legendaY;
/** a régua de cada quadro (olhos, boca, legenda, cartão): o conferir.mjs reprova o quadro que sai dela */
export const REGUA = D.medir;
D.cortes.forEach((c) => somDoCorte(c));
CARTOES.forEach((c) => somDoCartao(c.de));

// ---------------- as expressões ----------------
const EMOCOES_A: [number, Emocao][] = [[0, "feliz"], [quadro(T2.de), "pensando"], [quadro(T4.de), "surpreso"]];
const EMOCOES_B: [number, Emocao][] = [[0, "neutro"], [quadro(T2.de), "feliz"], [quadro(T4.de), "duvida"]];

// ---------------- o mundo ----------------
const montar = (kit: Kit, p: Personagem) => (p.tipo === "boneco" ? boneco(kit, (p as { ficha: Ficha }).ficha) : peca(kit, p.tipo === "claude" ? "claude_rosto" : p.tipo));
/** cada tipo fala do seu jeito: o boneco (sobrancelha, pupila, mãos), o Claude ("^ ^", bochecha) e o resto pelo contrato */
const animar = (p: Personagem, o: THREE.Object3D, f: number, voz: string, emocoes: [number, Emocao][], olhaPara: V3, semente: number) => {
  if (p.tipo === "boneco") animarBoneco(o, f, { quem: voz, emocoes, olhar: () => [0.55, -0.45], semente });
  else if (p.tipo === "claude") animarClaudeFala(o, f, { quem: voz, olhos: [[0, "normal"]], gesto: { olhar: olharPara(o, olhaPara), semente } });
  else animarRosto(o, p.tipo, f, { quem: voz, emocoes, olhar: () => [-0.5, -0.1], semente });
};
let pa: THREE.Object3D, pb: THREE.Object3D;
const somA = sombraContato(0.42), somB = sombraContato(0.6);

export const cena: Cena = {
  look: LOOKS.noite,
  contorno: CONTORNO_DISCRETO,
  vinheta: 0.12,
  granulado: { forca: 0.005, fixo: true },
  construir: ({ kit, root }) => {
    root.add(terraco(kit, { livre: [POS_A, POS_B, [0, 0, 3], [0, 0, 5.6], [-3.2, 0, 3], [3.2, 0, 3]] }));
    pa = montar(kit, A); pa.position.set(...POS_A); pa.rotation.y = ROT_A; root.add(pa);
    pb = montar(kit, B); pb.position.set(...POS_B); pb.rotation.y = ROT_B; root.add(pb);
    root.add(somA.malha, somB.malha);
  },
  posar: (f) => {
    // quem escuta olha para quem fala; quem fala olha para o outro (perto da lente no close dele)
    animar(A, pa, f, VOZ_A, EMOCOES_A, ATOR_B.rosto, 5);
    animar(B, pb, f, VOZ_B, EMOCOES_B, ATOR_A.rosto, 2);
    somA.posar(POS_A[0], POS_A[2]); somB.posar(POS_B[0], POS_B[2]);
    const c = camera(D.planos, [], f);
    const fo = foco(D.focos, D.cortes, f);
    return { cam: c, foco: fo.alvo, cInf: fo.cInf, luz: D.luzEm(f) };
  },
};

export const EFEITOS: Efeito[] = [];
export const TITULOS: Titulo[] = [];
export const CONTADORES: Contador[] = [];
export const SEM_LEGENDA: [number, number][] = [];
