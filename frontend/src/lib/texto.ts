/** Normaliza texto para comparação: sem acento, sem espaços nas pontas, minúsculo. */
export const semAcento = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
