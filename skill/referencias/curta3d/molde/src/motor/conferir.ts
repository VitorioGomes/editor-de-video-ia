// O que a conferência automática (scripts/conferir.mjs) precisa saber da cena: cada texto que aparece na tela
// (título, subtítulo, rótulo e valor do contador, título do cartão), com o segundo em que entra e sai.
import { FPS } from "./tempo";
import type { Titulo, Contador } from "./Selo";
import type { Cartao } from "./Cartao";

export type TextoNaTela = { tipo: string; texto: string; de: number; ate: number };

export const textosNaTela = (titulos: Titulo[], contadores: Contador[], cartoes: Cartao[] = []): TextoNaTela[] => {
  const s = (f: number) => +(f / FPS).toFixed(3);
  const r: TextoNaTela[] = [];
  for (const t of titulos) {
    r.push({ tipo: "título", texto: t.texto, de: s(t.de), ate: s(t.ate) });
    if (t.sub) r.push({ tipo: "subtítulo", texto: t.sub, de: s(t.de), ate: s(t.ate) });
  }
  for (const c of contadores) {
    // o valor muda com o tempo: guarda o do começo, o do meio e o do fim
    const valores = [...new Set([c.de, Math.round((c.de + c.ate) / 2), c.ate - 1].map((f) => c.valor(f)))];
    r.push({ tipo: "contador", texto: `${c.rotulo(c.de)} ${valores.join(" ")}`, de: s(c.de), ate: s(c.ate) });
  }
  for (const c of cartoes) if (c.titulo) r.push({ tipo: "cartão", texto: c.titulo, de: s(c.de), ate: s(c.ate) });
  return r;
};
