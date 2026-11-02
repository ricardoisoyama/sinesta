import { useState } from 'react'
import { CalendarPlus, FileSpreadsheet, Info, Plus, Trash2 } from 'lucide-react'
import { PercentInput } from '@/features/common/PercentInput'
import { MoneyInput } from '@/features/common/MoneyInput'
import { confirmar } from '@/features/common/dialogo/dialogo'
import ui from '@/features/common/ui.module.css'
import { formatBRL, formatPct } from '@/lib/format'
import {
  MODELOS_IMPOSTOS, REGIMES_TABELA, TIPOS_IMPOSTO, cargaDoServico, dataBr, efetivaImposto, hojeIso, impostosDoModelo, novoImposto,
  rotuloImposto, vigenciaEmVigor, vigenciasDoRegime, type ImpostoServico, type RegimeTabela, type TipoImposto,
} from './impostos'
import s from './servicos.module.css'

interface Props {
  value: ImpostoServico[]
  onChange: (v: ImpostoServico[]) => void
  /** Faturamento do mês pela meta da empresa padrão (calcula o adicional do IRPJ); 0 = sem meta. */
  faturamento: number
  nomeEmpresa: string
  /** Regime da empresa padrão: a aba que abre primeiro. */
  regimePadrao: RegimeTabela
  /** Empresas ativas em cada regime (aparecem na aba). */
  empresasPorRegime: Partial<Record<RegimeTabela, string[]>>
}

/**
 * Impostos do serviço como no quadro da contabilidade: base de cálculo × alíquota = efetiva. Uma tabela por
 * regime (o Pricing usa a do regime da empresa) e por vigência (o usuário cria a próxima com a data de início;
 * vale a mais recente que já começou). "Sim" entra no markup; "Não, só destaca" fica fora dele.
 */
export function ImpostosServicoEditor({ value, onChange, faturamento, nomeEmpresa, regimePadrao, empresasPorRegime }: Props) {
  const hoje = hojeIso()
  const [regime, setRegime] = useState<RegimeTabela>(regimePadrao)
  const vigenciasSalvas = vigenciasDoRegime(value, regime)
  const emVigor = vigenciaEmVigor(vigenciasSalvas, hoje)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  // A tabela aberta: a escolhida (se ainda existe no regime), senão a em vigor, senão a primeira.
  const vigencia = escolhida !== null && (vigenciasSalvas.includes(escolhida) || !vigenciasSalvas.length) ? escolhida : (emVigor ?? vigenciasSalvas[0] ?? '')
  const vigencias = vigenciasSalvas.includes(vigencia) ? vigenciasSalvas : [...vigenciasSalvas, vigencia].sort()
  const [novaData, setNovaData] = useState<string | null>(null)

  const daTabela = (i: ImpostoServico) => i.regime === regime && i.vigenteDesde === vigencia
  const linhas = value.filter(daTabela)
  const trocarTabela = (novas: ImpostoServico[]) => onChange([...value.filter((i) => !daTabela(i)), ...novas])
  const mudar = (id: string, p: Partial<ImpostoServico>) => onChange(value.map((i) => (i.id === id ? { ...i, ...p } : i)))
  const usados = new Set(linhas.filter((i) => i.imposto !== 'outro').map((i) => i.imposto))
  const proximo = TIPOS_IMPOSTO.find((t) => t.valor !== 'outro' && !usados.has(t.valor))?.valor ?? 'outro'
  const trocarTipo = (i: ImpostoServico, tipo: TipoImposto) => {
    const padrao = novoImposto(tipo)
    mudar(i.id, { imposto: tipo, base: padrao.base, aliquota: i.aliquota || padrao.aliquota, limite: padrao.limite })
  }
  const usarModelo = async (id: string) => {
    if (!id) return
    if (linhas.length > 0 && !(await confirmar({ titulo: 'Usar o modelo?', mensagem: 'Os impostos desta tabela são trocados pelos do modelo (dá para ajustar depois).', confirmar: 'Usar o modelo' }))) return
    trocarTabela(impostosDoModelo(id, regime, vigencia))
  }

  const abrirRegime = (r: RegimeTabela) => {
    setRegime(r)
    setEscolhida(null)
    setNovaData(null)
  }
  const criarVigencia = () => {
    if (!novaData || vigenciasSalvas.includes(novaData)) return
    // A nova tabela começa como cópia da aberta: o usuário só ajusta o que muda.
    onChange([...value, ...linhas.map((i) => ({ ...i, id: crypto.randomUUID(), vigenteDesde: novaData }))])
    setEscolhida(novaData)
    setNovaData(null)
  }
  const mudarInicio = (nova: string) => {
    if (nova === vigencia || vigenciasSalvas.includes(nova)) return
    onChange(value.map((i) => (daTabela(i) ? { ...i, vigenteDesde: nova } : i)))
    setEscolhida(nova)
  }
  const excluirVigencia = async () => {
    if (!(await confirmar({ titulo: 'Excluir esta vigência?', mensagem: `Os impostos ${vigencia ? `a partir de ${dataBr(vigencia)}` : 'desde sempre'} do ${regime} saem do serviço.`, confirmar: 'Excluir', perigo: true }))) return
    trocarTabela([])
    setEscolhida(null)
  }

  const situacao = (v: string) => (v === emVigor ? 'em vigor' : v > hoje ? 'futura' : emVigor !== undefined && v < emVigor ? 'encerrada' : '')
  const carga = cargaDoServico(linhas, faturamento)

  return (
    <div className={s.impostos}>
      <div className={s.regimes} role="tablist" aria-label="Regime tributário">
        {REGIMES_TABELA.map((r) => {
          const qtd = vigenciasDoRegime(value, r).length
          const empresas = empresasPorRegime[r] ?? []
          return (
            <button key={r} type="button" role="tab" aria-selected={r === regime} className={r === regime ? s.regimeAtivo : s.regime} onClick={() => abrirRegime(r)}>
              <span className={s.regimeNome}>{r}</span>
              <span className={s.regimeInfo}>
                {empresas.length ? empresas.join(', ') : 'nenhuma empresa'}
                {' · '}
                {qtd ? `${qtd} ${qtd === 1 ? 'tabela' : 'tabelas'}` : 'sem impostos'}
              </span>
            </button>
          )
        })}
      </div>

      <div className={s.vigencias}>
        <span className={s.vigenciasRotulo}>Vigência</span>
        {vigencias.map((v) => (
          <button key={v || 'sempre'} type="button" className={v === vigencia ? s.vigenciaAtiva : s.vigencia} onClick={() => { setEscolhida(v); setNovaData(null) }}>
            {v ? `A partir de ${dataBr(v)}` : 'Desde sempre'}
            {situacao(v) && <small className={s[`vig_${situacao(v).replace(' ', '')}`]}>{situacao(v)}</small>}
          </button>
        ))}
        {novaData === null ? (
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setNovaData('')} title="Nova tabela com data de início (copia a tabela aberta)">
            <CalendarPlus size={14} /> Nova vigência
          </button>
        ) : (
          <span className={s.novaVigencia}>
            a partir de <input type="date" id="imp-nova-vigencia" value={novaData} onChange={(e) => setNovaData(e.target.value)} aria-label="Início da nova vigência" />
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!novaData || vigenciasSalvas.includes(novaData)} onClick={criarVigencia}>Criar (copia esta tabela)</button>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setNovaData(null)}>Cancelar</button>
          </span>
        )}
      </div>

      <div className={s.impostosBarra}>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => onChange([...value, novoImposto(proximo, regime, vigencia)])}><Plus /> Adicionar imposto</button>
        <label className={s.modelo}>
          <FileSpreadsheet size={14} />
          <select value="" onChange={(e) => void usarModelo(e.target.value)} aria-label="Começar de um modelo">
            <option value="">Começar de um modelo...</option>
            {MODELOS_IMPOSTOS.filter((m) => m.regime === regime).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </label>
        {linhas.length > 0 && (
          <span className={s.inicioTabela}>
            início
            <input type="date" id="imp-inicio" value={vigencia} onChange={(e) => mudarInicio(e.target.value)} aria-label="Início desta vigência" title="Vazio = desde sempre" />
            <button type="button" className={s.remover} onClick={() => void excluirVigencia()} title="Excluir esta vigência"><Trash2 size={14} /></button>
          </span>
        )}
      </div>

      {linhas.length === 0 ? (
        <div className={s.semDados}>
          <p>
            Sem impostos do {regime} {vigencia ? `a partir de ${dataBr(vigencia)}` : ''} neste serviço: para empresa deste regime o Pricing usa os impostos da
            empresa (aba Markup). Adicione um a um ou comece de um modelo.
          </p>
        </div>
      ) : (
        <div className={s.impostosTabela}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Imposto</th>
                <th className={ui.right} style={{ width: 120 }}>Base de cálculo</th>
                <th className={ui.right} style={{ width: 120 }}>Alíquota</th>
                <th className={ui.right} style={{ width: 100 }}>Efetiva</th>
                <th style={{ width: 170 }}>Afeta o preço?</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {linhas.map((i) => {
                const tipo = TIPOS_IMPOSTO.find((t) => t.valor === i.imposto)
                const adicional = i.imposto === 'irpj-adicional'
                const icms = i.imposto === 'icms'
                return (
                  <tr key={i.id}>
                    <td>
                      <div className={s.impostoNome}>
                        <select value={i.imposto} onChange={(e) => trocarTipo(i, e.target.value as TipoImposto)} title={tipo?.ajuda} aria-label="Imposto">
                          {TIPOS_IMPOSTO.map((t) => (
                            <option key={t.valor} value={t.valor} disabled={t.valor !== i.imposto && t.valor !== 'outro' && usados.has(t.valor)}>{t.label}</option>
                          ))}
                        </select>
                        {i.imposto === 'outro' && <input value={i.nome} onChange={(e) => mudar(i.id, { nome: e.target.value })} placeholder="Nome do imposto" aria-label="Nome do imposto" />}
                        <span className={s.ajuda} title={tipo?.ajuda}><Info size={13} /></span>
                      </div>
                      {adicional && (
                        <div className={s.limite}>
                          sobre o que a base passar de <span className={s.limiteValor}><MoneyInput value={i.limite} onChange={(n) => mudar(i.id, { limite: n })} /></span> por mês
                        </div>
                      )}
                    </td>
                    <td className={ui.right}><PercentInput value={i.base} onChange={(n) => mudar(i.id, { base: n })} /></td>
                    <td className={ui.right}><PercentInput value={i.aliquota} onChange={(n) => mudar(i.id, { aliquota: n })} /></td>
                    <td className={`${ui.right} ${s.efetiva}`}>
                      {adicional && faturamento <= 0 ? <span className={ui.cellMut} title="Sem meta de faturamento na empresa: o adicional fica em zero.">sem meta</span> : formatPct(efetivaImposto(i, faturamento))}
                      {icms && <small>ou a da rota</small>}
                    </td>
                    <td>
                      <div className={s.radios} role="radiogroup" aria-label={`${rotuloImposto(i)} afeta o preço?`}>
                        <label><input type="radio" name={`afeta-${i.id}`} checked={i.afetaPreco} onChange={() => mudar(i.id, { afetaPreco: true })} /> Sim</label>
                        <label><input type="radio" name={`afeta-${i.id}`} checked={!i.afetaPreco} onChange={() => mudar(i.id, { afetaPreco: false })} /> Não, só destaca</label>
                      </div>
                    </td>
                    <td className={ui.right}>
                      <button type="button" className={s.remover} onClick={() => onChange(value.filter((x) => x.id !== i.id))} title="Tirar este imposto"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className={s.impostosTotais}>
            <span>Entra no preço (markup) <b>{formatPct(carga.noPreco)}</b></span>
            {carga.destacados > 0 && <span>Só destacado <b>{formatPct(carga.destacados)}</b></span>}
            {carga.icms && <span>ICMS {carga.icms.afetaPreco ? 'por dentro, no preço' : 'só destacado'}: alíquota da rota (padrão {formatPct(efetivaImposto(carga.icms, faturamento))})</span>}
          </div>
          {linhas.some((i) => i.imposto === 'irpj-adicional') && (
            <div className={s.daEmpresa}>
              <Info size={14} />
              <span>
                {faturamento > 0
                  ? `O adicional do IRPJ é calculado com o faturamento da meta: ${formatBRL(faturamento)}/mês (${nomeEmpresa}). No Pricing vale a meta da empresa escolhida.`
                  : `A ${nomeEmpresa} não tem meta de faturamento neste mês: o adicional do IRPJ fica em zero até cadastrar a meta.`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
