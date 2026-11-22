// As faixas de conferência do enquadramento (só nos quadros com --guias, nunca no vídeo):
// 150 px das laterais (vermelho), nada importante acima de 220 px, os olhos do protagonista entre 700 e 1000 px
// (verde), a faixa do selo (236 a 440 px) e a da legenda (1330 a 1500 px), e 120 px livres à direita (onde ficam os
// botões do Reels).
import React from "react";
import { AbsoluteFill, getInputProps } from "remotion";

export const Guias: React.FC = () => {
  if (!(getInputProps() as { guias?: boolean }).guias) return null;
  const faixa = (top: number, h: number, cor: string) => <div style={{ position: "absolute", left: 0, right: 0, top, height: h, background: cor }} />;
  const linha = (st: React.CSSProperties) => <div style={{ position: "absolute", ...st }} />;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {faixa(0, 220, "rgba(255,0,0,0.18)")}
      {faixa(236, 204, "rgba(255,255,255,0.10)")}
      {faixa(700, 300, "rgba(0,255,90,0.10)")}
      {faixa(1330, 170, "rgba(255,255,255,0.12)")}
      {linha({ left: 150, top: 0, bottom: 0, width: 3, background: "rgba(255,0,0,0.8)" })}
      {linha({ right: 150, top: 0, bottom: 0, width: 3, background: "rgba(255,0,0,0.8)" })}
      {linha({ right: 120, top: 0, bottom: 0, width: 2, background: "rgba(255,200,0,0.8)" })}
    </AbsoluteFill>
  );
};
