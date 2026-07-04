import { useEffect, useMemo, useState } from 'react'
import { MapPin, Plus, Trash2, Wand2, Search, Lock, LockOpen } from 'lucide-react'
import { useStore } from '../store/useStore'
import { armazemName, TIPO_ENDERECO_LABEL } from '../lib/mock'
import { Badge, EmptyState, Modal, PageHeader, Tab, Tabs } from '../components/ui'
import { Field, FormGrid, SelectField } from '../components/form'
import { MapaPreview } from '../components/MapaPreview'
import { cn, num } from '../lib/utils'
import {
  contarEnderecos,
  enderecoPadrao,
  gerarEnderecos,
  parseRuas,
  type GeradorParams,
} from '../lib/enderecos'
import type { Endereco, TipoEndereco } from '../lib/types'
import { isConnected, wmsApi, type WmsAddressDTO } from '../lib/wmsApi'

const TIPO_FROM_API: Record<string, TipoEndereco> = {
  PICKING: 'picking', PULMAO: 'pulmao', RECEBIMENTO: 'recebimento',
  EXPEDICAO: 'expedicao', AVARIA: 'avaria', QUARENTENA: 'quarentena',
}
function mapReal(a: WmsAddressDTO): Endereco {
  return {
    id: a.id,
    armazemId: a.warehouseId,
    zonaId: a.zoneId,
    codigo: a.code,
    rua: a.rua ?? '',
    coluna: a.coluna ?? 0,
    nivel: a.nivel ?? 0,
    posicao: a.posicao ?? 0,
    tipo: TIPO_FROM_API[a.type] ?? 'picking',
    capacidadePeso: a.capacidadePeso,
    capacidadePaletes: a.capacidadePaletes,
    bloqueado: a.blocked,
  }
}

export default function Enderecos() {
  const { enderecos, zonas, armazens, armazemId, upsert, remove, bulkAdd, toast } = useStore()
  const conectado = isConnected()
  const [real, setReal] = useState<Endereco[]>([])
  const [realZonas, setRealZonas] = useState<{ id: string; nome: string }[]>([])
  const [realWid, setRealWid] = useState('')
  const [realWhName, setRealWhName] = useState('')

  const refetch = async (wid: string) => {
    const [addrs, zs] = await Promise.all([wmsApi.addresses(wid), wmsApi.zones(wid)])
    setReal(addrs.map(mapReal))
    setRealZonas(zs.map((z) => ({ id: z.id, nome: z.name })))
  }

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const whs = await wmsApi.warehouses()
        if (!vivo || !whs.length) return
        setRealWid(whs[0].id)
        setRealWhName(whs[0].name)
        await refetch(whs[0].id)
      } catch {
        /* mantém demo */
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const armazem = conectado ? undefined : armazens.find((a) => a.id === armazemId)
  const nomeArmazem = conectado ? realWhName : armazemName(armazemId)
  const zonasArmazem = useMemo(
    () =>
      conectado
        ? realZonas
        : zonas.filter((z) => z.armazemId === armazemId).map((z) => ({ id: z.id, nome: z.nome })),
    [conectado, realZonas, zonas, armazemId],
  )

  const [aba, setAba] = useState('planta')
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoEndereco | 'todos'>('todos')
  const [gerador, setGerador] = useState(false)

  const doArmazem = useMemo(
    () => (conectado ? real : enderecos.filter((e) => e.armazemId === armazemId)),
    [conectado, real, enderecos, armazemId],
  )

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return doArmazem.filter((e) => {
      if (filtroTipo !== 'todos' && e.tipo !== filtroTipo) return false
      return !q || e.codigo.toLowerCase().includes(q)
    })
  }, [doArmazem, busca, filtroTipo])

  const bloqueados = doArmazem.filter((e) => e.bloqueado).length

  const toggleBloqueio = async (e: Endereco) => {
    if (!conectado) return upsert('enderecos', { ...e, bloqueado: !e.bloqueado })
    try {
      await wmsApi.updateAddress(e.id, { blocked: !e.bloqueado })
      await refetch(realWid)
    } catch (err) {
      toast({ tipo: 'erro', titulo: 'Falha', texto: String((err as Error).message) })
    }
  }

  const removeEndereco = async (e: Endereco) => {
    if (!conectado) return remove('enderecos', e.id)
    try {
      await wmsApi.deleteAddress(e.id)
      await refetch(realWid)
    } catch (err) {
      toast({ tipo: 'erro', titulo: 'Não removido', texto: String((err as Error).message) })
    }
  }

  const criarPadrao = () => {
    if (doArmazem.some((e) => e.codigo === 'PADRAO')) {
      toast({ tipo: 'aviso', titulo: 'Já existe', texto: 'Este armazém já tem o endereço PADRÃO.' })
      return
    }
    bulkAdd('enderecos', [enderecoPadrao(armazemId)])
    toast({ tipo: 'sucesso', titulo: 'Endereço PADRÃO criado', texto: 'Modo simples — endereço único.' })
  }

  const limpar = () => {
    if (conectado) {
      toast({ tipo: 'aviso', titulo: 'Indisponível', texto: 'Remoção em massa via cadastro real ainda não habilitada.' })
      return
    }
    doArmazem.forEach((e) => remove('enderecos', e.id))
    toast({ tipo: 'info', titulo: 'Endereços removidos', texto: `${doArmazem.length} endereços de ${nomeArmazem}` })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Endereços" subtitle={`Posições físicas de ${nomeArmazem} · código RUA-COLUNA-NÍVEL-POSIÇÃO`}>
        <Badge tone="neutral">{num(doArmazem.length)} endereços</Badge>
        {conectado && <Badge tone="ok">dados reais · WMS</Badge>}
        {bloqueados > 0 && <Badge tone="bad">{num(bloqueados)} bloqueados</Badge>}
        {armazem?.modo === 'simples' && (
          <button className="btn-outline" onClick={criarPadrao}>
            <Plus className="h-4 w-4" /> Endereço PADRÃO
          </button>
        )}
        <button className="btn-primary" onClick={() => setGerador(true)}>
          <Wand2 className="h-4 w-4" /> Gerar endereços
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="px-4 pt-1 flex items-center justify-between">
          <Tabs value={aba} onChange={setAba}>
            <Tab id="planta">Planta 2D</Tab>
            <Tab id="lista">Lista ({num(doArmazem.length)})</Tab>
          </Tabs>
          {doArmazem.length > 0 && (
            <button className="btn-ghost text-bad hover:bg-bad-50 text-xs" onClick={limpar}>
              <Trash2 className="h-3.5 w-3.5" /> Limpar armazém
            </button>
          )}
        </div>

        <div className="p-5">
          {aba === 'planta' && <MapaPreview enderecos={doArmazem} />}

          {aba === 'lista' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-sub px-3 py-2 flex-1">
                  <Search className="h-4 w-4 text-ink-muted" />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar endereço…" className="bg-transparent outline-none flex-1 text-sm mono" />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(['todos', ...Object.keys(TIPO_ENDERECO_LABEL)] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFiltroTipo(t as TipoEndereco | 'todos')}
                      className={cn('chip whitespace-nowrap cursor-pointer transition-colors', filtroTipo === t ? 'bg-primary text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200')}
                    >
                      {t === 'todos' ? 'Todos' : TIPO_ENDERECO_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto -mx-5">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Endereço</th>
                      <th className="th">Rua/Col/Nível/Pos</th>
                      <th className="th">Zona</th>
                      <th className="th">Tipo</th>
                      <th className="th text-right">Cap. (kg / pal)</th>
                      <th className="th">Status</th>
                      <th className="th text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((e) => (
                      <tr key={e.id} className="row-hover">
                        <td className="td mono font-medium text-brand">{e.codigo}</td>
                        <td className="td mono text-xs">{e.rua} · {e.coluna} · {e.nivel} · {e.posicao}</td>
                        <td className="td text-xs">{zonasArmazem.find((z) => z.id === e.zonaId)?.nome ?? '—'}</td>
                        <td className="td"><Badge tone="primary">{TIPO_ENDERECO_LABEL[e.tipo]}</Badge></td>
                        <td className="td text-right mono text-xs">{num(e.capacidadePeso)} / {e.capacidadePaletes}</td>
                        <td className="td">
                          <Badge tone={e.bloqueado ? 'bad' : 'ok'} dot>{e.bloqueado ? 'Bloqueado' : 'Livre'}</Badge>
                        </td>
                        <td className="td">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn-ghost p-2"
                              title={e.bloqueado ? 'Desbloquear' : 'Bloquear'}
                              onClick={() => toggleBloqueio(e)}
                            >
                              {e.bloqueado ? <LockOpen className="h-4 w-4 text-ok" /> : <Lock className="h-4 w-4" />}
                            </button>
                            <button className="btn-ghost p-2 text-bad hover:bg-bad-50" title="Remover" onClick={() => removeEndereco(e)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lista.length === 0 && <EmptyState icon={<MapPin className="h-6 w-6" />} title="Nenhum endereço" text="Use “Gerar endereços” para criar posições em massa." />}
            </div>
          )}
        </div>
      </div>

      {gerador && (
        <GeradorModal
          armazemId={armazemId}
          zonas={zonasArmazem.map((z) => ({ value: z.id, label: z.nome }))}
          onClose={() => setGerador(false)}
          onGerar={async (params) => {
            const novos = gerarEnderecos(params)
            if (conectado) {
              const dtos = novos.map((e) => ({
                code: e.codigo,
                type: e.tipo,
                zoneId: params.zonaId ?? undefined,
                rua: e.rua,
                coluna: e.coluna,
                nivel: e.nivel,
                posicao: e.posicao,
                capacidadePeso: e.capacidadePeso,
                capacidadePaletes: e.capacidadePaletes,
              }))
              try {
                const r = await wmsApi.bulkAddresses(realWid, dtos)
                await refetch(realWid)
                toast({
                  tipo: 'sucesso',
                  titulo: `${r.created} endereços gerados`,
                  texto: r.ignored > 0 ? `${r.ignored} ignorados (já existiam)` : nomeArmazem,
                })
              } catch (err) {
                toast({ tipo: 'erro', titulo: 'Falha ao gerar', texto: String((err as Error).message) })
              }
              setGerador(false)
              return
            }
            const existentes = new Set(doArmazem.map((e) => e.codigo))
            const unicos = novos.filter((e) => !existentes.has(e.codigo))
            const dup = novos.length - unicos.length
            bulkAdd('enderecos', unicos)
            toast({
              tipo: 'sucesso',
              titulo: `${unicos.length} endereços gerados`,
              texto: dup > 0 ? `${dup} ignorados (código já existente)` : nomeArmazem,
            })
            setGerador(false)
          }}
        />
      )}
    </div>
  )
}

function GeradorModal({
  armazemId,
  zonas,
  onClose,
  onGerar,
}: {
  armazemId: string
  zonas: { value: string; label: string }[]
  onClose: () => void
  onGerar: (p: GeradorParams) => void
}) {
  const [ruasTxt, setRuasTxt] = useState('A-D')
  const [colunas, setColunas] = useState(10)
  const [niveis, setNiveis] = useState(4)
  const [posicoes, setPosicoes] = useState(1)
  const [tipo, setTipo] = useState<TipoEndereco>('picking')
  const [zonaId, setZonaId] = useState<string>(zonas[0]?.value ?? '')
  const [capPeso, setCapPeso] = useState(800)
  const [capPal, setCapPal] = useState(1)

  const ruas = useMemo(() => parseRuas(ruasTxt), [ruasTxt])
  const total = contarEnderecos({ ruas, colunas, niveis, posicoes })
  const n = (v: string) => Math.max(0, Number(v) || 0)

  const exemplo = ruas.length
    ? `${ruas[0]}-01-01-01 … ${ruas[ruas.length - 1]}-${String(colunas).padStart(2, '0')}-${String(niveis).padStart(2, '0')}-${String(posicoes).padStart(2, '0')}`
    : '—'

  return (
    <Modal
      open
      onClose={onClose}
      title="Gerar endereços em massa"
      subtitle="Parâmetros da estante — código canônico RUA-COLUNA-NÍVEL-POSIÇÃO"
      size="lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={total === 0}
            onClick={() =>
              onGerar({
                armazemId,
                zonaId: zonaId || null,
                ruas,
                colunas,
                niveis,
                posicoes,
                tipo,
                capacidadePeso: capPeso,
                capacidadePaletes: capPal,
              })
            }
          >
            <Wand2 className="h-4 w-4" /> Gerar {total > 0 ? num(total) : ''} endereços
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field
          label="Ruas / corredores"
          value={ruasTxt}
          onChange={setRuasTxt}
          mono
          placeholder="A-D ou A,B,C"
          hint={`Intervalo (A-D) ou lista (A,B,C). Reconhecidas: ${ruas.join(', ') || '—'}`}
        />
        <FormGrid cols={3}>
          <Field label="Colunas por rua" type="number" value={colunas} onChange={(v) => setColunas(n(v))} />
          <Field label="Níveis por coluna" type="number" value={niveis} onChange={(v) => setNiveis(n(v))} />
          <Field label="Posições por nível" type="number" value={posicoes} onChange={(v) => setPosicoes(n(v))} hint="Profundidade / apartamentos" />
        </FormGrid>
        <FormGrid cols={2}>
          <SelectField label="Tipo de endereço" value={tipo} onChange={(v) => setTipo(v as TipoEndereco)} options={Object.entries(TIPO_ENDERECO_LABEL).map(([value, label]) => ({ value, label }))} />
          <SelectField label="Zona" value={zonaId} onChange={setZonaId} options={[{ value: '', label: '— Sem zona —' }, ...zonas]} />
        </FormGrid>
        <FormGrid cols={2}>
          <Field label="Capacidade (kg)" type="number" value={capPeso} onChange={(v) => setCapPeso(n(v))} />
          <Field label="Capacidade (paletes)" type="number" value={capPal} onChange={(v) => setCapPal(n(v))} />
        </FormGrid>

        <div className="rounded-xl bg-surface-sub border border-line p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-muted">Serão gerados</p>
            <p className="text-2xl font-bold text-brand mono">{num(total)} endereços</p>
            <p className="text-[11px] text-ink-muted mono mt-0.5">{exemplo}</p>
          </div>
          <Badge tone={total > 5000 ? 'warn' : 'primary'}>
            {ruas.length} ruas × {colunas} col × {niveis} níveis × {posicoes} pos
          </Badge>
        </div>
        {total > 5000 && (
          <p className="text-xs text-warn">Volume alto — em produção, gere por zona/rua para manter a planta navegável.</p>
        )}
      </div>
    </Modal>
  )
}
