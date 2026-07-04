import { useEffect, useState, type ReactNode } from 'react'
import { Camera, ClipboardCheck, MessageSquareText, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { Badge, EmptyState, Modal, PageHeader } from '../components/ui'
import { Field, FormGrid, SelectField, SettingRow } from '../components/form'
import { ownerName } from '../lib/mock'
import { num, uid } from '../lib/utils'
import { useStore } from '../store/useStore'
import type { ChecklistQuestion, ChecklistTemplate } from '../lib/types'
import { isConnected, wmsApi, type WmsChecklistDTO } from '../lib/wmsApi'

/** DTO real (adapta-api) → template do painel. */
function mapRealChk(d: WmsChecklistDTO): ChecklistTemplate {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    flow: d.flow as ChecklistTemplate['flow'],
    operacao: d.operacao,
    tipoEquipamento: d.tipoEquipamento,
    warehouseId: d.warehouseId,
    ownerId: d.ownerId,
    active: d.active,
    version: d.version,
    blocksOnFailure: d.blocksOnFailure,
    questions: d.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type as ChecklistQuestion['type'],
      required: q.required,
      okLabel: q.okLabel ?? '',
      failLabel: q.failLabel ?? '',
      failValues: q.failValues,
      requiresPhotoOnFail: q.requiresPhotoOnFail,
      requiresObservationOnFail: q.requiresObservationOnFail,
      blocksStep: q.blocksStep,
      requiresSupervisor: q.requiresSupervisor,
      permiteNA: q.permiteNA,
    })),
  }
}
/** template do painel → payload da API. */
function toDtoChk(t: ChecklistTemplate): Record<string, unknown> {
  return {
    warehouseId: t.warehouseId,
    ownerId: t.ownerId,
    code: t.code,
    name: t.name,
    flow: t.flow,
    operacao: t.operacao ?? null,
    tipoEquipamento: t.tipoEquipamento ?? null,
    active: t.active,
    version: t.version,
    blocksOnFailure: t.blocksOnFailure,
    questions: t.questions.map((q) => ({
      text: q.text,
      type: q.type,
      required: q.required,
      okLabel: q.okLabel,
      failLabel: q.failLabel,
      failValues: q.failValues,
      requiresPhotoOnFail: q.requiresPhotoOnFail,
      requiresObservationOnFail: q.requiresObservationOnFail,
      blocksStep: q.blocksStep,
      requiresSupervisor: q.requiresSupervisor,
      permiteNA: q.permiteNA !== false,
    })),
  }
}

const flowOptions = [
  { value: 'receber', label: 'Recebimento' },
  { value: 'guardar', label: 'Put-away' },
  { value: 'separar', label: 'Picking' },
  { value: 'conferir', label: 'Conferencia' },
  { value: 'carregar', label: 'Carregamento' },
  { value: 'contar', label: 'Inventario' },
  { value: 'abastecer', label: 'Reabastecimento' },
]

const operacaoOptions = [
  { value: '', label: '— qualquer operação —' },
  { value: 'coleta', label: 'Coleta' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'entrega', label: 'Entrega' },
  { value: 'carregamento', label: 'Carregamento' },
  { value: 'descarga', label: 'Descarga' },
]
const equipamentoOptions = [
  { value: '', label: '— qualquer equipamento —' },
  { value: 'bau', label: 'Baú' },
  { value: 'carreta_aberta', label: 'Carreta aberta' },
  { value: 'sider', label: 'Sider' },
  { value: 'container', label: 'Container' },
]

const typeOptions = [
  { value: 'BOOLEAN', label: 'Sim / Nao' },
  { value: 'OK_NOK_NA', label: 'OK / NOK' },
  { value: 'PHOTO', label: 'Foto' },
]

const novoTemplate = (warehouseId: string): ChecklistTemplate => ({
  id: uid('chk'),
  code: '',
  name: '',
  flow: 'receber',
  warehouseId,
  ownerId: null,
  active: true,
  version: 1,
  blocksOnFailure: true,
  questions: [novaPergunta()],
})

const novaPergunta = (): ChecklistQuestion => ({
  id: uid('q'),
  text: '',
  type: 'OK_NOK_NA',
  required: true,
  okLabel: 'Conforme',
  failLabel: 'Nao conforme',
  failValues: ['NOK'],
  requiresPhotoOnFail: false,
  requiresObservationOnFail: true,
  blocksStep: false,
  requiresSupervisor: false,
})

export default function Checklists() {
  const { armazemId, armazens, owners, checklists, upsert, remove, toast } = useStore()
  const conectado = isConnected()
  const [real, setReal] = useState<ChecklistTemplate[]>([])
  const [realArmazens, setRealArmazens] = useState<{ id: string; codigo: string; nome: string }[]>([])
  const [realOwners, setRealOwners] = useState<{ id: string; nome: string }[]>([])
  const [edit, setEdit] = useState<ChecklistTemplate | null>(null)
  const [isNovo, setIsNovo] = useState(false)

  const refetch = async () => setReal((await wmsApi.checklists()).map(mapRealChk))
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [cks, whs, ows] = await Promise.all([wmsApi.checklists(), wmsApi.warehouses(), wmsApi.owners()])
        if (!vivo) return
        setReal(cks.map(mapRealChk))
        setRealArmazens(whs.map((w) => ({ id: w.id, codigo: w.code, nome: w.name })))
        setRealOwners(ows.map((o) => ({ id: o.id, nome: o.nome })))
      } catch {
        /* mantém demo */
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const lista = conectado ? real : checklists
  const armazensOpts = conectado ? realArmazens : armazens.map((a) => ({ id: a.id, codigo: a.codigo, nome: a.nome }))
  const ownersOpts = conectado ? realOwners : owners.map((o) => ({ id: o.id, nome: o.nome }))
  const warehouseNovo = conectado ? realArmazens[0]?.id ?? '' : armazemId
  const nomeOwner = (id: string) => (conectado ? realOwners.find((o) => o.id === id)?.nome ?? id : ownerName(id))
  const codigoArmazem = (id: string) => armazensOpts.find((a) => a.id === id)?.codigo ?? id

  const salvar = async (item: ChecklistTemplate) => {
    if (!item.code.trim() || !item.name.trim()) {
      toast({ tipo: 'erro', titulo: 'Campos obrigatorios', texto: 'Codigo e nome do checklist sao obrigatorios.' })
      return
    }
    if (item.questions.some((q) => !q.text.trim())) {
      toast({ tipo: 'erro', titulo: 'Pergunta obrigatoria', texto: 'Toda pergunta precisa de texto operacional.' })
      return
    }
    if (conectado) {
      try {
        if (isNovo) await wmsApi.createChecklist(toDtoChk(item))
        else await wmsApi.updateChecklist(item.id, toDtoChk(item))
        await refetch()
      } catch (e) {
        toast({ tipo: 'erro', titulo: 'Falha ao salvar', texto: e instanceof Error ? e.message : 'Erro na API.' })
        return
      }
    } else {
      upsert('checklists', item)
    }
    toast({ tipo: 'sucesso', titulo: isNovo ? 'Checklist cadastrado' : 'Checklist atualizado', texto: item.code })
    setEdit(null)
    setIsNovo(false)
  }

  const removerChecklist = async (item: ChecklistTemplate) => {
    if (conectado) {
      try {
        await wmsApi.deleteChecklist(item.id)
        await refetch()
      } catch (e) {
        toast({ tipo: 'erro', titulo: 'Falha ao remover', texto: e instanceof Error ? e.message : 'Erro na API.' })
        return
      }
    } else {
      remove('checklists', item.id)
    }
    toast({ tipo: 'info', titulo: 'Checklist removido', texto: item.code })
  }

  const atualizarPergunta = (questionId: string, patch: Partial<ChecklistQuestion>) => {
    if (!edit) return
    setEdit({
      ...edit,
      questions: edit.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists operacionais"
        subtitle="Configure perguntas bloqueantes, evidencia obrigatoria e alcada de lider por fluxo"
      >
        <Badge tone="primary">{num(lista.length)} templates</Badge>
        {conectado && <Badge tone="ok" dot>dados reais</Badge>}
        <button className="btn-primary" onClick={() => { setEdit(novoTemplate(warehouseNovo)); setIsNovo(true) }}>
          <Plus className="h-4 w-4" /> Novo checklist
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Ativos" value={lista.filter((item) => item.active).length} />
        <Metric label="Com bloqueio" value={lista.filter((item) => item.questions.some((q) => q.blocksStep)).length} />
        <Metric label="Exigem foto" value={lista.filter((item) => item.questions.some((q) => q.requiresPhotoOnFail)).length} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Codigo</th>
                <th className="th">Checklist</th>
                <th className="th">Fluxo</th>
                <th className="th">Owner</th>
                <th className="th">Perguntas</th>
                <th className="th">Regras criticas</th>
                <th className="th">Status</th>
                <th className="th text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item) => {
                const bloqueantes = item.questions.filter((q) => q.blocksStep).length
                const fotos = item.questions.filter((q) => q.requiresPhotoOnFail).length
                return (
                  <tr key={item.id} className="row-hover">
                    <td className="td mono font-medium text-brand">{item.code}</td>
                    <td className="td">
                      <div>
                        <p className="font-medium text-ink">{item.name}</p>
                        <p className="text-xs text-ink-muted">v{item.version} · {codigoArmazem(item.warehouseId)}</p>
                      </div>
                    </td>
                    <td className="td"><Badge tone="info">{flowOptions.find((f) => f.value === item.flow)?.label}</Badge></td>
                    <td className="td">{item.ownerId ? nomeOwner(item.ownerId) : <span className="text-ink-muted">Todos</span>}</td>
                    <td className="td mono text-xs">{item.questions.length}</td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1.5">
                        {bloqueantes > 0 && <Badge tone="bad"><ShieldAlert className="h-3 w-3" /> {bloqueantes} bloqueiam</Badge>}
                        {fotos > 0 && <Badge tone="warn"><Camera className="h-3 w-3" /> {fotos} foto</Badge>}
                        {bloqueantes === 0 && fotos === 0 && <span className="text-xs text-ink-muted">Sem regra critica</span>}
                      </div>
                    </td>
                    <td className="td"><Badge tone={item.active ? 'ok' : 'neutral'} dot>{item.active ? 'Ativo' : 'Inativo'}</Badge></td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost p-2" onClick={() => { setEdit(structuredClone(item)); setIsNovo(false) }} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="btn-ghost p-2 text-bad hover:bg-bad-50" onClick={() => removerChecklist(item)} title="Remover">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {checklists.length === 0 && (
          <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Nenhum checklist configurado" />
        )}
      </div>

      {edit && (
        <Modal
          open
          onClose={() => { setEdit(null); setIsNovo(false) }}
          title={isNovo ? 'Novo checklist' : `Editar ${edit.code}`}
          subtitle="Regra operacional consumida pelo coletor/mobile"
          size="xl"
          footer={
            <>
              <button className="btn-outline" onClick={() => { setEdit(null); setIsNovo(false) }}>Cancelar</button>
              <button className="btn-primary" onClick={() => salvar(edit)}>Salvar checklist</button>
            </>
          }
        >
          <div className="space-y-6">
            <FormGrid cols={3}>
              <Field label="Codigo *" value={edit.code} onChange={(v) => setEdit({ ...edit, code: v.toUpperCase() })} mono placeholder="REC-CHEGADA" />
              <Field label="Nome *" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} placeholder="Checklist de chegada" />
              <SelectField label="Fluxo" value={edit.flow} onChange={(v) => setEdit({ ...edit, flow: v as ChecklistTemplate['flow'] })} options={flowOptions} />
              <SelectField label="Armazem" value={edit.warehouseId} onChange={(v) => setEdit({ ...edit, warehouseId: v })} options={armazensOpts.map((a) => ({ value: a.id, label: `${a.codigo} - ${a.nome}` }))} />
              <SelectField label="Owner" value={edit.ownerId ?? 'all'} onChange={(v) => setEdit({ ...edit, ownerId: v === 'all' ? null : v })} options={[{ value: 'all', label: 'Todos os owners' }, ...ownersOpts.map((o) => ({ value: o.id, label: o.nome }))]} />
              <SelectField label="Operação" value={edit.operacao ?? ''} onChange={(v) => setEdit({ ...edit, operacao: v || null })} options={operacaoOptions} />
              <SelectField label="Tipo de equipamento" value={edit.tipoEquipamento ?? ''} onChange={(v) => setEdit({ ...edit, tipoEquipamento: v || null })} options={equipamentoOptions} />
              <Field label="Versao" type="number" value={edit.version} onChange={(v) => setEdit({ ...edit, version: Number(v) || 1 })} />
            </FormGrid>

            <div className="rounded-xl border border-line px-4">
              <SettingRow title="Checklist ativo" desc="Somente templates ativos aparecem no fluxo operacional." on={edit.active} onToggle={() => setEdit({ ...edit, active: !edit.active })} />
              <SettingRow title="Falha pode bloquear OS" desc="Liga o comportamento que impede o operador de seguir em perguntas bloqueantes." on={edit.blocksOnFailure} onToggle={() => setEdit({ ...edit, blocksOnFailure: !edit.blocksOnFailure })} />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-brand">Perguntas</h3>
                <button className="btn-outline py-1.5 text-xs" onClick={() => setEdit({ ...edit, questions: [...edit.questions, novaPergunta()] })}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar pergunta
                </button>
              </div>

              <div className="space-y-3">
                {edit.questions.map((question, index) => (
                  <div key={question.id} className="rounded-xl border border-line bg-surface-sub p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Pergunta {index + 1}</p>
                        <p className="mt-1 text-sm text-ink-soft">Defina quando a resposta reprova e se isso trava a OS.</p>
                      </div>
                      <button
                        className="btn-ghost p-2 text-bad hover:bg-bad-50"
                        onClick={() => setEdit({ ...edit, questions: edit.questions.filter((q) => q.id !== question.id) })}
                        title="Remover pergunta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <FormGrid cols={2}>
                        <Field label="Texto da pergunta *" value={question.text} onChange={(v) => atualizarPergunta(question.id, { text: v })} placeholder="Embalagem esta integra?" />
                        <SelectField label="Tipo de resposta" value={question.type} onChange={(v) => atualizarPergunta(question.id, { type: v as ChecklistQuestion['type'], failValues: v === 'BOOLEAN' ? ['NO'] : ['NOK'] })} options={typeOptions} />
                        <Field label="Rotulo OK" value={question.okLabel ?? ''} onChange={(v) => atualizarPergunta(question.id, { okLabel: v })} placeholder="Conforme" />
                        <Field label="Rotulo falha" value={question.failLabel ?? ''} onChange={(v) => atualizarPergunta(question.id, { failLabel: v })} placeholder="Nao conforme" />
                      </FormGrid>

                      <div className="grid gap-3 md:grid-cols-4">
                        <RuleToggle label="Obrigatoria" icon={<ClipboardCheck className="h-4 w-4" />} active={question.required} onClick={() => atualizarPergunta(question.id, { required: !question.required })} />
                        <RuleToggle label="Bloqueia OS" icon={<ShieldAlert className="h-4 w-4" />} active={!!question.blocksStep} danger onClick={() => atualizarPergunta(question.id, { blocksStep: !question.blocksStep })} />
                        <RuleToggle label="Exige foto" icon={<Camera className="h-4 w-4" />} active={!!question.requiresPhotoOnFail} onClick={() => atualizarPergunta(question.id, { requiresPhotoOnFail: !question.requiresPhotoOnFail })} />
                        <RuleToggle label="Exige obs." icon={<MessageSquareText className="h-4 w-4" />} active={!!question.requiresObservationOnFail} onClick={() => atualizarPergunta(question.id, { requiresObservationOnFail: !question.requiresObservationOnFail })} />
                        <RuleToggle label="Permite N/A" icon={<ClipboardCheck className="h-4 w-4" />} active={question.permiteNA !== false} onClick={() => atualizarPergunta(question.id, { permiteNA: question.permiteNA === false })} />
                      </div>
                      <RuleToggle label="Exige decisao de lider" icon={<ShieldAlert className="h-4 w-4" />} active={!!question.requiresSupervisor} danger onClick={() => atualizarPergunta(question.id, { requiresSupervisor: !question.requiresSupervisor })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-brand">{value}</p>
    </div>
  )
}

function RuleToggle({
  label,
  icon,
  active,
  onClick,
  danger,
}: {
  label: string
  icon: ReactNode
  active: boolean
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
        active
          ? danger
            ? 'border-bad bg-bad-50 text-bad'
            : 'border-primary bg-primary-50 text-primary'
          : 'border-line bg-surface text-ink-muted hover:bg-surface-sub',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
