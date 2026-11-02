import type { ServicoFiscal } from '@/features/servicos/fiscal'
import type { ImpostoServico } from '@/features/servicos/impostos'
import type { Motorista } from '@/features/motoristas/types'
import { apiFetch } from '@/lib/api'
import type { Taxa } from '@/features/taxas/types'
import type { CustoFixo } from '@/features/custosFixos/types'
import type { PlanoConta } from '@/features/planoContas/types'
import type { CertificadoInfo, Unidade } from '@/features/unidades/types'
import type { Usuario } from '@/features/usuarios/types'
import type { ItemProposta, Proposta } from '@/features/propostas/types'
import type { CenarioMeta } from '@/features/metas/mock'
import type { ModeloProposta } from '@/features/modelosProposta/types'
import type { Parceiro, Vendedor } from '@/features/parceiros/types'
import type { CategoriaCusto } from '@/features/categorias/types'
import type { RegraAprovacao } from '@/features/aprovadores/types'
import type { Veiculo } from '@/features/veiculos/types'

/**
 * Camada HTTP dos cadastros (backend .NET). O apiFetch injeta baseURL (/api) + Bearer.
 * POST = criar; PUT = atualizar (o front decide qual chamar).
 */

// ── Taxas ──────────────────────────────────────────────────────────────────
export const listTaxas = () => apiFetch<Taxa[]>('/taxas')
export const createTaxa = (t: Taxa) => apiFetch<Taxa>('/taxas', { method: 'POST', body: JSON.stringify(t) })
export const updateTaxa = (t: Taxa) => apiFetch<Taxa>(`/taxas/${t.id}`, { method: 'PUT', body: JSON.stringify(t) })

// ── Plano de Contas ─────────────────────────────────────────────────────────
export const listPlanoContas = () => apiFetch<PlanoConta[]>('/plano-contas')
export const createPlanoConta = (c: PlanoConta) =>
  apiFetch<PlanoConta>('/plano-contas', { method: 'POST', body: JSON.stringify(c) })
export const updatePlanoConta = (c: PlanoConta) =>
  apiFetch<PlanoConta>(`/plano-contas/${c.id}`, { method: 'PUT', body: JSON.stringify(c) })

// ── Custos Fixos ────────────────────────────────────────────────────────────
export const listCustosFixos = () => apiFetch<CustoFixo[]>('/custos-fixos')
export const createCustoFixo = (c: CustoFixo) =>
  apiFetch<CustoFixo>('/custos-fixos', { method: 'POST', body: JSON.stringify(c) })
export const updateCustoFixo = (c: CustoFixo) =>
  apiFetch<CustoFixo>(`/custos-fixos/${c.id}`, { method: 'PUT', body: JSON.stringify(c) })
/** Resultado de alinhar os lançamentos a pagar da despesa (motivo: por que não gerou). */
export interface ResumoLancamentosDf {
  criados: number
  atualizados: number
  cancelados: number
  emAberto: number
  motivo: string
  /** Meses não criados porque já havia lançamento feito à mão ("10/2026: nº 20 · André · R$ 2.000,00"). */
  jaLancados?: string[]
}
export const lancamentosDaDespesa = (id: string) => apiFetch<{ emAberto: number; motivo: string }>(`/custos-fixos/${id}/lancamentos`)
export const gerarLancamentosDaDespesa = (id: string, atualizarAbertos: boolean) =>
  apiFetch<ResumoLancamentosDf>(`/custos-fixos/${id}/lancamentos?atualizarAbertos=${atualizarAbertos}`, { method: 'POST' })

/** Importação de planilha (lote). */
export const importarCustosFixos = (list: CustoFixo[]) =>
  apiFetch<CustoFixo[]>('/custos-fixos/bulk', { method: 'POST', body: JSON.stringify(list) })
export const importarPlanoContas = (list: PlanoConta[]) =>
  apiFetch<PlanoConta[]>('/plano-contas/bulk', { method: 'POST', body: JSON.stringify(list) })

// ── Empresas ────────────────────────────────────────────────────────────────
export const listEmpresas = () => apiFetch<Unidade[]>('/empresas')
export const createEmpresa = (e: Unidade) =>
  apiFetch<Unidade>('/empresas', { method: 'POST', body: JSON.stringify(e) })
export const updateEmpresa = (e: Unidade) =>
  apiFetch<Unidade>(`/empresas/${e.id}`, { method: 'PUT', body: JSON.stringify(e) })
/** Quantas propostas a empresa já emitiu no prefixo próprio (travado = o padrão não muda mais). */
export const getNumeracaoEmpresa = (id: string) =>
  apiFetch<{ emitidas: number; travado: boolean; contratos: number; contratoTravado: boolean }>(`/empresas/${id}/numeracao`)
/** Certificado A1 da empresa: só a situação (titular, CNPJ, validade); `disponivel` = o servidor tem a chave para guardar. */
export const getCertificadoEmpresa = (id: string) =>
  apiFetch<{ disponivel: boolean; certificado: CertificadoInfo | null }>(`/empresas/${id}/certificado`)
export const enviarCertificadoEmpresa = (id: string, envio: { arquivoBase64: string; senha: string; nomeArquivo: string }) =>
  apiFetch<CertificadoInfo>(`/empresas/${id}/certificado`, { method: 'PUT', body: JSON.stringify(envio) })
export const removerCertificadoEmpresa = (id: string) => apiFetch<void>(`/empresas/${id}/certificado`, { method: 'DELETE' })

// ── Usuários ────────────────────────────────────────────────────────────────
export type SalvarUsuario = Omit<Usuario, 'id'> & { senha?: string; enviarConvite?: boolean; urlBase?: string }
export const listUsuarios = () => apiFetch<Usuario[]>('/usuarios')
export const createUsuario = (u: SalvarUsuario) =>
  apiFetch<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(u) })
export const updateUsuario = (id: string, u: SalvarUsuario) =>
  apiFetch<Usuario>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(u) })
/** Manda (ou reenvia) o convite por e-mail; o link aponta para este endereço do ELROND. */
export const enviarConviteUsuario = (id: string) =>
  apiFetch<Usuario>(`/usuarios/${id}/convite`, { method: 'POST', body: JSON.stringify({ urlBase: window.location.origin }) })
/** Link do convite (público): quem é, e criar a senha. */
export const abrirConvite = (token: string) => apiFetch<{ nome: string; email: string }>(`/convite/${encodeURIComponent(token)}`)
export const aceitarConvite = (token: string, senha: string) =>
  apiFetch<{ email: string }>(`/convite/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ senha }) })

// ── Propostas ───────────────────────────────────────────────────────────────
export const listPropostas = () => apiFetch<Proposta[]>('/propostas')
export interface CriarPropostaPayload {
  cliente: string
  clienteId?: string
  vendedorId?: string
  vendedorNome?: string
  itens: ItemProposta[]
  total: number
  modeloId?: string | null
  prazoEntrega?: string
  validade?: string
  formaPagamento?: string
  prazoPagamentoDias?: number
  precoOriginal?: number
  justificativa?: string
}
export const criarPropostaApi = (p: CriarPropostaPayload) =>
  apiFetch<Proposta>('/propostas', {
    method: 'POST',
    body: JSON.stringify({
      cliente: p.cliente,
      clienteId: p.clienteId ?? '',
      vendedorId: p.vendedorId ?? '',
      vendedorNome: p.vendedorNome ?? '',
      itens: p.itens,
      total: p.total,
      modeloId: p.modeloId ?? null,
      prazoEntrega: p.prazoEntrega ?? '',
      validade: p.validade ?? '',
      formaPagamento: p.formaPagamento ?? '',
      prazoPagamentoDias: p.prazoPagamentoDias ?? 0,
      precoOriginal: p.precoOriginal ?? 0,
      justificativa: p.justificativa ?? '',
    }),
  })
/** Substitui os itens da proposta (usado para lançar o custo realizado). */
export const atualizarItensApi = (id: string, itens: ItemProposta[]) =>
  apiFetch<Proposta>(`/propostas/${id}/itens`, { method: 'PATCH', body: JSON.stringify(itens) })
/** Reescreve uma proposta em rascunho (edição pela Precificação). */
export const atualizarPropostaApi = (id: string, p: CriarPropostaPayload) =>
  apiFetch<Proposta>(`/propostas/${id}`, { method: 'PUT', body: JSON.stringify(p) })

export const setStatusApi = (id: string, status: string) =>
  apiFetch<Proposta>(`/propostas/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

// ── Metas ───────────────────────────────────────────────────────────────────
export const listMetas = () => apiFetch<CenarioMeta[]>('/metas')
export const createMeta = (m: CenarioMeta) =>
  apiFetch<CenarioMeta>('/metas', { method: 'POST', body: JSON.stringify(m) })
export const updateMeta = (m: CenarioMeta) =>
  apiFetch<CenarioMeta>(`/metas/${m.id}`, { method: 'PUT', body: JSON.stringify(m) })

// ── Serviços / Tipos de Custo / Validades (apoio à precificação) ────────────
export interface ServicoDto {
  id: string
  nome: string
  status: 'ativo' | 'inativo'
  /** Dados fiscais da NFS-e, um por empresa emitente (as retenções ficam na empresa). */
  fiscais?: ServicoFiscal[]
  /** Impostos do serviço para o Pricing (vazio = os da empresa). */
  impostos?: ImpostoServico[]
}
export type ModoCusto = 'valor' | 'percentual'
export type BasePercentualCusto = 'nf' | 'servico'
export interface TipoCustoDto {
  id: string
  nome: string
  /** R$ fixo ou percentual. */
  modo: ModoCusto
  /** Valor pré-cadastrado: R$ (modo valor) ou fração 0,02 = 2% (modo percentual). */
  valor: number
  /** Base do percentual: valor da NF informado ou preço do serviço. */
  basePercentual: BasePercentualCusto
  status: 'ativo' | 'inativo'
}
export interface ValidadePropostaDto {
  id: string
  descricao: string
  status: 'ativo' | 'inativo'
}

export const listServicos = () => apiFetch<ServicoDto[]>('/servicos')
export const createServico = (s: ServicoDto) =>
  apiFetch<ServicoDto>('/servicos', { method: 'POST', body: JSON.stringify(s) })
export const updateServico = (s: ServicoDto) =>
  apiFetch<ServicoDto>(`/servicos/${s.id}`, { method: 'PUT', body: JSON.stringify(s) })

export const listTiposCusto = () => apiFetch<TipoCustoDto[]>('/tipos-custo')
export const createTipoCusto = (t: TipoCustoDto) =>
  apiFetch<TipoCustoDto>('/tipos-custo', { method: 'POST', body: JSON.stringify(t) })
export const updateTipoCusto = (t: TipoCustoDto) =>
  apiFetch<TipoCustoDto>(`/tipos-custo/${t.id}`, { method: 'PUT', body: JSON.stringify(t) })

// ── Veículos ────────────────────────────────────────────────────────────────
export const listMotoristas = () => apiFetch<Motorista[]>('/motoristas')
export const createMotorista = (m: Motorista) => apiFetch<Motorista>('/motoristas', { method: 'POST', body: JSON.stringify(m) })
export const updateMotorista = (m: Motorista) => apiFetch<Motorista>(`/motoristas/${m.id}`, { method: 'PUT', body: JSON.stringify(m) })
export const listVeiculos = () => apiFetch<Veiculo[]>('/veiculos')
export const createVeiculo = (v: Veiculo) => apiFetch<Veiculo>('/veiculos', { method: 'POST', body: JSON.stringify(v) })
export const updateVeiculo = (v: Veiculo) => apiFetch<Veiculo>(`/veiculos/${v.id}`, { method: 'PUT', body: JSON.stringify(v) })

export const listValidades = () => apiFetch<ValidadePropostaDto[]>('/validades-proposta')
export const createValidade = (v: ValidadePropostaDto) =>
  apiFetch<ValidadePropostaDto>('/validades-proposta', { method: 'POST', body: JSON.stringify(v) })
export const updateValidade = (v: ValidadePropostaDto) =>
  apiFetch<ValidadePropostaDto>(`/validades-proposta/${v.id}`, { method: 'PUT', body: JSON.stringify(v) })

// ── Categorias de despesa ───────────────────────────────────────────────────
export const listCategoriasCusto = () => apiFetch<CategoriaCusto[]>('/categorias-custo')
export const createCategoriaCusto = (c: CategoriaCusto) =>
  apiFetch<CategoriaCusto>('/categorias-custo', { method: 'POST', body: JSON.stringify(c) })
export const updateCategoriaCusto = (c: CategoriaCusto) =>
  apiFetch<CategoriaCusto>(`/categorias-custo/${c.id}`, { method: 'PUT', body: JSON.stringify(c) })

// ── Regras de aprovação (alçada) ────────────────────────────────────────────
export const listRegrasAprovacao = () => apiFetch<RegraAprovacao[]>('/regras-aprovacao')
export const createRegraAprovacao = (r: RegraAprovacao) =>
  apiFetch<RegraAprovacao>('/regras-aprovacao', { method: 'POST', body: JSON.stringify(r) })
export const updateRegraAprovacao = (r: RegraAprovacao) =>
  apiFetch<RegraAprovacao>(`/regras-aprovacao/${r.id}`, { method: 'PUT', body: JSON.stringify(r) })

/** Assina a aprovação do usuário logado. */
export const aprovarPropostaApi = (id: string) =>
  apiFetch<Proposta>(`/propostas/${id}/aprovar`, { method: 'POST' })

// ── Clientes / Fornecedores / Vendedores ────────────────────────────────────
export const listClientes = () => apiFetch<Parceiro[]>('/clientes')
export const createCliente = (p: Parceiro) =>
  apiFetch<Parceiro>('/clientes', { method: 'POST', body: JSON.stringify(p) })
export const updateCliente = (p: Parceiro) =>
  apiFetch<Parceiro>(`/clientes/${p.id}`, { method: 'PUT', body: JSON.stringify(p) })

export const listFornecedores = () => apiFetch<Parceiro[]>('/fornecedores')
export const createFornecedor = (p: Parceiro) =>
  apiFetch<Parceiro>('/fornecedores', { method: 'POST', body: JSON.stringify(p) })
export const updateFornecedor = (p: Parceiro) =>
  apiFetch<Parceiro>(`/fornecedores/${p.id}`, { method: 'PUT', body: JSON.stringify(p) })

export const listVendedores = () => apiFetch<Vendedor[]>('/vendedores')
export const createVendedor = (v: Vendedor) =>
  apiFetch<Vendedor>('/vendedores', { method: 'POST', body: JSON.stringify(v) })
export const updateVendedor = (v: Vendedor) =>
  apiFetch<Vendedor>(`/vendedores/${v.id}`, { method: 'PUT', body: JSON.stringify(v) })
/** Passa a carteira de clientes de um vendedor para outro. Devolve quantos clientes mudaram. */
/** Destino da transferência em lote, função a função. Vazio = manter o vendedor atual daquela função. */
export interface TransferenciaClientes {
  vendedorSdrId: string
  vendedorSalesId: string
  vendedorCsId: string
}
/** Move os clientes escolhidos para os vendedores indicados por função (permissão especial). */
export const transferirClientes = (clienteIds: string[], destino: TransferenciaClientes) =>
  apiFetch<{ clientes: number }>('/clientes/transferir-carteira', {
    method: 'POST',
    body: JSON.stringify({ clienteIds, ...destino }),
  })

export const transferirCarteira = (deId: string, paraVendedorId: string) =>
  apiFetch<{ clientes: number }>(`/vendedores/${deId}/transferir-carteira`, {
    method: 'POST',
    body: JSON.stringify({ paraVendedorId }),
  })

// ── Cidades (IBGE, autocomplete) ────────────────────────────────────────────
export interface CidadeDto {
  id: string
  nome: string
  uf: string
}
/** Busca pelo nome; `uf` restringe à UF (o termo também aceita "SP - são pa"). */
export const buscarCidades = (q: string, uf = '') =>
  apiFetch<CidadeDto[]>(`/cidades?q=${encodeURIComponent(q)}${uf ? `&uf=${encodeURIComponent(uf)}` : ''}`)

// ── Modelos de Proposta ─────────────────────────────────────────────────────
export const listModelos = () => apiFetch<ModeloProposta[]>('/modelos-proposta')
export const createModelo = (m: ModeloProposta) =>
  apiFetch<ModeloProposta>('/modelos-proposta', { method: 'POST', body: JSON.stringify(m) })
export const updateModelo = (m: ModeloProposta) =>
  apiFetch<ModeloProposta>(`/modelos-proposta/${m.id}`, { method: 'PUT', body: JSON.stringify(m) })
