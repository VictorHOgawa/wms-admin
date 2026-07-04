import { Link } from 'react-router-dom'
import {
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
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, PageHeader } from '../components/ui'
import { armazemName, DEFINICOES_PARAMETROS } from '../lib/mock'
import { num } from '../lib/utils'

export default function Dashboard() {
  const s = useStore()
  const armazem = s.armazens.find((a) => a.id === s.armazemId)

  const ativosSub = (n: number) => `${num(n)} ativo${n === 1 ? '' : 's'}`
  const cards = [
    { to: '/produtos', label: 'Produtos (SKU)', icon: Package, total: s.skus.length, sub: ativosSub(s.skus.filter((x) => x.ativo).length), group: 'Cadastros' },
    { to: '/armazens', label: 'Armazéns & CDs', icon: Warehouse, total: s.armazens.length, sub: ativosSub(s.armazens.filter((x) => x.ativo).length), group: 'Cadastros' },
    { to: '/owners', label: 'Clientes (Owners)', icon: Users, total: s.owners.length, sub: ativosSub(s.owners.filter((x) => x.ativo).length), group: 'Cadastros' },
    { to: '/fornecedores', label: 'Fornecedores', icon: Factory, total: s.fornecedores.length, sub: ativosSub(s.fornecedores.filter((x) => x.ativo).length), group: 'Cadastros' },
    { to: '/transportadoras', label: 'Transportadoras', icon: Truck, total: s.transportadoras.length, sub: ativosSub(s.transportadoras.filter((x) => x.ativo).length), group: 'Cadastros' },
    { to: '/zonas', label: 'Zonas', icon: LayoutGrid, total: s.zonas.filter((z) => z.armazemId === s.armazemId).length, sub: ativosSub(s.zonas.filter((z) => z.armazemId === s.armazemId && z.ativo).length), group: 'Estrutura física' },
    { to: '/enderecos', label: 'Endereços', icon: MapPin, total: s.enderecos.filter((e) => e.armazemId === s.armazemId).length, sub: `${num(s.enderecos.filter((e) => e.armazemId === s.armazemId && !e.bloqueado).length)} livres`, group: 'Estrutura física' },
    { to: '/docas', label: 'Docas', icon: Container, total: s.docas.filter((d) => d.armazemId === s.armazemId).length, sub: ativosSub(s.docas.filter((d) => d.armazemId === s.armazemId && d.ativo).length), group: 'Estrutura física' },
    { to: '/parametros', label: 'Parâmetros', icon: SlidersHorizontal, total: DEFINICOES_PARAMETROS.length, sub: `${num(s.parametros.length)} sobrescritas`, group: 'Regras & Governança' },
    { to: '/usuarios', label: 'Usuários', icon: UserCog, total: s.usuarios.length, sub: ativosSub(s.usuarios.filter((x) => x.ativo).length), group: 'Regras & Governança' },
    { to: '/perfis', label: 'Perfis', icon: ShieldCheck, total: s.perfis.length, sub: ativosSub(s.perfis.filter((x) => x.ativo).length), group: 'Regras & Governança' },
    { to: '/reason-codes', label: 'Reason Codes', icon: ClipboardList, total: s.reasonCodes.length, sub: ativosSub(s.reasonCodes.filter((x) => x.ativo).length), group: 'Regras & Governança' },
  ]

  // checklist de setup do armazém em foco
  const temZonas = s.zonas.some((z) => z.armazemId === s.armazemId)
  const temEnderecos = s.enderecos.some((e) => e.armazemId === s.armazemId)
  const temDocas = s.docas.some((d) => d.armazemId === s.armazemId)
  const checklist = [
    { label: 'Produtos cadastrados', ok: s.skus.length > 0 },
    { label: 'Armazém configurado', ok: !!armazem },
    { label: 'Zonas definidas', ok: temZonas },
    { label: 'Endereços gerados', ok: temEnderecos },
    { label: 'Docas cadastradas', ok: temDocas },
  ]
  const prontos = checklist.filter((c) => c.ok).length

  const grupos = [...new Set(cards.map((c) => c.group))]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel administrativo"
        subtitle={`Controle de cadastros e estrutura · armazém em foco: ${armazemName(s.armazemId)}`}
      >
        <Badge tone={armazem?.modo === 'completo' ? 'primary' : 'neutral'} dot>
          Modo {armazem?.modo ?? '—'}
        </Badge>
      </PageHeader>

      {/* checklist de setup */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-brand">Prontidão do armazém</p>
            <p className="text-sm text-ink-muted">{armazemName(s.armazemId)} — {prontos} de {checklist.length} etapas</p>
          </div>
          <Badge tone={prontos === checklist.length ? 'ok' : 'warn'}>
            {Math.round((prontos / checklist.length) * 100)}%
          </Badge>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {checklist.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-2.5 rounded-xl border border-line p-3"
            >
              {c.ok ? (
                <CheckCircle2 className="h-5 w-5 text-ok shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warn shrink-0" />
              )}
              <span className="text-sm text-ink-soft">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* contadores por cadastro */}
      {grupos.map((g) => (
        <div key={g}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{g}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards
              .filter((c) => c.group === g)
              .map((c) => (
                <Link
                  key={c.to}
                  to={c.to}
                  className="card p-4 hover:shadow-pop transition-shadow group"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary grid place-items-center">
                      <c.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-primary transition-colors" />
                  </div>
                  <p className="mt-3 text-sm text-ink-muted">{c.label}</p>
                  <p className="text-2xl font-bold text-brand mono">{num(c.total)}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{c.sub}</p>
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
