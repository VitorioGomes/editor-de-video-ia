# Estilo Curta 3D: a paleta e as ferramentas de modelagem que todas as peças usam.
# Importado por pecas.py (o kit) e pelos scripts de peça nova de cada projeto:
#   import sys; sys.path.insert(0, "<caminho desta pasta>"); from estilo import *
#
# Regras de toda peça (ver skill/estilos/curta-3d.md, "Peça nova no Blender"):
# - medidas em metros, na escala real (porta 2,1 m, mesa 0,75 m, o Claude ~1 m);
# - pivô no chão: a raiz da peça é um "empty" com o nome dela na origem, e nada fica abaixo de z = 0;
# - a frente da peça olha para -Y no Blender, que vira +Z no three.js;
# - cantos chanfrados (brinquedo de verdade não tem quina viva) e materiais da paleta abaixo, pelo nome;
# - partes que mexem (braço, tampa, roda) ficam num "empty" de junta com nome próprio, no ponto de giro;
# - tela, placa e papel com texto: uma malha com nome terminado em "_tela" ou "_face" (o three.js escreve nela).
import bpy, math, random
from mathutils import Vector

MATS = {}


def _lin(hexcol):
    h = hexcol.lstrip("#")
    s = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s]


def mat(name, hexcol, rough=0.55, metal=0.0, emit=None, emit_k=0.0, alpha=1.0, coat=0.0, coat_rough=0.12, sheen=0.0):
    """Material pelo nome: o mesmo nome devolve o mesmo material (o three.js troca a cor pelo nome).
    `coat`: verniz por cima (plástico de brinquedo: base fosca e um brilho fino em cima). `sheen`: brilho aveludado
    de borda (o Claude e as pessoas, no lugar do subsurface que o three.js não tem). Os dois vão no GLB."""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*_lin(hexcol), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*_lin(emit), 1)
        b.inputs["Emission Strength"].default_value = emit_k
    if coat > 0:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = coat_rough
    if sheen > 0:
        b.inputs["Sheen Weight"].default_value = sheen
        b.inputs["Sheen Roughness"].default_value = 0.6
        b.inputs["Sheen Tint"].default_value = (sheen, sheen * 0.95, sheen * 0.9, 1)  # o GLB leva a força na cor do sheen
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            m.blend_method = 'BLEND'
    MATS[name] = m
    return m


def novo():
    """Cena vazia (cada peça é modelada e exportada sozinha)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    paleta()


def active(o):
    for x in bpy.context.selected_objects:
        x.select_set(False)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)


def finish(o, m, bevel=0.0, seg=4, smooth_angle=40, parent=None, name=None):
    active(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)  # chanfro em metros, depois da escala
    if bevel > 0:
        md = o.modifiers.new("bev", 'BEVEL')
        md.width = bevel; md.segments = seg; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(30)
        md.miter_outer = 'MITER_ARC'
        bpy.ops.object.modifier_apply(modifier=md.name)
    if smooth_angle is None:
        bpy.ops.object.shade_flat()
    else:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth_angle))
    o.data.materials.clear(); o.data.materials.append(m)
    if parent:
        o.parent = parent
    if name:
        o.name = name
    return o


def box(size, loc, m, bevel=0.04, seg=4, parent=None, name=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    return finish(o, m, min(bevel, min(size) * 0.49), seg, parent=parent, name=name)


def cyl(r, depth, loc, m, rot=(0, 0, 0), verts=32, bevel=0.02, parent=None, name=None, r2=None, seg=3):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object
    return finish(o, m, bevel, seg, parent=parent, name=name)


def sphere(r, loc, m, scale=(1, 1, 1), sub=3, parent=None, name=None, smooth=True, jitter=0.0):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, subdivisions=sub, location=loc)
    o = bpy.context.active_object
    if jitter:
        for v in o.data.vertices:
            v.co += Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1))) * jitter * r
    o.scale = scale
    return finish(o, m, 0, smooth_angle=(180 if smooth else None), parent=parent, name=name)


def torus(R, r, loc, m, rot=(0, 0, 0), parent=None, name=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=40, minor_segments=14)
    o = bpy.context.active_object
    return finish(o, m, 0, smooth_angle=180, parent=parent, name=name)


def tube(pts, r, m, parent=None, name=None, caps=True):
    """Tubo redondo por uma lista de pontos (x, y, z): gancho do "?", alça, haste do cadeado."""
    cu = bpy.data.curves.new("tubo", 'CURVE')
    cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = caps
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (*q, 1)
    o = bpy.data.objects.new("tubo", cu); bpy.context.scene.collection.objects.link(o)
    active(o); bpy.ops.object.convert(target='MESH')
    o = bpy.context.active_object
    return finish(o, m, 0, smooth_angle=60, parent=parent, name=name)


def arc(cx, cz, R, a0, a1, n=24, y=0.0):
    """Pontos de um arco no plano XZ (graus)."""
    return [(cx + R * math.cos(math.radians(a0 + (a1 - a0) * i / n)), y, cz + R * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def dome(r, loc, m, scale=(1, 1, 1), parent=None, name=None):
    """Meia esfera (a metade de cima), base plana em loc: capacete, cúpula, tampa redonda."""
    import bmesh
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(0, 0, 0), segments=40, ring_count=20)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
    if edges:
        bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    bm.to_mesh(o.data); bm.free()
    o.location = loc
    o.scale = scale
    return finish(o, m, 0, smooth_angle=60, parent=parent, name=name)


def prism(xz, y0, y1, m):
    """Prisma triangular ao longo de Y a partir de um contorno (x, z) de 3 pontos (telhado)."""
    me = bpy.data.meshes.new("prism")
    v = [(x, y0, z) for x, z in xz] + [(x, y1, z) for x, z in xz]
    f = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("prism", me); bpy.context.scene.collection.objects.link(o)
    return o


def extrude(xz, y0, y1, m, bevel=0.03, parent=None, name=None):
    """Contorno qualquer (x, z) no sentido anti-horário, extrudado de y0 a y1 (seta, placa recortada)."""
    n = len(xz)
    me = bpy.data.meshes.new("ext")
    v = [(x, y0, z) for x, z in xz] + [(x, y1, z) for x, z in xz]
    f = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        f.append((i, j, n + j, n + i))
    me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new("ext", me); bpy.context.scene.collection.objects.link(o)
    return finish(o, m, bevel, 3, smooth_angle=30, parent=parent, name=name)


def empty(name, loc=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
    return o


def pivot(name, loc, parent):
    """Junta: um empty no ponto de giro. As partes são modeladas no lugar e depois "adotadas" (adopt)."""
    return empty(name, loc, parent)


def adopt(child, piv):
    child.parent = piv
    child.matrix_parent_inverse = piv.matrix_world.inverted()
    bpy.context.view_layer.update()


def screen(size, loc, m, parent, name, rot=(0, 0, 0)):
    """Tela ou face de texto: placa fina; a frente (onde o three.js escreve) olha para -Y."""
    return box(size, loc, m, bevel=min(0.01, size[1] * 0.4), seg=2, parent=parent, name=name, rot=rot)


# ---------------- a paleta ----------------
# Cores de brinquedo, um pouco abaixo do saturado: o grade do three.js sobe a cor dos meios.
# Branco, papel e nuvem ficam em #e8e3da ou abaixo, para não estourar. Plástico com verniz (coat); o Claude, a pele
# e a roupa foscos, com sheen; madeira bem fosca.
def paleta():
    g = globals()
    g.update(
        CLAUDE=mat("claude", "#d97757", 0.62, sheen=0.35),
        OLHO=mat("olho", "#141210", 0.3, coat=0.9, coat_rough=0.05),  # o verniz dá o brilho no olho
        ESCURO=mat("escuro", "#2b2e36", 0.6, 0.2),
        AZUL=mat("azul", "#2f5d8a", 0.45, coat=0.5),
        LATAO=mat("latao", "#e3b04b", 0.32, 0.6),
        VERMELHO=mat("vermelho", "#c94a3c", 0.5, coat=0.5),
        CREME=mat("creme", "#e6dccb", 0.6),
        TELHADO=mat("telhado", "#a9523f", 0.62),
        MADEIRA=mat("madeira", "#b9804c", 0.82),
        MADEIRA_ESC=mat("madeira_escura", "#7a5032", 0.85),
        LAMPADA=mat("lampada", "#ffd99a", 0.3, emit="#ffc770", emit_k=6.0),
        JANELA=mat("janela", "#ffe2a8", 0.3, emit="#ffbf66", emit_k=1.6),
        FOLHA1=mat("folha1", "#4f9a55", 0.8),
        FOLHA2=mat("folha2", "#79b85f", 0.8),
        FOLHA3=mat("folha3", "#3f8a63", 0.8),
        TRONCO=mat("tronco", "#7b5536", 0.85),
        PEDRA=mat("pedra", "#a3a59f", 0.85),
        PEDRA_CLARA=mat("pedra_clara", "#d9ccb4", 0.8),
        BALAO=mat("balao", "#e6e0d4", 0.55, coat=0.3),
        LINHA=mat("linha", "#cdbfa6", 0.6),
        AMARELO=mat("amarelo", "#ffc107", 0.5, coat=0.5),
        ACO=mat("aco", "#7d8590", 0.4, 0.7),
        VERDE=mat("verde", "#3f7d5a", 0.55),
        BRANCO=mat("branco", "#e6e2da", 0.5, coat=0.4),
        NUVEM=mat("nuvem", "#e8e3da", 0.9),
        TELA=mat("tela", "#1d2129", 0.35, emit="#2a3140", emit_k=0.6),
        CARCACA=mat("carcaca", "#e2ded6", 0.45, coat=0.4),
        GRAFITE=mat("grafite", "#3a3d45", 0.5),
        PAPEL=mat("papel", "#e8e3da", 0.8),
        PAPELAO=mat("papelao", "#c99a62", 0.8),
        PASTA=mat("pasta", "#f0c25a", 0.7),
        VIDRO=mat("vidro", "#cfe8ff", 0.08, alpha=0.35),
        PAREDE=mat("parede", "#efe1c6", 0.75),
        PAREDE2=mat("parede2", "#9fb7c9", 0.7),
        PELE=mat("pele", "#e8b48f", 0.68, sheen=0.3),
        ROUPA=mat("roupa", "#4f7fd1", 0.75, sheen=0.4),
        CALCA=mat("calca", "#2f3a52", 0.8, sheen=0.4),
        CABELO=mat("cabelo", "#3b2a20", 0.7),
        SAPATO=mat("sapato", "#2a2522", 0.6),
        CAPACETE=mat("capacete", "#f2c230", 0.5, coat=0.6),
        LARANJA=mat("laranja", "#f07a2a", 0.5, coat=0.5),
        LIQUIDO=mat("liquido", "#4eba65", 0.25, emit="#4eba65", emit_k=0.35),
        CORREIA=mat("correia", "#33363d", 0.75),
        OLHO_BRANCO=mat("olho_branco", "#e6e2da", 0.35),
        BOCA=mat("boca", "#3a1418", 0.6),
        LINGUA=mat("lingua", "#c84a5a", 0.5),
        OCULOS=mat("oculos", "#2a2a2e", 0.35, 0.4, coat=0.4),
        FONE=mat("fone", "#c8f560", 0.45, coat=0.5),
        SOLA=mat("sola", "#ece8e0", 0.6),
        PAPELAO_ESC=mat("papelao_escuro", "#8a6a44", 0.85),
        ACO_ESCURO=mat("aco_escuro", "#3a3e46", 0.45, 0.6),
        ROBO=mat("robo", "#cfd6de", 0.4, 0.15, coat=0.5),
        ESTOFADO=mat("estofado", "#2e3440", 0.8, sheen=0.4),
        LENCOL=mat("lencol", "#e6e1d8", 0.85, sheen=0.4),
        EDREDOM=mat("edredom", "#4f6d9a", 0.85, sheen=0.45),
        LIVRO1=mat("livro1", "#b5483a", 0.6),
        LIVRO2=mat("livro2", "#2f5d8a", 0.6),
        LIVRO3=mat("livro3", "#d9a33a", 0.6),
        LIVRO4=mat("livro4", "#3f7d5a", 0.6),
        CEU_FOTO=mat("ceu_foto", "#8fb6e0", 0.5),
        LOUSA=mat("lousa", "#2c4a3a", 0.9),
        MARMORE=mat("marmore", "#e6e1d8", 0.3, coat=0.6),
        CERAMICA=mat("ceramica", "#f0ece4", 0.3, coat=0.7),
        CAFE=mat("cafe", "#3a2414", 0.25, coat=0.8),
        PELO=mat("pelo", "#e0954f", 0.75, sheen=0.5),
        PELO2=mat("pelo_claro", "#f2e6d4", 0.78, sheen=0.5),
        PELO3=mat("pelo_escuro", "#a9572a", 0.78, sheen=0.4),
        NARIZ=mat("nariz", "#e88a96", 0.5, coat=0.3),
        BIGODE=mat("bigode", "#f4efe6", 0.5),
        OLHO_GATO=mat("olho_gato", "#9fd04a", 0.3, coat=0.9, coat_rough=0.05),
        PENA=mat("pena", "#8a5c3c", 0.78, sheen=0.45),
        PENA2=mat("pena_clara", "#eadcc2", 0.8, sheen=0.4),
        PENA3=mat("pena_escura", "#5c3b28", 0.8, sheen=0.4),
        BICO=mat("bico", "#f0a43a", 0.45, coat=0.5),
        OLHO_CORUJA=mat("olho_coruja", "#ffc21a", 0.3, coat=0.9, coat_rough=0.05),
        ROBO_ESC=mat("robo_escuro", "#4a5563", 0.45, 0.3, coat=0.4),
        ROBO_LUZ=mat("robo_luz", "#7fe8ff", 0.3, emit="#5fdcff", emit_k=3.0),
        CADARCO=mat("cadarco", "#f0ede6", 0.8),
        COSTURA=mat("costura", "#1c1d22", 0.8),
        BONE=mat("bone", "#4a7a3a", 0.7, sheen=0.3),
        ROUPA2=mat("roupa2", "#d8d4cc", 0.6),
        BOCHECHA=mat("bochecha", "#f09090", 0.6),
        CONCRETO=mat("concreto", "#8f8a84", 0.9),
        CAIXA_DAGUA=mat("caixa_dagua", "#5f84a3", 0.5, coat=0.4),
        LUZ_VERMELHA=mat("luz_vermelha", "#ff4030", 0.3, emit="#ff2a1a", emit_k=8.0),
        VASO=mat("vaso", "#a8573c", 0.8),
    )
