// Som em todo contato, sem precisar lembrar: os ajudantes daqui animam e já registram o som de cada pulo,
// pouso, passo, batida, caixa, tampa e mola. O Som.tsx junta esta lista (AUTO) com os EFEITOS da cena.
// Declare no topo do cena.ts (fora do construir e do posar), para a lista estar pronta antes do render:
//   const saltoOpus = pulo({ de, para, inicio, dur: 16, altura: 2 }, "pesado");   // no posar: saltoOpus(f)
//   passos((f) => distanciaAndada(f), de, ate);                                    // corrida
//   batida(F.pronto, "medio"); tampa(F.pronto, "abre"); mola(F.menu); caixa(F.pega);
// Todo grave leva uma camada aguda (o alto-falante do celular perde o grave e o pouso parece mudo).
import { entra, FPS } from "./tempo";
import type { Efeito } from "./Som";

export const AUTO: Efeito[] = [];
export type Peso = "leve" | "medio" | "pesado";

const DECOLA: Record<Peso, string> = { leve: "swish-soft", medio: "swish-medium", pesado: "whoosh-fast-soft" };
const POUSO: Record<Peso, [string, string]> = {
  leve: ["impact-light-firm", "click-tap-firm"],
  medio: ["impact-medium-firm", "impact-light-hard"],
  pesado: ["impact-heavy-firm", "impact-medium-hard"],
};

/** o som de uma batida (pouso, encaixe, queda): o grave e a camada aguda por cima */
export const batida = (f: number, peso: Peso = "medio", ganho = 0) => {
  const [grave, agudo] = POUSO[peso];
  AUTO.push({ f, id: grave, ganho, tipo: "contato" }, { f, id: agudo, ganho: ganho - 3, tipo: "contato" });
};

/** os sons de uma entrada com `entra()`: a decolagem (deslocamento de ar) e o pouso (batida) */
export const somDoPulo = (o: { inicio: number; dur?: number }, peso: Peso = "medio", ganho = 0) => {
  AUTO.push({ f: o.inicio, id: DECOLA[peso], ganho: ganho - 2, tipo: "curto" });
  batida(o.inicio + (o.dur ?? 12), peso, ganho);
};

/** um pulo com som: devolve a função do quadro (a mesma saída do `entra`) */
export const pulo = (o: Parameters<typeof entra>[1], peso: Peso = "medio", ganho = 0) => {
  somDoPulo(o, peso, ganho);
  return (f: number) => entra(f, o);
};

/**
 * Passos de corrida: um toque a cada `passo` metros andados entre os quadros `de` e `ate`.
 * `distancia(f)` é a mesma função que move as pernas. Alterna plástico e madeira, bem baixo.
 */
export const passos = (distancia: (f: number) => number, de: number, ate: number, o: { passo?: number; ganho?: number } = {}) => {
  const p = o.passo ?? 0.35;
  let ultimo = Math.floor(distancia(de) / p), n = 0;
  for (let f = de + 1; f < ate; f++) {
    const k = Math.floor(distancia(f) / p);
    if (k !== ultimo) { AUTO.push({ f, id: n++ % 2 ? "foley-wood-touch" : "foley-plastic-touch", ganho: (o.ganho ?? 0) - 4, tipo: "contato" }); ultimo = k; }
  }
};

/** caixa pousando na mão ou na cabeça: papelão */
export const caixa = (f: number, ganho = 0) => { AUTO.push({ f, id: "impact-light-soft", ganho, tipo: "contato" }, { f, id: "foley-card-touch", ganho: ganho - 2, tipo: "contato" }); };
/** tampa: abrir ou fechar */
export const tampa = (f: number, como: "abre" | "fecha" = "abre", ganho = 0) => {
  AUTO.push(como === "abre" ? { f, id: "props-box-open", ganho, tipo: "contato" } : { f, id: "mechanical-latch-light", ganho, tipo: "contato" });
};
/** mola: o que salta, balança ou volta com elástico */
export const mola = (f: number, ganho = 0) => { AUTO.push({ f, id: "move-spring", ganho: ganho - 2, tipo: "curto", dura: 0.6 }); };

/** segundos -> quadro, para quem quiser marcar um contato por tempo */
export const emQuadro = (s: number) => Math.round(s * FPS);

/** o corte de câmera (Estilo Conversa): um whoosh curto e baixo */
export const somDoCorte = (f: number, ganho = 0) => { AUTO.push({ f, id: "whoosh-fast-soft", ganho: ganho - 6, tipo: "curto" }); };
/** o cartão que entra no alto: o deslocamento de ar e um estalo (agudo, que se ouve no celular) */
export const somDoCartao = (f: number, ganho = 0) => {
  AUTO.push({ f: f - 2, id: "swish-soft", ganho: ganho - 3, tipo: "curto" }, { f: f + 4, id: "impact-light-hard", ganho, tipo: "contato" });
};
