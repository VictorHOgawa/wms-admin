import { useEffect, useState } from 'react'
import { Boxes, Plus, Pencil } from 'lucide-react'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SettingRow } from '../components/form'
import { num } from '../lib/utils'
import { isConnected, wmsApi, type WmsSupplyDTO } from '../lib/wmsApi'

interface Form {
  id?: string
  code: string
  name: string
  unit: string
  custoUnitario: string
  active: boolean
}

const vazio = (): Form => ({ code: '', name: '', unit: 'un', custoUnitario: '', active: true })

export default function Insumos() {
  const conectado = isConnected()
  const [lista, setLista] = useState<WmsSupplyDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [edit, setEdit] = useState<Form | null>(null)
  const [novo, setNovo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = async () => {
    try {
      setLista(await wmsApi.supplies())
    } catch {
      /* mantém */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const s = await wmsApi.supplies()
        if (vivo) setLista(s)
      } catch {
        /* vazio */
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const salvar = async (f: Form) => {
    if (!f.code.trim() || !f.name.trim()) {
      setErro('Código e nome são obrigatórios.')
      return
    }
    const dto = {
      code: f.code,
      name: f.name,
      unit: f.unit || 'un',
      custoUnitario: f.custoUnitario === '' ? null : Number(f.custoUnitario),
      active: f.active,
    }
    try {
      if (novo) await wmsApi.createSupply(dto)
      else if (f.id) await wmsApi.updateSupply(f.id, dto)
      await carregar()
      setEdit(null)
      setNovo(false)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Insumos (almoxarifado)" subtitle="Pallets, stretch e afins — base do rastreio de consumo e do score enviado × devolvido">
        <Badge tone="neutral">{num(lista.length)} insumos</Badge>
        {conectado && <Badge tone="ok" dot>dados reais</Badge>}
        {conectado && (
          <button className="btn-primary" onClick={() => { setEdit(vazio()); setNovo(true); setErro(null) }}>
            <Plus className="h-4 w-4" /> Novo insumo
          </button>
        )}
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Insumo</th>
                <th className="th">Unidade</th>
                <th className="th text-right">Custo unitário</th>
                <th className="th">Status</th>
                <th className="th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className="row-hover">
                  <td className="td mono font-medium text-brand">{s.code}</td>
                  <td className="td text-ink">{s.name}</td>
                  <td className="td text-xs">{s.unit}</td>
                  <td className="td text-right mono text-xs">{s.custoUnitario != null ? `R$ ${s.custoUnitario.toFixed(2)}` : '—'}</td>
                  <td className="td"><Badge tone={s.active ? 'ok' : 'neutral'} dot>{s.active ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      {conectado && (
                        <button
                          className="btn-ghost p-2"
                          title="Editar"
                          onClick={() => {
                            setEdit({ id: s.id, code: s.code, name: s.name, unit: s.unit, custoUnitario: s.custoUnitario != null ? String(s.custoUnitario) : '', active: s.active })
                            setNovo(false)
                            setErro(null)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
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
          <EmptyState
            icon={<Boxes className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Nenhum insumo cadastrado') : 'Sem conexão com o WMS'}
            text={conectado ? 'Cadastre pallets, stretch e demais insumos para rastrear consumo e devolução.' : 'Entre com credenciais reais do Hub para cadastrar insumos.'}
          />
        )}
      </div>

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setNovo(false); setErro(null) }}
          title={novo ? 'Novo insumo' : `Editar ${edit.code}`}
          subtitle="Insumo — almoxarifado do WMS"
          footer={
            <>
              <button className="btn-outline" onClick={() => { setEdit(null); setNovo(false); setErro(null) }}>Cancelar</button>
              <button className="btn-primary" onClick={() => salvar(edit)}>Salvar</button>
            </>
          }
        >
          <div className="space-y-5">
            <FormGrid cols={2}>
              <Field label="Código *" value={edit.code} onChange={(v) => setEdit({ ...edit, code: v.toUpperCase() })} mono placeholder="PBR" />
              <Field label="Unidade" value={edit.unit} onChange={(v) => setEdit({ ...edit, unit: v })} placeholder="un / m / kg" />
            </FormGrid>
            <Field label="Nome *" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} placeholder="Pallet PBR" />
            <Field label="Custo unitário (R$)" type="number" value={edit.custoUnitario} onChange={(v) => setEdit({ ...edit, custoUnitario: v })} hint="Base para o prejuízo estimado de não-devolução" />
            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Insumo ativo" desc="Inativo não aparece para a operação." on={edit.active} onToggle={() => setEdit({ ...edit, active: !edit.active })} />
            </div>
            {erro && <p className="text-center text-xs text-bad">{erro}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
