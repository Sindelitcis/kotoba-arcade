/**
 * Ritmo calmo (docs/ensino.md, "Calma"): o retorno depois de uma resposta, com a leitura e o
 * significado, fica na tela até a pessoa seguir (Enter, espaço ou clique). Nada pula sozinho para
 * a próxima pergunta ou para um aviso enquanto a palavra ainda está sendo falada.
 *
 * `Seguinte` guarda o que vem depois da resposta. O jogo chama `marcar` ao mostrar o retorno e
 * `seguir` quando a pessoa pede. A tecla que acabou de responder não conta como "seguir": o Enter
 * que mandou a resposta digitada chegava também ao ouvinte da janela e pulava o retorno na hora.
 */

/** Tecla apertada logo depois do retorno aparecer não segue (é a mesma que respondeu). */
export const TRAVA_TECLA_MS = 300;

export class Seguinte {
  private acao: (() => void) | null = null;
  private desde = 0;

  /** Mostra o retorno: `acao` roda quando a pessoa seguir. */
  marcar(acao: () => void): void {
    this.acao = acao;
    this.desde = performance.now();
  }

  /** Há um retorno esperando a pessoa. */
  get esperando(): boolean {
    return this.acao !== null;
  }

  /** Clique no botão Seguir. */
  seguir(): boolean {
    const a = this.acao;
    if (!a) return false;
    this.acao = null;
    a();
    return true;
  }

  /** Enter ou espaço: vale depois da trava, e nunca a tecla segurada. */
  seguirPorTecla(e: { repeat?: boolean }): boolean {
    if (!this.acao || e.repeat || performance.now() - this.desde < TRAVA_TECLA_MS) return false;
    return this.seguir();
  }

  limpar(): void {
    this.acao = null;
  }
}
