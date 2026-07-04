import { create } from 'zustand'
import {
  ARMAZENS,
  CHECKLISTS,
  DOCAS,
  ENDERECOS,
  FORNECEDORES,
  OWNERS,
  PARAMETROS,
  PERFIS,
  REASON_CODES,
  SKUS,
  TRANSPORTADORAS,
  USUARIOS,
  ZONAS,
} from '../lib/mock'
import { uid } from '../lib/utils'
import type {
  Armazem,
  ChecklistTemplate,
  CollectionKey,
  Doca,
  Endereco,
  EscopoParametro,
  Fornecedor,
  Owner,
  Perfil,
  ReasonCode,
  SKU,
  Transportadora,
  Usuario,
  ValorParametro,
  Zona,
} from '../lib/types'

export interface Toast {
  id: number
  tipo: 'sucesso' | 'erro' | 'info' | 'aviso'
  titulo: string
  texto?: string
}

/** Item com id — base do CRUD genérico. */
interface WithId {
  id: string
}

interface State {
  // sessão
  autenticado: boolean
  usuario: string
  // armazém em foco (multi-armazém desde o dia 1)
  armazemId: string

  // coleções (Fase 1 + Fase 2)
  armazens: Armazem[]
  skus: SKU[]
  owners: Owner[]
  fornecedores: Fornecedor[]
  transportadoras: Transportadora[]
  zonas: Zona[]
  docas: Doca[]
  enderecos: Endereco[]
  // Fase 3 + 4
  parametros: ValorParametro[]
  usuarios: Usuario[]
  perfis: Perfil[]
  reasonCodes: ReasonCode[]
  checklists: ChecklistTemplate[]

  toasts: Toast[]

  // sessão
  login: (usuario: string) => void
  logout: () => void
  setArmazem: (id: string) => void

  // CRUD genérico
  upsert: <T extends WithId>(col: CollectionKey, item: T) => void
  remove: (col: CollectionKey, id: string) => void
  bulkAdd: <T extends WithId>(col: CollectionKey, items: T[]) => void

  // parâmetros (Fase 3)
  setParametro: (chave: string, escopo: EscopoParametro, escopoId: string | null, valor: string) => void
  resetParametro: (chave: string, escopo: EscopoParametro, escopoId: string | null) => void

  // toasts
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let toastSeq = 1

export const useStore = create<State>((set, get) => ({
  autenticado: false,
  usuario: '',
  armazemId: 'cd-sp',

  armazens: structuredClone(ARMAZENS),
  skus: structuredClone(SKUS),
  owners: structuredClone(OWNERS),
  fornecedores: structuredClone(FORNECEDORES),
  transportadoras: structuredClone(TRANSPORTADORAS),
  zonas: structuredClone(ZONAS),
  docas: structuredClone(DOCAS),
  enderecos: structuredClone(ENDERECOS),
  parametros: structuredClone(PARAMETROS),
  usuarios: structuredClone(USUARIOS),
  perfis: structuredClone(PERFIS),
  reasonCodes: structuredClone(REASON_CODES),
  checklists: structuredClone(CHECKLISTS),

  toasts: [],

  login: (usuario) => set({ autenticado: true, usuario }),
  logout: () => set({ autenticado: false, usuario: '' }),
  setArmazem: (id) => set({ armazemId: id }),

  upsert: (col, item) =>
    set((s) => {
      const arr = s[col] as WithId[]
      const exists = arr.some((x) => x.id === item.id)
      return {
        [col]: exists ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item],
      } as unknown as Partial<State>
    }),

  remove: (col, id) =>
    set((s) => ({ [col]: (s[col] as WithId[]).filter((x) => x.id !== id) }) as unknown as Partial<State>),

  bulkAdd: (col, items) =>
    set((s) => ({ [col]: [...(s[col] as WithId[]), ...items] }) as unknown as Partial<State>),

  setParametro: (chave, escopo, escopoId, valor) =>
    set((s) => {
      const idx = s.parametros.findIndex(
        (p) => p.chave === chave && p.escopo === escopo && (p.escopoId ?? null) === (escopoId ?? null),
      )
      if (idx >= 0) {
        const next = [...s.parametros]
        next[idx] = { ...next[idx], valor }
        return { parametros: next }
      }
      return { parametros: [...s.parametros, { id: uid('par'), chave, escopo, escopoId, valor }] }
    }),

  resetParametro: (chave, escopo, escopoId) =>
    set((s) => ({
      parametros: s.parametros.filter(
        (p) => !(p.chave === chave && p.escopo === escopo && (p.escopoId ?? null) === (escopoId ?? null)),
      ),
    })),

  toast: (t) => {
    const id = toastSeq++
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => get().dismiss(id), 4200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
