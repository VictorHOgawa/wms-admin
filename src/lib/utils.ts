import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const num = (v: number) => v.toLocaleString('pt-BR')

export const digitsOnly = (v: string) => v.replace(/\D/g, '')

export const maskCnpj = (v: string) => {
  const d = digitsOnly(v).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export const maskPhone = (v: string) => {
  const d = digitsOnly(v).slice(0, 11)
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export const maskEan = (v: string) => digitsOnly(v).slice(0, 14)

export const maskNcm = (v: string) =>
  digitsOnly(v)
    .slice(0, 8)
    .replace(/^(\d{4})(\d)/, '$1.$2')
    .replace(/^(\d{4})\.(\d{2})(\d)/, '$1.$2.$3')

export const maskCest = (v: string) =>
  digitsOnly(v)
    .slice(0, 7)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')

export const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** dias até a validade (FEFO) — base fixa 2026-05-29 (data do projeto) */
export const diasValidade = (iso: string | null) => {
  if (!iso) return null
  const base = new Date('2026-05-29')
  const v = new Date(iso)
  return Math.round((v.getTime() - base.getTime()) / 86400000)
}

/** Gera um id curto, estável o suficiente para dados em memória (mock). */
let _seq = Date.now() % 100000
export const uid = (prefix = 'id') => `${prefix}-${(_seq++).toString(36)}`
