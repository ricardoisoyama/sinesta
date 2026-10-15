import { useState } from 'react'
import { CheckCircle2, ClipboardCheck, FileText, FolderOpen, Landmark, Receipt } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { BadgeFatura } from '@/features/contratos/componentes'
import { dataBR, valorExtra } from '@/features/contratos/regras'
import { totalDaFatura, type FaturaCentral } from './dados'
import s from './faturamento.module.css'

interface Props {
  fatura: FaturaCentral | null
  onClose: () => void
  onAbrirPasta: (contratoId: string) => void
  onAprovar: (f: FaturaCentral, ajustes: Partial<FaturaCentral>, emitir: boolean) => void
}

/** Alíquota do ISS lida do texto do serviço ("ISS 5% retido"). Só para a prévia do protótipo. */
const aliquotaIss = (detalhe: string) => {
  const m = /ISS\s+(\d+(?:[.,]\d+)?)%/i.exec(detalhe)
  return m ? Number(m[1].replace(',', '.')) / 100 : 0
}

/**
 * Conferência (o "olho humano" antes de emitir): o que compõe a fatura, a prévia da nota e da
 * cobrança. Dá para tirar um extra ou dar desconto; aprovar pode já emitir a NFS-e.
 */
export function ConferenciaModal({ fatura: f, onClose, onAbrirPasta, onAprovar }: Props) {
  const [aberta, setAberta] = useState<string | null>(null)
  const [fora, setFora] = useState<Set<string>>(new Set())
  const [desconto, setDesconto] = useState(0)
  if ((f?.id ?? null) !== aberta) {
    setAberta(f?.id ?? null)
    setFora(new Set())
    setDesconto(f?.descontos ?? 0)
  }
  if (!f) return null

  const extras = f.extras.filter((e) => !fora.has(e.id))
  const total = totalDaFatura({ previsto: f.previsto, extras, descontos: desconto })
  const iss = aliquotaIss(f.servicoNfseDetalhe)
  const retido = /retido/i.test(f.servicoNfseDetalhe)
  const jaFoi = !['prevista', 'a-conferir'].includes(f.situacao)
  const texto = f.avulsa
    ? `${f.descricao} · Contrato ${f.numero} · Vencto. ${dataBR(f.vencimento)}`
    : f.modalidade === 'spot'
      ? `${f.descricao} · ${f.numero} · Vencto. ${dataBR(f.vencimento)}`
      : `Contrato ${f.numero} · Ref. ${f.referencia} · Vencto. ${dataBR(f.vencimento)}`
  const alternar = (id: string) => setFora((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const ajustes: Partial<FaturaCentral> = { extras, descontos: desconto }

  return (
    <Modal
      open
      onClose={onClose}
      title="Conferência da fatura"
      subtitle={`${f.numero} · ${f.clienteNome} · ${f.referencia}`}
      icon={<ClipboardCheck />}
      maxWidth={760}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => onAbrirPasta(f.contratoId)}><FolderOpen /> Abrir a pasta</button>
          <span className={s.espaco} />
          {jaFoi ? (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Fechar</button>
          ) : (
            <>
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => onAprovar(f, ajustes, false)}>Aprovar conferência</button>
              <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => onAprovar(f, ajustes, true)}>
                <CheckCircle2 /> Aprovar e {f.documentoDaOperacao ? 'liberar a cobrança' : 'emitir a NFS-e'}
              </button>
            </>
          )}
        </>
      }
    >
      <div className={s.confTopo}>
        <BadgeFatura situacao={f.situacao} />
        <span>{f.empresaNome} · {f.tipoOperacao}</span>
      </div>

      <h4 className={s.confTitulo}><Receipt size={14} /> Composição</h4>
      <div className={s.comp}>
        <div className={s.compLinha}>
          <span>{f.avulsa ? f.descricao : f.modalidade === 'spot' ? `Serviço spot · ${f.descricao}` : `Mensalidade do contrato (${f.itens} ite${f.itens === 1 ? 'm' : 'ns'})`}</span>
          <b>{formatBRL(f.previsto)}</b>
        </div>
        {f.extras.map((e) => (
          <label key={e.id} className={`${s.compLinha} ${s.compExtra} ${fora.has(e.id) ? s.compFora : ''}`}>
            <span>
              <input type="checkbox" checked={!fora.has(e.id)} disabled={jaFoi} onChange={() => alternar(e.id)} />
              Extra · {e.descricao} <small>({e.quantidade} × {formatBRL(e.valorUnitario)} · {dataBR(e.data)})</small>
            </span>
            <b>{formatBRL(valorExtra(e))}</b>
          </label>
        ))}
        <div className={s.compLinha}>
          <span>Desconto</span>
          <input
            className={s.descontoInput}
            type="number"
            min={0}
            step="0.01"
            value={desconto}
            disabled={jaFoi}
            onChange={(e) => setDesconto(Math.max(0, Number(e.target.value)))}
            aria-label="Desconto em reais"
          />
        </div>
        <div className={`${s.compLinha} ${s.compTotal}`}>
          <span>Total da fatura</span>
          <b>{formatBRL(total)}</b>
        </div>
      </div>
      {fora.size > 0 && <div className={s.confNota}>O extra tirado volta para a pasta do contrato como "a faturar" e entra na fatura seguinte.</div>}

      <div className={s.confGrade}>
        <div>
          <h4 className={s.confTitulo}><FileText size={14} /> Nota fiscal</h4>
          {f.documentoDaOperacao ? (
            <div className={s.confCaixa}>
              <b>{f.nf}</b> emitido na viagem. Transporte não gera NFS-e: a cobrança usa o documento da operação.
            </div>
          ) : (
            <dl className={s.confDefs}>
              <dt>Serviço</dt><dd>{f.servicoNfse}</dd>
              <dt>Tributação</dt><dd>{f.servicoNfseDetalhe}</dd>
              {iss > 0 && <><dt>ISS{retido ? ' retido' : ''}</dt><dd>{formatBRL(total * iss)}{retido ? ` · líquido ${formatBRL(total - total * iss)}` : ''}</dd></>}
              <dt>Descrição</dt><dd><code className={s.codigo}>{texto}</code></dd>
            </dl>
          )}
        </div>
        <div>
          <h4 className={s.confTitulo}><Landmark size={14} /> Cobrança</h4>
          <dl className={s.confDefs}>
            <dt>Carteira</dt><dd>{f.carteira}</dd>
            <dt>Forma</dt><dd>{f.formaCobranca}</dd>
            <dt>Vencimento</dt><dd>{dataBR(f.vencimento)}</dd>
            {f.boleto && <><dt>Boleto</dt><dd>{f.boleto}</dd></>}
          </dl>
          <ul className={s.checklist}>
            <li><CheckCircle2 size={13} /> Cliente com endereço e CNPJ completos</li>
            <li><CheckCircle2 size={13} /> Serviço com código municipal e alíquota</li>
            <li><CheckCircle2 size={13} /> Carteira com integração de boleto ativa</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
