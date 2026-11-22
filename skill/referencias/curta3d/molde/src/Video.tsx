// O vídeo: o palco 3D da cena, o título e o contador por cima, os cartões (Estilo Conversa), a legenda e o som.
// Não precisa mexer aqui: o vídeo de cada projeto está em src/cena.ts. Além do obrigatório, a cena pode exportar
// CARTOES (os cartões de vidro no alto) e LEGENDA_Y (a altura da legenda em cada quadro, perto do rosto).
import React from "react";
import { AbsoluteFill } from "remotion";
import { Palco } from "./motor/Palco";
import { Selo } from "./motor/Selo";
import { Legenda } from "./motor/Legenda";
import { Som } from "./motor/Som";
import { Guias } from "./motor/Guias";
import { Cartoes, Cartao } from "./motor/Cartao";
import * as C from "./cena";

const extra = C as unknown as { CARTOES?: Cartao[]; LEGENDA_Y?: (f: number) => number };

export const Curta: React.FC<{ deixas: unknown[]; textos?: unknown[]; cartoes?: unknown[]; regua?: unknown[] }> = () => (
  <AbsoluteFill style={{ background: (C.cena.look ?? { horizon: "#f7e6cf" }).horizon }}>
    <Palco cena={C.cena} pecas={C.PECAS} />
    <Selo titulos={C.TITULOS} contadores={C.CONTADORES} />
    <Cartoes lista={extra.CARTOES ?? []} />
    <Legenda esconder={C.SEM_LEGENDA} y={extra.LEGENDA_Y} />
    <Som efeitos={C.EFEITOS} />
    <Guias />
  </AbsoluteFill>
);
