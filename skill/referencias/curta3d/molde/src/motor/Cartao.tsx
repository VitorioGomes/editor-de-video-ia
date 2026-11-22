// Os cartões de vidro escuro no alto da tela (o Estilo Conversa): mostram ao pé da letra o que a fala diz.
// Regras (para o rosto não ficar atrás do cartão e nada sair da área segura dos Reels): o cartão começa em 330 px
// (acima de 220 nada importante), fica a 150 px das laterais (os 120 px da direita são dos botões do Reels) e a base
// nunca passa de BASE_MAX (900 px). O conteúdo que não cabe ENCOLHE sozinho até caber (nunca passa da borda do
// vidro). A base de verdade de cada cartão é medida pelo conferir.mjs (src/gerado/bases.json) e o dialogo.ts desce
// os bonecos até os olhos ficarem abaixo dela (cobrir o cabelo pode, os olhos nunca).
// O vidro é quase opaco (fundo movimentado não se lê através dele) e entra e sai rápido (3 quadros de opacidade).
// Símbolo e emoji (★, ✕, ✓) caem na fonte do sistema e saem diferentes em cada máquina: use os desenhos daqui
// (Estrela, Xis, Certo), que o conferir.mjs exige.
// Cada cartão tem um selinho de título ("1 · /clear") com os tracinhos de progresso dos passos e um conteúdo que
// anda com o quadro. Ficam de 330 px para baixo (o selo do título usa 236 a 300) e a 150 px das laterais.
// Conteúdos prontos: Medidor (limite, bateria), Pilha (mensagens que se acumulam), Terminal (comando digitado),
// Grade (o /context), Arquivo (um arquivo que encolhe). O conteúdo de cada vídeo pode ser qualquer JSX.
import React, { useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame } from "remotion";
import { clamp01, spring, smooth } from "./tempo";
import cfg from "../gerado/config.json";
import bases from "../gerado/bases.json";

const C = cfg as unknown as { fontes: Record<string, string>; cores: Record<string, string> };
export const FONTE = `"${C.fontes.forte ?? "Inter"}", sans-serif`;
export const MONO = `"${C.fontes.mono ?? "JetBrains Mono"}", monospace`;
export const LARANJA = "#d97757", VERDE = "#4eba65", VERMELHO = "#ef5a4c", AMARELO = "#ffc94a", AZUL = "#8fb4ff";

/** um cartão: de/ate em quadros; `titulo` no selinho; `passo` [n, total] desenha os tracinhos; `conteudo(f, k)` (k = 0..1 da entrada) */
export type Cartao = { de: number; ate: number; titulo?: string; passo?: [number, number]; altura?: number; base?: number; conteudo: (f: number, k: number) => React.ReactNode };

/** a base mais baixa que um cartão pode ter (px do topo): com olhos 70 px abaixo dela, eles ficam a 970 (a régua é 1000) */
export const BASE_MAX = 900;
const MEDIDAS = bases as Record<string, number>;
/**
 * A base (px do topo) do cartão no quadro, para o dialogo({ cartaoBase }): a medida pelo conferir.mjs (a de verdade,
 * guardada em src/gerado/bases.json pelo quadro de entrada do cartão), ou a `base` dita no cartão, ou BASE_MAX.
 */
export const baseDoCartao = (lista: Cartao[]) => (f: number) => {
  const c = lista.find((x) => f >= x.de - 2 && f < x.ate);
  if (!c) return BASE_MAX;
  return Math.min(BASE_MAX, MEDIDAS[String(c.de)] ?? c.base ?? BASE_MAX);
};

/** o conteúdo encolhe até caber entre o topo dele e a base máxima (e na largura): nunca passa da borda do vidro */
const Cabe: React.FC<{ maxBase: number; f: number; children: React.ReactNode }> = ({ maxBase, f, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ esc: 1, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // a medida sem escala: a altura e a largura de tudo, inclusive do que transborda (posição absoluta)
    let alto = el.scrollHeight, largo = el.scrollWidth;
    const r0 = el.getBoundingClientRect(), z = r0.width / (el.offsetWidth || 1) || 1;
    el.querySelectorAll("*").forEach((n) => {
      const r = (n as HTMLElement).getBoundingClientRect();
      alto = Math.max(alto, (r.bottom - r0.top) / z); largo = Math.max(largo, (r.right - r0.left) / z);
    });
    let topo = 0; for (let n: HTMLElement | null = el; n && n.dataset.cartao === undefined; n = n.offsetParent as HTMLElement | null) topo += n.offsetTop;
    const livre = maxBase - 330 - topo - 30; // 30: o respiro de baixo do vidro (padding e borda)
    const esc = Math.min(1, livre / Math.max(1, alto), el.clientWidth / Math.max(1, largo));
    if (Math.abs(esc - m.esc) > 0.004 || Math.abs(alto - m.h) > 1) setM({ esc, h: alto });
  });
  return (
    <div style={{ height: m.h ? m.h * m.esc : undefined, position: "relative" }}>
      <div ref={ref} style={{ transform: `scale(${m.esc})`, transformOrigin: "top center" }}>{children}</div>
    </div>
  );
};
void 0; // (f entra só para a medida refazer a cada quadro)

export const Cartoes: React.FC<{ lista: Cartao[] }> = ({ lista }) => {
  const f = useCurrentFrame();
  const c = lista.find((x) => f >= x.de && f < x.ate);
  if (!c) return null;
  const k = spring(f, c.de, 10, 0.14);
  // entrada e saída rápidas: 3 quadros de opacidade, para nenhum quadro ficar com o cartão meio apagado (fantasma)
  const sai = clamp01((c.ate - f) / 3);
  const sobe = (1 - k) * -40 + (1 - sai) * -24;
  return (
    <div data-cartao="" style={{ position: "absolute", top: 330, left: 150, right: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: Math.min(clamp01((f - c.de + 1) / 3), sai),
      transform: `translateY(${sobe}px) scale(${0.94 + 0.06 * k})`, filter: `blur(${(1 - Math.min(1, k * 2)) * 4}px)` }}>
      {c.titulo ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 30, letterSpacing: 1.2, color: "#f4efe6", padding: "8px 22px", borderRadius: 999, background: "rgba(20,18,26,0.78)", border: "1px solid rgba(255,255,255,0.14)" }}>{c.titulo}</div>
          {c.passo ? <div style={{ display: "flex", gap: 8 }}>{Array.from({ length: c.passo[1] }, (_, i) => <div key={i} style={{ width: 34, height: 6, borderRadius: 3, background: i < c.passo![0] ? LARANJA : "rgba(255,255,255,0.22)" }} />)}</div> : null}
        </div>
      ) : null}
      <div style={{ width: "100%", minHeight: c.altura ?? 0, borderRadius: 30, padding: "26px 30px", background: "linear-gradient(180deg, rgba(28,26,36,0.94), rgba(14,13,20,0.96))",
        border: "1.5px solid rgba(255,255,255,0.13)", boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)", backdropFilter: "blur(16px)", color: "#f4efe6", fontFamily: FONTE, boxSizing: "border-box" }}>
        <Cabe maxBase={Math.min(BASE_MAX, c.base ?? BASE_MAX)} f={f}>{c.conteudo(f, k)}</Cabe>
      </div>
    </div>
  );
};

/** medidor: rótulo, número grande e barra (vermelha quando acaba) */
export const Medidor: React.FC<{ rotulo: string; valor: number; detalhe?: string }> = ({ rotulo, valor, detalhe }) => {
  const cor = valor < 0.2 ? VERMELHO : valor < 0.5 ? AMARELO : VERDE;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: 1.5, opacity: 0.8 }}>{rotulo}</div>
        <div style={{ fontWeight: 900, fontSize: 64, color: cor, fontVariantNumeric: "tabular-nums" }}>{Math.round(valor * 100)}%</div>
      </div>
      <div style={{ height: 26, borderRadius: 13, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
        <div style={{ width: `${clamp01(valor) * 100}%`, height: "100%", borderRadius: 13, background: cor, boxShadow: `0 0 18px ${cor}` }} />
      </div>
      {detalhe ? <div style={{ fontSize: 26, opacity: 0.7, fontWeight: 600 }}>{detalhe}</div> : null}
    </div>
  );
};

/** pilha de mensagens: `n` linhas visíveis (a última entra com mola); `grandes` = índices que são logs enormes */
export const Pilha: React.FC<{ n: number; f: number; entradas?: number[]; grandes?: number[]; max?: number; lupa?: number }> = ({ n, f, entradas = [], grandes = [], max = 9, lupa }) => {
  const vis = Math.min(n, max);
  const ini = Math.max(0, n - max);
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: vis }, (_, j) => {
        const i = ini + j;
        const s = entradas[i] !== undefined ? spring(f, entradas[i], 8, 0.15) : 1;
        const eu = i % 2 === 0, grande = grandes.includes(i);
        return (
          <div key={i} style={{ alignSelf: eu ? "flex-end" : "flex-start", width: grande ? "96%" : `${52 + ((i * 37) % 30)}%`, height: grande ? 46 : 26, borderRadius: 13,
            background: grande ? "repeating-linear-gradient(90deg, rgba(255,201,74,0.55) 0 14px, rgba(255,201,74,0.25) 14px 22px)" : eu ? "rgba(217,119,87,0.75)" : "rgba(244,239,230,0.28)",
            transform: `scale(${0.6 + 0.4 * s})`, opacity: s, transformOrigin: eu ? "right center" : "left center" }} />
        );
      })}
      {lupa !== undefined ? (
        <div style={{ position: "absolute", left: `${8 + 70 * lupa}%`, top: `${10 + 60 * Math.abs(Math.sin(lupa * Math.PI * 2))}%`, width: 120, height: 120, borderRadius: 60, border: "12px solid #f4efe6",
          background: "rgba(143,180,255,0.18)", boxShadow: "0 0 30px rgba(143,180,255,0.4)" }}>
          <div style={{ position: "absolute", right: -46, bottom: -40, width: 70, height: 16, borderRadius: 8, background: "#f4efe6", transform: "rotate(45deg)" }} />
        </div>
      ) : null}
    </div>
  );
};

/** terminal: o comando digitado letra por letra a partir de `de` (quadros), com o cursor; `saida` aparece depois do Enter */
export const Terminal: React.FC<{ f: number; de: number; comando: string; saida?: React.ReactNode; enter?: number }> = ({ f, de, comando, saida, enter }) => {
  const n = Math.max(0, Math.min(comando.length, Math.floor((f - de) / 2)));
  const cursor = Math.floor(f / 8) % 2 === 0;
  const fim = enter ?? de + comando.length * 2 + 6;
  return (
    <div style={{ fontFamily: MONO, fontSize: 40 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>{[VERMELHO, AMARELO, VERDE].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}</div>
      <div><span style={{ color: "#999" }}>&gt; </span><span style={{ color: AMARELO, fontWeight: 700 }}>{comando.slice(0, n)}</span>{f < fim && cursor ? <span style={{ background: "#e8e8e8", color: "#e8e8e8" }}>_</span> : null}</div>
      {saida && f >= fim ? <div style={{ marginTop: 18, fontSize: 30, opacity: smooth((f - fim) / 6) }}>{saida}</div> : null}
    </div>
  );
};

/** grade do /context: blocos coloridos por categoria (cada um com `n` quadradinhos), com a legenda */
export const Grade: React.FC<{ f: number; de: number; partes: { rotulo: string; n: number; cor: string; destaque?: boolean }[]; total?: number; pulsa?: number }> = ({ f, de, partes, total = 60, pulsa }) => {
  const celulas: { cor: string; d: boolean }[] = [];
  for (const p of partes) for (let i = 0; i < p.n; i++) celulas.push({ cor: p.cor, d: !!p.destaque });
  while (celulas.length < total) celulas.push({ cor: "rgba(255,255,255,0.08)", d: false });
  const pul = pulsa !== undefined ? 1 + 0.06 * Math.max(0, Math.sin((f - pulsa) * 0.35)) * Math.exp(-Math.max(0, f - pulsa) / 30) : 1;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 7 }}>
        {celulas.map((c, i) => {
          const s = spring(f, de + i * 0.5, 6, 0.1);
          return <div key={i} style={{ aspectRatio: "1", borderRadius: 6, background: c.cor, transform: `scale(${s * (c.d ? pul : 1)})`, boxShadow: c.d ? `0 0 14px ${c.cor}` : "none" }} />;
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", marginTop: 18, fontSize: 26, fontWeight: 700 }}>
        {partes.map((p) => <div key={p.rotulo} style={{ display: "flex", alignItems: "center", gap: 8, opacity: p.destaque ? 1 : 0.75 }}><div style={{ width: 18, height: 18, borderRadius: 4, background: p.cor }} />{p.rotulo}</div>)}
      </div>
    </div>
  );
};

/** um arquivo com o número de linhas que muda (o CLAUDE.md encolhendo) */
export const Arquivo: React.FC<{ nome: string; linhas: number; max: number; cor?: string }> = ({ nome, linhas, max, cor = LARANJA }) => (
  <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
    <div style={{ width: 170, height: 210, borderRadius: 14, background: "#f4efe6", position: "relative", overflow: "hidden", flex: "none" }}>
      {Array.from({ length: 9 }, (_, i) => <div key={i} style={{ position: "absolute", left: 18, top: 22 + i * 20, height: 8, borderRadius: 4, background: "#b8b0a2", width: `${(i * 23) % 40 + 45}%`, opacity: i / 9 < linhas / max ? 1 : 0.15 }} />)}
    </div>
    <div>
      <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, color: cor }}>{nome}</div>
      <div style={{ fontSize: 64, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{Math.round(linhas)} <span style={{ fontSize: 30, opacity: 0.7, fontWeight: 700 }}>linhas</span></div>
    </div>
  </div>
);

/**
 * Tela de programa dentro do cartão: a janela do terminal ou do navegador. A regra é copiar o texto real da
 * ferramenta (o comando, a saída, a URL), como aparece na tela dela: tela inventada para um programa real fica estranha.
 * `linhas`: [texto, cor?]; `digita`: quantas letras da última linha já apareceram (para a digitação no tempo da fala).
 */
export const JanelaTerminal: React.FC<{ titulo?: string; linhas: [string, string?][]; digita?: number; largura?: number }> = ({ titulo = "Terminal", linhas, digita, largura = 680 }) => {
  // a fonte cabe a linha mais comprida INTEIRA (contada já completa, para não mudar de tamanho enquanto digita):
  // de 32 px até 20 px; abaixo disso, a linha quebra (nunca corta)
  const maior = Math.max(1, ...linhas.map(([t]) => t.length));
  const fonte = Math.max(20, Math.min(32, Math.floor((largura - 40) / (maior * 0.61))));
  return (
    <div style={{ borderRadius: 18, overflow: "hidden", background: "#121216", border: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#1d1d23" }}>
        {[VERMELHO, AMARELO, VERDE].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
        <div style={{ marginLeft: 12, fontSize: 24, fontWeight: 700, opacity: 0.7 }}>{titulo}</div>
      </div>
      <div style={{ padding: "16px 20px", fontFamily: MONO, fontSize: fonte, lineHeight: 1.35 }}>
        {linhas.map(([t, c], i) => <div key={i} style={{ color: c ?? "#e8e8e8", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{i === linhas.length - 1 && digita !== undefined ? t.slice(0, Math.max(0, Math.floor(digita))) : t}</div>)}
      </div>
    </div>
  );
};

/** símbolos desenhados (em vez de ★ ✕ ✓ da fonte do sistema, que muda de máquina para máquina) */
export const Estrela: React.FC<{ cor: string; t?: number }> = ({ cor, t = 38 }) => (
  <div style={{ width: t, height: t, background: cor, flex: "none", clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" }} />
);
export const Xis: React.FC<{ cor: string; t?: number }> = ({ cor, t = 48 }) => (
  <div style={{ position: "relative", width: t, height: t, flex: "none" }}>
    {[45, -45].map((r) => <div key={r} style={{ position: "absolute", left: 0, top: t / 2 - t * 0.09, width: t, height: t * 0.18, borderRadius: t * 0.09, background: cor, transform: `rotate(${r}deg)` }} />)}
  </div>
);
export const Certo: React.FC<{ cor: string; t?: number }> = ({ cor, t = 48 }) => (
  <div style={{ position: "relative", width: t, height: t, flex: "none" }}>
    <div style={{ position: "absolute", left: t * 0.08, top: t * 0.5, width: t * 0.42, height: t * 0.17, borderRadius: t * 0.09, background: cor, transform: "rotate(45deg)", transformOrigin: "left center" }} />
    <div style={{ position: "absolute", left: t * 0.3, top: t * 0.72, width: t * 0.78, height: t * 0.17, borderRadius: t * 0.09, background: cor, transform: "rotate(-50deg)", transformOrigin: "left center" }} />
  </div>
);

export const JanelaNavegador: React.FC<{ url: string; children?: React.ReactNode; altura?: number }> = ({ url, children, altura = 300 }) => (
  <div style={{ borderRadius: 18, overflow: "hidden", background: "#f4f1ea", border: "1px solid rgba(255,255,255,0.18)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#dcd7cc" }}>
      {[VERMELHO, AMARELO, VERDE].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
      <div style={{ marginLeft: 10, flex: 1, background: "#f4f1ea", borderRadius: 10, padding: "6px 14px", fontFamily: MONO, fontSize: 24, color: "#5a544a" }}>{url}</div>
    </div>
    <div style={{ position: "relative", height: altura, color: "#2a2430" }}>{children}</div>
  </div>
);
