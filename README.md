# Editor de vídeo com IA

Edita os seus vídeos curtos (Reels, TikTok, Shorts) com a ajuda da IA: escreve o roteiro, escolhe as melhores tentativas da gravação, tira as pausas, põe texto, animação e efeito sonoro no estilo que você escolher e entrega o vídeo pronto para postar. A cada correção sua, ele aprende o seu gosto. Roda no seu computador.

## Os estilos

Dez estilos prontos, cada um já com as fontes, as cores e o jeito de editar. Para ver cada um em movimento, abra o `skill/catalogo.html` no navegador (a IA abre para você na primeira conversa).

**Você aparece:**

- **Título:** um título no topo para cada ideia e a legenda pequena ao lado do rosto.
- **Títulos Desenhados:** um título desenhado para cada trecho, com logos e setas, acima da sua cabeça.
- **Parede:** palavras gigantes atrás de você, como se estivessem pintadas na parede.
- **Metade:** um painel na metade de cima mostra o que você fala, e a sua cabeça passa por cima dele.

**Só a voz** (a sua, gravada no celular, ou uma voz de IA):

- **Motion:** animação escura, uma cena por frase.
- **Tela do Claude:** o app do Claude copiado tela por tela, para ensinar a usar o Claude.
- **Colagem:** cartões, etiquetas e carimbos sobre fundo claro, para contar um teste com números.
- **Série Animada:** uma história em episódios com bonecos, e o público escolhe o próximo nos comentários.
- **Curta 3D:** um curta animado num mundo 3D de brinquedo, com uma metáfora.
- **Conversa:** dois bonecos 3D conversando (você e o Claude, ou quem você quiser).

## O que mais ele faz

- **Roteiro a partir de uma frase.** Mande "quero um vídeo sobre por que o limite do Claude acaba rápido" e a IA escreve o roteiro inteiro, com o gancho e o pedido final, para você aprovar.
- **Voz de IA ou a sua.** Nos estilos sem rosto, você grava o áudio no celular e manda (com personagens, um áudio só lendo o roteiro na ordem já serve), ou usa uma voz de IA da sua conta na ElevenLabs.
- **Qualquer outro estilo.** Mande o link de um vídeo com a edição que você quer: a IA estuda o vídeo quadro a quadro e monta o estilo para você, igual ou só inspirado nele.
- **Aprende o seu gosto.** Toda correção sua vira regra. O próximo vídeo já sai mais perto do que você quer.

## Como instalar

Você precisa de uma IA de terminal (Claude Code, Codex ou Gemini CLI) e do [Git](https://git-scm.com). O resto (Python, Node.js e ffmpeg) a IA verifica e instala com você.

Abra a IA numa pasta vazia e cole:

```
Clone o repositório https://github.com/VitorioGomes/editor-de-video-ia e siga o roteiro em skill/EDITAR.md.
```

Ela instala, abre o catálogo, pergunta qual estilo você quer e se você tem um vídeo, um áudio ou só a ideia, e edita o primeiro vídeo com você. Sem questionário.

**Você só precisa olhar uma pasta, a `editor/`:** em `brutos/` você põe o que gravou, em `versoes/` aparecem os vídeos para assistir e em `editados/` ficam os aprovados, prontos para postar.

## O que saber antes

- **Placa de vídeo:** os estilos com rosto e os de animação rodam sem ela; com uma placa NVIDIA, a transcrição fica mais rápida. **Nos estilos 3D (Curta 3D e Conversa), a placa é recomendada:** sem ela, um vídeo leva horas para renderizar.
- **Blender:** só para criar uma peça nova nos estilos 3D (um bicho, uma máquina, um personagem que o kit não tem). As peças do kit já vêm prontas. É gratuito, e a IA instala quando precisar.
- Recortar você do fundo (Parede e Metade) é o passo mais demorado: uns 15 a 20 minutos para um vídeo de 80 segundos. Enquanto isso, a IA já vai criando as animações.
- Na primeira transcrição, os modelos de voz baixam sozinhos (uns 6 GB no total). Depois disso, tudo roda sem internet.
- Os seus vídeos não saem do seu computador.
- A voz de IA é opcional e usa a sua conta da ElevenLabs, com o passo a passo incluído. O plano gratuito é limitado às vozes que eles dão e a poucos créditos; as melhores vozes, as brasileiras, só no plano pago.

## Licença

O código é MIT: veja [LICENSE](LICENSE). As fontes (Instrument Serif, Inter, Mali, Caveat, JetBrains Mono, League Gothic e Poppins) são distribuídas sob a SIL Open Font License 1.1, com as licenças em `sistema/fontes/`. Os efeitos sonoros são do SFX Kit da Wyzowl, em domínio público (CC0). Os logos do Claude, do VS Code e do Chrome em `skill/referencias/animacoes/td-icone-*.svg` são os desenhos do theSVG, em domínio público (CC0); as marcas continuam sendo das empresas.
