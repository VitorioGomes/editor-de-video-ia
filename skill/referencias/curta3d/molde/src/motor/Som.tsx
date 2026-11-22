// O som: a voz e os efeitos do kit de sons do produto (sistema/efeitos). Sem música.
// Cada efeito começa em (momento + 1 quadro - ponto de sincronia do som). O volume sai da régua contra a fala
// medida pelo preparar.mjs (mediana em 100 ms, as mesmas janelas do `escutar`): o pico do efeito fica
//   contato (pouso, batida, passo, caixa, tampa, clique) uns 9 dB abaixo da fala,
//   curto (whoosh, swish, brilho curto, notificação) uns 13 dB abaixo,
//   contínuo (som de mais de 0,9 s: escrita, contador, ligar, deslize longo) uns 20 dB abaixo.
// O alto-falante do celular perde o grave: todo contato grave leva uma camada aguda (ver contatos.ts).
// O tom varia sozinho de 0,92 a 1,08 a cada vez que um som toca, para não repetir; `tom` fixa um valor.
import React from "react";
import { Audio, Sequence, staticFile, getInputProps } from "remotion";
import { FPS, rng } from "./tempo";
import { AUTO } from "./contatos";
import cfg from "../gerado/config.json";

export type Tipo = "contato" | "curto" | "continuo";
/** um efeito: no quadro `f`, o id do kit de sons (ou "sons/arquivo.wav"), ganho em dB por cima da régua, duração máxima em s */
export type Efeito = { f: number; id: string; ganho?: number; dura?: number; tom?: number; tipo?: Tipo };
type Info = { arquivo: string; sinc: number; dura: number; ataque: number; pico: number; categoria: string };
const C = cfg as unknown as { ganho: number; voz: number; efeitos: Record<string, Info> };
export const REGUA: Record<Tipo, number> = { contato: 9, curto: 13, continuo: 20 };

const CONTATO = new Set(["impacts", "interface", "everyday-props", "foley", "mechanical", "keyboard", "pops", "bounce-spin-zoom", "money"]);
export const tipoDe = (s: Info): Tipo => {
  if (s.dura > 0.9 && !["impacts", "bounce-spin-zoom"].includes(s.categoria)) return "continuo";
  return CONTATO.has(s.categoria) ? "contato" : "curto";
};

const hash = (t: string) => { let h = 7; for (const c of t) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };
const calcular = (e: Efeito) => {
  const s = C.efeitos[e.id];
  if (!s) throw new Error(`efeito sem preparar: ${e.id}. Confira o nome em .ferramenta/sistema/efeitos/catalogue.md e rode node scripts/preparar.mjs`);
  const tom = e.tom ?? 0.92 + 0.16 * rng(e.f * 131 + hash(e.id))();
  const inicio = e.f / FPS + 1 / FPS - s.sinc / tom;        // segundos (o tom muda a velocidade do som)
  const de = Math.round(inicio * FPS);                         // negativo = começa no meio do som
  const corte = Math.max(0, -inicio);
  const dura = Math.min(e.dura ?? s.dura / tom, s.dura / tom - corte);
  const tipo = e.tipo ?? tipoDe(s);
  const db = C.voz - REGUA[tipo] - s.pico + C.ganho + (e.ganho ?? 0);
  return { s, de, dura, corte, db, tom, deixa: { t: +(e.f / FPS).toFixed(3), ataque: +(Math.max(inicio, 0) + Math.max(s.ataque / tom - corte, 0)).toFixed(3), som: e.id, db: +db.toFixed(1) } };
};

/** os efeitos da cena mais os que o motor pôs sozinho (pulos, passos, batidas: ver contatos.ts) */
export const todos = (efeitos: Efeito[]) => [...efeitos, ...AUTO].sort((a, b) => a.f - b.f);
/** a lista que o `python .ferramenta/sistema/editar.py escutar` lê (o render grava em out/deixas.json) */
export const deixas = (efeitos: Efeito[]) => todos(efeitos).map((e) => calcular(e).deixa);

export const Som: React.FC<{ efeitos: Efeito[] }> = ({ efeitos }) => {
  const sem = !!(getInputProps() as { semEfeitos?: boolean }).semEfeitos;
  return (
    <>
      <Audio src={staticFile("voz/voz.wav")} />
      {sem ? null : todos(efeitos).map((e, i) => {
        const { s, de, dura, corte, db, tom } = calcular(e);
        return (
          <Sequence key={i} from={de} durationInFrames={Math.max(1, Math.ceil((corte + dura + 0.05) * FPS))} layout="none">
            <Audio src={staticFile(s.arquivo)} volume={Math.min(1, 10 ** (db / 20))} toneFrequency={tom} />
          </Sequence>
        );
      })}
    </>
  );
};
