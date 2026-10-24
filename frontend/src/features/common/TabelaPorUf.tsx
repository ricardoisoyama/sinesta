import { useState, type ChangeEvent } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import writeXlsxFile, { type SheetData } from 'write-excel-file/browser'
import { DatabaseZap, Download, Upload } from 'lucide-react'
import { PercentInput } from './PercentInput'
import { lerLinhas, type ColunaImport } from './importador'
import { confirmar } from './dialogo/dialogo'
import ui from './ui.module.css'
import { formatPct } from '@/lib/format'
import { parseDigitado } from '@/lib/numero'
import { UFS } from '@/lib/ufs'
import s from './tabelaPorUf.module.css'

/** Uma rota da tabela: UF de origem → UF de destino, valor em fração (0,0014 = 0,14%). */
export interface TaxaUf {
  ufOrigem: string
  ufDestino: string
  valor: number
  /** Segunda coluna (venda), quando a tabela tem: 0 = ainda não definida. */
  venda?: number
}

interface Props {
  linhas: TaxaUf[]
  onChange: (linhas: TaxaUf[]) => void
  /** Título da coluna do valor na planilha e no rótulo ("Prêmio %", "Alíquota %"). */
  coluna: string
  nomeArquivo: string
  /** true: célula zerada sai da tabela (fora da tabela); false: 0 é um valor (ex.: ICMS isento). */
  zeroRemove: boolean
  /** Base pronta para o botão "Preencher base" (ex.: a tabela da ESL). */
  base?: () => TaxaUf[]
  /** Com segunda coluna (ex.: "Venda %"): custo e venda lado a lado, e a margem aplicada de uma vez. */
  colunaVenda?: string
}

const SIGLAS = UFS.map((u) => u.sigla)

/**
 * Tabela por UF de origem × destino (prêmio da apólice, alíquota de ICMS): uma origem por vez com
 * os 27 destinos, planilha para baixar e importar e, quando existe, a base pronta para preencher.
 */
export function TabelaPorUf({ linhas, onChange, coluna, nomeArquivo, zeroRemove, base, colunaVenda }: Props) {
  const [origem, setOrigem] = useState('SP')
  const [margem, setMargem] = useState(0.3)
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null)
  const colunas: ColunaImport[] = [
    { titulo: 'UF origem', exemplo: 'SP', obrigatoria: true },
    { titulo: 'UF destino', exemplo: 'RJ', obrigatoria: true },
    { titulo: coluna, exemplo: '0,14', obrigatoria: true },
    ...(colunaVenda ? [{ titulo: colunaVenda, exemplo: '0,18', obrigatoria: false }] : []),
  ]
  const valor = (o: string, d: string) => linhas.find((t) => t.ufOrigem === o && t.ufDestino === d)?.valor ?? 0
  const venda = (o: string, d: string) => linhas.find((t) => t.ufOrigem === o && t.ufDestino === d)?.venda ?? 0
  const semVenda = colunaVenda ? linhas.filter((t) => !(t.venda && t.venda > 0)).length : 0
  const porOrigem = (o: string) => linhas.filter((t) => t.ufOrigem === o).length
  const faixa = linhas.length ? [Math.min(...linhas.map((t) => t.valor)), Math.max(...linhas.map((t) => t.valor))] : null

  const mudar = (d: string, v: number) => {
    const resto = linhas.filter((t) => !(t.ufOrigem === origem && t.ufDestino === d))
    onChange(v > 0 || !zeroRemove ? [...resto, { ufOrigem: origem, ufDestino: d, valor: v, venda: venda(origem, d) }] : resto)
  }
  /** Venda da rota: só existe com custo (a rota fora da tabela não tem o que vender). */
  const mudarVenda = (d: string, v: number) =>
    onChange(linhas.map((t) => (t.ufOrigem === origem && t.ufDestino === d ? { ...t, venda: v } : t)))
  /** Venda = custo × (1 + margem) em todas as rotas (de todas as origens); depois dá para ajustar uma a uma. */
  const aplicarMargem = async () => {
    if (linhas.length === 0) return
    if (linhas.some((t) => t.venda && t.venda > 0) && !(await confirmar({ titulo: 'Aplicar a margem', mensagem: `A venda das ${linhas.length} rotas passa a ser o custo + ${formatPct(margem)}. As vendas digitadas serão substituídas. Continuar?`, confirmar: 'Aplicar' })))
      return
    onChange(linhas.map((t) => ({ ...t, venda: Math.round(t.valor * (1 + margem) * 1e6) / 1e6 })))
    setAviso({ texto: `Venda de ${linhas.length} rotas = custo + ${formatPct(margem)}. Ajuste o que for diferente e salve.`, erro: false })
  }

  const preencherBase = async () => {
    if (!base) return
    if (linhas.length > 0 && !(await confirmar({ titulo: 'Preencher com a base', mensagem: `A tabela atual (${linhas.length} rotas) será substituída pela base. Continuar?`, confirmar: 'Substituir' })))
      return
    const nova = base()
    onChange(nova)
    setAviso({ texto: `${nova.length} rotas preenchidas com a base. Ajuste o que for diferente e salve.`, erro: false })
  }

  const baixar = async () => {
    const cab = colunas.map((c) => ({ value: c.titulo, fontWeight: 'bold' as const }))
    const corpo = [...linhas]
      .sort((x, y) => x.ufOrigem.localeCompare(y.ufOrigem) || x.ufDestino.localeCompare(y.ufDestino))
      .map((t) => [
        { value: t.ufOrigem },
        { value: t.ufDestino },
        { value: Math.round(t.valor * 1e6) / 1e4, type: Number },
        ...(colunaVenda ? [{ value: Math.round((t.venda ?? 0) * 1e6) / 1e4, type: Number }] : []),
      ])
    const dados: SheetData = [cab, ...(corpo.length ? corpo : [[{ value: 'SP' }, { value: 'RJ' }, { value: 0.14, type: Number }]])]
    await writeXlsxFile(dados, { columns: colunas.map(() => ({ width: 16 })) }).toFile(nomeArquivo)
  }

  // Planilha substitui a tabela inteira; linhas com erro ficam de fora e são contadas no aviso.
  const importar = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    try {
      const rows = (await readXlsxFile(file)) as unknown as unknown[][]
      const res = lerLinhas<TaxaUf>(rows, colunas, (l) => {
        const o = l['UF origem'].toUpperCase()
        const d = l['UF destino'].toUpperCase()
        // Célula numérica chega como "0.035" (ponto decimal); digitada, como "0,035".
        const numero = (txt: string | undefined) => {
          const bruto = (txt ?? '').replace('%', '').trim()
          return bruto ? (/^\d+(\.\d+)?$/.test(bruto) ? Number(bruto) : parseDigitado(bruto)) / 100 : 0
        }
        const v = numero(l[coluna])
        const vv = colunaVenda ? numero(l[colunaVenda]) : 0
        if (!SIGLAS.includes(o) || !SIGLAS.includes(d)) return { erro: 'UF inválida' }
        if (!(v >= 0 && v <= 1) || (zeroRemove && v === 0) || !(vv >= 0 && vv <= 1)) return { erro: 'valor inválido' }
        return { item: { ufOrigem: o, ufDestino: d, valor: v, ...(colunaVenda ? { venda: vv } : {}) }, resumo: `${o} → ${d}` }
      })
      if ('erro' in res) return setAviso({ texto: res.erro, erro: true })
      const validas = res.linhas.flatMap((l) => (l.item ? [l.item] : []))
      const erradas = res.linhas.filter((l) => l.erro)
      if (validas.length === 0) return setAviso({ texto: 'Nenhuma linha válida na planilha.', erro: true })
      const unicas = new Map(validas.map((t) => [`${t.ufOrigem}-${t.ufDestino}`, t]))
      onChange([...unicas.values()])
      setAviso({
        texto: `${unicas.size} rotas importadas${erradas.length ? `; ${erradas.length} linha(s) com erro ficaram de fora (linha ${erradas.slice(0, 5).map((e) => e.linha).join(', ')}${erradas.length > 5 ? '…' : ''})` : ''}. Salve para gravar.`,
        erro: erradas.length > 0,
      })
    } catch {
      setAviso({ texto: `Não foi possível ler o arquivo. Envie um .xlsx com as colunas UF origem, UF destino e ${coluna}.`, erro: true })
    }
  }

  return (
    <div>
      <div className={s.barra}>
        <label className={s.origem}>
          Origem
          <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {SIGLAS.map((u) => (
              <option key={u} value={u}>
                {u}
                {porOrigem(u) ? ` (${porOrigem(u)})` : ''}
              </option>
            ))}
          </select>
        </label>
        <span className={s.resumo}>
          {linhas.length} {linhas.length === 1 ? 'rota' : 'rotas'}
          {faixa && ` · de ${formatPct(faixa[0])} a ${formatPct(faixa[1])}`}
          {colunaVenda && semVenda > 0 && <b className={s.semVenda}> · {semVenda} sem venda (cobra o custo)</b>}
        </span>
        {colunaVenda && (
          <span className={s.margem}>
            Margem
            <PercentInput value={margem} onChange={setMargem} />
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => void aplicarMargem()} disabled={linhas.length === 0} title="Venda = custo + margem, em todas as rotas">
              Aplicar a todas
            </button>
          </span>
        )}
        {base && (
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={preencherBase} title="Preenche a tabela com a base pronta">
            <DatabaseZap /> Preencher base
          </button>
        )}
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={baixar} title="Baixa a tabela atual (serve de modelo)">
          <Download /> Baixar planilha
        </button>
        <label className={`${ui.btn} ${ui.btnGhost}`} title="Substitui a tabela pela da planilha">
          <Upload /> Importar planilha
          <input type="file" accept=".xlsx" hidden onChange={importar} />
        </label>
      </div>
      {aviso && <div className={aviso.erro ? s.avisoErro : s.avisoOk}>{aviso.texto}</div>}
      <div className={s.destinos}>
        {SIGLAS.map((d) => (
          <div key={d} className={`${s.destino} ${colunaVenda ? s.destinoDuplo : ''}`}>
            <span>
              {origem} → {d}
            </span>
            {colunaVenda ? (
              <div className={s.duplo}>
                <label>
                  <small>{coluna}</small>
                  <PercentInput value={valor(origem, d)} onChange={(n) => mudar(d, n)} />
                </label>
                <label>
                  <small>{colunaVenda}</small>
                  <PercentInput value={venda(origem, d)} onChange={(n) => mudarVenda(d, n)} invalid={valor(origem, d) > 0 && venda(origem, d) > 0 && venda(origem, d) < valor(origem, d)} />
                </label>
              </div>
            ) : (
              <label>
                <PercentInput value={valor(origem, d)} onChange={(n) => mudar(d, n)} />
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
