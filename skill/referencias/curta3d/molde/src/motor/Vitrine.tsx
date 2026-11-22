// A vitrine: uma peça sozinha no chão, com o acabamento do estilo, enquadrada sozinha.
// Serve para conferir peça nova (node scripts/vitrine.mjs NOME) antes de usar no vídeo.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps } from "remotion";
import { Palco, Cena } from "./Palco";
import { LOOKS } from "./mundo";
import { peca, escrever, texto, no } from "./kit";
import { boneco, FICHA_VITORIO } from "./rosto";
import { chao } from "./pecas3js";
import { orbita, empurra, dolly } from "./camera";
import { V3 } from "./tempo";

/** tela de exemplo: o terminal escuro com uma linha de pedido */
export const telaExemplo = (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.fillStyle = "#1b1b1d"; g.fillRect(0, 0, W, H);
  const fs = Math.min(W, H) * 0.12;
  g.font = `600 ${fs}px "JetBrains Mono", monospace`; g.textBaseline = "middle";
  g.fillStyle = "#d77757"; g.fillText("✻ Claude", W * 0.08, H * 0.22);
  g.fillStyle = "#999999"; g.fillText(">", W * 0.08, H * 0.55);
  g.fillStyle = "#f2f2f2"; g.fillText("faz o relatório", W * 0.08 + fs * 1.2, H * 0.55);
  g.fillStyle = "#4eba65"; g.fillRect(W * 0.08, H * 0.76, W * 0.6, fs * 0.35);
};

export const Vitrine: React.FC = () => {
  const nome = (getInputProps() as { peca?: string }).peca ?? "claude";
  const cena = useMemo<Cena>(() => {
    let cam = { alvo: [0, 0.5, 0] as V3, dist: 4, alt: 1 };
    return {
      look: LOOKS.tarde,
      construir: ({ kit, root }) => {
        root.add(chao({ tamanho: 200, tufos: 400, plano: 6 }));
        // as peças com partes que se escolhem aparecem como ficam num vídeo: o boneco com uma ficha, o Claude que fala sem os extras
        const p = nome === "boneco" ? boneco(kit, FICHA_VITORIO) : peca(kit, nome);
        if (nome === "claude_rosto") { no(p, "claude_feliz").visible = false; no(p, "claude_bochechas").visible = false; }
        root.add(p);
        p.rotation.y = -0.35;
        p.traverse((o) => {
          if (o.name.endsWith("_tela")) escrever(p, o.name, telaExemplo);
          else if (o.name.endsWith("_face")) escrever(p, o.name, texto("TEXTO", { cor: "#2a1d14" }));
        });
        p.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(p);
        const s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
        const r = Math.max(s.y * 1.25, s.x * 1.5, s.z * 1.0); // o quadro em pé é estreito: a largura pesa mais
        cam = { alvo: [c.x, c.y, c.z], dist: r * 2.1 + 0.3, alt: s.y * 0.35 + r * 0.25 };
      },
      posar: (f) => {
        const o = orbita(cam.alvo, 28, cam.dist, cam.alt, { fov: 34, roll: -0.02 });
        return { cam: { fov: 34, roll: -0.02, ...dolly(o.pos, o.look, empurra(f, 0, 0.002)) }, foco: cam.alvo, cInf: 6 };
      },
    };
  }, [nome]);
  return (
    <AbsoluteFill style={{ background: LOOKS.tarde.horizon }}>
      <Palco cena={cena} pecas={[nome]} />
    </AbsoluteFill>
  );
};
