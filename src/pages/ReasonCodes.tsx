import { useState } from 'react'
import { ClipboardList, Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { TIPO_REASON_LABEL } from '../lib/mock'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SelectField, SettingRow } from '../components/form'
import { num, uid } from '../lib/utils'
import type { ReasonCode, TipoReasonCode } from '../lib/types'

const novo = (): ReasonCode => ({
  id: uid('rc'),
  codigo: '',
  descricao: '',
  tipo: 'ajuste_negativo',
  exigeAprovacao: true,
  ativo: true,
})

const tipoTone: Record<TipoReasonCode, 'ok' | 'bad' | 'warn' | 'info' | 'primary'> = {
  ajuste_positivo: 'ok',
  ajuste_negativo: 'bad',
  avaria: 'warn',
  bloqueio: 'info',
  devolucao: 'primary',
}

export default function ReasonCodes() {
  const { reasonCodes, upsert, remove, toast } = useStore()
  const [edit, setEdit] = useState<ReasonCode | null>(null)
  const [isNovo, setIsNovo] = useState(false)

  const salvar = (r: ReasonCode) => {
    if (!r.codigo.trim() || !r.descricao.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatórios', texto: 'Código e descrição são obrigatórios.' })
      return
    }
    upsert('reasonCodes', r)
    toast({ tipo: 'sucesso', titulo: isNovo ? 'Motivo cadastrado' : 'Motivo atualizado', texto: r.codigo })
    setEdit(null)
    setIsNovo(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reason Codes" subtitle="Motivos rastreáveis de ajuste e bloqueio — onde fraude e erro fiscal se escondem">
        <Badge tone="neutral">{num(reasonCodes.length)} motivos</Badge>
        <button className="btn-primary" onClick={() => { setEdit(novo()); setIsNovo(true) }}>
          <Plus className="h-4 w-4" /> Novo motivo
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Descrição</th>
                <th className="th">Tipo</th>
                <th className="th">Aprovação</th>
                <th className="th">Status</th>
                <th className="th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {reasonCodes.map((r) => (
                <tr key={r.id} className="row-hover">
                  <td className="td mono font-medium text-brand">{r.codigo}</td>
                  <td className="td text-ink">{r.descricao}</td>
                  <td className="td"><Badge tone={tipoTone[r.tipo]}>{TIPO_REASON_LABEL[r.tipo]}</Badge></td>
                  <td className="td">
                    {r.exigeAprovacao ? <Badge tone="warn" dot>Exige aprovação</Badge> : <span className="text-ink-muted text-xs">Livre</span>}
                  </td>
                  <td className="td"><Badge tone={r.ativo ? 'ok' : 'neutral'} dot>{r.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost p-2" onClick={() => { setEdit({ ...r }); setIsNovo(false) }} title="Editar"><Pencil className="h-4 w-4" /></button>
                      <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => { remove('reasonCodes', r.id); toast({ tipo: 'info', titulo: 'Motivo removido', texto: r.codigo }) }} title="Remover"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reasonCodes.length === 0 && <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Nenhum reason code cadastrado" />}
      </div>

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setIsNovo(false) }}
          title={isNovo ? 'Novo motivo' : `Editar ${edit.codigo}`}
          subtitle="Reason code de ajuste/bloqueio"
          footer={<><button className="btn-outline" onClick={() => { setEdit(null); setIsNovo(false) }}>Cancelar</button><button className="btn-primary" onClick={() => salvar(edit)}>Salvar</button></>}
        >
          <div className="space-y-5">
            <FormGrid cols={2}>
              <Field label="Código *" value={edit.codigo} onChange={(v) => setEdit({ ...edit, codigo: v.toUpperCase() })} mono placeholder="AJ-NEG" />
              <SelectField label="Tipo" value={edit.tipo} onChange={(v) => setEdit({ ...edit, tipo: v as TipoReasonCode })} options={Object.entries(TIPO_REASON_LABEL).map(([value, label]) => ({ value, label }))} />
            </FormGrid>
            <Field label="Descrição *" value={edit.descricao} onChange={(v) => setEdit({ ...edit, descricao: v })} placeholder="Recontagem — falta confirmada" />
            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Exige aprovação" desc="Ajuste com este motivo precisa de liberação de supervisor." on={edit.exigeAprovacao} onToggle={() => setEdit({ ...edit, exigeAprovacao: !edit.exigeAprovacao })} />
              <SettingRow title="Motivo ativo" desc="Inativo não aparece na operação." on={edit.ativo} onToggle={() => setEdit({ ...edit, ativo: !edit.ativo })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
