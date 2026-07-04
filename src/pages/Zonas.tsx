import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { armazemName, TEMPERATURA_LABEL, TIPO_ZONA_LABEL } from '../lib/mock'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SelectField, SettingRow } from '../components/form'
import { num, uid } from '../lib/utils'
import type { Temperatura, TipoZona, Zona } from '../lib/types'
import { isConnected, wmsApi, type WmsZoneDTO } from '../lib/wmsApi'

const ZONA_CORES = ['#00a88e', '#2563eb', '#7c3aed', '#0891b2', '#d97706', '#dc2626', '#16a34a', '#64748b']

const novaZona = (armazemId: string): Zona => ({
  id: uid('zn'),
  armazemId,
  codigo: '',
  nome: '',
  tipo: 'picking',
  temperatura: 'ambiente',
  cor: ZONA_CORES[0],
  ativo: true,
})

function mapReal(z: WmsZoneDTO): Zona {
  return {
    id: z.id,
    armazemId: z.warehouseId,
    codigo: z.code,
    nome: z.name,
    tipo: z.type as TipoZona,
    temperatura: (z.temperature as Temperatura) ?? 'ambiente',
    cor: z.color ?? ZONA_CORES[0],
    ativo: z.active,
  }
}
function toDto(z: Zona): Record<string, unknown> {
  return { warehouseId: z.armazemId, code: z.codigo, name: z.nome, type: z.tipo, temperature: z.temperatura, color: z.cor, active: z.ativo }
}

export default function Zonas() {
  const { zonas, armazemId, upsert, remove, toast } = useStore()
  const conectado = isConnected()
  const [real, setReal] = useState<Zona[]>([])
  const [realArmazens, setRealArmazens] = useState<{ id: string; nome: string }[]>([])
  const [edit, setEdit] = useState<Zona | null>(null)
  const [novo, setNovo] = useState(false)

  const refetch = async () => setReal((await wmsApi.zones()).map(mapReal))
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [zs, whs] = await Promise.all([wmsApi.zones(), wmsApi.warehouses()])
        if (!vivo) return
        setReal(zs.map(mapReal))
        setRealArmazens(whs.map((w) => ({ id: w.id, nome: w.name })))
      } catch {
        /* demo */
      }
    })()
    return () => { vivo = false }
  }, [conectado])

  const armazemAtivo = conectado ? realArmazens[0]?.id ?? '' : armazemId
  const nomeArmazem = conectado ? realArmazens.find((a) => a.id === armazemAtivo)?.nome ?? '—' : armazemName(armazemId)
  const lista = useMemo(
    () => (conectado ? real : zonas).filter((z) => z.armazemId === armazemAtivo),
    [conectado, real, zonas, armazemAtivo],
  )

  const salvar = async (z: Zona) => {
    if (!z.codigo.trim() || !z.nome.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatórios', texto: 'Código e nome são obrigatórios.' })
      return
    }
    if (conectado) {
      try {
        if (novo) await wmsApi.createZone(toDto({ ...z, armazemId: armazemAtivo }))
        else await wmsApi.updateZone(z.id, toDto(z))
        await refetch()
      } catch (e) {
        toast({ tipo: 'erro', titulo: 'Falha ao salvar', texto: e instanceof Error ? e.message : 'Erro na API.' })
        return
      }
    } else {
      upsert('zonas', z)
    }
    toast({ tipo: 'sucesso', titulo: novo ? 'Zona criada' : 'Zona atualizada', texto: z.nome })
    setEdit(null)
    setNovo(false)
  }

  const remover = async (z: Zona) => {
    if (conectado) {
      try { await wmsApi.deleteZone(z.id); await refetch() } catch (e) {
        toast({ tipo: 'erro', titulo: 'Falha ao remover', texto: e instanceof Error ? e.message : 'Erro.' }); return
      }
    } else {
      remove('zonas', z.id)
    }
    toast({ tipo: 'info', titulo: 'Zona removida', texto: z.nome })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Zonas" subtitle={`Divisão lógica de ${nomeArmazem} — base para roteirização e slotting`}>
        <Badge tone="neutral">{num(lista.length)} zonas</Badge>
        {conectado && <Badge tone="ok" dot>dados reais</Badge>}
        <button className="btn-primary" onClick={() => { setEdit(novaZona(armazemAtivo)); setNovo(true) }}>
          <Plus className="h-4 w-4" /> Nova zona
        </button>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lista.map((z) => (
          <div key={z.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: `${z.cor}1a`, color: z.cor }}>
                  <LayoutGrid className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-brand">{z.nome}</p>
                  <p className="text-xs text-ink-muted mono">{z.codigo}</p>
                </div>
              </div>
              <Badge tone={z.ativo ? 'ok' : 'neutral'} dot>{z.ativo ? 'Ativa' : 'Inativa'}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Badge tone="primary">{TIPO_ZONA_LABEL[z.tipo]}</Badge>
              <Badge tone={z.temperatura === 'ambiente' ? 'neutral' : 'info'}>{TEMPERATURA_LABEL[z.temperatura]}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-end gap-1 border-t border-line pt-3">
              <button className="btn-ghost p-2" onClick={() => { setEdit({ ...z }); setNovo(false) }} title="Editar"><Pencil className="h-4 w-4" /></button>
              <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => remover(z)} title="Remover"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {lista.length === 0 && (
        <div className="card">
          <EmptyState icon={<LayoutGrid className="h-6 w-6" />} title="Nenhuma zona neste armazém" text="Crie zonas para organizar picking, pulmão, recebimento e expedição." />
        </div>
      )}

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setNovo(false) }}
          title={novo ? 'Nova zona' : `Editar ${edit.codigo}`}
          subtitle={nomeArmazem}
          footer={<><button className="btn-outline" onClick={() => { setEdit(null); setNovo(false) }}>Cancelar</button><button className="btn-primary" onClick={() => salvar(edit)}>Salvar</button></>}
        >
          <div className="space-y-5">
            <FormGrid cols={2}>
              <Field label="Código *" value={edit.codigo} onChange={(v) => setEdit({ ...edit, codigo: v.toUpperCase() })} mono placeholder="PICK-A" />
              <Field label="Nome *" value={edit.nome} onChange={(v) => setEdit({ ...edit, nome: v })} placeholder="Picking Seco A" />
            </FormGrid>
            <FormGrid cols={2}>
              <SelectField label="Tipo" value={edit.tipo} onChange={(v) => setEdit({ ...edit, tipo: v as TipoZona })} options={Object.entries(TIPO_ZONA_LABEL).map(([value, label]) => ({ value, label }))} />
              <SelectField label="Temperatura" value={edit.temperatura} onChange={(v) => setEdit({ ...edit, temperatura: v as Temperatura })} options={Object.entries(TEMPERATURA_LABEL).map(([value, label]) => ({ value, label }))} hint="Refrigerado/congelado exigem segregação (Anvisa)." />
            </FormGrid>
            <div>
              <label className="label">Cor</label>
              <div className="flex flex-wrap gap-2">
                {ZONA_CORES.map((c) => (
                  <button key={c} onClick={() => setEdit({ ...edit, cor: c })} className={`h-8 w-8 rounded-lg transition-transform ${edit.cor === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Zona ativa" desc="Inativa não recebe endereços operacionais." on={edit.ativo} onToggle={() => setEdit({ ...edit, ativo: !edit.ativo })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
