import { describe, expect, it } from 'vitest'
import { tempoDoAviso } from './api'

describe('métrica do aviso do banco', () => {
  it('mede o tempo do pagamento até o aviso e até a baixa', () => {
    expect(tempoDoAviso({ pagaEm: '2026-10-17T10:00:00-03:00', avisoEm: '2026-10-17T13:04:00Z', confirmadaEm: '2026-10-17T13:04:30Z', confirmadaPor: 'aviso' }))
      .toBe('aviso chegou 4 min depois do pagamento · baixa pelo aviso do banco · 5 min até a baixa')
  })
  it('sem aviso: mostra que quem achou foi a conferência', () => {
    expect(tempoDoAviso({ pagaEm: '', avisoEm: '', confirmadaEm: '2026-10-17T14:00:00Z', confirmadaPor: 'rotina' })).toBe('sem aviso do banco · baixa pela conferência automática')
  })
})
