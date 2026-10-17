import { describe, expect, it } from 'vitest'
import { alertasDoContrato, diasEntre, escopoVigente, margemPrecificada, progressoVigencia, proximoReajuste, situacaoDe, totalEscopo } from './regras'
import type { Contrato, Fatura } from './types'

const item = (quantidade: number, valorUnitario: number, custoUnitario = 0) => ({ id: `${quantidade}-${valorUnitario}`, apelido: 'posto', tabela: false, servico: '', descricao: '', quantidade, unidade: 'posto', valorUnitario, custoUnitario })

const contrato: Contrato = {
  id: 'c1', numero: 'MIR-0001', empresaId: 'e', clienteId: 'cl', clienteNome: 'Cliente', clienteDocumento: '', contato: '', modeloId: 'm', tipoOperacao: 'Terceirização',
  modalidade: 'recorrente', situacao: 'vigente', inicio: '2026-06-01', fim: '2030-01-31', localServico: '', propostaId: '', propostaNumero: '', servicoId: '', textoAdicionalNota: '',
  escopo: [
    { versao: 1, vigenteDesde: '2026-06-01', motivo: '', itens: [item(2, 7250)] },
    { versao: 2, vigenteDesde: '2026-10-01', motivo: 'Aditivo', itens: [item(3, 7250)] },
  ],
  condicoes: { faturarDesde: '2026-10', diaFaturamento: 1, referencia: 'mes-anterior', diaVencimento: 10, anteciparFimDeSemana: true, renovacaoAutomatica: false, avisoPrevioDias: 60, reajusteIndice: 'IPCA', reajusteMesBase: 6, multaRescisoria: '', carteiraId: '', formaCobranca: 'Boleto com Pix', prazoPagamentoDias: 15, agrupamento: 'periodo', fechamento: 'mensal' },
  caracteristicas: {}, componentes: [], documentos: [], eventos: [], criadoEm: '', criadoPor: '',
  extras: [{ id: 'x', data: '2026-10-05', tipo: 'hora-extra', descricao: 'Cobertura', quantidade: 6, valorUnitario: 38, cobranca: 'proxima-fatura', faturadoEm: '', lancadoPor: '' }],
}

describe('regras do contrato', () => {
  it('o valor mensal vem da versão do escopo em vigor (aditivo entra na data dele)', () => {
    expect(escopoVigente(contrato, '2026-08-15').versao).toBe(1)
    expect(totalEscopo(escopoVigente(contrato, '2026-10-15'))).toBe(21750)
  })

  it('margem precificada = (preço − custo) ÷ preço', () => {
    expect(margemPrecificada({ versao: 1, vigenteDesde: '', motivo: '', itens: [item(2, 100, 80)] })).toBeCloseTo(0.2)
  })

  it('progresso da vigência fica entre 0 e 1', () => {
    expect(progressoVigencia({ inicio: '2026-01-01', fim: '2026-12-31' }, '2025-12-01')).toBe(0)
    expect(progressoVigencia({ inicio: '2026-01-01', fim: '2026-12-31' }, '2027-02-01')).toBe(1)
  })

  it('reajuste: primeiro mês-base depois de 12 meses; nada se cair depois do fim', () => {
    expect(proximoReajuste(contrato, '2026-10-15')).toBe('2027-06-01')
    expect(proximoReajuste({ ...contrato, fim: '2027-03-31' }, '2026-10-15')).toBeNull()
    expect(proximoReajuste({ ...contrato, modalidade: 'spot' }, '2026-10-15')).toBeNull()
  })

  it('alertas: vencimento perto, fatura em atraso e extras a faturar', () => {
    const atrasada = { contratoId: 'c1', situacao: 'atrasada', avulsa: false } as Fatura
    const textos = alertasDoContrato({ ...contrato, fim: '2026-11-10' }, [atrasada], '2026-10-15').map((a) => a.texto)
    expect(textos).toEqual(['Fatura em atraso', 'Vence em 26 dias', '1 extra a faturar'])
    expect(diasEntre('2026-10-15', '2026-11-10')).toBe(26)
  })

  it('spot anda pela fatura: a faturar até receber', () => {
    const spot = { ...contrato, modalidade: 'spot' as const }
    expect(situacaoDe(spot, [{ contratoId: 'c1', situacao: 'nf-emitida', avulsa: false } as Fatura])).toBe('a-faturar')
    expect(situacaoDe(spot, [{ contratoId: 'c1', situacao: 'recebida', avulsa: false } as Fatura])).toBe('faturado')
  })
})
