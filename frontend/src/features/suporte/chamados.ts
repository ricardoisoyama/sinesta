/**
 * Chamados da versão inicial: ficam só neste navegador (não chegam à equipe ainda).
 * O módulo de chamados com backend substitui este arquivo mantendo o formato.
 */
export interface MensagemChat {
  de: 'voce' | 'assistente' | 'sistema'
  texto: string
  artigoId?: string
}

export interface Chamado {
  numero: string
  assunto: string
  tela: string
  abertoEm: string
  situacao: 'aberto' | 'em atendimento' | 'resolvido'
  conversa: MensagemChat[]
}

const chave = (email: string) => `elrond.suporte.chamados.${email || 'anonimo'}`

export function lerChamados(email: string): Chamado[] {
  try {
    const bruto = localStorage.getItem(chave(email))
    return bruto ? (JSON.parse(bruto) as Chamado[]) : []
  } catch {
    return []
  }
}

export function abrirChamado(email: string, dados: Omit<Chamado, 'numero' | 'abertoEm' | 'situacao'>): Chamado {
  const atuais = lerChamados(email)
  const novo: Chamado = {
    ...dados,
    numero: `CH-${String(atuais.length + 1).padStart(4, '0')}`,
    abertoEm: new Date().toISOString(),
    situacao: 'aberto',
  }
  try {
    localStorage.setItem(chave(email), JSON.stringify([novo, ...atuais]))
  } catch {
    // Sem armazenamento (janela anônima): o chamado vale só nesta sessão.
  }
  return novo
}
