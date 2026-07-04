import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './store/useStore'
import Shell from './components/Shell'
import { Toaster } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Produtos from './pages/Produtos'
import Armazens from './pages/Armazens'
import Owners from './pages/Owners'
import Insumos from './pages/Insumos'
import Generalidades from './pages/Generalidades'
import Fornecedores from './pages/Fornecedores'
import Transportadoras from './pages/Transportadoras'
import Zonas from './pages/Zonas'
import Enderecos from './pages/Enderecos'
import Docas from './pages/Docas'
import Parametros from './pages/Parametros'
import Checklists from './pages/Checklists'
import Usuarios from './pages/Usuarios'
import Perfis from './pages/Perfis'
import ReasonCodes from './pages/ReasonCodes'
import MigracaoDados from './pages/MigracaoDados'

export default function App() {
  const autenticado = useStore((s) => s.autenticado)

  return (
    <>
      <Routes>
        <Route path="/login" element={autenticado ? <Navigate to="/" replace /> : <Login />} />
        <Route element={autenticado ? <Shell /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/armazens" element={<Armazens />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/insumos" element={<Insumos />} />
          <Route path="/generalidades" element={<Generalidades />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/transportadoras" element={<Transportadoras />} />
          <Route path="/migracao-dados" element={<MigracaoDados />} />
          <Route path="/migracao-dados/:loteSlug" element={<MigracaoDados />} />
          <Route path="/zonas" element={<Zonas />} />
          <Route path="/enderecos" element={<Enderecos />} />
          <Route path="/docas" element={<Docas />} />
          <Route path="/parametros" element={<Parametros />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/perfis" element={<Perfis />} />
          <Route path="/reason-codes" element={<ReasonCodes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}
