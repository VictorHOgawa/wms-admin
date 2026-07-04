import { useMemo, useState } from 'react'
import { ShieldCheck, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { PERMISSOES } from '../lib/mock'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SettingRow } from '../components/form'
import { cn, num, uid } from '../lib/utils'
import type { Perfil } from '../lib/types'

const CORES = ['#64748b', '#2563eb', '#00a88e', '#7c3aed', '#db2777', '#f97316', '#0891b2', '#dc2626']

const novoPerfil = (): Perfil => ({
  id: uid('perf'),
  nome: '',
  descricao: '',
  cor: CORES[1],
  permissoes: [],
  alcadaAjusteQtd: 0,
  alcadaAjusteValor: 0,
  ativo: true,
})

const alcadaLabel = (v: number) => (v < 0 ? 'Ilimitado' : v === 0 ? 'Sem alçada' : num(v))

export default function Perfis() {
  const { perfis, usuarios, upsert, remove, toast } = useStore()
  const [edit, setEdit] = useState<Perfil | null>(null)
  const [novo, setNovo] = useState(false)

  const salvar = (p: Perfil) => {
    if (!p.nome.trim()) {
      toast({ tipo: 'erro', titulo: 'Campo obrigatório', texto: 'O nome do perfil é obrigatório.' })
      return
    }
    upsert('perfis', p)
    toast({ tipo: 'sucesso', titulo: novo ? 'Perfil criado' : 'Perfil atualizado', texto: p.nome })
    setEdit(null)
    setNovo(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Perfis & Permissões" subtitle="Permissão por AÇÃO, não por tela · alçadas definem limites de ajuste">
        <Badge tone="neutral">{num(perfis.length)} perfis</Badge>
        <button className="btn-primary" onClick={() => { setEdit(novoPerfil()); setNovo(true) }}>
          <Plus className="h-4 w-4" /> Novo perfil
        </button>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {perfis.map((p) => {
          const qtdUsuarios = usuarios.filter((u) => u.perfilId === p.id).length
          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: `${p.cor}1a`, color: p.cor }}>
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-brand">{p.nome}</p>
                    <p className="text-xs text-ink-muted">{qtdUsuarios} usuário{qtdUsuarios === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <Badge tone={p.ativo ? 'ok' : 'neutral'} dot>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <p className="text-xs text-ink-muted mt-3 min-h-[2rem]">{p.descricao}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface-sub p-2">
                  <p className="text-ink-muted">Permissões</p>
                  <p className="font-semibold text-brand mono">{p.permissoes.length}/{PERMISSOES.length}</p>
                </div>
                <div className="rounded-lg bg-surface-sub p-2">
                  <p className="text-ink-muted">Alçada ajuste</p>
                  <p className="font-semibold text-brand mono">{alcadaLabel(p.alcadaAjusteQtd)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-1 border-t border-line pt-3">
                <button className="btn-ghost p-2" onClick={() => { setEdit({ ...p, permissoes: [...p.permissoes] }); setNovo(false) }} title="Editar"><Pencil className="h-4 w-4" /></button>
                <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => { remove('perfis', p.id); toast({ tipo: 'info', titulo: 'Perfil removido', texto: p.nome }) }} title="Remover"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          )
        })}
      </div>

      {perfis.length === 0 && <div className="card"><EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Nenhum perfil cadastrado" /></div>}

      {edit && <PerfilModal perfil={edit} novo={novo} onClose={() => { setEdit(null); setNovo(false) }} onSave={salvar} />}
    </div>
  )
}

function PerfilModal({ perfil, novo, onClose, onSave }: { perfil: Perfil; novo: boolean; onClose: () => void; onSave: (p: Perfil) => void }) {
  const [f, setF] = useState<Perfil>(perfil)
  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => setF((p) => ({ ...p, [k]: v }))
  const grupos = useMemo(() => [...new Set(PERMISSOES.map((p) => p.grupo))], [])

  const toggle = (chave: string) =>
    set('permissoes', f.permissoes.includes(chave) ? f.permissoes.filter((c) => c !== chave) : [...f.permissoes, chave])

  const toggleGrupo = (grupo: string) => {
    const doGrupo = PERMISSOES.filter((p) => p.grupo === grupo).map((p) => p.chave)
    const todos = doGrupo.every((c) => f.permissoes.includes(c))
    set('permissoes', todos ? f.permissoes.filter((c) => !doGrupo.includes(c)) : [...new Set([...f.permissoes, ...doGrupo])])
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={novo ? 'Novo perfil' : `Editar ${perfil.nome}`}
      subtitle="Permissões por ação + alçadas"
      size="lg"
      footer={<><button className="btn-outline" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={() => onSave(f)}>Salvar</button></>}
    >
      <div className="space-y-6">
        <FormGrid cols={2}>
          <Field label="Nome *" value={f.nome} onChange={(v) => set('nome', v)} placeholder="Supervisor de turno" />
          <div>
            <label className="label">Cor</label>
            <div className="flex flex-wrap gap-1.5">
              {CORES.map((c) => (
                <button key={c} onClick={() => set('cor', c)} className={cn('h-8 w-8 rounded-lg transition-transform', f.cor === c && 'ring-2 ring-offset-2 ring-primary scale-110')} style={{ background: c }} />
              ))}
            </div>
          </div>
        </FormGrid>
        <Field label="Descrição" value={f.descricao} onChange={(v) => set('descricao', v)} placeholder="Trata exceções e aprova ajustes dentro da alçada." />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Alçadas (limites de ajuste)</p>
          <FormGrid cols={2}>
            <Field label="Ajuste máx. sem aprovação (un)" type="number" value={f.alcadaAjusteQtd} onChange={(v) => set('alcadaAjusteQtd', Number(v))} hint="-1 = ilimitado · 0 = não pode ajustar" />
            <Field label="Ajuste máx. (R$)" type="number" value={f.alcadaAjusteValor} onChange={(v) => set('alcadaAjusteValor', Number(v))} hint="-1 = ilimitado" />
          </FormGrid>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Permissões ({f.permissoes.length}/{PERMISSOES.length})
          </p>
          <div className="space-y-3">
            {grupos.map((g) => {
              const doGrupo = PERMISSOES.filter((p) => p.grupo === g)
              const todos = doGrupo.every((p) => f.permissoes.includes(p.chave))
              return (
                <div key={g} className="rounded-xl border border-line overflow-hidden">
                  <button onClick={() => toggleGrupo(g)} className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-sub hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-semibold text-brand">{g}</span>
                    <span className="text-xs text-ink-muted">{todos ? 'Desmarcar todos' : 'Marcar todos'}</span>
                  </button>
                  <div className="divide-y divide-line">
                    {doGrupo.map((perm) => {
                      const on = f.permissoes.includes(perm.chave)
                      return (
                        <button key={perm.chave} onClick={() => toggle(perm.chave)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
                          <span className={cn('h-5 w-5 rounded-md grid place-items-center shrink-0 transition-colors', on ? 'bg-primary text-white' : 'border border-zinc-300 bg-surface')}>
                            {on && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="text-sm text-ink-soft">{perm.label}</span>
                          <span className="ml-auto text-[11px] text-ink-muted mono">{perm.chave}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-line px-4">
          <SettingRow title="Perfil ativo" desc="Inativo não pode ser atribuído a usuários." on={f.ativo} onToggle={() => set('ativo', !f.ativo)} />
        </div>
      </div>
    </Modal>
  )
}
