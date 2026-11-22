# Contexto do projeto (para quem chega agora, pessoa ou IA)

Este arquivo existe para que qualquer pessoa ou IA consiga continuar o trabalho sem ter acompanhado a
história. Ele guarda só o que vale hoje.

**Como manter:** toda mudança de rumo, regra ou estado importante atualiza este arquivo no mesmo
commit. Atualizar quer dizer também apagar: o que deixou de ser verdade sai, e decisão antiga
substituída não fica registrada aqui (o histórico está no git). O detalhe de cada assunto mora no
`docs/` indicado. Aqui fica só o resumo e o caminho até ele.

## O que é

Kotoba Arcade é um curso de japonês online para quem fala português, pensado para quem tem TDAH.
O dono é o Rafael (GitHub Sindelitcis). Ele lê kana, está começando nos kanji e vai fazer working
holiday no Japão no fim de 2027. O curso é para ele usar todo dia e chegar lá falando. Não é
comercial.

Site: https://kotoba-arcade.pages.dev. O endereço antigo no GitHub Pages só redireciona para lá.

## Direção atual

O projeto está virando um **curso linear, no formato dos cursos de escola**, com a parte de jogo por
cima. A base é o uso real (situações de quem mora e trabalha no Japão) cruzado com o JLPT. O plano
completo está em [docs/curso.md](docs/curso.md) e tem seis fases:

1. currículo do A1;
2. motor do curso;
3. provas e impressos;
4. conteúdo do A1;
5. áudio de kana;
6. A2.

Estado em 22/11/2026: as fases 1 e 2 estão feitas para o A1.

- **Currículo** em `src/content/curso/`: as 20 unidades, os kanji e as leituras, a gramática e as
  notas, conferido por `tests/curso.test.ts`. Faltam conferir as notas culturais contra as fontes
  (até lá elas não aparecem no curso) e cruzar o vocabulário com uma lista de N5.
- **Motor** em `src/curso/`: a tela inicial abre com "Continuar o curso" (Enter), o tocador percorre
  a unidade em partes curtas (palavras, kanji, gramática, diálogo), o progresso fica salvo e cada
  unidade só libera depois da anterior. Por enquanto basta chegar ao fim da unidade; a fase 3 troca
  isso pela prova (`venceu()` em `src/curso/motor.ts`). Detalhes em
  [docs/curso.md](docs/curso.md#o-motor-do-curso).
- A próxima é a fase 3, provas e impressos. Os jogos e a Jornada continuam no fliperama, como
  prática livre.

Regras de ensino que valem em tudo ([docs/ensino.md](docs/ensino.md)):

- **Ensinar antes de cobrar:** apresentar, praticar com apoio e só depois cobrar. Nada é pedido, nem
  como alternativa errada, antes de ter sido apresentado.
- **Explicar o porquê:** regra geral e contexto cultural, sempre corretos e com fonte. Quando a
  leitura de um kanji muda entre palavras, a lição explica a mudança.
- **Calma:** nada rápido ou caótico a ponto de atrapalhar. O feedback com a leitura fica na tela até
  a pessoa seguir (`src/core/calma.ts`), e o efeito sonoro nunca toca por cima de uma voz: a voz
  espera o efeito curto e efeito não toca enquanto alguém fala (`src/core/som/mixer.ts`). Jogo novo
  não passa sozinho depois de uma resposta; `tests/calma.test.ts` barra temporizador novo.
- **Furigana em todo kanji** para quem está começando, só em cima do kanji. A leitura que o
  conteúdo não traz fica em `src/content/data/furigana.json`, feita por `npm run furigana`
  (OpenJTalk, conferido com as vozes). Texto novo com kanji pede rodar de novo; o teste
  `tests/furigana-cobertura.test.tsx` e o e2e falham se faltar leitura. Nos Ajustes dá para
  esconder a leitura do kanji já firme. Detalhes em [docs/furigana.md](docs/furigana.md).
- **Pronúncia:** sempre a mais comum.

## Como está feito

- **Base:** Vite, TypeScript strict, Preact com signals e ts-fsrs para a repetição espaçada. Os
  testes usam Vitest (`tests/`) e Playwright (`e2e/`).
- **Rodar:** `npm run dev`. Antes de publicar, `npm run check` (tipos, unidade, local, build e e2e).
- **Gravar vozes:** `npm run vozes` (japonês) e `npm run vozes-pt` (Voz 1). O segundo precisa de
  `local/config.local.json` com a seção `voz1` (fora do Git; os worktrees em `D:\KotobaArcade\worktrees`
  têm cópias).
- **Publicação:** push na `main` dispara o GitHub Actions (`.github/workflows/publicar.yml`), que
  testa e publica na Cloudflare Pages. A conta é a do persoria, no plano gratuito.
- **Conversa por voz:**
  - Na nuvem, roda em Pages Functions (`functions/`, `nuvem/`) com Workers AI e é protegida por uma
    senha guardada só como segredo da Cloudflare (`SENHA`).
  - Também pode usar a IA do PC do Rafael (Ollama, Whisper, MeCab, AivisSpeech), chamada pelo site.
  - Detalhes em [docs/nuvem.md](docs/nuvem.md) e [docs/ia-do-pc.md](docs/ia-do-pc.md).
- **Imagens:** Anima Turbo v1.1 rodando no PC (`scripts/estudio.py`), com o estilo descrito em
  [docs/imagens.md](docs/imagens.md) e [docs/estilo.md](docs/estilo.md). O visual é pintado, com
  efeitos de borda e de pincel, e lembra um pouco o jogo Metaphor. Nada genérico e nada retrô.
- **Vozes** ([docs/vozes.md](docs/vozes.md)):
  - Português: uma voz só, a "Voz 1", um modelo Fish Speech treinado com a voz de um amigo do Rafael
    (`npm run vozes-pt`).
  - Japonês: AivisSpeech (`npm run vozes`).
  - Toda fala do site é gravada antes. Não existe voz do navegador.
  - Kana isolado soa mal na voz japonesa; isso está no plano (fase 5).
- **Música e efeitos:** com cara de anime, de licença livre ou não comercial, nunca trilha oficial
  ([docs/musica.md](docs/musica.md)).
- **Fora do repositório:** `D:\KotobaArcade` guarda modelos, ambientes Python, gravações brutas e
  worktrees (ver `D:\KotobaArcade\LEIA-ME.txt`). O modelo da voz do amigo fica em
  `D:\Estudio\ia\modelos`.

## Regras de trabalho

- **Commits:** só como Sindelitcis, sem assinatura nem coautoria de IA. Nada de force push.
- **Testes:** todo bug corrigido ganha um teste que reproduz o caso. Nada de "depois a gente arruma".
- **Placa de vídeo (RTX 5060 Ti, 16 GB):** um modelo por vez, sempre pela trava
  `scripts/placa.py`, e nunca deixar a VRAM vazar para a memória compartilhada.
- **Segredos e arquivos protegidos:**
  - A senha da Conversa nunca entra no repositório, no build ou em logs (`tests/senha-fora.test.ts`).
  - `amigo.wav`, `amigo.txt` e os pesos dos modelos nunca entram no repositório. Os áudios gerados
    com a voz do amigo podem ser publicados.
  - `D:\Estudio\audiobooks` é só leitura, e `D:\Estudio\audiobooks\chave_deepseek.txt` não deve ser
    lido nem usado.
- **Cloudflare:** só o plano gratuito, nunca contratar nada. Não mexer nos outros projetos da conta.
- **Textos públicos:** em português simples e humano, sem cara de texto gerado por IA.
- **Pedidos ambíguos:** quando não estiver claro se o pedido é de conteúdo ou de estrutura, mexer só
  no conteúdo.
- **Este arquivo:** manter sempre em dia, como descrito no topo.
