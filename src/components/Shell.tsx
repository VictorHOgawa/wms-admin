import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Warehouse,
} from 'lucide-react'
import { Brand } from './Brand'
import { NAV } from './nav'
import { useStore } from '../store/useStore'
import { cn } from '../lib/utils'

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const groups = [...new Set(NAV.map((i) => i.group))]
  return (
    <div className="flex h-full flex-col bg-white text-slate-600 border-r border-slate-200">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
        <Brand />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((g) => (
          <div key={g}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {g}
            </p>
            <div className="space-y-0.5">
              {NAV.filter((i) => i.group === g).map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-primary',
                    )
                  }
                >
                  <i.icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{i.label}</span>
                  {i.badge && (
                    <span className="ml-auto chip bg-accent-50 text-accent text-[10px] px-1.5 py-0.5">
                      {i.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <div className="text-xs">
            <p className="text-brand font-semibold">Painel administrativo</p>
            <p className="text-slate-500">Configuração & cadastros</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArmazemSelector() {
  const { armazens, armazemId, setArmazem } = useStore()
  const [open, setOpen] = useState(false)
  const cur = armazens.find((a) => a.id === armazemId)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Warehouse className="h-4 w-4 text-ink-muted" />
        <div className="text-left leading-tight">
          <span className="block text-[10px] uppercase tracking-wide text-ink-muted">Armazém</span>
          <span className="block font-medium text-brand">{cur?.nome ?? 'Selecionar'}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-ink-muted" />
      </button>
      {open && (
        <div className="absolute z-30 right-0 mt-1.5 w-64 card shadow-pop p-1.5 animate-scale-in">
          {armazens.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setArmazem(a.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-colors cursor-pointer',
                a.id === armazemId ? 'bg-primary-50 text-primary' : 'hover:bg-surface-sub text-ink-soft',
              )}
            >
              <span className="flex-1">
                {a.nome}
                <span className="block text-[11px] text-ink-muted">{a.codigo} · {a.uf}</span>
              </span>
              <span
                className={cn(
                  'chip text-[10px]',
                  a.modo === 'completo' ? 'bg-primary-50 text-primary' : 'bg-slate-100 text-ink-soft',
                )}
              >
                {a.modo}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { usuario, logout } = useStore()
  const location = useLocation()
  const title = NAV.find((n) => n.to === location.pathname)?.label ?? 'Admin & Business'
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/80 backdrop-blur px-4 lg:px-6">
      <button onClick={onMenu} className="btn-ghost p-2 lg:hidden" aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden md:block">
        <h2 className="font-semibold text-brand">{title}</h2>
      </div>
      <div className="flex-1" />
      <div className="hidden lg:flex items-center gap-2 rounded-xl border border-line bg-surface-sub px-3 py-2 w-72 text-sm text-ink-muted">
        <Search className="h-4 w-4" />
        <input
          placeholder="Buscar cadastro, SKU, endereço…"
          className="bg-transparent outline-none flex-1 mono text-xs"
        />
        <kbd className="text-[10px] rounded border border-line px-1.5 py-0.5 bg-surface">⌘K</kbd>
      </div>

      <ArmazemSelector />

      <button className="relative btn-ghost p-2" aria-label="Notificações">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
      </button>

      <div className="flex items-center gap-2.5 pl-2 border-l border-line">
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-sm">
          {usuario.slice(0, 2).toUpperCase() || 'AD'}
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="text-sm font-medium text-brand">{usuario || 'Administrador'}</p>
          <p className="text-[11px] text-ink-muted">Administrador</p>
        </div>
        <button onClick={logout} className="btn-ghost p-2" aria-label="Sair" title="Sair">
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  )
}

export default function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden">
      {/* desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-brand/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 animate-fade-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute -right-10 top-3 text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
