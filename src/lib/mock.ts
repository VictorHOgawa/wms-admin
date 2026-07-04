import type {
  Armazem,
  ChecklistTemplate,
  DefinicaoParametro,
  Doca,
  Endereco,
  Fornecedor,
  Owner,
  Perfil,
  PermissaoDef,
  ReasonCode,
  SKU,
  Transportadora,
  Usuario,
  ValorParametro,
  Zona,
} from './types'
import { gerarEnderecos } from './enderecos'
import {
  DEMO_OWNERS,
  DEMO_PROFILES,
  DEMO_SKUS,
  DEMO_USERS,
  DEMO_WAREHOUSES,
  DEMO_CHECKLIST_TEMPLATES,
} from '../../../wms-shared-demo'
import {
  DEMO_ADMIN_BUSINESS_ADDRESS_BLUEPRINT,
  DEMO_ADMIN_BUSINESS_DOCAS,
} from '../../../wms-shared-demo/locations.ts'

/* ------------------------------------------------------------------ *
 * Dados-semente (mock). Sem API: tudo vive em memória no store.
 * ------------------------------------------------------------------ */

export const ARMAZENS: Armazem[] = DEMO_WAREHOUSES.map((item) => ({
  ...item,
  tipo: item.codigo.startsWith('LJ') ? 'loja' : 'cd',
}))

export const OWNERS: Owner[] = DEMO_OWNERS.map((item) => ({
  ...item,
  contato: `${item.codigo.toLowerCase()}@integra-demo.com.br`,
}))

export const SKUS: SKU[] = DEMO_SKUS.map(({ ownerId, ...sku }) => {
  void ownerId
  return sku
})

export const FORNECEDORES: Fornecedor[] = [
  { id: 'forn-1', codigo: 'F001', nome: 'Distribuidora Sul Eletro', cnpj: '56.789.012/0001-34', uf: 'SC', contato: 'pedidos@suleletro.com.br', ativo: true },
  { id: 'forn-2', codigo: 'F002', nome: 'Indústria Bella Matriz', cnpj: '23.456.789/0002-92', uf: 'SP', contato: 'fabrica@bella.com.br', ativo: true },
  { id: 'forn-3', codigo: 'F003', nome: 'Cooperativa Grãos do Sul', cnpj: '67.890.123/0001-45', uf: 'RS', contato: 'vendas@graosdosul.coop.br', ativo: true },
  { id: 'forn-4', codigo: 'F004', nome: 'Aços Forte Ltda', cnpj: '78.901.234/0001-56', uf: 'MG', contato: 'comercial@acosforte.com.br', ativo: false },
]

export const TRANSPORTADORAS: Transportadora[] = [
  { id: 'tr-1', codigo: 'T001', nome: 'Rápido Brasil Logística', cnpj: '89.012.345/0001-67', antt: '12345678', modal: 'rodoviario', ativo: true },
  { id: 'tr-2', codigo: 'T002', nome: 'AeroCargo Express', cnpj: '90.123.456/0001-78', antt: '23456789', modal: 'aereo', ativo: true },
  { id: 'tr-3', codigo: 'T003', nome: 'TransNordeste', cnpj: '01.234.567/0001-89', antt: '34567890', modal: 'rodoviario', ativo: true },
]

export const ZONAS: Zona[] = [
  { id: 'zn-1', armazemId: 'cd-sp', codigo: 'RECEB', nome: 'Recebimento', tipo: 'recebimento', temperatura: 'ambiente', cor: '#2563eb', ativo: true },
  { id: 'zn-2', armazemId: 'cd-sp', codigo: 'PICK-A', nome: 'Picking Seco A', tipo: 'picking', temperatura: 'ambiente', cor: '#00a88e', ativo: true },
  { id: 'zn-3', armazemId: 'cd-sp', codigo: 'PULM-A', nome: 'Pulmão A', tipo: 'pulmao', temperatura: 'ambiente', cor: '#7c3aed', ativo: true },
  { id: 'zn-4', armazemId: 'cd-sp', codigo: 'FRIO', nome: 'Câmara Refrigerada', tipo: 'picking', temperatura: 'refrigerado', cor: '#0891b2', ativo: true },
  { id: 'zn-5', armazemId: 'cd-sp', codigo: 'EXPED', nome: 'Expedição', tipo: 'expedicao', temperatura: 'ambiente', cor: '#d97706', ativo: true },
  { id: 'zn-6', armazemId: 'cd-sp', codigo: 'AVARIA', nome: 'Avaria / Bloqueado', tipo: 'avaria', temperatura: 'ambiente', cor: '#dc2626', ativo: true },
  { id: 'zn-7', armazemId: 'cd-rj', codigo: 'PICK-RJ', nome: 'Picking Geral', tipo: 'picking', temperatura: 'ambiente', cor: '#00a88e', ativo: true },
]

export const DOCAS: Doca[] = [
  { id: 'dk-1', armazemId: 'cd-sp', codigo: DEMO_ADMIN_BUSINESS_DOCAS.recebimento01, nome: 'Doca 01 — Recebimento', tipo: 'recebimento', niveladora: true, ativo: true },
  { id: 'dk-2', armazemId: 'cd-sp', codigo: DEMO_ADMIN_BUSINESS_DOCAS.recebimento02, nome: 'Doca 02 — Recebimento', tipo: 'recebimento', niveladora: true, ativo: true },
  { id: 'dk-3', armazemId: 'cd-sp', codigo: DEMO_ADMIN_BUSINESS_DOCAS.expedicao03, nome: 'Doca 03 — Expedição', tipo: 'expedicao', niveladora: true, ativo: true },
  { id: 'dk-4', armazemId: 'cd-sp', codigo: DEMO_ADMIN_BUSINESS_DOCAS.mista04, nome: 'Doca 04 — Mista', tipo: 'ambas', niveladora: false, ativo: true },
  { id: 'dk-5', armazemId: 'cd-rj', codigo: 'DOCA-01', nome: 'Doca 01', tipo: 'ambas', niveladora: true, ativo: true },
]

/* Endereços-semente do CD Cajamar: 3 ruas × 4 colunas × 3 níveis × 1 posição = 36 */
export const ENDERECOS: Endereco[] = [
  ...gerarEnderecos(DEMO_ADMIN_BUSINESS_ADDRESS_BLUEPRINT),
  // modo simples: a Loja Jaboatão usa endereço único PADRAO
  { id: 'end-padrao-pe', armazemId: 'lj-pe', zonaId: null, codigo: 'PADRAO', rua: 'PADRAO', coluna: 1, nivel: 1, posicao: 1, tipo: 'picking', capacidadePeso: 0, capacidadePaletes: 0, bloqueado: false },
]

/* ---------------- Helpers de exibição ---------------- */
export const armazemName = (id: string) => ARMAZENS.find((a) => a.id === id)?.nome ?? '—'
export const ownerName = (id: string) => OWNERS.find((o) => o.id === id)?.nome ?? '—'
export const ownerColor = (id: string) => OWNERS.find((o) => o.id === id)?.cor ?? '#64748b'

export const TIPO_ARMAZEM_LABEL: Record<string, string> = {
  cd: 'Centro de Distribuição',
  loja: 'Loja',
  fabrica: 'Fábrica',
  transito: 'Trânsito',
}
export const MODAL_LABEL: Record<string, string> = {
  rodoviario: 'Rodoviário',
  aereo: 'Aéreo',
  fluvial: 'Fluvial',
  ferroviario: 'Ferroviário',
}
export const TIPO_ZONA_LABEL: Record<string, string> = {
  picking: 'Picking',
  pulmao: 'Pulmão / Reserva',
  recebimento: 'Recebimento',
  expedicao: 'Expedição',
  avaria: 'Avaria',
  quarentena: 'Quarentena',
  'cross-docking': 'Cross-docking',
}
export const TEMPERATURA_LABEL: Record<string, string> = {
  ambiente: 'Ambiente',
  refrigerado: 'Refrigerado',
  congelado: 'Congelado',
}
export const TIPO_DOCA_LABEL: Record<string, string> = {
  recebimento: 'Recebimento',
  expedicao: 'Expedição',
  ambas: 'Mista (ambas)',
}
export const TIPO_ENDERECO_LABEL: Record<string, string> = {
  picking: 'Picking',
  pulmao: 'Pulmão',
  recebimento: 'Recebimento',
  expedicao: 'Expedição',
  avaria: 'Avaria',
  quarentena: 'Quarentena',
}
/** Tabela de origem da mercadoria (ICMS) — usada no cadastro fiscal do SKU. */
export const ORIGEM_LABEL: Record<number, string> = {
  0: '0 — Nacional',
  1: '1 — Estrangeira (importação direta)',
  2: '2 — Estrangeira (mercado interno)',
  3: '3 — Nacional, importação > 40%',
  4: '4 — Nacional, processos produtivos básicos',
  5: '5 — Nacional, importação ≤ 40%',
  6: '6 — Estrangeira (importação direta, sem similar)',
  7: '7 — Estrangeira (mercado interno, sem similar)',
  8: '8 — Nacional, importação > 70%',
}

/* ================================================================== *
 * FASE 3 — Parâmetros operacionais
 * ================================================================== */

/** Catálogo de parâmetros (estático). Cada um declara modo simples × completo. */
export const DEFINICOES_PARAMETROS: DefinicaoParametro[] = [
  // Recebimento
  { chave: 'conferencia_cega', grupo: 'Recebimento', label: 'Conferência cega', tipo: 'boolean', default: 'true', descricao: 'Operador conta sem ver a quantidade esperada.', modoSimples: 'Desligada — operador vê o esperado.', modoCompleto: 'Ligada — reduz viés e fraude na conferência.' },
  { chave: 'aprovacao_divergencia', grupo: 'Recebimento', label: 'Aprovação de divergência', tipo: 'boolean', default: 'true', descricao: 'Divergência no recebimento exige liberação de supervisor.', modoSimples: 'Operador aceita parcial sozinho.', modoCompleto: 'Exige aprovação acima da tolerância.' },
  // Endereçamento
  { chave: 'enderecamento_caotico', grupo: 'Endereçamento', label: 'Endereçamento caótico/dinâmico', tipo: 'boolean', default: 'true', descricao: 'Qualquer SKU em qualquer posição livre; o sistema rastreia.', modoSimples: 'Posição fixa por SKU (previsível).', modoCompleto: 'Dinâmico — densidade máxima, exige scan-to-confirm.' },
  { chave: 'fefo_obrigatorio', grupo: 'Endereçamento', label: 'FEFO obrigatório', tipo: 'boolean', default: 'true', descricao: 'Picking sempre sugere o lote de menor validade.', modoSimples: 'FIFO simples (entra primeiro, sai primeiro).', modoCompleto: 'FEFO — obrigatório para perecível/farma/alimento.' },
  // Picking & Ondas
  { chave: 'interleaving', grupo: 'Picking & Ondas', label: 'Interleaving de tarefas', tipo: 'boolean', default: 'true', descricao: 'Encaixa um picking no caminho de volta de um putaway.', modoSimples: 'Uma tarefa por vez.', modoCompleto: 'Interlaça tarefas para reduzir deslocamento.' },
  { chave: 'estrategia_picking', grupo: 'Picking & Ondas', label: 'Estratégia de picking', tipo: 'enum', default: 'discreto', opcoes: [
    { value: 'discreto', label: 'Discreto (lista por pedido)' },
    { value: 'batch', label: 'Batch (múltiplos pedidos)' },
    { value: 'wave', label: 'Onda (wave)' },
    { value: 'zona', label: 'Por zona' },
    { value: 'cluster', label: 'Cluster' },
  ], descricao: 'Como o motor de separação agrupa o trabalho.', modoSimples: 'Discreto — uma lista por pedido.', modoCompleto: 'Onda + batch + zona + cluster.' },
  // Inventário
  { chave: 'alcada_ajuste_un', grupo: 'Inventário', label: 'Alçada de ajuste', tipo: 'number', default: '50', unidade: 'un', descricao: 'Quantidade máxima de ajuste sem aprovação de supervisor.', modoSimples: 'Limite baixo, dono aprova tudo.', modoCompleto: 'Alçada multinível por perfil.' },
  { chave: 'tolerancia_divergencia_pct', grupo: 'Inventário', label: 'Tolerância de divergência', tipo: 'number', default: '2', unidade: '%', descricao: 'Acima deste percentual, a contagem dispara recontagem.', modoSimples: 'Tolerância folgada.', modoCompleto: 'Tolerância apertada (acuracidade > 99%).' },
  // Dispositivos
  { chave: 'offline_first', grupo: 'Dispositivos', label: 'Modo offline-first', tipo: 'boolean', default: 'true', descricao: 'Coletor opera em zonas mortas de WiFi e sincroniza depois.', modoSimples: 'Online direto (rede estável).', modoCompleto: 'Offline-first com fila de sincronização.' },
  { chave: 'notif_push', grupo: 'Dispositivos', label: 'Notificações push de tarefas', tipo: 'boolean', default: 'true', descricao: 'Alerta o operador quando uma nova tarefa é atribuída.', modoSimples: 'Operador puxa a próxima tarefa.', modoCompleto: 'Push proativo por prioridade/SLA.' },
  // Controles
  { chave: 'controle_serie_global', grupo: 'Controles', label: 'Controle por número de série', tipo: 'boolean', default: 'false', descricao: 'Rastreio por série para eletrônicos e itens de alto valor.', modoSimples: 'Sem rastreio de série.', modoCompleto: 'Série rastreada na entrada e na saída.' },
]

/** Overrides-semente — demonstram a resolução hierárquica. */
export const PARAMETROS: ValorParametro[] = [
  { id: 'par-1', chave: 'enderecamento_caotico', escopo: 'cd', escopoId: 'lj-pe', valor: 'false' }, // loja PE (modo simples) → posição fixa
  { id: 'par-2', chave: 'fefo_obrigatorio', escopo: 'owner', escopoId: 'own-verde', valor: 'true' }, // alimentos → FEFO sempre
  { id: 'par-3', chave: 'controle_serie_global', escopo: 'owner', escopoId: 'own-nano', valor: 'true' }, // eletrônicos → série
]

export const ESCOPO_LABEL: Record<string, string> = {
  global: 'Global (todos)',
  cd: 'Armazém / CD',
  owner: 'Cliente / Owner',
}

/* ================================================================== *
 * FASE 4 — Acessos & Governança
 * ================================================================== */

/** Catálogo de permissões — por AÇÃO, agrupado por área. */
export const PERMISSOES: PermissaoDef[] = [
  { chave: 'recebimento.conferir', grupo: 'Recebimento', label: 'Conferir recebimento' },
  { chave: 'recebimento.divergencia', grupo: 'Recebimento', label: 'Registrar divergência' },
  { chave: 'recebimento.concluir', grupo: 'Recebimento', label: 'Concluir recebimento' },
  { chave: 'estoque.ajustar', grupo: 'Estoque', label: 'Ajustar estoque' },
  { chave: 'estoque.transferir', grupo: 'Estoque', label: 'Transferir entre endereços' },
  { chave: 'estoque.bloquear', grupo: 'Estoque', label: 'Bloquear/desbloquear' },
  { chave: 'quarentena.liberar', grupo: 'Qualidade', label: 'Liberar quarentena' },
  { chave: 'avaria.tratar', grupo: 'Qualidade', label: 'Tratar avaria' },
  { chave: 'onda.liberar', grupo: 'Separação', label: 'Liberar onda' },
  { chave: 'onda.reabrir', grupo: 'Separação', label: 'Reabrir onda fechada' },
  { chave: 'picking.executar', grupo: 'Separação', label: 'Executar picking' },
  { chave: 'expedicao.faturar', grupo: 'Expedição', label: 'Faturar/expedir' },
  { chave: 'romaneio.despachar', grupo: 'Expedição', label: 'Despachar romaneio' },
  { chave: 'config.editar', grupo: 'Administração', label: 'Editar parâmetros' },
  { chave: 'usuario.gerenciar', grupo: 'Administração', label: 'Gerenciar usuários' },
  { chave: 'perfil.gerenciar', grupo: 'Administração', label: 'Gerenciar perfis' },
]

const TODAS_PERMISSOES = PERMISSOES.map((p) => p.chave)

export const PERFIS: Perfil[] = DEMO_PROFILES.map((perfil) => ({
  ...perfil,
  descricao:
    perfil.id === 'perf-op'
      ? 'Separador, conferente, empilhadeirista.'
      : perfil.id === 'perf-sup'
        ? 'Trata excecoes e aprova ajustes dentro da alcada.'
        : perfil.id === 'perf-ges'
          ? 'Decide, libera ondas e acompanha os indicadores.'
          : 'Cadastros, configuracao, integracoes e permissoes.',
  permissoes:
    perfil.id === 'perf-ges'
      ? TODAS_PERMISSOES.filter((c) => c !== 'usuario.gerenciar' && c !== 'perfil.gerenciar')
      : perfil.id === 'perf-adm'
        ? TODAS_PERMISSOES
        : perfil.permissoes,
  alcadaAjusteQtd: perfil.id === 'perf-op' ? 0 : perfil.id === 'perf-sup' ? 100 : -1,
  alcadaAjusteValor: perfil.id === 'perf-op' ? 0 : perfil.id === 'perf-sup' ? 500 : -1,
  ativo: true,
}))

export const USUARIOS: Usuario[] = DEMO_USERS.map((usuario) => ({
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  perfilId: usuario.perfilId,
  armazemIds: usuario.armazemIds,
  ativo: usuario.ativo,
}))

export const REASON_CODES: ReasonCode[] = [
  { id: 'rc-1', codigo: 'AJ-POS', descricao: 'Recontagem — sobra confirmada', tipo: 'ajuste_positivo', exigeAprovacao: true, ativo: true },
  { id: 'rc-2', codigo: 'AJ-NEG', descricao: 'Recontagem — falta confirmada', tipo: 'ajuste_negativo', exigeAprovacao: true, ativo: true },
  { id: 'rc-3', codigo: 'AVR-MAN', descricao: 'Avaria no manuseio', tipo: 'avaria', exigeAprovacao: false, ativo: true },
  { id: 'rc-4', codigo: 'VENC', descricao: 'Produto vencido — bloqueio', tipo: 'bloqueio', exigeAprovacao: false, ativo: true },
  { id: 'rc-5', codigo: 'DEV-CLI', descricao: 'Devolução de cliente (logística reversa)', tipo: 'devolucao', exigeAprovacao: true, ativo: true },
]

export const CHECKLISTS: ChecklistTemplate[] = structuredClone(DEMO_CHECKLIST_TEMPLATES)

export const TIPO_REASON_LABEL: Record<string, string> = {
  ajuste_positivo: 'Ajuste positivo',
  ajuste_negativo: 'Ajuste negativo',
  avaria: 'Avaria',
  bloqueio: 'Bloqueio',
  devolucao: 'Devolução',
}

export const perfilById = (id: string) => PERFIS.find((p) => p.id === id)
