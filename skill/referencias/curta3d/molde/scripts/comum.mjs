// O que o render, os quadros e a vitrine dividem: preparar, montar o pacote do Remotion e achar o navegador.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PROJETO, preparar } from "./preparar.mjs";

// A montagem do Remotion copia public/ para a pasta temporária e não apaga: fica no projeto (.tmp) e é apagada no fim.
const TMP = path.join(PROJETO, ".tmp");
fs.mkdirSync(TMP, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = TMP;

/** Chrome instalado (usa a placa de vídeo pelo ANGLE); sem ele, o Remotion baixa o navegador dele na primeira vez. */
const acharChrome = () => {
  if (process.env.CHROME) return process.env.CHROME;
  const lugares = os.platform() === "win32"
    ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean).map((p) => path.join(p, "Google", "Chrome", "Application", "chrome.exe"))
    : os.platform() === "darwin" ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] : ["/usr/bin/google-chrome"];
  return lugares.find((p) => fs.existsSync(p)) ?? null;
};
export const browserExecutable = acharChrome();
// ANGLE desenha pela placa de vídeo quando há uma, e cai para o processador quando não há.
export const chromiumOptions = { gl: process.env.CURTA_GL ?? "angle" };

export const montar = async () => {
  preparar();
  const { bundle } = await import("@remotion/bundler");
  const t0 = Date.now();
  const serveUrl = await bundle({ entryPoint: path.join(PROJETO, "src", "index.ts"), publicDir: path.join(PROJETO, "public") });
  console.log(`montagem pronta em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return serveUrl;
};

export const limpar = (serveUrl) => fs.rmSync(serveUrl, { recursive: true, force: true });

export const avisosDoNavegador = (l) => { if (l.type === "error") console.log("[navegador]", l.text.slice(0, 400)); };

/** argumentos no formato --nome valor (ou --nome sozinho = true) */
export const args = (lista = process.argv.slice(2)) => {
  const r = { _: [] };
  for (let i = 0; i < lista.length; i++) {
    if (lista[i].startsWith("--")) { const k = lista[i].slice(2); const v = lista[i + 1]; if (v === undefined || v.startsWith("--")) r[k] = true; else { r[k] = v; i++; } }
    else r._.push(lista[i]);
  }
  return r;
};

export { PROJETO };
