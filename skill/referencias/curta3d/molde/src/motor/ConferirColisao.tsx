// A composição da conferência de colisão (scripts/colisao.mjs): monta a cena sem desenhar, anda pelo vídeo e escreve
// os achados no console do navegador (linhas "COLISAO ..."), que o script lê. Ver motor/colisao.ts.
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps } from "remotion";
import { carregarFontes, Cena } from "./Palco";
import { carregarKit } from "./kit";
import { Mundo, LOOKS } from "./mundo";
import { TOTAL } from "./tempo";
import { conferirColisoes, RegrasColisao } from "./colisao";

export const Colisao: React.FC<{ cena: Cena; pecas: string[]; regras?: () => RegrasColisao }> = ({ cena, pecas, regras }) => {
  const [h] = useState(() => delayRender("colisão", { timeoutInMilliseconds: 1800000 }));
  useEffect(() => {
    (async () => {
      try {
        if (!regras) { console.log("COLISAO_ERRO a cena não exporta COLISAO"); return; }
        await carregarFontes();
        const kit = await carregarKit(pecas);
        const mundo = new Mundo(cena.look ?? LOOKS.tarde);
        cena.construir({ kit, mundo, root: mundo.root, gl: null as unknown as THREE.WebGLRenderer });
        const ip = getInputProps() as { passo?: number; de?: number; ate?: number };
        const passo = Number(ip.passo ?? 1), de = Number(ip.de ?? 0), ate = Math.min(TOTAL, Number(ip.ate ?? TOTAL));
        const t0 = Date.now();
        const achados = conferirColisoes(regras(), (f) => { const pz = cena.posar(f); mundo.root.updateMatrixWorld(true); return pz.cam.pos; }, de, ate, passo, (s) => console.log("COLISAO_PROGRESSO " + s));
        for (const a of achados) console.log("COLISAO " + JSON.stringify(a));
        console.log(`COLISAO_FIM ${JSON.stringify({ quadros: Math.ceil((ate - de) / passo), passo, achados: achados.length, segundos: Math.round((Date.now() - t0) / 1000) })}`);
      } catch (e) {
        console.log("COLISAO_ERRO " + String((e as Error)?.stack ?? e).slice(0, 1500));
      } finally {
        continueRender(h);
      }
    })();
  }, [h, cena, pecas, regras]);
  return <AbsoluteFill />;
};
