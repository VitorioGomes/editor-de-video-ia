"""As pastas de quem usa: criadas na primeira conversa, e o vídeo aprovado indo para editor/editados/.

  editor/brutos/     onde a pessoa põe o vídeo ou o áudio gravado
  editor/versoes/    as versões que ela assiste antes de aprovar
  editor/editados/   os vídeos aprovados, prontos para postar
  projetos/NOME/     o trabalho de cada vídeo (a pessoa não precisa abrir)
  meu-estilo/        o gosto dela: marca.json (vazio = os padrões de cada estilo) e regras.md
"""
from __future__ import annotations

import shutil
from pathlib import Path

from .comum import BRUTOS, EDITADOS, EDITOR, MEU_ESTILO, PROJETOS, RAIZ, VERSOES, nome_do_video

REGRAS = """# O meu estilo

O que a IA aprendeu com as correções e as aprovações. Cada linha com a data.

## Perfil

- Nicho e público: (sai do primeiro roteiro ou vídeo)
- Voz nos estilos sem rosto: (ia ou gravada)

## Todos os estilos

## Título

## Títulos Desenhados

## Parede

## Metade

## Motion

## Tela do Claude

## Colagem

## Série Animada

## Curta 3D

## Conversa
"""


def comecar(migrar: bool = False) -> None:
    """Cria o que falta, sem mexer no que já existe. Pode rodar quantas vezes quiser."""
    criadas = []
    for pasta in (BRUTOS, VERSOES, EDITADOS, PROJETOS, MEU_ESTILO):
        if not pasta.exists():
            pasta.mkdir(parents=True)
            criadas.append(pasta.relative_to(RAIZ).as_posix() + "/")
    marca = MEU_ESTILO / "marca.json"
    if not marca.exists():
        marca.write_text("{}\n", encoding="utf-8")  # vazio: valem as cores e fontes de cada estilo
        criadas.append("meu-estilo/marca.json")
    regras = MEU_ESTILO / "regras.md"
    if not regras.exists():
        regras.write_text(REGRAS, encoding="utf-8")
        criadas.append("meu-estilo/regras.md")
    print("Criado: " + ", ".join(criadas) if criadas else "Tudo já existia.")

    antigos = RAIZ / "videos"
    if antigos.is_dir():
        prontos = sorted(antigos.glob("*/pronto*.mp4"))
        if migrar:
            for p in prontos:
                destino = _livre(EDITADOS / f"{p.parent.name}{p.stem[len('pronto'):]}.mp4")
                shutil.move(str(p), destino)
                print(f"  {p.relative_to(RAIZ).as_posix()} -> {destino.relative_to(RAIZ).as_posix()}")
            print(f"{len(prontos)} vídeos prontos movidos para editor/editados/. O resto de videos/ continua lá.")
        else:
            print(f"Há uma pasta videos/ da versão antiga ({len(prontos)} vídeos prontos). Ela continua funcionando; "
                  "os vídeos novos usam editor/ e projetos/. Para levar os prontos para editor/editados/: "
                  "python sistema/editar.py comecar --migrar")
    print(f"A pessoa só precisa abrir {EDITOR.relative_to(RAIZ).as_posix()}/: brutos/ (o que ela grava), "
          "versoes/ (para assistir) e editados/ (aprovados).")


def _livre(alvo: Path) -> Path:
    n = 2
    destino = alvo
    while destino.exists():
        destino = alvo.with_name(f"{alvo.stem}-{n}{alvo.suffix}")
        n += 1
    return destino


def aprovar(versao: Path) -> None:
    """A versão que a pessoa aprovou vai para editor/editados/NOME.mp4. As outras versões ficam em versoes/."""
    if not versao.exists():
        raise SystemExit(f"Não achei {versao}.")
    EDITADOS.mkdir(parents=True, exist_ok=True)
    destino = _livre(EDITADOS / f"{nome_do_video(versao)}{versao.suffix}")
    shutil.move(str(versao), destino)
    print(f"Aprovado: {destino}")
