import { useId, type ReactNode } from 'react'
import { cn } from '../lib/utils'

/* ---------------- Field (label + input) ---------------- */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  mono,
  hint,
  className,
  disabled,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'number' | 'email'
  mono?: boolean
  hint?: string
  className?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('input', mono && 'mono', disabled && 'opacity-60 cursor-not-allowed')}
      />
      {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
    </div>
  )
}

/* ---------------- SelectField ---------------- */
export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  hint?: string
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input cursor-pointer">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
    </div>
  )
}

/* ---------------- Toggle (mesma anatomia do wms-frontend) ---------------- */
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors shrink-0 cursor-pointer',
        on ? 'bg-primary' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
          on ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

/* Linha de configuração com título + descrição + toggle (igual Configuracoes do front) */
export function SettingRow({
  title,
  desc,
  on,
  onToggle,
}: {
  title: string
  desc: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-line last:border-0">
      <div>
        <p className="text-sm font-medium text-brand">{title}</p>
        <p className="text-xs text-ink-muted mt-0.5">{desc}</p>
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  )
}

/* ---------------- FormGrid (grid responsivo de campos) ---------------- */
export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const map = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }
  return <div className={cn('grid gap-4', map[cols])}>{children}</div>
}

/* ---------------- Seção dentro de um modal/form ---------------- */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </div>
  )
}
