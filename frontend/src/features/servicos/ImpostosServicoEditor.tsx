import { FileSpreadsheet, Info, Plus, Trash2 } from 'lucide-react'
import { PercentInput } from '@/features/common/PercentInput'
import { MoneyInput } from '@/features/common/MoneyInput'
import { confirmar } from '@/features/common/dialogo/dialogo'
import ui from '@/features/common/ui.module.css'
import { formatBRL, formatPct } from '@/lib/format'
import { MODELOS_IMPOSTOS, TIPOS_IMPOSTO, cargaDoServico, efetivaImposto, impostosDoModelo, novoImposto, rotuloImposto, type ImpostoServico, type TipoImposto } from './impostos'
import s from './servicos.module.css'

interface Props {
  value: ImpostoServico[]
  onChange: (v: ImpostoServico[]) => void
  /** Faturamento do mês pela meta da empresa padrão (calcula o adicional do IRPJ); 0 = sem meta. */
  faturamento: number
  nomeEmpresa: string
}

/**
 * Impostos do serviço como no quadro da contabilidade: base de cálculo × alíquota = efetiva. "No preço"
 * entra no markup do Pricing; "Só destaca" fica fora dele (aparece no Pricing e na nota).
 */
export function ImpostosServicoEditor({ value, onChange, faturamento, nomeEmpresa }: Props) {
  const mudar = (id: string, p: Partial<ImpostoServico>) => onChange(value.map((i) => (i.id === id ? { ...i, ...p } : i)))
  const usados = new Set(value.filter((i) => i.imposto !== 'outro').map((i) => i.imposto))
  const proximo = TIPOS_IMPOSTO.find((t) => t.valor !== 'outro' && !usados.has(t.valor))?.valor ?? 'outro'
  const trocarTipo = (i: ImpostoServico, tipo: TipoImposto) => {
    const padrao = novoImposto(tipo)
    mudar(i.id, { imposto: tipo, base: padrao.base, aliquota: i.aliquota || padrao.aliquota, limite: padrao.limite })
  }
  const usarModelo = async (id: string) => {
    if (!id) return
    if (value.length > 0 && !(await confirmar({ titulo: 'Usar o modelo?', mensagem: 'Os impostos de agora são trocados pelos do modelo (dá para ajustar depois).', confirmar: 'Usar o modelo' }))) return
    onChange(impostosDoModelo(id))
  }
  const carga = cargaDoServico(value, faturamento)

  return (
    <div className={s.impostos}>
      <div className={s.impostosBarra}>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => onChange([...value, novoImposto(proximo)])}><Plus /> Adicionar imposto</button>
        <label className={s.modelo}>
          <FileSpreadsheet size={14} />
          <select value="" onChange={(e) => void usarModelo(e.target.value)} aria-label="Começar de um modelo">
            <option value="">Começar de um modelo...</option>
            {MODELOS_IMPOSTOS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </label>
      </div>

      {value.length === 0 ? (
        <div className={s.semDados}>
          <p>Sem impostos neste serviço: o Pricing usa os impostos da empresa (aba Markup). Adicione um a um ou comece de um modelo da planilha da contabilidade.</p>
        </div>
      ) : (
        <div className={s.impostosTabela}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Imposto</th>
                <th className={ui.right} style={{ width: 130 }}>Base de cálculo</th>
                <th className={ui.right} style={{ width: 120 }}>Alíquota</th>
                <th className={ui.right} style={{ width: 100 }}>Efetiva</th>
                <th style={{ width: 170 }}>Afeta o preço?</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {value.map((i) => {
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
          {value.some((i) => i.imposto === 'irpj-adicional') && (
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
