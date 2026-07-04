import {
  LayoutDashboard,
  Package,
  Warehouse,
  Users,
  Factory,
  Truck,
  LayoutGrid,
  MapPin,
  Container,
  SlidersHorizontal,
  UserCog,
  ShieldCheck,
  ClipboardList,
  ClipboardCheck,
  Upload,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  group: string
  badge?: string
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, group: 'Visão geral' },

  // Fase 1 — cadastros mestres
  { to: '/produtos', label: 'Produtos (SKU)', icon: Package, group: 'Cadastros' },
  { to: '/armazens', label: 'Armazéns & CDs', icon: Warehouse, group: 'Cadastros' },
  { to: '/owners', label: 'Clientes (Owners)', icon: Users, group: 'Cadastros' },
  { to: '/fornecedores', label: 'Fornecedores', icon: Factory, group: 'Cadastros' },
  { to: '/transportadoras', label: 'Transportadoras', icon: Truck, group: 'Cadastros' },
  { to: '/insumos', label: 'Insumos', icon: Container, group: 'Cadastros', badge: 'novo' },
  { to: '/migracao-dados', label: 'Migração de Dados', icon: Upload, group: 'Cadastros', badge: 'demo' },

  // Fase 2 — estrutura física
  { to: '/zonas', label: 'Zonas', icon: LayoutGrid, group: 'Estrutura física' },
  { to: '/enderecos', label: 'Endereços', icon: MapPin, group: 'Estrutura física' },
  { to: '/docas', label: 'Docas', icon: Container, group: 'Estrutura física' },

  // Fase 3 — regras de operação
  { to: '/parametros', label: 'Parâmetros', icon: SlidersHorizontal, group: 'Regras de operação' },
  { to: '/checklists', label: 'Checklists', icon: ClipboardCheck, group: 'Regras de operação', badge: 'P0' },
  { to: '/generalidades', label: 'Generalidades', icon: ClipboardList, group: 'Regras de operação', badge: 'novo' },

  // Fase 4 — acessos & governança
  { to: '/usuarios', label: 'Usuários', icon: UserCog, group: 'Acessos & Governança' },
  { to: '/perfis', label: 'Perfis & Permissões', icon: ShieldCheck, group: 'Acessos & Governança' },
  { to: '/reason-codes', label: 'Reason Codes', icon: ClipboardList, group: 'Acessos & Governança' },
]
