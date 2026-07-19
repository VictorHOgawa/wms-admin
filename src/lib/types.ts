/* ================================================================== *
 * Modelo de dados — Painel Admin & Business do Integra WMS
 *
 * Princípio (ver skill wms-architect): schema ÚNICO e configurável.
 * Não existe "versão pequena" e "versão grande" — existe um schema
 * completo onde a complexidade é LIGADA por configuração. O campo
 * `modo` do Armazém é a chave-mestra dessa escala.
 * ================================================================== */

import type {
  DemoChecklistQuestion,
  DemoChecklistTemplate,
} from '../shared-demo'

export type Curva = 'A' | 'B' | 'C'

/* ------------------------------------------------------------------ *
 * FASE 1 — Cadastros mestres
 * ------------------------------------------------------------------ */

/** Modo do armazém: a chave que liga/desliga a complexidade da operação. */
export type ModoArmazem = 'simples' | 'completo'

export type TipoArmazem = 'cd' | 'loja' | 'fabrica' | 'transito'

/** Armazém / Centro de Distribuição. `warehouseId` nasce no dia 1 (multi-armazém). */
export interface Armazem {
  id: string
  codigo: string // ex.: CD-SP
  nome: string
  tipo: TipoArmazem
  cidade: string
  uf: string
  /**
   * simples  → endereço único PADRAO, lote só quando o SKU exige, status available/blocked
   * completo → endereçamento estruturado, lote/FEFO sempre, todos os status, slotting dirigido
   */
  modo: ModoArmazem
  ativo: boolean
  /** De-para com o CD do TMS (BusinessUnit) — 1 armazém por CD; é como a O.S acha o armazém. */
  businessUnitId?: string | null
}

/** Produto / SKU — inclui campos fiscais BR (obrigatórios) e conversão de UM. */
export interface SKU {
  id: string
  codigo: string
  ean: string // código de barras (GTIN)
  descricao: string
  categoria: string
  curva: Curva
  unidade: string // UN, CX, KG, L…
  unidadesPorCaixa: number // conversão caixa → unidade
  // WMS real (3PL): dono do estoque e hierarquia de caixa-mestre.
  ownerId?: string
  ownerNome?: string
  caixasPorPallet?: number | null // caixas mestre por pallet (fallback manual)
  volumeCaixaM3?: number | null // volume real da caixa mestre (m³)
  peso: number // kg (unidade)
  // dimensões da UNIDADE em cm (slotting/cubagem)
  altura: number
  largura: number
  profundidade: number
  // dimensões da CAIXA MESTRE em cm + empilhamento (cubagem calculada)
  boxAltura?: number | null
  boxLargura?: number | null
  boxProfundidade?: number | null
  lastro?: number | null // caixas por camada
  alturaMaxEmpilhamento?: number | null // nº de camadas
  maxCaixasPorPallet?: number | null // derivado: lastro × altura (read-only)
  /** Pré-cadastro automático da NF: pendente até completar a parametrização física. */
  pendenteParametrizacao?: boolean
  /** Política dimensional (alçada): dimensão variável — exige medição em TODA chegada. */
  exigeMedidaTodaVez?: boolean
  // controles de rastreio (ligam comportamento na operação)
  controleLote: boolean
  controleValidade: boolean
  controleSerie: boolean
  // fiscal BR — sem isso a entrada/saída não amarra com NF-e
  ncm: string
  cest: string
  origem: number // 0–8 (tabela de origem da mercadoria — ICMS)
  ativo: boolean
}

/** Cliente / Owner (dono do estoque). Essencial para operação 3PL com segregação. */
export interface Owner {
  id: string
  codigo: string
  nome: string
  cnpj: string
  cor: string // swatch de identificação visual
  contato: string
  ativo: boolean
}

export interface Fornecedor {
  id: string
  codigo: string
  nome: string
  cnpj: string
  uf: string
  contato: string
  ativo: boolean
}

export type ModalTransporte = 'rodoviario' | 'aereo' | 'fluvial' | 'ferroviario'

export interface Transportadora {
  id: string
  codigo: string
  nome: string
  cnpj: string
  antt: string // registro ANTT (RNTRC)
  modal: ModalTransporte
  ativo: boolean
}

/* ------------------------------------------------------------------ *
 * FASE 2 — Estrutura física (zonas, docas, endereços)
 * ------------------------------------------------------------------ */

export type TipoZona =
  | 'picking'
  | 'pulmao'
  | 'recebimento'
  | 'expedicao'
  | 'avaria'
  | 'quarentena'
  | 'cross-docking'

export type Temperatura = 'ambiente' | 'refrigerado' | 'congelado'

/** Zona logística dentro de um armazém — base para roteirização e slotting. */
export interface Zona {
  id: string
  armazemId: string
  codigo: string // ex.: PICK-A
  nome: string
  tipo: TipoZona
  temperatura: Temperatura
  cor: string
  ativo: boolean
}

export type TipoDoca = 'recebimento' | 'expedicao' | 'ambas'

export interface Doca {
  id: string
  armazemId: string
  codigo: string // ex.: DOCA-03
  nome: string
  tipo: TipoDoca
  niveladora: boolean // possui niveladora/plataforma
  ativo: boolean
}

export type TipoEndereco =
  | 'picking'
  | 'pulmao'
  | 'recebimento'
  | 'expedicao'
  | 'avaria'
  | 'quarentena'

/**
 * Endereço / Localização física.
 * Código canônico RUA-COLUNA-NÍVEL-POSIÇÃO (ex.: A-01-03-02), igual ao
 * usado na planta 3D do wms-frontend (lib/warehouse.ts). No modo simples,
 * cria-se um único endereço PADRAO e a UI esconde a hierarquia.
 */
export interface Endereco {
  id: string
  armazemId: string
  zonaId: string | null
  codigo: string
  rua: string
  coluna: number
  nivel: number
  posicao: number
  tipo: TipoEndereco
  // capacidade — valida o put-away
  capacidadePeso: number // kg
  capacidadePaletes: number
  bloqueado: boolean // endereço inativo não recebe nem cede saldo
}

/* ------------------------------------------------------------------ *
 * FASE 3 — Parâmetros operacionais (config como dado)
 * ------------------------------------------------------------------ */

export type TipoParametro = 'boolean' | 'number' | 'enum'
export type EscopoParametro = 'global' | 'cd' | 'owner'

/**
 * Definição (catálogo) de um parâmetro — estático. Descreve a chave, como
 * ela se comporta e o que muda entre o modo simples e o completo.
 */
export interface DefinicaoParametro {
  chave: string
  label: string
  descricao: string
  grupo: string
  tipo: TipoParametro
  opcoes?: { value: string; label: string }[] // só para tipo enum
  default: string // valor serializado
  modoSimples: string
  modoCompleto: string
  unidade?: string // ex.: 'un', '%'
}

/**
 * Valor sobrescrito (override) de um parâmetro num escopo.
 *   global → escopoId null · cd → armazemId · owner → ownerId
 * Resolução: owner/cd sobrepõem global; global sobrepõe o default.
 */
export interface ValorParametro {
  id: string
  chave: string
  escopo: EscopoParametro
  escopoId: string | null
  valor: string // serializado
}

/* ------------------------------------------------------------------ *
 * FASE 4 — Acessos & Governança
 * ------------------------------------------------------------------ */

/** Permissão é por AÇÃO, nunca por tela. Catálogo estático, agrupado por área. */
export interface PermissaoDef {
  chave: string // ex.: 'quarentena.liberar'
  label: string
  grupo: string
}

export interface Perfil {
  id: string
  nome: string
  descricao: string
  cor: string
  permissoes: string[] // chaves de PermissaoDef
  alcadaAjusteQtd: number // unidades máx. de ajuste sem aprovação (-1 = ilimitado)
  alcadaAjusteValor: number // R$ máx. (-1 = ilimitado)
  ativo: boolean
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfilId: string
  armazemIds: string[] // armazéns a que o usuário tem acesso
  ativo: boolean
}

export type TipoReasonCode =
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'avaria'
  | 'bloqueio'
  | 'devolucao'

/** Motivo de ajuste/bloqueio — obrigatório em toda movimentação fora do fluxo feliz. */
export interface ReasonCode {
  id: string
  codigo: string
  descricao: string
  tipo: TipoReasonCode
  exigeAprovacao: boolean
  ativo: boolean
}

export type ChecklistQuestion = DemoChecklistQuestion
export type ChecklistTemplate = DemoChecklistTemplate

/* ------------------------------------------------------------------ *
 * Chaves de coleção do store (CRUD genérico)
 * ------------------------------------------------------------------ */
export type CollectionKey =
  | 'armazens'
  | 'skus'
  | 'owners'
  | 'fornecedores'
  | 'transportadoras'
  | 'zonas'
  | 'docas'
  | 'enderecos'
  | 'parametros'
  | 'usuarios'
  | 'perfis'
  | 'reasonCodes'
  | 'checklists'
