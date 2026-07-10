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

/**
 * MENU REORGANIZADO (09/07, pedido do Victor): o que grava de verdade primeiro
 * (estrutura física → catálogo → regras), e tudo que é 100% mock isolado no
 * grupo "Demonstração".
 */
export const NAV: NavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, group: 'Visão geral', badge: 'demo' },

  // A geografia do armazém (tudo REAL — é daqui que o coletor bipa endereços).
  { to: '/armazens', label: 'Armazéns & CDs', icon: Warehouse, group: 'Estrutura física' },
  { to: '/zonas', label: 'Zonas', icon: LayoutGrid, group: 'Estrutura física' },
  { to: '/enderecos', label: 'Endereços', icon: MapPin, group: 'Estrutura física' },
  { to: '/docas', label: 'Docas', icon: Container, group: 'Estrutura física' },

  // O que existe dentro dele (tudo REAL).
  { to: '/owners', label: 'Clientes (Owners)', icon: Users, group: 'Catálogo' },
  { to: '/produtos', label: 'Produtos (SKU)', icon: Package, group: 'Catálogo' },
  { to: '/insumos', label: 'Insumos', icon: Container, group: 'Catálogo' },

  // Como a operação se comporta (tudo REAL).
  { to: '/parametros', label: 'Parâmetros', icon: SlidersHorizontal, group: 'Regras de operação' },
  { to: '/checklists', label: 'Checklists', icon: ClipboardCheck, group: 'Regras de operação' },
  { to: '/generalidades', label: 'Generalidades', icon: ClipboardList, group: 'Regras de operação' },

  // 100% mock — cadastros que ainda não têm backend (governança fica p/ o RBAC
  // do sistema; fornecedores/transportadoras são master data do TMS).
  { to: '/usuarios', label: 'Usuários', icon: UserCog, group: 'Demonstração', badge: 'demo' },
  { to: '/perfis', label: 'Perfis & Permissões', icon: ShieldCheck, group: 'Demonstração', badge: 'demo' },
  { to: '/reason-codes', label: 'Reason Codes', icon: ClipboardList, group: 'Demonstração', badge: 'demo' },
  { to: '/fornecedores', label: 'Fornecedores', icon: Factory, group: 'Demonstração', badge: 'demo' },
  { to: '/transportadoras', label: 'Transportadoras', icon: Truck, group: 'Demonstração', badge: 'demo' },
  { to: '/migracao-dados', label: 'Migração de Dados', icon: Upload, group: 'Demonstração', badge: 'demo' },
]
