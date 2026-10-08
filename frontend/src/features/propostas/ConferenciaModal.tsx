import { ClipboardCheck } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { formatBRL, formatPct } from '@/lib/format'
import type { ItemProposta, Proposta } from './types'
import s from './propostas.module.css'

interface Linha {
  id: string
  descricao: string
  receita: number
  custo: number
  df: number | null
  dv: number | null
  /** DF + DV quando o item é antigo e não guardou a separação. */
  dfDv: number
  mcu: number
  ml: number
}

/**
 * Conferência do resultado (o grid laranja da planilha): receita, custo base, DF, DV, MCU e ML de
 * cada item. A receita sai da própria margem gravada: ML = (R − custo − R·DF − R·DV) ÷ R.
 */
function conferir(i: ItemProposta): Linha {
  const custo = i.custoTotal || 0
  const ml = i.ml || 0
  const temSeparacao = (i.dfPct ?? 0) > 0 || (i.dvSem ?? 0) > 0
  const divisor = 1 - (i.dfPct ?? 0) - (i.dvSem ?? 0) - ml
  // Item antigo (sem DF/DV gravados): a receita é o PV com o desconto.
  const receita = temSeparacao && divisor > 0 ? custo / divisor : (i.pv || 0) * (1 - (i.desconto || 0))
  const mcu = receita * ml
  return {
    id: i.id,
    descricao: i.descricao,
    receita,
    custo,
    df: temSeparacao ? receita * (i.dfPct ?? 0) : null,
    dv: temSeparacao ? receita * (i.dvSem ?? 0) : null,
    dfDv: receita - custo - mcu,
    mcu,
    ml,
  }
}

export function ConferenciaModal({ proposta, onClose }: { proposta: Proposta | null; onClose: () => void }) {
  const linhas = (proposta?.itens ?? []).map(conferir)
  const soma = (k: 'receita' | 'custo' | 'mcu' | 'dfDv') => linhas.reduce((a, l) => a + l[k], 0)
  const receita = soma('receita')
  const algumAntigo = linhas.some((l) => l.df === null)
  return (
    <Modal
      open={!!proposta}
      onClose={onClose}
      title={proposta ? `Conferência · ${proposta.numero}` : ''}
      subtitle="Resultado de cada item: o que a venda cobre e o que sobra"
      icon={<ClipboardCheck />}
      maxWidth={980}
      footer={
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
          Fechar
        </button>
      }
    >
      <table className={`${ui.table} ${s.conferencia}`}>
        <thead>
          <tr>
            <th>Item</th>
            <th className={ui.right}>Receita</th>
            <th className={ui.right}>Custo base</th>
            <th className={ui.right}>DF</th>
            <th className={ui.right}>DV</th>
            <th className={ui.right}>MCU</th>
            <th className={ui.right}>ML</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id}>
              <td className={ui.cellStrong}>{l.descricao}</td>
              <td className={ui.right}>{formatBRL(l.receita)}</td>
              <td className={ui.right}>− {formatBRL(l.custo)}</td>
              {l.df === null ? (
                <td className={ui.right} colSpan={2} title="Item antigo: DF e DV não foram gravados separados">
                  − {formatBRL(l.dfDv)} <span className={ui.cellMut}>(DF + DV)</span>
                </td>
              ) : (
                <>
                  <td className={ui.right}>− {formatBRL(l.df)}</td>
                  <td className={ui.right}>− {formatBRL(l.dv ?? 0)}</td>
                </>
              )}
              <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(l.mcu)}</td>
              <td className={`${ui.right} ${ui.cellStrong}`}>{formatPct(l.ml)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className={ui.cellStrong}>Total</td>
            <td className={ui.right}>{formatBRL(receita)}</td>
            <td className={ui.right}>− {formatBRL(soma('custo'))}</td>
            <td className={ui.right} colSpan={2}>− {formatBRL(soma('dfDv'))} <span className={ui.cellMut}>(DF + DV)</span></td>
            <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(soma('mcu'))}</td>
            <td className={`${ui.right} ${ui.cellStrong}`}>{formatPct(receita > 0 ? soma('mcu') / receita : 0)}</td>
          </tr>
        </tfoot>
      </table>
      <div className={s.conferenciaNota}>
        Receita sem impostos de ICMS. DF = despesa fixa rateada; DV = impostos, comissão, despesa financeira e outras; MCU = o que
        sobra depois de tudo; ML = MCU sobre a receita (deve bater com o lucro da empresa quando não há desconto).
        {algumAntigo && ' Itens antigos não guardaram DF e DV separados: aparecem somados.'}
      </div>
    </Modal>
  )
}
