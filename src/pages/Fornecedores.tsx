import { useState } from 'react'
import { Factory, Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SettingRow } from '../components/form'
import { maskCnpj, maskPhone, num, uid } from '../lib/utils'
import type { Fornecedor } from '../lib/types'

const novoFornecedor = (): Fornecedor => ({
  id: uid('forn'),
  codigo: '',
  nome: '',
  cnpj: '',
  uf: '',
  contato: '',
  ativo: true,
})

export default function Fornecedores() {
  const { fornecedores, upsert, remove, toast } = useStore()
  const [edit, setEdit] = useState<Fornecedor | null>(null)
  const [novo, setNovo] = useState(false)

  const salvar = (x: Fornecedor) => {
    if (!x.codigo.trim() || !x.nome.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatórios', texto: 'Código e nome são obrigatórios.' })
      return
    }
    upsert('fornecedores', x)
    toast({ tipo: 'sucesso', titulo: novo ? 'Fornecedor cadastrado' : 'Fornecedor atualizado', texto: x.nome })
    setEdit(null)
    setNovo(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fornecedores" subtitle="Origem das entradas — vincula recebimento à NF-e de compra">
        <Badge tone="neutral">{num(fornecedores.length)} fornecedores</Badge>
        <button className="btn-primary" onClick={() => { setEdit(novoFornecedor()); setNovo(true) }}>
          <Plus className="h-4 w-4" /> Novo fornecedor
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Fornecedor</th>
                <th className="th">CNPJ</th>
                <th className="th">UF</th>
                <th className="th">Contato</th>
                <th className="th">Status</th>
                <th className="th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((x) => (
                <tr key={x.id} className="row-hover">
                  <td className="td mono font-medium text-brand">{x.codigo}</td>
                  <td className="td text-ink font-medium">{x.nome}</td>
                  <td className="td mono text-xs">{x.cnpj || '—'}</td>
                  <td className="td">{x.uf || '—'}</td>
                  <td className="td text-xs">{x.contato || '—'}</td>
                  <td className="td"><Badge tone={x.ativo ? 'ok' : 'neutral'} dot>{x.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <button className="btn-ghost p-2" onClick={() => { setEdit({ ...x }); setNovo(false) }} title="Editar"><Pencil className="h-4 w-4" /></button>
                      <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => { remove('fornecedores', x.id); toast({ tipo: 'info', titulo: 'Fornecedor removido', texto: x.nome }) }} title="Remover"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {fornecedores.length === 0 && <EmptyState icon={<Factory className="h-6 w-6" />} title="Nenhum fornecedor cadastrado" />}
      </div>

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setNovo(false) }}
          title={novo ? 'Novo fornecedor' : `Editar ${edit.codigo}`}
          subtitle="Fornecedor de mercadoria"
          footer={<><button className="btn-outline" onClick={() => { setEdit(null); setNovo(false) }}>Cancelar</button><button className="btn-primary" onClick={() => salvar(edit)}>Salvar</button></>}
        >
          <div className="space-y-5">
            <FormGrid cols={2}>
              <Field label="Código *" value={edit.codigo} onChange={(v) => setEdit({ ...edit, codigo: v })} mono placeholder="F001" />
              <Field label="CNPJ" value={edit.cnpj} onChange={(v) => setEdit({ ...edit, cnpj: maskCnpj(v) })} mono placeholder="00.000.000/0001-00" />
            </FormGrid>
            <Field label="Nome *" value={edit.nome} onChange={(v) => setEdit({ ...edit, nome: v })} placeholder="Distribuidora Sul Eletro" />
            <FormGrid cols={2}>
              <Field label="UF" value={edit.uf} onChange={(v) => setEdit({ ...edit, uf: v.toUpperCase().slice(0, 2) })} placeholder="SC" />
              <Field label="Contato" value={edit.contato} onChange={(v) => setEdit({ ...edit, contato: v.includes('@') ? v : maskPhone(v) })} placeholder="(47) 99876-1234 ou pedidos@fornecedor.com.br" />
            </FormGrid>
            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Fornecedor ativo" desc="Inativo não pode ser usado em novos recebimentos." on={edit.ativo} onToggle={() => setEdit({ ...edit, ativo: !edit.ativo })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
