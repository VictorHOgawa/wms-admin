import { useEffect, useMemo, useState } from 'react'
import { Container, Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { armazemName, TIPO_DOCA_LABEL } from '../lib/mock'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SelectField, SettingRow } from '../components/form'
import { num, uid } from '../lib/utils'
import type { Doca, TipoDoca } from '../lib/types'
import { isConnected, wmsApi, type WmsDocaDTO } from '../lib/wmsApi'

const novaDoca = (armazemId: string): Doca => ({
  id: uid('dk'),
  armazemId,
  codigo: '',
  nome: '',
  tipo: 'recebimento',
  niveladora: true,
  ativo: true,
})

const docaTone: Record<TipoDoca, 'info' | 'warn' | 'primary'> = {
  recebimento: 'info',
  expedicao: 'warn',
  ambas: 'primary',
}

function mapReal(d: WmsDocaDTO): Doca {
  return { id: d.id, armazemId: d.warehouseId, codigo: d.code, nome: d.name, tipo: d.tipo as TipoDoca, niveladora: d.niveladora, ativo: d.active }
}
function toDto(d: Doca): Record<string, unknown> {
  return { warehouseId: d.armazemId, code: d.codigo, name: d.nome, tipo: d.tipo, niveladora: d.niveladora, active: d.ativo }
}

export default function Docas() {
  const { docas, armazemId, upsert, remove, toast } = useStore()
  const conectado = isConnected()
  const [real, setReal] = useState<Doca[]>([])
  const [realArmazens, setRealArmazens] = useState<{ id: string; nome: string }[]>([])
  const [edit, setEdit] = useState<Doca | null>(null)
  const [novo, setNovo] = useState(false)

  const refetch = async () => setReal((await wmsApi.docas()).map(mapReal))
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [dk, whs] = await Promise.all([wmsApi.docas(), wmsApi.warehouses()])
        if (!vivo) return
        setReal(dk.map(mapReal))
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
    () => (conectado ? real : docas).filter((d) => d.armazemId === armazemAtivo),
    [conectado, real, docas, armazemAtivo],
  )

  const salvar = async (d: Doca) => {
    if (!d.codigo.trim() || !d.nome.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatórios', texto: 'Código e nome são obrigatórios.' })
      return
    }
    if (conectado) {
      try {
        if (novo) await wmsApi.createDoca(toDto({ ...d, armazemId: armazemAtivo }))
        else await wmsApi.updateDoca(d.id, toDto(d))
        await refetch()
      } catch (e) {
        toast({ tipo: 'erro', titulo: 'Falha ao salvar', texto: e instanceof Error ? e.message : 'Erro na API.' })
        return
      }
    } else {
      upsert('docas', d)
    }
    toast({ tipo: 'sucesso', titulo: novo ? 'Doca criada' : 'Doca atualizada', texto: d.nome })
    setEdit(null)
    setNovo(false)
  }

  const remover = async (d: Doca) => {
    if (conectado) {
      try { await wmsApi.deleteDoca(d.id); await refetch() } catch (e) {
        toast({ tipo: 'erro', titulo: 'Falha ao remover', texto: e instanceof Error ? e.message : 'Erro.' }); return
      }
    } else {
      remove('docas', d.id)
    }
    toast({ tipo: 'info', titulo: 'Doca removida', texto: d.nome })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Docas" subtitle={`Portas de recebimento e expedição de ${nomeArmazem}`}>
        <Badge tone="neutral">{num(lista.length)} docas</Badge>
        {conectado && <Badge tone="ok" dot>dados reais</Badge>}
        <button className="btn-primary" onClick={() => { setEdit(novaDoca(armazemAtivo)); setNovo(true) }}>
          <Plus className="h-4 w-4" /> Nova doca
        </button>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {lista.map((d) => (
          <div key={d.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary grid place-items-center">
                <Container className="h-5 w-5" />
              </div>
              <Badge tone={d.ativo ? 'ok' : 'neutral'} dot>{d.ativo ? 'Ativa' : 'Inativa'}</Badge>
            </div>
            <p className="mt-3 font-medium text-brand mono">{d.codigo}</p>
            <p className="text-xs text-ink-muted">{d.nome}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Badge tone={docaTone[d.tipo]}>{TIPO_DOCA_LABEL[d.tipo]}</Badge>
              {d.niveladora && <Badge tone="neutral">Niveladora</Badge>}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1 border-t border-line pt-3">
              <button className="btn-ghost p-2" onClick={() => { setEdit({ ...d }); setNovo(false) }} title="Editar"><Pencil className="h-4 w-4" /></button>
              <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => remover(d)} title="Remover"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {lista.length === 0 && (
        <div className="card">
          <EmptyState icon={<Container className="h-6 w-6" />} title="Nenhuma doca neste armazém" text="Cadastre docas para agendar recebimento e expedição." />
        </div>
      )}

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setNovo(false) }}
          title={novo ? 'Nova doca' : `Editar ${edit.codigo}`}
          subtitle={nomeArmazem}
          footer={<><button className="btn-outline" onClick={() => { setEdit(null); setNovo(false) }}>Cancelar</button><button className="btn-primary" onClick={() => salvar(edit)}>Salvar</button></>}
        >
          <div className="space-y-5">
            <FormGrid cols={2}>
              <Field label="Código *" value={edit.codigo} onChange={(v) => setEdit({ ...edit, codigo: v.toUpperCase() })} mono placeholder="DOCA-01" />
              <SelectField label="Tipo" value={edit.tipo} onChange={(v) => setEdit({ ...edit, tipo: v as TipoDoca })} options={Object.entries(TIPO_DOCA_LABEL).map(([value, label]) => ({ value, label }))} />
            </FormGrid>
            <Field label="Nome *" value={edit.nome} onChange={(v) => setEdit({ ...edit, nome: v })} placeholder="Doca 01 — Recebimento" />
            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Possui niveladora" desc="Plataforma niveladora para carga/descarga." on={edit.niveladora} onToggle={() => setEdit({ ...edit, niveladora: !edit.niveladora })} />
              <SettingRow title="Doca ativa" desc="Inativa não pode ser agendada." on={edit.ativo} onToggle={() => setEdit({ ...edit, ativo: !edit.ativo })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
