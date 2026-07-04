import type { Endereco, TipoEndereco } from './types'
import { uid } from './utils'

/* ------------------------------------------------------------------ *
 * Gerador de endereços em massa.
 *
 * Código canônico: RUA-COLUNA-NÍVEL-POSIÇÃO (ex.: A-01-03-02), idêntico
 * ao consumido pela planta 3D do wms-frontend (lib/warehouse.ts). Assim,
 * o que o admin desenha aqui alimenta a visualização 3D operacional sem
 * código novo.
 * ------------------------------------------------------------------ */

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** Expande "A-D" / "A,B,C" / "A B C" numa lista de letras de rua. */
export function parseRuas(input: string): string[] {
  const txt = input.trim().toUpperCase()
  if (!txt) return []
  // intervalo "A-D"
  const range = txt.match(/^([A-Z])\s*-\s*([A-Z])$/)
  if (range) {
    const [a, b] = [range[1].charCodeAt(0), range[2].charCodeAt(0)]
    const [lo, hi] = a <= b ? [a, b] : [b, a]
    return Array.from({ length: hi - lo + 1 }, (_, i) => String.fromCharCode(lo + i))
  }
  // lista separada por vírgula/espaço
  return [...new Set(txt.split(/[\s,]+/).filter(Boolean))]
}

export interface GeradorParams {
  armazemId: string
  zonaId: string | null
  ruas: readonly string[]
  colunas: number
  niveis: number
  posicoes: number
  tipo: TipoEndereco
  capacidadePeso: number
  capacidadePaletes: number
}

export function montarCodigo(rua: string, col: number, nivel: number, pos: number) {
  return `${rua}-${pad2(col)}-${pad2(nivel)}-${pad2(pos)}`
}

/** Quantos endereços um conjunto de parâmetros gera. */
export function contarEnderecos(p: Pick<GeradorParams, 'ruas' | 'colunas' | 'niveis' | 'posicoes'>) {
  return p.ruas.length * p.colunas * p.niveis * p.posicoes
}

/** Gera todos os endereços para os parâmetros informados. */
export function gerarEnderecos(p: GeradorParams): Endereco[] {
  const out: Endereco[] = []
  for (const rua of p.ruas) {
    for (let col = 1; col <= p.colunas; col++) {
      for (let nivel = 1; nivel <= p.niveis; nivel++) {
        for (let pos = 1; pos <= p.posicoes; pos++) {
          out.push({
            id: uid('end'),
            armazemId: p.armazemId,
            zonaId: p.zonaId,
            codigo: montarCodigo(rua, col, nivel, pos),
            rua,
            coluna: col,
            nivel,
            posicao: pos,
            tipo: p.tipo,
            capacidadePeso: p.capacidadePeso,
            capacidadePaletes: p.capacidadePaletes,
            bloqueado: false,
          })
        }
      }
    }
  }
  return out
}

/** Cria o endereço único PADRAO usado no modo simples (PME). */
export function enderecoPadrao(armazemId: string): Endereco {
  return {
    id: uid('end'),
    armazemId,
    zonaId: null,
    codigo: 'PADRAO',
    rua: 'PADRAO',
    coluna: 1,
    nivel: 1,
    posicao: 1,
    tipo: 'picking',
    capacidadePeso: 0,
    capacidadePaletes: 0,
    bloqueado: false,
  }
}
