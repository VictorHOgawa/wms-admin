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
  Boxes,
  BookOpen,
  Database,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, PageHeader } from '../components/ui'
import { num } from '../lib/utils'
import { wmsApi } from '../lib/wmsApi'

/**
 * Painel administrativo 100% REAL (decisão 10/07: fim do modo demo) — os
 * contadores vêm do backend. O grupo Demonstração fica separado e rotulado,
 * sem número de mentira.
 */

interface Contagens {
  armazens: number
  zonas: number
  enderecos: number
  enderecosLivres: number
  docas: number
  skus: number
  skusAtivos: number
  owners: number
  insumos: number
  checklists: number
  parametros: number
  generalidades: number
}

export default function Dashboard() {
  const [c, setC] = useState<Contagens | null>(null)

  useEffect(() => {
    let vivo = true
    Promise.all([
      wmsApi.warehouses().catch(() => []),
      wmsApi.zones().catch(() => []),
      wmsApi.addresses().catch(() => []),
      wmsApi.docas().catch(() => []),
      wmsApi.skus().catch(() => []),
      wmsApi.owners().catch(() => []),
      wmsApi.supplies().catch(() => []),
      wmsApi.checklists().catch(() => []),
      wmsApi.paramValues().catch(() => []),
      wmsApi.generalidades().catch(() => []),
    ]).then(([arm, zon, end, doc, skus, own, sup, chk, par, ger]) => {
      if (!vivo) return
      setC({
        armazens: arm.length,
        zonas: zon.length,
        enderecos: end.length,
        enderecosLivres: (end as { blocked?: boolean }[]).filter((e) => !e.blocked).length,
        docas: doc.length,
        skus: skus.length,
        skusAtivos: (skus as { active?: boolean }[]).filter((s) => s.active !== false).length,
        owners: own.length,
        insumos: sup.length,
        checklists: chk.length,
        parametros: par.length,
        generalidades: ger.length,
      })
    })
    return () => {
      vivo = false
    }
  }, [])

  const cards = c
    ? [
        { to: '/produtos', label: 'Produtos (SKU)', icon: Package, total: c.skus, sub: `${num(c.skusAtivos)} ativos`, group: 'Catálogo' },
        { to: '/owners', label: 'Clientes (Owners)', icon: Users, total: c.owners, sub: 'cadastro vive no TMS', group: 'Catálogo' },
        { to: '/insumos', label: 'Insumos', icon: Boxes, total: c.insumos, sub: 'pallets, filme, etiquetas…', group: 'Catálogo' },
        { to: '/armazens', label: 'Armazéns & CDs', icon: Warehouse, total: c.armazens, sub: 'vinculados a CD do TMS', group: 'Estrutura física' },
        { to: '/zonas', label: 'Zonas', icon: LayoutGrid, total: c.zonas, sub: 'picking, pulmão, staging…', group: 'Estrutura física' },
        { to: '/enderecos', label: 'Endereços', icon: MapPin, total: c.enderecos, sub: `${num(c.enderecosLivres)} desbloqueados`, group: 'Estrutura física' },
        { to: '/docas', label: 'Docas', icon: Container, total: c.docas, sub: 'recebimento e expedição', group: 'Estrutura física' },
        { to: '/parametros', label: 'Parâmetros', icon: SlidersHorizontal, total: c.parametros, sub: 'valores sobrescritos', group: 'Regras de operação' },
        { to: '/checklists', label: 'Checklists', icon: ClipboardList, total: c.checklists, sub: 'templates editáveis', group: 'Regras de operação' },
        { to: '/generalidades', label: 'Generalidades', icon: BookOpen, total: c.generalidades, sub: 'regras por cliente', group: 'Regras de operação' },
      ]
    : []

  const checklist = c
    ? [
        { label: 'Produtos cadastrados', ok: c.skus > 0 },
        { label: 'Armazém configurado', ok: c.armazens > 0 },
        { label: 'Zonas definidas', ok: c.zonas > 0 },
        { label: 'Endereços gerados', ok: c.enderecos > 0 },
        { label: 'Docas cadastradas', ok: c.docas > 0 },
      ]
    : []
  const prontos = checklist.filter((x) => x.ok).length
  const grupos = [...new Set(cards.map((x) => x.group))]

  const demoLinks = [
    { to: '/usuarios', label: 'Usuários', icon: UserCog },
    { to: '/perfis', label: 'Perfis & Permissões', icon: ShieldCheck },
    { to: '/reason-codes', label: 'Reason Codes', icon: ClipboardList },
    { to: '/fornecedores', label: 'Fornecedores', icon: Factory },
    { to: '/transportadoras', label: 'Transportadoras', icon: Truck },
    { to: '/migracao-dados', label: 'Migração de Dados', icon: Database },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel administrativo"
        subtitle="Cadastros e estrutura do WMS — contadores direto do backend"
      >
        <Badge tone="ok" dot>
          dados reais
        </Badge>
      </PageHeader>

      {!c ? (
        <div className="card p-8 text-center text-sm text-ink-muted">Carregando cadastros…</div>
      ) : (
        <>
          {/* checklist de prontidão — real */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-brand">Prontidão do WMS</p>
                <p className="text-sm text-ink-muted">
                  {prontos} de {checklist.length} etapas de estrutura concluídas
                </p>
              </div>
              <Badge tone={prontos === checklist.length ? 'ok' : 'warn'}>
                {Math.round((prontos / checklist.length) * 100)}%
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {checklist.map((x) => (
                <div key={x.label} className="flex items-center gap-2.5 rounded-xl border border-line p-3">
                  {x.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-ok shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warn shrink-0" />
                  )}
                  <span className="text-sm text-ink-soft">{x.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* contadores reais por grupo */}
          {grupos.map((g) => (
            <div key={g}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{g}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards
                  .filter((x) => x.group === g)
                  .map((x) => (
                    <Link key={x.to} to={x.to} className="card p-4 hover:shadow-pop transition-shadow group">
                      <div className="flex items-start justify-between">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary grid place-items-center">
                          <x.icon className="h-5 w-5" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-primary transition-colors" />
                      </div>
                      <p className="mt-3 text-sm text-ink-muted">{x.label}</p>
                      <p className="text-2xl font-bold text-brand mono">{num(x.total)}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{x.sub}</p>
                    </Link>
                  ))}
              </div>
            </div>
          ))}

          {/* vitrine — sem backend ainda, sem número de mentira */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Demonstração — telas ainda sem backend
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {demoLinks.map((x) => (
                <Link
                  key={x.to}
                  to={x.to}
                  className="card p-3 hover:border-brand transition-colors flex items-center gap-2.5"
                >
                  <x.icon className="h-4 w-4 text-ink-muted shrink-0" />
                  <span className="text-sm text-ink-soft flex-1 truncate">{x.label}</span>
                  <Badge tone="neutral">demo</Badge>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
