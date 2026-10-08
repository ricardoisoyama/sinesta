import { describe, expect, it } from 'vitest'
import { responder } from './assistente'
import { artigosDaTela } from './artigos'

describe('assistente do suporte', () => {
  it.each([
    ['Como precificar um serviço?', 'pricing'],
    ['Por que o fator mudou?', 'fator'],
    ['Como aprovar um lançamento?', 'lancamentos'],
    ['Como montar a ficha técnica?', 'ficha'],
    ['como importo o extrato ofx do banco', 'conciliacao'],
    ['o pricing diz que está sem meta', 'metas'],
    ['minha proposta ficou pendente', 'proposta-aprovacao'],
    ['um funcionário não vê a tela no menu', 'permissoes'],
    ['despesa fixa com início no ano que vem entra no DF?', 'despesas-fixas'],
  ])('"%s" responde com o artigo %s', (pergunta, id) => {
    expect(responder(pergunta).artigoId).toBe(id)
  })

  it('sem artigo parecido, oferece abrir chamado', () => {
    const r = responder('qual a previsão do tempo amanhã')
    expect(r.semResposta).toBe(true)
    expect(r.artigoId).toBeUndefined()
  })

  it('"Para esta tela" segue a rota aberta', () => {
    expect(artigosDaTela('/financeiro/conciliacao').map((a) => a.id)).toEqual(['conciliacao'])
    expect(artigosDaTela('/simulador').map((a) => a.id)).toContain('pricing')
    expect(artigosDaTela('/simulador/antigo').map((a) => a.id)).toContain('pricing')
    expect(artigosDaTela('/dashboard')).toEqual([])
  })
})
