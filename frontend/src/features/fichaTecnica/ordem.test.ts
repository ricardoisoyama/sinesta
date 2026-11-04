import { describe, expect, it } from 'vitest'
import { moverEntreIrmaos, moverPara, zonaDoCursor } from './ordem'

const l = (...ids: string[]) => ids.map((id) => ({ id, pasta: '' }))
const ids = (x: { id: string }[]) => x.map((i) => i.id).join('')

describe('ordem das fichas', () => {
  it('põe antes ou depois do alvo e, sem alvo, no fim', () => {
    expect(ids(moverPara(l('a', 'b', 'c', 'd'), 'd', 'b', false))).toBe('adbc')
    expect(ids(moverPara(l('a', 'b', 'c', 'd'), 'a', 'c', true))).toBe('bcad')
    expect(ids(moverPara(l('a', 'b', 'c'), 'a', '', true))).toBe('bca')
  })

  it('troca a pasta junto ao mover', () => {
    const r = moverPara(l('a', 'b'), 'a', 'b', true, (x) => ({ ...x, pasta: 'P' }))
    expect(r.map((x) => `${x.id}${x.pasta}`).join(',')).toBe('b,aP')
  })

  it('setas sobem e descem só entre os irmãos, mesmo com outros no meio', () => {
    const lista = l('a', 'x', 'b', 'y', 'c')
    const irmaos = lista.filter((x) => 'abc'.includes(x.id))
    expect(ids(moverEntreIrmaos(lista, irmaos, 'c', -1))).toBe('axcby')
    expect(ids(moverEntreIrmaos(lista, irmaos, 'a', 1))).toBe('xbayc')
    expect(moverEntreIrmaos(lista, irmaos, 'a', -1)).toBe(lista)
  })

  it('zona do cursor: pasta aceita dentro no meio', () => {
    expect([zonaDoCursor(0.1, true), zonaDoCursor(0.5, true), zonaDoCursor(0.9, true)]).toEqual(['antes', 'dentro', 'depois'])
    expect([zonaDoCursor(0.4, false), zonaDoCursor(0.6, false)]).toEqual(['antes', 'depois'])
  })
})
