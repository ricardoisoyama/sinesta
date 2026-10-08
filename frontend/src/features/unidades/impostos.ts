import type { ImpostoConfig, Unidade } from './types'

/** Alíquota efetiva de um imposto (já com a redução da base de cálculo). */
const efetiva = (i: ImpostoConfig): number => (i?.aliquota ?? 0) * (1 - (i?.reducaoBase ?? 0))

/**
 * Percentual de impostos sobre a receita, montado a partir do cadastro tributário da
 * empresa: Simples/MEI usam o DAS; os demais regimes somam os federais, o ISS e os da
 * reforma. O ICMS fica de fora (entra depois, na camada fiscal, via gross-up).
 * Devolve 0 quando nada foi cadastrado. Espelha `Empresa.ImpostosSobreReceita` do .NET.
 */
export function impostosSobreReceita(e: Unidade): number {
  if (e.regime === 'Simples Nacional' || e.regime === 'MEI') return e.das ?? 0
  return (
    efetiva(e.pis) +
    efetiva(e.cofins) +
    efetiva(e.ir) +
    efetiva(e.csll) +
    efetiva(e.iss) +
    efetiva(e.inss) +
    (e.ibsMunicipal ?? 0) +
    (e.ibsEstadual ?? 0) +
    (e.cbs ?? 0)
  )
}

/** O que a empresa cadastrou vale; sem cadastro tributário, vale o percentual da DV. */
export function impostosDaDv(e: Unidade): number {
  const doCadastro = impostosSobreReceita(e)
  return doCadastro > 0 ? doCadastro : e.dv.impostos
}
