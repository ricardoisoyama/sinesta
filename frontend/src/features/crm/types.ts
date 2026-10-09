import type { PerfilCompra } from '@/features/parceiros/types'

/** Tipo da etapa: as normais movimentam o funil; ganho/perdido encerram. */
export type TipoEtapa = 'normal' | 'ganho' | 'perdido'

export interface EtapaFunil {
  id: string
  nome: string
  /** Cor do marcador da coluna. */
  cor: string
  tipo: TipoEtapa
}

/** Tipos de campo customizado que o cliente pode criar no funil. */
/** "moeda": valor em reais (guardado como número, ex.: "1500.5"; a tela mostra R$ 1.500,50). */
export type TipoCampoCustomizado = 'texto' | 'numero' | 'moeda' | 'data' | 'lista'
export const TIPOS_CAMPO: { valor: TipoCampoCustomizado; label: string }[] = [
  { valor: 'texto', label: 'Texto livre' },
  { valor: 'numero', label: 'Número' },
  { valor: 'moeda', label: 'Valor (R$)' },
  { valor: 'data', label: 'Data' },
  { valor: 'lista', label: 'Lista de opções' },
]

export interface CampoCustomizado {
  id: string
  nome: string
  tipo: TipoCampoCustomizado
  /** Opções quando tipo = lista. */
  opcoes: string[]
}

export interface Funil {
  id: string
  nome: string
  /** Horas parado numa etapa até o card "esquentar" (vermelho). 0 = não alerta. */
  horasAlerta: number
  /** Cor de fundo dos cards deste funil. '' = padrão. */
  corCard: string
  etapas: EtapaFunil[]
  camposCustomizados: CampoCustomizado[]
  /** Funil nunca é apagado: inativo sai do CRM, os cards ficam guardados. */
  status: 'ativo' | 'inativo'
}

/** Registro do histórico da oportunidade (timeline). */
export interface Anotacao {
  id: string
  texto: string
  /** Data ISO. */
  em: string
}

export interface ValorCampoCustomizado {
  campoId: string
  valor: string
}

export const ORIGENS = ['Indicação', 'Site', 'Prospecção', 'Retorno', 'Evento', 'Outro'] as const

/** Próxima ação em lista fixa (pedido do cliente): vira compromisso na agenda do vendedor. */
export const PROXIMAS_ACOES = [
  'Agendar ligação',
  'Agendar reunião',
  'Tentativa de contato',
  'Enviar proposta',
  'Cobrar retorno',
  'Outros',
] as const

export type Recorrencia = '' | 'recorrente' | 'spot'

/** Oportunidade comercial: um card do kanban. */
export interface Oportunidade {
  id: string
  funilId: string
  etapaId: string
  cliente: string
  /** Cliente do cadastro (uuid), quando escolhido da lista. */
  clienteId: string
  cnpj: string
  /** Responsável no cliente (a pessoa com quem se fala). */
  contato: string
  telefone: string
  email: string
  /** Influenciador ou decisor. Se influenciador, o decisor é informado à parte. */
  perfilComprador: PerfilCompra
  decisorNome: string
  decisorTelefone: string
  decisorEmail: string
  /** Serviço de interesse (do cadastro de Serviços). */
  servico: string
  /** Valor previsto do negócio; quando há proposta, vem do total dela. */
  valorEstimado: number
  /** Número da proposta emitida para esta oportunidade (ex.: PROP-0003). */
  propostaNumero: string
  recorrencia: Recorrencia
  origem: string
  /** Nome do usuário do portal responsável pelo card. */
  responsavel: string
  /** Id do usuário responsável (é por ele que o card vai para a Agenda e o Google). Vazio nos cards antigos. */
  responsavelId: string
  /** Vendedor (cadastro de Vendedores) que atende a oportunidade. */
  vendedorId: string
  /** Data ISO em que o card entrou na etapa atual (para "dias parado" e temperatura). */
  entrouNaEtapaEm: string
  /** Uma das PROXIMAS_ACOES (ou texto antigo, nos cards anteriores à lista). */
  proximaAcao: string
  /** Data da próxima ação (yyyy-mm-dd). */
  proximaAcaoEm: string
  proximaAcaoDetalhe: string
  /** Preenchido quando a oportunidade vai para uma etapa do tipo perdido. */
  motivoPerda: string
  anotacoes: Anotacao[]
  camposValores: ValorCampoCustomizado[]
  /** Card nunca é apagado: "arquivar" = inativo (sai do kanban, fica no histórico). */
  status: 'ativo' | 'inativo'
}

/** Horas que o card está parado na etapa atual. */
export const horasNaEtapa = (iso: string, agora = Date.now()) =>
  Math.max(0, (agora - new Date(iso).getTime()) / 3_600_000)

/** Card "quente": parado além do limite do funil numa etapa normal. */
export const cardQuente = (op: Oportunidade, funil: Funil, agora = Date.now()) => {
  const etapa = funil.etapas.find((e) => e.id === op.etapaId)
  return !!etapa && etapa.tipo === 'normal' && funil.horasAlerta > 0 && horasNaEtapa(op.entrouNaEtapaEm, agora) > funil.horasAlerta
}
