/**
 * Cliente da API real do WMS (spoke adapta-api) para o painel Admin & Business.
 * Espelha o coletor/wms-frontend: login no Hub → troca por token do spoke.
 * Conexão OPCIONAL — sem ela, as telas seguem com dados mock (demo).
 *
 * Configurar `VITE_HUB_API_URL` (e opcional `VITE_SPOKE_API_URL`) no .env.
 */
const HUB = import.meta.env.VITE_HUB_API_URL ?? ''
const SPOKE_OVERRIDE = import.meta.env.VITE_SPOKE_API_URL ?? ''
const KEY = 'wms.admin.session'

interface Session {
  spokeToken: string
  spokeUrl: string
  tenantId: string
  email: string
}

export function getSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}
export function isConnected(): boolean {
  return !!getSession()?.spokeToken
}
export function disconnect(): void {
  localStorage.removeItem(KEY)
}

async function req<T>(url: string, init?: RequestInit): Promise<{ status: number; body: T | null }> {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal })
    const t = await r.text()
    return { status: r.status, body: t ? (JSON.parse(t) as T) : null }
  } catch {
    return { status: 0, body: null }
  } finally {
    clearTimeout(to)
  }
}

export async function wmsConnect(
  email: string,
  senha: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!HUB) return { ok: false, message: 'VITE_HUB_API_URL não configurada — modo demo.' }
  const login = await req<{ accessToken?: string }>(`${HUB}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  })
  if (login.status !== 200 || !login.body?.accessToken) {
    return { ok: false, message: 'E-mail ou senha inválidos no Hub.' }
  }
  const hubToken = login.body.accessToken
  const tenants = await req<Array<{ id: string; spokeUrl?: string | null }>>(`${HUB}/tenants`, {
    headers: { Authorization: `Bearer ${hubToken}` },
  })
  const tenant = Array.isArray(tenants.body) ? tenants.body.find((t) => t.spokeUrl) : null
  if (!tenant?.spokeUrl) return { ok: false, message: 'Nenhuma empresa com spokeUrl.' }
  const spokeUrl = SPOKE_OVERRIDE || tenant.spokeUrl
  const ex = await req<{ accessToken?: string }>(`${spokeUrl}/auth/token`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${hubToken}`, 'Content-Type': 'application/json', 'x-tenant-id': tenant.id },
    body: JSON.stringify({}),
  })
  if (ex.status !== 200 || !ex.body?.accessToken) {
    return { ok: false, message: 'Falha ao trocar o token do spoke.' }
  }
  localStorage.setItem(
    KEY,
    JSON.stringify({ spokeToken: ex.body.accessToken, spokeUrl, tenantId: tenant.id, email }),
  )
  return { ok: true }
}

async function authed<T>(method: string, path: string, body?: unknown): Promise<T> {
  const s = getSession()
  if (!s) throw new Error('WMS não conectado')
  const r = await req<T>(`${s.spokeUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${s.spokeToken}`,
      'x-tenant-id': s.tenantId,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (r.status < 200 || r.status >= 300) {
    const msg = (r.body as any)?.message
    throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg ?? `WMS ${path}: HTTP ${r.status}`))
  }
  return r.body as T
}

export interface WmsWarehouseDTO {
  id: string
  code: string
  name: string
  tipo: string
  city: string | null
  uf: string | null
  mode: string
  active: boolean
  businessUnitId: string | null
}

/** CD do TMS (BusinessUnit isDistributionCenter) — alvo do de-para armazém ↔ CD. */
export interface BusinessUnitLiteDTO {
  id: string
  name: string
  code: string
}
export interface WmsZoneDTO {
  id: string
  warehouseId: string
  code: string
  name: string
  type: string
  temperature: string | null
  color: string | null
  active: boolean
}
export interface WmsDocaDTO {
  id: string
  warehouseId: string
  code: string
  name: string
  tipo: string
  niveladora: boolean
  active: boolean
}
export interface WmsAddressDTO {
  id: string
  warehouseId: string
  code: string
  type: string
  zone: string | null
  zoneId: string | null
  zoneRef: { id: string; code: string; name: string } | null
  rua: string | null
  coluna: number | null
  nivel: number | null
  posicao: number | null
  capacidadePeso: number
  capacidadePaletes: number
  blocked: boolean
}

export interface WmsOwnerDTO {
  id: string
  nome: string
  fantasia: string | null
  cnpj: string | null
  ativo: boolean
}

export interface WmsSkuDTO {
  id: string
  ownerId: string
  ownerNome: string | null
  code: string
  ean: string | null
  description: string
  categoria: string | null
  curve: string
  unit: string
  unitsPerBox: number
  boxesPerPallet: number | null
  boxVolumeM3: number | null
  weight: number | null
  altura: number | null
  largura: number | null
  profundidade: number | null
  boxAltura: number | null
  boxLargura: number | null
  boxProfundidade: number | null
  lastro: number | null
  alturaMaxEmpilhamento: number | null
  maxCaixasPorPallet: number | null
  pendenteParametrizacao: boolean
  ncm: string | null
  cest: string | null
  origem: number | null
  controlLote: boolean
  controlValidade: boolean
  controlSerie: boolean
  active: boolean
}

export interface WmsChecklistQuestionDTO {
  id: string
  text: string
  type: string
  required: boolean
  okLabel: string | null
  failLabel: string | null
  failValues: string[]
  requiresPhotoOnFail: boolean
  requiresObservationOnFail: boolean
  blocksStep: boolean
  requiresSupervisor: boolean
  permiteNA: boolean
}
export interface WmsChecklistDTO {
  id: string
  warehouseId: string
  ownerId: string | null
  code: string
  name: string
  flow: string
  operacao: string | null
  tipoEquipamento: string | null
  active: boolean
  version: number
  blocksOnFailure: boolean
  questions: WmsChecklistQuestionDTO[]
}

export interface WmsSupplyDTO {
  id: string
  warehouseId: string
  code: string
  name: string
  unit: string
  custoUnitario: number | null
  active: boolean
}

export interface WmsParamValueDTO {
  id: string
  warehouseId: string
  chave: string
  escopo: string
  escopoId: string | null
  valor: string
}

export interface WmsGeneralidadeDTO {
  id: string
  warehouseId: string
  ownerId: string | null
  papel: string
  texto: string
  active: boolean
}

export const wmsApi = {
  warehouses: () => authed<WmsWarehouseDTO[]>('GET', '/wms/warehouses'),
  businessUnits: () => authed<BusinessUnitLiteDTO[]>('GET', '/business-units?onlyCD=true'),
  owners: () => authed<WmsOwnerDTO[]>('GET', '/wms/owners'),
  checklists: (warehouseId?: string) =>
    authed<WmsChecklistDTO[]>('GET', `/wms/checklists${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
  createChecklist: (dto: Record<string, unknown>) => authed<WmsChecklistDTO>('POST', '/wms/checklists', dto),
  updateChecklist: (id: string, dto: Record<string, unknown>) =>
    authed<WmsChecklistDTO>('PATCH', `/wms/checklists/${id}`, dto),
  deleteChecklist: (id: string) => authed<{ ok: boolean }>('DELETE', `/wms/checklists/${id}`),
  skus: (ownerId?: string) =>
    authed<WmsSkuDTO[]>('GET', `/wms/skus${ownerId ? `?ownerId=${ownerId}` : ''}`),
  createSku: (dto: Record<string, unknown>) => authed<WmsSkuDTO>('POST', '/wms/skus', dto),
  updateSku: (id: string, dto: Record<string, unknown>) =>
    authed<WmsSkuDTO>('PATCH', `/wms/skus/${id}`, dto),
  supplies: () => authed<WmsSupplyDTO[]>('GET', '/wms/supplies'),
  createSupply: (dto: Record<string, unknown>) => authed<WmsSupplyDTO>('POST', '/wms/supplies', dto),
  updateSupply: (id: string, dto: Record<string, unknown>) =>
    authed<WmsSupplyDTO>('PATCH', `/wms/supplies/${id}`, dto),
  paramValues: () => authed<WmsParamValueDTO[]>('GET', '/wms/param-values'),
  setParamValue: (dto: Record<string, unknown>) => authed<WmsParamValueDTO>('POST', '/wms/param-values', dto),
  resetParamValue: (chave: string, escopo: string, escopoId: string | null, warehouseId: string) => {
    const qs = new URLSearchParams({ chave, escopo, warehouseId })
    if (escopoId) qs.set('escopoId', escopoId)
    return authed<{ ok: boolean }>('DELETE', `/wms/param-values?${qs.toString()}`)
  },
  generalidades: () => authed<WmsGeneralidadeDTO[]>('GET', '/wms/generalidades'),
  createGeneralidade: (dto: Record<string, unknown>) => authed<WmsGeneralidadeDTO>('POST', '/wms/generalidades', dto),
  updateGeneralidade: (id: string, dto: Record<string, unknown>) =>
    authed<WmsGeneralidadeDTO>('PATCH', `/wms/generalidades/${id}`, dto),
  deleteGeneralidade: (id: string) => authed<{ ok: boolean }>('DELETE', `/wms/generalidades/${id}`),
  createWarehouse: (dto: Record<string, unknown>) => authed<WmsWarehouseDTO>('POST', '/wms/warehouses', dto),
  updateWarehouse: (id: string, dto: Record<string, unknown>) =>
    authed<WmsWarehouseDTO>('PATCH', `/wms/warehouses/${id}`, dto),
  zones: (wid?: string) => authed<WmsZoneDTO[]>('GET', `/wms/zones${wid ? `?warehouseId=${wid}` : ''}`),
  updateZone: (id: string, dto: Record<string, unknown>) => authed<WmsZoneDTO>('PATCH', `/wms/zones/${id}`, dto),
  deleteZone: (id: string) => authed<{ ok: boolean }>('DELETE', `/wms/zones/${id}`),
  docas: (wid?: string) => authed<WmsDocaDTO[]>('GET', `/wms/docas${wid ? `?warehouseId=${wid}` : ''}`),
  createDoca: (dto: Record<string, unknown>) => authed<WmsDocaDTO>('POST', '/wms/docas', dto),
  updateDoca: (id: string, dto: Record<string, unknown>) => authed<WmsDocaDTO>('PATCH', `/wms/docas/${id}`, dto),
  deleteDoca: (id: string) => authed<{ ok: boolean }>('DELETE', `/wms/docas/${id}`),
  addresses: (wid?: string) =>
    authed<WmsAddressDTO[]>('GET', `/wms/addresses${wid ? `?warehouseId=${wid}` : ''}`),
  createAddress: (dto: Record<string, unknown>) => authed<WmsAddressDTO>('POST', '/wms/addresses', dto),
  bulkAddresses: (warehouseId: string, addresses: Record<string, unknown>[]) =>
    authed<{ created: number; ignored: number }>('POST', '/wms/addresses/bulk', { warehouseId, addresses }),
  updateAddress: (id: string, dto: Record<string, unknown>) =>
    authed<WmsAddressDTO>('PATCH', `/wms/addresses/${id}`, dto),
  deleteAddress: (id: string) => authed<{ ok: boolean }>('DELETE', `/wms/addresses/${id}`),
  createZone: (dto: Record<string, unknown>) => authed<WmsZoneDTO>('POST', '/wms/zones', dto),
}
