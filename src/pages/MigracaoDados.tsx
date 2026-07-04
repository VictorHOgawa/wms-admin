import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  DatabaseZap,
  Eye,
  FileCheck2,
  FileJson2,
  FileSpreadsheet,
  FileText,
  FolderInput,
  Layers3,
  ListChecks,
  Package,
  RefreshCcw,
  SearchCheck,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Modal, PageHeader, Progress, Tab, Tabs } from '../components/ui'
import { Field, FormGrid, FormSection, SelectField } from '../components/form'
import { useStore } from '../store/useStore'
import { cn, num } from '../lib/utils'
import { DEMO_OWNERS, DEMO_SKUS } from '../../../wms-shared-demo'

type Formato = 'csv' | 'json' | 'xlsx'
type Aba = 'lotes' | 'revisao' | 'mapeamento' | 'validacoes'
type StatusImportacao = 'triagem' | 'mapeando' | 'revisao' | 'pronto'
type EntidadeMigracao = 'SKU' | 'Endereços' | 'Saldo inicial' | 'Lotes' | 'Fiscal BR' | 'Campos extras'
type EtapaAssistente = 'arquivo' | 'analise' | 'mapeamento' | 'validacao'
type DecisaoMapeamento = 'confirmar' | 'revisar' | 'bloquear'

interface LoteImportacao {
  id: string
  cliente: string
  origem: string
  formato: Formato
  arquivo: string
  tamanho: string
  registros: number
  status: StatusImportacao
  cobertura: number
  confianca: number
  conflitos: number
  pendencias: number
  camposExtras: number
  entidades: EntidadeMigracao[]
}

interface CampoMapeado {
  legado: string
  amostra: string
  destino: string
  entidade: string
  transformacao: string
  confianca: number
  status: 'confirmado' | 'revisar' | 'bloqueado'
}

interface CampoMapeadoRevisado extends CampoMapeado {
  destinoSugerido: string
  decisao: DecisaoMapeamento
  observacao: string
}

interface ValidacaoWms {
  titulo: string
  descricao: string
  resultado: string
  tone: 'ok' | 'warn' | 'bad' | 'info'
}

const FORMATO_LABEL: Record<Formato, string> = {
  csv: 'CSV',
  json: 'JSON',
  xlsx: 'Excel',
}

const LOTES_INICIAIS: LoteImportacao[] = [
  {
    id: 'IMP-2401',
    cliente: 'NanoTech Eletronicos',
    origem: 'WMS legado + exportação de saldos',
    formato: 'csv',
    arquivo: 'estoque_nano_cdsp.csv',
    tamanho: '1,8 MB',
    registros: 1284,
    status: 'pronto',
    cobertura: 96,
    confianca: 94,
    conflitos: 12,
    pendencias: 4,
    camposExtras: 6,
    entidades: ['SKU', 'Endereços', 'Saldo inicial', 'Fiscal BR', 'Campos extras'],
  },
  {
    id: 'IMP-2402',
    cliente: 'Bella Cosmeticos',
    origem: 'ERP + planilha comercial',
    formato: 'xlsx',
    arquivo: 'implantacao_bella_skus.xlsx',
    tamanho: '940 KB',
    registros: 842,
    status: 'mapeando',
    cobertura: 89,
    confianca: 88,
    conflitos: 7,
    pendencias: 11,
    camposExtras: 4,
    entidades: ['SKU', 'Lotes', 'Fiscal BR', 'Campos extras'],
  },
  {
    id: 'IMP-2403',
    cliente: 'Verde Alimentos',
    origem: 'Exportação JSON do WMS atual',
    formato: 'json',
    arquivo: 'verde_wms_export.json',
    tamanho: '612 KB',
    registros: 453,
    status: 'revisao',
    cobertura: 93,
    confianca: 91,
    conflitos: 3,
    pendencias: 5,
    camposExtras: 9,
    entidades: ['SKU', 'Endereços', 'Saldo inicial', 'Lotes', 'Fiscal BR', 'Campos extras'],
  },
]

const CAMPOS_MAPEADOS: CampoMapeado[] = [
  {
    legado: 'sku_product',
    amostra: 'NT-FONE-01',
    destino: 'products.codigo',
    entidade: 'SKU',
    transformacao: 'Normalizar como código único do produto',
    confianca: 98,
    status: 'confirmado',
  },
  {
    legado: 'name',
    amostra: 'Fone Bluetooth Pulse X',
    destino: 'products.descricao',
    entidade: 'SKU',
    transformacao: 'Interpretado como descrição comercial',
    confianca: 96,
    status: 'confirmado',
  },
  {
    legado: 'barcode',
    amostra: '7891000102413',
    destino: 'products.ean',
    entidade: 'SKU',
    transformacao: 'Somente dígitos, validação GTIN posterior',
    confianca: 94,
    status: 'confirmado',
  },
  {
    legado: 'box_qty',
    amostra: 'CX/6',
    destino: 'products.unidadesPorCaixa',
    entidade: 'Conversão UM',
    transformacao: 'Extrair 6 e gravar unidade-base como UN',
    confianca: 87,
    status: 'revisar',
  },
  {
    legado: 'bin_location',
    amostra: 'A1-03-02',
    destino: 'locations.codigo',
    entidade: 'Endereço',
    transformacao: 'Converter para padrão A-01-03-02',
    confianca: 84,
    status: 'revisar',
  },
  {
    legado: 'available_qty',
    amostra: '47',
    destino: 'stock_balances.quantity_available',
    entidade: 'Saldo',
    transformacao: 'Criar movimento ADJUST_POS de implantação',
    confianca: 92,
    status: 'confirmado',
  },
  {
    legado: 'lot_exp',
    amostra: '31/10/2026',
    destino: 'lots.expiry_date',
    entidade: 'Lote',
    transformacao: 'Converter data BR para ISO e ligar FEFO no SKU',
    confianca: 81,
    status: 'revisar',
  },
  {
    legado: 'hs_code',
    amostra: '8518.30.00',
    destino: 'products.ncm',
    entidade: 'Fiscal BR',
    transformacao: 'Mapear HS code para NCM validável',
    confianca: 73,
    status: 'bloqueado',
  },
]

const VALIDACOES: ValidacaoWms[] = [
  {
    titulo: 'Identificação do SKU',
    descricao: 'Código, descrição, unidade, código de barras e dono do estoque precisam existir antes do saldo.',
    resultado: '1.214 linhas completas, 70 exigem revisão de unidade ou EAN.',
    tone: 'warn',
  },
  {
    titulo: 'Endereço e armazém',
    descricao: 'Todo saldo precisa apontar para warehouse_id e location_id. No modo simples, cai em PADRAO.',
    resultado: '43 endereços serão criados, 3 códigos precisam padronização.',
    tone: 'info',
  },
  {
    titulo: 'Saldo inicial auditável',
    descricao: 'Quantidade importada não deve nascer como UPDATE direto em saldo; deve gerar movimento de implantação.',
    resultado: 'Plano cria stock_movements de tipo ADJUST_POS/ADJUST_NEG com reason code MIGRACAO.',
    tone: 'ok',
  },
  {
    titulo: 'Lote, validade e série',
    descricao: 'Se o arquivo trouxer lote ou validade, o SKU precisa ativar controle para FEFO e rastreabilidade.',
    resultado: '18 SKUs ativariam controle de validade; 2 linhas bloqueadas por data inválida.',
    tone: 'warn',
  },
  {
    titulo: 'Fiscal brasileiro',
    descricao: 'NCM, CEST e origem ICMS devem ser tratados como pendência de cadastro, não como campo opcional irrelevante.',
    resultado: 'NCM ausente em 22 SKUs. Carga final bloqueia estes itens para entrada fiscal.',
    tone: 'bad',
  },
  {
    titulo: 'Campos extras do legado',
    descricao: 'Dados sem destino claro podem virar atributos customizados, desde que tenham dono e tipo definido.',
    resultado: '6 campos extras sugeridos: canal, coleção, marca, temperatura, shelf_life_dias, id_legado.',
    tone: 'info',
  },
]

const EXEMPLO_CSV = [
  {
    sku_product: 'NT-FONE-01',
    name: 'Fone Bluetooth Pulse X',
    barcode: '7891000102413',
    box_qty: 'CX/6',
    bin_location: 'A1-03-02',
    available_qty: '47',
    lot_exp: '',
    hs_code: '8518.30.00',
  },
  {
    sku_product: 'VD-GRAN-500',
    name: 'Granola Castanhas 500g',
    barcode: '7898800100451',
    box_qty: 'CX/12',
    bin_location: 'B2-01-01',
    available_qty: '120',
    lot_exp: '31/10/2026',
    hs_code: '1904.10.00',
  },
]

const DESTINOS_CANONICOS = [
  'products.codigo',
  'products.descricao',
  'products.ean',
  'products.unidade',
  'products.unidadesPorCaixa',
  'products.ncm',
  'products.cest',
  'products.origem',
  'locations.codigo',
  'locations.tipo',
  'stock_balances.quantity_on_hand',
  'stock_balances.quantity_available',
  'lots.lot_code',
  'lots.expiry_date',
  'custom_attributes.*',
]

const DECISOES_MAPEAMENTO: { value: DecisaoMapeamento; label: string }[] = [
  { value: 'confirmar', label: 'Confirmado para carga' },
  { value: 'revisar', label: 'Revisar antes da carga' },
  { value: 'bloquear', label: 'Bloquear carga deste campo' },
]

const criarMapaInicial = (): CampoMapeadoRevisado[] =>
  CAMPOS_MAPEADOS.map((campo) => ({
    ...campo,
    destinoSugerido: campo.destino,
    decisao: campo.status === 'bloqueado' ? 'bloquear' : campo.status === 'revisar' ? 'revisar' : 'confirmar',
    observacao:
      campo.status === 'bloqueado'
        ? 'Validar com responsável do cadastro antes de liberar.'
        : campo.status === 'revisar'
          ? 'Conferir regra de normalização e amostra.'
          : 'Aceito conforme sugestão da IA.',
  }))

const slugImportacao = (id: string) => id.toLowerCase()

const resumoMapa = (campos: CampoMapeadoRevisado[]) => {
  const alterados = campos.filter((campo) => campo.destino !== campo.destinoSugerido).length
  const revisar = campos.filter((campo) => campo.decisao === 'revisar').length
  const bloqueados = campos.filter((campo) => campo.decisao === 'bloquear').length
  const extras = campos.filter((campo) => campo.destino === 'custom_attributes.*').length
  const confirmados = campos.length - revisar - bloqueados

  return { alterados, revisar, bloqueados, extras, confirmados }
}

const ETAPAS_FLUXO = [
  'Upload',
  'Leitura IA',
  'Mapa de campos',
  'Validação WMS',
  'Pré-carga',
  'Confirmação',
]

export default function MigracaoDados() {
  const { toast } = useStore()
  const navigate = useNavigate()
  const { loteSlug } = useParams()
  const [aba, setAba] = useState<Aba>(loteSlug ? 'revisao' : 'lotes')
  const [lotes, setLotes] = useState(LOTES_INICIAIS)
  const [selecionadoManual, setSelecionado] = useState<LoteImportacao>(LOTES_INICIAIS[0])
  const [mapasPorLote, setMapasPorLote] = useState<Record<string, CampoMapeadoRevisado[]>>(() =>
    LOTES_INICIAIS.reduce<Record<string, CampoMapeadoRevisado[]>>((acc, lote) => {
      acc[lote.id] = criarMapaInicial()
      return acc
    }, {}),
  )
  const [abrirAssistente, setAbrirAssistente] = useState(false)

  const totalRegistros = useMemo(
    () => lotes.reduce((acc, item) => acc + item.registros, 0),
    [lotes],
  )

  const selecionado = useMemo(() => {
    if (!loteSlug) return selecionadoManual
    return lotes.find((item) => slugImportacao(item.id) === loteSlug.toLowerCase()) ?? selecionadoManual
  }, [loteSlug, lotes, selecionadoManual])

  const mapaSelecionado = mapasPorLote[selecionado.id] ?? criarMapaInicial()
  const resumoSelecionado = resumoMapa(mapaSelecionado)

  const atualizarMapaSelecionado = (legado: string, patch: Partial<CampoMapeadoRevisado>) => {
    setMapasPorLote((atual) => ({
      ...atual,
      [selecionado.id]: (atual[selecionado.id] ?? criarMapaInicial()).map((campo) =>
        campo.legado === legado ? { ...campo, ...patch } : campo,
      ),
    }))
  }

  const criarLote = (payload: {
    cliente: string
    origem: string
    formato: Formato
    arquivo: string
    tamanho: string
    registros: number
    mapa: CampoMapeadoRevisado[]
  }) => {
    const novo: LoteImportacao = {
      id: `IMP-${2400 + lotes.length + 1}`,
      cliente: DEMO_OWNERS.find((owner) => owner.id === payload.cliente)?.nome ?? 'Cliente importado',
      origem: payload.origem,
      formato: payload.formato,
      arquivo: payload.arquivo,
      tamanho: payload.tamanho,
      registros: payload.registros,
      status: 'revisao',
      cobertura: payload.formato === 'json' ? 94 : payload.formato === 'xlsx' ? 90 : 92,
      confianca: payload.formato === 'json' ? 93 : payload.formato === 'xlsx' ? 87 : 91,
      conflitos: Math.max(2, Math.round(payload.registros * 0.012)),
      pendencias: Math.max(3, Math.round(payload.registros * 0.008)),
      camposExtras: payload.formato === 'json' ? 9 : 6,
      entidades: ['SKU', 'Endereços', 'Saldo inicial', 'Lotes', 'Fiscal BR', 'Campos extras'],
    }

    setLotes((atual) => [novo, ...atual])
    setMapasPorLote((atual) => ({ ...atual, [novo.id]: payload.mapa }))
    setSelecionado(novo)
    setAbrirAssistente(false)
    setAba('revisao')
    navigate(`/migracao-dados/${slugImportacao(novo.id)}`)
    toast({
      tipo: 'sucesso',
      titulo: 'Importação pronta para revisão',
      texto: `${novo.id} recebeu mapa de campos, validações WMS e plano de pré-carga.`,
    })
  }

  const reprocessar = (lote: LoteImportacao) => {
    setLotes((atual) =>
      atual.map((item) =>
        item.id === lote.id
          ? {
              ...item,
              status: 'mapeando',
              confianca: Math.min(99, item.confianca + 2),
              conflitos: Math.max(0, item.conflitos - 2),
            }
          : item,
      ),
    )
    setSelecionado((atual) =>
      atual.id === lote.id
        ? { ...atual, status: 'mapeando', confianca: Math.min(99, atual.confianca + 2), conflitos: Math.max(0, atual.conflitos - 2) }
        : atual,
    )
    setMapasPorLote((atual) => ({ ...atual, [lote.id]: criarMapaInicial() }))
    toast({
      tipo: 'info',
      titulo: 'Reprocessamento iniciado',
      texto: `${lote.id} foi reenviado para inferência de campos e regras de normalização.`,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Migração de Dados e Onboarding"
        subtitle="Importe CSV, Excel ou JSON do WMS/ERP legado, mapeie campos com IA e valide a pré-carga antes do go-live."
      >
        <Badge tone="primary">{num(totalRegistros)} registros em análise</Badge>
        <button className="btn-primary" onClick={() => setAbrirAssistente(true)}>
          <Upload className="h-4 w-4" /> Nova importação
        </button>
      </PageHeader>

      <div className="grid xl:grid-cols-[1.35fr_0.9fr] gap-5">
        <div className="card p-5 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <p className="text-sm font-semibold">Assistente de adequação entre legado e Integra WMS</p>
              </div>
              <p className="text-sm text-ink-muted mt-2 max-w-3xl">
                O arquivo entra em uma área de staging. A IA sugere equivalência entre nomes diferentes, separa dados extras,
                aponta lacunas obrigatórias e gera um plano de carga sem gravar saldo direto no banco oficial.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center min-w-[260px]">
              <HeroMetric label="Cobertura" value={`${selecionado.cobertura}%`} />
              <HeroMetric label="Confiança" value={`${selecionado.confianca}%`} />
              <HeroMetric label="Pendências" value={`${selecionado.pendencias}`} tone="warn" />
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            <FlowCard
              icon={<FolderInput className="h-4 w-4" />}
              title="Entrada flexível"
              text="CSV, XLSX e JSON são aceitos como fonte; o formato só muda a estratégia de leitura."
            />
            <FlowCard
              icon={<BrainCircuit className="h-4 w-4" />}
              title="Interpretação assistida"
              text="name, SKU_product, cod_item e outros aliases viram campos técnicos revisáveis."
            />
            <FlowCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Pré-carga governada"
              text="A confirmação final exige validação de SKU, endereço, lote, fiscal e saldo inicial."
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand">Contrato de migração</p>
              <p className="text-xs text-ink-muted mt-1">O que a tela precisa garantir antes da carga definitiva</p>
            </div>
            <Badge tone="ok">auditável</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {[
              'Nenhum saldo nasce sem movimento de implantação e reason code.',
              'Campo obrigatório ausente vira pendência bloqueante, não ajuste silencioso.',
              'Campos extras do cliente são catalogados como atributo customizado ou descartados com justificativa.',
              'Fiscal BR fica junto do cadastro mestre para não quebrar entrada, saída e SPED depois.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-ink-soft">
                <CheckCircle2 className="h-4 w-4 text-ok mt-0.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 pt-1">
          <Tabs value={aba} onChange={(value) => setAba(value as Aba)}>
            <Tab id="lotes">Lotes de importação</Tab>
            <Tab id="revisao">Revisão completa</Tab>
            <Tab id="mapeamento">Mapeamento assistido</Tab>
            <Tab id="validacoes">Validações WMS</Tab>
          </Tabs>
        </div>

        <div className="p-5">
          {aba === 'lotes' && (
            <div className="grid xl:grid-cols-[1.45fr_0.9fr] gap-5">
              <div className="space-y-3">
                {lotes.map((lote) => (
                  <LoteCard
                    key={lote.id}
                    lote={lote}
                    ativo={selecionado.id === lote.id}
                    onSelect={() => {
                      setSelecionado(lote)
                      setAba('revisao')
                      navigate(`/migracao-dados/${slugImportacao(lote.id)}`)
                    }}
                    onReprocessar={() => reprocessar(lote)}
                  />
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-line p-4 bg-surface-sub">
                  <p className="text-sm font-semibold text-brand">Exemplo de arquivo aceito</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Um CSV de implantação pode misturar SKU, endereço, saldo e fiscal. A tela separa isso por entidade.
                  </p>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
                    <table className="w-full min-w-[640px]">
                      <thead>
                        <tr>
                          {Object.keys(EXEMPLO_CSV[0]).map((coluna) => (
                            <th key={coluna} className="th">{coluna}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {EXEMPLO_CSV.map((row) => (
                          <tr key={row.sku_product} className="row-hover">
                            {Object.values(row).map((valor, index) => (
                              <td key={`${row.sku_product}-${index}`} className="td mono text-xs">{valor || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-line p-4">
                  <p className="text-sm font-semibold text-brand">Cadastros afetados</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['Produtos', 'Owners', 'Endereços', 'Lotes', 'Saldos', 'Movimentos', 'Fiscal'].map((item, index) => (
                      <Badge key={item} tone={index < 2 ? 'primary' : index < 5 ? 'info' : 'warn'}>
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <Link to="/produtos" className="btn-outline w-full mt-4 py-2.5 text-sm">
                    Ver cadastro mestre de produtos
                  </Link>
                </div>
              </div>
            </div>
          )}

          {aba === 'revisao' && (
            <RevisaoCompleta
              lote={selecionado}
              mapa={mapaSelecionado}
              resumo={resumoSelecionado}
              onAbrirMapeamento={() => setAba('mapeamento')}
            />
          )}
          {aba === 'mapeamento' && (
            <MapeamentoAssistido
              mapa={mapaSelecionado}
              resumo={resumoSelecionado}
              onChange={atualizarMapaSelecionado}
            />
          )}
          {aba === 'validacoes' && <ValidacoesWms />}
        </div>
      </div>

      {abrirAssistente && <AssistenteImportacao onClose={() => setAbrirAssistente(false)} onConfirm={criarLote} />}
    </div>
  )
}

function LoteCard({
  lote,
  ativo,
  onSelect,
  onReprocessar,
}: {
  lote: LoteImportacao
  ativo: boolean
  onSelect: () => void
  onReprocessar: () => void
}) {
  return (
    <div className={cn('rounded-2xl border p-4 transition-colors', ativo ? 'border-primary/30 bg-primary-50/40' : 'border-line bg-white')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-brand mono">{lote.id}</p>
            <Badge tone={statusTone(lote.status)}>{statusLabel(lote.status)}</Badge>
            <Badge tone="neutral">{FORMATO_LABEL[lote.formato]}</Badge>
          </div>
          <p className="text-sm text-ink-soft mt-1">{lote.cliente}</p>
          <p className="text-xs text-ink-muted mt-1 truncate">{lote.arquivo} · {lote.tamanho} · {lote.origem}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-brand mono">{num(lote.registros)}</p>
          <p className="text-xs text-ink-muted">registros</p>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-4 gap-3">
        <MiniMetric label="Cobertura" value={`${lote.cobertura}%`} />
        <MiniMetric label="Confiança IA" value={`${lote.confianca}%`} />
        <MiniMetric label="Conflitos" value={`${lote.conflitos}`} tone="warn" />
        <MiniMetric label="Extras" value={`${lote.camposExtras}`} tone="info" />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {lote.entidades.slice(0, 5).map((entidade) => (
            <span key={entidade} className="chip bg-slate-100 text-ink-soft">{entidade}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline py-2 px-3 text-xs" onClick={onSelect}>
            <Eye className="h-3.5 w-3.5" /> Revisar
          </button>
          <button className="btn-primary py-2 px-3 text-xs" onClick={onReprocessar}>
            <RefreshCcw className="h-3.5 w-3.5" /> Reprocessar
          </button>
        </div>
      </div>
    </div>
  )
}

function RevisaoCompleta({
  lote,
  mapa,
  resumo,
  onAbrirMapeamento,
}: {
  lote: LoteImportacao
  mapa: CampoMapeadoRevisado[]
  resumo: ReturnType<typeof resumoMapa>
  onAbrirMapeamento: () => void
}) {
  return (
    <div className="grid xl:grid-cols-[1.25fr_0.9fr] gap-5">
      <div className="space-y-5">
        <div className="rounded-2xl border border-line p-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base font-semibold text-brand mono">{lote.id}</p>
                <Badge tone={statusTone(lote.status)}>{statusLabel(lote.status)}</Badge>
              </div>
              <p className="text-sm text-ink-soft mt-1">{lote.cliente}</p>
              <p className="text-xs text-ink-muted mt-1">{lote.arquivo} · {FORMATO_LABEL[lote.formato]} · {lote.origem}</p>
              <Link
                to={`/migracao-dados/${slugImportacao(lote.id)}`}
                className="inline-flex mt-2 text-xs font-medium text-primary hover:text-primary-dark"
              >
                /migracao-dados/{slugImportacao(lote.id)}
              </Link>
            </div>
            <button className="btn-primary" onClick={onAbrirMapeamento}>
              <Wand2 className="h-4 w-4" /> Conferir mapa de campos
            </button>
          </div>

          <div className="mt-5 grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniMetric label="Registros" value={num(lote.registros)} />
            <MiniMetric label="Cobertura" value={`${lote.cobertura}%`} />
            <MiniMetric label="Confiança" value={`${lote.confianca}%`} />
            <MiniMetric label="Conflitos" value={`${lote.conflitos}`} tone="warn" />
            <MiniMetric label="Bloqueios" value={`${lote.pendencias}`} tone="bad" />
            <MiniMetric label="Mapa alterado" value={`${resumo.alterados}`} tone={resumo.alterados > 0 ? 'info' : 'neutral'} />
          </div>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-brand">Esteira de onboarding</p>
            <Badge tone="info">pré-carga</Badge>
          </div>
          <div className="mt-4 grid md:grid-cols-6 gap-2">
            {ETAPAS_FLUXO.map((etapa, index) => (
              <div key={etapa} className="relative rounded-xl border border-line bg-surface-sub p-3 min-h-[92px]">
                <div className={cn('h-7 w-7 rounded-lg grid place-items-center text-xs font-semibold', index < 4 ? 'bg-primary text-white' : 'bg-slate-200 text-ink-soft')}>
                  {index + 1}
                </div>
                <p className="text-xs font-medium text-brand mt-3">{etapa}</p>
                <p className="text-[11px] text-ink-muted mt-1">{index < 4 ? 'concluído' : 'pendente'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-surface-sub flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-brand">Mapa auditado do lote</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="ok">{resumo.confirmados} confirmados</Badge>
              <Badge tone={resumo.revisar > 0 ? 'warn' : 'neutral'}>{resumo.revisar} em revisão</Badge>
              <Badge tone={resumo.bloqueados > 0 ? 'bad' : 'neutral'}>{resumo.bloqueados} bloqueios</Badge>
            </div>
          </div>
          <PlanilhaResumoMapeamento campos={mapa} />
        </div>

        <div className="rounded-2xl border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-surface-sub flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-brand">Pré-visualização normalizada</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="th">SKU</th>
                  <th className="th">Descrição</th>
                  <th className="th">Endereço</th>
                  <th className="th">Saldo</th>
                  <th className="th">Lote / validade</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_SKUS.slice(0, 5).map((sku, index) => (
                  <tr key={`${lote.id}-${sku.id}`} className="row-hover">
                    <td className="td mono font-medium text-brand">{sku.codigo}</td>
                    <td className="td">{sku.descricao}</td>
                    <td className="td mono text-xs">{index === 3 ? 'PADRAO' : `A-0${index + 1}-02-01`}</td>
                    <td className="td mono">{[47, 120, 18, 0, 64][index]}</td>
                    <td className="td">{index === 1 ? 'LT-2408 · 31/10/2026' : index === 4 ? 'sem controle' : '-'}</td>
                    <td className="td">
                      <Badge tone={index === 2 ? 'warn' : index === 3 ? 'bad' : 'ok'}>
                        {index === 2 ? 'revisar UM' : index === 3 ? 'sem NCM' : 'ok para staging'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-line p-4 bg-primary-50/40">
          <p className="text-sm font-semibold text-brand">Decisão operacional</p>
          <div className="mt-3 space-y-3 text-sm text-ink-soft">
            <DecisionRow icon={<Package className="h-4 w-4" />} title="Modo simples" text="Sem endereço no arquivo, saldo inicial entra no endereço PADRAO e a UI esconde estrutura física." />
            <DecisionRow icon={<Layers3 className="h-4 w-4" />} title="Modo completo" text="Endereço estruturado, lote, status de estoque e zona precisam ser confirmados antes da carga." />
            <DecisionRow icon={<DatabaseZap className="h-4 w-4" />} title="Carga técnica" text="Criar staging_import_batches, staging_rows, staging_field_maps e depois stock_movements." />
          </div>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <p className="text-sm font-semibold text-brand">Próximas confirmações</p>
          <div className="mt-3 space-y-2">
            {[
              ['Owner correto para todos os SKUs', 'ok'],
              ['Criar atributos extras ou descartar', 'info'],
              ['Resolver NCM ausente antes de liberar carga fiscal', 'bad'],
              ['Confirmar reason code MIGRACAO para movimentos', 'warn'],
            ].map(([texto, tone]) => (
              <div key={texto} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                <span className="text-sm text-ink-soft">{texto}</span>
                <Badge tone={tone as 'ok' | 'info' | 'bad' | 'warn'}>{tone === 'bad' ? 'bloqueia' : 'revisar'}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MapeamentoAssistido({
  mapa,
  resumo,
  onChange,
}: {
  mapa: CampoMapeadoRevisado[]
  resumo: ReturnType<typeof resumoMapa>
  onChange: (legado: string, patch: Partial<CampoMapeadoRevisado>) => void
}) {
  return (
    <div className="grid xl:grid-cols-[1.45fr_0.8fr] gap-5">
      <div className="rounded-2xl border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-surface-sub flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-brand">Planilha de mapeamento revisável</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">{mapa.length} campos</Badge>
            <Badge tone={resumo.alterados > 0 ? 'info' : 'neutral'}>{resumo.alterados} alterados</Badge>
            <Badge tone={resumo.bloqueados > 0 ? 'bad' : 'ok'}>{resumo.bloqueados} bloqueios</Badge>
          </div>
        </div>
        <PlanilhaMapeamentoEditavel campos={mapa} onChange={onChange} />
      </div>

      <div className="space-y-4">
        <ResumoRevisaoMapa resumo={resumo} />

        <div className="rounded-2xl border border-line p-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-brand">Regras de transformação</p>
          </div>
          <div className="mt-3 space-y-3">
            <RuleCard title="Alias de campos" text="name, product_name e descricao_produto podem apontar para products.descricao." />
            <RuleCard title="Unidade de medida" text="CX/6 vira unidade UN + fator de conversão 6 para não distorcer saldo." />
            <RuleCard title="Endereço" text="A1-03-02 pode ser convertido para A-01-03-02 e vinculado ao warehouse_id." />
            <RuleCard title="Campos extras" text="Dados sem destino viram custom_attributes com tipo, dono e decisão de retenção." />
          </div>
        </div>

        <div className="rounded-2xl border border-line p-4 bg-warn-50/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warn mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand">Armadilha de migração</p>
              <p className="text-sm text-ink-muted mt-1">
                Se o importador gravar quantidade direto em saldo, você perde trilha de auditoria. A carga correta cria
                movimentos de implantação e o saldo vira consequência recalculável.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanilhaMapeamentoEditavel({
  campos,
  onChange,
}: {
  campos: CampoMapeadoRevisado[]
  onChange: (legado: string, patch: Partial<CampoMapeadoRevisado>) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px]">
        <thead className="bg-white">
          <tr>
            <th className="th w-12">#</th>
            <th className="th">Campo legado</th>
            <th className="th">Amostra</th>
            <th className="th">IA sugeriu</th>
            <th className="th">Destino confirmado</th>
            <th className="th">Entidade</th>
            <th className="th">Transformação</th>
            <th className="th">Decisão</th>
            <th className="th">Observação</th>
            <th className="th">Confiança</th>
          </tr>
        </thead>
        <tbody>
          {campos.map((campo, index) => {
            const destinoAlterado = campo.destino !== campo.destinoSugerido
            const destinos = DESTINOS_CANONICOS.includes(campo.destino)
              ? DESTINOS_CANONICOS
              : [campo.destino, ...DESTINOS_CANONICOS]

            return (
              <tr key={campo.legado} className={cn('row-hover', destinoAlterado && 'bg-info-50/35')}>
                <td className="td align-top mono text-xs text-ink-muted">{index + 1}</td>
                <td className="td align-top">
                  <p className="mono font-medium text-brand">{campo.legado}</p>
                  <Badge tone={destinoAlterado ? 'info' : 'neutral'} className="mt-2">
                    {destinoAlterado ? 'alterado manualmente' : 'sugestão mantida'}
                  </Badge>
                </td>
                <td className="td align-top mono text-xs max-w-[160px]">{campo.amostra || '-'}</td>
                <td className="td align-top mono text-xs text-ink-muted">{campo.destinoSugerido}</td>
                <td className="td align-top min-w-[220px]">
                  <select
                    aria-label={`Destino confirmado para ${campo.legado}`}
                    className={cn('input py-2 mono text-xs cursor-pointer rounded-xl', destinoAlterado && 'border-info/50 bg-info-50/50')}
                    value={campo.destino}
                    onChange={(event) => onChange(campo.legado, { destino: event.target.value })}
                  >
                    {destinos.map((destino) => (
                      <option key={`${campo.legado}-${destino}`} value={destino}>
                        {destino}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="td align-top min-w-[150px]">
                  <input
                    aria-label={`Entidade de ${campo.legado}`}
                    className="input py-2 text-xs rounded-xl"
                    value={campo.entidade}
                    onChange={(event) => onChange(campo.legado, { entidade: event.target.value })}
                  />
                </td>
                <td className="td align-top min-w-[260px]">
                  <textarea
                    aria-label={`Transformação de ${campo.legado}`}
                    className="input min-h-[72px] py-2 text-xs rounded-xl resize-y"
                    value={campo.transformacao}
                    onChange={(event) => onChange(campo.legado, { transformacao: event.target.value })}
                  />
                </td>
                <td className="td align-top min-w-[190px]">
                  <select
                    aria-label={`Decisão de ${campo.legado}`}
                    className="input py-2 text-xs cursor-pointer rounded-xl"
                    value={campo.decisao}
                    onChange={(event) => onChange(campo.legado, { decisao: event.target.value as DecisaoMapeamento })}
                  >
                    {DECISOES_MAPEAMENTO.map((decisao) => (
                      <option key={decisao.value} value={decisao.value}>
                        {decisao.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="td align-top min-w-[250px]">
                  <textarea
                    aria-label={`Observação de ${campo.legado}`}
                    className="input min-h-[72px] py-2 text-xs rounded-xl resize-y"
                    value={campo.observacao}
                    onChange={(event) => onChange(campo.legado, { observacao: event.target.value })}
                  />
                </td>
                <td className="td align-top min-w-[92px]">
                  <Progress value={campo.confianca} tone={campo.confianca >= 90 ? 'ok' : campo.confianca >= 80 ? 'warn' : 'bad'} />
                  <p className="text-[11px] text-ink-muted mt-1">{campo.confianca}%</p>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PlanilhaResumoMapeamento({ campos }: { campos: CampoMapeadoRevisado[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px]">
        <thead>
          <tr>
            <th className="th">Campo legado</th>
            <th className="th">Amostra</th>
            <th className="th">IA sugeriu</th>
            <th className="th">Confirmado</th>
            <th className="th">Transformação</th>
            <th className="th">Decisão</th>
          </tr>
        </thead>
        <tbody>
          {campos.map((campo) => {
            const alterado = campo.destino !== campo.destinoSugerido
            return (
              <tr key={`resumo-${campo.legado}`} className={cn('row-hover', alterado && 'bg-info-50/30')}>
                <td className="td mono font-medium text-brand">{campo.legado}</td>
                <td className="td mono text-xs">{campo.amostra || '-'}</td>
                <td className="td mono text-xs text-ink-muted">{campo.destinoSugerido}</td>
                <td className="td">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono text-xs text-brand">{campo.destino}</span>
                    {alterado && <Badge tone="info">manual</Badge>}
                  </div>
                </td>
                <td className="td text-xs max-w-[260px]">{campo.transformacao}</td>
                <td className="td">
                  <Badge tone={campo.decisao === 'confirmar' ? 'ok' : campo.decisao === 'revisar' ? 'warn' : 'bad'}>
                    {campo.decisao === 'confirmar' ? 'confirmado' : campo.decisao === 'revisar' ? 'revisar' : 'bloqueado'}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ResumoRevisaoMapa({ resumo }: { resumo: ReturnType<typeof resumoMapa> }) {
  return (
    <div className="rounded-2xl border border-line p-4 bg-surface-sub">
      <div className="flex items-center gap-2">
        <FileCheck2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-brand">Estado do mapa</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniMetric label="Confirmados" value={`${resumo.confirmados}`} />
        <MiniMetric label="Alterados" value={`${resumo.alterados}`} tone={resumo.alterados > 0 ? 'info' : 'neutral'} />
        <MiniMetric label="Revisar" value={`${resumo.revisar}`} tone={resumo.revisar > 0 ? 'warn' : 'neutral'} />
        <MiniMetric label="Bloqueados" value={`${resumo.bloqueados}`} tone={resumo.bloqueados > 0 ? 'bad' : 'neutral'} />
      </div>
      <p className="text-xs text-ink-muted mt-3">
        A etapa de validação usa o destino confirmado pelo implantador, incluindo mudanças manuais e bloqueios.
      </p>
    </div>
  )
}

function ValidacoesWms() {
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-4">
        {VALIDACOES.map((validacao) => (
          <div key={validacao.titulo} className="rounded-2xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div className={cn('h-10 w-10 rounded-xl grid place-items-center', toneBg(validacao.tone))}>
                {validacao.tone === 'ok' && <CheckCircle2 className="h-5 w-5 text-ok" />}
                {validacao.tone === 'warn' && <AlertTriangle className="h-5 w-5 text-warn" />}
                {validacao.tone === 'bad' && <XCircle className="h-5 w-5 text-bad" />}
                {validacao.tone === 'info' && <SearchCheck className="h-5 w-5 text-info" />}
              </div>
              <Badge tone={validacao.tone}>{validacao.tone === 'bad' ? 'bloqueante' : validacao.tone === 'ok' ? 'ok' : 'atenção'}</Badge>
            </div>
            <p className="text-sm font-semibold text-brand mt-4">{validacao.titulo}</p>
            <p className="text-sm text-ink-muted mt-2">{validacao.descricao}</p>
            <p className="text-xs text-ink-soft mt-3 rounded-xl bg-surface-sub border border-line p-3">{validacao.resultado}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-brand">Como isso vira backend depois</p>
        </div>
        <div className="mt-4 grid md:grid-cols-4 gap-3">
          <TechStep step="1" title="staging_import_batches" text="Metadados do arquivo, cliente, formato, status e usuário." />
          <TechStep step="2" title="staging_rows" text="Linhas brutas preservadas para auditoria e reprocessamento." />
          <TechStep step="3" title="field_mappings" text="De/para confirmado, confiança, transformação e campos extras." />
          <TechStep step="4" title="stock_movements" text="Movimentos oficiais de implantação geram stock_balances." />
        </div>
      </div>
    </div>
  )
}

function AssistenteImportacao({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (payload: {
    cliente: string
    origem: string
    formato: Formato
    arquivo: string
    tamanho: string
    registros: number
    mapa: CampoMapeadoRevisado[]
  }) => void
}) {
  const { toast } = useStore()
  const [etapa, setEtapa] = useState<EtapaAssistente>('arquivo')
  const [cliente, setCliente] = useState(DEMO_OWNERS[0]?.id ?? '')
  const [origem, setOrigem] = useState('Exportação do WMS legado')
  const [formato, setFormato] = useState<Formato>('csv')
  const [arquivo, setArquivo] = useState('sku_saldo_enderecos.csv')
  const [tamanho, setTamanho] = useState('1,2 MB')
  const [registros, setRegistros] = useState('1200')
  const [mapa, setMapa] = useState<CampoMapeadoRevisado[]>(criarMapaInicial)
  const resumo = resumoMapa(mapa)

  const atualizarCampo = (legado: string, patch: Partial<CampoMapeadoRevisado>) => {
    setMapa((atual) =>
      atual.map((campo) => (campo.legado === legado ? { ...campo, ...patch } : campo)),
    )
  }

  const selecionarArquivo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv' || ext === 'json' || ext === 'xlsx' || ext === 'xls') {
      setFormato(ext === 'xls' ? 'xlsx' : ext)
    }
    setArquivo(file.name)
    setTamanho(formatBytes(file.size))
    setRegistros(String(ext === 'json' ? 453 : ext === 'xlsx' || ext === 'xls' ? 842 : 1284))
  }

  const avancarAnalise = () => {
    if (!arquivo.trim()) {
      toast({ tipo: 'erro', titulo: 'Arquivo obrigatório', texto: 'Selecione ou informe um arquivo CSV, Excel ou JSON.' })
      return
    }
    setEtapa('analise')
  }

  const confirmar = () => {
    onConfirm({
      cliente,
      origem,
      formato,
      arquivo,
      tamanho,
      registros: Number(registros) || 0,
      mapa,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova importação assistida"
      subtitle="Upload, leitura inteligente, mapeamento e validação antes da carga"
      size="xl"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          {etapa === 'arquivo' && (
            <button className="btn-primary" onClick={avancarAnalise}>
              Analisar arquivo <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {etapa === 'analise' && (
            <button className="btn-primary" onClick={() => setEtapa('mapeamento')}>
              Revisar mapeamento <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {etapa === 'mapeamento' && (
            <button className="btn-primary" onClick={() => setEtapa('validacao')}>
              Validar pré-carga <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {etapa === 'validacao' && (
            <button className="btn-primary" onClick={confirmar}>
              Criar lote de revisão
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <StepHeader etapa={etapa} onChange={setEtapa} />

        {etapa === 'arquivo' && (
          <div className="grid lg:grid-cols-[1fr_0.85fr] gap-5">
            <div className="space-y-5">
              <label className="block rounded-2xl border-2 border-dashed border-primary/25 bg-primary-50/40 p-6 cursor-pointer hover:bg-primary-50 transition-colors">
                <input type="file" accept=".csv,.json,.xlsx,.xls" className="hidden" onChange={selecionarArquivo} />
                <div className="flex flex-col items-center justify-center text-center min-h-[190px]">
                  <div className="h-14 w-14 rounded-2xl bg-white border border-primary/15 grid place-items-center shadow-sm">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-brand mt-4">Solte ou selecione um CSV, Excel ou JSON</p>
                  <p className="text-xs text-ink-muted mt-1 max-w-sm">
                    O arquivo fica em staging para leitura, inferência de colunas e validação antes da gravação oficial.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    <Badge tone="primary">.csv</Badge>
                    <Badge tone="info">.xlsx</Badge>
                    <Badge tone="accent">.json</Badge>
                  </div>
                </div>
              </label>

              <FormSection title="Origem do material">
                <FormGrid cols={2}>
                  <SelectField
                    label="Cliente / owner"
                    value={cliente}
                    onChange={setCliente}
                    options={DEMO_OWNERS.map((owner) => ({ value: owner.id, label: owner.nome }))}
                  />
                  <SelectField
                    label="Formato detectado"
                    value={formato}
                    onChange={(value) => setFormato(value as Formato)}
                    options={[
                      { value: 'csv', label: 'CSV exportado do sistema atual' },
                      { value: 'xlsx', label: 'Planilha Excel' },
                      { value: 'json', label: 'JSON estruturado' },
                    ]}
                  />
                </FormGrid>
                <Field label="Origem declarada" value={origem} onChange={setOrigem} />
              </FormSection>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-line p-4">
                <p className="text-sm font-semibold text-brand">Arquivo selecionado</p>
                <div className="mt-3 rounded-xl bg-surface-sub border border-line p-3">
                  <div className="flex items-center gap-3">
                    {formato === 'json' ? <FileJson2 className="h-5 w-5 text-info" /> : <FileSpreadsheet className="h-5 w-5 text-primary" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand truncate">{arquivo}</p>
                      <p className="text-xs text-ink-muted">{tamanho} · {FORMATO_LABEL[formato]}</p>
                    </div>
                  </div>
                </div>
                <FormGrid cols={2}>
                  <Field className="mt-4" label="Registros estimados" type="number" value={registros} onChange={setRegistros} />
                  <Field className="mt-4" label="Área de carga" value="staging" onChange={() => undefined} disabled />
                </FormGrid>
              </div>

              <div className="rounded-2xl border border-line p-4 bg-surface-sub">
                <p className="text-sm font-semibold text-brand">Templates esperados</p>
                <div className="mt-3 space-y-2 text-sm text-ink-soft">
                  <TemplateRow icon={<Package className="h-4 w-4" />} text="Cadastro mestre: SKU, descrição, unidade, EAN, dimensões, peso, NCM." />
                  <TemplateRow icon={<Layers3 className="h-4 w-4" />} text="Estrutura: armazém, zona, endereço, tipo de localização e bloqueio." />
                  <TemplateRow icon={<DatabaseZap className="h-4 w-4" />} text="Saldo inicial: SKU, localização, lote, validade, status e quantidade." />
                </div>
              </div>
            </div>
          </div>
        )}

        {etapa === 'analise' && (
          <div className="grid lg:grid-cols-[0.95fr_1.1fr] gap-5">
            <div className="rounded-2xl border border-line p-5 bg-primary-50/40 overflow-hidden">
              <div className="relative h-72 rounded-2xl bg-white border border-primary/15 grid place-items-center">
                <div className="absolute inset-8 rounded-full border border-primary/10 animate-pulse" />
                <div className="absolute inset-16 rounded-full border border-accent/20 animate-ping" />
                <div className="h-24 w-24 rounded-3xl bg-primary text-white grid place-items-center shadow-pop animate-pulse">
                  <BrainCircuit className="h-10 w-10" />
                </div>
                <div className="absolute left-5 top-5 rounded-xl bg-white border border-line px-3 py-2 text-xs text-ink-soft shadow-sm">
                  lendo cabeçalhos
                </div>
                <div className="absolute right-5 top-16 rounded-xl bg-white border border-line px-3 py-2 text-xs text-ink-soft shadow-sm">
                  inferindo aliases
                </div>
                <div className="absolute left-8 bottom-8 rounded-xl bg-white border border-line px-3 py-2 text-xs text-ink-soft shadow-sm">
                  validando WMS
                </div>
                <div className="absolute right-8 bottom-6 rounded-xl bg-white border border-line px-3 py-2 text-xs text-ink-soft shadow-sm">
                  criando staging
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <AnalysisLine icon={<FileText className="h-4 w-4" />} title="Formato identificado" text={`${FORMATO_LABEL[formato]} com ${num(Number(registros) || 0)} registros estimados.`} done />
              <AnalysisLine icon={<SearchCheck className="h-4 w-4" />} title="Campos interpretados" text="sku_product parece produto; name parece descrição; available_qty parece saldo disponível." done />
              <AnalysisLine icon={<ListChecks className="h-4 w-4" />} title="Lacunas encontradas" text="NCM incompleto, unidade em formato CX/6 e endereços sem separador padrão." />
              <AnalysisLine icon={<DatabaseZap className="h-4 w-4" />} title="Plano de carga" text="Criar staging, revisar mapa e gerar movimentos de implantação." />

              <div className="rounded-2xl border border-line p-4">
                <p className="text-sm font-semibold text-brand">Resultado da leitura</p>
                <div className="mt-3 grid sm:grid-cols-3 gap-3">
                  <MiniMetric label="Campos úteis" value="14" />
                  <MiniMetric label="Extras" value="6" tone="info" />
                  <MiniMetric label="Bloqueios" value="3" tone="bad" />
                </div>
              </div>
            </div>
          </div>
        )}

        {etapa === 'mapeamento' && (
          <div className="grid xl:grid-cols-[1fr_260px] gap-4">
            <div className="rounded-2xl border border-line overflow-hidden">
              <div className="px-4 py-3 border-b border-line bg-surface-sub flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-brand">Planilha de destino confirmado</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="primary">{mapa.length} campos</Badge>
                  <Badge tone={resumo.alterados > 0 ? 'info' : 'neutral'}>{resumo.alterados} alterados</Badge>
                </div>
              </div>
              <PlanilhaMapeamentoEditavel campos={mapa} onChange={atualizarCampo} />
            </div>

            <div className="space-y-4">
              <ResumoRevisaoMapa resumo={resumo} />
              <div className="rounded-2xl border border-line p-4 bg-info-50/50">
                <p className="text-sm font-semibold text-brand">Campos sem destino direto</p>
                <p className="text-sm text-ink-muted mt-1">
                  Campos sem coluna canônica podem ficar como atributo customizado com decisão explícita do implantador.
                </p>
              </div>
            </div>
          </div>
        )}

        {etapa === 'validacao' && (
          <ValidacaoMapaAssistente mapa={mapa} resumo={resumo} registros={Number(registros) || 0} />
        )}
      </div>
    </Modal>
  )
}

function ValidacaoMapaAssistente({
  mapa,
  resumo,
  registros,
}: {
  mapa: CampoMapeadoRevisado[]
  resumo: ReturnType<typeof resumoMapa>
  registros: number
}) {
  const saldo = mapa.find((campo) => campo.legado === 'available_qty')
  const saldoAuditavel = Boolean(saldo?.destino.startsWith('stock_balances.'))
  const fiscal = mapa.find((campo) => campo.legado === 'hs_code')
  const bloqueados = mapa.filter((campo) => campo.decisao === 'bloquear')
  const revisao = mapa.filter((campo) => campo.decisao === 'revisar')

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniMetric label="Registros no staging" value={num(registros)} />
        <MiniMetric label="Destinos alterados" value={`${resumo.alterados}`} tone={resumo.alterados > 0 ? 'info' : 'neutral'} />
        <MiniMetric label="Campos em revisão" value={`${resumo.revisar}`} tone={resumo.revisar > 0 ? 'warn' : 'neutral'} />
        <MiniMetric label="Campos bloqueados" value={`${resumo.bloqueados}`} tone={resumo.bloqueados > 0 ? 'bad' : 'neutral'} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-brand">Mapa final aplicado</p>
            <Badge tone={resumo.bloqueados > 0 ? 'warn' : 'ok'}>
              {resumo.bloqueados > 0 ? 'revisão obrigatória' : 'sem bloqueios'}
            </Badge>
          </div>
          <p className="text-sm text-ink-muted mt-2">
            A pré-carga será montada com os destinos confirmados na etapa 3, incluindo {resumo.alterados} correções manuais.
          </p>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-brand">Saldo inicial</p>
            <Badge tone={saldoAuditavel ? 'ok' : 'bad'}>{saldoAuditavel ? 'auditável' : 'bloqueia'}</Badge>
          </div>
          <p className="text-sm text-ink-muted mt-2">
            {saldoAuditavel
              ? `${saldo?.legado ?? 'available_qty'} entra como movimento de implantação com reason code MIGRACAO.`
              : 'Campo de quantidade precisa apontar para saldo e gerar movimento de implantação.'}
          </p>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-brand">Fiscal BR</p>
            <Badge tone={fiscal?.decisao === 'bloquear' ? 'bad' : fiscal?.decisao === 'revisar' ? 'warn' : 'ok'}>
              {fiscal?.decisao === 'bloquear' ? 'bloqueado' : fiscal?.decisao === 'revisar' ? 'revisar' : 'ok'}
            </Badge>
          </div>
          <p className="text-sm text-ink-muted mt-2">
            {fiscal
              ? `${fiscal.legado} foi confirmado para ${fiscal.destino}.`
              : 'Arquivo sem campo fiscal detectado; o cadastro mestre fica pendente de NCM/CEST/origem.'}
          </p>
        </div>

        <div className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-brand">Atributos customizados</p>
            <Badge tone={resumo.extras > 0 ? 'info' : 'neutral'}>{resumo.extras} campos</Badge>
          </div>
          <p className="text-sm text-ink-muted mt-2">
            Campos direcionados para atributo customizado serão mantidos no staging com tipo e decisão de retenção.
          </p>
        </div>
      </div>

      {(bloqueados.length > 0 || revisao.length > 0) && (
        <div className="rounded-2xl border border-warn/20 bg-warn-50/60 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warn mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-brand">Pendências antes da carga definitiva</p>
              <p className="text-sm text-ink-muted mt-1">
                O lote pode ser criado para revisão, mas a carga oficial deve ficar bloqueada enquanto houver campo bloqueado
                ou decisão marcada como revisão.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[...bloqueados, ...revisao].map((campo) => (
                  <Badge key={`pendencia-${campo.legado}`} tone={campo.decisao === 'bloquear' ? 'bad' : 'warn'}>
                    {campo.legado}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-surface-sub flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-brand">De-para final para o lote de revisão</p>
        </div>
        <PlanilhaResumoMapeamento campos={mapa} />
      </div>
    </div>
  )
}

function StepHeader({ etapa, onChange }: { etapa: EtapaAssistente; onChange: (etapa: EtapaAssistente) => void }) {
  const etapas: { id: EtapaAssistente; label: string }[] = [
    { id: 'arquivo', label: 'Arquivo' },
    { id: 'analise', label: 'Análise IA' },
    { id: 'mapeamento', label: 'Mapeamento' },
    { id: 'validacao', label: 'Validação' },
  ]
  const atual = etapas.findIndex((item) => item.id === etapa)
  return (
    <div className="grid grid-cols-4 gap-2">
      {etapas.map((item, index) => (
        <button
          key={item.id}
          className={cn(
            'rounded-xl border px-3 py-2 text-left transition-colors',
            index <= atual ? 'border-primary/25 bg-primary-50 text-primary' : 'border-line bg-surface-sub text-ink-muted',
          )}
          onClick={() => onChange(item.id)}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider">Etapa {index + 1}</span>
          <span className="block text-sm font-medium mt-0.5">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

function HeroMetric({ label, value, tone = 'primary' }: { label: string; value: string; tone?: 'primary' | 'warn' }) {
  return (
    <div className={cn('rounded-xl border p-3', tone === 'warn' ? 'bg-warn-50 border-warn/15' : 'bg-white border-primary/10')}>
      <p className="text-lg font-semibold text-brand mono">{value}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
    </div>
  )
}

function FlowCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-sub p-4">
      <div className="h-9 w-9 rounded-xl bg-white border border-line grid place-items-center text-primary">
        {icon}
      </div>
      <p className="text-sm font-semibold text-brand mt-3">{title}</p>
      <p className="text-xs text-ink-muted mt-1">{text}</p>
    </div>
  )
}

function MiniMetric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'warn' | 'bad' | 'info' }) {
  return (
    <div className={cn('rounded-xl border p-3', tone === 'warn' && 'bg-warn-50 border-warn/15', tone === 'bad' && 'bg-bad-50 border-bad/15', tone === 'info' && 'bg-info-50 border-info/15', tone === 'neutral' && 'bg-surface-sub border-line')}>
      <p className="text-sm font-semibold text-brand mono">{value}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
    </div>
  )
}

function DecisionRow({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white border border-primary/10 p-3">
      <div className="h-8 w-8 rounded-lg bg-primary-50 text-primary grid place-items-center shrink-0">{icon}</div>
      <div>
        <p className="font-medium text-brand">{title}</p>
        <p className="text-xs text-ink-muted mt-0.5">{text}</p>
      </div>
    </div>
  )
}

function RuleCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-sub p-3">
      <p className="text-sm font-medium text-brand">{title}</p>
      <p className="text-xs text-ink-muted mt-1">{text}</p>
    </div>
  )
}

function TechStep({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-sub p-4">
      <div className="h-7 w-7 rounded-lg bg-primary text-white grid place-items-center text-xs font-semibold">{step}</div>
      <p className="text-sm font-semibold text-brand mt-3 mono">{title}</p>
      <p className="text-xs text-ink-muted mt-1">{text}</p>
    </div>
  )
}

function TemplateRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="h-8 w-8 rounded-lg bg-white border border-line grid place-items-center text-primary shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function AnalysisLine({ icon, title, text, done }: { icon: ReactNode; title: string; text: string; done?: boolean }) {
  return (
    <div className="rounded-2xl border border-line p-4 flex items-start gap-3">
      <div className={cn('h-9 w-9 rounded-xl grid place-items-center shrink-0', done ? 'bg-ok-50 text-ok' : 'bg-primary-50 text-primary')}>
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-brand">{title}</p>
          {done && <Badge tone="ok">concluído</Badge>}
        </div>
        <p className="text-sm text-ink-muted mt-1">{text}</p>
      </div>
    </div>
  )
}

function statusTone(status: StatusImportacao) {
  if (status === 'pronto') return 'ok'
  if (status === 'mapeando') return 'info'
  if (status === 'revisao') return 'warn'
  return 'neutral'
}

function statusLabel(status: StatusImportacao) {
  if (status === 'pronto') return 'pronto para carga'
  if (status === 'mapeando') return 'mapeando'
  if (status === 'revisao') return 'aguardando revisão'
  return 'triagem'
}

function toneBg(tone: 'ok' | 'warn' | 'bad' | 'info') {
  if (tone === 'ok') return 'bg-ok-50'
  if (tone === 'warn') return 'bg-warn-50'
  if (tone === 'bad') return 'bg-bad-50'
  return 'bg-info-50'
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
