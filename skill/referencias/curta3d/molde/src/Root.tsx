import React, { useEffect, useState } from "react";
import { Composition, AbsoluteFill, delayRender, continueRender } from "remotion";
import { carregarFontes } from "./motor/Palco";
import { Curta } from "./Video";
import { Vitrine } from "./motor/Vitrine";
import { Colisao } from "./motor/ConferirColisao";
import type { RegrasColisao } from "./motor/colisao";
import { TOTAL, FPS } from "./motor/tempo";
import { deixas } from "./motor/Som";
import { textosNaTela, TextoNaTela } from "./motor/conferir";
import { Cartoes, Cartao } from "./motor/Cartao";
import type { Medida } from "./motor/dialogo";
import * as C from "./cena";

const extra = C as unknown as { CARTOES?: Cartao[]; REGUA?: (f: number) => Medida; COLISAO?: () => RegrasColisao };
const cartoes = extra.CARTOES ?? [];
/** a régua do Estilo Conversa (olhos, boca, legenda, cartão) a cada 2 quadros, para o conferir.mjs */
const regua = () => (extra.REGUA ? Array.from({ length: Math.ceil(TOTAL / 2) }, (_, i) => extra.REGUA!(i * 2)) : []);

/** só os cartões, sobre fundo transparente: o conferir.mjs mede a base, o vazio e o que transborda */
const SoCartoes: React.FC = () => {
  const [h] = useState(() => delayRender("fontes"));
  const [pronto, setPronto] = useState(false);
  useEffect(() => { carregarFontes().then(() => { setPronto(true); continueRender(h); }); }, [h]);
  return <AbsoluteFill>{pronto ? <Cartoes lista={cartoes} /> : null}</AbsoluteFill>;
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Curta" component={Curta} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920}
      defaultProps={{ deixas: [] as ReturnType<typeof deixas>, textos: [] as TextoNaTela[], cartoes: [] as { de: number; ate: number; titulo?: string }[], regua: [] as Medida[] }}
      calculateMetadata={({ props }) => ({ props: { ...props, deixas: deixas(C.EFEITOS), textos: textosNaTela(C.TITULOS, C.CONTADORES, cartoes),
        cartoes: cartoes.map((c) => ({ de: c.de, ate: c.ate, titulo: c.titulo })), regua: (props as { medir?: boolean }).medir ? regua() : [] } })} />
    <Composition id="Cartoes" component={SoCartoes} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
    <Composition id="Vitrine" component={Vitrine} durationInFrames={60} fps={FPS} width={1080} height={1920} />
    {/* a conferência de colisão quadro a quadro (scripts/colisao.mjs) */}
    <Composition id="Colisao" component={() => <Colisao cena={C.cena} pecas={C.PECAS} regras={extra.COLISAO} />} durationInFrames={1} fps={FPS} width={64} height={64} />
  </>
);
