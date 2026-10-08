import { minutosDe } from './datas'

export type TipoCompromisso = 'reuniao' | 'ligacao' | 'visita' | 'tarefa' | 'outro'

/** Compromisso gravado na Agenda (tabela `compromissos`). */
export interface Compromisso {
  id: string
  titulo: string
  tipo: TipoCompromisso
  /** "yyyy-MM-ddTHH:mm", ou "yyyy-MM-dd" no dia inteiro. */
  inicio: string
  fim: string
  diaInteiro: boolean
  responsavelId: string
  responsavelNome: string
  clienteId: string
  clienteNome: string
  /** Card do CRM ligado (opcional). */
  oportunidadeId: string
  local: string
  /** E-mails dos convidados (recebem o convite pelo Google do responsável). */
  convidados: string[]
  /** Pede uma sala do Google Meet. */
  comMeet: boolean
  /** Link do Meet devolvido pelo Google. */
  linkReuniao: string
  descricao: string
  concluido: boolean
  status: 'ativo' | 'inativo'
}

/** Cor de cada tipo: a mesma no bloco do calendário, no filtro e no formulário. */
export const TIPOS_COMPROMISSO: { valor: TipoCompromisso; label: string; cor: string; fundo: string }[] = [
  { valor: 'reuniao', label: 'Reunião', cor: '#1a4d1e', fundo: '#e6efe6' },
  { valor: 'ligacao', label: 'Ligação', cor: '#c85a1c', fundo: '#fdeee4' },
  { valor: 'visita', label: 'Visita', cor: '#2b5e8c', fundo: '#e4eef7' },
  { valor: 'tarefa', label: 'Tarefa', cor: '#8a6d00', fundo: '#fbf3d5' },
  { valor: 'outro', label: 'Outro', cor: '#5b6b62', fundo: '#eef1ec' },
]
/** As próximas ações do CRM aparecem com a cor própria e borda tracejada. */
export const COR_CRM = { cor: '#6b4fa0', fundo: '#f1edf8' }
/** Eventos da agenda pessoal do Google: cinza listrado, só leitura (abrem no Google). */
export const COR_GOOGLE = { cor: '#8a948e', fundo: '#eef0ee' }

export const infoTipo = (t: string) => TIPOS_COMPROMISSO.find((x) => x.valor === t) ?? TIPOS_COMPROMISSO[4]

/**
 * O que o calendário desenha: um compromisso da Agenda ou a próxima ação de um card do CRM
 * (que continua sendo editada no card).
 */
export interface EventoAgenda {
  id: string
  origem: 'agenda' | 'crm' | 'google'
  titulo: string
  tipo: TipoCompromisso | 'crm' | 'google'
  inicio: string
  fim: string
  diaInteiro: boolean
  cliente: string
  responsavel: string
  concluido: boolean
  compromisso?: Compromisso
  oportunidadeId?: string
  /** Evento do Google: local e link para abrir lá. */
  local?: string
  link?: string
  googleId?: string
  /** Link do Google Meet (compromisso com Meet ou evento do Google que tem). */
  linkReuniao?: string
  podeEditar?: boolean
  recorrente?: boolean
}

export const corDoEvento = (e: EventoAgenda) => (e.tipo === 'crm' ? COR_CRM : e.tipo === 'google' ? COR_GOOGLE : infoTipo(e.tipo))

export interface EventoPosicionado {
  evento: EventoAgenda
  /** Coluna (0..colunas-1) dentro do grupo de eventos que se sobrepõem. */
  coluna: number
  colunas: number
}

/**
 * Lado a lado, como no Outlook: eventos de horário que se sobrepõem dividem a largura do dia.
 * Cada grupo de sobreposição tem as suas colunas; um evento vai na primeira coluna livre.
 */
export function posicionar(eventos: EventoAgenda[]): EventoPosicionado[] {
  const fimMin = (e: EventoAgenda) => Math.max(minutosDe(e.fim), minutosDe(e.inicio) + 15)
  const ordem = [...eventos].sort((a, b) => minutosDe(a.inicio) - minutosDe(b.inicio) || fimMin(b) - fimMin(a))
  const saida: EventoPosicionado[] = []
  let grupo: EventoPosicionado[] = []
  let colunasFim: number[] = []
  let fimDoGrupo = -1
  const fechar = () => {
    for (const p of grupo) p.colunas = colunasFim.length
    saida.push(...grupo)
    grupo = []
    colunasFim = []
  }
  for (const e of ordem) {
    const ini = minutosDe(e.inicio)
    if (ini >= fimDoGrupo && grupo.length) fechar()
    let col = colunasFim.findIndex((f) => f <= ini)
    if (col < 0) {
      col = colunasFim.length
      colunasFim.push(0)
    }
    colunasFim[col] = fimMin(e)
    fimDoGrupo = Math.max(fimDoGrupo, fimMin(e))
    grupo.push({ evento: e, coluna: col, colunas: 1 })
  }
  if (grupo.length) fechar()
  return saida
}
