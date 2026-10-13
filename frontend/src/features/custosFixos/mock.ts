import { entraNaDf, valorDaEmpresa } from './regras'
import type { CustoFixo } from './types'

/** Conta do plano de contas por categoria (usada só para montar a massa demo). */
const CONTA_POR_CATEGORIA: Record<string, string> = {
  'cat-pessoal': 'pc-pessoal',
  'cat-contabil': 'pc-contabil',
  'cat-ti': 'pc-ti',
  'cat-marketing': 'pc-marketing',
  'cat-seguros': 'pc-seguros',
  'cat-operacional': 'pc-operacional',
}

const custo = (
  id: string,
  unidadeId: string,
  descricao: string,
  categoriaId: string,
  valorMensal: number,
  status: 'ativo' | 'inativo' = 'ativo',
): CustoFixo => ({
  id,
  unidadeId,
  descricao,
  categoriaId,
  valorMensal,
  planoContaId: CONTA_POR_CATEGORIA[categoriaId] ?? '',
  tipo: 'recorrente',
  dataInicio: '',
  dataFim: '',
  fornecedorId: '',
  status,
})

/**
 * Soma dos custos que compõem a DF mensal de uma unidade: ativos, recorrentes e
 * vigentes. Despesas spot ficam de fora (não são projetadas).
 */
/** DF do mês da empresa: a parte dela em cada despesa (inteira se for só dela; o percentual se rateada). */
export const totalCustoFixoAtivo = (unidadeId: string): number =>
  mockCustosFixos
    .filter((c) => entraNaDf(c))
    .reduce((acc, c) => acc + valorDaEmpresa(c, unidadeId), 0)

/** Substitui o conteúdo (in place) pelos dados vindos do backend. */
export function hydrateCustosFixos(list: CustoFixo[]): void {
  mockCustosFixos.length = 0
  mockCustosFixos.push(...list)
}

/**
 * Dados REAIS de produção da planilha "Matriz de Preço - Sinesta.xlsx".
 * - Matriz  → aba "Matriz Preço - Matriz"      (total ativo R$ 16.845,795/mês, C29)
 * - Filial 02 → aba "Matriz Preço - Filial (02)" (total ativo R$ 17.493,29/mês, C29)
 * Itens com valor 0 ficam inativos (listados na planilha, mas não incorridos hoje).
 */
export const mockCustosFixos: CustoFixo[] = [
  // ── Matriz ──────────────────────────────────────────────────────────────
  custo('cf-m01', 'matriz', 'Func. OP', 'cat-pessoal', 0, 'inativo'),
  custo('cf-m02', 'matriz', 'Pro Labore', 'cat-pessoal', 9000),
  custo('cf-m03', 'matriz', 'Contador + Abertura Emp.', 'cat-contabil', 150),
  custo('cf-m04', 'matriz', 'Sistema (TMS)', 'cat-ti', 787.4),
  custo('cf-m05', 'matriz', 'Coworking (End. Fiscal)', 'cat-operacional', 105),
  custo('cf-m06', 'matriz', 'Hospedagem - Sistema e Site - Mirai', 'cat-ti', 65),
  custo('cf-m07', 'matriz', 'Hospedagem - Servidor Google', 'cat-ti', 65),
  custo('cf-m08', 'matriz', 'Domínio - Registro BR', 'cat-ti', 10),
  custo('cf-m09', 'matriz', 'IA', 'cat-ti', 0, 'inativo'),
  custo('cf-m10', 'matriz', 'CRM - Zoho (plano padrão - 3 usuários)', 'cat-ti', 387),
  custo('cf-m11', 'matriz', 'Manutenção de equip', 'cat-operacional', 0, 'inativo'),
  custo('cf-m12', 'matriz', 'Advogado - Tabachini', 'cat-contabil', 900),
  custo('cf-m13', 'matriz', 'Campanha - Google ADS', 'cat-marketing', 775),
  custo('cf-m14', 'matriz', 'Assinatura Eletrônica', 'cat-ti', 75),
  custo('cf-m15', 'matriz', 'RCTR-C', 'cat-seguros', 269.95),
  custo('cf-m16', 'matriz', 'RCF-DC', 'cat-seguros', 269.95),
  custo('cf-m17', 'matriz', 'RCV', 'cat-seguros', 175),
  custo('cf-m18', 'matriz', 'Gestor de Tráfego e Social Mídia', 'cat-marketing', 1250),
  custo('cf-m19', 'matriz', 'Alvará Filial', 'cat-contabil', 0, 'inativo'),
  custo('cf-m20', 'matriz', 'VOIP', 'cat-ti', 22.495),
  custo('cf-m21', 'matriz', 'RP Agenda', 'cat-marketing', 1750),
  custo('cf-m22', 'matriz', 'Rodoclube (mensalidade)', 'cat-operacional', 195),
  custo('cf-m23', 'matriz', 'Certificado Digital (e-CNPJ)', 'cat-contabil', 9),
  custo('cf-m24', 'matriz', 'Tarifa de conta (Diversas)', 'cat-operacional', 360),
  custo('cf-m25', 'matriz', 'Plataforma de gestão', 'cat-operacional', 225),

  // ── Filial 02 ───────────────────────────────────────────────────────────
  custo('cf-f01', 'filial-02', 'Func. OP', 'cat-pessoal', 0, 'inativo'),
  custo('cf-f02', 'filial-02', 'Pro Labore', 'cat-pessoal', 9000),
  custo('cf-f03', 'filial-02', 'Contador + Abertura Emp.', 'cat-contabil', 150),
  custo('cf-f04', 'filial-02', 'Sistema (TMS)', 'cat-ti', 787.4),
  custo('cf-f05', 'filial-02', 'Coworking (End. Fiscal)', 'cat-operacional', 0, 'inativo'),
  custo('cf-f06', 'filial-02', 'Hospedagem - Sistema Mirai', 'cat-ti', 65),
  custo('cf-f07', 'filial-02', 'Hospedagem - Servidor Google e Site', 'cat-ti', 65),
  custo('cf-f08', 'filial-02', 'Domínio - Registro BR', 'cat-ti', 0, 'inativo'),
  custo('cf-f09', 'filial-02', 'IA', 'cat-ti', 0, 'inativo'),
  custo('cf-f10', 'filial-02', 'CRM - Zoho (plano padrão - 3 usuários)', 'cat-ti', 387),
  custo('cf-f11', 'filial-02', 'Manutenção de equip', 'cat-operacional', 0, 'inativo'),
  custo('cf-f12', 'filial-02', 'Advogado - Tabachini', 'cat-contabil', 900),
  custo('cf-f13', 'filial-02', 'Campanha - Google ADS', 'cat-marketing', 775),
  custo('cf-f14', 'filial-02', 'Assinatura Eletrônica', 'cat-ti', 75),
  custo('cf-f15', 'filial-02', 'RCTR-C', 'cat-seguros', 269.95),
  custo('cf-f16', 'filial-02', 'RCF-DC', 'cat-seguros', 269.95),
  custo('cf-f17', 'filial-02', 'RCV', 'cat-seguros', 175),
  custo('cf-f18', 'filial-02', 'Gestor de Tráfego e Social Mídia', 'cat-marketing', 1250),
  custo('cf-f19', 'filial-02', 'Alvará Filial', 'cat-contabil', 740),
  custo('cf-f20', 'filial-02', 'VOIP', 'cat-ti', 44.99),
  custo('cf-f21', 'filial-02', 'RP Agenda', 'cat-marketing', 1750),
  custo('cf-f22', 'filial-02', 'Rodoclube (mensalidade)', 'cat-operacional', 195),
  custo('cf-f23', 'filial-02', 'Certificado Digital (e-CNPJ)', 'cat-contabil', 9),
  custo('cf-f24', 'filial-02', 'Tarifa de conta (Diversas)', 'cat-operacional', 360),
  custo('cf-f25', 'filial-02', 'Plataforma de gestão', 'cat-operacional', 225),
]
