// A legenda do produto, queimada no vídeo: de 1 a 3 palavras por vez no terço de baixo, cada palavra entrando
// quando é falada (2 quadros antes), branca e grossa com contorno escuro (fica legível em qualquer fundo 3D),
// com as palavras de "destaques" na cor de destaque da legenda da pessoa. Cores e fonte vêm do marca.json;
// posição e destaques também do "legenda" do curta.json. "modo": "palavra" mostra uma palavra só, troca seca.
import React from "react";
import { useCurrentFrame } from "remotion";
import { PALAVRAS, FPS, normal, clamp01, spring } from "./tempo";
import cfg from "../gerado/config.json";

type Leg = { y?: number; x?: number; largura?: number; destaques?: string[]; modo?: string; cor?: string; tamanho?: number; max_palavras?: number; max_letras?: number };
const C = cfg as { cores: Record<string, string>; fontes: Record<string, string>; legenda: Leg };
const L = C.legenda;
const corDe = (n?: string, padrao = "#ffffff") => (!n ? padrao : n.startsWith("#") ? n : C.cores[n] ?? padrao);
const BRANCO = corDe(L.cor, C.cores.legenda ?? "#ffffff");
const AMARELO = C.cores.legenda_destaque ?? "#ffd84a";
const FONTE = `"${C.fontes.forte ?? "Inter"}", sans-serif`;
const DESTAQUES = new Set((L.destaques ?? []).map(normal));
const MAX = L.modo === "palavra" ? 1 : L.max_palavras ?? 3;
const MAXL = L.max_letras ?? 17;

type Tok = { t: string; a: number; b: number; hl: boolean; cru: string; quem?: string };
const toks: Tok[] = PALAVRAS.map((w) => ({ t: w.texto.replace(/[.,;:!?]+$/, ""), a: w.inicio, b: w.fim, hl: DESTAQUES.has(normal(w.texto)), cru: w.texto, quem: (w as { quem?: string }).quem }));
type Grupo = { toks: Tok[]; a: number; b: number };
const grupos: Grupo[] = (() => {
  const gs: Grupo[] = [];
  let cur: Tok[] = [];
  const fecha = () => { if (cur.length) gs.push({ toks: cur, a: cur[0].a, b: cur[cur.length - 1].b }); cur = []; };
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i], ant = toks[i - 1];
    const len = cur.reduce((n, x) => n + x.t.length + 1, 0) + tk.t.length;
    if (cur.length && (cur.length >= MAX || len > MAXL || tk.a - ant.b > 0.28 || /[.,;:!?]$/.test(ant.cru) || tk.quem !== ant.quem)) fecha();
    cur.push(tk);
  }
  fecha();
  return gs;
})();

/** `esconder`: trechos [quadro inicial, quadro final] sem legenda (quando a cena já escreve a frase em grande).
 *  `y(f)`: a altura da legenda em cada quadro (no Estilo Conversa, perto do rosto de quem fala) */
export const Legenda: React.FC<{ esconder?: [number, number][]; y?: (f: number) => number }> = ({ esconder = [], y }) => {
  const f = useCurrentFrame();
  if (esconder.some(([a, b]) => f >= a && f < b)) return null;
  const t = (f + 2) / FPS;
  let gi = -1;
  for (let i = 0; i < grupos.length; i++) if (t >= grupos[i].a) gi = i;
  if (gi < 0) return null;
  const g = grupos[gi], prox = grupos[gi + 1];
  const fim = prox ? Math.min(prox.a, g.b + 0.7) : g.b + 0.8;
  if (t > fim) return null;
  const sai = prox && prox.a <= g.b + 0.7 ? 1 : clamp01(((fim - t) * FPS) / 3);
  const tam = L.tamanho ?? 82;
  const x = L.x ?? 150, largura = L.largura ?? 780;
  return (
    <div style={{ position: "absolute", left: x, width: largura, top: y ? y(f) : L.y ?? 1330, height: tam * 2.1, display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "0 22px", opacity: sai }}>
      {g.toks.map((tk, i) => {
        const k = (t - tk.a) * FPS;
        if (k < 0) return null;
        const s = MAX === 1 ? 1 : spring(k, 0, 7, 0.1);
        return (
          <span key={i} style={{
            fontFamily: FONTE, fontWeight: 900, fontSize: tam, lineHeight: 1.05, letterSpacing: -0.5,
            color: tk.hl ? AMARELO : BRANCO, display: "inline-block",
            transform: `translateY(${(1 - s) * 18}px) scale(${0.82 + 0.18 * s})`,
            WebkitTextStroke: `${Math.round(tam * 0.17)}px #17121c`, paintOrder: "stroke fill",
            textShadow: "0 6px 0 rgba(23,18,28,0.55), 0 10px 28px rgba(0,0,0,0.35)",
          }}>{tk.t}</span>
        );
      })}
    </div>
  );
};
