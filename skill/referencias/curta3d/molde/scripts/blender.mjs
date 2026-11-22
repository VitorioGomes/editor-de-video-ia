// Roda um script no Blender sem abrir a janela (Windows e Mac).
//   node scripts/blender.mjs blender/peca_nova.py         -> a peça nova vai para pecas/NOME.glb
//   node scripts/blender.mjs --kit lupa,cadeado           -> refaz peças do kit (só quem mantém o kit)
// O Blender é gratuito (blender.org). Se estiver num lugar diferente, defina BLENDER com o caminho do executável.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { PROJETO, acharRaiz } from "./preparar.mjs";

// O mesmo caminho que o `python sistema/editar.py verificar` confere: a variável BLENDER, o lugar padrão do sistema
// (Windows: a versão mais nova em Program Files/Blender Foundation; Mac: /Applications/Blender.app) e o PATH.
const noPath = () => {
  const r = spawnSync(os.platform() === "win32" ? "where" : "which", ["blender"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() || null : null;
};
const acharBlender = () => {
  if (process.env.BLENDER && fs.existsSync(process.env.BLENDER)) return process.env.BLENDER;
  if (os.platform() === "darwin") { const p = "/Applications/Blender.app/Contents/MacOS/Blender"; if (fs.existsSync(p)) return p; }
  if (os.platform() === "win32") {
    const base = path.join(process.env.PROGRAMFILES ?? "C:/Program Files", "Blender Foundation");
    if (fs.existsSync(base)) {
      const versoes = fs.readdirSync(base).filter((d) => fs.existsSync(path.join(base, d, "blender.exe")))
        .sort((x, y) => parseFloat(y.replace(/[^\d.]/g, "")) - parseFloat(x.replace(/[^\d.]/g, "")));
      if (versoes.length) return path.join(base, versoes[0], "blender.exe");
    }
  }
  return noPath();
};

const blender = acharBlender();
if (!blender) {
  console.error("Blender não encontrado. Ele é gratuito e não precisa de placa de vídeo: " + (os.platform() === "darwin" ? "brew install --cask blender" : os.platform() === "win32" ? "winget install BlenderFoundation.Blender" : "instale pelo gerenciador do sistema") + " (ou blender.org, versão 4.2 ou mais nova). Em outro lugar, defina BLENDER com o caminho. Confira com: python sistema/editar.py verificar");
  process.exit(1);
}
const lista = process.argv.slice(2);
let script, extra = [];
if (lista[0] === "--kit") {
  script = path.join(acharRaiz(), "skill", "referencias", "curta3d", "pecas", "blender", "pecas.py");
  extra = lista[1] ? lista[1].split(",") : [];
} else {
  script = path.resolve(PROJETO, lista[0] ?? "");
  extra = lista.slice(1);
  if (!lista[0] || !fs.existsSync(script)) { console.error("Diga o script: node scripts/blender.mjs blender/peca_nova.py"); process.exit(1); }
}
const r = spawnSync(blender, ["-b", "--factory-startup", "-P", script, "--", ...extra], { encoding: "utf8", cwd: PROJETO });
const saida = (r.stdout ?? "") + (r.stderr ?? "");
for (const l of saida.split(/\r?\n/)) if (/^(PECA|  \S+: assentada|AVISO|Traceback|Error|  File|\w+Error)/.test(l)) console.log(l);
if (r.status !== 0 || /Traceback/.test(saida)) { console.error("O Blender falhou. O fim da saída:\n" + saida.slice(-1500)); process.exit(1); }
