/**
 * Padrão + valores gravados, sem deixar `null` passar por cima do padrão. Registro antigo não tem
 * os campos criados depois (ex.: SWIFT/IBAN nos dados bancários): o servidor devolve `null` e,
 * com o espalhamento comum, o `null` voltava no salvar e era recusado.
 */
export function mesclar<T extends object>(padrao: T, gravado?: Partial<T> | null): T {
  const r = { ...padrao }
  if (!gravado) return r
  for (const [k, v] of Object.entries(gravado)) {
    if (v !== null && v !== undefined) (r as Record<string, unknown>)[k] = v
  }
  return r
}
