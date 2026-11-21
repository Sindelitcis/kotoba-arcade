# IA do PC no site publicado

A Conversa por voz pode usar a IA da própria máquina mesmo jogando em https://kotoba-arcade.pages.dev, sem `localhost`. No PC fica a voz do AivisSpeech para cada personagem, o furigana pelo MeCab e nenhuma cota diária. A nuvem continua de reserva.

## Qual IA usar

Nas telas da Conversa tem uma linha "IA: Automático · Nuvem · Meu PC", e ao lado aparece onde ela está rodando agora ("rodando na nuvem" ou "rodando no seu PC (gemma4:12b)"). A escolha fica guardada no navegador.

| Escolha | O que faz |
| --- | --- |
| Automático (padrão) | Pergunta ao PC (`/saude`, até 1,5 s). Respondeu e a placa está livre: usa o PC. Senão, a nuvem. Se a placa estiver ocupada, avisa quem está usando. Se o navegador ainda não deu licença para o site falar com o PC, nem pergunta, para ninguém levar um pedido de licença de surpresa. |
| Nuvem | Só a nuvem, nem olha o PC. |
| Meu PC | Só o PC. Desligado, mostra a tela "IA do seu PC" com o botão **Ligar a IA do meu PC**. Placa ocupada, diz quem está usando. |

## Com o PC ligado: modo híbrido

O `gemma4:12b` do PC é menor que o Gemma 4 26B da nuvem. Então, com o PC ligado e a sessão da nuvem aberta (a senha já digitada), cada parte vai para onde é melhor:

| Parte | Onde |
| --- | --- |
| Texto do personagem | Primeiro a nuvem (Gemma 4 26B). Se ela der erro, ficar sem cota (429), sem internet ou passar de 25 s, o `gemma4:12b` do PC responde aquela fala no lugar, sem parar a conversa. Depois de cota acabada ou sessão vencida, as próximas falas vão direto para o PC. |
| Ouvir | Whisper no PC |
| Furigana | MeCab no PC |
| Voz | AivisSpeech no PC, uma voz por personagem |

Na conversa aparece embaixo do nome do personagem qual modelo escreveu a última resposta, por exemplo "Texto: gemma-4-26b-a4b-it (nuvem)" ou "Texto: gemma4:12b (seu PC, porque a cota da nuvem acabou)". No menu, "rodando texto na nuvem (...), ouvido, furigana e voz no seu PC".

Sem sessão na nuvem, tudo fica no PC e o menu oferece "Entrar na nuvem". Sem o PC, tudo na nuvem, como antes.

A regra está em `criarClienteHibrido` (`src/games/conversa/cliente.ts`), com testes em `tests/hibrido.test.ts` e `e2e/hibrido.spec.ts`. A regra de qual IA usar está em `escolherMotor` (`src/games/conversa/cliente.ts`), com testes em `tests/motor.test.ts` e `e2e/motor.spec.ts`.

## Brave e Chrome: o pedido de licença

O site é https e o servidor do PC é `http://127.0.0.1:8791`. O navegador não bloqueia por conteúdo misto (127.0.0.1 conta como seguro), mas as versões novas do Chrome e do Brave têm o **acesso à rede local**: um site da internet só fala com o PC depois que a pessoa deixa.

Testado no Brave (Chromium 158) em kotoba-arcade.pages.dev: o pedido para 127.0.0.1 fica parado até a pessoa responder, e `navigator.permissions.query({ name: 'local-network-access' })` responde `prompt`. Não tem como evitar isso pelo site; é de propósito. Então:

1. Escolha "Meu PC" (ou clique em "Ligar a IA do meu PC").
2. O Brave mostra "kotoba-arcade.pages.dev quer acessar outros apps e serviços neste dispositivo". Clique em **Permitir**.
3. Pronto: daí em diante o Automático também encontra o PC sozinho.

Se clicou em Bloquear sem querer: cadeado ao lado do endereço → Configurações do site → "Acesso à rede local" → Permitir. A tela da Conversa explica isso quando a licença está negada.

O servidor responde ao pedido prévio do navegador com `Access-Control-Allow-Private-Network: true`, que os navegadores mais antigos (antes do pedido de licença) exigiam.

## Quem pode falar com o servidor

O servidor escuta só em `127.0.0.1`. O porteiro (`local/guarda.py`, testes em `local/test_guarda.py`) recusa com 403:

- qualquer origem que não seja `https://kotoba-arcade.pages.dev` ou `http://localhost`/`127.0.0.1`/`[::1]` (com qualquer porta);
- qualquer `Host` que não seja `127.0.0.1`, `localhost` ou `[::1]` na porta certa (contra DNS rebinding).

Para aceitar outro endereço, ponha em `origens` no `config.local.json`.

## Ligar pelo site

O botão "Ligar a IA do meu PC" abre o link `kotoba-local://iniciar`, que roda `node local/iniciar.mjs --site`: o mesmo do `npm run local`, sem o jogo em `localhost`. Para o Windows conhecer esse link, rode uma vez, na pasta do Kotoba Arcade:

```bash
powershell -ExecutionPolicy Bypass -File local\protocolo-instalar.ps1
```

Ele grava só no seu usuário (`HKCU\Software\Classes\kotoba-local`), sem administrador. O que vem depois de `kotoba-local://` é ignorado: o link só liga a IA. O navegador pergunta antes de abrir; marque "sempre permitir" se quiser. Para tirar:

```bash
powershell -ExecutionPolicy Bypass -File local\protocolo-remover.ps1
```

Abre uma janela com o andamento. Quando a IA responde, a Conversa sai da tela de espera sozinha. Clicar duas vezes não sobe tudo de novo.

**Desliga sozinha:** com `--site`, depois de 20 minutos sem conversa (`desligar_ocioso_min` no config), ela tira o modelo da placa, fecha o servidor e o AivisSpeech e solta a trava. Com `npm run local` não desliga.

## Placa de vídeo

O servidor passa pela mesma trava dos outros programas que usam a placa (`scripts/placa.py`, arquivo `D:\KotobaArcade\arte\gpu.lock`), pedindo 11 GB (`placa.vram_gb`, o máximo com o modelo de reserva aberto). Se outro programa estiver com a placa, ele espera e tenta de novo a cada 30 s; enquanto isso o `/saude` responde `placa: { ok: false, motivo }` e o site usa a nuvem com o aviso. O AivisSpeech só abre depois que a trava está presa.

**O modelo do PC é reserva:** o servidor só confere que ele existe no Ollama, sem pôr na placa. Ele sobe quando a nuvem falha e sai sozinho depois de 5 min sem uso (`conversa.keep_alive`). Ao abrir, o servidor lê o arquivo do modelo uma vez para o cache de disco do Windows (RAM, não placa): medido, a primeira resposta da reserva cai de 35 s (arquivo fora do cache) para 5 s.

Medido numa RTX 5060 Ti de 16 GB:

| Situação | Memória dedicada | Memória compartilhada |
| --- | --- | --- |
| Placa parada | 1,5 GB | 0,04 GB |
| Whisper + AivisSpeech, texto na nuvem (o normal no híbrido) | 3,7 GB | 0,14 GB |
| Mais o `gemma4:12b` aberto como reserva | 12,4 GB | 1,35 GB |

Antes do híbrido, com o modelo sempre aberto e depois de uma conversa inteira (ouvir, responder, furigana e voz), as partes eram:

| | Memória dedicada | Memória compartilhada |
| --- | --- | --- |
| Placa parada (antes) | 1,5 GB | 0,04 GB |
| Ollama `gemma4:12b` | 8,7 GB | 1,2 GB |
| Whisper `large-v3-turbo` | 2,3 GB | 0 |
| AivisSpeech | 1,2 GB | 0 |
| **Total** | **13,6 de 16,3 GB** | **1,2 GB** |

Os 1,2 GB "compartilhados" do Ollama não são vazamento: é a tabela de palavras do modelo, que o llama.cpp deixa na RAM fixa de propósito (`CUDA_Host`, 787 + 272 MiB no log). As 49 camadas ficam todas na placa (`offloaded 49/49 layers to GPU`). Medido com `Get-Counter '\GPU Adapter Memory(*)\Shared Usage'` e `nvidia-smi`.

Tempos, pedidos feitos com a origem do site publicado: subir tudo 30 a 48 s; ouvir 0,7 s; responder 2,6 s; furigana 0,2 s; voz 5,7 s (a primeira de cada personagem é a mais lenta).

## Config

O `iniciar.mjs` e o servidor procuram o config nesta ordem: `KOTOBA_CONFIG`, `local/config.local.json`, `D:\KotobaArcade\ia\config.local.json`. Assim a mesma configuração vale para o checkout e para as worktrees.
