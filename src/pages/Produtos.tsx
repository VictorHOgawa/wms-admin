import { useEffect, useMemo, useState } from 'react'
import { Search, Package, Plus, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { ORIGEM_LABEL } from '../lib/mock'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, FormSection, SelectField, SettingRow } from '../components/form'
import { cn, maskCest, maskEan, maskNcm, num, uid } from '../lib/utils'
import type { Curva, SKU } from '../lib/types'
import { isConnected, wmsApi, type WmsSkuDTO } from '../lib/wmsApi'

/** DTO real (adapta-api) → SKU do painel. */
function mapReal(d: WmsSkuDTO): SKU {
  return {
    id: d.id,
    codigo: d.code,
    ean: d.ean ?? '',
    descricao: d.description,
    categoria: d.categoria ?? '',
    curva: (d.curve as Curva) ?? 'C',
    unidade: d.unit,
    unidadesPorCaixa: d.unitsPerBox,
    peso: d.weight ?? 0,
    altura: d.altura ?? 0,
    largura: d.largura ?? 0,
    profundidade: d.profundidade ?? 0,
    boxAltura: d.boxAltura,
    boxLargura: d.boxLargura,
    boxProfundidade: d.boxProfundidade,
    lastro: d.lastro,
    alturaMaxEmpilhamento: d.alturaMaxEmpilhamento,
    maxCaixasPorPallet: d.maxCaixasPorPallet,
    pendenteParametrizacao: d.pendenteParametrizacao,
    controleLote: d.controlLote,
    controleValidade: d.controlValidade,
    controleSerie: d.controlSerie,
    ncm: d.ncm ?? '',
    cest: d.cest ?? '',
    origem: d.origem ?? 0,
    ativo: d.active,
    ownerId: d.ownerId,
    ownerNome: d.ownerNome ?? undefined,
    caixasPorPallet: d.boxesPerPallet,
    volumeCaixaM3: d.boxVolumeM3,
  }
}
/** SKU do painel → payload da API. */
function toDto(s: SKU): Record<string, unknown> {
  return {
    ownerId: s.ownerId,
    code: s.codigo,
    ean: s.ean,
    description: s.descricao,
    categoria: s.categoria,
    curve: s.curva,
    unit: s.unidade,
    unitsPerBox: s.unidadesPorCaixa,
    boxesPerPallet: s.caixasPorPallet ?? null,
    boxVolumeM3: s.volumeCaixaM3 ?? null,
    weight: s.peso,
    altura: s.altura,
    largura: s.largura,
    profundidade: s.profundidade,
    boxAltura: s.boxAltura ?? null,
    boxLargura: s.boxLargura ?? null,
    boxProfundidade: s.boxProfundidade ?? null,
    lastro: s.lastro ?? null,
    alturaMaxEmpilhamento: s.alturaMaxEmpilhamento ?? null,
    pendenteParametrizacao: s.pendenteParametrizacao ?? false,
    ncm: s.ncm,
    cest: s.cest,
    origem: s.origem,
    controlLote: s.controleLote,
    controlValidade: s.controleValidade,
    controlSerie: s.controleSerie,
    active: s.ativo,
  }
}

const novoSku = (): SKU => ({
  id: uid('sku'),
  codigo: '',
  ean: '',
  descricao: '',
  categoria: '',
  curva: 'B',
  unidade: 'UN',
  unidadesPorCaixa: 1,
  peso: 0,
  altura: 0,
  largura: 0,
  profundidade: 0,
  controleLote: false,
  controleValidade: false,
  controleSerie: false,
  ncm: '',
  cest: '',
  origem: 0,
  ativo: true,
})

const curvaTone: Record<Curva, string> = {
  A: 'bg-primary-50 text-primary',
  B: 'bg-info-50 text-info',
  C: 'bg-slate-100 text-ink-soft',
}

export default function Produtos() {
  const { skus, upsert, remove, toast } = useStore()
  const conectado = isConnected()
  const [real, setReal] = useState<SKU[]>([])
  const [owners, setOwners] = useState<{ id: string; nome: string }[]>([])
  const [busca, setBusca] = useState('')
  const [filtroCurva, setFiltroCurva] = useState<Curva | 'todos'>('todos')
  const [soPendentes, setSoPendentes] = useState(false)
  const [edit, setEdit] = useState<SKU | null>(null)
  const [novo, setNovo] = useState(false)

  const refetch = async () => {
    const rs = await wmsApi.skus()
    setReal(rs.map(mapReal))
  }
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [rs, os] = await Promise.all([wmsApi.skus(), wmsApi.owners()])
        if (!vivo) return
        setReal(rs.map(mapReal))
        setOwners(os.map((o) => ({ id: o.id, nome: o.nome })))
      } catch {
        /* mantém demo */
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const fonte = conectado ? real : skus
  const nPendentes = useMemo(() => fonte.filter((p) => p.pendenteParametrizacao).length, [fonte])
  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return fonte.filter((p) => {
      if (filtroCurva !== 'todos' && p.curva !== filtroCurva) return false
      if (soPendentes && !p.pendenteParametrizacao) return false
      return (
        !q ||
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.ean.includes(q) ||
        p.ncm.includes(q)
      )
    })
  }, [fonte, busca, filtroCurva, soPendentes])

  const salvar = async (sku: SKU) => {
    if (!sku.codigo.trim() || !sku.descricao.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatórios', texto: 'Código e descrição são obrigatórios.' })
      return
    }
    if (conectado) {
      if (!sku.ownerId) {
        toast({ tipo: 'erro', titulo: 'Cliente obrigatório', texto: 'Selecione o cliente (owner) do SKU.' })
        return
      }
      try {
        if (novo) await wmsApi.createSku(toDto(sku))
        else await wmsApi.updateSku(sku.id, toDto(sku))
        await refetch()
      } catch (e) {
        toast({ tipo: 'erro', titulo: 'Falha ao salvar', texto: e instanceof Error ? e.message : 'Erro na API.' })
        return
      }
    } else {
      upsert('skus', sku)
    }
    toast({ tipo: 'sucesso', titulo: novo ? 'Produto cadastrado' : 'Produto atualizado', texto: sku.codigo })
    setEdit(null)
    setNovo(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos (SKU)" subtitle="Cadastro mestre com controles de rastreio e dados fiscais BR">
        <Badge tone="neutral">{num(lista.length)} SKUs</Badge>
        {conectado && <Badge tone="ok" dot>dados reais</Badge>}
        <Link to="/migracao-dados" className="btn-outline">
          Importar base legado
        </Link>
        <button
          className="btn-primary"
          onClick={() => {
            setEdit(novoSku())
            setNovo(true)
          }}
        >
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </PageHeader>

      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-sub px-3 py-2 flex-1">
          <Search className="h-4 w-4 text-ink-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar código, descrição, EAN ou NCM…"
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['todos', 'A', 'B', 'C'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFiltroCurva(c)}
              className={cn(
                'chip whitespace-nowrap cursor-pointer transition-colors',
                filtroCurva === c ? 'bg-primary text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200',
              )}
            >
              {c === 'todos' ? 'Todas as curvas' : `Curva ${c}`}
            </button>
          ))}
          <button
            onClick={() => setSoPendentes((v) => !v)}
            className={cn(
              'chip whitespace-nowrap cursor-pointer transition-colors',
              soPendentes ? 'bg-warn text-white' : 'bg-warn-50 text-warn hover:opacity-80',
            )}
            title="SKUs pré-cadastrados da NF aguardando parametrização física"
          >
            Pendentes ({num(nPendentes)})
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Descrição</th>
                <th className="th">Categoria</th>
                <th className="th">Curva</th>
                <th className="th">Controles</th>
                <th className="th">NCM</th>
                <th className="th">Status</th>
                <th className="th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="row-hover">
                  <td className="td mono font-medium text-brand">{p.codigo}</td>
                  <td className="td text-ink">{p.descricao}</td>
                  <td className="td">{p.categoria || '—'}</td>
                  <td className="td">
                    <span className={cn('chip', curvaTone[p.curva])}>Curva {p.curva}</span>
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {p.controleLote && <Badge tone="info">Lote</Badge>}
                      {p.controleValidade && <Badge tone="warn">Validade</Badge>}
                      {p.controleSerie && <Badge tone="primary">Série</Badge>}
                      {!p.controleLote && !p.controleValidade && !p.controleSerie && (
                        <span className="text-ink-muted text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="td mono text-xs">{p.ncm || '—'}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={p.ativo ? 'ok' : 'neutral'} dot>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {p.pendenteParametrizacao && <Badge tone="warn" dot>Parametrização pendente</Badge>}
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn-ghost p-2"
                        onClick={() => {
                          setEdit({ ...p })
                          setNovo(false)
                        }}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!conectado && (
                        <button
                          className="btn-ghost p-2 text-bad hover:bg-bad-50"
                          onClick={() => {
                            remove('skus', p.id)
                            toast({ tipo: 'info', titulo: 'Produto removido', texto: p.codigo })
                          }}
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <EmptyState icon={<Package className="h-6 w-6" />} title="Nenhum produto encontrado" text="Ajuste a busca ou cadastre um novo SKU." />
        )}
      </div>

      {edit && (
        <ProdutoModal
          sku={edit}
          novo={novo}
          conectado={conectado}
          owners={owners}
          onClose={() => {
            setEdit(null)
            setNovo(false)
          }}
          onSave={salvar}
        />
      )}
    </div>
  )
}

function ProdutoModal({
  sku,
  novo,
  conectado,
  owners,
  onClose,
  onSave,
}: {
  sku: SKU
  novo: boolean
  conectado: boolean
  owners: { id: string; nome: string }[]
  onClose: () => void
  onSave: (s: SKU) => void
}) {
  const [f, setF] = useState<SKU>(sku)
  const set = <K extends keyof SKU>(k: K, v: SKU[K]) => setF((p) => ({ ...p, [k]: v }))
  const n = (v: string) => Number(v) || 0

  return (
    <Modal
      open
      onClose={onClose}
      title={novo ? 'Novo produto' : `Editar ${sku.codigo}`}
      subtitle="SKU — cadastro mestre"
      size="lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(f)}>Salvar</button>
        </>
      }
    >
      <div className="space-y-6">
        <FormSection title="Identificação">
          {conectado &&
            (novo ? (
              <SelectField
                label="Cliente (owner) *"
                value={f.ownerId ?? ''}
                onChange={(v) => set('ownerId', v)}
                options={[
                  { value: '', label: '— selecione o cliente —' },
                  ...owners.map((o) => ({ value: o.id, label: o.nome })),
                ]}
              />
            ) : (
              <Field label="Cliente (owner)" value={f.ownerNome ?? ''} onChange={() => {}} />
            ))}
          <FormGrid cols={2}>
            <Field label="Código *" value={f.codigo} onChange={(v) => set('codigo', v)} mono placeholder="NT-FONE-01" />
            <Field label="EAN / GTIN" value={f.ean} onChange={(v) => set('ean', maskEan(v))} mono placeholder="7891234500017" />
          </FormGrid>
          <Field label="Descrição *" value={f.descricao} onChange={(v) => set('descricao', v)} placeholder="Fone Bluetooth NanoSound" />
          <FormGrid cols={3}>
            <Field label="Categoria" value={f.categoria} onChange={(v) => set('categoria', v)} placeholder="Eletrônicos" />
            <SelectField label="Curva ABC" value={f.curva} onChange={(v) => set('curva', v as Curva)} options={[{ value: 'A', label: 'Curva A (alto giro)' }, { value: 'B', label: 'Curva B (médio)' }, { value: 'C', label: 'Curva C (cauda)' }]} />
            <Field label="Unidade" value={f.unidade} onChange={(v) => set('unidade', v)} placeholder="UN / CX / KG" />
          </FormGrid>
        </FormSection>

        <FormSection title="Logística — unidade (a NF traz sempre o unitário)">
          <FormGrid cols={3}>
            <Field label="Unidades por caixa" type="number" value={f.unidadesPorCaixa} onChange={(v) => set('unidadesPorCaixa', n(v))} hint="Conversão caixa → unidade" />
            <Field label="Peso da unidade (kg)" type="number" value={f.peso} onChange={(v) => set('peso', n(v))} />
            <div />
            <Field label="Altura da unidade (cm)" type="number" value={f.altura} onChange={(v) => set('altura', n(v))} />
            <Field label="Largura da unidade (cm)" type="number" value={f.largura} onChange={(v) => set('largura', n(v))} />
            <Field label="Profundidade da unidade (cm)" type="number" value={f.profundidade} onChange={(v) => set('profundidade', n(v))} />
          </FormGrid>
        </FormSection>

        <FormSection title="Logística — caixa mestre (base da cubagem calculada)">
          <FormGrid cols={3}>
            <Field label="Altura da caixa (cm)" type="number" value={f.boxAltura ?? 0} onChange={(v) => set('boxAltura', n(v))} />
            <Field label="Largura da caixa (cm)" type="number" value={f.boxLargura ?? 0} onChange={(v) => set('boxLargura', n(v))} />
            <Field label="Profundidade da caixa (cm)" type="number" value={f.boxProfundidade ?? 0} onChange={(v) => set('boxProfundidade', n(v))} />
            <Field label="Volume real da caixa (m³)" type="number" value={f.volumeCaixaM3 ?? 0} onChange={(v) => set('volumeCaixaM3', n(v))} hint="Se vazio, deriva das dimensões da caixa" />
            <Field label="Lastro (caixas/camada)" type="number" value={f.lastro ?? 0} onChange={(v) => set('lastro', n(v))} hint="Empilhamento no pallet" />
            <Field label="Altura máx. (camadas)" type="number" value={f.alturaMaxEmpilhamento ?? 0} onChange={(v) => set('alturaMaxEmpilhamento', n(v))} />
            <Field label="Caixas por pallet (manual)" type="number" value={f.caixasPorPallet ?? 0} onChange={(v) => set('caixasPorPallet', n(v))} hint="Usado só se não houver lastro × altura" />
          </FormGrid>
          <p className="mt-2 text-xs text-ink-muted">
            Máx. de caixas por pallet:{' '}
            <b className="text-ink">
              {f.lastro && f.alturaMaxEmpilhamento ? f.lastro * f.alturaMaxEmpilhamento : f.caixasPorPallet || '—'}
            </b>
            {f.lastro && f.alturaMaxEmpilhamento ? ` (lastro ${f.lastro} × ${f.alturaMaxEmpilhamento} camadas)` : ''}
          </p>
        </FormSection>

        <FormSection title="Controles de rastreio">
          <div className="rounded-xl border border-line px-4">
            <SettingRow title="Controle de lote" desc="Rastreia lote de fabricação (base para FEFO)." on={f.controleLote} onToggle={() => set('controleLote', !f.controleLote)} />
            <SettingRow title="Controle de validade" desc="Exige data de validade no recebimento." on={f.controleValidade} onToggle={() => set('controleValidade', !f.controleValidade)} />
            <SettingRow title="Controle por número de série" desc="Para eletrônicos e itens de alto valor." on={f.controleSerie} onToggle={() => set('controleSerie', !f.controleSerie)} />
          </div>
        </FormSection>

        <FormSection title="Fiscal (Brasil)">
          <FormGrid cols={3}>
            <Field label="NCM" value={f.ncm} onChange={(v) => set('ncm', maskNcm(v))} mono placeholder="8518.30.00" />
            <Field label="CEST" value={f.cest} onChange={(v) => set('cest', maskCest(v))} mono placeholder="21.106.00" />
            <SelectField label="Origem (ICMS)" value={String(f.origem)} onChange={(v) => set('origem', Number(v))} options={Object.entries(ORIGEM_LABEL).map(([k, l]) => ({ value: k, label: l }))} />
          </FormGrid>
        </FormSection>

        {sku.pendenteParametrizacao && (
          <div className="rounded-xl border border-warn/30 bg-warn-50 px-4">
            <SettingRow
              title="Parametrização concluída"
              desc="SKU pré-cadastrado da NF. Ligue ao completar unidade/caixa mestre/empilhamento — libera a conferência."
              on={!f.pendenteParametrizacao}
              onToggle={() => set('pendenteParametrizacao', !f.pendenteParametrizacao)}
            />
          </div>
        )}
        <div className="rounded-xl border border-line px-4">
          <SettingRow title="Produto ativo" desc="Inativo não aparece para a operação." on={f.ativo} onToggle={() => set('ativo', !f.ativo)} />
        </div>
      </div>
    </Modal>
  )
}
