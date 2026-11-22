// A CENA DESTE VÍDEO. É o único arquivo que muda de um vídeo para outro (com sons/, pecas/ e blender/ do projeto).
// Este é o exemplo do kit (o teste de 7 s, com o começo da fala do /btw): troque tudo pelo seu vídeo.
//
// O que exportar:
//   cena         { look, construir(ctx), posar(f) }: monta o mundo uma vez e posa tudo a cada quadro
//   PECAS        as peças do kit que a cena usa (carregar só estas deixa a montagem mais rápida)
//   EFEITOS      os efeitos sonoros que não são contato: { f: quadro, id: do kit de sons, ganho?, dura? }
//                (pulo, pouso, passo, caixa, tampa, mola e batida: os ajudantes de motor/contatos.ts, que já põem o som)
//   TITULOS      o título de cada bloco no topo (opcional)
//   CONTADORES   o contador abaixo do título (opcional)
//   SEM_LEGENDA  trechos [quadro, quadro] sem legenda (quando a cena já escreve a frase em grande)
//
// Tempo: q("palavra", n, antes) é o quadro em que a palavra (a n-ésima vez) começa, `antes` quadros adiantado.
import * as THREE from "three";
import { Cena } from "./motor/Palco";
import { LOOKS } from "./motor/mundo";
import { peca, escrever, texto, Escrita } from "./motor/kit";
import { chao, natureza, nuvens, Faiscas, Poeira } from "./motor/pecas3js";
import { animarClaude, olharPara } from "./motor/bonecos";
import { Plano, Foco, camera, foco, dolly, empurra } from "./motor/camera";
import { q, TOTAL, smooth, clamp01, lerp, ramp, V3 } from "./motor/tempo";
import { Efeito } from "./motor/Som";
import { pulo, batida } from "./motor/contatos";
import { Titulo, Contador } from "./motor/Selo";

export const PECAS = ["claude", "mesa", "computador", "placa", "interrogacao", "arvore_cone", "arvore_redonda", "arvore_cone_baixa", "arvore_redonda_b", "arbusto", "arbusto_b", "pedra", "pedra_b", "nuvem", "nuvem_b"];

// ---------------- os momentos (tudo sai da fala) ----------------
const F_TAREFA = q("tarefa", 1, 6);     // a placa salta (sai do chão 6 quadros antes da palavra)
const F_PLACA_POUSO = F_TAREFA + 12;
const F_PERGUNTA = q("pergunta", 1, 14); // o "?" salta e pousa na palavra
const F_Q_POUSO = F_PERGUNTA + 12;
const F_MANDAR = q("mandar", 1, 4);     // o "?" pula na tela do computador
const F_TELA = F_MANDAR + 11;
const F_FIO = q("fio", 1, 1);            // o Claude fica tonto

// ---------------- onde as coisas ficam ----------------
const CLAUDE: V3 = [0, 0, 0];
const MESA: V3 = [-1.25, 0, -0.55];
const PLACA: V3 = [1.75, 0, -0.75];
const Q_PARA: V3 = [0.95, 0, 0.55];
const TELA_PT: V3 = [MESA[0], 1.3, MESA[2] + 0.05];

// ---------------- os pulos (com som automático: o pulo() registra a decolagem e o pouso) ----------------
const PULO_PLACA = pulo({ de: [PLACA[0] + 1.2, 0, PLACA[2] - 2.5], para: PLACA, inicio: F_TAREFA, dur: 12, altura: 1.6, forca: 0.3 }, "medio");
const PULO_Q = pulo({ de: [PLACA[0] + 0.2, 0, PLACA[2] - 0.6], para: Q_PARA, inicio: F_PERGUNTA, dur: 12, altura: 1.4, forca: 0.32 }, "leve");
const PULO_TELA = pulo({ de: Q_PARA, para: TELA_PT, inicio: F_MANDAR, dur: 11, altura: 0.7, agacha: 0.25 }, "leve");
batida(F_Q_POUSO + 15, "leve", -4); // o Claude volta do susto

// ---------------- a tela do computador ----------------
const desenharTela = (pct: number, parou: number) => (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = parou > 0 ? `rgb(${lerp(27, 120, parou)},${lerp(27, 24, parou)},${lerp(29, 30, parou)})` : "#1b1b1d"; g.fillRect(0, 0, W, H);
  const fs = H * 0.13;
  g.textBaseline = "middle";
  g.font = `600 ${fs}px "JetBrains Mono", monospace`;
  g.fillStyle = "#d77757"; g.fillText("✻ Claude", W * 0.07, H * 0.17);
  g.fillStyle = "#f2f2f2"; g.font = `500 ${fs * 0.8}px "JetBrains Mono", monospace`;
  g.fillText(parou > 0.5 ? "tarefa parou" : "tarefa grande…", W * 0.07, H * 0.42);
  g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(W * 0.07, H * 0.62, W * 0.86, H * 0.11);
  g.fillStyle = parou > 0.5 ? "#ef5a4c" : "#4eba65"; g.fillRect(W * 0.07, H * 0.62, W * 0.86 * pct, H * 0.11);
  g.fillStyle = "#f2f2f2"; g.font = `700 ${fs * 0.9}px "JetBrains Mono", monospace`;
  g.fillText(`${Math.round(pct * 100)}%`, W * 0.07, H * 0.86);
};
const pctEm = (f: number) => ramp([[0, 0.57], [F_FIO, 0.62]], f);

// ---------------- a câmera ----------------
const PLANOS: Plano[] = [
  // abre de lado e desliza para a direita, empurrando devagar (o mundo, o Claude e o computador)
  { f: 0, s: (f) => { const k = smooth(f / 75); return dolly([lerp(-4.2, -2.2, k), 2.4, 7.6], [lerp(-0.8, 0.0, k), 0.8, -0.3], empurra(f, 0, 0.0028), { fov: 38, roll: 0.03 }); } },
  // "uma tarefa grande": desliza para mostrar a placa chegando
  { f: q("tarefa", 1, 16), dur: 26, s: (f) => dolly([2.6, 2.3, 8.2], [0.7, 0.95, -0.4], empurra(f, q("tarefa", 1, 16), 0.0025), { fov: 40, roll: -0.025 }) },
  // "e você lembra de uma pergunta": corte para perto do Claude, o "?" chega
  { f: q("você", 1, 3), corte: true, s: (f) => dolly([3.0, 1.5, 5.0], [0.45, 0.7, 0.15], empurra(f, q("você", 1, 3), 0.0032), { fov: 36, roll: 0.035 }) },
  // "se mandar agora": desliza para o computador
  { f: q("Se", 1, 3), dur: 22, s: (f) => dolly([1.6, 1.9, 5.4], [-0.6, 0.95, -0.35], empurra(f, q("Se", 1, 3), 0.003), { fov: 38, roll: -0.03 }) },
];
const SACUDIDAS: [number, number][] = [[F_PLACA_POUSO, 0.45], [F_TELA, 0.6], [F_FIO, 0.9]];
const CORTES = PLANOS.filter((p) => p.corte).map((p) => p.f);
const FOCOS: Foco[] = [
  { f: 0, cInf: 8, alvo: () => [0, 0.8, 0] },
  { f: q("tarefa", 1, 16), dur: 20, cInf: 9, alvo: () => [PLACA[0] - 0.4, 1.2, PLACA[2]] },
  { f: q("você", 1, 3), cInf: 13, alvo: () => [0.4, 0.7, 0.2] },
  { f: q("Se", 1, 3), dur: 20, cInf: 11, alvo: () => [-0.5, 0.95, -0.3] },
];

// ---------------- o mundo ----------------
// cenário: ao ar livre, o mundo de maquete do /btw (o trem anda num campo de fim de tarde). No seu vídeo, escolha o
// cenário pela metáfora (terraco, deposito, estudio, ou um próprio): o conferir.mjs reprova o campo sem esta linha.
let claude: THREE.Object3D, placa: THREE.Object3D, interrog: THREE.Object3D, tela: Escrita, placaTexto: Escrita;
const faiscas = new Faiscas(60), poeira = new Poeira(30);

export const cena: Cena = {
  look: LOOKS.tarde,
  construir: ({ kit, root }) => {
    root.add(chao({ livres: [CLAUDE, MESA, PLACA], plano: 10 }));
    root.add(natureza(kit, { livre: 7, raio: 55, quantas: 70, evitar: [[0, 0, 6]] }));
    root.add(nuvens(kit));
    claude = peca(kit, "claude");
    claude.position.set(...CLAUDE); claude.rotation.y = 0.25;
    root.add(claude);
    const mesa = peca(kit, "mesa"); mesa.position.set(...MESA); mesa.rotation.y = 0.35; root.add(mesa);
    const pc = peca(kit, "computador", { escala: 1.15 }); pc.position.set(0, 0.75, 0); mesa.add(pc);
    tela = escrever(pc, "computador_tela", desenharTela(pctEm(0), 0));
    placa = peca(kit, "placa");
    placa.position.set(...PLACA); placa.rotation.y = -0.3;
    root.add(placa);
    placaTexto = escrever(placa, "placa_face", texto("TAREFA GRANDE", { cor: "#3a2414", linhas: 2 }));
    interrog = peca(kit, "interrogacao", { brilho: { amarelo: 0.35 } });
    root.add(interrog);
    root.add(faiscas.grupo, poeira.grupo);
    poeira.levantar([PLACA[0], 0, PLACA[2]], F_PLACA_POUSO, 0.8);
    poeira.levantar([Q_PARA[0], 0, Q_PARA[2]], F_Q_POUSO, 0.45);
    faiscas.estourar([Q_PARA[0], 0.5, Q_PARA[2]], F_Q_POUSO, { n: 12 });
    faiscas.estourar(TELA_PT, F_TELA, { n: 18, cor: "#ff7a5c", forca: 1.2 });
  },
  posar: (f) => {
    // a placa: agacha, salta de trás num arco e achata ao pousar
    const pl = PULO_PLACA(f);
    placa.visible = f >= F_TAREFA - 8;
    placa.position.set(...pl.pos);
    placa.scale.set(...pl.escala);
    placa.rotation.z = pl.voando ? -0.25 * Math.sin(((f - F_TAREFA) / 12) * Math.PI) : 0;

    // o "?": salta de trás da placa até a frente do Claude; depois agacha e pula na tela
    interrog.visible = f >= F_PERGUNTA - 8;
    if (f < F_MANDAR - 6) {
      const e = PULO_Q(f);
      interrog.position.set(...e.pos);
      interrog.scale.set(e.escala[0] * 0.9, e.escala[1] * 0.9, e.escala[2] * 0.9);
      interrog.rotation.set(0, -0.5 + Math.sin(f * 0.09) * 0.15 * (e.voando ? 0 : 1), e.voando ? Math.sin(((f - F_PERGUNTA) / 12) * Math.PI) * 0.5 : 0);
      interrog.position.y += e.voando ? 0 : Math.max(0, Math.sin((f - F_Q_POUSO) * 0.2)) * 0.04 * clamp01((f - F_Q_POUSO - 12) / 6);
    } else {
      const e = PULO_TELA(f);
      const k = clamp01((f - F_MANDAR) / 11);
      interrog.position.set(...e.pos);
      const enc = f >= F_TELA ? Math.max(0, 1 - (f - F_TELA) / 5) : 1; // entra na tela e some
      interrog.scale.set(e.escala[0] * 0.9 * enc, e.escala[1] * 0.9 * enc, e.escala[2] * 0.9 * enc);
      interrog.rotation.set(0, -0.5 + k * 0.6, Math.sin(k * Math.PI) * 0.8);
      interrog.visible = enc > 0.02;
    }

    // a tela: o número sobe até o "?" entrar; aí fica vermelha
    const parou = clamp01((f - F_TELA) / 4);
    tela.redesenhar(`${Math.round(pctEm(f) * 100)}|${parou.toFixed(2)}`, desenharTela(f < F_TELA ? pctEm(f) : pctEm(F_TELA), parou));

    // o Claude: vivo o tempo todo; olha a placa, se assusta com o "?", olha a tela e fica tonto no "fio"
    const alvo: V3 = f < F_PERGUNTA ? [PLACA[0], 1.4, PLACA[2]] : f < F_MANDAR + 6 ? (interrog.position.toArray() as V3) : TELA_PT;
    animarClaude(claude, f, { olhar: olharPara(claude, alvo), susto: F_Q_POUSO, tonto: F_FIO, semente: 3 });
    claude.rotation.y = 0.25 + (f >= F_MANDAR ? -0.35 * smooth((f - F_MANDAR) / 12) : 0);

    faiscas.posar(f); poeira.posar(f);
    const c = camera(PLANOS, SACUDIDAS, f);
    const fo = foco(FOCOS, CORTES, f);
    return { cam: c, foco: fo.alvo, cInf: fo.cInf };
  },
};

// ---------------- som ----------------
export const EFEITOS: Efeito[] = [
  { f: 4, id: "whoosh-slow-soft", ganho: -4 },                    // a câmera desliza
  { f: F_Q_POUSO, id: "pop-large-in" },                             // o "?" chega
  { f: F_Q_POUSO + 1, id: "shimmer-short-bright", ganho: -4 },
  { f: F_TELA, id: "digital-glitch-clear", ganho: -2 },              // a tela fica vermelha
  { f: F_FIO, id: "notification-failure-knock" },                   // perde o fio
  { f: F_FIO + 3, id: "move-spring", ganho: -6 },                   // tontura
];

// ---------------- título e contador ----------------
export const TITULOS: Titulo[] = [
  { de: 0, ate: q("Se", 1, 3), texto: "O CLAUDE NO MEIO DA TAREFA", destaque: ["CLAUDE"] },
  { de: q("Se", 1, 3), ate: TOTAL, texto: "MANDAR AGORA ATRAPALHA" },
];
export const CONTADORES: Contador[] = [
  {
    de: 6, ate: TOTAL, treme: F_FIO,
    rotulo: (f) => (f >= F_FIO ? "TAREFA PAROU" : "TAREFA"),
    valor: (f) => `${Math.round(pctEm(Math.min(f, F_TELA)) * 100)}%`,
    barra: (f) => pctEm(Math.min(f, F_TELA)),
    cor: (f) => (f >= F_FIO ? "#ef5a4c" : "#d97757"),
  },
];
export const SEM_LEGENDA: [number, number][] = [];
