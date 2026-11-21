# Kotoba Arcade na Cloudflare

Endereço: **https://kotoba-arcade.pages.dev/**

O site e a Conversa por voz rodam na Cloudflare, no plano gratuito, sem depender do PC.

## O que fica onde

| Serviço | O que faz |
| --- | --- |
| Cloudflare Pages (projeto `kotoba-arcade`) | Serve o `dist/` (site, imagens, músicas, mp3 das vozes). Tudo sai do repositório e do build. Nada vai para o R2. |
| Pages Functions (`functions/api/[[rota]].ts` → `nuvem/app.ts`) | As rotas `/api` da Conversa: senha, sessão e IA. |
| Workers AI | Ouvir (Whisper), conversar (Gemma) e leitura para o furigana (Qwen). |
| Workers KV (`kotoba-tentativas`) | Conta as senhas erradas, para o limite de tentativas. |
| Segredos do Pages | `SENHA` (a senha da Conversa) e `SESSAO_CHAVE` (assina as sessões). |
| GitHub Actions | Testa tudo e publica na Cloudflare com `wrangler pages deploy`. Segredos do repositório: `CLOUDFLARE_API_TOKEN` (só "Cloudflare Pages: Editar"), `CLOUDFLARE_ACCOUNT_ID` e `KOTOBA_SENHA` (para o teste que procura a senha nos arquivos). |
| GitHub Pages | O endereço antigo virou um redirecionamento (`scripts/github-pages/`). Ele lê o progresso salvo no endereço antigo e manda junto, no fim do link (`#migrar=...`), para o site novo importar. O navegador guarda o save por endereço; sem isso, quem jogava lá começaria do zero. |

A conta usada é a do persoria. Ela não tem domínio próprio na Cloudflare, por isso o endereço é `*.pages.dev`. Nada do persoria nem de outros projetos foi alterado.

## Rotas

| Rota | Precisa de sessão | O que faz |
| --- | --- | --- |
| `GET /api/estado` | sim | O que está ligado. Sem sessão, 401 e a tela pede a senha. |
| `POST /api/entrar` | não | `{ senha }`. Certa: cookie de sessão. Errada: 401 e quantas tentativas restam. |
| `POST /api/sair` | não | Apaga o cookie. |
| `POST /api/conversa` | sim | `{ mensagens, esquema }` → `{ texto }` |
| `POST /api/ouvir` | sim | `{ audio (base64), dica }` → `{ texto }` |
| `POST /api/leitura` | sim | `{ texto }` → `{ tokens }` para o furigana |

## Senha e sessão

- A senha só existe como segredo do Pages. Para trocar:
  `wrangler pages secret put SENHA --project-name kotoba-arcade`
  (e atualizar o segredo `KOTOBA_SENHA` do GitHub e o arquivo `D:\KotobaArcade\dados\conversa-senha.txt`, que o teste usa).
- Quem acerta recebe o cookie `kotoba_sessao`: prazo e assinatura HMAC, válido por 30 dias, `HttpOnly`, `Secure`, `SameSite=Strict`, só para `/api`. A página nem enxerga o cookie.
- Trocar `SESSAO_CHAVE` derruba todas as sessões na hora.
- A comparação da senha não dá pista pelo tempo de resposta.
- Limite de tentativas: 5 erros em 15 minutos por endereço; 40 erros numa hora no total, de qualquer lugar, travam todo mundo até a hora passar.
- CORS: só o próprio site. Pedido com `Origin` de outro lugar recebe 403 antes de tudo.
- Erros da IA saem sem detalhes, e nada é registrado em log.
- O teste `tests/senha-fora.test.ts` falha se o texto da senha aparecer em qualquer arquivo versionado ou no `dist`. Ele pega a senha de `KOTOBA_SENHA` (no Actions) ou do arquivo em `D:\KotobaArcade\dados`, então a senha não fica escrita nem no próprio teste.

## Modelos escolhidos

Comparação feita em 20/11/2026 com os prompts de verdade das quatro cenas (mesmo texto que o jogo manda), pedindo a resposta no formato JSON da cena.

**Conversa: `@cf/google/gemma-4-26b-a4b-it`** (reserva: `@cf/mistralai/mistral-small-3.1-24b-instruct`)

| Modelo | Formato certo | Tempo | Neurons por fala | Observação |
| --- | --- | --- | --- | --- |
| Gemma 4 26B (sem "pensar") | 4 de 4 | 2 a 5 s | ~9 | Falas curtas e naturais. Mesma família do `gemma4:12b` do PC. |
| Mistral Small 3.1 24B | 4 de 4 | 4 a 5 s | ~25 | Bom; às vezes passa dos 40 caracteres pedidos. |
| Llama 3.3 70B | 4 de 4 | 4 a 6 s | ~50 | Bom, mas custa 5 vezes mais. |
| Qwen 3.8 27B | 4 de 4 | 4 a 5 s | ~80 | Falas boas, caro para conversa. |
| Llama 4 Scout | 4 de 4 | 10 a 12 s | ~19 | Lento demais para conversa. |
| GPT-OSS 120B | 2 de 4 | 4 a 10 s | ~60 | Gastou o limite pensando e não respondeu. |
| DeepSeek V4.1 Flash | - | - | - | Não está no plano gratuito. |

O Gemma 4 pensa antes de responder se não for avisado; a rota manda `enable_thinking: false`. A personalidade e as regras dos personagens não mudaram: vêm do jogo (`montarPrompt` em `src/games/conversa/engine.ts`), as mesmas que o servidor do PC manda para o Ollama.

**Ouvir: `@cf/openai/whisper-large-v3-turbo`**, o mesmo modelo do PC. Aceita o áudio do microfone (webm/opus) e entendeu "コーヒーをください。" de primeira no teste. As frases que o Whisper inventa no silêncio são tiradas, como no PC.

**Leitura (furigana): `@cf/qwen/qwen3.8-27b`.** O PC usa o MeCab (fugashi), que não roda no Worker. Testei seis frases:

| Modelo | Erros de leitura | Neurons por frase |
| --- | --- | --- |
| Qwen 3.8 27B | nenhum | 35 a 95 |
| Gemma 4 26B | 四百 lido como シヒャク | 4 a 10 |
| Llama 3.3 70B | こんにちは, 東口, を, e frases que não remontam | 17 a 38 |
| Mistral Small 3.1 | trocou kanji por kana, frases que não remontam | 8 a 14 |

Errar a leitura é pior que não mostrar, então o servidor só aceita a resposta se as palavras remontarem a frase exata e cada kanji tiver leitura em kana; se não, a fala aparece sem furigana. Frase sem kanji nem chama o modelo.

Uma alternativa seria o kuromoji no navegador (dicionário de 17 MB, leitura exata e sem gastar cota), mas instalar um pacote novo de terceiros foi barrado nesta mudança. Fica como ideia para depois, se a cota apertar.

**Voz: a do navegador.** O único modelo de voz em japonês do Workers AI, o MeloTTS, foi descontinuado em 20/11/2026 (a chamada devolve "Model has been deprecated"). Os outros (Deepgram Aura) só falam inglês e espanhol. Então:

- falas fixas (abertura de cada cena e tudo que já foi gravado): os mp3 de `public/vozes`, gravados com AivisSpeech/VOICEVOX, como antes;
- falas novas da IA: a voz japonesa do navegador, com a configuração de cada personagem (`VOZ_CONVERSA`).

A voz do AivisSpeech no PC continua bem melhor (tem uma voz por personagem e entonação natural). Quem tem a IA instalada no PC pode usar ela no próprio site publicado: a Conversa tem a escolha "IA: Automático · Nuvem · Meu PC". Veja `docs/ia-do-pc.md`.

## Limites do plano gratuito

| Limite | Valor | Quanto a Conversa gasta |
| --- | --- | --- |
| Workers AI | 10.000 neurons por dia, zera às 00:00 UTC (21h em Brasília) | Por fala sua: ~4 (ouvir) + ~9 (resposta) + ~60 (furigana, se a resposta tiver kanji). Uma conversa de 8 falas fica em torno de 600 neurons: **umas 15 conversas por dia**. |
| Pages Functions | 100.000 pedidos por dia; 10 ms de CPU por pedido | Folgado. A CPU é pouca porque o áudio já chega em base64 e a espera pela IA não conta. |
| Workers KV | 1.000 gravações e 100.000 leituras por dia | Só senha errada grava. |
| Pages | 500 publicações por mês, 20.000 arquivos, 25 MB por arquivo | Uma publicação por push no `main`. O site tem uns 4.900 arquivos. |

Quando a cota diária acaba, o Workers AI responde com erro; a rota devolve 429 `{ erro: 'limite' }` e o jogo mostra: "A IA gratuita da nuvem já usou toda a cota de hoje. Ela volta às 21h (horário de Brasília)." Nada é contratado: sem plano pago, o Workers AI só para até o dia seguinte.

## Publicar à mão

```bash
npx vite build
npx wrangler pages deploy dist --project-name kotoba-arcade --branch main
```

Com `wrangler login` feito na conta do persoria. O normal é deixar o Actions publicar.

## Testar a nuvem no PC

```bash
npx vite build
npx wrangler pages dev dist
```

Os segredos para esse teste ficam num arquivo `.dev.vars` (com `SENHA=...` e `SESSAO_CHAVE=...`), que está no `.gitignore` e nunca vai para o Git.
