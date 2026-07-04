import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal, RotateCcw, Globe, Warehouse, Building2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { DEFINICOES_PARAMETROS, armazemName, ownerName } from '../lib/mock'
import { findOverride, resolverPara, asBool, type Resolucao } from '../lib/parametros'
import { Badge, PageHeader } from '../components/ui'
import { Toggle } from '../components/form'
import { cn } from '../lib/utils'
import type { DefinicaoParametro, EscopoParametro, ValorParametro } from '../lib/types'
import { isConnected, wmsApi } from '../lib/wmsApi'

export default function Parametros() {
  const store = useStore()
  const conectado = isConnected()
  const [realParams, setRealParams] = useState<ValorParametro[]>([])
  const [realOwners, setRealOwners] = useState<{ id: string; nome: string; ativo: boolean }[]>([])
  const [realArmId, setRealArmId] = useState('')
  const [realArmNome, setRealArmNome] = useState('')
  const [escopo, setEscopo] = useState<EscopoParametro>('global')
  const [ownerSel, setOwnerSel] = useState('')

  const refetch = async () => {
    const pv = await wmsApi.paramValues()
    setRealParams(pv.map((p) => ({ id: p.id, chave: p.chave, escopo: p.escopo as EscopoParametro, escopoId: p.escopoId, valor: p.valor })))
  }
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [pv, ow, whs] = await Promise.all([wmsApi.paramValues(), wmsApi.owners(), wmsApi.warehouses()])
        if (!vivo) return
        setRealParams(pv.map((p) => ({ id: p.id, chave: p.chave, escopo: p.escopo as EscopoParametro, escopoId: p.escopoId, valor: p.valor })))
        setRealOwners(ow.map((o) => ({ id: o.id, nome: o.nome, ativo: o.ativo })))
        if (whs[0]) { setRealArmId(whs[0].id); setRealArmNome(whs[0].name) }
      } catch {
        /* demo */
      }
    })()
    return () => { vivo = false }
  }, [conectado])

  const parametros = conectado ? realParams : store.parametros
  const ownersList = conectado ? realOwners : store.owners
  const armId = conectado ? realArmId : store.armazemId
  const nomeArm = conectado ? realArmNome || 'Armazém' : armazemName(store.armazemId)
  const nomeOwner = (id: string) => (conectado ? realOwners.find((o) => o.id === id)?.nome ?? id : ownerName(id))

  const ownersAtivos = ownersList.filter((o) => o.ativo)
  useEffect(() => { if (!ownerSel && ownersAtivos[0]) setOwnerSel(ownersAtivos[0].id) }, [ownersAtivos, ownerSel])

  const setParam = async (chave: string, esc: EscopoParametro, escId: string | null, valor: string) => {
    if (conectado) {
      try { await wmsApi.setParamValue({ warehouseId: armId, chave, escopo: esc, escopoId: escId, valor }); await refetch() } catch { /* */ }
    } else store.setParametro(chave, esc, escId, valor)
  }
  const resetParam = async (chave: string, esc: EscopoParametro, escId: string | null) => {
    if (conectado) {
      try { await wmsApi.resetParamValue(chave, esc, escId, armId); await refetch() } catch { /* */ }
    } else store.resetParametro(chave, esc, escId)
  }

  const escopoId = escopo === 'cd' ? armId : escopo === 'owner' ? ownerSel : null
  const grupos = useMemo(() => [...new Set(DEFINICOES_PARAMETROS.map((d) => d.grupo))], [])

  const escopoBtns: { id: EscopoParametro; label: string; icon: typeof Globe }[] = [
    { id: 'global', label: 'Global', icon: Globe },
    { id: 'cd', label: nomeArm, icon: Warehouse },
    { id: 'owner', label: 'Cliente', icon: Building2 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Parâmetros operacionais" subtitle="As chaves que a operação lê · resolução: owner → CD → global → padrão">
        <Badge tone="neutral">{DEFINICOES_PARAMETROS.length} parâmetros</Badge>
        {conectado && <Badge tone="ok" dot>dados reais</Badge>}
      </PageHeader>

      {/* seletor de escopo */}
      <div className="card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 sm:w-32">Editando escopo</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {escopoBtns.map((b) => (
            <button
              key={b.id}
              onClick={() => setEscopo(b.id)}
              className={cn(
                'btn px-3 py-2 gap-2',
                escopo === b.id ? 'bg-primary text-white shadow-md' : 'border border-line bg-surface text-ink-soft hover:bg-slate-50',
              )}
            >
              <b.icon className="h-4 w-4" />
              {b.label}
            </button>
          ))}
          {escopo === 'owner' && (
            <select
              value={ownerSel}
              onChange={(e) => setOwnerSel(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm cursor-pointer"
            >
              {ownersAtivos.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-primary-50 border border-primary-100 p-3 text-xs text-primary flex items-start gap-2">
        <SlidersHorizontal className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          {escopo === 'global'
            ? 'Você edita o valor base que vale para todos os armazéns e clientes, salvo onde houver sobrescrita.'
            : escopo === 'cd'
              ? `Sobrescritas aqui valem só para ${nomeArm}. Onde não houver, herda do Global.`
              : `Sobrescritas aqui valem só para ${nomeOwner(ownerSel)} (em qualquer CD). Onde não houver, herda do Global.`}
        </p>
      </div>

      {grupos.map((g) => (
        <div key={g} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-line bg-surface-sub">
            <p className="text-sm font-semibold text-brand">{g}</p>
          </div>
          <div className="px-5">
            {DEFINICOES_PARAMETROS.filter((d) => d.grupo === g).map((def) => (
              <ParamRow
                key={def.chave}
                def={def}
                res={resolverPara(def, parametros, escopo, escopoId)}
                definidoAqui={!!findOverride(parametros, def.chave, escopo, escopoId)}
                onChange={(v) => setParam(def.chave, escopo, escopoId, v)}
                onReset={() => resetParam(def.chave, escopo, escopoId)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function OrigemBadge({ origem, aqui }: { origem: Resolucao['origem']; aqui: boolean }) {
  if (aqui) return <Badge tone="primary">Definido aqui</Badge>
  if (origem === 'global') return <Badge tone="info">Herdado: Global</Badge>
  return <Badge tone="neutral">Padrão do sistema</Badge>
}

function ParamRow({
  def,
  res,
  definidoAqui,
  onChange,
  onReset,
}: {
  def: DefinicaoParametro
  res: Resolucao
  definidoAqui: boolean
  onChange: (v: string) => void
  onReset: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-line last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-brand">{def.label}</p>
          <OrigemBadge origem={res.origem} aqui={definidoAqui} />
        </div>
        <p className="text-xs text-ink-muted mt-0.5">{def.descricao}</p>
        <div className="mt-1.5 flex flex-col sm:flex-row sm:gap-4 text-[11px] text-ink-muted">
          <span><span className="font-medium text-ink-soft">Simples:</span> {def.modoSimples}</span>
          <span><span className="font-medium text-ink-soft">Completo:</span> {def.modoCompleto}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {definidoAqui && (
          <button onClick={onReset} className="btn-ghost p-2" title="Resetar para herdado">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <ParamControl def={def} valor={res.valor} onChange={onChange} />
      </div>
    </div>
  )
}

function ParamControl({ def, valor, onChange }: { def: DefinicaoParametro; valor: string; onChange: (v: string) => void }) {
  if (def.tipo === 'boolean') {
    return <Toggle on={asBool(valor)} onToggle={() => onChange(asBool(valor) ? 'false' : 'true')} />
  }
  if (def.tipo === 'number') {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded-xl border border-zinc-200 bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {def.unidade && <span className="text-xs text-ink-muted">{def.unidade}</span>}
      </div>
    )
  }
  // enum
  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-zinc-200 bg-surface px-3 py-2 text-sm cursor-pointer focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {def.opcoes?.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
