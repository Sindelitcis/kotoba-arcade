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

Estado em 23/11/2026: as seis fases estão feitas; o curso tem o A1 (N5) e o A2 (N4), 20 unidades cada.

- **Currículo** em `src/content/curso/`: as unidades, os kanji e as leituras, a gramática e as
  notas (conferidas contra a fonte), checado por `tests/curso.test.ts`. O A1 cobre 655 das 697
  palavras da lista de N5 e todos os kanji do N5; o A2 cobre 637 das 668 palavras da lista de N4,
  todos os kanji e os 76 pontos de gramática dele. Cada unidade tem `numero` (no nível) e `ordem` (no curso); o que depende do que
  já foi ensinado usa `ordem`. Detalhes em [docs/curso.md](docs/curso.md#conteúdo-do-a1) e
  [docs/curso.md](docs/curso.md#conteúdo-do-a2).
- **Motor** em `src/curso/`: a tela inicial abre com "Continuar o curso" (Enter), o tocador percorre
  a unidade em partes curtas (palavras com figura, kanji, aula falada, gramática com exemplo,
  formas, montar frases, completar, ditado, leitura com shadowing, notas, diálogo, mini-teste) e o progresso
  fica salvo. O Módulo 0 (kana e sons, seis lições) fica no alto do mapa e não tranca o A1. Os exemplos só usam o que já foi ensinado
  (`tests/curso-exemplos.test.ts`). Detalhes em [docs/curso.md](docs/curso.md#o-motor-do-curso).
- **Provas e impressos** em `src/curso/prova.ts`, `ProvaTela.tsx` e `Impresso.tsx`: cada unidade
  termina numa prova de 80% que libera a seguinte, com versão para imprimir e gabarito pelo código
  ou pelo QR. A unidade de revisão é o simulado do JLPT (vocabulário, gramática, leitura e escuta),
  que dá o certificado do nível. Também há nivelamento, apostila (com ditado por QR), cartões para
  recortar e folha de escrita dos kanji. Detalhes em [docs/curso.md](docs/curso.md#provas).
- Os jogos e a Jornada continuam no fliperama, como prática livre.
- **Em andamento (relatório do "aluno do zero", 27/11/2026):** feito: legenda que não entrega a
  escuta, Continuar que começa pelo Módulo 0 e pela revisão de hoje (`src/curso/hoje.ts`), prova com
  frases, diálogos só com o que foi ensinado, e tabela de formas no cartão de gramática com o
  exercício de transformar. Falta: gramática intercalada com as palavras; Módulo 0 com
  ゃゅょっ e vogal longa mais cedo e lição 4 menor; "outras leituras" do kanji sem kanji não
  ensinado; prática com distratores mais difíceis e explicação no erro.

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
  - Toda fala em japonês mostra legenda com furigana enquanto toca (`src/core/legenda.ts`); no
    Módulo 0, também o romaji. Kana solto usa a voz das frases, que ganhou a comparação às cegas
    ([docs/curso.md](docs/curso.md#áudio-de-kana-isolado)).
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
