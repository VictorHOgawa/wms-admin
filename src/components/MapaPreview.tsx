import { useMemo } from 'react'
import type { Endereco, TipoEndereco } from '../lib/types'
import { cn } from '../lib/utils'

/* ------------------------------------------------------------------ *
 * Pré-visualização 2D da planta — visão de elevação por rua.
 * Cada rua é uma linha; cada coluna empilha seus níveis (de baixo p/ cima),
 * colorindo por tipo de endereço. Endereços bloqueados aparecem em vermelho.
 * Usa o mesmo código canônico RUA-CC-NN-PP do wms-frontend (lib/warehouse.ts),
 * então alimenta a Planta 3D operacional sem conversão.
 * ------------------------------------------------------------------ */

const tipoCor: Record<TipoEndereco, string> = {
  picking: 'bg-accent',
  pulmao: 'bg-primary',
  recebimento: 'bg-info',
  expedicao: 'bg-warn',
  avaria: 'bg-bad',
  quarentena: 'bg-slate-400',
}

export function MapaPreview({ enderecos }: { enderecos: Endereco[] }) {
  const estruturados = useMemo(() => enderecos.filter((e) => e.rua !== 'PADRAO'), [enderecos])

  const ruas = useMemo(() => {
    const map = new Map<string, Endereco[]>()
    for (const e of estruturados) {
      if (!map.has(e.rua)) map.set(e.rua, [])
      map.get(e.rua)!.push(e)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [estruturados])

  const padrao = enderecos.some((e) => e.rua === 'PADRAO')

  if (estruturados.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
        {padrao
          ? 'Modo simples: este armazém usa um endereço único PADRÃO (sem planta estruturada).'
          : 'Nenhum endereço estruturado para desenhar a planta. Gere endereços para visualizar.'}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        {(Object.keys(tipoCor) as TipoEndereco[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-sm', tipoCor[t])} />
            {t}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-bad ring-1 ring-bad" />
          bloqueado
        </span>
      </div>

      <div className="space-y-4 overflow-x-auto">
        {ruas.map(([rua, ends]) => {
          const cols = [...new Set(ends.map((e) => e.coluna))].sort((a, b) => a - b)
          const maxNivel = Math.max(...ends.map((e) => e.nivel))
          return (
            <div key={rua} className="flex items-end gap-3">
              <div className="w-8 shrink-0 text-center">
                <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary font-bold mono">
                  {rua}
                </span>
              </div>
              <div className="flex items-end gap-1.5">
                {cols.map((col) => (
                  <div key={col} className="flex flex-col items-center gap-1">
                    <div className="flex flex-col-reverse gap-0.5">
                      {Array.from({ length: maxNivel }, (_, i) => i + 1).map((nivel) => {
                        const cell = ends.filter((e) => e.coluna === col && e.nivel === nivel)
                        if (cell.length === 0) {
                          return <span key={nivel} className="h-3 w-6 rounded-sm bg-slate-100" />
                        }
                        const blocked = cell.some((e) => e.bloqueado)
                        const tipo = cell[0].tipo
                        return (
                          <span
                            key={nivel}
                            title={`${rua}-${String(col).padStart(2, '0')}-${String(nivel).padStart(2, '0')} · ${cell.length} pos${blocked ? ' · bloqueado' : ''}`}
                            className={cn('h-3 w-6 rounded-sm transition-transform hover:scale-110', blocked ? 'bg-bad' : tipoCor[tipo])}
                          />
                        )
                      })}
                    </div>
                    <span className="text-[9px] text-ink-muted mono">{String(col).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
