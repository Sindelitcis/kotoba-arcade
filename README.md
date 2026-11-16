# Kotoba Arcade

Fliperama de jogos para aprender japonês, feito pensando em quem tem TDAH. A regra da casa é simples: primeiro tem que ser um jogo bom. O estudo acontece por dentro dele.

Jogos que já dá para jogar:

- **KanjiMon**: o [KanjiMon original](https://github.com/Sindelitcis/KanjiMon) refeito aqui dentro. Você caça kanji, quebra os selos respondendo e junta as cartas na KanjiDex.
- **Kana Beat**: ritmo e digitação. Kana e palavras chegam na linha no tempo da batida e você digita a leitura. A música acelera quando você vai bem e desacelera quando não vai.

Na fila: um roguelike de cartas, uma aventura com história e conversa por voz com IA rodando local.

## Como rodar

Precisa de Node 22 ou mais novo.

```bash
npm install
npm run dev
```

Abre em http://localhost:5173. Para gerar a versão final, `npm run build` (sai na pasta `dist`).

## Testes

```bash
npm test          # regras do jogo, memória, save (Vitest)
npm run e2e       # joga de verdade no Chrome (Playwright)
npm run check     # tipos + testes + build + e2e, tudo de uma vez
```

Todo bug corrigido entra com um teste que reproduz o caso.

Cada commit no `main` passa por essa bateria no GitHub Actions e, se tudo passar, o site em https://sindelitcis.github.io/kotoba-arcade/ é atualizado sozinho. Se algum teste falhar, nada é publicado.

## Como o jogo ensina

Essas escolhas vêm do que se sabe sobre TDAH e sobre memória, e do que costuma fazer a gente largar app de estudo.

- **Começar custa uma tecla.** Abriu, apertou Enter, está jogando. Sem login, sem menu.
- **Não existe pilha de revisão.** O agendamento usa FSRS, mas nenhum contador de "atrasadas" aparece. Quem some por uns dias volta e recebe primeiro o que mais vale rever. Coisa nova pausa sozinha enquanto tem muita coisa mole.
- **Faltar um dia não zera nada.** Em vez de sequência que quebra, o fliperama mostra os últimos sete dias.
- **Primeiro contato não tem como errar.** Kanji novo aparece com o significado, uma historinha e a resposta destacada. A cobrança vem minutos depois, quando lembrar já dá trabalho.
- **Cada acerto responde na hora.** Som que sobe com o combo, partículas, selo quebrando. Resposta rápida ganha bônus, resposta lenta não perde nada.
- **A pergunta muda conforme você melhora.** Começa em reconhecer o significado, passa por ler a palavra e chega em digitar a leitura.
- **Tem ponto de parada.** No KanjiMon, a cada cinco capturas vem um baú com o resumo da sessão. No Kana Beat, cada música dura perto de um minuto. Dá para parar ali ou seguir por horas.
- **Ninguém é expulso do jogo.** No Kana Beat a música sempre vai até o fim. Errou muito, a próxima vem mais lenta.
- **O progresso é concreto.** O fliperama mostra quantos kanji e palavras você já reconhece e as frases que já consegue ler.

Kanji nunca vem sozinho: toda carta traz palavras de verdade, com leitura em kana e áudio (voz japonesa do navegador).

## Organização

```
src/core      memória espaçada, seletor de cartas, save, kana, som, efeitos
src/content   kanji, palavras e frases (hoje os 94 kanji do KanjiMon original)
src/hub       o fliperama
src/games     um jogo por pasta; as regras ficam separadas da tela
tests         testes das regras
e2e           testes jogando no navegador
```

As regras de cada jogo ficam em `engine.ts`, sem nada de tela, para dar para testar tudo. Os jogos não conversam entre si. O que eles dividem é a memória do jogador: uma palavra aprendida em um jogo já conta nos outros.

O save fica no navegador. Em Ajustes dá para exportar e importar um arquivo de backup.

## Créditos

As artes das cartas e o conteúdo dos 94 kanji vêm do KanjiMon original, feito com Leonardo Carvalho.
