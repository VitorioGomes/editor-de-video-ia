// O título do bloco no topo (selo escuro com o rostinho do Claude) e o contador logo abaixo (TAREFA 57 % -> 100 %).
// Do vídeo do /btw. Ficam entre 236 e 440 px do topo, a mais de 150 px das laterais (regra de tela do produto).
import React from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, spring } from "./tempo";
import cfg from "../gerado/config.json";

const C = cfg as { fontes: Record<string, string>; cores: Record<string, string> };
const FONTE = `"${C.fontes.forte ?? "Inter"}", sans-serif`;
const MAO = `"${C.fontes.mao ?? "Mali"}", cursive`;
const AMARELO = C.cores.legenda_destaque ?? "#ffc107";

/** de/ate em quadros; `destaque`: palavras do título na cor de destaque */
/** `sub`: uma linha manuscrita embaixo do selo (o subtítulo do gancho), na fonte "mao" da marca */
export type Titulo = { de: number; ate: number; texto: string; destaque?: string[]; rosto?: boolean; sub?: string };
/** contador: `valor(f)` devolve o texto; `barra(f)` de 0 a 1 (opcional); `rotulo(f)` e `cor(f)` podem mudar com o tempo; `treme` = quadro de uma batida */
export type Contador = { de: number; ate: number; rotulo: (f: number) => string; valor: (f: number) => string; cor?: (f: number) => string; barra?: (f: number) => number; treme?: number };

const Rosto: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ width: t, height: t * 0.8, borderRadius: t * 0.2, background: "#d97757", position: "relative", flex: "none", boxShadow: "inset 0 -5px 0 rgba(0,0,0,0.18)" }}>
    {[0.3, 0.6].map((x) => <div key={x} style={{ position: "absolute", left: t * x, top: t * 0.2, width: t * 0.12, height: t * 0.28, background: "#141210", borderRadius: 2 }} />)}
  </div>
);

const pintar = (t: string, d: string[] = []) => d.length ? t.split(new RegExp(`(${d.map((x) => x.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})`)).map((p, i) => <span key={i} style={d.includes(p) ? { color: AMARELO } : {}}>{p}</span>) : t;

export const Selo: React.FC<{ titulos?: Titulo[]; contadores?: Contador[] }> = ({ titulos = [], contadores = [] }) => {
  const f = useCurrentFrame();
  const tt = titulos.find((x) => f >= x.de && f < x.ate);
  const ct = contadores.find((x) => f >= x.de && f < x.ate);
  return (
    <>
      {tt ? (() => {
        const s = spring(f, tt.de, 12, 0.1), op = Math.min(clamp01((f - tt.de) / 3), clamp01((tt.ate - f) / 4));
        const fs = Math.min(50, Math.floor((tt.rosto === false ? 700 : 630) / (0.66 * tt.texto.length))); // cabe em 780 px
        return (
          <div style={{ position: "absolute", top: 236, left: 150, right: 150, display: "flex", justifyContent: "center", opacity: op }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 30px 18px 24px", maxWidth: 780, borderRadius: 26, background: "rgba(24,20,32,0.86)",
              boxShadow: "0 14px 34px rgba(20,10,30,0.35), inset 0 0 0 2px rgba(255,255,255,0.08)", transform: `translateY(${(1 - s) * -26}px) scale(${0.92 + 0.08 * s})` }}>
              {tt.rosto === false ? null : <Rosto t={52} />}
              <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: fs, lineHeight: 1.08, color: "#fff", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{pintar(tt.texto, tt.destaque)}</div>
            </div>
            {tt.sub ? (
              <div style={{ position: "absolute", top: 104, left: 0, right: 0, textAlign: "center", fontFamily: MAO, fontStyle: "italic", fontWeight: 600, fontSize: Math.min(50, Math.floor(1300 / tt.sub.length)), whiteSpace: "nowrap", color: "#fff",
                textShadow: "0 0 4px rgba(20,10,30,.9), 0 3px 14px rgba(20,10,30,.6)", opacity: clamp01((f - tt.de - 8) / 6), transform: `translateY(${(1 - spring(f, tt.de + 8, 12, 0.1)) * 14}px)` }}>{tt.sub}</div>
            ) : null}
          </div>
        );
      })() : null}
      {ct ? (() => {
        const s = spring(f, ct.de, 12, 0.1), op = Math.min(clamp01((f - ct.de) / 3), clamp01((ct.ate - f) / 4));
        const n = ct.treme !== undefined ? f - ct.treme : -1;
        const sh = n >= 0 && n < 10 ? Math.sin(n * 2.2) * 10 * (1 - n / 10) : 0;
        const cor = ct.cor?.(f) ?? "#d97757";
        return (
          <div style={{ position: "absolute", top: tt?.sub ? 430 : 372, left: 150, right: 150, display: "flex", justifyContent: "center", opacity: op }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "12px 26px", borderRadius: 999, background: "rgba(250,246,238,0.94)", boxShadow: "0 10px 26px rgba(20,10,30,0.28)",
              transform: `translateX(${sh}px) translateY(${(1 - s) * -18}px) scale(${0.9 + 0.1 * s})` }}>
              <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 30, color: "#2a2430", letterSpacing: 0.6 }}>{ct.rotulo(f)}</div>
              {ct.barra ? (
                <div style={{ width: 210, height: 18, borderRadius: 9, background: "rgba(42,36,48,0.14)", overflow: "hidden" }}>
                  <div style={{ width: `${clamp01(ct.barra(f)) * 100}%`, height: "100%", borderRadius: 9, background: cor }} />
                </div>
              ) : null}
              <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 48, color: cor, minWidth: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{ct.valor(f)}</div>
            </div>
          </div>
        );
      })() : null}
    </>
  );
};
