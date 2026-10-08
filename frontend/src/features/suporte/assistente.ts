import { semAcento } from '@/lib/texto'
import { ARTIGOS, type Artigo } from './artigos'

/**
 * Assistente simulado: procura na base de artigos e responde com o melhor. Não usa IA.
 * Quando o agente real entrar, ele substitui `responder` mantendo a mesma resposta (texto +
 * artigo citado), e a tela não muda.
 */
const VAZIAS = new Set(['como', 'para', 'onde', 'qual', 'quais', 'porque', 'por', 'que', 'uma', 'um', 'meu', 'minha', 'esta', 'esse', 'essa', 'nao', 'com', 'sem', 'tela', 'fazer', 'faco', 'consigo', 'preciso', 'quero', 'sobre', 'isso', 'pelo', 'pela', 'dos', 'das', 'nos', 'nas'])

export const termos = (texto: string): string[] =>
  semAcento(texto)
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    // "df" e "dv" são curtos mas são termos do sistema; o resto com menos de 3 letras é ruído.
    .filter((t) => (t.length >= 3 || t === 'df' || t === 'dv' || t === 'pv') && !VAZIAS.has(t))

const palavrasDe = (texto: string) => semAcento(texto).toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean)

/** Pontua o artigo: título vale mais que palavras-chave, que valem mais que o corpo. */
export function pontuar(a: Artigo, pergunta: string): number {
  const ts = termos(pergunta)
  if (ts.length === 0) return 0
  const titulo = palavrasDe(a.titulo)
  const chaves = palavrasDe(a.palavras.join(' '))
  const corpo = palavrasDe(`${a.resumo} ${a.passos.join(' ')} ${a.dica ?? ''}`)
  const frase = semAcento(pergunta).toLowerCase()
  let p = 0
  for (const t of ts) {
    // Raiz para pegar flexões (aprovar/aprovação, lançamento/lançamentos), casando no início da palavra.
    const raiz = t.length > 5 ? t.slice(0, t.length - 2) : t
    const casa = (ws: string[]) => ws.some((w) => w.startsWith(raiz))
    if (casa(titulo)) p += 3
    if (casa(chaves)) p += 2
    if (casa(corpo)) p += 1
  }
  // Expressões inteiras das palavras-chave ("usar este preco", "sem meta") pesam mais.
  for (const k of a.palavras) if (k.includes(' ') && frase.includes(k)) p += 4
  return p
}

export interface Resposta {
  texto: string
  artigoId?: string
  /** Sem artigo bom: sugerir falar com uma pessoa. */
  semResposta: boolean
}

export function buscar(pergunta: string): { artigo: Artigo; pontos: number }[] {
  return ARTIGOS.map((artigo) => ({ artigo, pontos: pontuar(artigo, pergunta) }))
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
}

export function responder(pergunta: string): Resposta {
  const melhor = buscar(pergunta)[0]
  if (!melhor || melhor.pontos < 3) {
    return {
      texto: 'Não achei isso na base de conhecimento ainda. Posso abrir um chamado para a equipe olhar com você.',
      semResposta: true,
    }
  }
  const a = melhor.artigo
  const passos = a.passos.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')
  return { texto: `${a.resumo}\n\n${passos}${a.passos.length > 3 ? '\n…' : ''}`, artigoId: a.id, semResposta: false }
}
