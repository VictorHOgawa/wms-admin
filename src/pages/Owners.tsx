import { useEffect, useState } from 'react'
import { Users, Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SettingRow } from '../components/form'
import { maskCnpj, maskPhone, num, uid } from '../lib/utils'
import type { Owner } from '../lib/types'
import { isConnected, wmsApi, type WmsOwnerDTO } from '../lib/wmsApi'

const SWATCHES = ['#2563eb', '#db2777', '#16a34a', '#f97316', '#7c3aed', '#0891b2', '#dc2626', '#64748b']

/** Cor de identificação determinística a partir do id (owners reais não têm cor cadastrada). */
function corDeId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return SWATCHES[h % SWATCHES.length]
}
function mapReal(o: WmsOwnerDTO): Owner {
  return {
    id: o.id,
    codigo: o.fantasia ?? '',
    nome: o.nome,
    cnpj: o.cnpj ?? '',
    cor: corDeId(o.id),
    contato: '',
    ativo: o.ativo,
  }
}

const novoOwner = (): Owner => ({
  id: uid('own'),
  codigo: '',
  nome: '',
  cnpj: '',
  cor: SWATCHES[0],
  contato: '',
  ativo: true,
})

export default function Owners() {
  const { owners, upsert, remove, toast } = useStore()
  const conectado = isConnected()
  const [real, setReal] = useState<Owner[]>([])
  const [edit, setEdit] = useState<Owner | null>(null)
  const [novo, setNovo] = useState(false)

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const os = await wmsApi.owners()
        if (vivo) setReal(os.map(mapReal))
      } catch {
        /* mantém demo */
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const lista = conectado ? real : owners

  const salvar = (o: Owner) => {
    if (!o.codigo.trim() || !o.nome.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatórios', texto: 'Código e nome são obrigatórios.' })
      return
    }
    upsert('owners', o)
    toast({ tipo: 'sucesso', titulo: novo ? 'Cliente cadastrado' : 'Cliente atualizado', texto: o.nome })
    setEdit(null)
    setNovo(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes (Owners)" subtitle="Donos do estoque — base da segregação 3PL e do faturamento por serviço">
        <Badge tone="neutral">{num(lista.length)} clientes</Badge>
        {conectado ? (
          <Badge tone="ok" dot>dados reais</Badge>
        ) : (
          <button className="btn-primary" onClick={() => { setEdit(novoOwner()); setNovo(true) }}>
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        )}
      </PageHeader>

      {conectado && (
        <div className="card px-4 py-3 text-xs text-ink-soft">
          Clientes vêm do cadastro de parceiros do TMS (somente leitura aqui). Para
          incluir ou alterar um cliente, use o cadastro no TMS.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Código</th>
                <th className="th">Cliente</th>
                <th className="th">CNPJ</th>
                <th className="th">Contato</th>
                <th className="th">Status</th>
                <th className="th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id} className="row-hover">
                  <td className="td mono font-medium text-brand">{o.codigo || '—'}</td>
                  <td className="td">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: o.cor }} />
                      <span className="text-ink font-medium">{o.nome}</span>
                    </span>
                  </td>
                  <td className="td mono text-xs">{o.cnpj || '—'}</td>
                  <td className="td text-xs">{o.contato || '—'}</td>
                  <td className="td"><Badge tone={o.ativo ? 'ok' : 'neutral'} dot>{o.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="td">
                    {conectado ? (
                      <div className="text-right text-ink-muted text-xs">—</div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost p-2" onClick={() => { setEdit({ ...o }); setNovo(false) }} title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => { remove('owners', o.id); toast({ tipo: 'info', titulo: 'Cliente removido', texto: o.nome }) }} title="Remover"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && <EmptyState icon={<Users className="h-6 w-6" />} title="Nenhum cliente cadastrado" />}
      </div>

      {edit && <OwnerModal owner={edit} novo={novo} onClose={() => { setEdit(null); setNovo(false) }} onSave={salvar} />}
    </div>
  )
}

function OwnerModal({ owner, novo, onClose, onSave }: { owner: Owner; novo: boolean; onClose: () => void; onSave: (o: Owner) => void }) {
  const [f, setF] = useState<Owner>(owner)
  const set = <K extends keyof Owner>(k: K, v: Owner[K]) => setF((p) => ({ ...p, [k]: v }))

  return (
    <Modal
      open
      onClose={onClose}
      title={novo ? 'Novo cliente' : `Editar ${owner.nome}`}
      subtitle="Owner — dono do estoque"
      footer={<><button className="btn-outline" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={() => onSave(f)}>Salvar</button></>}
    >
      <div className="space-y-5">
        <FormGrid cols={2}>
          <Field label="Código *" value={f.codigo} onChange={(v) => set('codigo', v)} mono placeholder="NANO" />
          <Field label="CNPJ" value={f.cnpj} onChange={(v) => set('cnpj', maskCnpj(v))} mono placeholder="00.000.000/0001-00" />
        </FormGrid>
        <Field label="Nome *" value={f.nome} onChange={(v) => set('nome', v)} placeholder="NanoTech Eletrônicos" />
        <Field label="Contato" value={f.contato} onChange={(v) => set('contato', v.includes('@') ? v : maskPhone(v))} placeholder="(11) 99876-1234 ou logistica@cliente.com.br" />
        <div>
          <label className="label">Cor de identificação</label>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => set('cor', c)}
                className={`h-8 w-8 rounded-lg transition-transform ${f.cor === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line px-4">
          <SettingRow title="Cliente ativo" desc="Contrato vigente — aparece na operação." on={f.ativo} onToggle={() => set('ativo', !f.ativo)} />
        </div>
      </div>
    </Modal>
  )
}
