"""Confere no áudio como a voz de IA falou as palavras difíceis, pelos sons e não pela palavra.

A transcrição (Whisper) "corrige" para a palavra que conhece: ouve "Claude Code" até quando a voz disse "Clóud Cádi",
que soa como "Claude, Claude". Aqui um reconhecedor de fonemas (wav2vec2 XLSR-53 espeak, local e gratuito, ~1,2 GB,
baixado na primeira vez que precisar) escreve os sons que ouviu, e cada palavra difícil tem o padrão que separa o
certo do errado. A pessoa não precisa ouvir nada: o "voz" confere sozinho e gera de novo a frase que saiu errada.

As regras vêm de REGRAS (as que já se sabe que erram) e da terceira coluna do pronuncia.md ("Sons"), uma expressão
regular sobre os fonemas separados por espaço. Exemplo, calibrado com a voz Will em 2026-11-26:
  certo:  k l aʊ tʃ k oː dʒ i   ("Clóud Côudi")
  errado: k l aʊ d ɨ k aː d i   ("Clóud Cádi")
"""
from __future__ import annotations

import json
import re
import subprocess

M = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"

# Na tela (palavras seguidas, como no palavras.json) -> regex que os sons têm que seguir.
REGRAS = {
    ("Claude", "Code"): r"k l .*k o",  # o "Code" com O; com A ("cádi") soa como outro "Claude"
}

_mod = None
_sem_modelo = False


def _carregar():
    global _mod, _sem_modelo
    if _mod is None and not _sem_modelo:
        try:
            import torch
            from huggingface_hub import hf_hub_download
            from transformers import AutoModelForCTC, Wav2Vec2FeatureExtractor
            print("conferindo a pronúncia pelos sons (na primeira vez, baixa o reconhecedor de fonemas, ~1,2 GB)")
            # o vocabulário é lido direto: o tokenizer dele pede o espeak instalado, e aqui não precisa
            voc = {v: k for k, v in json.load(open(hf_hub_download(M, "vocab.json"), encoding="utf-8")).items()}
            _mod = (torch, Wav2Vec2FeatureExtractor.from_pretrained(M), AutoModelForCTC.from_pretrained(M).eval(), voc)
        except Exception as e:  # sem internet na primeira vez, por exemplo: segue sem conferir, e avisa
            _sem_modelo = True
            print(f"AVISO: não deu para carregar o reconhecedor de fonemas ({e}). A pronúncia não foi conferida: "
                  "peça para a pessoa ouvir as palavras difíceis.")
    return _mod


def sons(wav: str, ini: float, fim: float) -> str | None:
    mod = _carregar()
    if mod is None:
        return None
    import numpy as np
    torch, fe, modelo, voc = mod
    b = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(max(0.0, ini)), "-t", str(fim - ini), "-i", wav,
                        "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    x = np.frombuffer(b, np.int16).astype(np.float32) / 32768
    with torch.no_grad():
        ids = modelo(**fe(x, sampling_rate=16000, return_tensors="pt")).logits.argmax(-1)[0].tolist()
    out, prev = [], None
    for i in ids:
        if i != prev and voc[i] not in ("<pad>", "<s>", "</s>"):
            out.append(voc[i])
        prev = i
    return " ".join(out)


def _limpa(t: str) -> str:
    return re.sub(r"[^\w%]", "", t.lower())


def regras(extras: list[tuple[str, str]] = ()) -> dict:
    """REGRAS mais as do pronuncia.md (Na tela -> Sons). A do pronuncia.md vem por cima."""
    r = {tuple(_limpa(p) for p in k): v for k, v in REGRAS.items()}
    for tela, padrao in extras:
        r[tuple(_limpa(p) for p in tela.split())] = padrao
    return r


def conferir(wav: str, palavras: list, extras: list[tuple[str, str]] = ()) -> list[int]:
    """As posições (no palavras.json) das palavras difíceis que saíram erradas. Vazia se tudo bateu ou se não deu
    para conferir."""
    falhas = []
    for chave, padrao in regras(extras).items():
        n = len(chave)
        for i in range(len(palavras) - n + 1):
            if tuple(_limpa(p["texto"]) for p in palavras[i:i + n]) == chave:
                s = sons(wav, palavras[i]["inicio"] - .05, palavras[i + n - 1]["fim"] + .08)
                if s is None:
                    return []
                ok = re.search(padrao, s) is not None
                print(f"  pronúncia de \"{' '.join(p['texto'] for p in palavras[i:i + n])}\" em "
                      f"{palavras[i]['inicio']:.2f} s: {s} -> {'certa' if ok else 'ERRADA'}")
                if not ok:
                    falhas.append(i)
    return falhas
