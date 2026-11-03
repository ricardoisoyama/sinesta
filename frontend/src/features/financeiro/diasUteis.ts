/**
 * Dia útil bancário na tela (espelha Elrond.Domain.Regras.DiasUteis): sábado, domingo, feriados nacionais
 * (fixos e os da Páscoa: Carnaval, Sexta-feira Santa, Corpus Christi) e os do cadastro de feriados.
 * Lançamento que vence em dia não útil só fica "atrasado" depois do próximo dia útil.
 */
const FIXOS: [number, number][] = [[1, 1], [4, 21], [5, 1], [9, 7], [10, 12], [11, 2], [11, 15], [11, 20], [12, 25]]

const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
const utc = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`)

export function pascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

const cache = new Map<number, Set<string>>()
export function feriadosNacionais(ano: number): Set<string> {
  let s = cache.get(ano)
  if (s) return s
  const p = utc(pascoa(ano))
  const mais = (dias: number) => { const d = new Date(p); d.setUTCDate(d.getUTCDate() + dias); return iso(d) }
  s = new Set([
    ...FIXOS.filter(([mes, dia]) => ano >= 2024 || !(mes === 11 && dia === 20)).map(([mes, dia]) => `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`),
    mais(-48), mais(-47), mais(-2), mais(60),
  ])
  cache.set(ano, s)
  return s
}

interface FeriadoExtra { data: string; todoAno: boolean; abrangencia?: string; uf?: string; cidade?: string; status?: string }

/** Feriados do cadastro (o de todo ano vale no mesmo dia e mês de qualquer ano). Preenchido ao abrir o sistema. */
let extras: FeriadoExtra[] = []
export function definirFeriados(lista: FeriadoExtra[]) {
  extras = lista.filter((f) => f.status !== 'inativo' && /^\d{4}-\d{2}-\d{2}$/.test(f.data))
}

/** Cidade de cada empresa ("São Vicente - SP"): o feriado municipal vale só para as empresas daquela cidade. */
let cidades = new Map<string, string>()
export function definirCidadesEmpresas(lista: { id: string; endereco?: string }[]) {
  cidades = new Map(lista.map((e) => [e.id, e.endereco ?? '']))
}

const normalizar = (s?: string) => (s ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

/** Espelha Feriado.ValePara do servidor: de todas, estadual do estado da empresa, municipal da cidade da empresa. */
export function feriadoValePara(f: Pick<FeriadoExtra, 'abrangencia' | 'uf' | 'cidade'>, cidadeEmpresa: string): boolean {
  const cidade = normalizar(cidadeEmpresa)
  const i = cidade.lastIndexOf(' - ')
  const uf = i >= 0 ? cidade.slice(i + 3) : ''
  if (f.abrangencia === 'uf') return !!uf && uf === normalizar(f.uf)
  if (f.abrangencia === 'cidade') return !!cidade && cidade === normalizar(f.cidade)
  return true
}

/** Dia útil para a empresa (sem empresa: só os feriados que valem para todas). */
export function diaUtil(data: string, empresaId = ''): boolean {
  const d = utc(data)
  const dow = d.getUTCDay()
  if (dow === 0 || dow === 6) return false
  const s = data.slice(0, 10)
  if (feriadosNacionais(d.getUTCFullYear()).has(s)) return false
  const cidade = cidades.get(empresaId) ?? ''
  return !extras.some((f) => (f.todoAno ? f.data.slice(5) === s.slice(5) : f.data === s) && feriadoValePara(f, cidade))
}

/** O próprio dia, se útil; senão o próximo dia útil (da empresa). */
export function proximoDiaUtil(data: string, empresaId = ''): string {
  let d = utc(data)
  for (let i = 0; i < 15 && !diaUtil(iso(d), empresaId); i++) d.setUTCDate(d.getUTCDate() + 1)
  return iso(d)
}

/** Venceu de verdade: já passou o próximo dia útil depois do vencimento (na cidade da empresa). */
export const vencido = (vencimento: string, hoje: string, empresaId = '') => !!vencimento && proximoDiaUtil(vencimento, empresaId) < hoje
