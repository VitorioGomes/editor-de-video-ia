# Texturas de material de verdade, assadas no Blender (Cycles) a partir de materiais procedurais:
# cor, aspereza e normal (relevo) de cada material, em ../texturas/NOME_cor.png, _aspero.png e _normal.png.
# O three.js põe essas texturas nas peças pelo nome do material (kit.ts); cada face da peça recebe a imagem
# inteira, então a textura não precisa emendar.
#
# Rodar: blender -b -P texturas.py              (todas)
#        blender -b -P texturas.py -- claude    (só uma)
#
#   claude   metal escovado com um toque de couro: riscos finos na horizontal, manchas largas, grão e
#            arranhões leves; o brilho quebra onde a aspereza muda
#   tecido   moletom de malha: trama fina, fiapos e variação de tom (moletom, calça, boné)
#   pele     pele de brinquedo pintado: poros, manchinhas e um leve rubor
import bpy, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "..", "texturas")
TAM = 1024


def no(nt, tipo, **kw):
    n = nt.nodes.new(tipo)
    for k, v in kw.items():
        if k == "loc":
            n.location = v
        else:
            setattr(n, k, v)
    return n


def material(nome):
    """Devolve (material, nós, ligações, saída de cor, saída de aspereza, saída de altura)."""
    m = bpy.data.materials.new(nome); m.use_nodes = True
    nt = m.node_tree; L = nt.links
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = no(nt, "ShaderNodeOutputMaterial")
    bsdf = no(nt, "ShaderNodeBsdfPrincipled")
    L.new(bsdf.outputs[0], out.inputs[0])
    tc = no(nt, "ShaderNodeTexCoord")
    return m, nt, L, bsdf, tc


def mapear(nt, L, tc, escala):
    mp = no(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = escala
    L.new(tc.outputs["UV"], mp.inputs["Vector"])
    return mp


def ruido(nt, L, vetor, escala, detalhe=6, rugos=0.6):
    n = no(nt, "ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = escala; n.inputs["Detail"].default_value = detalhe; n.inputs["Roughness"].default_value = rugos
    L.new(vetor, n.inputs["Vector"])
    return n


def rampa(nt, L, entrada, a, b, pa=0.0, pb=1.0):
    r = no(nt, "ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = pa; r.color_ramp.elements[0].color = (*a, 1)
    r.color_ramp.elements[1].position = pb; r.color_ramp.elements[1].color = (*b, 1)
    L.new(entrada, r.inputs["Fac"])
    return r


def mix(nt, L, a, b, fator, modo="MULTIPLY"):
    m = no(nt, "ShaderNodeMix"); m.data_type = "RGBA"; m.blend_type = modo
    m.inputs[0].default_value = fator
    L.new(a, m.inputs[6]); L.new(b, m.inputs[7])
    return m.outputs[2]


def claude():
    """Cor quase branca (multiplica a cor da peça no three.js), aspereza e relevo."""
    m, nt, L, bsdf, tc = material("t_claude")
    risco = mapear(nt, L, tc, (1.0, 70.0, 1.0))      # esticado em x: riscos horizontais
    larga = mapear(nt, L, tc, (1.0, 1.0, 1.0))
    r1 = ruido(nt, L, risco.outputs[0], 6.0, 8, 0.7)
    r2 = ruido(nt, L, larga.outputs[0], 3.0, 4, 0.5)
    r3 = ruido(nt, L, larga.outputs[0], 160.0, 2, 0.5)  # grão
    cor1 = rampa(nt, L, r1.outputs["Fac"], (0.86, 0.85, 0.84), (1.0, 1.0, 1.0), 0.35, 0.65)
    cor2 = rampa(nt, L, r2.outputs["Fac"], (0.80, 0.78, 0.77), (1.0, 1.0, 1.0), 0.3, 0.7)
    cor3 = rampa(nt, L, r3.outputs["Fac"], (0.9, 0.9, 0.9), (1.0, 1.0, 1.0), 0.4, 0.6)
    cor = mix(nt, L, mix(nt, L, cor1.outputs[0], cor2.outputs[0], 1.0), cor3.outputs[0], 0.4)
    L.new(cor, bsdf.inputs["Base Color"])
    asp = rampa(nt, L, r1.outputs["Fac"], (0.32, 0.32, 0.32), (0.62, 0.62, 0.62), 0.3, 0.7)
    L.new(asp.outputs[0], bsdf.inputs["Roughness"])
    # o relevo vem só dos riscos escovados (o grão no relevo virava feltro no close)
    bump = no(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.16; bump.inputs["Distance"].default_value = 0.02
    L.new(r1.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs[0], bsdf.inputs["Normal"])
    return m


def tecido():
    m, nt, L, bsdf, tc = material("t_tecido")
    mp = mapear(nt, L, tc, (1.0, 1.0, 1.0))
    w1 = no(nt, "ShaderNodeTexWave"); w1.wave_type = "BANDS"; w1.bands_direction = "X"; w1.inputs["Scale"].default_value = 70.0; w1.inputs["Distortion"].default_value = 1.2
    w2 = no(nt, "ShaderNodeTexWave"); w2.wave_type = "BANDS"; w2.bands_direction = "Y"; w2.inputs["Scale"].default_value = 70.0; w2.inputs["Distortion"].default_value = 1.2
    L.new(mp.outputs[0], w1.inputs["Vector"]); L.new(mp.outputs[0], w2.inputs["Vector"])
    trama = mix(nt, L, w1.outputs["Fac"], w2.outputs["Fac"], 0.5, "MIX")
    r = ruido(nt, L, mp.outputs[0], 5.0, 5, 0.6)
    fiapo = ruido(nt, L, mp.outputs[0], 45.0, 3, 0.6)
    c1 = rampa(nt, L, r.outputs["Fac"], (0.9, 0.9, 0.9), (1.0, 1.0, 1.0), 0.3, 0.7)
    c2 = rampa(nt, L, fiapo.outputs["Fac"], (0.93, 0.93, 0.93), (1.0, 1.0, 1.0), 0.35, 0.65)
    L.new(mix(nt, L, c1.outputs[0], c2.outputs[0], 1.0), bsdf.inputs["Base Color"])
    asp = rampa(nt, L, fiapo.outputs["Fac"], (0.82, 0.82, 0.82), (0.95, 0.95, 0.95))
    L.new(asp.outputs[0], bsdf.inputs["Roughness"])
    bump = no(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.4; bump.inputs["Distance"].default_value = 0.02
    L.new(mix(nt, L, trama, fiapo.outputs["Fac"], 0.3, "ADD"), bump.inputs["Height"]); L.new(bump.outputs[0], bsdf.inputs["Normal"])
    return m


def pele():
    m, nt, L, bsdf, tc = material("t_pele")
    mp = mapear(nt, L, tc, (1.0, 1.0, 1.0))
    poro = ruido(nt, L, mp.outputs[0], 220.0, 2, 0.5)
    mancha = ruido(nt, L, mp.outputs[0], 4.0, 4, 0.5)
    c1 = rampa(nt, L, mancha.outputs["Fac"], (0.93, 0.86, 0.85), (1.0, 1.0, 1.0), 0.35, 0.7)
    c2 = rampa(nt, L, poro.outputs["Fac"], (0.94, 0.93, 0.93), (1.0, 1.0, 1.0), 0.4, 0.6)
    L.new(mix(nt, L, c1.outputs[0], c2.outputs[0], 1.0), bsdf.inputs["Base Color"])
    asp = rampa(nt, L, poro.outputs["Fac"], (0.5, 0.5, 0.5), (0.72, 0.72, 0.72))
    L.new(asp.outputs[0], bsdf.inputs["Roughness"])
    bump = no(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.18; bump.inputs["Distance"].default_value = 0.01
    L.new(poro.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs[0], bsdf.inputs["Normal"])
    return m


def cabelo():
    """Cabelo de brinquedo: mechas largas e suaves numa direção, pouco contraste (não tremula de longe)."""
    m, nt, L, bsdf, tc = material("t_cabelo")
    mp = mapear(nt, L, tc, (1.0, 1.0, 1.0))
    w = no(nt, "ShaderNodeTexWave"); w.wave_type = "BANDS"; w.bands_direction = "X"
    w.inputs["Scale"].default_value = 14.0; w.inputs["Distortion"].default_value = 3.0; w.inputs["Detail"].default_value = 2.0
    L.new(mp.outputs[0], w.inputs["Vector"])
    r = ruido(nt, L, mp.outputs[0], 3.0, 3, 0.5)
    c1 = rampa(nt, L, w.outputs["Fac"], (0.95, 0.95, 0.95), (1.0, 1.0, 1.0), 0.2, 0.8)
    c2 = rampa(nt, L, r.outputs["Fac"], (0.9, 0.9, 0.9), (1.0, 1.0, 1.0), 0.3, 0.7)
    L.new(mix(nt, L, c1.outputs[0], c2.outputs[0], 1.0), bsdf.inputs["Base Color"])
    asp = rampa(nt, L, w.outputs["Fac"], (0.34, 0.34, 0.34), (0.46, 0.46, 0.46))
    L.new(asp.outputs[0], bsdf.inputs["Roughness"])
    # quase liso: o fio só aparece com a luz (com relevo forte, o cabelo parecia plástico canelado)
    bump = no(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.04; bump.inputs["Distance"].default_value = 0.02
    L.new(w.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs[0], bsdf.inputs["Normal"])
    return m


MATS = {"claude": claude, "tecido": tecido, "pele": pele, "cabelo": cabelo}


def assar(nome):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 4
    bpy.ops.mesh.primitive_plane_add(size=1)
    obj = bpy.context.active_object
    m = MATS[nome](); obj.data.materials.append(m)
    nt = m.node_tree
    img_no = no(nt, "ShaderNodeTexImage")
    nt.nodes.active = img_no
    os.makedirs(SAIDA, exist_ok=True)
    for tipo, sufixo, cs in (("DIFFUSE", "cor", "sRGB"), ("ROUGHNESS", "aspero", "Non-Color"), ("NORMAL", "normal", "Non-Color")):
        img = bpy.data.images.new(f"{nome}_{sufixo}", TAM, TAM, alpha=False, float_buffer=False)
        img.colorspace_settings.name = cs
        img_no.image = img
        kw = {"type": tipo}
        if tipo == "DIFFUSE":
            sc.render.bake.use_pass_direct = False; sc.render.bake.use_pass_indirect = False; sc.render.bake.use_pass_color = True
        if tipo == "NORMAL":
            sc.render.bake.normal_space = "TANGENT"
        bpy.ops.object.bake(**kw)
        img.filepath_raw = os.path.join(SAIDA, f"{nome}_{sufixo}.png"); img.file_format = "PNG"; img.save()
        print(f"TEXTURA {nome}_{sufixo}.png")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for n in (args or list(MATS)):
        assar(n)
