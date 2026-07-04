import { useState } from 'react'
import { Truck, Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { MODAL_LABEL } from '../lib/mock'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SelectField, SettingRow } from '../components/form'
import { digitsOnly, maskCnpj, num, uid } from '../lib/utils'
import type { ModalTransporte, Transportadora } from '../lib/types'

const nova = (): Transportadora => ({
  id: uid('tr'),
  codigo: '',
  nome: '',
  cnpj: '',
  antt: '',
  modal: 'rodoviario',
  ativo: true,
})

export default function Transportadoras() {
  const { transportadoras, upsert, remove, toast } = useStore()
  const [edit, setEdit] = useState<Transportadora | null>(null)
  const [novo, setNovo] = useState(false)

  const salvar = (x: Transportadora) => {
    if (!x.codigo.trim() || !x.nome.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatórios', texto: 'Código e nome são obrigatórios.' })
      return
    }
    upsert('transportadoras', x)
    toast({ tipo: 'sucesso', titulo: novo ? 'Transportadora cadastrada' : 'Transportadora atualizada', texto: x.nome })
    setEdit(null)
    setNovo(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Transportadoras" subtitle="Ponto de integração WMS↔TMS — geração de carga, romaneio e CT-e na expedição">
        <Badge tone="neutral">{num(transportadoras.length)} transportadoras</Badge>
        <button className="btn-primary" onClick={() => { setEdit(nova()); setNovo(true) }}>
          <Plus className="h-4 w-4" /> Nova transportadora
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Transportadora</th>
                <th className="th">CNPJ</th>
                <th className="th">ANTT (RNTRC)</th>
                <th className="th">Modal</th>
                <th className="th">Status</th>
                <th className="th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transportadoras.map((x) => (
                <tr key={x.id} className="row-hover">
                  <td className="td mono font-medium text-brand">{x.codigo}</td>
                  <td className="td text-ink font-medium">{x.nome}</td>
                  <td className="td mono text-xs">{x.cnpj || '—'}</td>
                  <td className="td mono text-xs">{x.antt || '—'}</td>
                  <td className="td">{MODAL_LABEL[x.modal]}</td>
                  <td className="td"><Badge tone={x.ativo ? 'ok' : 'neutral'} dot>{x.ativo ? 'Ativa' : 'Inativa'}</Badge></td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost p-2" onClick={() => { setEdit({ ...x }); setNovo(false) }} title="Editar"><Pencil className="h-4 w-4" /></button>
                      <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => { remove('transportadoras', x.id); toast({ tipo: 'info', titulo: 'Transportadora removida', texto: x.nome }) }} title="Remover"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transportadoras.length === 0 && <EmptyState icon={<Truck className="h-6 w-6" />} title="Nenhuma transportadora cadastrada" />}
      </div>

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setNovo(false) }}
          title={novo ? 'Nova transportadora' : `Editar ${edit.codigo}`}
          subtitle="Parceiro de transporte"
          footer={<><button className="btn-outline" onClick={() => { setEdit(null); setNovo(false) }}>Cancelar</button><button className="btn-primary" onClick={() => salvar(edit)}>Salvar</button></>}
        >
          <div className="space-y-5">
            <FormGrid cols={2}>
              <Field label="Código *" value={edit.codigo} onChange={(v) => setEdit({ ...edit, codigo: v })} mono placeholder="T001" />
              <Field label="CNPJ" value={edit.cnpj} onChange={(v) => setEdit({ ...edit, cnpj: maskCnpj(v) })} mono placeholder="00.000.000/0001-00" />
            </FormGrid>
            <Field label="Nome *" value={edit.nome} onChange={(v) => setEdit({ ...edit, nome: v })} placeholder="Rápido Brasil Logística" />
            <FormGrid cols={2}>
              <Field label="ANTT (RNTRC)" value={edit.antt} onChange={(v) => setEdit({ ...edit, antt: digitsOnly(v).slice(0, 8) })} mono placeholder="12345678" />
              <SelectField label="Modal" value={edit.modal} onChange={(v) => setEdit({ ...edit, modal: v as ModalTransporte })} options={[
                { value: 'rodoviario', label: 'Rodoviário' },
                { value: 'aereo', label: 'Aéreo' },
                { value: 'fluvial', label: 'Fluvial' },
                { value: 'ferroviario', label: 'Ferroviário' },
              ]} />
            </FormGrid>
            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Transportadora ativa" desc="Inativa não aparece na expedição." on={edit.ativo} onToggle={() => setEdit({ ...edit, ativo: !edit.ativo })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
