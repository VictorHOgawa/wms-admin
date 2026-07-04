import type { DefinicaoParametro, EscopoParametro, ValorParametro } from './types'

/* ------------------------------------------------------------------ *
 * Resolução hierárquica de parâmetros.
 *
 * Ao visualizar/editar num escopo:
 *   global → mostra o override global ou o default.
 *   cd/owner → override-no-escopo ?? global ?? default.
 *
 * É isso que faz o mesmo armazém atender clientes 3PL com regras
 * diferentes, sem bifurcar código.
 * ------------------------------------------------------------------ */

export interface Resolucao {
  valor: string
  origem: EscopoParametro | 'default'
}

const mesmaChave = (
  p: ValorParametro,
  chave: string,
  escopo: EscopoParametro,
  escopoId: string | null,
) => p.chave === chave && p.escopo === escopo && (p.escopoId ?? null) === (escopoId ?? null)

/** Override exato num escopo (ou undefined). */
export function findOverride(
  params: ValorParametro[],
  chave: string,
  escopo: EscopoParametro,
  escopoId: string | null,
): ValorParametro | undefined {
  return params.find((p) => mesmaChave(p, chave, escopo, escopoId))
}

/** Valor efetivo + origem, para o escopo em visualização. */
export function resolverPara(
  def: DefinicaoParametro,
  params: ValorParametro[],
  escopo: EscopoParametro,
  escopoId: string | null,
): Resolucao {
  if (escopo === 'global') {
    const g = findOverride(params, def.chave, 'global', null)
    return g ? { valor: g.valor, origem: 'global' } : { valor: def.default, origem: 'default' }
  }
  const local = findOverride(params, def.chave, escopo, escopoId)
  if (local) return { valor: local.valor, origem: escopo }
  const g = findOverride(params, def.chave, 'global', null)
  if (g) return { valor: g.valor, origem: 'global' }
  return { valor: def.default, origem: 'default' }
}

export const asBool = (v: string) => v === 'true'
