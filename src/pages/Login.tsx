import { useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Brand } from '../components/Brand'
import { useStore } from '../store/useStore'
import { wmsConnect } from '../lib/wmsApi'

export default function Login() {
  const login = useStore((s) => s.login)
  const [usuario, setUsuario] = useState('alex@integrabrasil.com')
  const [senha, setSenha] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAviso(null)
    // Conexão real é OBRIGATÓRIA (decisão 10/07: sem modo demo silencioso).
    const res = await wmsConnect(usuario.trim(), senha)
    if (!res.ok) {
      setAviso(res.message ?? 'Não foi possível conectar ao WMS. Verifique credenciais e conexão.')
      setLoading(false)
      return
    }
    login(usuario.trim())
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* lado da marca */}
      <div className="hidden lg:flex flex-col justify-between bg-brand text-white p-10">
        <Brand variant="light" />
        <div className="space-y-4 max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Painel de <span className="text-accent">administração</span> & negócios
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Modele o armazém, cadastre produtos, defina a estrutura física e as regras que a
            operação executa. Um schema único, configurável da PME ao operador logístico de
            40 mil posições.
          </p>
          <div className="flex items-center gap-2 text-sm text-white/60 pt-2">
            <ShieldCheck className="h-4 w-4" />
            Plano de controle do Integra WMS
          </div>
        </div>
        <p className="text-xs text-white/40">© Integra WMS — Warehouse OS</p>
      </div>

      {/* formulário */}
      <div className="flex items-center justify-center p-6 bg-surface-sub">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <Brand />
          </div>
          <div className="card p-6 sm:p-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-brand">Acessar painel</h2>
            <p className="text-sm text-ink-muted mt-1 mb-6">Entre com seu usuário administrador.</p>

            <form onSubmit={entrar} className="space-y-4">
              <div>
                <label className="label">E-mail (Hub)</label>
                <input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="seu.email@empresa.com"
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Conectando…' : 'Entrar'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
            {aviso && <p className="mt-3 text-center text-xs text-warn">{aviso}</p>}
          </div>
          <p className="text-center text-xs text-ink-muted mt-4">
            Entre com as credenciais do Hub — o painel trabalha somente com dados reais
          </p>
        </div>
      </div>
    </div>
  )
}
