/** Normaliza texto para comparação: sem acento, sem espaços nas pontas, minúsculo. */
export const semAcento = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

/**
 * A busca é o número do registro? Aceita "1532", "#1532" e "nº 1532"; compara o número inteiro
 * (buscar "15" não traz o 1532, para não poluir a lista).
 */
export const buscaPeloNumero = (busca: string, numero: number | undefined): boolean => {
  const q = semAcento(busca).replace(/^(#|n[ºo°]?\.?)\s*/, '')
  return /^\d+$/.test(q) && !!numero && Number(q) === numero
}
