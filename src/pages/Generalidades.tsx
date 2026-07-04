import { useEffect, useState } from 'react'
import { MessageSquareText, Plus, Pencil, Trash2 } from 'lucide-react'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SelectField, SettingRow } from '../components/form'
import { num } from '../lib/utils'
import { isConnected, wmsApi, type WmsGeneralidadeDTO, type WmsOwnerDTO } from '../lib/wmsApi'

const PAPEIS = [
  { value: 'destinatario', label: 'Destinatário (recebedor)' },
  { value: 'remetente', label: 'Remetente' },
  { value: 'tomador', label: 'Tomador' },
  { value: 'qualquer', label: 'Qualquer papel' },
]
const PAPEL_LABEL: Record<string, string> = {
  destinatario: 'Destinatário', remetente: 'Remetente', tomador: 'Tomador', qualquer: 'Qualquer',
}

interface Form {
  id?: string
  ownerId: string
  papel: string
  texto: string
  active: boolean
}
const vazio = (): Form => ({ ownerId: '', papel: 'destinatario', texto: '', active: true })

export default function Generalidades() {
  const conectado = isConnected()
  const [lista, setLista] = useState<WmsGeneralidadeDTO[]>([])
  const [owners, setOwners] = useState<WmsOwnerDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [edit, setEdit] = useState<Form | null>(null)
  const [novo, setNovo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = async () => {
    try {
      setLista(await wmsApi.generalidades())
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
        const [g, ow] = await Promise.all([wmsApi.generalidades(), wmsApi.owners()])
        if (!vivo) return
        setLista(g)
        setOwners(ow)
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

  const nomeOwner = (id: string | null) => (id ? owners.find((o) => o.id === id)?.nome ?? id.slice(0, 8) : 'Todos')

  const salvar = async (f: Form) => {
    if (!f.texto.trim()) {
      setErro('O texto da generalidade é obrigatório.')
      return
    }
    const dto = { ownerId: f.ownerId || null, papel: f.papel, texto: f.texto, active: f.active }
    try {
      if (novo) await wmsApi.createGeneralidade(dto)
      else if (f.id) await wmsApi.updateGeneralidade(f.id, dto)
      await carregar()
      setEdit(null)
      setNovo(false)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
  }

  const remover = async (id: string) => {
    try {
      await wmsApi.deleteGeneralidade(id)
      await carregar()
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Generalidades do cliente" subtitle="Regras consultivas mostradas a quem monta/recebe a carga — a regra do recebedor prevalece">
        <Badge tone="neutral">{num(lista.length)} regras</Badge>
        {conectado && <Badge tone="ok" dot>dados reais</Badge>}
        {conectado && (
          <button className="btn-primary" onClick={() => { setEdit(vazio()); setNovo(true); setErro(null) }}>
            <Plus className="h-4 w-4" /> Nova generalidade
          </button>
        )}
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Cliente</th>
                <th className="th">Papel</th>
                <th className="th">Regra</th>
                <th className="th">Status</th>
                <th className="th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((g) => (
                <tr key={g.id} className="row-hover align-top">
                  <td className="td text-sm">{g.ownerId ? nomeOwner(g.ownerId) : <span className="text-ink-muted">Todos</span>}</td>
                  <td className="td"><Badge tone="info">{PAPEL_LABEL[g.papel] ?? g.papel}</Badge></td>
                  <td className="td text-ink max-w-xl">{g.texto}</td>
                  <td className="td"><Badge tone={g.active ? 'ok' : 'neutral'} dot>{g.active ? 'Ativa' : 'Inativa'}</Badge></td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      {conectado && (
                        <>
                          <button className="btn-ghost p-2" title="Editar" onClick={() => { setEdit({ id: g.id, ownerId: g.ownerId ?? '', papel: g.papel, texto: g.texto, active: g.active }); setNovo(false); setErro(null) }}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="btn-ghost p-2 text-bad hover:bg-bad-50" title="Remover" onClick={() => remover(g.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
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
            icon={<MessageSquareText className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Nenhuma generalidade') : 'Sem conexão com o WMS'}
            text={conectado ? 'Cadastre regras consultivas por cliente (ex.: “não aceita pallet com 2 SKUs”).' : 'Entre com credenciais reais do Hub para cadastrar generalidades.'}
          />
        )}
      </div>

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setNovo(false); setErro(null) }}
          title={novo ? 'Nova generalidade' : 'Editar generalidade'}
          subtitle="Regra consultiva — só lembrete, sem automação"
          footer={
            <>
              <button className="btn-outline" onClick={() => { setEdit(null); setNovo(false); setErro(null) }}>Cancelar</button>
              <button className="btn-primary" onClick={() => salvar(edit)}>Salvar</button>
            </>
          }
        >
          <div className="space-y-5">
            <FormGrid cols={2}>
              <SelectField
                label="Cliente"
                value={edit.ownerId}
                onChange={(v) => setEdit({ ...edit, ownerId: v })}
                options={[{ value: '', label: 'Todos os clientes' }, ...owners.map((o) => ({ value: o.id, label: o.nome }))]}
              />
              <SelectField label="Papel" value={edit.papel} onChange={(v) => setEdit({ ...edit, papel: v })} options={PAPEIS} />
            </FormGrid>
            <Field label="Regra (texto) *" value={edit.texto} onChange={(v) => setEdit({ ...edit, texto: v })} placeholder="Não aceita pallet com 2 SKUs diferentes" />
            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Regra ativa" desc="Inativa não aparece na operação." on={edit.active} onToggle={() => setEdit({ ...edit, active: !edit.active })} />
            </div>
            {erro && <p className="text-center text-xs text-bad">{erro}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
