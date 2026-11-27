# Voz de IA (ElevenLabs)

Para quem quer um estilo sem rosto (Motion, Tela do Claude, Colagem, Série Animada, Curta 3D, Conversa) sem gravar a própria voz. A outra opção é o áudio dela, gravado no celular: ver "A voz nos estilos sem rosto" no [EDITAR.md](../EDITAR.md). A voz de IA é opcional e usa a conta da própria pessoa na ElevenLabs, que cobra por caractere. Siga com ela, um passo por vez.

## Antes de começar, diga à pessoa

- **O plano gratuito é limitado:** só as vozes que já vêm na conta e poucos créditos.
- **As melhores vozes, as brasileiras, só no plano pago.**
- Cada vídeo de uns 60 s gasta perto de mil caracteres, e gerar de novo também gasta: corrija a pronúncia antes de gerar o vídeo inteiro.

Não detalhe planos, preços nem regras de uso: a escolha do plano é da pessoa.

## 1. Criar a conta

Em elevenlabs.io, "Sign up".

## 2. Criar a chave

1. No canto de baixo, à esquerda, clique no nome da conta e em **"API Keys"** (ou vá direto em elevenlabs.io/app/settings/api-keys).
2. **"Create API Key"**, com um nome como "editor de vídeo".
3. Deixe a chave restrita e libere só o necessário: **Text to Speech** em "Access" e **Voices** em "Read". O resto, sem acesso.
4. Copie a chave. Ela só aparece uma vez.

Crie (ou abra) o arquivo `.env` na pasta do editor (a que tem `brutos/` e `meu-estilo/`, não dentro da ferramenta) e ponha a chave numa linha:

```
ELEVENLABS_API_KEY=a-chave-que-a-pessoa-copiou
```

O `.env` fica só no computador: ele não vai para o Git (se a pasta estiver num repositório, o `comecar` já pôs o `.env` no `.gitignore`; confira se ele está lá antes de gravar a chave). A chave não vai em nenhum outro arquivo.

## 3. Escolher a voz

A pessoa pode escolher qualquer voz que goste. A recomendação é uma brasileira:

1. No site, **"Voices"**. As que já vêm na conta estão em **"My Voices"** e servem no plano grátis.
2. Para ver mais, **"Voice Library"** (ou "Explore"). Para uma brasileira, filtre por idioma **Portuguese** e sotaque **Brazilian**. Ouça as amostras: para vídeo de dica, uma voz jovem, natural e do dia a dia costuma funcionar melhor que voz de locutor.
3. Na voz escolhida da biblioteca, **"Add to my voices"** (o "+").
4. Em **"My Voices"**, no menu da voz (os três pontinhos), **"Copy voice ID"**.

Ponha o código no `meu-estilo/marca.json`:

```json
{ "voz": { "id": "o-codigo-copiado", "modelo": "eleven_v4", "velocidade": 0.95 } }
```

Quem já tem personagens (Série Animada, Estilo Conversa) pode usar só `"vozes": {"narrador": {"id": "...", "velocidade": 1.1}}`: o texto sem marcação usa a voz do narrador.

Em dúvida entre duas ou três vozes, gere com cada uma a mesma frase curta (`voz frase.txt --voz CODIGO --saida PASTA`) e mande a pessoa ouvir. Gasta poucos caracteres.

## 4. Gerar e ouvir

Escreva o texto do vídeo **como ele vai aparecer na tela** em `.projetos/NOME/texto.txt` e rode:

```
python .ferramenta/sistema/editar.py voz .projetos/NOME/texto.txt --saida .projetos/NOME/corte
```

Saem `voz.wav`, `palavras.json` (o tempo de cada palavra, sem transcrição) e `base.mp4` (vídeo preto com a voz), prontos para o `montar`.

- **Velocidade:** a voz de IA costuma soar rápida. `0.95` deixa 5% mais devagar sem mudar o tom; ajuste se a pessoa achar rápido ou lento.
- **Pronúncia:** nome de ferramenta e palavra em inglês às vezes saem errados (com voz estrangeira, acontece mais) ("IA" vira "ia", "QR code" sai em inglês). Anote em `meu-estilo/pronuncia.md` a grafia que soa certa (vale para todos os vídeos), ou num `pronuncia.md` ao lado do texto, em `.projetos/NOME/` (vale só para aquele vídeo, e vem antes), e o texto da tela continua como está:

```
| Na tela | Para a voz |
|---|---|
| IA | i-á |
| QR code | quê erre côudi |
```

- **"IA" depende da palavra de antes.** Com a voz Will, a escolha foi feita de ouvido em 2026-11-22, depois de 11 grafias testadas:
  - depois do artigo "a", a voz gruda as vogais e sai "aia"; o que soa melhor é "A iá";
  - depois de "com", fica "com i á";
  - depois de "uma", fica "uma I.A.".

  Anote a expressão inteira no `pronuncia.md` (`| A IA | A iá |`), e não só a palavra. Com outra voz, teste antes uma frase curta com cada grafia e peça à pessoa para ouvir: a transcrição corrige o que ouve e não pega a emenda.

- **A pronúncia é conferida sozinha, pelos sons.** A mesma grafia sai diferente a cada geração: "Claude Code" já saiu "Clóud Cádi", que soa "Claude, Claude". A transcrição não pega esse erro, porque "corrige" para a palavra que conhece. Por isso o `voz` passa o áudio por um reconhecedor de fonemas, que escreve os sons ouvidos. Ele roda no computador, é gratuito e baixa uns 1,2 GB na primeira vez.
  - Cada palavra difícil tem um padrão de sons. "Claude Code" já vem conferido.
  - Quando uma palavra sai errada, o `voz` gera de novo só a frase inteira em que ela está e põe no lugar da antiga, no silêncio entre as frases, com a mesma pausa. Faz isso até 4 vezes.
  - Nos textos com personagens, gera de novo a fala inteira.
  - A pessoa não precisa ouvir nem escolher versão. Não gere três versões para ela escolher.
  - Para conferir outra palavra difícil, ponha na terceira coluna do `pronuncia.md` os sons que separam o certo do errado. É uma expressão regular sobre os fonemas separados por espaço e não pode ter `|`:

```
| Na tela | Para a voz | Sons |
|---|---|---|
| Claude Code | Clóud Côudi | k l .*k o |
```

  Para achar o padrão, gere duas ou três vezes uma frase curta com a palavra. Rode `python -c "from motor import fonemas; print(fonemas.sons('voz.wav', INICIO, FIM))"` de dentro de `.ferramenta/sistema/` em cada uma, use o tempo da palavra no `palavras.json` e compare os sons da versão certa com os da errada. A primeira vez, aqui, é a única em que a pessoa ouve: ela diz qual versão está certa. Se o reconhecedor não carregar (sem internet na primeira vez), o `voz` avisa e segue sem conferir. Nesse caso, peça à pessoa para ouvir as palavras difíceis.

- **Trocar uma palavra ou o final** depois de aprovado: gere de novo a fala inteira em que ela está, com a pontuação natural, e deixe as outras falas como estão. O produto já guarda cada fala separada, então isso não refaz o resto.
- **Sem remendo na voz.** Quem ouve percebe, e cada remendo vira mais uma versão e mais crédito gasto. Nunca:
  - corte uma fala no meio;
  - junte duas falas tirando a pontuação para forçar a emenda;
  - ponha vírgula escondida para separar uma sílaba;
  - acelere ou estique o áudio para caber na tela.

  A tela se ajusta ao tempo da fala, e não o contrário. Palavra difícil se resolve antes, com o teste curto de grafia descrito acima. Se nenhuma grafia funcionar, reescreva a frase.
- **Com voz de IA, os efeitos descem:** a voz vem mais baixa que uma gravação. Comece com `"efeitos": {"ganho": -6}` no `roteiro.json`.

## Se der erro

- **"Falta ELEVENLABS_API_KEY"**: o `.env` não está na pasta do editor ou a linha está escrita diferente.
- **401 ou "invalid api key"**: a chave foi copiada pela metade, ou foi apagada no site. Crie outra.
- **"missing permissions"**: faltou liberar Text to Speech ou Voices na chave.
- **Voz não encontrada ou "not available for free users"**: a voz é da biblioteca e a conta está no plano grátis, ou a voz não foi adicionada em "My Voices".
- **"quota exceeded"**: os créditos do mês acabaram.
