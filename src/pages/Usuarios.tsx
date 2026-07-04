import { useState } from 'react'
import { UserCog, Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SelectField, SettingRow } from '../components/form'
import { cn, num, uid } from '../lib/utils'
import type { Usuario } from '../lib/types'

const novoUsuario = (perfilId: string): Usuario => ({
  id: uid('usr'),
  nome: '',
  email: '',
  perfilId,
  armazemIds: [],
  ativo: true,
})

export default function Usuarios() {
  const { usuarios, perfis, armazens, upsert, remove, toast } = useStore()
  const [edit, setEdit] = useState<Usuario | null>(null)
  const [novo, setNovo] = useState(false)

  const perfilDe = (id: string) => perfis.find((p) => p.id === id)

  const salvar = (u: Usuario) => {
    if (!u.nome.trim() || !u.email.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatórios', texto: 'Nome e e-mail são obrigatórios.' })
      return
    }
    upsert('usuarios', u)
    toast({ tipo: 'sucesso', titulo: novo ? 'Usuário criado' : 'Usuário atualizado', texto: u.nome })
    setEdit(null)
    setNovo(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" subtitle="Quem acessa o sistema — vínculo a um perfil e aos armazéns permitidos">
        <Badge tone="neutral">{num(usuarios.length)} usuários</Badge>
        <button className="btn-primary" onClick={() => { setEdit(novoUsuario(perfis[0]?.id ?? '')); setNovo(true) }}>
          <Plus className="h-4 w-4" /> Novo usuário
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Nome</th>
                <th className="th">E-mail</th>
                <th className="th">Perfil</th>
                <th className="th">Armazéns</th>
                <th className="th">Status</th>
                <th className="th text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const perfil = perfilDe(u.perfilId)
                return (
                  <tr key={u.id} className="row-hover">
                    <td className="td">
                      <span className="inline-flex items-center gap-2.5">
                        <span className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-xs">
                          {u.nome.slice(0, 2).toUpperCase() || '--'}
                        </span>
                        <span className="font-medium text-brand">{u.nome}</span>
                      </span>
                    </td>
                    <td className="td text-xs mono">{u.email}</td>
                    <td className="td">
                      {perfil ? (
                        <span className="chip" style={{ background: `${perfil.cor}1a`, color: perfil.cor }}>{perfil.nome}</span>
                      ) : (
                        <span className="text-ink-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {u.armazemIds.length === 0 && <span className="text-ink-muted text-xs">—</span>}
                        {u.armazemIds.map((id) => (
                          <Badge key={id} tone="neutral">{armazens.find((a) => a.id === id)?.codigo ?? id}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="td"><Badge tone={u.ativo ? 'ok' : 'neutral'} dot>{u.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost p-2" onClick={() => { setEdit({ ...u }); setNovo(false) }} title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => { remove('usuarios', u.id); toast({ tipo: 'info', titulo: 'Usuário removido', texto: u.nome }) }} title="Remover"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {usuarios.length === 0 && <EmptyState icon={<UserCog className="h-6 w-6" />} title="Nenhum usuário cadastrado" />}
      </div>

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setNovo(false) }}
          title={novo ? 'Novo usuário' : `Editar ${edit.nome || 'usuário'}`}
          subtitle="Acesso ao sistema"
          footer={<><button className="btn-outline" onClick={() => { setEdit(null); setNovo(false) }}>Cancelar</button><button className="btn-primary" onClick={() => salvar(edit)}>Salvar</button></>}
        >
          <div className="space-y-5">
            <FormGrid cols={2}>
              <Field label="Nome *" value={edit.nome} onChange={(v) => setEdit({ ...edit, nome: v })} placeholder="Carlos Mendes" />
              <Field label="E-mail *" type="email" value={edit.email} onChange={(v) => setEdit({ ...edit, email: v })} mono placeholder="carlos@integra.com.br" />
            </FormGrid>
            <SelectField
              label="Perfil de acesso"
              value={edit.perfilId}
              onChange={(v) => setEdit({ ...edit, perfilId: v })}
              options={perfis.map((p) => ({ value: p.id, label: p.nome }))}
              hint="Define as permissões e alçadas do usuário."
            />
            <div>
              <label className="label">Armazéns permitidos</label>
              <div className="flex flex-wrap gap-2">
                {armazens.map((a) => {
                  const on = edit.armazemIds.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() =>
                        setEdit({
                          ...edit,
                          armazemIds: on ? edit.armazemIds.filter((x) => x !== a.id) : [...edit.armazemIds, a.id],
                        })
                      }
                      className={cn('chip cursor-pointer transition-colors', on ? 'bg-primary text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200')}
                    >
                      {a.codigo} · {a.nome}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Usuário ativo" desc="Inativo não consegue acessar." on={edit.ativo} onToggle={() => setEdit({ ...edit, ativo: !edit.ativo })} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
