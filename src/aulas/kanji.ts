/**
 * Kanji de ouvido: o professor diz o sentido, você ouve a leitura do kanji sozinho e,
 * depois, uma palavra do dia a dia que usa esse kanji (um dos exemplos da lição).
 */
export interface KanjiFalado {
  /** O sentido, dito antes da leitura do kanji sozinho. */
  sentido: string;
  /**
   * Qual exemplo da lição vira a palavra falada, com o que o professor diz antes dela.
   * Sem exemplo quando a palavra é o próprio kanji sozinho (目 se lê め dos dois jeitos).
   */
  exemplo?: { indice: number; pt: string };
}

export const KANJI_FALADO: Readonly<Record<string, KanjiFalado>> = {
  一: { sentido: 'Um.', exemplo: { indice: 1, pt: 'Um dia, de duração.' } },
  二: { sentido: 'Dois.', exemplo: { indice: 1, pt: 'Fevereiro, o mês dois.' } },
  三: { sentido: 'Três.', exemplo: { indice: 1, pt: 'Março.' } },
  四: { sentido: 'Quatro.', exemplo: { indice: 1, pt: 'Abril. Repare que aqui o quatro muda de som.' } },
  五: { sentido: 'Cinco.', exemplo: { indice: 1, pt: 'Maio.' } },
  六: { sentido: 'Seis.', exemplo: { indice: 1, pt: 'Junho.' } },
  七: { sentido: 'Sete.', exemplo: { indice: 1, pt: 'Julho. No mês, o sete muda de som.' } },
  八: { sentido: 'Oito.', exemplo: { indice: 1, pt: 'Agosto.' } },
  九: { sentido: 'Nove.', exemplo: { indice: 1, pt: 'Setembro. Outro som do nove.' } },
  十: { sentido: 'Dez.', exemplo: { indice: 1, pt: 'Outubro.' } },
  百: { sentido: 'Cem.', exemplo: { indice: 0, pt: 'Cem ienes.' } },
  千: { sentido: 'Mil.', exemplo: { indice: 0, pt: 'Mil ienes.' } },
  万: { sentido: 'Dez mil.', exemplo: { indice: 0, pt: 'Dez mil ienes.' } },
  円: { sentido: 'Iene. O desenho dele também quer dizer círculo.', exemplo: { indice: 0, pt: 'Cem ienes.' } },
  日: { sentido: 'Dia, e também sol.', exemplo: { indice: 2, pt: 'Japão. O nome quer dizer a origem do sol.' } },
  月: { sentido: 'Lua, e também mês.', exemplo: { indice: 0, pt: 'Segunda-feira, o dia da lua.' } },
  火: { sentido: 'Fogo.', exemplo: { indice: 0, pt: 'Terça-feira, o dia do fogo.' } },
  水: { sentido: 'Água.', exemplo: { indice: 1, pt: 'Quarta-feira, o dia da água.' } },
  木: { sentido: 'Árvore, madeira.', exemplo: { indice: 1, pt: 'Quinta-feira, o dia da árvore.' } },
  金: { sentido: 'Ouro, e também dinheiro.', exemplo: { indice: 1, pt: 'Sexta-feira, o dia do ouro.' } },
  土: { sentido: 'Terra, chão.', exemplo: { indice: 0, pt: 'Sábado, o dia da terra.' } },
  年: { sentido: 'Ano.', exemplo: { indice: 0, pt: 'Ano que vem.' } },
  時: { sentido: 'Hora.', exemplo: { indice: 0, pt: 'Três horas.' } },
  分: { sentido: 'Minuto. Também quer dizer parte, e aparece no verbo entender.', exemplo: { indice: 0, pt: 'Cinco minutos.' } },
  半: { sentido: 'Metade.', exemplo: { indice: 0, pt: 'Três e meia.' } },
  人: { sentido: 'Pessoa.', exemplo: { indice: 1, pt: 'Japonês, a pessoa.' } },
  大: { sentido: 'Grande.', exemplo: { indice: 1, pt: 'Universidade.' } },
  小: { sentido: 'Pequeno.', exemplo: { indice: 0, pt: 'O adjetivo pequeno.' } },
  上: { sentido: 'Em cima.' },
  下: { sentido: 'Embaixo.', exemplo: { indice: 1, pt: 'Metrô. O trem que anda embaixo da terra.' } },
  中: { sentido: 'Dentro, o meio.', exemplo: { indice: 1, pt: 'China, o país do meio.' } },
  口: { sentido: 'Boca, e também abertura.', exemplo: { indice: 1, pt: 'Entrada.' } },
  目: { sentido: 'Olho.' },
  手: { sentido: 'Mão.' },
  学: { sentido: 'Estudo.', exemplo: { indice: 1, pt: 'Escola.' } },
  生: { sentido: 'Vida, nascer.', exemplo: { indice: 0, pt: 'Professor. Quem nasceu antes.' } },
  先: { sentido: 'Antes, à frente.', exemplo: { indice: 0, pt: 'Semana passada.' } },
  会: { sentido: 'Encontrar, reunião.', exemplo: { indice: 0, pt: 'Empresa.' } },
  社: { sentido: 'Empresa, e também santuário.', exemplo: { indice: 1, pt: 'Santuário xintoísta.' } },
  行: { sentido: 'Ir.', exemplo: { indice: 1, pt: 'Banco.' } },
  来: { sentido: 'Vir.', exemplo: { indice: 1, pt: 'Semana que vem.' } },
  食: { sentido: 'Comer.', exemplo: { indice: 1, pt: 'Refeição.' } },
  飲: { sentido: 'Beber.', exemplo: { indice: 1, pt: 'Bebida.' } },
  見: { sentido: 'Ver.', exemplo: { indice: 0, pt: 'O verbo ver, do jeito educado.' } },
  休: { sentido: 'Descansar.', exemplo: { indice: 1, pt: 'Intervalo.' } },
  名: { sentido: 'Nome.', exemplo: { indice: 1, pt: 'Cartão de visita.' } },
  前: { sentido: 'Frente, antes.', exemplo: { indice: 1, pt: 'Antes do meio-dia.' } },
  後: { sentido: 'Depois, atrás.', exemplo: { indice: 0, pt: 'Depois do meio-dia.' } },
  午: { sentido: 'Meio-dia.', exemplo: { indice: 0, pt: 'Antes do meio-dia.' } },
  何: { sentido: 'O quê.', exemplo: { indice: 1, pt: 'Que horas.' } },
  今: { sentido: 'Agora.', exemplo: { indice: 1, pt: 'Esta semana.' } },
  電: { sentido: 'Eletricidade.', exemplo: { indice: 0, pt: 'Trem. O carro elétrico.' } },
  車: { sentido: 'Carro, veículo.' },
  駅: { sentido: 'Estação.' },
  男: { sentido: 'Homem.', exemplo: { indice: 0, pt: 'Homem, do jeito educado de dizer.' } },
  女: { sentido: 'Mulher.', exemplo: { indice: 0, pt: 'Mulher, do jeito educado de dizer.' } },
  子: { sentido: 'Criança.', exemplo: { indice: 0, pt: 'Criança, a palavra do dia a dia.' } },
  本: { sentido: 'Livro, e também origem.', exemplo: { indice: 1, pt: 'Japão.' } },
  入: { sentido: 'Entrar.', exemplo: { indice: 0, pt: 'Entrada.' } },
  出: { sentido: 'Sair.', exemplo: { indice: 0, pt: 'Saída.' } },
};
