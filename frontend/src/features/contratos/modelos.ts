import { avaliar, chaveDe, referencias } from '@/lib/formula'
import type { ComponenteContrato, ItemEscopo, RegraComponente } from './types'

/**
 * Modelos de Contrato (protótipo). O sistema não sabe o que é terceirização ou frete: o cliente
 * monta os modelos do negócio dele. Cada modelo tem CAMPOS (características, com apelido) e
 * COMPONENTES DE COBRANÇA (o que entra na fatura e como se calcula). Mesma ideia da Ficha
 * Técnica e dos Dados da Operação; as fórmulas usam o mesmo avaliador (lib/formula).
 */

export type TipoCampo = 'texto' | 'numero' | 'valor' | 'percentual' | 'lista' | 'data' | 'cadastro'

export interface CampoModelo {
  id: string
  apelido: string
  nome: string
  tipo: TipoCampo
  /** Lista: as opções. Cadastro: qual cadastro (Veículos, Funcionários...). */
  opcoes: string[]
  obrigatorio: boolean
  ajuda: string
}

export interface ComponenteModelo {
  id: string
  apelido: string
  nome: string
  regra: RegraComponente
  unidade: string
  valorPadrao: number
  formula: string
  documento: string
  servicoNfse: string
  /** Opcional: cada contrato liga ou desliga (ex.: a terceirizada que cobra o adicional X e a que não cobra). */
  opcional: boolean
}

export interface ModeloContrato {
  id: string
  nome: string
  tipoOperacao: string
  descricao: string
  campos: CampoModelo[]
  componentes: ComponenteModelo[]
  /** Padrão para documentos vinculados (o contrato pode trocar). */
  agrupamento: 'periodo' | 'por-documento'
  fechamento: 'mensal' | 'quinzenal' | 'semanal'
  status: 'ativo' | 'inativo'
}

export const ROTULO_TIPO_CAMPO: Record<TipoCampo, string> = {
  texto: 'Texto', numero: 'Número', valor: 'Valor (R$)', percentual: 'Percentual', lista: 'Lista', data: 'Data', cadastro: 'Cadastro',
}

export const ROTULO_REGRA: Record<RegraComponente, string> = {
  fixo: 'Fixo por período',
  lancamento: 'Por lançamento (qtd × preço)',
  documento: 'Por documento vinculado',
  formula: 'Fórmula',
  unico: 'Cobrança única',
}

export const AJUDA_REGRA: Record<RegraComponente, string> = {
  fixo: 'Entra todo período: quantidade × valor (o posto, a licença, a posição-pallet).',
  lancamento: 'Entra quando alguém lança na pasta do contrato: hora extra, diária, pallet excedente.',
  documento: 'Soma os documentos vinculados do período: os CT-es dos fretes, as OS atendidas.',
  formula: 'Calculado a partir de outros apelidos: posto * 20%, subtotal * 5%.',
  unico: 'Cobrado uma vez, na primeira fatura: implantação, setup, mobilização.',
}

const campo = (apelido: string, nome: string, tipo: TipoCampo, opcoes: string[] = [], obrigatorio = false, ajuda = ''): CampoModelo => ({
  id: `cp-${apelido}`, apelido, nome, tipo, opcoes, obrigatorio, ajuda,
})
const comp = (apelido: string, nome: string, regra: RegraComponente, p: Partial<ComponenteModelo> = {}): ComponenteModelo => ({
  id: `co-${apelido}`, apelido, nome, regra, unidade: '', valorPadrao: 0, formula: '', documento: '', servicoNfse: '', opcional: false, ...p,
})

export const MODELOS_EXEMPLO: ModeloContrato[] = [
  {
    id: 'm-terceirizacao',
    nome: 'Terceirização de mão de obra',
    tipoOperacao: 'Terceirização',
    descricao: 'Postos fixos com escala; adicionais e horas extras conforme a convenção.',
    campos: [
      campo('escala', 'Escala', 'lista', ['6x1', '5x2', '12x36', '24x48'], true),
      campo('qtd_postos', 'Quantidade de postos', 'numero', [], true),
      campo('turno', 'Turno', 'lista', ['Diurno', 'Noturno', 'Misto']),
      campo('convencao', 'Convenção coletiva (CCT)', 'texto', [], false, 'Sindicato e ano da convenção que rege os salários.'),
      campo('local', 'Local do serviço', 'texto'),
    ],
    componentes: [
      comp('posto', 'Posto de trabalho', 'fixo', { unidade: 'posto', servicoNfse: 'Terceirização de mão de obra' }),
      comp('adicional_noturno', 'Adicional noturno', 'formula', { formula: 'posto * 20%', opcional: true, servicoNfse: 'Terceirização de mão de obra' }),
      comp('taxa_adm', 'Taxa de administração', 'formula', { formula: 'subtotal * 5%', opcional: true, servicoNfse: 'Terceirização de mão de obra' }),
      comp('hora_extra', 'Hora extra', 'lancamento', { unidade: 'hora', valorPadrao: 38 }),
      comp('material', 'Material extra', 'lancamento', { unidade: 'item', valorPadrao: 0 }),
    ],
    agrupamento: 'periodo',
    fechamento: 'mensal',
    status: 'ativo',
  },
  {
    id: 'm-frete',
    nome: 'Transporte por tabela de fretes',
    tipoOperacao: 'Transporte',
    descricao: 'Contrato-base com a tabela de fretes; cada viagem gera o seu CT-e e entra vinculada ao contrato.',
    campos: [
      campo('tipo_veiculo', 'Tipo de veículo', 'lista', ['VUC', 'Toco', 'Truck', 'Carreta', 'Bitrem'], true),
      campo('rotas', 'Rotas atendidas', 'texto'),
      campo('janela', 'Janela de entrega', 'texto', [], false, 'Ex.: seg a sex, 7h às 16h'),
      campo('seguro_rctrc', 'Seguro RCTR-C', 'percentual'),
      campo('veiculo_dedicado', 'Veículo dedicado', 'cadastro', ['Veículos']),
    ],
    componentes: [
      comp('fretes', 'Fretes do período (CT-e)', 'documento', { documento: 'CT-e', servicoNfse: 'Transporte de cargas (CT-e)' }),
      comp('pedagio', 'Pedágio', 'lancamento', { unidade: 'praça', valorPadrao: 0 }),
      comp('diaria_parada', 'Diária de veículo parado', 'lancamento', { unidade: 'diária', valorPadrao: 650 }),
      comp('ajudante', 'Ajudante para descarga', 'lancamento', { unidade: 'diária', valorPadrao: 260, opcional: true }),
    ],
    agrupamento: 'periodo',
    fechamento: 'quinzenal',
    status: 'ativo',
  },
  {
    id: 'm-armazenagem',
    nome: 'Armazenagem',
    tipoOperacao: 'Armazenagem',
    descricao: 'Posições contratadas, movimentação e excedentes.',
    campos: [
      campo('posicoes', 'Posições contratadas', 'numero', [], true),
      campo('tipo_pallet', 'Tipo de pallet', 'lista', ['PBR', 'Chep', 'Descartável']),
      campo('armazem', 'Armazém', 'texto'),
    ],
    componentes: [
      comp('posicao', 'Posição-pallet', 'fixo', { unidade: 'posição', servicoNfse: 'Armazenagem e guarda de bens' }),
      comp('movimentacao', 'Movimentação (pacote)', 'fixo', { unidade: 'pacote', servicoNfse: 'Armazenagem e guarda de bens' }),
      comp('excedente', 'Posição excedente', 'lancamento', { unidade: 'pallet-dia', valorPadrao: 1.4 }),
      comp('fora_horario', 'Recebimento fora do horário', 'lancamento', { unidade: 'hora', valorPadrao: 102.5 }),
    ],
    agrupamento: 'periodo',
    fechamento: 'mensal',
    status: 'ativo',
  },
  {
    id: 'm-saas',
    nome: 'Licença de software (SaaS)',
    tipoOperacao: 'Tecnologia',
    descricao: 'Licença mensal por empresa, usuários adicionais, implantação única e horas de suporte.',
    campos: [
      campo('modulos', 'Módulos contratados', 'texto', [], true),
      campo('usuarios_inclusos', 'Usuários inclusos', 'numero', [], true),
      campo('sla', 'Nível de suporte (SLA)', 'lista', ['Básico (48h)', 'Padrão (24h)', 'Prioritário (4h)']),
      campo('ambiente', 'Ambiente', 'texto', [], false, 'Ex.: aldrava.sinesta.com.br'),
    ],
    componentes: [
      comp('licenca', 'Licença mensal', 'fixo', { unidade: 'mês', servicoNfse: 'Licenciamento de software' }),
      comp('usuario_adicional', 'Usuário adicional', 'lancamento', { unidade: 'usuário', valorPadrao: 89 }),
      comp('implantacao', 'Implantação', 'unico', { valorPadrao: 4800, servicoNfse: 'Implantação de software' }),
      comp('horas_suporte', 'Horas de suporte avulso', 'lancamento', { unidade: 'hora', valorPadrao: 180, opcional: true }),
    ],
    agrupamento: 'periodo',
    fechamento: 'mensal',
    status: 'ativo',
  },
]

/** Apelido válido a partir do nome ("Adicional noturno" → "adicional_noturno"). */
export const apelidoDe = (nome: string) => chaveDe(nome) || 'campo'

/** Componente do contrato a partir do componente do modelo. */
export const componenteDoModelo = (m: ComponenteModelo): ComponenteContrato => ({
  id: `${m.id}-${Date.now().toString(36)}`,
  apelido: m.apelido,
  nome: m.nome,
  regra: m.regra,
  unidade: m.unidade,
  valorUnitario: m.valorPadrao,
  quantidade: m.regra === 'unico' ? 1 : 0,
  formula: m.formula,
  documento: m.documento,
  servicoNfse: m.servicoNfse,
  ativo: !m.opcional,
})

export interface LinhaPrevia {
  apelido: string
  nome: string
  regra: RegraComponente
  valor: number | null
  detalhe: string
  erro?: string
}

const r2 = (v: number) => Math.round(v * 100) / 100

/**
 * Prévia da cobrança de um período: os fixos do escopo (por apelido), as fórmulas (que podem usar
 * os fixos, as características numéricas e "subtotal") e a cobrança única. Lançamentos e
 * documentos entram "conforme lançado".
 */
export function previaCobranca(itens: ItemEscopo[], componentes: ComponenteContrato[], caracteristicas: Record<string, string | number> = {}, primeiraFatura = false): { linhas: LinhaPrevia[]; total: number } {
  const vars: Record<string, number> = {}
  for (const [k, v] of Object.entries(caracteristicas)) if (typeof v === 'number') vars[k] = v
  const linhas: LinhaPrevia[] = []
  for (const i of itens.filter((x) => !x.tabela)) {
    const t = r2(i.quantidade * i.valorUnitario)
    if (i.apelido) vars[i.apelido] = (vars[i.apelido] ?? 0) + t
    linhas.push({ apelido: i.apelido ?? '', nome: i.descricao || i.servico, regra: 'fixo', valor: t, detalhe: `${i.quantidade} × ${i.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` })
  }
  vars.subtotal = linhas.reduce((a, l) => a + (l.valor ?? 0), 0)
  const ativos = componentes.filter((c) => c.ativo)
  for (const c of ativos.filter((x) => x.regra === 'formula')) {
    const desconhecida = referencias(c.formula).find((ref) => !(ref in vars))
    const r = desconhecida ? { valor: null, erro: `Apelido desconhecido: ${desconhecida}` } : avaliar(c.formula, vars)
    const v = r.valor === null ? null : r2(r.valor)
    if (v !== null) vars[c.apelido] = v
    linhas.push({ apelido: c.apelido, nome: c.nome, regra: 'formula', valor: v, detalhe: c.formula, erro: r.erro })
  }
  for (const c of ativos.filter((x) => x.regra === 'unico'))
    linhas.push({ apelido: c.apelido, nome: c.nome, regra: 'unico', valor: primeiraFatura ? r2(c.quantidade * c.valorUnitario) : null, detalhe: primeiraFatura ? 'só na primeira fatura' : 'já cobrada na primeira fatura' })
  for (const c of ativos.filter((x) => x.regra === 'lancamento'))
    linhas.push({ apelido: c.apelido, nome: c.nome, regra: 'lancamento', valor: null, detalhe: `conforme lançado · ${c.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/${c.unidade || 'un.'}` })
  for (const c of ativos.filter((x) => x.regra === 'documento'))
    linhas.push({ apelido: c.apelido, nome: c.nome, regra: 'documento', valor: null, detalhe: `soma dos ${c.documento || 'documentos'} do período` })
  return { linhas, total: r2(linhas.reduce((a, l) => a + (l.valor ?? 0), 0)) }
}
