import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { AppLayout } from '@/features/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SimuladorPage } from '@/features/simulador/SimuladorPage'
import { PropostasPage } from '@/features/propostas/PropostasPage'
import { CrmPage } from '@/features/crm/CrmPage'
import { AgendaPage } from '@/features/agenda/AgendaPage'
import { FunisPage } from '@/features/crm/FunisPage'
import { PropostaPdfPage } from '@/features/propostas/PropostaPdfPage'
import { CustosFixosPage } from '@/features/custosFixos/CustosFixosPage'
import { PlanoContasPage } from '@/features/planoContas/PlanoContasPage'
import { TaxasPage } from '@/features/taxas/TaxasPage'
import { BreakEvenPage } from '@/features/breakeven/BreakEvenPage'
import { MetasPage } from '@/features/metas/MetasPage'
import { MixPage } from '@/features/mix/MixPage'
import { RpoPage } from '@/features/rpo/RpoPage'
import { UnidadesPage } from '@/features/unidades/UnidadesPage'
import { UsuariosPage } from '@/features/usuarios/UsuariosPage'
import { ModelosPropostaPage } from '@/features/modelosProposta/ModelosPropostaPage'
import { ServicosPage } from '@/features/servicos/ServicosPage'
import { TiposCustoPage } from '@/features/tiposCusto/TiposCustoPage'
import { VeiculosPage } from '@/features/veiculos/VeiculosPage'
import { BoletoTestePage } from '@/features/boletoTeste/BoletoTestePage'
import { ClientesPage } from '@/features/parceiros/ClientesPage'
import { FornecedoresPage } from '@/features/parceiros/FornecedoresPage'
import { VendedoresPage } from '@/features/parceiros/VendedoresPage'
import { CategoriasPage } from '@/features/categorias/CategoriasPage'
import { AprovadoresPage } from '@/features/aprovadores/AprovadoresPage'
import { AuditoriaPage } from '@/features/auditoria/AuditoriaPage'
import { EntradasSaidasPage } from '@/features/financeiro/EntradasSaidasPage'
import { CaixaPage } from '@/features/financeiro/CaixaPage'
import { ConciliacaoPage } from '@/features/financeiro/ConciliacaoPage'
import { CamposOperacaoPage } from '@/features/camposOperacao/CamposOperacaoPage'
import { FichasTecnicasPage } from '@/features/fichaTecnica/FichasTecnicasPage'
import { PricingPage } from '@/features/simulador/PricingPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas protegidas dentro do layout */}
      <Route element={<ProtectedRoute />}>
        {/* Proposta em PDF — fora do layout (impressão limpa) */}
        <Route path="/propostas/:id/pdf" element={<PropostaPdfPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Operação */}
          {/* Pricing: dados da operação e ficha técnica parametrizáveis */}
          <Route path="/simulador" element={<PricingPage />} />
          {/* Pricing antigo: fora do menu, guardado (não apagado) até a homologação do novo */}
          <Route path="/simulador/antigo" element={<SimuladorPage />} />
          <Route path="/simulador/nova" element={<Navigate to="/simulador" replace />} />
          <Route path="/propostas" element={<PropostasPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/agenda" element={<AgendaPage />} />

          {/* Cadastros */}
          <Route path="/cadastros/custos-fixos" element={<CustosFixosPage />} />
          <Route path="/cadastros/plano-contas" element={<PlanoContasPage />} />
          <Route path="/cadastros/taxas" element={<TaxasPage />} />
          <Route path="/cadastros/unidades" element={<UnidadesPage />} />
          <Route path="/cadastros/clientes" element={<ClientesPage />} />
          <Route path="/cadastros/fornecedores" element={<FornecedoresPage />} />
          <Route path="/cadastros/vendedores" element={<VendedoresPage />} />
          <Route path="/cadastros/servicos" element={<ServicosPage />} />
          <Route path="/cadastros/tipos-custo" element={<TiposCustoPage />} />
          <Route path="/cadastros/veiculos" element={<VeiculosPage />} />
          {/* Provisória, fora do menu: testes de boleto (permissão especial /financeiro/boleto-teste). */}
          <Route path="/boleto" element={<BoletoTestePage />} />
          <Route path="/cadastros/categorias" element={<CategoriasPage />} />
          <Route path="/cadastros/aprovadores" element={<AprovadoresPage />} />
          <Route path="/cadastros/funis" element={<FunisPage />} />
          <Route path="/cadastros/modelos-proposta" element={<ModelosPropostaPage />} />
          <Route path="/cadastros/usuarios" element={<UsuariosPage />} />
          <Route path="/cadastros/auditoria" element={<AuditoriaPage />} />
          {/* Cadastros parametrizáveis (fase de layout) */}
          <Route path="/cadastros/campos-operacao" element={<CamposOperacaoPage />} />
          <Route path="/cadastros/fichas-tecnicas" element={<FichasTecnicasPage />} />

          {/* Financeiro (fase de layout) */}
          <Route path="/financeiro/entradas-saidas" element={<EntradasSaidasPage />} />
          <Route path="/financeiro/caixa" element={<CaixaPage />} />
          <Route path="/financeiro/conciliacao" element={<ConciliacaoPage />} />

          {/* Análises */}
          <Route path="/analises/break-even" element={<BreakEvenPage />} />
          <Route path="/analises/mix" element={<MixPage />} />
          <Route path="/analises/rpo" element={<RpoPage />} />
          <Route path="/analises/metas" element={<MetasPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
