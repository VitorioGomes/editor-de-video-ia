# Modelo de peça nova para este vídeo. Copie, troque o nome e a função, e rode:
#   node scripts/blender.mjs blender/peca_nova.py
# A peça sai em pecas/NOME.glb e o preparar.mjs leva para o vídeo (vale por cima de uma peça do kit com o mesmo nome).
# Regras (pivô no chão, frente para -Y, metros, materiais da paleta, juntas e faces de texto): estilo.py do kit.
import os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
PROJETO = os.path.dirname(AQUI)
# a ferramenta: .ferramenta/ na pasta do editor (o projeto fica em .projetos/NOME/, ao lado), ou a pasta com sistema/
d, FERRAMENTA = PROJETO, None
while FERRAMENTA is None:
    for f in (os.path.join(d, ".ferramenta"), d):
        if os.path.exists(os.path.join(f, "sistema", "editar.py")):
            FERRAMENTA = f
            break
    if FERRAMENTA is None and os.path.dirname(d) == d:
        raise SystemExit("Não achei a ferramenta (.ferramenta/sistema/editar.py) acima de " + PROJETO)
    d = os.path.dirname(d)
sys.path.insert(0, os.path.join(FERRAMENTA, "skill", "referencias", "curta3d", "pecas", "blender"))
import estilo as E
from estilo import box, cyl, sphere, torus, tube, arc, extrude, empty, pivot, adopt, screen
import pecas  # as peças do kit, para medir uma contra a outra ou aproveitar uma parte (pecas._roda)

NOME = "xicara"


def construir():
    """Xícara de 9 cm (exemplo). Troque pela sua peça."""
    root = empty(NOME)
    cyl(0.045, 0.085, (0, 0, 0.0425), E.BRANCO, verts=32, bevel=0.008, parent=root, name="xicara_corpo")
    cyl(0.04, 0.004, (0, 0, 0.082), E.mat("cafe", "#4a2c1a", 0.3), verts=32, bevel=0.0, parent=root)
    tube(arc(0.055, 0.045, 0.022, 90, -90, 12), 0.007, E.BRANCO, parent=root)
    return root


if __name__ == "__main__":
    pecas.PECAS[NOME] = construir
    pecas.exportar(NOME, os.path.join(PROJETO, "pecas"))
