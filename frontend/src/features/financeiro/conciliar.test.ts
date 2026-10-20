import { describe, expect, it } from 'vitest'
import { conciliar, padraoDoMemo } from './conciliar'
import { lerOfx } from './ofx'
import { movimentoVazio, type Movimento } from './types'

const mov = (p: Partial<Movimento> & Pick<Movimento, 'tipo' | 'parceiroNome' | 'valor' | 'vencimento'>): Movimento => ({
  ...movimentoVazio(p.tipo),
  id: p.id ?? crypto.randomUUID(),
  descricao: '',
  ...p,
})

const OFX = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>033<BRANCHID>0551<ACCTID>13008979-4</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20260921<DTEND>20260922
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260921120000<TRNAMT>-12198.21<FITID>A1<MEMO>PIX ENVIADO RECEITA FEDERAL</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260922<TRNAMT>36440,90<FITID>A2<MEMO>PIX RECEBIDO 48482221000170</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

describe('lerOfx', () => {
  it('lê cabeçalho e transações do OFX em SGML', () => {
    const e = lerOfx(OFX)
    expect(e.banco).toBe('033')
    expect(e.conta).toBe('13008979-4')
    expect(e.inicio).toBe('2026-09-21')
    expect(e.linhas).toHaveLength(2)
    expect(e.linhas[0]).toMatchObject({ id: 'A1', data: '2026-09-21', valor: -12198.21, tipo: 'debito', memo: 'PIX ENVIADO RECEITA FEDERAL' })
    expect(e.linhas[1]).toMatchObject({ valor: 36440.9, tipo: 'credito' })
  })
})

describe('conciliar', () => {
  const linhas = lerOfx(OFX).linhas
  it('concilia sozinho quando valor exato e nome batem; sugere quando só o valor bate', () => {
    const das = mov({ id: 'das', tipo: 'pagar', parceiroNome: 'Receita Federal', valor: 12198.21, vencimento: '2026-09-20' })
    const cli = mov({ id: 'cli', tipo: 'receber', parceiroNome: 'Prefeitura de Itu', valor: 36440.9, vencimento: '2026-09-25' })
    const r = conciliar({ linhas, movimentos: [das, cli], vinculos: {}, ignorados: [], regras: [] })
    expect(r[0].situacao).toBe('conciliado')
    expect(r[0].movimento?.id).toBe('das')
    expect(r[1].situacao).toBe('sugestao')
    expect(r[1].confianca).toBe('valor')
  })

  it('lançamento com Pix em andamento no banco não é par (o dinheiro ainda não saiu)', () => {
    const das = mov({ id: 'das', tipo: 'pagar', parceiroNome: 'Receita Federal', valor: 12198.21, vencimento: '2026-09-20', pixSituacao: 'agendado' })
    const r = conciliar({ linhas, movimentos: [das], vinculos: {}, ignorados: [], regras: [] })
    expect(r[0].situacao).toBe('sem-par')
    expect(r[0].candidatos).toHaveLength(0)
  })

  it('não cruza sinal (débito nunca casa com a receber) e respeita vínculos e ignorados', () => {
    const errado = mov({ id: 'x', tipo: 'receber', parceiroNome: 'Receita Federal', valor: 12198.21, vencimento: '2026-09-21' })
    const r = conciliar({ linhas, movimentos: [errado], vinculos: { A2: 'qualquer' }, ignorados: ['A1'], regras: [] })
    expect(r[0].situacao).toBe('ignorado')
    expect(r[1].situacao).toBe('conciliado')
  })

  it('reconhece pela regra aprendida quando não há lançamento', () => {
    const r = conciliar({
      linhas,
      movimentos: [],
      vinculos: {},
      ignorados: [],
      regras: [{ id: 'r1', padrao: 'RECEITA FEDERAL', tipo: 'pagar', parceiroNome: 'Receita Federal', planoContaId: 'pc-das', centroCustoId: '', descricao: 'DAS' }],
    })
    expect(r[0].situacao).toBe('regra')
    expect(r[0].regra?.parceiroNome).toBe('Receita Federal')
    expect(r[1].situacao).toBe('sem-par')
  })

  it('sugere por proximidade de valor quando o nome bate', () => {
    const quase = mov({ id: 'q', tipo: 'pagar', parceiroNome: 'Receita Federal', valor: 12200, vencimento: '2026-09-21' })
    const r = conciliar({ linhas, movimentos: [quase], vinculos: {}, ignorados: [], regras: [] })
    expect(r[0].situacao).toBe('sugestao')
    expect(r[0].confianca).toBe('aproximada')
  })

  it('gera o padrão do de/para sem números', () => {
    expect(padraoDoMemo('PIX RECEBIDO 48482221000170 22/09')).toBe('PIX RECEBIDO')
    expect(padraoDoMemo('BOLETO HUBWAY MARKETING 23791.12345')).toBe('BOLETO HUBWAY MARKETING')
  })
})
