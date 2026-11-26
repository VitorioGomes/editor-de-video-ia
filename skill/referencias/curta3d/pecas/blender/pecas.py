# O kit de peças do Estilo Curta 3D: cada função modela uma peça e cada peça vira um GLB em ../glb/NOME.glb.
#
# Rodar (o Blender é gratuito, blender.org; no Mac o executável fica em /Applications/Blender.app/Contents/MacOS/Blender):
#   blender -b -P pecas.py                  todas as peças
#   blender -b -P pecas.py -- claude lupa   só essas
#   blender -b -P pecas.py -- --saida PASTA (grava os GLB em outra pasta)
# No projeto, o mais fácil é: node scripts/blender.mjs (acha o Blender no Windows e no Mac).
#
# Regras de toda peça: estilo.py. Medidas em metros, pivô no chão, frente para -Y (vira +Z no three.js).
# As peças da ferrovia, da natureza e o Claude vieram do vídeo do /btw do Vitório (2026-11-15).
import bpy, math, os, random, sys
from mathutils import Vector

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import estilo as E
from estilo import box, cyl, sphere, torus, tube, arc, prism, extrude, empty, pivot, adopt, screen, finish, dome, active

PI = math.pi


# ---------------- personagens ----------------
def claude():
    """O Claude: bloco laranja chanfrado, olhos pretos, dois braços e quatro perninhas (1,02 m)."""
    root = empty("claude")
    # bisel largo e redondo (0,17 m em 8 segmentos): a quina pega a luz e dá volume ao bloco
    box((1.0, 0.72, 0.8), (0, 0, 0.67), E.CLAUDE, bevel=0.17, seg=8, parent=root, name="claude_corpo")
    olhos = empty("claude_olhos", (0, -0.362, 0.75), root)
    for sx, nm in ((-1, "E"), (1, "D")):
        e = box((0.11, 0.04, 0.22), (sx * 0.2, -0.356, 0.75), E.OLHO, bevel=0.022, seg=3, name=f"claude_olho{nm}")
        adopt(e, olhos)
    for sx, nm in ((-1, "E"), (1, "D")):
        p = pivot(f"claude_braco{nm}", (sx * 0.5, 0, 0.6), root)
        a = box((0.2, 0.2, 0.16), (sx * 0.58, 0, 0.6), E.CLAUDE, bevel=0.05, seg=4)
        adopt(a, p)
    for i, x in enumerate((-0.33, -0.11, 0.11, 0.33)):
        p = pivot(f"claude_perna{i}", (x, 0, 0.3), root)
        l = box((0.11, 0.14, 0.29), (x, 0, 0.145), E.CLAUDE, bevel=0.035, seg=3)
        adopt(l, p)
    return root


def _pessoa(nome, cabelo_longo=False):
    root = empty(nome)
    for sx, nm in ((-1, "E"), (1, "D")):
        p = pivot(f"{nome}_perna{nm}", (sx * 0.11, 0, 0.82), root)
        adopt(box((0.17, 0.19, 0.74), (sx * 0.11, 0, 0.45), E.CALCA, bevel=0.06), p)
        adopt(box((0.19, 0.3, 0.11), (sx * 0.11, -0.04, 0.055), E.SAPATO, bevel=0.045), p)
    box((0.52, 0.3, 0.62), (0, 0, 1.12), E.ROUPA, bevel=0.12, seg=5, parent=root, name=f"{nome}_tronco")
    for sx, nm in ((-1, "E"), (1, "D")):
        p = pivot(f"{nome}_braco{nm}", (sx * 0.31, 0, 1.36), root)
        adopt(box((0.13, 0.15, 0.52), (sx * 0.33, 0, 1.12), E.ROUPA, bevel=0.06), p)
        adopt(sphere(0.075, (sx * 0.33, 0, 0.83), E.PELE, sub=3), p)
    cab = pivot(f"{nome}_cabeca", (0, 0, 1.42), root)
    adopt(cyl(0.07, 0.1, (0, 0, 1.45), E.PELE, verts=16, bevel=0.01), cab)
    adopt(sphere(0.2, (0, 0, 1.62), E.PELE, scale=(1, 0.95, 1.06), sub=4), cab)
    adopt(sphere(0.214, (0, 0.035, 1.69), E.CABELO, scale=(1.02, 1.0, 0.72), sub=4), cab)
    if cabelo_longo:
        adopt(box((0.4, 0.16, 0.42), (0, 0.13, 1.5), E.CABELO, bevel=0.07), cab)
    olhos = empty(f"{nome}_olhos", (0, -0.19, 1.62), cab)
    for sx in (-1, 1):
        adopt(box((0.04, 0.03, 0.08), (sx * 0.075, -0.188, 1.62), E.OLHO, bevel=0.015, seg=2), olhos)
    return root


def pessoa():
    """Pessoa simples de brinquedo (1,84 m), cabelo curto. Cores trocáveis: pele, roupa, calca, cabelo, sapato."""
    return _pessoa("pessoa")


def pessoa_b():
    """A mesma pessoa com cabelo comprido."""
    return _pessoa("pessoa_b", cabelo_longo=True)


# ---------------- ferramenta, escritório ----------------
def computador():
    """Monitor com teclado e mouse. A tela (computador_tela) recebe o desenho do three.js."""
    root = empty("computador")
    box((0.3, 0.22, 0.03), (0, 0.04, 0.015), E.CARCACA, bevel=0.012, parent=root)
    box((0.07, 0.05, 0.3), (0, 0.06, 0.18), E.CARCACA, bevel=0.015, parent=root)
    box((0.74, 0.06, 0.47), (0, 0.0, 0.55), E.CARCACA, bevel=0.03, seg=4, parent=root, name="computador_moldura")
    screen((0.68, 0.012, 0.41), (0, -0.031, 0.555), E.TELA, root, "computador_tela")
    box((0.48, 0.16, 0.025), (0, -0.3, 0.0125), E.GRAFITE, bevel=0.01, parent=root)
    for r in range(3):
        for c in range(11):
            box((0.032, 0.03, 0.012), (-0.2 + c * 0.04, -0.35 + r * 0.04, 0.028), E.CARCACA, bevel=0.004, seg=1, parent=root)
    sphere(0.035, (0.34, -0.3, 0.012), E.CARCACA, scale=(0.8, 1.2, 0.5), sub=3, parent=root)
    return root


def notebook():
    """Notebook aberto. A tampa gira em notebook_tampa (rotação x); a tela é notebook_tela."""
    root = empty("notebook")
    box((0.46, 0.32, 0.025), (0, 0, 0.0125), E.GRAFITE, bevel=0.01, parent=root)
    box((0.4, 0.15, 0.004), (0, 0.03, 0.026), E.ESCURO, bevel=0.0015, seg=1, parent=root)
    box((0.14, 0.08, 0.003), (0, -0.1, 0.026), E.ESCURO, bevel=0.0012, seg=1, parent=root)
    tampa = pivot("notebook_tampa", (0, 0.155, 0.025), root)
    adopt(box((0.46, 0.018, 0.3), (0, 0.155, 0.175), E.GRAFITE, bevel=0.01), tampa)
    adopt(screen((0.42, 0.004, 0.26), (0, 0.145, 0.178), E.TELA, root, "notebook_tela"), tampa)
    tampa.rotation_euler.x = -0.26
    return root


def celular():
    """Celular em pé (15 cm). A tela é celular_tela. Para ser protagonista, aumente no three.js (escala 4 a 8)."""
    root = empty("celular")
    box((0.078, 0.01, 0.158), (0, 0, 0.079), E.ESCURO, bevel=0.009, seg=4, parent=root)
    screen((0.07, 0.002, 0.148), (0, -0.0055, 0.079), E.TELA, root, "celular_tela")
    return root


def mesa():
    """Mesa de 1,4 x 0,75 m, tampo a 0,75 m."""
    root = empty("mesa")
    box((1.4, 0.75, 0.05), (0, 0, 0.725), E.MADEIRA, bevel=0.015, parent=root, name="mesa_tampo")
    for sx in (-1, 1):
        for sy in (-1, 1):
            box((0.06, 0.06, 0.7), (sx * 0.62, sy * 0.3, 0.35), E.MADEIRA_ESC, bevel=0.012, parent=root)
    return root


def caixa_arquivo():
    """Caixa de arquivo de papelão, oca: fundo e quatro paredes com 1,5 cm de espessura, o lado de dentro mais
    escuro e o ponto caixa_conteudo no fundo (o que vai dentro). A tampa gira em caixa_tampa: a dobradiça é a
    borda de trás, no alto (y +0,165, z 0,28); rotação x negativa abre para trás (-1,9 = aberta em pé).
    A etiqueta é caixa_face, na parede da frente."""
    root = empty("caixa_arquivo")
    e = 0.015
    box((0.42, 0.32, e), (0, 0, e / 2), E.PAPELAO, bevel=0.005, parent=root)                       # fundo
    for sy in (-1, 1):
        box((0.42, e, 0.28), (0, sy * (0.16 - e / 2), 0.14), E.PAPELAO, bevel=0.006, parent=root)  # frente e trás
    for sx in (-1, 1):
        box((e, 0.32 - 2 * e, 0.28), (sx * (0.21 - e / 2), 0, 0.14), E.PAPELAO, bevel=0.006, parent=root)  # lados
        box((0.012, 0.1, 0.035), (sx * 0.211, 0, 0.22), E.MADEIRA_ESC, bevel=0.004, parent=root)   # alças
    # o lado de dentro, mais escuro (a sombra do fundo da caixa)
    box((0.42 - 2 * e - 0.002, 0.32 - 2 * e - 0.002, 0.004), (0, 0, e + 0.002), E.PAPELAO_ESC, bevel=0.0, parent=root)
    for sy in (-1, 1):
        box((0.42 - 2 * e - 0.002, 0.003, 0.26), (0, sy * (0.16 - e - 0.0015), 0.145), E.PAPELAO_ESC, bevel=0.0, parent=root)
    for sx in (-1, 1):
        box((0.003, 0.32 - 2 * e - 0.002, 0.26), (sx * (0.21 - e - 0.0015), 0, 0.145), E.PAPELAO_ESC, bevel=0.0, parent=root)
    empty("caixa_conteudo", (0, 0, e + 0.005), root)
    tampa = pivot("caixa_tampa", (0, 0.165, 0.28), root)
    adopt(box((0.44, 0.34, 0.012), (0, 0, 0.286), E.PAPELAO, bevel=0.004), tampa)
    for sy in (-1, 1):
        adopt(box((0.44, 0.012, 0.05), (0, sy * 0.164, 0.267), E.PAPELAO, bevel=0.004), tampa)
    for sx in (-1, 1):
        adopt(box((0.012, 0.34, 0.05), (sx * 0.214, 0, 0.267), E.PAPELAO, bevel=0.004), tampa)
    screen((0.22, 0.004, 0.1), (0, -0.162, 0.15), E.PAPEL, root, "caixa_face")
    return root


def documento():
    """Folha A4 em pé (com a ponta dobrada). O texto vai em documento_face."""
    root = empty("documento")
    box((0.21, 0.006, 0.297), (0, 0, 0.1485), E.PAPEL, bevel=0.002, seg=1, parent=root)
    screen((0.19, 0.001, 0.25), (0, -0.0035, 0.14), E.PAPEL, root, "documento_face")
    extrude([(0.105, 0.297), (0.06, 0.297), (0.105, 0.252)], -0.006, -0.003, E.LINHA, bevel=0.0, parent=root)
    return root


def pasta():
    """Pasta de papel fechada, em pé, com a aba. A etiqueta vai em pasta_face."""
    root = empty("pasta")
    box((0.32, 0.025, 0.24), (0, 0, 0.12), E.PASTA, bevel=0.008, parent=root)
    box((0.11, 0.024, 0.03), (-0.09, 0.0, 0.25), E.PASTA, bevel=0.008, parent=root)
    screen((0.2, 0.002, 0.07), (0, -0.0135, 0.17), E.PAPEL, root, "pasta_face")
    return root


def cadeado():
    """Cadeado de 0,5 m. A haste (cadeado_haste) sobe e gira em z para abrir."""
    root = empty("cadeado")
    box((0.36, 0.16, 0.3), (0, 0, 0.15), E.LATAO, bevel=0.05, seg=5, parent=root, name="cadeado_corpo")
    cyl(0.035, 0.02, (0, -0.08, 0.18), E.ESCURO, rot=(PI / 2, 0, 0), verts=16, bevel=0.005, parent=root)
    box((0.022, 0.02, 0.06), (0, -0.08, 0.135), E.ESCURO, bevel=0.006, parent=root)
    h = pivot("cadeado_haste", (0.11, 0, 0.3), root)
    pts = [(-0.11, 0, 0.27), (-0.11, 0, 0.4)] + arc(0, 0.4, 0.11, 180, 0, 20)[1:-1] + [(0.11, 0, 0.4), (0.11, 0, 0.27)]
    adopt(tube(pts, 0.032, E.ACO), h)
    return root


def lupa():
    """Lupa de 30 cm em pé no cabo. Vidro meio transparente."""
    root = empty("lupa")
    cyl(0.018, 0.15, (0, 0, 0.075), E.ESCURO, verts=16, bevel=0.006, parent=root)
    cyl(0.022, 0.03, (0, 0, 0.16), E.LATAO, verts=16, bevel=0.005, parent=root)
    torus(0.075, 0.014, (0, 0, 0.25), E.ESCURO, rot=(PI / 2, 0, 0), parent=root)
    cyl(0.072, 0.006, (0, 0, 0.25), E.VIDRO, rot=(PI / 2, 0, 0), verts=40, bevel=0.0, parent=root, name="lupa_vidro")
    return root


def seta():
    """Seta grossa de 1 m apontando para +X (vira com rotação y no three.js). Cor trocável: amarelo."""
    root = empty("seta")
    xz = [(-0.5, 0.16), (0.12, 0.16), (0.12, 0.0), (0.5, 0.25), (0.12, 0.5), (0.12, 0.34), (-0.5, 0.34)]
    extrude(xz, -0.07, 0.07, E.AMARELO, bevel=0.03, parent=root)
    return root


FONTE_SINAL = os.path.join(AQUI, "fontes", "Inter-Black.ttf")  # Inter (OFL), a mesma da legenda


def _sinal(nome, char, m, altura=0.8):
    """Um sinal sólido feito da letra da fonte (gancho e ponto já alinhados), extrudado e chanfrado."""
    root = empty(nome)
    fnt = bpy.data.fonts.load(FONTE_SINAL)
    cu = bpy.data.curves.new(nome, 'FONT'); cu.body = char; cu.font = fnt
    cu.size = altura / 0.73; cu.extrude = 0.06; cu.bevel_depth = 0.022; cu.bevel_resolution = 4
    cu.align_x = 'CENTER'; cu.align_y = 'BOTTOM_BASELINE'
    o = bpy.data.objects.new(nome + "_corpo", cu); bpy.context.scene.collection.objects.link(o)
    o.rotation_euler = (PI / 2, 0, 0)
    active(o); bpy.ops.object.convert(target='MESH')
    o = bpy.context.active_object
    finish(o, m, 0, smooth_angle=35, parent=root, name=nome + "_corpo")
    bpy.context.view_layer.update()
    xs = [(o.matrix_world @ v.co).x for v in o.data.vertices]
    o.location.x -= (max(xs) + min(xs)) / 2  # centrado no pivô
    return root


def interrogacao():
    """Um "?" sólido de 0,8 m, da fonte Inter Black (o ponto alinhado com o gancho)."""
    return _sinal("interrogacao", "?", E.AMARELO)


def exclamacao():
    """Um "!" sólido de 0,8 m, da fonte Inter Black."""
    return _sinal("exclamacao", "!", E.VERMELHO)


# ---------------- depósito (2026-11-20) ----------------
def estante():
    """Estante de depósito de 2,4 x 0,6 x 3,2 m: montantes de aço, quatro prateleiras e caixas de papelão de
    tamanhos variados, cada uma com a etiqueta. Fica de frente para -Y; em fila, faz os corredores."""
    root = empty("estante")
    random.seed(31)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box((0.07, 0.07, 3.2), (sx * 1.17, sy * 0.27, 1.6), E.ACO_ESCURO, bevel=0.012, parent=root)
    for k, z in enumerate((0.12, 0.92, 1.72, 2.52, 3.16)):
        box((2.42, 0.62, 0.04), (0, 0, z), E.MADEIRA, bevel=0.01, parent=root)
        box((2.42, 0.04, 0.08), (0, -0.3, z - 0.02), E.LARANJA, bevel=0.01, parent=root)  # a viga laranja da frente
        if z > 3:
            continue
        x = -1.1
        while x < 1.05:
            w = random.uniform(0.32, 0.6); h = random.uniform(0.34, 0.62); d = random.uniform(0.36, 0.52)
            if x + w > 1.12:
                break
            if random.random() < 0.88:
                cx = x + w / 2
                box((w, d, h), (cx, random.uniform(-0.05, 0.05), z + 0.02 + h / 2), E.PAPELAO if random.random() < 0.8 else E.PAPELAO_ESC, bevel=0.012, parent=root, rot=(0, 0, random.uniform(-0.06, 0.06)))
                box((w * 0.45, 0.004, h * 0.22), (cx, -d / 2 - 0.002, z + 0.02 + h * 0.55), E.PAPEL, bevel=0.0, parent=root)
            x += w + random.uniform(0.02, 0.06)
    return root


def luminaria_pendente():
    """Luminária industrial pendurada: a cúpula de metal, a lâmpada acesa e 1,5 m de fio. O pivô fica embaixo da
    cúpula; pendure no three.js pela altura (a lâmpada fica a uns 0,15 m do pivô)."""
    root = empty("luminaria_pendente")
    cyl(0.32, 0.3, (0, 0, 0.17), E.ACO_ESCURO, verts=32, bevel=0.01, r2=0.08, parent=root, name="luminaria_cupula")
    sphere(0.1, (0, 0, 0.1), E.LAMPADA, sub=3, parent=root, name="luminaria_lampada")
    cyl(0.012, 1.5, (0, 0, 1.07), E.ESCURO, verts=8, bevel=0.0, parent=root)
    return root


def balao():
    """Balão de mensagem em pé, de frente (-Y). O texto vai em balao_face."""
    root = empty("balao")
    box((1.6, 0.32, 1.0), (0, 0, 0.78), E.BALAO, bevel=0.22, seg=6, parent=root, name="balao_corpo")
    bpy.ops.mesh.primitive_cone_add(radius1=0.16, radius2=0.0, depth=0.34, vertices=4, location=(-0.45, 0, 0.17), rotation=(0, -0.5, PI / 4))
    t = bpy.context.active_object; t.scale = (1, 0.6, 1)
    finish(t, E.BALAO, 0.03, parent=root)
    screen((1.3, 0.004, 0.72), (0, -0.161, 0.78), E.BALAO, root, "balao_face")
    return root


# ---------------- placas ----------------
def placa():
    """Placa de madeira num poste (a do /btw). O texto vai em placa_face."""
    root = empty("placa")
    cyl(0.07, 1.6, (0, 0, 0.8), E.MADEIRA_ESC, verts=10, bevel=0.02, parent=root)
    box((1.5, 0.1, 0.62), (0, -0.09, 1.45), E.MADEIRA, bevel=0.04, parent=root, name="placa_tabua")
    screen((1.36, 0.004, 0.5), (0, -0.142, 1.45), E.MADEIRA, root, "placa_face")
    return root


def placa_seta():
    """Placa em forma de seta (para +X) num poste. O texto vai em placa_seta_face."""
    root = empty("placa_seta")
    cyl(0.06, 1.8, (0, 0, 0.9), E.MADEIRA_ESC, verts=10, bevel=0.02, parent=root)
    xz = [(-0.55, 1.3), (0.45, 1.3), (0.75, 1.52), (0.45, 1.74), (-0.55, 1.74)]
    extrude(xz, -0.14, -0.07, E.CREME, bevel=0.025, parent=root, name="placa_seta_tabua")
    screen((0.92, 0.004, 0.36), (-0.06, -0.142, 1.52), E.CREME, root, "placa_seta_face")
    return root


# ---------------- construções ----------------
def casa():
    """Casa térrea de 4 x 3,2 m, porta de 2 m. Janelas acesas (janela)."""
    root = empty("casa")
    box((4.15, 3.35, 0.2), (0, 0, 0.1), E.PEDRA_CLARA, bevel=0.04, parent=root)
    box((4.0, 3.2, 2.6), (0, 0, 1.5), E.PAREDE, bevel=0.06, parent=root, name="casa_parede")
    rf = prism([(-2.35, 2.75), (2.35, 2.75), (0, 4.2)], -1.9, 1.9, E.TELHADO)
    finish(rf, E.TELHADO, 0.07, seg=3, parent=root, name="casa_telhado")
    box((0.45, 0.45, 1.1), (1.2, 0.6, 3.75), E.TELHADO, bevel=0.04, parent=root)
    box((0.95, 0.1, 2.05), (0.85, -1.6, 1.22), E.MADEIRA_ESC, bevel=0.03, parent=root, name="casa_porta")
    sphere(0.05, (1.17, -1.67, 1.2), E.LATAO, sub=2, parent=root)
    box((1.3, 0.5, 0.15), (0.85, -1.85, 0.12), E.PEDRA_CLARA, bevel=0.03, parent=root)
    for x in (-1.05,):
        box((1.0, 0.08, 1.0), (x, -1.6, 1.65), E.BRANCO, bevel=0.03, parent=root)
        box((0.82, 0.1, 0.82), (x, -1.61, 1.65), E.JANELA, bevel=0.02, parent=root, name="casa_janela")
    for y in (-0.6, 0.7):
        box((0.08, 0.8, 0.8), (2.0, y, 1.65), E.BRANCO, bevel=0.03, parent=root)
        box((0.1, 0.62, 0.62), (2.01, y, 1.65), E.JANELA, bevel=0.02, parent=root)
    return root


def predio():
    """Prédio de 4 andares (13 m), janelas de vidro e toldo na entrada."""
    root = empty("predio")
    vid = E.mat("vidro_predio", "#8fb9dc", 0.18, 0.1)
    box((5.2, 5.2, 0.3), (0, 0, 0.15), E.PEDRA_CLARA, bevel=0.05, parent=root)
    box((5.0, 5.0, 12.4), (0, 0, 6.5), E.PAREDE2, bevel=0.08, parent=root, name="predio_parede")
    box((5.2, 5.2, 0.4), (0, 0, 12.9), E.ESCURO, bevel=0.06, parent=root)
    for andar in range(1, 4):
        z = 1.2 + andar * 2.9
        for c in (-1.6, 0, 1.6):
            box((1.0, 0.1, 1.5), (c, -2.5, z), vid, bevel=0.03, parent=root)
            box((1.15, 0.12, 0.1), (c, -2.52, z - 0.82), E.BRANCO, bevel=0.03, parent=root)
            box((0.1, 1.0, 1.5), (2.5, c, z), vid, bevel=0.03, parent=root)
    box((1.6, 0.12, 2.3), (0, -2.52, 1.45), vid, bevel=0.03, parent=root, name="predio_porta")
    box((2.4, 1.0, 0.12), (0, -2.95, 2.85), E.AMARELO, bevel=0.04, parent=root, name="predio_toldo")
    for c in (-1.6, 1.6):
        box((1.0, 0.1, 1.5), (c, -2.5, 1.7), vid, bevel=0.03, parent=root)
    return root


# ---------------- ferrovia (do vídeo do /btw) ----------------
def _roda(r, x, y, z, m, nm, parent, w=0.12):
    p = pivot(nm, (x, y, z), parent)
    adopt(cyl(r, w, (x, y, z), m, rot=(0, PI / 2, 0), verts=28, bevel=0.025), p)
    adopt(cyl(r * 0.35, w + 0.04, (x + (0.02 if x > 0 else -0.02), y, z), E.LATAO, rot=(0, PI / 2, 0), verts=16, bevel=0.015), p)
    adopt(box((w + 0.03, r * 1.6, r * 0.22), (x + (0.03 if x > 0 else -0.03), y, z), E.ESCURO, bevel=0.02), p)
    return p


def locomotiva():
    """Locomotiva a vapor com cabine aberta (o maquinista aparece). Rodas em locomotiva_roda*, frente -Y."""
    root = empty("locomotiva")
    box((1.25, 3.2, 0.26), (0, 0, 0.52), E.ESCURO, bevel=0.06, parent=root)
    box((1.42, 0.22, 0.3), (0, -1.66, 0.5), E.VERMELHO, bevel=0.06, parent=root)
    for sx in (-1, 1):
        cyl(0.09, 0.14, (sx * 0.45, -1.82, 0.5), E.ACO, rot=(PI / 2, 0, 0), verts=16, bevel=0.02, parent=root)
    bpy.ops.mesh.primitive_cone_add(radius1=0.75, radius2=0.08, depth=0.5, vertices=4, location=(0, -1.95, 0.34), rotation=(PI / 2, 0, PI / 4))
    cc = bpy.context.active_object; cc.scale = (1.0, 0.45, 1.0)
    finish(cc, E.ESCURO, 0.03, parent=root)
    cyl(0.56, 1.75, (0, -0.72, 1.12), E.AZUL, rot=(PI / 2, 0, 0), verts=40, bevel=0.05, parent=root)
    cyl(0.58, 0.1, (0, -1.62, 1.12), E.ESCURO, rot=(PI / 2, 0, 0), verts=40, bevel=0.03, parent=root)
    for y in (-1.3, -0.72, -0.12):
        cyl(0.585, 0.07, (0, y, 1.12), E.LATAO, rot=(PI / 2, 0, 0), verts=40, bevel=0.02, parent=root)
    cyl(0.17, 0.62, (0, -1.25, 1.85), E.ESCURO, verts=24, bevel=0.03, r2=0.22, parent=root, name="locomotiva_chamine")
    cyl(0.27, 0.12, (0, -1.25, 2.18), E.ESCURO, verts=24, bevel=0.04, parent=root)
    sphere(0.24, (0, -0.55, 1.66), E.LATAO, scale=(1, 1, 0.8), parent=root)
    cyl(0.15, 0.2, (0, -1.72, 1.62), E.ESCURO, rot=(PI / 2, 0, 0), verts=20, bevel=0.03, parent=root)
    cyl(0.11, 0.06, (0, -1.83, 1.62), E.LAMPADA, rot=(PI / 2, 0, 0), verts=20, bevel=0.01, parent=root, name="locomotiva_farol")
    box((1.36, 1.3, 0.62), (0, 0.85, 0.95), E.AZUL, bevel=0.06, parent=root)
    box((1.36, 0.12, 0.7), (0, 0.24, 0.98), E.AZUL, bevel=0.05, parent=root)
    for sx in (-1, 1):
        for y in (0.28, 1.42):
            box((0.12, 0.12, 0.85), (sx * 0.62, y, 1.65), E.AZUL, bevel=0.04, parent=root)
        box((0.04, 1.2, 0.08), (sx * 0.69, 0.85, 1.22), E.LATAO, bevel=0.02, parent=root)
    box((1.6, 1.62, 0.14), (0, 0.85, 2.12), E.TELHADO, bevel=0.06, seg=5, parent=root, name="locomotiva_teto")
    for sx in (-1, 1):
        for i, y in enumerate((-1.05, -0.25, 0.65)):
            _roda(0.33 if i < 2 else 0.3, sx * 0.66, y, 0.36, E.VERMELHO, f"locomotiva_roda{i}{'E' if sx < 0 else 'D'}", root)
    for sx in (-1, 1):
        box((0.05, 1.75, 0.07), (sx * 0.76, -0.2, 0.36), E.ACO, bevel=0.02, parent=root, name=f"locomotiva_biela{'E' if sx < 0 else 'D'}")
    empty("locomotiva_cabine", (0, 0.85, 0.66), root)  # onde o maquinista fica de pé
    return root


def vagao():
    """Vagão plataforma com bordas baixas. O que ele leva vai no ponto vagao_carga."""
    root = empty("vagao")
    box((1.18, 2.4, 0.2), (0, 0, 0.5), E.ESCURO, bevel=0.05, parent=root)
    box((1.3, 2.5, 0.12), (0, 0, 0.66), E.MADEIRA, bevel=0.04, parent=root, name="vagao_piso")
    for sx in (-1, 1):
        box((0.06, 2.4, 0.16), (sx * 0.62, 0, 0.78), E.MADEIRA_ESC, bevel=0.02, parent=root)
    for y in (-1.3, 1.3):
        cyl(0.07, 0.16, (0, y, 0.5), E.ACO, rot=(PI / 2, 0, 0), verts=12, bevel=0.015, parent=root)
    for sx in (-1, 1):
        for i, y in enumerate((-0.72, 0.72)):
            _roda(0.25, sx * 0.6, y, 0.29, E.ESCURO, f"vagao_roda{i}{'E' if sx < 0 else 'D'}", root, w=0.1)
    empty("vagao_carga", (0, 0, 0.72), root)
    return root


def carrinho():
    """Carrinho de linha amarelo (o ajudante do /btw), com a alavanca de bombear (carrinho_bomba)."""
    root = empty("carrinho")
    box((1.2, 1.5, 0.16), (0, 0, 0.55), E.AMARELO, bevel=0.05, parent=root)
    box((1.05, 1.35, 0.18), (0, 0, 0.4), E.ESCURO, bevel=0.05, parent=root)
    for sx in (-1, 1):
        for i, y in enumerate((-0.48, 0.48)):
            _roda(0.22, sx * 0.6, y, 0.25, E.ESCURO, f"carrinho_roda{i}{'E' if sx < 0 else 'D'}", root, w=0.1)
    cyl(0.06, 0.75, (0, 0, 0.98), E.ESCURO, verts=12, bevel=0.015, parent=root)
    p = pivot("carrinho_bomba", (0, 0, 1.36), root)
    adopt(box((0.07, 1.3, 0.07), (0, 0, 1.36), E.AMARELO, bevel=0.025), p)
    for y in (-0.65, 0.65):
        adopt(box((0.6, 0.07, 0.07), (0, y, 1.36), E.ESCURO, bevel=0.025), p)
    return root


def estacao():
    """Estação: plataforma de 6 x 16 m (borda amarela do lado -X, o do trilho) e a casinha."""
    root = empty("estacao")
    box((6.0, 16.0, 0.7), (1.3, 0, 0.35), E.PEDRA_CLARA, bevel=0.08, parent=root)
    box((0.18, 16.0, 0.04), (-1.55, 0, 0.71), E.AMARELO, bevel=0.02, parent=root)
    box((3.0, 4.6, 2.5), (2.6, 1.5, 1.95), E.CREME, bevel=0.06, parent=root)
    rf = prism([(0.75, 3.2), (4.45, 3.2), (2.6, 4.55)], -1.3, 4.3, E.TELHADO)
    finish(rf, E.TELHADO, 0.07, seg=3, parent=root)
    box((0.1, 0.9, 1.5), (1.08, 0.6, 1.45), E.MADEIRA_ESC, bevel=0.03, parent=root)
    for y in (2.1, 3.2):
        box((0.1, 0.8, 0.8), (1.08, y, 2.0), E.JANELA, bevel=0.03, parent=root, name="estacao_janela")
    box((0.5, 1.8, 0.1), (1.5, -2.6, 1.15), E.MADEIRA, bevel=0.03, parent=root)
    for y in (-3.3, -1.9):
        box((0.4, 0.1, 0.45), (1.5, y, 0.92), E.ESCURO, bevel=0.02, parent=root)
    return root


def poste():
    """Poste de luz de 3,1 m com a lâmpada acesa (brilha no bloom)."""
    root = empty("poste")
    cyl(0.16, 0.18, (0, 0, 0.09), E.ESCURO, verts=16, bevel=0.03, parent=root)
    cyl(0.055, 2.6, (0, 0, 1.4), E.ESCURO, verts=12, bevel=0.015, parent=root)
    cyl(0.17, 0.08, (0, 0, 2.72), E.ESCURO, verts=16, bevel=0.02, parent=root)
    cyl(0.12, 0.26, (0, 0, 2.89), E.LAMPADA, verts=16, bevel=0.02, parent=root, name="poste_lampada")
    cyl(0.22, 0.14, (0, 0, 3.07), E.ESCURO, verts=4, bevel=0.03, r2=0.04, parent=root)
    return root


def alavanca():
    """Alavanca de agulha. O braço gira em alavanca_braco (rotação x)."""
    root = empty("alavanca")
    box((0.6, 0.5, 0.5), (0, 0, 0.25), E.VERDE, bevel=0.06, parent=root)
    p = pivot("alavanca_braco", (0, 0, 0.5), root)
    adopt(cyl(0.045, 1.2, (0, 0, 1.1), E.VERMELHO, verts=12, bevel=0.015), p)
    adopt(sphere(0.1, (0, 0, 1.72), E.BRANCO, sub=2), p)
    return root


def caixote():
    """Caixote de madeira de 1 m (o cadeado é uma peça à parte)."""
    root = empty("caixote")
    box((1.0, 1.0, 0.9), (0, 0, 0.45), E.MADEIRA, bevel=0.06, parent=root)
    for z in (0.18, 0.72):
        box((1.04, 1.04, 0.1), (0, 0, z), E.MADEIRA_ESC, bevel=0.03, parent=root)
    return root


# ---------------- natureza ----------------
def _arvore_cone(name, h=3.2, seed=1):
    random.seed(seed)
    root = empty(name)
    cyl(0.14, 0.9, (0, 0, 0.45), E.TRONCO, verts=10, bevel=0.03, parent=root)
    z = 0.7
    for i, (r, d) in enumerate(((1.0, 1.4), (0.78, 1.2), (0.52, 1.0))):
        cyl(r * h / 3.2, d * h / 3.2, (0, 0, z + d * h / 6.4), E.FOLHA3 if i % 2 == 0 else E.FOLHA1, verts=9, bevel=0.06, r2=r * 0.25 * h / 3.2, parent=root, seg=3)
        z += d * h / 3.2 * 0.55
    return root


def _arvore_redonda(name, seed=2):
    random.seed(seed)
    root = empty(name)
    cyl(0.13, 1.3, (0, 0, 0.65), E.TRONCO, verts=10, bevel=0.03, parent=root)
    sphere(0.95, (0, 0, 1.85), E.FOLHA2, scale=(1, 1, 0.9), sub=2, parent=root, smooth=False, jitter=0.06)
    sphere(0.6, (0.45, 0.2, 2.45), E.FOLHA1, scale=(1, 1, 0.9), sub=2, parent=root, smooth=False, jitter=0.06)
    return root


def _arbusto(name, seed=3):
    random.seed(seed)
    root = empty(name)
    for (x, y, r) in ((0, 0, 0.55), (0.45, 0.1, 0.4), (-0.4, -0.05, 0.42)):
        sphere(r, (x, y, r * 0.75), E.FOLHA2 if r > 0.5 else E.FOLHA1, scale=(1, 1, 0.85), sub=2, parent=root, smooth=False, jitter=0.07)
    return root


def _pedra(name, seed=4):
    random.seed(seed)
    root = empty(name)
    sphere(0.5, (0, 0, 0.3), E.PEDRA, scale=(1.2, 0.9, 0.7), sub=1, parent=root, smooth=False, jitter=0.18)
    return root


def _nuvem(name, seed):
    random.seed(seed)
    root = empty(name)
    for i in range(5):
        r = random.uniform(1.2, 2.2)
        sphere(r, (i * 1.7 - 3.4, random.uniform(-0.6, 0.6), r * 0.62), E.NUVEM, scale=(1, 0.8, 0.62), sub=2, parent=root, smooth=True)
    return root



# ---------------- obra e trabalho (2026-11-20, vídeo "O Opus pensa, o Haiku trabalha") ----------------
def capacete():
    """Capacete de obra (cabe em cima do Claude: ponha em y 1,07 dele). Cor trocável: capacete (branco = chefe)."""
    root = empty("capacete")
    dome(0.34, (0, 0, 0.05), E.CAPACETE, scale=(1.0, 1.08, 0.82), parent=root, name="capacete_casco")
    cyl(0.44, 0.05, (0, -0.06, 0.05), E.CAPACETE, verts=40, bevel=0.02, parent=root, name="capacete_aba")
    box((0.08, 0.62, 0.1), (0, 0, 0.3), E.CAPACETE, bevel=0.035, parent=root)
    return root


def prancheta():
    """Prancheta de desenho (mesa inclinada) com a planta em prancheta_face. O tampo gira em prancheta_tampo."""
    root = empty("prancheta")
    for sx in (-1, 1):
        for sy in (-1, 1):
            box((0.05, 0.05, 0.92), (sx * 0.45, sy * 0.26, 0.46), E.MADEIRA_ESC, bevel=0.012, parent=root)
    box((0.95, 0.05, 0.05), (0, 0.26, 0.25), E.MADEIRA_ESC, bevel=0.012, parent=root)
    t = pivot("prancheta_tampo", (0, 0, 0.95), root)
    adopt(box((1.1, 0.04, 0.78), (0, 0, 0.95), E.MADEIRA, bevel=0.015), t)
    adopt(screen((1.0, 0.004, 0.68), (0, -0.022, 0.95), E.PAPEL, root, "prancheta_face"), t)
    adopt(box((1.1, 0.07, 0.04), (0, -0.04, 0.95 - 0.4), E.MADEIRA_ESC, bevel=0.012), t)
    t.rotation_euler.x = math.radians(-58)
    return root


def esteira():
    """Esteira de 3 m ao longo de X, correia a 0,86 m. As taliscas (esteira_taliscas) andam em x para dar o movimento."""
    root = empty("esteira")
    for sy in (-1, 1):
        box((3.1, 0.06, 0.16), (0, sy * 0.36, 0.82), E.AMARELO, bevel=0.02, parent=root)
        for x in (-1.35, 0, 1.35):
            box((0.07, 0.07, 0.76), (x, sy * 0.33, 0.38), E.ESCURO, bevel=0.015, parent=root)
    box((3.0, 0.62, 0.08), (0, 0, 0.8), E.CORREIA, bevel=0.03, parent=root, name="esteira_correia")
    for x in (-1.5, 1.5):
        p = pivot(f"esteira_rolo{'E' if x < 0 else 'D'}", (x, 0, 0.8), root)
        adopt(cyl(0.06, 0.66, (x, 0, 0.8), E.ACO, rot=(PI / 2, 0, 0), verts=20, bevel=0.01), p)
    tal = empty("esteira_taliscas", (0, 0, 0), root)
    x = -1.35
    while x <= 1.06:
        adopt(box((0.05, 0.58, 0.025), (x, 0, 0.85), E.GRAFITE, bevel=0.008, seg=2), tal)
        x += 0.3
    return root


def bau():
    """Baú de ferramentas vermelho. A tampa abre em bau_tampa (rotação x negativa); as ferramentas sobem em bau_ferramentas."""
    root = empty("bau")
    box((0.8, 0.44, 0.38), (0, 0, 0.19), E.VERMELHO, bevel=0.03, parent=root, name="bau_corpo")
    box((0.82, 0.46, 0.04), (0, 0, 0.06), E.ESCURO, bevel=0.012, parent=root)
    for sx in (-1, 1):
        box((0.06, 0.03, 0.08), (sx * 0.25, -0.225, 0.33), E.ACO, bevel=0.01, parent=root)
    f = empty("bau_ferramentas", (0, 0, 0.2), root)
    adopt(tube([(-0.25, 0, 0.22), (0.15, 0, 0.3)], 0.025, E.ACO), f)
    adopt(torus(0.05, 0.02, (0.18, 0, 0.31), E.ACO, rot=(PI / 2, 0, 0)), f)
    adopt(cyl(0.022, 0.36, (0.12, 0.08, 0.28), E.MADEIRA, rot=(0, PI / 2 - 0.3, 0), verts=12, bevel=0.006), f)
    adopt(box((0.07, 0.07, 0.16), (-0.08, 0.08, 0.32), E.ESCURO, bevel=0.015), f)
    t = pivot("bau_tampa", (0, 0.22, 0.38), root)
    adopt(box((0.82, 0.46, 0.1), (0, 0, 0.43), E.VERMELHO, bevel=0.035), t)
    adopt(tube([(-0.16, 0, 0.48), (-0.16, 0, 0.56), (0.16, 0, 0.56), (0.16, 0, 0.48)], 0.02, E.ESCURO), t)
    return root


def tanque():
    """Tanque de vidro (o medidor do limite), 1,6 m. O líquido sobe e desce com a escala y de tanque_nivel (0 a 1)."""
    root = empty("tanque")
    cyl(0.46, 0.18, (0, 0, 0.09), E.ESCURO, verts=40, bevel=0.03, parent=root)
    n = pivot("tanque_nivel", (0, 0, 0.18), root)
    adopt(cyl(0.36, 1.2, (0, 0, 0.78), E.LIQUIDO, verts=40, bevel=0.0), n)
    cyl(0.4, 1.24, (0, 0, 0.8), E.VIDRO, verts=40, bevel=0.0, parent=root, name="tanque_vidro")
    cyl(0.46, 0.12, (0, 0, 1.48), E.ESCURO, verts=40, bevel=0.03, parent=root)
    screen((0.5, 0.004, 0.1), (0, -0.462, 0.09), E.ESCURO, root, "tanque_face")
    return root


def cracha():
    """Crachá com cordão (para pendurar no peito do Claude). O texto vai em cracha_face. Pivô embaixo do cartão."""
    root = empty("cracha")
    box((0.34, 0.015, 0.24), (0, 0, 0.12), E.BRANCO, bevel=0.012, parent=root, name="cracha_cartao")
    box((0.34, 0.017, 0.06), (0, 0, 0.21), E.AZUL, bevel=0.006, parent=root)
    screen((0.3, 0.002, 0.15), (0, -0.009, 0.095), E.BRANCO, root, "cracha_face")
    box((0.05, 0.02, 0.05), (0, 0, 0.26), E.ACO, bevel=0.008, parent=root)
    tube([(0, 0, 0.27), (-0.18, 0.06, 0.42), (-0.3, 0.2, 0.52)], 0.012, E.AZUL, parent=root)
    tube([(0, 0, 0.27), (0.18, 0.06, 0.42), (0.3, 0.2, 0.52)], 0.012, E.AZUL, parent=root)
    return root


def marcador():
    """Marcador de página (o "salva"), 1 m, em pé. Cor trocável: amarelo."""
    root = empty("marcador")
    xz = [(-0.3, 0.0), (0.0, 0.26), (0.3, 0.0), (0.3, 1.0), (-0.3, 1.0)]
    extrude(xz, -0.05, 0.05, E.AMARELO, bevel=0.03, parent=root, name="marcador_corpo")
    return root


def cone():
    """Cone de trânsito de 0,55 m."""
    root = empty("cone")
    box((0.42, 0.42, 0.05), (0, 0, 0.025), E.LARANJA, bevel=0.02, parent=root)
    cyl(0.17, 0.5, (0, 0, 0.3), E.LARANJA, verts=24, bevel=0.01, r2=0.035, parent=root)
    for z, r in ((0.22, 0.142), (0.36, 0.103)):
        cyl(r, 0.06, (0, 0, z), E.BRANCO, verts=24, bevel=0.0, r2=r - 0.012, parent=root)
    return root


def cavalete():
    """Cavalete de obra listrado, 1,2 m de largura."""
    root = empty("cavalete")
    for sx in (-1, 1):
        for sy in (-1, 1):
            box((0.05, 0.05, 1.0), (sx * 0.5, sy * 0.12, 0.48), E.MADEIRA_ESC, bevel=0.012, rot=(sy * 0.25, 0, 0), parent=root)
    for i in range(6):
        box((0.2, 0.05, 0.22), (-0.5 + i * 0.2 + 0.1, 0.0, 0.85), E.VERMELHO if i % 2 == 0 else E.BRANCO, bevel=0.006, parent=root)
    return root


def tabuas():
    """Pilha de tábuas de 2 m."""
    root = empty("tabuas")
    random.seed(5)
    for i in range(5):
        box((2.0, 0.24, 0.06), (random.uniform(-0.08, 0.08), (i % 3 - 1) * 0.25, 0.03 + (i // 3) * 0.065), E.MADEIRA, bevel=0.01, rot=(0, 0, random.uniform(-0.05, 0.05)), parent=root)
    return root



# ---------------- conversa (2026-11-20, Estilo Conversa) ----------------
def _olho(nome, x, z, root):
    g = pivot(nome, (x, -0.282, z), root)
    adopt(box((0.12, 0.02, 0.1), (x, -0.282, z), E.OLHO_BRANCO, bevel=0.012, seg=2), g)
    p = box((0.052, 0.02, 0.064), (x, -0.294, z), E.OLHO, bevel=0.008, seg=2, name=nome.replace("olho", "pupila"))
    adopt(p, g)
    return g


def _cacho(c, d, r, comp, m, parent, voltas=2.2, fio=0.02):
    """Um cacho: uma mola curta (hélice) que nasce em c e sai na direção d."""
    d = Vector(d).normalized()
    a = d.orthogonal().normalized(); b = d.cross(a)
    n = 18
    pts = []
    for i in range(n + 1):
        t = i / n
        ang = t * voltas * 2 * PI
        rr = r * (1 - 0.35 * t)
        p = Vector(c) + d * (comp * t) + (a * math.cos(ang) + b * math.sin(ang)) * rr
        pts.append(tuple(p))
    return adopt(tube(pts, fio, m), parent)


# as proporções do adulto e da criança (a criança não é o adulto em escala: cabeça maior em relação ao corpo, rosto
# mais redondo, olhos maiores, nariz e boca menores, pernas e braços curtos)
PROP = {
    "adulto": dict(quadril=0.5, perna_h=0.42, perna_w=0.17, perna_d=0.19, perna_x=0.11, tronco_z0=0.49, tronco_h=0.5,
                   tronco_w=0.52, tronco_d=0.32, ombro_z=0.94, braco=0.4, braco_x=0.31, pescoco=0.99, cabeca=1.0,
                   olho=1.0, nariz=1.0, boca=1.0, bisel=0.085),
    "crianca": dict(quadril=0.3, perna_h=0.26, perna_w=0.15, perna_d=0.16, perna_x=0.09, tronco_z0=0.3, tronco_h=0.36,
                    tronco_w=0.42, tronco_d=0.27, ombro_z=0.62, braco=0.28, braco_x=0.255, pescoco=0.67, cabeca=0.86,
                    olho=1.3, nariz=0.65, boca=0.8, bisel=0.15),
}


# o corpo: o magro (tronco estreito, ombros estreitos, braços e pernas finos, rosto fino) e o gordo (barriga redonda
# que avança na frente e dos lados, tronco mais curto e largo, pescoço, braços e pernas grossos, rosto cheio com
# bochecha, queixo redondo e papada leve). A roupa acompanha: a barriga é do tecido de cada peça, e os botões da
# camisa, o zíper da jaqueta e o bolso do moletom seguem a curva dela.
CORPOS = {
    "medio": dict(gross=1.0, cabeca_x=1.0, pescoco_w=0.16),
    "magro": dict(tronco_w=0.42, tronco_d=0.25, perna_w=0.13, perna_d=0.15, perna_x=0.085, braco_x=0.255, gross=0.74, cabeca_x=0.88, pescoco_w=0.12),
    "gordo": dict(tronco_w=0.7, tronco_d=0.44, tronco_h=0.47, perna_w=0.225, perna_d=0.25, perna_x=0.128, braco_x=0.4, gross=1.4, cabeca_x=1.08, pescoco_w=0.27, barriga=True),
}


def _boneco(nome="boneco", idade="adulto", corpo="medio"):
    """A pessoa de blocos com rosto que fala. Tudo o que muda de uma pessoa para outra está aqui e o three.js escolhe
    pela ficha (motor/rosto.ts):
      cabelo: boneco_cabelo_padrao, _curto, _topete, _longo, _coque, _cacheado (ou nenhum); boné, óculos, fone,
              bigode, barba, cílios (boneco_ciliosE/D);
      em cima: boneco_cima_moletom, _camiseta, _camisa, _blazer, _jaqueta, _vestido (dentro de boneco_tronco);
               as mangas boneco_mangaLonga{E,D} e boneco_mangaCurta{E,D} (dentro de cada braço);
      embaixo: boneco_calca{E,D}, boneco_shorts{E,D}, boneco_pernaNua{E,D} (em cada perna) e boneco_saia;
      calçado: boneco_tenis{E,D}, boneco_social{E,D}, boneco_bota{E,D}, boneco_sandalia{E,D}.
    Cores pelos materiais pele, cabelo, roupa, roupa2, calca, sapato, oculos, bone, fone.
    O rosto: olhos com pupila (boneco_olhoE/D, boneco_pupilaE/D), sobrancelhas, boca que abre (boneco_boca, escala z =
    abertura), nariz. Cabeça em boneco_cabeca (o pivô no pescoço). A criança (boneco_crianca) tem as proporções dela."""
    P = {**PROP[idade], **CORPOS[corpo]}
    gr = P["gross"]
    root = empty(nome)
    q, ph, pw, pd, px = P["quadril"], P["perna_h"], P["perna_w"], P["perna_d"], P["perna_x"]
    # ---- as pernas: calça, shorts, perna nua e os quatro calçados
    for sx, nm in ((-1, "E"), (1, "D")):
        x = sx * px
        p = pivot(f"boneco_perna{nm}", (x, 0, q), root)
        zc = 0.11 + ph / 2  # o centro da perna (o calçado ocupa os 11 cm de baixo)
        g = pivot(f"boneco_calca{nm}", (x, 0, q), root)
        adopt(box((pw, pd, ph + 0.02), (x, 0, zc), E.CALCA, bevel=0.06 * pw / 0.17, seg=6), g)
        adopt(g, p)
        g = pivot(f"boneco_pernaNua{nm}", (x, 0, q), root)
        adopt(box((pw * 0.78, pd * 0.78, ph + 0.02), (x, 0, zc), E.PELE, bevel=0.045 * pw / 0.17, seg=6), g)
        adopt(g, p)
        g = pivot(f"boneco_shorts{nm}", (x, 0, q), root)
        adopt(box((pw * 1.04, pd * 1.04, ph * 0.42), (x, 0, q - ph * 0.19), E.CALCA, bevel=0.05 * pw / 0.17, seg=6), g)
        adopt(box((pw * 1.06, pd * 1.06, 0.03), (x, 0, q - ph * 0.39), E.ROUPA2, bevel=0.012, seg=3), g)  # a barra
        adopt(g, p)
        k = pw / 0.17
        # tênis: sola clara, cabedal, biqueira e o cadarço
        g = pivot(f"boneco_tenis{nm}", (x, 0, 0.1), root)
        adopt(box((0.2 * k, 0.3 * k, 0.045), (x, -0.04 * k, 0.0225), E.SOLA, bevel=0.018, seg=4), g)
        adopt(box((0.18 * k, 0.27 * k, 0.085), (x, -0.035 * k, 0.085), E.SAPATO, bevel=0.035, seg=5), g)
        adopt(box((0.17 * k, 0.08 * k, 0.06), (x, -0.16 * k, 0.07), E.SOLA, bevel=0.025, seg=4), g)
        for j in range(3):
            adopt(box((0.09 * k, 0.012, 0.012), (x, (-0.13 + j * 0.045) * k, 0.13), E.CADARCO, bevel=0.004, seg=1, rot=(0.5, 0, 0)), g)
        adopt(g, p)
        # sapato social: baixo, bico arredondado, sola fina escura e o salto
        g = pivot(f"boneco_social{nm}", (x, 0, 0.1), root)
        adopt(box((0.17 * k, 0.29 * k, 0.025), (x, -0.045 * k, 0.0125), E.ESCURO, bevel=0.01, seg=3), g)
        adopt(box((0.16 * k, 0.27 * k, 0.075), (x, -0.04 * k, 0.06), E.SAPATO, bevel=0.035, seg=6), g)
        adopt(box((0.15 * k, 0.07 * k, 0.04), (x, 0.06 * k, 0.012), E.ESCURO, bevel=0.008, seg=2), g)    # salto
        adopt(box((0.1 * k, 0.012, 0.03), (x, -0.06 * k, 0.1), E.ESCURO, bevel=0.006, seg=2), g)          # a fivela
        adopt(g, p)
        # bota: o cano até a canela, sola grossa e a costura
        g = pivot(f"boneco_bota{nm}", (x, 0, 0.1), root)
        adopt(box((0.2 * k, 0.31 * k, 0.05), (x, -0.045 * k, 0.025), E.ESCURO, bevel=0.015, seg=3), g)
        adopt(box((0.185 * k, 0.28 * k, 0.1), (x, -0.04 * k, 0.095), E.SAPATO, bevel=0.04, seg=5), g)
        adopt(box(((pw + 0.02), (pd + 0.02), 0.2), (x, 0, 0.2), E.SAPATO, bevel=0.05, seg=5), g)            # o cano
        adopt(box(((pw + 0.03), (pd + 0.03), 0.025), (x, 0, 0.29), E.ESCURO, bevel=0.01, seg=3), g)        # a borda
        adopt(g, p)
        # sandália: a sola, as tiras e o pé à mostra
        g = pivot(f"boneco_sandalia{nm}", (x, 0, 0.1), root)
        adopt(box((0.17 * k, 0.29 * k, 0.03), (x, -0.045 * k, 0.015), E.SOLA, bevel=0.012, seg=3), g)
        adopt(box((0.14 * k, 0.25 * k, 0.07), (x, -0.04 * k, 0.065), E.PELE, bevel=0.03, seg=5), g)       # o pé
        for yy in (-0.12, -0.02):
            adopt(box((0.16 * k, 0.03, 0.03), (x, yy * k, 0.085), E.SAPATO, bevel=0.01, seg=2), g)
        adopt(g, p)
    # a saia (fica no quadril, em volta das duas pernas)
    sa = pivot("boneco_saia", (0, 0, q), root)
    adopt(cyl(P["tronco_w"] * 0.5, ph * 0.55, (0, 0, q - ph * 0.22), E.CALCA, verts=40, bevel=0.02, r2=P["tronco_w"] * 0.47), sa)
    adopt(torus(P["tronco_w"] * 0.47, 0.012, (0, 0, q + ph * 0.05), E.ROUPA2), sa)
    sa.scale = (1, P["tronco_d"] / P["tronco_w"] * 1.15, 1)

    # ---- o tronco: cada modelo de cima num grupo dentro de boneco_tronco (o pivô respira)
    tz0, th, tw, td = P["tronco_z0"], P["tronco_h"], P["tronco_w"], P["tronco_d"]
    zc = tz0 + th / 2
    tr = pivot("boneco_tronco", (0, 0, tz0), root)
    def grupo(n):
        g = pivot(f"boneco_cima_{n}", (0, 0, tz0), root); adopt(g, tr); return g
    pesc = P["pescoco"]
    BR = (tw * 0.5, 0.88, 0.8)              # o raio da barriga e a escala em y (para a frente) e em z
    BC = (td * 0.15, tz0 + th * 0.44)       # o centro: um pouco à frente do meio, abaixo do peito
    def barriga(g, m):
        if P.get("barriga"):
            adopt(sphere(BR[0], (0, -BC[0], BC[1]), m, scale=(1.0, BR[1], BR[2]), sub=4), g)
    def tronco_roupa(g, size, m, bevel):
        """O corpo da roupa. No gordo, a caixa e a barriga viram uma peça só (fundidas e refeitas por voxel, com a
        curva suave entre o peito e a barriga, sem a emenda de uma bola encostada), e o tecido é mapeado de novo."""
        o = box(size, (0, 0, zc), m, bevel=bevel, seg=6)
        if P.get("barriga"):
            b = sphere(BR[0], (0, -BC[0], BC[1]), m, scale=(1.06, BR[1], BR[2]), sub=4)
            active(o); b.select_set(True); bpy.ops.object.join()
            md = o.modifiers.new("rm", 'REMESH'); md.mode = 'VOXEL'; md.voxel_size = 0.011; md.use_smooth_shade = True
            bpy.ops.object.modifier_apply(modifier=md.name)
            md = o.modifiers.new("sm", 'SMOOTH'); md.factor = 0.5; md.iterations = 3
            bpy.ops.object.modifier_apply(modifier=md.name)
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
            try:
                bpy.ops.uv.cube_project(cube_size=0.5)
            except RuntimeError:
                bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.01)
            bpy.ops.object.mode_set(mode='OBJECT')
            bpy.ops.object.shade_smooth()
        adopt(o, g)
        return o
    def frente(z, extra=0.0):
        """o y da frente do tronco na altura z (negativo = para a frente), seguindo a barriga do gordo"""
        y = -td / 2
        if P.get("barriga"):
            u = (z - BC[1]) / (BR[0] * BR[2])
            if abs(u) < 1:
                y = min(y, -BC[0] - BR[0] * BR[1] * math.sqrt(1 - u * u))
        return y - extra
    # moletom: barra e punhos de ribana, bolso canguru com costura, gola e o cordão do capuz
    g = grupo("moletom")
    tronco_roupa(g, (tw, td, th), E.ROUPA, 0.1 * tw / 0.52)
    adopt(box((tw + 0.015, td + 0.015, 0.07), (0, 0, tz0 + 0.03), E.ROUPA2, bevel=0.025, seg=4), g)
    zb = tz0 + th * (0.26 if not P.get("barriga") else 0.2)
    adopt(box((tw * 0.62, 0.02, th * 0.26), (0, frente(zb, 0.002), zb), E.ROUPA, bevel=0.02, seg=3, rot=(0.25 if P.get("barriga") else 0, 0, 0)), g)
    adopt(box((tw * 0.58, 0.008, 0.008), (0, frente(zb + th * 0.12, 0.013), zb + th * 0.12), E.COSTURA, bevel=0.0), g)
    adopt(torus(0.115 * tw / 0.52, 0.034, (0, 0, pesc + 0.005), E.ROUPA2), g)
    for sx in (-1, 1):
        adopt(tube([(sx * 0.05, -0.12 * td / 0.32, pesc), (sx * 0.055, -td / 2 - 0.008, pesc - 0.04), (sx * 0.06, -td / 2 - 0.012, pesc - 0.13)], 0.008, E.CADARCO), g)
        adopt(cyl(0.012, 0.035, (sx * 0.06, -td / 2 - 0.012, pesc - 0.15), E.ACO, verts=10, bevel=0.003), g)
    # camiseta: corpo liso, gola redonda fina e a barra com costura
    g = grupo("camiseta")
    tronco_roupa(g, (tw * 0.97, td * 0.95, th), E.ROUPA, 0.09 * tw / 0.52)
    adopt(torus(0.1 * tw / 0.52, 0.018, (0, 0, pesc - 0.005), E.ROUPA2), g)
    adopt(box((tw * 0.97 + 0.004, td * 0.95 + 0.004, 0.008), (0, 0, tz0 + 0.04), E.COSTURA, bevel=0.0), g)
    # camisa social: corpo, colarinho em pé, a carcela com os botões e o cinto
    g = grupo("camisa")
    tronco_roupa(g, (tw * 0.97, td * 0.95, th), E.ROUPA, 0.09 * tw / 0.52)
    for sx in (-1, 1):
        adopt(box((0.12 * tw / 0.52, 0.03, 0.07), (sx * 0.055, -0.1 * td / 0.32, pesc - 0.02), E.ROUPA, bevel=0.012, seg=2, rot=(0.35, 0, sx * -0.55)), g)
    # a carcela e os botões seguem a curva da frente (no gordo, a barriga)
    adopt(tube([(0, frente(tz0 + th * k / 10, 0.004), tz0 + th * k / 10) for k in range(1, 10)], 0.016, E.ROUPA), g)
    for j in range(4):
        z = tz0 + th * (0.25 + j * 0.2)
        adopt(cyl(0.011, 0.008, (0, frente(z, 0.019), z), E.ROUPA2, rot=(PI / 2, 0, 0), verts=12, bevel=0.002), g)
    adopt(box((tw * 0.98 + 0.01, td * 0.96 + 0.01, 0.04), (0, 0, tz0 + 0.02), E.ESCURO, bevel=0.012, seg=3), g)
    adopt(box((0.06, 0.012, 0.035), (0, -td * 0.49 - 0.008, tz0 + 0.02), E.ACO, bevel=0.006, seg=2), g)
    # blazer (terno): a camisa por baixo no V, as duas frentes com lapela, os botões e o bolso
    g = grupo("blazer")
    tronco_roupa(g, (tw * 0.98, td * 0.96, th), E.ROUPA2, 0.09 * tw / 0.52)   # a camisa (com a barriga, entre as frentes abertas)
    for sx in (-1, 1):
        adopt(box((tw * 0.52, td + 0.03, th + 0.06), (sx * tw * 0.255, 0.008, zc - 0.02), E.ROUPA, bevel=0.06 * tw / 0.52, seg=6), g)
        adopt(box((0.07 * tw / 0.52, 0.025, th * 0.5), (sx * 0.07 * tw / 0.52, -td / 2 - 0.02, tz0 + th * 0.72), E.ROUPA, bevel=0.012, seg=2, rot=(0, sx * 0.35, 0)), g)  # lapela
        adopt(box((0.1 * tw / 0.52, 0.01, 0.012), (sx * tw * 0.3, -td / 2 - 0.02, tz0 + th * 0.5), E.COSTURA, bevel=0.0), g)  # bolso
    adopt(box((0.05, 0.03, th * 0.34), (0, -td / 2 - 0.006, tz0 + th * 0.78), E.ROUPA2, bevel=0.01, seg=2), g)  # a camisa no V
    for j in range(2):
        adopt(cyl(0.013, 0.01, (0.018, -td / 2 - 0.03, tz0 + th * (0.22 + j * 0.18)), E.ESCURO, rot=(PI / 2, 0, 0), verts=12, bevel=0.002), g)
    # jaqueta: mais larga, gola em pé, o zíper, os bolsos e a barra e os punhos de ribana
    g = grupo("jaqueta")
    tronco_roupa(g, (tw + 0.03, td + 0.03, th + 0.02), E.ROUPA, 0.09 * tw / 0.52)
    adopt(torus(0.13 * tw / 0.52, 0.03, (0, 0, pesc - 0.01), E.ROUPA2), g)
    adopt(tube([(0, frente(tz0 + th * k / 10, 0.02 if not P.get("barriga") else 0.006), tz0 + th * k / 10) for k in range(1, 10)], 0.008, E.ACO), g)  # o zíper segue a curva
    adopt(box((tw + 0.04, td + 0.04, 0.06), (0, 0, tz0 + 0.03), E.ROUPA2, bevel=0.022, seg=4), g)
    for sx in (-1, 1):
        adopt(box((0.12 * tw / 0.52, 0.01, 0.012), (sx * tw * 0.27, -td / 2 - 0.018, tz0 + th * 0.36), E.COSTURA, bevel=0.0, rot=(0, sx * 0.9, 0)), g)
    # vestido: o corpo e a saia rodada numa peça só, com a faixa na cintura
    g = grupo("vestido")
    tronco_roupa(g, (tw * 0.95, td * 0.93, th), E.ROUPA, 0.09 * tw / 0.52)
    adopt(cyl(tw * 0.47, ph * 0.72, (0, 0, tz0 - ph * 0.3), E.ROUPA, verts=40, bevel=0.02, r2=tw * 0.44), g)
    adopt(torus(tw * 0.45, 0.016, (0, 0, tz0 + 0.03), E.ROUPA2), g)
    adopt(torus(0.1 * tw / 0.52, 0.016, (0, 0, pesc - 0.008), E.ROUPA2), g)
    for o in g.children:
        if o.type == 'MESH' and o.data.materials and o.data.materials[0] == E.ROUPA and o.location.z < tz0:
            o.scale = (1, td / tw * 1.2, 1)
    screen((0.3 * tw / 0.52, 0.004, 0.16 * th / 0.5), (0, frente(tz0 + th * 0.58, 0.002), tz0 + th * 0.58), E.ROUPA, tr, "boneco_peito_face")

    # ---- o fone no pescoço
    fone = pivot("boneco_fone", (0, 0, pesc + 0.01), root)
    kz = pesc - 0.99
    pts = [(-0.22, 0.0, 1.1 + kz), (-0.21, 0.1, 1.13 + kz), (-0.13, 0.19, 1.15 + kz), (0.0, 0.22, 1.16 + kz), (0.13, 0.19, 1.15 + kz), (0.21, 0.1, 1.13 + kz), (0.22, 0.0, 1.1 + kz)]
    adopt(tube(pts, 0.032, E.FONE), fone)
    adopt(tube([(x * 0.85, y * 0.85 + 0.005, z - 0.01) for (x, y, z) in pts[1:-1]], 0.022, E.ESCURO), fone)
    for sx in (-1, 1):
        adopt(box((0.025, 0.03, 0.11), (sx * 0.22, -0.03, 1.06 + kz), E.ACO, bevel=0.008, seg=2), fone)
        adopt(cyl(0.115, 0.075, (sx * 0.2, -0.12, 1.0 + kz), E.FONE, rot=(PI / 2 - 0.35, 0, sx * 0.5), verts=36, bevel=0.03, seg=4), fone)
        adopt(torus(0.085, 0.03, (sx * 0.175, -0.085, 1.025 + kz), E.ESCURO, rot=(PI / 2 - 0.35, 0, sx * 0.5)), fone)
        adopt(cyl(0.06, 0.02, (sx * 0.225, -0.155, 0.975 + kz), E.ESCURO, rot=(PI / 2 - 0.35, 0, sx * 0.5), verts=28, bevel=0.006), fone)
    if idade == "crianca":
        fone.scale = (0.8, 0.8, 0.8)

    # ---- os braços: a manga longa (com punho) e a curta (com o antebraço), e a mão
    oz, bl, bx = P["ombro_z"], P["braco"], P["braco_x"]
    kb = bl / 0.4
    for sx, nm in ((-1, "E"), (1, "D")):
        p = pivot(f"boneco_braco{nm}", (sx * bx, 0, oz), root)
        x = sx * (bx + 0.02 * kb)
        lg = pivot(f"boneco_mangaLonga{nm}", (sx * bx, 0, oz), root)
        adopt(box((0.13 * kb ** 0.5 * gr, 0.15 * kb ** 0.5 * gr, bl), (x, 0, oz - bl / 2 + 0.02), E.ROUPA, bevel=0.055 * kb * min(gr, 1), seg=6), lg)
        adopt(box((0.14 * kb ** 0.5 * gr, 0.16 * kb ** 0.5 * gr, 0.06), (x, 0, oz - bl + 0.025), E.ROUPA2, bevel=0.022, seg=4), lg)
        adopt(lg, p)
        ct = pivot(f"boneco_mangaCurta{nm}", (sx * bx, 0, oz), root)
        adopt(box((0.14 * kb ** 0.5 * gr, 0.16 * kb ** 0.5 * gr, bl * 0.38), (x, 0, oz - bl * 0.17), E.ROUPA, bevel=0.05 * kb * min(gr, 1), seg=6), ct)
        adopt(box((0.105 * kb ** 0.5 * gr, 0.12 * kb ** 0.5 * gr, bl * 0.7), (x, 0, oz - bl * 0.6), E.PELE, bevel=0.045 * kb * min(gr, 1), seg=6), ct)
        adopt(ct, p)
        adopt(box((0.12 * kb ** 0.5 * min(gr, 1.15), 0.13 * kb ** 0.5 * min(gr, 1.15), 0.11 * kb), (x, 0, oz - bl - 0.04 * kb), E.PELE, bevel=0.045 * kb, seg=5), p)
        if nm == "D":  # o dedo que aponta (o three.js mostra só no `aponta`)
            d = pivot("boneco_dedoD", (x, 0, oz - bl - 0.09 * kb), root)
            adopt(box((0.035 * kb ** 0.5, 0.04 * kb ** 0.5, 0.11 * kb), (x, -0.01, oz - bl - 0.13 * kb), E.PELE, bevel=0.016 * kb, seg=4), d)
            adopt(d, p)

    # ---- a cabeça (modelada no tamanho do adulto; a da criança é a mesma cabeça mais redonda, depois escalada)
    cab = pivot("boneco_cabeca", (0, 0, 0.99), root)
    adopt(box((P["pescoco_w"], P["pescoco_w"], 0.1), (0, 0, 1.01), E.PELE, bevel=0.03), cab)
    if P.get("barriga"):  # o rosto cheio: bochechas, o queixo redondo e a papada leve
        for sx in (-1, 1):
            adopt(sphere(0.1, (sx * 0.22, -0.2, 1.16), E.PELE, scale=(0.9, 0.75, 0.85), sub=3), cab)
        adopt(sphere(0.2, (0, -0.13, 1.06), E.PELE, scale=(1.05, 0.75, 0.42), sub=4), cab)   # a papada
    adopt(box((0.6, 0.54, 0.58), (0, 0, 1.33), E.PELE, bevel=P["bisel"], seg=8, name="boneco_rosto"), cab)
    for sx in (-1, 1):
        adopt(box((0.04, 0.1, 0.12), (sx * 0.31, 0.0, 1.3), E.PELE, bevel=0.015), cab)  # orelhas
    ko = P["olho"]
    for nm, sx in (("E", -1), ("D", 1)):
        gz = 1.36 if idade == "adulto" else 1.345
        o = pivot(f"boneco_olho{nm}", (sx * 0.13, -0.282, gz), root)
        adopt(box((0.12 * ko, 0.02, 0.1 * ko), (sx * 0.13, -0.282, gz), E.OLHO_BRANCO, bevel=0.012 * ko, seg=2), o)
        adopt(box((0.052 * ko, 0.02, 0.064 * ko), (sx * 0.13, -0.294, gz), E.OLHO, bevel=0.008 * ko, seg=2, name=f"boneco_pupila{nm}"), o)
        if idade == "crianca":
            adopt(sphere(0.012, (sx * 0.13 + 0.012, -0.306, gz + 0.018), E.OLHO_BRANCO, sub=2), o)  # o brilho no olho
        adopt(o, cab)
        ci = pivot(f"boneco_cilios{nm}", (sx * 0.13, -0.292, gz + 0.05 * ko), root)
        for k in (-1, 0, 1):
            adopt(box((0.022, 0.012, 0.04), (sx * 0.13 + k * 0.035 + sx * 0.02, -0.294, gz + 0.065 * ko + abs(k) * -0.006), E.OLHO, bevel=0.005, seg=1, rot=(0, -sx * (0.35 + k * 0.25), 0)), ci)
        adopt(ci, cab)
    for sx, nm in ((-1, "E"), (1, "D")):
        zb = 1.46 if idade == "adulto" else 1.47
        s = pivot(f"boneco_sobrancelha{nm}", (sx * 0.13, -0.285, zb), root)
        adopt(box((0.15, 0.03, 0.036), (sx * 0.13, -0.285, zb), E.CABELO, bevel=0.01, seg=2), s)
        adopt(s, cab)
    kn = P["nariz"]
    adopt(box((0.085 * kn, 0.09 * kn, 0.11 * kn), (0, -0.27 - 0.03 * kn, 1.27 if idade == "adulto" else 1.25), E.PELE, bevel=0.025 * kn, name="boneco_nariz"), cab)
    kbo = P["boca"]; zb = 1.15 if idade == "adulto" else 1.16
    boca = pivot("boneco_boca", (0, -0.28, zb), root)
    adopt(box((0.17 * kbo, 0.02, 0.08 * kbo), (0, -0.28, zb), E.BOCA, bevel=0.008, seg=2), boca)
    adopt(box((0.11 * kbo, 0.021, 0.025 * kbo), (0, -0.285, zb - 0.025 * kbo), E.LINGUA, bevel=0.006, seg=1), boca)
    adopt(box((0.15 * kbo, 0.022, 0.018 * kbo), (0, -0.287, zb + 0.03 * kbo), E.OLHO_BRANCO, bevel=0.004, seg=1), boca)
    adopt(boca, cab)
    if idade == "crianca":
        for sx in (-1, 1):
            adopt(sphere(0.045, (sx * 0.2, -0.27, 1.22), E.BOCHECHA, scale=(1, 0.3, 0.7), sub=2), cab)  # bochechas
    big = pivot("boneco_bigode", (0, -0.29, 1.2), root)
    adopt(box((0.2, 0.03, 0.04), (0, -0.29, 1.2), E.CABELO, bevel=0.012, seg=2), big)
    adopt(big, cab)
    bar = pivot("boneco_barba", (0, -0.27, 1.07), root)
    adopt(box((0.14, 0.04, 0.07), (0, -0.282, 1.075), E.CABELO, bevel=0.012), bar)
    for sx in (-1, 1):
        adopt(box((0.05, 0.3, 0.2), (sx * 0.29, -0.1, 1.17), E.CABELO, bevel=0.012), bar)
    adopt(bar, cab)
    oc = pivot("boneco_oculos", (0, -0.3, 1.36), root)
    for sx in (-1, 1):
        x = sx * 0.13
        for (w, h, dx, dz) in ((0.21, 0.034, 0, 0.08), (0.21, 0.034, 0, -0.08), (0.034, 0.19, -0.088, 0), (0.034, 0.19, 0.088, 0)):
            adopt(box((w, 0.03, h), (x + dx, -0.306, 1.36 + dz), E.OCULOS, bevel=0.01, seg=2), oc)
        adopt(box((0.024, 0.3, 0.024), (sx * 0.305, -0.15, 1.4), E.OCULOS, bevel=0.008, seg=2), oc)
    adopt(box((0.06, 0.024, 0.024), (0, -0.305, 1.39), E.OCULOS, bevel=0.008, seg=2), oc)
    adopt(oc, cab)
    curto = pivot("boneco_cabelo_curto", (0, 0, 1.62), root)
    adopt(box((0.63, 0.57, 0.09), (0, 0.0, 1.63), E.CABELO, bevel=0.035), curto)
    adopt(box((0.63, 0.12, 0.34), (0, 0.24, 1.5), E.CABELO, bevel=0.04), curto)
    for sx in (-1, 1):
        adopt(box((0.04, 0.42, 0.22), (sx * 0.305, 0.05, 1.53), E.CABELO, bevel=0.012), curto)
    adopt(box((0.6, 0.06, 0.07), (0, -0.27, 1.6), E.CABELO, bevel=0.02), curto)
    adopt(curto, cab)
    pad = pivot("boneco_cabelo_padrao", (0, 0, 1.62), root)
    adopt(box((0.64, 0.58, 0.17), (0, 0.01, 1.66), E.CABELO, bevel=0.075, seg=7), pad)
    adopt(box((0.64, 0.17, 0.4), (0, 0.22, 1.5), E.CABELO, bevel=0.07, seg=6), pad)
    for sx in (-1, 1):
        adopt(box((0.05, 0.4, 0.24), (sx * 0.305, 0.06, 1.53), E.CABELO, bevel=0.02, seg=4), pad)
    for x, w, h, y, z, inc, gira in ((-0.18, 0.2, 0.14, -0.262, 1.635, -0.12, 0.1), (0.0, 0.3, 0.19, -0.272, 1.61, -0.2, 0.24),
                                     (0.2, 0.22, 0.16, -0.282, 1.585, -0.26, 0.38), (0.08, 0.16, 0.1, -0.29, 1.66, -0.3, 0.18)):
        adopt(box((w, 0.09, h), (x, y, z), E.CABELO, bevel=0.042, seg=6, rot=(inc, gira, 0)), pad)
    adopt(box((0.012, 0.3, 0.02), (-0.13, -0.02, 1.748), E.COSTURA, bevel=0.004, seg=1), pad)
    adopt(pad, cab)
    top = pivot("boneco_cabelo_topete", (0, 0, 1.7), root)
    adopt(box((0.4, 0.18, 0.08), (0.04, -0.19, 1.7), E.CABELO, bevel=0.035, rot=(0.35, 0, 0.08)), top)
    adopt(top, cab)
    longo = pivot("boneco_cabelo_longo", (0, 0.0, 1.62), root)
    adopt(box((0.66, 0.6, 0.17), (0, 0.01, 1.665), E.CABELO, bevel=0.075, seg=7), longo)
    adopt(box((0.68, 0.17, 0.72), (0, 0.235, 1.3), E.CABELO, bevel=0.075, seg=6), longo)
    for sx in (-1, 1):
        adopt(box((0.085, 0.44, 0.62), (sx * 0.318, 0.03, 1.3), E.CABELO, bevel=0.04, seg=5), longo)
        adopt(box((0.11, 0.3, 0.16), (sx * 0.325, 0.07, 0.99), E.CABELO, bevel=0.05, seg=5, rot=(0, sx * 0.18, 0)), longo)
        adopt(box((0.3, 0.09, 0.15), (sx * 0.155, -0.272, 1.6), E.CABELO, bevel=0.042, seg=6, rot=(-0.15, sx * 0.2, 0)), longo)
    adopt(box((0.012, 0.32, 0.02), (0, -0.02, 1.752), E.COSTURA, bevel=0.004, seg=1), longo)
    adopt(longo, cab)
    coque = pivot("boneco_cabelo_coque", (0, 0, 1.62), root)
    adopt(box((0.645, 0.585, 0.16), (0, 0.01, 1.66), E.CABELO, bevel=0.075, seg=7), coque)
    adopt(box((0.645, 0.16, 0.36), (0, 0.225, 1.51), E.CABELO, bevel=0.07, seg=6), coque)
    for sx in (-1, 1):
        adopt(box((0.05, 0.4, 0.22), (sx * 0.305, 0.06, 1.55), E.CABELO, bevel=0.02, seg=4), coque)
    adopt(box((0.6, 0.07, 0.06), (0, -0.268, 1.63), E.CABELO, bevel=0.028, seg=4), coque)
    adopt(sphere(0.135, (0, 0.13, 1.83), E.CABELO, scale=(1, 1, 0.85), sub=3), coque)
    adopt(cyl(0.1, 0.035, (0, 0.11, 1.75), E.FONE, verts=24, bevel=0.01), coque)
    adopt(coque, cab)
    # o cacheado de verdade: a massa com volume (mais larga que a cabeça, bem redonda, que emoldura o rosto sem
    # tapar), e por cima dela os cachos definidos: molas curtas saindo da superfície em todas as direções
    cach = pivot("boneco_cabelo_cacheado", (0, 0, 1.6), root)
    adopt(box((0.66, 0.6, 0.2), (0, 0.01, 1.66), E.CABELO, bevel=0.09, seg=7), cach)            # a calota (cobre as quinas)
    adopt(sphere(0.42, (0, 0.1, 1.62), E.CABELO, scale=(1.0, 0.9, 0.7), sub=4), cach)
    adopt(box((0.7, 0.26, 0.5), (0, 0.2, 1.38), E.CABELO, bevel=0.12, seg=6), cach)             # a nuca
    for sx in (-1, 1):
        adopt(sphere(0.17, (sx * 0.31, 0.06, 1.42), E.CABELO, scale=(0.75, 1.1, 1.15), sub=3), cach)  # as laterais
    random.seed(52)
    feitos = 0
    for i in range(400):
        if feitos >= 70:
            break
        u = random.uniform(0, 2 * PI); v = random.uniform(-0.35, 1.0)
        nx, ny, nz = math.cos(u) * math.cos(v * PI / 2), math.sin(u) * math.cos(v * PI / 2), math.sin(v * PI / 2)
        cx, cy, cz = nx * 0.42, ny * 0.42 * 0.9 + 0.1, nz * 0.42 * 0.7 + 1.62
        if cy < -0.15 and cz < 1.62:
            continue  # o rosto fica livre
        if cz < 1.3:
            continue
        _cacho((cx, cy, cz), (nx, ny, nz * 0.8 + 0.2), random.uniform(0.022, 0.03), random.uniform(0.06, 0.09), E.CABELO, cach, voltas=random.uniform(1.6, 2.4), fio=random.uniform(0.016, 0.02))
        feitos += 1
    for sx in (-1, 1):  # os cachinhos da franja, na linha da testa
        for k in range(3):
            _cacho((sx * (0.08 + k * 0.08), -0.27, 1.64 - k * 0.02), (sx * 0.2, -1, -0.3), 0.024, 0.06, E.CABELO, cach, voltas=1.8, fio=0.017)
    adopt(cach, cab)
    bone = pivot("boneco_bone", (0, 0, 1.62), root)
    adopt(dome(0.33, (0, 0.02, 1.6), E.BONE, scale=(1.0, 0.95, 0.62)), bone)
    adopt(box((0.5, 0.3, 0.035), (0, -0.36, 1.6), E.BONE, bevel=0.012), bone)
    adopt(bone, cab)
    if idade == "crianca":
        # a cabeça da criança: a mesma, escalada a partir do pescoço, que sobe para o pescoço dela
        bpy.context.view_layer.update()
        cab.location = (0, 0, P["pescoco"]); cab.scale = (P["cabeca"],) * 3
    elif P["cabeca_x"] != 1:
        cab.scale = (P["cabeca_x"], 1, 1)  # o rosto fino do magro e o largo do gordo
    return root


def boneco():
    return _boneco("boneco", "adulto")


def boneco_magro():
    """O boneco magro: os mesmos nós e opções do boneco (a ficha escolhe com corpo: "magro")."""
    return _boneco("boneco_magro", "adulto", "magro")


def boneco_gordo():
    """O boneco gordo: os mesmos nós e opções do boneco (a ficha escolhe com corpo: "gordo")."""
    return _boneco("boneco_gordo", "adulto", "gordo")


def boneco_crianca():
    """A criança: proporção de criança (cabeça grande, rosto redondo, olhos grandes com brilho, nariz e boca pequenos,
    bochecha, pernas e braços curtos). Os mesmos nós e as mesmas opções do boneco."""
    return _boneco("boneco_crianca", "crianca")


def gato():
    """O gato que conversa (sentado, 1,3 m até a ponta da orelha): cara de brinquedo, olhos grandes de íris verde
    com a pupila em fenda, focinho claro, nariz rosa, bigodes, orelhas com o lado de dentro rosa, listras de gato
    malhado, rabo enrolado do lado. CONTRATO DO ROSTO: gato_cabeca, gato_olhoE/D, gato_pupilaE/D,
    gato_sobrancelhaE/D (as listras escuras em cima dos olhos), gato_boca e gato_bracoE/D (as patas da frente, que
    gesticulam). Olhos a 1,06 m, boca a 0,86 m, a cara 0,26 m à frente do centro. Cores trocáveis pelos materiais
    pelo, pelo_claro, pelo_escuro e olho_gato."""
    root = empty("gato")
    sphere(0.34, (0, 0.04, 0.4), E.PELO, scale=(1.0, 0.92, 1.12), sub=4, parent=root, name="gato_corpo")
    sphere(0.22, (0, -0.2, 0.44), E.PELO2, scale=(0.9, 0.5, 1.15), sub=4, parent=root)            # o peito claro
    for sx in (-1, 1):
        sphere(0.17, (sx * 0.22, 0.08, 0.17), E.PELO, scale=(0.75, 1.25, 0.95), sub=3, parent=root)   # as coxas
        sphere(0.07, (sx * 0.2, -0.16, 0.04), E.PELO2, scale=(1.1, 1.5, 0.65), sub=3, parent=root)   # as patas de trás
    for k in range(3):  # as listras nas costas
        box((0.34 - k * 0.04, 0.05, 0.05), (0, 0.32 - k * 0.005, 0.62 - k * 0.12), E.PELO3, bevel=0.024, seg=4, parent=root, rot=(0.35, 0, 0))
    # o rabo: sai de trás, contorna o lado e sobe com a ponta escura
    pts = [(0.08, 0.34, 0.12), (0.3, 0.3, 0.07), (0.44, 0.08, 0.08), (0.46, -0.12, 0.16), (0.42, -0.24, 0.3), (0.38, -0.27, 0.42)]
    tube(pts, 0.055, E.PELO, parent=root)
    sphere(0.058, (0.38, -0.27, 0.44), E.PELO3, scale=(1, 1, 1.3), sub=3, parent=root)
    # as patas da frente (os "braços", que apontam e gesticulam)
    for sx, nm in ((-1, "E"), (1, "D")):
        p = pivot(f"gato_braco{nm}", (sx * 0.15, -0.14, 0.62), root)
        adopt(cyl(0.065, 0.5, (sx * 0.15, -0.17, 0.37), E.PELO, verts=24, bevel=0.03, r2=0.07), p)
        adopt(sphere(0.08, (sx * 0.15, -0.2, 0.08), E.PELO2, scale=(1, 1.25, 0.7), sub=3), p)
        for k in (-1, 0, 1):
            adopt(box((0.012, 0.02, 0.03), (sx * 0.15 + k * 0.03, -0.29, 0.075), E.PELO3, bevel=0.005, seg=1), p)  # os dedos
        if nm == "D":  # o dedinho que aponta: um dedo da pata, comprido, com a almofada rosa
            d = pivot("gato_dedoD", (sx * 0.15, -0.2, 0.04), root)
            adopt(cyl(0.028, 0.075, (sx * 0.15, -0.23, 0.065), E.PELO2, verts=16, bevel=0.012, r2=0.02), d)
            adopt(sphere(0.018, (sx * 0.15, -0.235, 0.035), E.NARIZ, sub=2), d)
            adopt(d, p)
    # a cabeça
    cab = pivot("gato_cabeca", (0, -0.02, 0.76), root)
    adopt(box((0.6, 0.48, 0.46), (0, -0.02, 1.02), E.PELO, bevel=0.17, seg=8, name="gato_rosto"), cab)
    for sx in (-1, 1):
        adopt(sphere(0.12, (sx * 0.2, -0.17, 0.9), E.PELO, scale=(1.1, 0.8, 0.8), sub=3), cab)       # as bochechas
        # as orelhas: pirâmides de bico arredondado, com o lado de dentro rosa
        adopt(cyl(0.13, 0.22, (sx * 0.18, 0.0, 1.29), E.PELO, verts=4, bevel=0.03, r2=0.02, rot=(0, sx * -0.25, PI / 4)), cab)
        adopt(cyl(0.075, 0.15, (sx * 0.175, -0.065, 1.27), E.NARIZ, verts=4, bevel=0.02, r2=0.012, rot=(0, sx * -0.25, PI / 4)), cab)
    for k in (-1, 0, 1):  # as listras da testa
        adopt(box((0.035, 0.03, 0.1 - abs(k) * 0.03), (k * 0.07, -0.26, 1.2 - abs(k) * 0.01), E.PELO3, bevel=0.013, seg=3), cab)
    adopt(sphere(0.15, (0, -0.24, 0.9), E.PELO2, scale=(1.25, 0.6, 0.7), sub=4), cab)               # o focinho
    adopt(box((0.075, 0.04, 0.05), (0, -0.335, 0.95), E.NARIZ, bevel=0.02, seg=4), cab)               # o nariz
    adopt(box((0.012, 0.02, 0.05), (0, -0.34, 0.905), E.PELO3, bevel=0.005, seg=1), cab)             # o risco do nariz à boca
    for sx in (-1, 1):  # os bigodes, três de cada lado (grossos o bastante para não tremular de longe)
        for k, (dz, ang) in enumerate(((0.025, 0.12), (0.0, 0.0), (-0.025, -0.12))):
            x0, z0 = sx * 0.1, 0.91 + dz
            adopt(tube([(x0, -0.32, z0), (x0 + sx * 0.16, -0.31, z0 + ang * 0.6 + 0.01), (x0 + sx * 0.28, -0.29, z0 + ang * 1.3)], 0.0065, E.BIGODE), cab)
    for sx, nm in ((-1, "E"), (1, "D")):
        x = sx * 0.13
        o = pivot(f"gato_olho{nm}", (x, -0.272, 1.05), root)
        adopt(box((0.135, 0.025, 0.155), (x, -0.272, 1.05), E.OLHO_GATO, bevel=0.055, seg=6), o)          # a íris
        adopt(box((0.032, 0.02, 0.125), (x, -0.287, 1.05), E.OLHO, bevel=0.012, seg=3, name=f"gato_pupila{nm}"), o)  # a fenda
        adopt(sphere(0.015, (x + 0.032, -0.296, 1.09), E.OLHO_BRANCO, sub=2), o)                          # o brilho
        adopt(o, cab)
        s = pivot(f"gato_sobrancelha{nm}", (x, -0.272, 1.16), root)
        adopt(box((0.11, 0.025, 0.03), (x, -0.272, 1.16), E.PELO3, bevel=0.012, seg=3), s)
        adopt(s, cab)
    b = pivot("gato_boca", (0, -0.33, 0.845), root)
    adopt(box((0.1, 0.02, 0.05), (0, -0.33, 0.845), E.BOCA, bevel=0.012, seg=3), b)
    adopt(box((0.06, 0.021, 0.02), (0, -0.336, 0.832), E.LINGUA, bevel=0.006, seg=2), b)
    adopt(b, cab)
    return root


def coruja():
    """A coruja que conversa (0,98 m): corpo de ovo, o peito claro com as penas em V, o disco do rosto, os olhos
    enormes de íris amarela, o bico laranja (a parte de baixo é a boca que abre), os tufos da orelha, as asas (os
    "braços", que gesticulam) e os pés. CONTRATO DO ROSTO: coruja_cabeca, coruja_olhoE/D, coruja_pupilaE/D,
    coruja_sobrancelhaE/D, coruja_boca e coruja_bracoE/D. Olhos a 0,8 m, boca a 0,66 m, a cara 0,3 m à frente."""
    root = empty("coruja")
    sphere(0.34, (0, 0.02, 0.4), E.PENA, scale=(1.0, 0.92, 1.12), sub=4, parent=root, name="coruja_corpo")
    sphere(0.24, (0, -0.15, 0.36), E.PENA2, scale=(0.95, 0.55, 1.1), sub=4, parent=root)            # o peito
    random.seed(8)
    for fila, z in enumerate((0.5, 0.42, 0.34, 0.26, 0.18)):  # as penas em V do peito
        for k in range(-2, 3):
            if abs(k) == 2 and fila in (0, 4):
                continue
            x = k * 0.075 + (fila % 2) * 0.035
            for sx in (-1, 1):
                box((0.04, 0.014, 0.012), (x + sx * 0.012, -0.275 + abs(x) * 0.25, z + 0.006), E.PENA3, bevel=0.005, seg=1, parent=root, rot=(0, sx * 0.6, 0))
    for sx in (-1, 1):  # os pés
        for k in (-1, 0, 1):
            sphere(0.032, (sx * 0.1 + k * 0.035, -0.2, 0.03), E.BICO, scale=(0.8, 1.6, 0.7), sub=2, parent=root)
    for sx, nm in ((-1, "E"), (1, "D")):  # as asas
        p = pivot(f"coruja_braco{nm}", (sx * 0.3, 0.0, 0.56), root)
        adopt(sphere(0.2, (sx * 0.33, 0.04, 0.38), E.PENA3, scale=(0.4, 0.85, 1.15), sub=4), p)
        for k in range(3):
            adopt(box((0.03, 0.16, 0.035), (sx * 0.39, 0.04, 0.3 - k * 0.07), E.PENA, bevel=0.015, seg=3, rot=(0.3, 0, 0)), p)
        if nm == "D":  # a pena da ponta da asa, que aponta
            d = pivot("coruja_dedoD", (sx * 0.34, 0.02, 0.2), root)
            adopt(cyl(0.04, 0.2, (sx * 0.34, 0.02, 0.13), E.PENA3, verts=6, bevel=0.012, r2=0.008), d)
            adopt(d, p)
    cab = pivot("coruja_cabeca", (0, 0, 0.6), root)
    adopt(sphere(0.33, (0, 0.0, 0.8), E.PENA, scale=(1.08, 0.92, 0.82), sub=4, name="coruja_rosto"), cab)
    for sx in (-1, 1):
        adopt(cyl(0.14, 0.04, (sx * 0.12, -0.255, 0.8), E.PENA2, rot=(PI / 2, 0, 0), verts=40, bevel=0.018), cab)  # o disco do rosto
        adopt(cyl(0.07, 0.15, (sx * 0.2, -0.02, 1.07), E.PENA3, verts=5, bevel=0.02, r2=0.01, rot=(0, sx * -0.35, 0)), cab)  # os tufos
    for sx, nm in ((-1, "E"), (1, "D")):
        x = sx * 0.12
        o = pivot(f"coruja_olho{nm}", (x, -0.285, 0.8), root)
        adopt(cyl(0.085, 0.02, (x, -0.285, 0.8), E.OLHO_CORUJA, rot=(PI / 2, 0, 0), verts=36, bevel=0.008), o)
        adopt(cyl(0.045, 0.02, (x, -0.297, 0.8), E.OLHO, rot=(PI / 2, 0, 0), verts=28, bevel=0.006, name=f"coruja_pupila{nm}"), o)
        adopt(sphere(0.016, (x + 0.025, -0.31, 0.83), E.OLHO_BRANCO, sub=2), o)
        adopt(o, cab)
        s = pivot(f"coruja_sobrancelha{nm}", (x, -0.27, 0.92), root)
        adopt(box((0.13, 0.035, 0.035), (x, -0.27, 0.92), E.PENA3, bevel=0.014, seg=3, rot=(0, -sx * 0.15, 0)), s)
        adopt(s, cab)
    adopt(cyl(0.045, 0.09, (0, -0.31, 0.7), E.BICO, verts=24, bevel=0.012, r2=0.008, rot=(PI, 0, 0)), cab)  # o bico de cima
    b = pivot("coruja_boca", (0, -0.29, 0.655), root)
    adopt(box((0.07, 0.02, 0.035), (0, -0.29, 0.655), E.BOCA, bevel=0.01, seg=3), b)
    adopt(box((0.05, 0.025, 0.02), (0, -0.3, 0.635), E.BICO, bevel=0.008, seg=2), b)
    adopt(b, cab)
    return root


def robo():
    """O robô que conversa: o personagem não humano de exemplo do Estilo Conversa (1,32 m). Segue o CONTRATO DO ROSTO
    (ver o guia): robo_cabeca (o pivô da cabeça), robo_olhoE/D (escala na altura = piscar e emoção),
    robo_sobrancelhaE/D (sobe e gira com a emoção), robo_boca (escala na altura = abertura da sílaba) e
    robo_bracoE/D. O rosto é uma tela escura com os olhos, a sobrancelha e a boca acesos em ciano.
    Olhos a 1,16 m, boca a 0,99 m, a tela 0,26 m à frente do centro."""
    root = empty("robo")
    for sx, nm in ((-1, "E"), (1, "D")):
        p = pivot(f"robo_perna{nm}", (sx * 0.13, 0, 0.3), root)
        adopt(cyl(0.07, 0.24, (sx * 0.13, 0, 0.2), E.ACO, verts=20, bevel=0.012), p)
        adopt(box((0.17, 0.25, 0.08), (sx * 0.13, -0.03, 0.04), E.ROBO_ESC, bevel=0.03, seg=4), p)
    box((0.56, 0.42, 0.48), (0, 0, 0.56), E.ROBO, bevel=0.09, seg=6, parent=root, name="robo_tronco")
    box((0.3, 0.02, 0.16), (0, -0.212, 0.6), E.ROBO_ESC, bevel=0.03, seg=3, parent=root)            # o painel do peito
    for k, c in enumerate((E.ROBO_LUZ, E.AMARELO, E.VERMELHO)):
        cyl(0.022, 0.02, (-0.08 + k * 0.08, -0.224, 0.6), c, rot=(PI / 2, 0, 0), verts=16, bevel=0.005, parent=root)
    cyl(0.07, 0.1, (0, 0, 0.84), E.ACO, verts=20, bevel=0.01, parent=root)                         # o pescoço
    for sx, nm in ((-1, "E"), (1, "D")):
        p = pivot(f"robo_braco{nm}", (sx * 0.31, 0, 0.74), root)
        adopt(sphere(0.07, (sx * 0.31, 0, 0.74), E.ACO, sub=2), p)
        adopt(cyl(0.05, 0.3, (sx * 0.33, 0, 0.56), E.ROBO, verts=18, bevel=0.015), p)
        adopt(sphere(0.07, (sx * 0.33, 0, 0.38), E.ROBO_ESC, sub=2), p)
        if nm == "D":  # o dedo que aponta: uma ponta fina de aço
            d = pivot("robo_dedoD", (sx * 0.33, 0, 0.33), root)
            adopt(cyl(0.024, 0.13, (sx * 0.33, 0, 0.27), E.ACO, verts=16, bevel=0.008, r2=0.012), d)
            adopt(sphere(0.016, (sx * 0.33, 0, 0.2), E.ROBO_LUZ, sub=2), d)
            adopt(d, p)
    cab = pivot("robo_cabeca", (0, 0, 0.88), root)
    adopt(box((0.62, 0.5, 0.48), (0, 0, 1.12), E.ROBO, bevel=0.1, seg=7, name="robo_rosto"), cab)
    adopt(box((0.52, 0.03, 0.4), (0, -0.245, 1.12), E.TELA, bevel=0.06, seg=5), cab)                # a tela do rosto
    for sx in (-1, 1):
        adopt(cyl(0.07, 0.06, (sx * 0.32, 0, 1.12), E.ROBO_ESC, rot=(0, PI / 2, 0), verts=24, bevel=0.012), cab)  # as orelhas
    adopt(cyl(0.012, 0.16, (0, 0, 1.43), E.ACO, verts=8, bevel=0.0), cab)                         # a antena
    adopt(sphere(0.04, (0, 0, 1.52), E.ROBO_LUZ, sub=2), cab)
    for sx, nm in ((-1, "E"), (1, "D")):
        o = pivot(f"robo_olho{nm}", (sx * 0.12, -0.262, 1.16), root)
        adopt(box((0.1, 0.012, 0.13), (sx * 0.12, -0.262, 1.16), E.ROBO_LUZ, bevel=0.03, seg=3), o)
        adopt(o, cab)
        sb = pivot(f"robo_sobrancelha{nm}", (sx * 0.12, -0.264, 1.25), root)
        adopt(box((0.12, 0.012, 0.025), (sx * 0.12, -0.264, 1.25), E.ROBO_LUZ, bevel=0.008, seg=2), sb)
        adopt(sb, cab)
    b = pivot("robo_boca", (0, -0.262, 0.99), root)
    adopt(box((0.16, 0.012, 0.045), (0, -0.262, 0.99), E.ROBO_LUZ, bevel=0.012, seg=2), b)
    adopt(b, cab)
    return root


def claude_rosto():
    """O Claude que conversa: a peça claude com boca (claude_boca, escala z = abertura), olhos felizes "^ ^"
    (claude_feliz, escondido até a cena mostrar) e bochechas coradas (claude_bochechas)."""
    root = claude()
    root.name = "claude_rosto"
    boca = pivot("claude_boca", (0, -0.366, 0.56), root)
    adopt(box((0.1, 0.02, 0.04), (0, -0.366, 0.56), E.OLHO, bevel=0.01, seg=2), boca)
    feliz = pivot("claude_feliz", (0, -0.37, 0.76), root)
    for sx in (-1, 1):
        for lado in (-1, 1):
            adopt(box((0.12, 0.03, 0.035), (sx * 0.2 + lado * 0.04, -0.37, 0.76), E.OLHO, bevel=0.012, seg=2, rot=(0, lado * 0.75, 0)), feliz)
    boch = pivot("claude_bochechas", (0, -0.366, 0.6), root)
    for sx in (-1, 1):
        adopt(box((0.11, 0.015, 0.05), (sx * 0.31, -0.366, 0.62), E.BOCHECHA, bevel=0.012, seg=2), boch)
    return root


# ---------------- terraço (2026-11-20) ----------------
def parapeito():
    """Mureta de terraço, 4 m de comprimento ao longo de X, 1,05 m de altura, com a pingadeira em cima."""
    root = empty("parapeito")
    box((4.0, 0.24, 0.98), (0, 0, 0.49), E.CONCRETO, bevel=0.03, parent=root, name="parapeito_muro")
    box((4.08, 0.34, 0.08), (0, 0, 1.01), E.PEDRA_CLARA, bevel=0.025, parent=root)
    return root


def caixa_dagua():
    """Caixa d'água redonda sobre quatro pés, 3 m."""
    root = empty("caixa_dagua")
    for sx in (-1, 1):
        for sy in (-1, 1):
            box((0.12, 0.12, 1.2), (sx * 0.6, sy * 0.6, 0.6), E.ACO, bevel=0.02, parent=root)
    box((1.6, 1.6, 0.1), (0, 0, 1.25), E.ACO, bevel=0.03, parent=root)
    cyl(0.85, 1.4, (0, 0, 2.0), E.CAIXA_DAGUA, verts=40, bevel=0.04, parent=root)
    cyl(0.88, 0.12, (0, 0, 2.75), E.CAIXA_DAGUA, verts=40, bevel=0.04, r2=0.5, parent=root)
    for z in (1.6, 2.2):
        cyl(0.87, 0.05, (0, 0, z), E.ESCURO, verts=40, bevel=0.0, parent=root)
    return root


def antena():
    """Antena de topo de prédio, 4,5 m, com a luz vermelha piscando (antena_luz)."""
    root = empty("antena")
    box((0.5, 0.5, 0.15), (0, 0, 0.075), E.CONCRETO, bevel=0.03, parent=root)
    cyl(0.04, 4.2, (0, 0, 2.2), E.ACO, verts=12, bevel=0.01, parent=root)
    for z, w in ((2.6, 1.0), (3.2, 0.8), (3.7, 0.6)):
        box((w, 0.03, 0.03), (0, 0, z), E.ACO, bevel=0.008, parent=root)
    sphere(0.07, (0, 0, 4.35), E.LUZ_VERMELHA, sub=2, parent=root, name="antena_luz")
    return root


def vaso_planta():
    """Vaso de terraço com planta, 1,1 m."""
    root = empty("vaso_planta")
    cyl(0.28, 0.5, (0, 0, 0.25), E.VASO, verts=20, bevel=0.03, r2=0.34, parent=root)
    random.seed(9)
    for (x, y, r) in ((0, 0, 0.32), (0.15, 0.08, 0.24), (-0.14, -0.06, 0.25), (0.02, -0.12, 0.22)):
        sphere(r, (x, y, 0.62 + r * 0.6), E.FOLHA2 if r > 0.3 else E.FOLHA1, scale=(1, 1, 1.1), sub=2, parent=root, smooth=False, jitter=0.08)
    return root


def ar_condicionado():
    """Condensadora de ar-condicionado, 0,9 m."""
    root = empty("ar_condicionado")
    box((0.9, 0.38, 0.62), (0, 0, 0.36), E.CARCACA, bevel=0.03, parent=root)
    cyl(0.22, 0.02, (-0.15, -0.19, 0.38), E.ESCURO, rot=(PI / 2, 0, 0), verts=28, bevel=0.0, parent=root)
    for z in range(5):
        box((0.04, 0.02, 0.5), (0.25 + z * 0.035, -0.19, 0.38), E.GRAFITE, bevel=0.0, parent=root)
    for sx in (-1, 1):
        box((0.08, 0.36, 0.05), (sx * 0.38, 0, 0.025), E.ESCURO, bevel=0.01, parent=root)
    return root


def banco():
    """Banco de madeira de terraço, 1,6 m."""
    root = empty("banco")
    for i in range(3):
        box((1.6, 0.13, 0.04), (0, -0.16 + i * 0.16, 0.45), E.MADEIRA, bevel=0.01, parent=root)
    for sx in (-1, 1):
        box((0.06, 0.45, 0.43), (sx * 0.7, 0, 0.215), E.ESCURO, bevel=0.012, parent=root)
    return root



# ---------------- os lugares (2026-11-21): escritório, quarto, café, sala de aula ----------------
def _rodizios(root, r, z, m):
    """a base de cinco pés com rodízio das cadeiras de escritório"""
    for k in range(5):
        a = k * 2 * PI / 5
        box((r, 0.05, 0.035), (math.cos(a) * r / 2, math.sin(a) * r / 2, z), m, bevel=0.012, seg=2, parent=root, rot=(0, 0, a))
        sphere(0.03, (math.cos(a) * r, math.sin(a) * r, 0.03), E.ESCURO, sub=2, parent=root)


def cadeira_escritorio():
    """Cadeira de escritório (1,05 m): base de cinco pés com rodízio, o pistão, assento e encosto estofados e os braços.
    Frente para -Y. Cor pelo material estofado."""
    root = empty("cadeira_escritorio")
    _rodizios(root, 0.3, 0.07, E.ESCURO)
    cyl(0.03, 0.34, (0, 0, 0.25), E.ACO, verts=16, bevel=0.006, parent=root)
    box((0.5, 0.48, 0.09), (0, 0, 0.47), E.ESTOFADO, bevel=0.04, seg=5, parent=root)
    box((0.46, 0.08, 0.52), (0, 0.24, 0.8), E.ESTOFADO, bevel=0.04, seg=5, parent=root, rot=(-0.12, 0, 0))
    box((0.06, 0.04, 0.32), (0, 0.22, 0.55), E.ESCURO, bevel=0.012, seg=2, parent=root)
    for sx in (-1, 1):
        box((0.04, 0.04, 0.2), (sx * 0.24, 0.05, 0.58), E.ESCURO, bevel=0.012, seg=2, parent=root)
        box((0.07, 0.26, 0.035), (sx * 0.24, 0.02, 0.69), E.ESCURO, bevel=0.015, seg=3, parent=root)
    return root


def cadeira_gamer():
    """Cadeira gamer (1,35 m): encosto alto com as abas, as faixas de cor (material laranja: troque a cor), a almofada
    de pescoço e a de lombar. Frente para -Y."""
    root = empty("cadeira_gamer")
    _rodizios(root, 0.33, 0.07, E.ESCURO)
    cyl(0.032, 0.34, (0, 0, 0.25), E.ACO, verts=16, bevel=0.006, parent=root)
    box((0.54, 0.5, 0.1), (0, 0, 0.47), E.ESTOFADO, bevel=0.045, seg=5, parent=root)
    for sx in (-1, 1):
        box((0.08, 0.46, 0.08), (sx * 0.25, 0, 0.53), E.ESTOFADO, bevel=0.035, seg=4, parent=root)  # as abas do assento
        box((0.08, 0.12, 0.8), (sx * 0.25, 0.27, 0.92), E.ESTOFADO, bevel=0.035, seg=4, parent=root, rot=(-0.1, 0, 0))
        box((0.06, 0.125, 0.78), (sx * 0.18, 0.268, 0.93), E.LARANJA, bevel=0.02, seg=3, parent=root, rot=(-0.1, 0, 0))  # as faixas
        box((0.07, 0.28, 0.035), (sx * 0.29, 0.02, 0.7), E.ESCURO, bevel=0.015, seg=3, parent=root)
        box((0.04, 0.04, 0.2), (sx * 0.29, 0.06, 0.59), E.ESCURO, bevel=0.012, seg=2, parent=root)
    box((0.4, 0.1, 0.84), (0, 0.29, 0.93), E.ESTOFADO, bevel=0.04, seg=5, parent=root, rot=(-0.1, 0, 0))
    box((0.26, 0.08, 0.1), (0, 0.22, 1.24), E.LARANJA, bevel=0.04, seg=4, parent=root, rot=(-0.1, 0, 0))  # o travesseiro
    box((0.28, 0.08, 0.12), (0, 0.22, 0.66), E.LARANJA, bevel=0.045, seg=4, parent=root, rot=(-0.1, 0, 0))  # a lombar
    return root


def mesa_escritorio():
    """Mesa de trabalho de 1,4 x 0,7 m (tampo a 0,75 m): tampo claro, pés de aço e o gaveteiro."""
    root = empty("mesa_escritorio")
    box((1.4, 0.7, 0.035), (0, 0, 0.735), E.CREME, bevel=0.012, seg=3, parent=root)
    for sx in (-1, 1):
        box((0.05, 0.62, 0.04), (sx * 0.64, 0, 0.03), E.GRAFITE, bevel=0.012, seg=2, parent=root)
        box((0.05, 0.05, 0.7), (sx * 0.64, 0, 0.37), E.GRAFITE, bevel=0.012, seg=2, parent=root)
    box((1.24, 0.03, 0.12), (0, 0.3, 0.64), E.GRAFITE, bevel=0.01, seg=2, parent=root)
    box((0.4, 0.55, 0.6), (0.42, -0.02, 0.33), E.CREME, bevel=0.015, seg=3, parent=root)  # o gaveteiro
    for k in range(3):
        box((0.38, 0.01, 0.17), (0.42, -0.3, 0.13 + k * 0.19), E.CREME, bevel=0.006, seg=2, parent=root)
        box((0.12, 0.02, 0.02), (0.42, -0.315, 0.18 + k * 0.19), E.ACO, bevel=0.006, seg=2, parent=root)
    return root


def luminaria_mesa():
    """Luminária de mesa articulada (0,55 m) com a lâmpada acesa."""
    root = empty("luminaria_mesa")
    cyl(0.09, 0.025, (0, 0, 0.0125), E.GRAFITE, verts=28, bevel=0.008, parent=root)
    tube([(0, 0, 0.02), (0.02, 0.05, 0.3), (0.0, -0.12, 0.5)], 0.012, E.GRAFITE, parent=root)
    cyl(0.08, 0.12, (0.0, -0.17, 0.48), E.AMARELO, verts=24, bevel=0.012, r2=0.035, rot=(0.9, 0, 0), parent=root)
    sphere(0.04, (0.0, -0.2, 0.44), E.LAMPADA, sub=2, parent=root, name="luminaria_mesa_lampada")
    return root


def _livros(root, x0, x1, y, z, h0, seed, cores):
    random.seed(seed)
    x = x0
    while x < x1 - 0.03:
        w = random.uniform(0.025, 0.05); h = random.uniform(h0 * 0.7, h0)
        if x + w > x1:
            break
        if random.random() < 0.12 and x + 0.2 < x1:  # um livro deitado de vez em quando
            box((0.18, 0.2, 0.04), (x + 0.09, y, z + 0.02), random.choice(cores), bevel=0.006, seg=2, parent=root)
            x += 0.2
            continue
        box((w, 0.2, h), (x + w / 2, y, z + h / 2), random.choice(cores), bevel=0.005, seg=2, parent=root, rot=(0, random.uniform(-0.04, 0.04), 0))
        x += w + 0.003


def estante_livros():
    """Estante de madeira de 0,9 x 0,32 x 1,9 m: cinco prateleiras com livros de várias cores, uma plantinha e um
    porta-retrato. Frente para -Y."""
    root = empty("estante_livros")
    for sx in (-1, 1):
        box((0.03, 0.32, 1.9), (sx * 0.435, 0, 0.95), E.MADEIRA, bevel=0.008, seg=2, parent=root)
    box((0.9, 0.02, 1.9), (0, 0.15, 0.95), E.MADEIRA_ESC, bevel=0.004, seg=1, parent=root)
    cores = [E.LIVRO1, E.LIVRO2, E.LIVRO3, E.LIVRO4, E.CREME]
    for k, z in enumerate((0.05, 0.42, 0.8, 1.18, 1.56, 1.88)):
        box((0.86, 0.3, 0.025), (0, 0, z), E.MADEIRA, bevel=0.006, seg=2, parent=root)
        if z < 1.8:
            fim = 0.4 if k in (1, 3) else 0.41
            _livros(root, -0.41, fim if k not in (1, 3) else 0.15, -0.02, z + 0.0125, 0.3, 7 + k, cores)
    vaso = cyl(0.06, 0.1, (0.3, -0.03, 0.48), E.CREME, verts=20, bevel=0.01, r2=0.05, parent=root)
    for k in range(5):
        sphere(0.045, (0.3 + math.cos(k) * 0.04, -0.03 + math.sin(k) * 0.03, 0.57 + k * 0.012), E.FOLHA1 if k % 2 else E.FOLHA2, sub=2, parent=root)
    box((0.14, 0.02, 0.18), (0.3, -0.04, 1.29), E.MADEIRA_ESC, bevel=0.008, seg=2, parent=root, rot=(0.12, 0, 0))
    box((0.11, 0.01, 0.14), (0.3, -0.052, 1.29), E.CEU_FOTO, bevel=0.003, seg=1, parent=root, rot=(0.12, 0, 0))
    return root


def quadro_branco():
    """Quadro branco de 1,6 x 1,0 m na parede (o centro a 1,55 m): moldura de alumínio, a bandeja com canetas e a
    face (quadro_face) para o escrever. Fica encostado na parede, de frente para -Y."""
    root = empty("quadro_branco")
    box((1.66, 0.04, 1.06), (0, 0, 1.55), E.ACO, bevel=0.012, seg=2, parent=root)
    screen((1.6, 0.006, 1.0), (0, -0.022, 1.55), E.BRANCO, root, "quadro_face")
    box((0.7, 0.07, 0.03), (0, -0.04, 1.02), E.ACO, bevel=0.008, seg=2, parent=root)
    for k, m in enumerate((E.AZUL, E.VERMELHO, E.VERDE)):
        cyl(0.011, 0.13, (-0.18 + k * 0.08, -0.05, 1.045), m, rot=(0, PI / 2, 0), verts=12, bevel=0.003, parent=root)
    return root


def lousa():
    """Lousa verde de giz de 2,4 x 1,1 m (o centro a 1,5 m), com moldura de madeira, o apagador e o giz na bandeja, e
    a face (lousa_face) para o escrever (letra de giz)."""
    root = empty("lousa")
    box((2.5, 0.05, 1.2), (0, 0, 1.5), E.MADEIRA, bevel=0.012, seg=2, parent=root)
    screen((2.4, 0.006, 1.1), (0, -0.027, 1.5), E.LOUSA, root, "lousa_face")
    box((1.2, 0.08, 0.025), (0, -0.05, 0.93), E.MADEIRA, bevel=0.006, seg=2, parent=root)
    box((0.14, 0.05, 0.04), (0.3, -0.06, 0.96), E.MADEIRA_ESC, bevel=0.008, seg=2, parent=root)
    for k in range(3):
        cyl(0.007, 0.06, (-0.2 + k * 0.04, -0.06, 0.947), E.BRANCO, rot=(0, PI / 2, 0), verts=8, bevel=0.002, parent=root)
    return root


def lousa_cardapio():
    """O cardápio de giz do café (0,9 x 1,1 m), pendurado na parede atrás do balcão, com a face lousa_cardapio_face."""
    root = empty("lousa_cardapio")
    box((0.96, 0.04, 1.16), (0, 0, 1.75), E.MADEIRA_ESC, bevel=0.012, seg=2, parent=root)
    screen((0.9, 0.006, 1.1), (0, -0.022, 1.75), E.LOUSA, root, "lousa_cardapio_face")
    return root


def cama():
    """Cama de casal (1,6 x 2,1 m): estrado de madeira, cabeceira estofada, colchão, o edredom dobrado no pé e dois
    travesseiros. A cabeceira fica em +Y (encoste na parede do fundo)."""
    root = empty("cama")
    box((1.66, 2.1, 0.25), (0, 0, 0.18), E.MADEIRA, bevel=0.02, seg=3, parent=root)
    box((1.7, 0.1, 0.95), (0, 1.06, 0.55), E.ESTOFADO, bevel=0.045, seg=5, parent=root)
    box((1.58, 2.0, 0.2), (0, -0.02, 0.4), E.LENCOL, bevel=0.06, seg=5, parent=root)
    box((1.64, 1.25, 0.1), (0, -0.4, 0.54), E.EDREDOM, bevel=0.05, seg=5, parent=root)
    box((1.66, 0.3, 0.14), (0, -0.92, 0.56), E.EDREDOM, bevel=0.06, seg=5, parent=root)  # a dobra
    for sx in (-1, 1):
        box((0.62, 0.36, 0.14), (sx * 0.38, 0.78, 0.56), E.LENCOL, bevel=0.06, seg=5, parent=root, rot=(0.25, 0, 0))
    return root


def prateleira():
    """Prateleira de parede (0,9 m, a 1,5 m do chão) com livros, um pote com planta e um bonequinho do Claude."""
    root = empty("prateleira")
    box((0.9, 0.22, 0.03), (0, 0, 1.5), E.MADEIRA, bevel=0.008, seg=2, parent=root)
    for sx in (-1, 1):
        box((0.03, 0.18, 0.1), (sx * 0.36, 0.02, 1.45), E.GRAFITE, bevel=0.008, seg=2, parent=root)
    _livros(root, -0.42, 0.05, 0.0, 1.515, 0.24, 33, [E.LIVRO1, E.LIVRO2, E.LIVRO3, E.LIVRO4])
    cyl(0.06, 0.1, (0.18, 0.0, 1.565), E.CREME, verts=20, bevel=0.01, r2=0.05, parent=root)
    for k in range(4):
        sphere(0.04, (0.18 + math.cos(k * 1.6) * 0.035, math.sin(k * 1.6) * 0.03, 1.64 + k * 0.012), E.FOLHA2 if k % 2 else E.FOLHA1, sub=2, parent=root)
    box((0.1, 0.07, 0.08), (0.34, 0.0, 1.555), E.CLAUDE, bevel=0.025, seg=4, parent=root)  # o Claudinho
    for sx in (-1, 1):
        box((0.012, 0.006, 0.022), (0.34 + sx * 0.022, -0.036, 1.565), E.OLHO, bevel=0.003, seg=1, parent=root)
    return root


def balcao():
    """O balcão do café (2,4 x 0,62 x 1,05 m): frente de ripas de madeira, tampo de mármore, a vitrine de doces e a
    caixa registradora. A frente (dos clientes) é -Y."""
    root = empty("balcao")
    box((2.4, 0.6, 1.0), (0, 0, 0.5), E.MADEIRA_ESC, bevel=0.02, seg=3, parent=root)
    for k in range(16):
        box((0.12, 0.02, 0.92), (-1.125 + k * 0.15, -0.305, 0.5), E.MADEIRA, bevel=0.01, seg=2, parent=root)
    box((2.46, 0.68, 0.05), (0, -0.02, 1.025), E.MARMORE, bevel=0.012, seg=3, parent=root)
    box((0.7, 0.42, 0.32), (-0.7, -0.04, 1.21), E.VIDRO, bevel=0.012, seg=2, parent=root)  # a vitrine
    for k in range(3):
        sphere(0.05, (-0.9 + k * 0.2, -0.04, 1.09), (E.CAFE, E.AMARELO, E.VERMELHO)[k], scale=(1, 1, 0.55), sub=2, parent=root)
    box((0.3, 0.26, 0.16), (0.85, 0.05, 1.13), E.GRAFITE, bevel=0.02, seg=3, parent=root)
    box((0.26, 0.16, 0.1), (0.85, -0.02, 1.25), E.TELA, bevel=0.012, seg=2, parent=root, rot=(-0.5, 0, 0))
    return root


def maquina_cafe():
    """Máquina de espresso (0,7 m de largura) de aço, com dois grupos, os porta-filtros, o bico de vapor, o
    manômetro e as xícaras no alto."""
    root = empty("maquina_cafe")
    box((0.7, 0.5, 0.42), (0, 0, 0.21), E.ACO, bevel=0.04, seg=4, parent=root)
    box((0.72, 0.52, 0.04), (0, 0, 0.44), E.ESCURO, bevel=0.012, seg=2, parent=root)
    box((0.6, 0.3, 0.025), (0, -0.12, 0.025), E.GRAFITE, bevel=0.008, seg=2, parent=root)
    for sx in (-1, 1):
        cyl(0.05, 0.05, (sx * 0.16, -0.27, 0.27), E.ACO, verts=24, bevel=0.01, parent=root)
        box((0.025, 0.2, 0.025), (sx * 0.16, -0.38, 0.24), E.ESCURO, bevel=0.008, seg=2, parent=root)
    tube([(0.3, -0.24, 0.3), (0.32, -0.3, 0.18), (0.32, -0.3, 0.1)], 0.01, E.ACO, parent=root)
    cyl(0.045, 0.02, (0, -0.255, 0.33), E.CREME, rot=(PI / 2, 0, 0), verts=24, bevel=0.006, parent=root)
    for k in range(4):
        cyl(0.035, 0.05, (-0.21 + k * 0.14, 0.05, 0.485), E.CERAMICA, verts=20, bevel=0.008, parent=root)
    return root


def xicara():
    """Xícara de café com pires (a xícara 0,08 m), a bebida escura dentro."""
    root = empty("xicara")
    cyl(0.075, 0.012, (0, 0, 0.006), E.CERAMICA, verts=28, bevel=0.004, parent=root)
    cyl(0.045, 0.07, (0, 0, 0.047), E.CERAMICA, verts=28, bevel=0.008, r2=0.038, parent=root)
    cyl(0.04, 0.004, (0, 0, 0.08), E.CAFE, verts=24, bevel=0.0, parent=root)
    torus(0.022, 0.006, (0.05, 0, 0.05), E.CERAMICA, rot=(PI / 2, 0, 0), parent=root)
    return root


def mesinha():
    """Mesinha redonda de café (0,7 m, tampo a 0,74 m) com pé de ferro."""
    root = empty("mesinha")
    cyl(0.35, 0.03, (0, 0, 0.735), E.MADEIRA, verts=40, bevel=0.01, parent=root)
    cyl(0.035, 0.7, (0, 0, 0.37), E.ESCURO, verts=16, bevel=0.006, parent=root)
    cyl(0.22, 0.03, (0, 0, 0.015), E.ESCURO, verts=32, bevel=0.01, parent=root)
    return root


def cadeira_cafe():
    """Cadeira de café de madeira (0,85 m), assento redondo e encosto de ripas curvas. Frente para -Y."""
    root = empty("cadeira_cafe")
    cyl(0.21, 0.04, (0, 0, 0.46), E.MADEIRA, verts=32, bevel=0.012, parent=root)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl(0.018, 0.46, (sx * 0.14, sy * 0.14, 0.23), E.MADEIRA_ESC, verts=12, bevel=0.004, parent=root, rot=(sy * 0.08, -sx * 0.08, 0))
    tube([(-0.17, 0.12, 0.47), (-0.19, 0.16, 0.85), (0.0, 0.2, 0.86), (0.19, 0.16, 0.85), (0.17, 0.12, 0.47)], 0.016, E.MADEIRA_ESC, parent=root)
    box((0.34, 0.03, 0.07), (0, 0.19, 0.76), E.MADEIRA, bevel=0.012, seg=2, parent=root)
    return root


def banqueta():
    """Banqueta alta de balcão (0,75 m) com o apoio de pé."""
    root = empty("banqueta")
    cyl(0.18, 0.05, (0, 0, 0.74), E.ESTOFADO, verts=32, bevel=0.02, parent=root)
    for k in range(4):
        a = k * PI / 2 + PI / 4
        cyl(0.015, 0.74, (math.cos(a) * 0.13, math.sin(a) * 0.13, 0.36), E.ESCURO, verts=10, bevel=0.003, parent=root, rot=(-math.sin(a) * 0.12, math.cos(a) * 0.12, 0))
    torus(0.15, 0.01, (0, 0, 0.28), E.ESCURO, parent=root)
    return root


def carteira():
    """Carteira escolar (o tampo a 0,72 m) com a cadeira presa: tampo de madeira, a gaveta embaixo e a estrutura
    de ferro. O aluno senta em +Y, olhando para -Y."""
    root = empty("carteira")
    box((0.62, 0.45, 0.025), (0, -0.05, 0.72), E.MADEIRA, bevel=0.008, seg=2, parent=root)
    box((0.58, 0.38, 0.1), (0, -0.05, 0.64), E.GRAFITE, bevel=0.01, seg=2, parent=root)
    for sx in (-1, 1):
        cyl(0.014, 0.66, (sx * 0.27, -0.22, 0.33), E.GRAFITE, verts=10, bevel=0.003, parent=root)
        cyl(0.014, 0.66, (sx * 0.27, 0.12, 0.33), E.GRAFITE, verts=10, bevel=0.003, parent=root)
        cyl(0.014, 0.46, (sx * 0.2, 0.42, 0.23), E.GRAFITE, verts=10, bevel=0.003, parent=root)
        cyl(0.014, 0.82, (sx * 0.2, 0.62, 0.41), E.GRAFITE, verts=10, bevel=0.003, parent=root)
    box((0.42, 0.38, 0.025), (0, 0.48, 0.45), E.MADEIRA, bevel=0.008, seg=2, parent=root)
    box((0.42, 0.025, 0.22), (0, 0.64, 0.72), E.MADEIRA, bevel=0.008, seg=2, parent=root)
    return root


def janela():
    """Janela de 1,4 x 1,4 m (o centro a 1,5 m) para encaixar na parede: o batente, a divisão em quatro e o
    parapeito. Sem vidro: o three.js põe a paisagem (dia, tarde, noite) atrás dela."""
    root = empty("janela")
    for sx in (-1, 1):
        box((0.08, 0.14, 1.5), (sx * 0.71, 0, 1.5), E.BRANCO, bevel=0.012, seg=2, parent=root)
        box((1.5, 0.14, 0.08), (0, 0, 1.5 + sx * 0.71), E.BRANCO, bevel=0.012, seg=2, parent=root)
    box((0.04, 0.08, 1.4), (0, 0, 1.5), E.BRANCO, bevel=0.008, seg=2, parent=root)
    box((1.4, 0.08, 0.04), (0, 0, 1.5), E.BRANCO, bevel=0.008, seg=2, parent=root)
    box((1.62, 0.24, 0.05), (0, -0.06, 0.765), E.BRANCO, bevel=0.012, seg=2, parent=root)
    return root


PECAS = {
    "claude": claude, "pessoa": pessoa, "pessoa_b": pessoa_b,
    "computador": computador, "notebook": notebook, "celular": celular, "mesa": mesa,
    "caixa_arquivo": caixa_arquivo, "documento": documento, "pasta": pasta, "cadeado": cadeado, "lupa": lupa,
    "seta": seta, "interrogacao": interrogacao, "exclamacao": exclamacao, "balao": balao,
    "placa": placa, "placa_seta": placa_seta, "casa": casa, "predio": predio,
    "locomotiva": locomotiva, "vagao": vagao, "carrinho": carrinho, "estacao": estacao, "poste": poste,
    "alavanca": alavanca, "caixote": caixote,
    "capacete": capacete, "prancheta": prancheta, "esteira": esteira, "bau": bau, "tanque": tanque, "cracha": cracha,
    "marcador": marcador, "cone": cone, "cavalete": cavalete, "tabuas": tabuas,
    "estante": estante, "luminaria_pendente": luminaria_pendente,
    "cadeira_escritorio": cadeira_escritorio, "cadeira_gamer": cadeira_gamer, "mesa_escritorio": mesa_escritorio,
    "luminaria_mesa": luminaria_mesa, "estante_livros": estante_livros, "quadro_branco": quadro_branco, "lousa": lousa,
    "lousa_cardapio": lousa_cardapio, "cama": cama, "prateleira": prateleira, "balcao": balcao, "maquina_cafe": maquina_cafe,
    "xicara": xicara, "mesinha": mesinha, "cadeira_cafe": cadeira_cafe, "banqueta": banqueta, "carteira": carteira, "janela": janela,
    "boneco": boneco, "boneco_magro": boneco_magro, "boneco_gordo": boneco_gordo, "boneco_crianca": boneco_crianca, "gato": gato, "coruja": coruja, "claude_rosto": claude_rosto, "robo": robo, "parapeito": parapeito, "caixa_dagua": caixa_dagua, "antena": antena,
    "vaso_planta": vaso_planta, "ar_condicionado": ar_condicionado, "banco": banco,
    "arvore_cone": lambda: _arvore_cone("arvore_cone", 3.4, 11), "arvore_cone_baixa": lambda: _arvore_cone("arvore_cone_baixa", 2.6, 12),
    "arvore_redonda": lambda: _arvore_redonda("arvore_redonda", 13), "arvore_redonda_b": lambda: _arvore_redonda("arvore_redonda_b", 14),
    "arbusto": lambda: _arbusto("arbusto", 15), "arbusto_b": lambda: _arbusto("arbusto_b", 16),
    "pedra": lambda: _pedra("pedra", 17), "pedra_b": lambda: _pedra("pedra_b", 18),
    "nuvem": lambda: _nuvem("nuvem", 19), "nuvem_b": lambda: _nuvem("nuvem_b", 20),
}


def medir(root):
    """Caixa da peça em metros (largura x, profundidade y, altura z) e o ponto mais baixo."""
    bpy.context.view_layer.update()
    xs, ys, zs = [], [], []
    for o in [root, *root.children_recursive]:
        if o.type != 'MESH':
            continue
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            xs.append(w.x); ys.append(w.y); zs.append(w.z)
    return (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)), min(zs)


def rasos(root, colada=0.03, pintura=0.0, degrau=0.10, area=0.02, parte_da_face=0.8):
    """Degrau raso: uma parte encostada na face de outra (a menos de 3 cm), menor que ela (até 80% da face) que avança de 0,4 a 10 cm sobre ela,
    numa área de mais de 0,02 m² (painel de porta, porta saliente, listra, janelinha, placa colada).
    Por que vira tracejado: o contorno do Curta 3D (fx/ink.ts) desenha um salto de profundidade a partir de 1% da
    distância da câmera e só fica cheio a 3%. De 3 a 8 m, um degrau de 3 a 24 cm cai nessa faixa e sai picotado,
    correndo em movimento (as portas da bancada e as listras do pano, vídeo "Esc duas vezes", 2026-11-24).
    Passa: a pintura (material "tinta_*", que fica sem contorno), o que avança mais de 10 cm, a peça pequena
    (puxador, botão), a camada empilhada do mesmo tamanho (o recheio do bolo) e as faces de texto (_face, _tela).
    Devolve [(parte, base, avanço em mm)]."""
    bpy.context.view_layer.update()
    caixas = []
    for o in root.children_recursive:
        if o.type != 'MESH' or o.name.endswith(("_face", "_tela")):
            continue
        if o.active_material and o.active_material.name.startswith("tinta"):
            continue  # pintura: fica sem contorno no three.js (kit.ts), então não risca
        vs = [o.matrix_world @ v.co for v in o.data.vertices]
        lo = [min(v[i] for v in vs) for i in range(3)]; hi = [max(v[i] for v in vs) for i in range(3)]
        caixas.append((o.name, lo, hi))
    achados = []
    for na, la, ha in caixas:
        # para cada direção, só a superfície mais próxima conta (a boca do fogão fica sobre a chapa, não sobre o corpo
        # que está embaixo dela)
        melhor = {}
        for nb, lb, hb in caixas:
            if nb == na:
                continue
            for eixo in range(3):
                outros = [i for i in range(3) if i != eixo]
                if not all(la[i] >= lb[i] - 0.005 and ha[i] <= hb[i] + 0.005 for i in outros):
                    continue
                for lado in (1, -1):
                    face = hb[eixo] if lado > 0 else lb[eixo]
                    perto = la[eixo] if lado > 0 else ha[eixo]
                    dist = (perto - face) * lado
                    if -0.002 <= dist <= colada and ((eixo, lado) not in melhor or dist < melhor[(eixo, lado)][0]):
                        melhor[(eixo, lado)] = (dist, nb, lb, hb)
        for (eixo, lado), (dist, nb, lb, hb) in melhor.items():
            outros = [i for i in range(3) if i != eixo]
            # camada do mesmo tamanho empilhada (lados rentes, sem degrau na borda)
            if all(abs(la[i] - lb[i]) < 0.02 and abs(ha[i] - hb[i]) < 0.02 for i in outros):
                continue
            ar = (ha[outros[0]] - la[outros[0]]) * (ha[outros[1]] - la[outros[1]])
            if ar < area or ar > parte_da_face * (hb[outros[0]] - lb[outros[0]]) * (hb[outros[1]] - lb[outros[1]]):
                continue  # pequena demais para riscar, ou vizinha do mesmo tamanho (um livro ao lado do outro)
            face = hb[eixo] if lado > 0 else lb[eixo]
            longe = ha[eixo] if lado > 0 else la[eixo]
            avanco = (longe - face) * lado
            if pintura < avanco < degrau:
                achados.append((na, nb, round(avanco * 1000)))
                break
    return achados


def vaos(root, minimo=0.002, maximo=0.04, area=0.02):
    """Vão estreito entre partes vizinhas: duas partes lado a lado (porta com porta, gaveta com gaveta, tábua com
    tábua) com um espaço de 2 mm a 4 cm entre as faces que se olham, numa área de mais de 0,02 m². De frente, o vão
    é uma fenda de 1 a 3 px: o contorno dos dois lados se junta e some de um quadro para o outro, e sai um filete
    tracejado (o vão entre duas portas de armário, vídeo "Esc duas vezes", teste 2). Encoste as partes (vão zero),
    afaste mais de 4 cm, ou faça a frente numa parte só e pinte o vão com um material "tinta_*".
    Devolve [(parte, vizinha, vão em mm)]."""
    bpy.context.view_layer.update()
    caixas = []
    for o in root.children_recursive:
        if o.type != 'MESH' or o.name.endswith(("_face", "_tela")):
            continue
        if o.active_material and o.active_material.name.startswith("tinta"):
            continue
        vs = [o.matrix_world @ v.co for v in o.data.vertices]
        caixas.append((o.name, [min(v[i] for v in vs) for i in range(3)], [max(v[i] for v in vs) for i in range(3)]))
    achados = []
    for ia, (na, la, ha) in enumerate(caixas):
        for nb, lb, hb in caixas[ia + 1:]:
            for eixo in range(3):
                vao = lb[eixo] - ha[eixo] if lb[eixo] >= ha[eixo] else la[eixo] - hb[eixo]
                if not (minimo < vao < maximo):
                    continue
                outros = [i for i in range(3) if i != eixo]
                sobre = [min(ha[i], hb[i]) - max(la[i], lb[i]) for i in outros]
                # a fenda só aparece quando as duas frentes estão alinhadas (porta com porta): numa das outras
                # direções, as duas terminam no mesmo plano, a menos de 5 mm
                alinhadas = any(abs(ha[i] - hb[i]) < 0.005 or abs(la[i] - lb[i]) < 0.005 for i in outros)
                if alinhadas and min(sobre) > 0 and sobre[0] * sobre[1] > area:
                    achados.append((na, nb, round(vao * 1000)))
    return achados


def exportar(nome, saida):
    E.novo()
    random.seed(7)
    root = PECAS[nome]()
    (w, d, h), z0 = medir(root)
    if abs(z0) > 0.002:  # pivô no chão: o ponto mais baixo da peça vai para z = 0
        for c in root.children:
            c.location.z -= z0
        print(f"  {nome}: assentada no chão ({-z0:+.3f} m)")
    for parte, base, mm in rasos(root):
        print(f"RASO {nome}: {parte} avança {mm} mm sobre {base} (degrau de 0,4 a 10 cm vira tracejado no contorno: pinte com um material tinta_*, rente, ou avance mais de 10 cm)")
    for parte, viz, mm in vaos(root):
        print(f"RASO {nome}: vão de {mm} mm entre {parte} e {viz} (fenda de 2 mm a 4 cm vira filete tracejado: encoste, afaste mais de 4 cm, ou faça uma frente só com o vão em tinta_*)")
    os.makedirs(saida, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(saida, nome + ".glb"), export_format='GLB', use_selection=False,
                              export_apply=True, export_yup=True)
    print(f"PECA {nome}: {w:.2f} x {d:.2f} x {h:.2f} m")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    saida = os.path.join(AQUI, "..", "glb")
    if "--saida" in args:
        i = args.index("--saida"); saida = args[i + 1]; del args[i:i + 2]
    nomes = args or list(PECAS)
    for n in nomes:
        if n not in PECAS:
            sys.exit(f"Peça desconhecida: {n}. Peças: {', '.join(PECAS)}")
        exportar(n, os.path.abspath(saida))
