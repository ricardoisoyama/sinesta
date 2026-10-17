import { useState, type ChangeEvent } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import writeXlsxFile, { type SheetData } from 'write-excel-file/browser'
import { ArrowLeft, Download, Pencil, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import { lerLinhas, type ColunaImport } from '@/features/common/importador'
import ui from '@/features/common/ui.module.css'
import { formatPct } from '@/lib/format'
import { parseDigitado } from '@/lib/numero'
import { UFS } from '@/lib/ufs'
import { DOCUMENTOS_APOLICE, TIPOS_APOLICE, novaApolice, type ApoliceSeguro, type TaxaApolice, type TipoApolice } from './types'
import s from './apolices.module.css'

interface Props {
  value: ApoliceSeguro[]
  onChange: (v: ApoliceSeguro[]) => void
  empresas: { id: string; nome: string }[]
}

const SIGLAS = UFS.map((u) => u.sigla)
const COLUNAS: ColunaImport[] = [
  { titulo: 'UF origem', exemplo: 'SP', obrigatoria: true },
  { titulo: 'UF destino', exemplo: 'RJ', obrigatoria: true },
  { titulo: 'Prêmio %', exemplo: '0,14', obrigatoria: true },
]

const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')
const hoje = () => new Date().toLocaleDateString('sv-SE')

/** Situação da vigência para a lista: vigente, vence em breve, vencida ou ainda não começou. */
function situacao(a: ApoliceSeguro): { texto: string; classe: string } {
  if (a.status === 'inativo') return { texto: 'Inativa', classe: s.cinza }
  const h = hoje()
  if (a.vigenciaInicio && a.vigenciaInicio > h) return { texto: `Começa em ${dataBR(a.vigenciaInicio)}`, classe: s.cinza }
  if (a.vigenciaFim && a.vigenciaFim < h) return { texto: 'Vencida', classe: s.vermelho }
  if (a.vigenciaFim) {
    const dias = Math.round((new Date(a.vigenciaFim).getTime() - new Date(h).getTime()) / 86_400_000)
    if (dias <= 30) return { texto: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, classe: s.laranja }
  }
  return { texto: 'Vigente', classe: s.verde }
}

/**
 * Aba "Apólices" do fornecedor seguradora: a lista das apólices e, ao abrir uma, os dados dela e a
 * tabela de prêmio por UF de origem × destino (base do ad valorem no Pricing). A tabela entra por
 * planilha (uma linha por rota) ou digitada, uma origem por vez.
 */
export function ApolicesEditor({ value, onChange, empresas }: Props) {
  const [abertaId, setAbertaId] = useState('')
  const aberta = value.find((a) => a.id === abertaId)

  const novo = () => {
    const a = novaApolice()
    onChange([...value, a])
    setAbertaId(a.id)
  }
  const upd = (id: string, patch: Partial<ApoliceSeguro>) => onChange(value.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const remover = (id: string) => onChange(value.filter((a) => a.id !== id))

  if (aberta) return <ApoliceForm apolice={aberta} empresas={empresas} onChange={(p) => upd(aberta.id, p)} onVoltar={() => setAbertaId('')} />

  return (
    <div className={s.lista}>
      {value.length === 0 ? (
        <div className={s.vazio}>
          <ShieldCheck />
          <span>
            Nenhuma apólice ainda. Cadastre a apólice (RCTR-C, RCF-DC...) com a tabela de prêmio por UF: é dela que o <b>ad valorem</b> do Pricing tira o
            percentual.
          </span>
        </div>
      ) : (
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Apólice</th>
              <th>Vigência</th>
              <th>Empresas</th>
              <th className={ui.right}>Rotas</th>
              <th>Situação</th>
              <th className={ui.colActions} />
            </tr>
          </thead>
          <tbody>
            {value.map((a) => {
              const sit = situacao(a)
              return (
                <tr key={a.id}>
                  <td className={ui.cellStrong}>
                    {a.tipo} <span className={ui.cellMut}>{a.numero || 'sem número'}</span>
                  </td>
                  <td className={ui.cellMut}>{a.vigenciaInicio || a.vigenciaFim ? `${dataBR(a.vigenciaInicio) || '…'} a ${dataBR(a.vigenciaFim) || '…'}` : 'Sem prazo'}</td>
                  <td className={ui.cellMut}>
                    {a.empresaIds.length === 0 ? 'Todas' : a.empresaIds.map((id) => empresas.find((e) => e.id === id)?.nome ?? id).join(', ')}
                  </td>
                  <td className={ui.right}>{a.taxas.length}</td>
                  <td>
                    <span className={`${s.situacao} ${sit.classe}`}>{sit.texto}</span>
                  </td>
                  <td className={ui.colActions}>
                    <button type="button" className={s.acao} onClick={() => setAbertaId(a.id)} title="Abrir a apólice">
                      <Pencil size={15} />
                    </button>
                    <button type="button" className={s.acao} onClick={() => remover(a.id)} title="Remover a apólice">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <div>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={novo}>
          <Plus /> Nova apólice
        </button>
      </div>
    </div>
  )
}

function ApoliceForm({
  apolice: a,
  empresas,
  onChange,
  onVoltar,
}: {
  apolice: ApoliceSeguro
  empresas: { id: string; nome: string }[]
  onChange: (p: Partial<ApoliceSeguro>) => void
  onVoltar: () => void
}) {
  const [origem, setOrigem] = useState('SP')
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null)
  const premio = (o: string, d: string) => a.taxas.find((t) => t.ufOrigem === o && t.ufDestino === d)?.percentual ?? 0
  const porOrigem = (o: string) => a.taxas.filter((t) => t.ufOrigem === o).length
  const faixa = a.taxas.length ? [Math.min(...a.taxas.map((t) => t.percentual)), Math.max(...a.taxas.map((t) => t.percentual))] : null

  const mudarPremio = (d: string, pct: number) => {
    const resto = a.taxas.filter((t) => !(t.ufOrigem === origem && t.ufDestino === d))
    onChange({ taxas: pct > 0 ? [...resto, { ufOrigem: origem, ufDestino: d, percentual: pct }] : resto })
  }
  const alternarEmpresa = (id: string) =>
    onChange({ empresaIds: a.empresaIds.includes(id) ? a.empresaIds.filter((x) => x !== id) : [...a.empresaIds, id] })
  const alternarDocumento = (d: ApoliceSeguro['documentos'][number]) =>
    onChange({ documentos: a.documentos.includes(d) ? a.documentos.filter((x) => x !== d) : [...a.documentos, d] })

  const baixar = async () => {
    const cab = COLUNAS.map((c) => ({ value: c.titulo, fontWeight: 'bold' as const }))
    const linhas = [...a.taxas]
      .sort((x, y) => x.ufOrigem.localeCompare(y.ufOrigem) || x.ufDestino.localeCompare(y.ufDestino))
      .map((t) => [{ value: t.ufOrigem }, { value: t.ufDestino }, { value: Math.round(t.percentual * 1e6) / 1e4, type: Number }])
    const dados: SheetData = [cab, ...(linhas.length ? linhas : [[{ value: 'SP' }, { value: 'RJ' }, { value: 0.14, type: Number }]])]
    await writeXlsxFile(dados, { columns: COLUNAS.map(() => ({ width: 16 })) }).toFile(`premio-${a.tipo}-${a.numero || 'apolice'}.xlsx`)
  }

  // Planilha substitui a tabela inteira; linhas com erro ficam de fora e são contadas no aviso.
  const importar = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    try {
      const rows = (await readXlsxFile(file)) as unknown as unknown[][]
      const res = lerLinhas<TaxaApolice>(rows, COLUNAS, (l) => {
        const o = l['UF origem'].toUpperCase()
        const d = l['UF destino'].toUpperCase()
        // Célula numérica chega como "0.035" (ponto decimal); digitada, como "0,035".
        const bruto = l['Prêmio %'].replace('%', '').trim()
        const pct = (/^\d+(\.\d+)?$/.test(bruto) ? Number(bruto) : parseDigitado(bruto)) / 100
        if (!SIGLAS.includes(o) || !SIGLAS.includes(d)) return { erro: 'UF inválida' }
        if (!(pct > 0 && pct <= 1)) return { erro: 'prêmio inválido' }
        return { item: { ufOrigem: o, ufDestino: d, percentual: pct }, resumo: `${o} → ${d}` }
      })
      if ('erro' in res) return setAviso({ texto: res.erro, erro: true })
      const validas = res.linhas.flatMap((l) => (l.item ? [l.item] : []))
      const erradas = res.linhas.filter((l) => l.erro)
      if (validas.length === 0) return setAviso({ texto: 'Nenhuma linha válida na planilha.', erro: true })
      const unicas = new Map(validas.map((t) => [`${t.ufOrigem}-${t.ufDestino}`, t]))
      onChange({ taxas: [...unicas.values()] })
      setAviso({
        texto: `${unicas.size} rotas importadas${erradas.length ? `; ${erradas.length} linha(s) com erro ficaram de fora (linha ${erradas.slice(0, 5).map((e) => e.linha).join(', ')}${erradas.length > 5 ? '…' : ''})` : ''}. Salve o fornecedor para gravar.`,
        erro: erradas.length > 0,
      })
    } catch {
      setAviso({ texto: 'Não foi possível ler o arquivo. Envie um .xlsx com as colunas UF origem, UF destino e Prêmio %.', erro: true })
    }
  }

  return (
    <div className={s.form}>
      <button type="button" className={s.voltar} onClick={onVoltar}>
        <ArrowLeft size={14} /> Apólices
      </button>

      <div className={ui.grid}>
        <Field label="Tipo" req>
          <select value={a.tipo} onChange={(e) => onChange({ tipo: e.target.value as TipoApolice })}>
            {TIPOS_APOLICE.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Número da apólice">
          <input value={a.numero} onChange={(e) => onChange({ numero: e.target.value })} placeholder="Ex.: 44654034777282547" />
        </Field>
        <Field label="Início da vigência">
          <input type="date" value={a.vigenciaInicio} onChange={(e) => onChange({ vigenciaInicio: e.target.value })} />
        </Field>
        <Field label="Fim da vigência" error={a.vigenciaInicio && a.vigenciaFim && a.vigenciaFim < a.vigenciaInicio ? 'Antes do início' : undefined}>
          <input type="date" value={a.vigenciaFim} onChange={(e) => onChange({ vigenciaFim: e.target.value })} />
        </Field>
        <Field label="Limite por embarque" hint="Limite máximo de garantia (LMG) de cada embarque.">
          <MoneyInput value={a.limitePorEmbarque} onChange={(n) => onChange({ limitePorEmbarque: n })} />
        </Field>
        <Field label="Custo de emissão" hint="Custo da apólice (R$).">
          <MoneyInput value={a.custoEmissao} onChange={(n) => onChange({ custoEmissao: n })} />
        </Field>
        <Field label="IOF" hint="IOF sobre o prêmio (ex.: 7,38%). Fica registrado; o ad valorem do Pricing usa o prêmio da tabela.">
          <PercentInput value={a.iof} onChange={(n) => onChange({ iof: n })} />
        </Field>
        <Field label="Situação">
          <select value={a.status} onChange={(e) => onChange({ status: e.target.value as ApoliceSeguro['status'] })}>
            <option value="ativo">Ativa</option>
            <option value="inativo">Inativa</option>
          </select>
        </Field>
        <Field label="Taxa urbana" hint="Prêmio quando origem e destino são a mesma cidade. Vazio = usa a tabela.">
          <PercentInput value={a.taxaUrbana} onChange={(n) => onChange({ taxaUrbana: n })} />
        </Field>
        <Field label="Taxa padrão" hint="Prêmio das rotas que não estão na tabela. Vazio = a pessoa digita no Pricing.">
          <PercentInput value={a.taxaPadrao} onChange={(n) => onChange({ taxaPadrao: n })} />
        </Field>
        <Field className={ui.col2} label="Vale para">
          <div className={s.marcas}>
            {DOCUMENTOS_APOLICE.map((d) => (
              <label key={d.valor} className={ui.checkItem}>
                <input type="checkbox" checked={a.documentos.includes(d.valor)} onChange={() => alternarDocumento(d.valor)} /> {d.label}
              </label>
            ))}
          </div>
        </Field>
        <Field className={ui.col4} label="Empresas cobertas" hint="Nenhuma marcada = vale para todas as empresas.">
          <div className={s.marcas}>
            {empresas.map((e) => (
              <label key={e.id} className={ui.checkItem}>
                <input type="checkbox" checked={a.empresaIds.includes(e.id)} onChange={() => alternarEmpresa(e.id)} /> {e.nome}
              </label>
            ))}
          </div>
        </Field>
        <Field className={ui.col4} label="Observação">
          <input value={a.observacao} onChange={(e) => onChange({ observacao: e.target.value })} placeholder="Corretor, franquia, condições especiais..." />
        </Field>
      </div>

      <div className={ui.fsectionTitle} style={{ marginTop: 18 }}>
        Tabela de prêmio por UF
        <span className={ui.fsectionHint}>
          {a.taxas.length} {a.taxas.length === 1 ? 'rota' : 'rotas'}
          {faixa && ` · de ${formatPct(faixa[0])} a ${formatPct(faixa[1])}`}
        </span>
      </div>
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
        <span className={s.barraNota}>Prêmio sobre o valor da mercadoria, de {origem} para cada destino. Vazio = fora da tabela.</span>
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
          <label key={d} className={s.destino}>
            <span>{d}</span>
            <PercentInput value={premio(origem, d)} onChange={(n) => mudarPremio(d, n)} />
          </label>
        ))}
      </div>
    </div>
  )
}
