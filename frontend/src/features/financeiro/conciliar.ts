import { semAcento } from '@/lib/texto'
import type { LinhaExtrato } from './ofx'
import type { Movimento } from './types'

/**
 * Motor de conciliação: para cada linha do extrato, procura o lançamento do sistema que
 * casa com ela. Primeiro por valor exato + fornecedor/cliente (conciliado sozinho), depois
 * por valor exato com data próxima (sugestão), por último por proximidade (sugestão fraca).
 * O usuário confirma, troca, cria ou ignora, tudo na mesma linha.
 */
export type SituacaoLinha = 'conciliado' | 'sugestao' | 'regra' | 'sem-par' | 'ignorado'
export type Confianca = 'exata' | 'valor' | 'aproximada'

/** "De/para" aprendido: quando o memo contém o padrão, o sistema já sabe quem é e a conta. */
export interface RegraConciliacao {
  id: string
  padrao: string
  tipo: Movimento['tipo']
  parceiroNome: string
  planoContaId: string
  centroCustoId: string
  descricao: string
}

export interface Candidato {
  movimento: Movimento
  pontos: number
  confianca: Confianca
  motivo: string
}

export interface LinhaConciliada {
  linha: LinhaExtrato
  situacao: SituacaoLinha
  /** Lançamento vinculado (conciliado) ou sugerido (sugestão). */
  movimento?: Movimento
  confianca?: Confianca
  motivo?: string
  /** Regra que reconheceu a linha (situação "regra"). */
  regra?: RegraConciliacao
  /** Todos os candidatos, do melhor para o pior (para "Trocar"/"Vincular"). */
  candidatos: Candidato[]
}

const diasEntre = (a: string, b: string): number =>
  Math.abs(Math.round((new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime()) / 86_400_000))

/** Palavras "fortes" de um nome (≥ 4 letras, sem acento), para achar o fornecedor no memo. */
const palavras = (s: string): string[] =>
  semAcento(s)
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((p) => p.length >= 4 && !GENERICAS.has(p))
const GENERICAS = new Set(['LTDA', 'EIRELI', 'S.A.', 'PAGAMENTO', 'PAGTO', 'ENVIADO', 'RECEBIDO', 'TRANSFERENCIA', 'BOLETO', 'PIX', 'TED', 'DOC', 'EMPRESAS', 'CENTRO'])

/** CPF (11) e CNPJ (14) que aparecem no memo do extrato (o banco manda o da outra ponta). */
export const documentosNoMemo = (memo: string): Set<string> =>
  new Set(
    (memo.match(/\d[\d./-]{9,19}\d/g) ?? [])
      .map((t) => t.replace(/\D/g, ''))
      .filter((d) => d.length === 11 || d.length === 14),
  )

/** O que ajuda a pontuar além do lançamento: documento de cada parceiro e os da própria empresa. */
export interface ContextoPontuacao {
  /** parceiroId → CPF/CNPJ (só dígitos) do cadastro. */
  documentos?: Record<string, string>
  /** CNPJs das empresas do sistema: no pagamento de boleto o banco às vezes mostra quem pagou (nós). */
  proprios?: Set<string>
}

/** Pontua um lançamento contra uma linha do extrato. */
export function pontuar(l: LinhaExtrato, m: Movimento, ctx: ContextoPontuacao = {}): Candidato | null {
  const tipoOk = (l.tipo === 'credito' && m.tipo === 'receber') || (l.tipo === 'debito' && m.tipo === 'pagar')
  if (!tipoOk) return null
  const valorMov = m.pagoEm && m.valorPago > 0 ? m.valorPago : Math.max(0, m.valor - m.desconto + m.juros + m.multa)
  const alvo = Math.abs(l.valor)
  const diff = Math.abs(valorMov - alvo)
  const exato = diff < 0.005
  const aproximado = !exato && (diff <= 5 || diff / alvo <= 0.02)
  if (!exato && !aproximado) return null

  const memo = semAcento(l.memo).toUpperCase()
  const nomeBate = palavras(m.parceiroNome).some((p) => memo.includes(p))
  const docBate = !!m.documento && /\d{3,}/.test(m.documento) && memo.includes(m.documento.replace(/\D/g, '').slice(-4))
  // CPF/CNPJ do cadastro igual ao da outra ponta no extrato: mais firme que o nome (que varia).
  const docParceiro = ctx.documentos?.[m.parceiroId] ?? ''
  const cnpjBate = docParceiro.length >= 11 && !ctx.proprios?.has(docParceiro) && documentosNoMemo(l.memo).has(docParceiro)
  const dataRef = m.pagoEm || m.vencimento
  const dias = l.data && dataRef ? diasEntre(l.data, dataRef) : 99
  const dataProxima = dias <= 5

  let pontos = exato ? 60 : 25
  const motivos: string[] = [exato ? 'valor exato' : 'valor próximo']
  if (cnpjBate) {
    pontos += 40
    motivos.push(docParceiro.length === 14 ? 'CNPJ no extrato' : 'CPF no extrato')
  } else if (nomeBate) {
    pontos += 30
    motivos.push('nome no extrato')
  }
  if (docBate) {
    pontos += 15
    motivos.push('documento no extrato')
  }
  if (dias <= 3) pontos += 15
  else if (dias <= 10) pontos += 8
  else if (dias > 45) pontos -= 15
  if (dataProxima) motivos.push(dias === 0 ? 'mesma data' : `${dias} dia${dias > 1 ? 's' : ''} de diferença`)
  if (m.pagoEm) motivos.push('já liquidado no sistema')

  const confianca: Confianca = exato && (nomeBate || cnpjBate) ? 'exata' : exato ? 'valor' : 'aproximada'
  return { movimento: m, pontos, confianca, motivo: motivos.join(' · ') }
}

export interface EntradaConciliacao {
  linhas: LinhaExtrato[]
  movimentos: Movimento[]
  /** FITID → id do movimento já vinculado pelo usuário (ou pela importação anterior). */
  vinculos: Record<string, string>
  ignorados: string[]
  regras: RegraConciliacao[]
  contexto?: ContextoPontuacao
  /** Lançamentos já usados além do principal de cada vínculo (linhas que pagaram vários). */
  outrosUsados?: string[]
}

export function conciliar({ linhas, movimentos, vinculos, ignorados, regras, contexto, outrosUsados = [] }: EntradaConciliacao): LinhaConciliada[] {
  const usados = new Set([...Object.values(vinculos), ...outrosUsados])
  // Pix em andamento no banco ainda não saiu da conta: não é par de nenhuma linha do extrato.
  const livres = movimentos.filter((m) => !m.cancelado && !usados.has(m.id) && !m.pixSituacao)

  // Um lançamento é o par principal de uma linha só: dois pagamentos iguais (mesmo valor e fornecedor) não
  // sugerem o mesmo lançamento para as duas linhas do extrato.
  const tomados = new Set<string>()
  return linhas.map((l) => {
    if (vinculos[l.id]) {
      const movimento = movimentos.find((m) => m.id === vinculos[l.id])
      return { linha: l, situacao: 'conciliado', movimento, confianca: 'exata', motivo: 'conciliado', candidatos: [] }
    }
    if (ignorados.includes(l.id)) return { linha: l, situacao: 'ignorado', candidatos: [] }

    const candidatos = livres
      .map((m) => pontuar(l, m, contexto))
      .filter((c): c is Candidato => !!c)
      .sort((a, b) => b.pontos - a.pontos)
    const melhor = candidatos.find((c) => !tomados.has(c.movimento.id))
    if (melhor && melhor.pontos >= 55) tomados.add(melhor.movimento.id)
    // Conciliação automática só quando não há dúvida: valor exato + nome (ou documento) batendo.
    if (melhor && melhor.pontos >= 90) return { linha: l, situacao: 'conciliado', movimento: melhor.movimento, confianca: melhor.confianca, motivo: melhor.motivo, candidatos }
    if (melhor && melhor.pontos >= 55) return { linha: l, situacao: 'sugestao', movimento: melhor.movimento, confianca: melhor.confianca, motivo: melhor.motivo, candidatos }

    const memo = semAcento(l.memo).toUpperCase()
    const regra = regras.find((r) => r.padrao && memo.includes(semAcento(r.padrao).toUpperCase()) && ((l.tipo === 'credito') === (r.tipo === 'receber')))
    if (regra) return { linha: l, situacao: 'regra', regra, candidatos }
    return { linha: l, situacao: 'sem-par', candidatos }
  })
}

/** Padrão de "de/para" a partir do memo: tira números e datas, fica o texto reconhecível. */
export const padraoDoMemo = (memo: string): string =>
  memo
    .replace(/\d[\d./-]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)

export interface ResumoConciliacao {
  conciliados: number
  sugestoes: number
  semPar: number
  ignorados: number
  total: number
}

export const resumoConciliacao = (linhas: LinhaConciliada[]): ResumoConciliacao => ({
  conciliados: linhas.filter((l) => l.situacao === 'conciliado').length,
  sugestoes: linhas.filter((l) => l.situacao === 'sugestao').length,
  semPar: linhas.filter((l) => l.situacao === 'sem-par' || l.situacao === 'regra').length,
  ignorados: linhas.filter((l) => l.situacao === 'ignorado').length,
  total: linhas.length,
})
