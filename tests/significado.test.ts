import { describe, expect, it } from 'vitest';
import { falasPtDoEnsino, frasePtDoSignificado, significadoFalado } from '../src/content/ensino';

describe('o significado falado da apresentação', () => {
  it('fala o primeiro sentido, sem parênteses, com número por extenso', () => {
    expect(significadoFalado('prateleira')).toBe('prateleira');
    expect(significadoFalado('dia 1º do mês (um dia inteiro é いちにち)')).toBe('dia primeiro do mês');
    expect(significadoFalado('emergência/por acaso')).toBe('emergência ou por acaso');
    expect(significadoFalado('10.000 ienes')).toBe('dez mil ienes');
  });

  it('ordinal vira palavra: as vozes liam "doisª feira" e "umª vez"', () => {
    expect(significadoFalado('2ª feira')).toBe('segunda-feira');
    expect(significadoFalado('3ª feira')).toBe('terça-feira');
    expect(significadoFalado('6ª feira')).toBe('sexta-feira');
    expect(significadoFalado('ouvir pela 1ª vez')).toBe('ouvir pela primeira vez');
    expect(frasePtDoSignificado('5ª feira')).toBe('Quer dizer quinta-feira.');
  });

  it('nenhuma fala do ensino sobra com algarismo ou com º e ª', () => {
    const ruins = falasPtDoEnsino().filter((f) => /[\dºª]/.test(f));
    expect(ruins).toEqual([]);
  });
});
