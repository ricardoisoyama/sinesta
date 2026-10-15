import { useState } from 'react'
import { CheckCircle2, ClipboardCheck, FileText, FolderOpen, History, Landmark, Receipt, Undo2 } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { BadgeFatura } from '@/features/contratos/componentes'
import { dataBR, valorExtra } from '@/features/contratos/regras'
import type { AjusteFatura } from '@/features/contratos/faturas'
import { totalDaFatura, type FaturaCentral } from './dados'
import s from './faturamento.module.css'

interface Props {
  fatura: FaturaCentral | null
  onClose: () => void
  onAbrirPasta: (contratoId: string) => void
  onAprovar: (f: FaturaCentral, ajuste: AjusteFatura, emitir: boolean, totalNovo: number) => void
  onDevolver: (f: FaturaCentral, motivo: string, totalAtual: number) => void
}

/** Alíquota do ISS lida do texto do serviço ("ISS 5% retido"). Só para a prévia do protótipo. */
const aliquotaIss = (detalhe: string) => {
  const m = /ISS\s+(\d+(?:[.,]\d+)?)%/i.exec(detalhe)
  return m ? Number(m[1].replace(',', '.')) / 100 : 0
}
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

/**
 * Conferência (o "olho humano" antes de emitir): o que compõe a fatura, a prévia da nota e da
 * cobrança. Dá para tirar um extra (vai para a fatura seguinte) ou dar desconto; aprovar pode já
 * emitir a NFS-e. Devolver exige o motivo: a fatura volta para alguém ajustar o contrato.
 */
export function ConferenciaModal({ fatura: f, onClose, onAbrirPasta, onAprovar, onDevolver }: Props) {
  const [aberta, setAberta] = useState<string | null>(null)
  const [fora, setFora] = useState<Set<string>>(new Set())
  const [desconto, setDesconto] = useState(0)
  const [devolvendo, setDevolvendo] = useState(false)
  const [motivo, setMotivo] = useState('')
  if ((f?.id ?? null) !== aberta) {
    setAberta(f?.id ?? null)
    setFora(new Set())
    setDesconto(f?.descontos ?? 0)
    setDevolvendo(false)
    setMotivo('')
  }
  if (!f) return null

  const extras = f.extras.filter((e) => !fora.has(e.id))
  const total = totalDaFatura({ previsto: f.previsto, extras, descontos: desconto })
  const iss = aliquotaIss(f.servicoNfseDetalhe)
  const retido = /retido/i.test(f.servicoNfseDetalhe)
  const podeConferir = f.situacao === 'prevista' || f.situacao === 'a-conferir'
  const texto = f.avulsa
    ? `${f.descricao} · Contrato ${f.numero} · Vencto. ${dataBR(f.vencimento)}`
    : f.modalidade === 'spot'
      ? `${f.descricao} · ${f.numero} · Vencto. ${dataBR(f.vencimento)}`
      : `Contrato ${f.numero} · Ref. ${f.referencia} · Vencto. ${dataBR(f.vencimento)}`
  const alternar = (id: string) => setFora((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const ajuste: AjusteFatura = { descontos: desconto, extrasFora: [...fora] }
  const linhasComposicao = !f.travada && f.composicao.length > 0 && !f.documentos.length

  return (
    <Modal
      open
      onClose={onClose}
      title="Conferência da fatura"
      subtitle={`${f.numero} · ${f.clienteNome} · ${f.referencia}`}
      icon={<ClipboardCheck />}
      maxWidth={780}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => onAbrirPasta(f.contratoId)}><FolderOpen /> Abrir a pasta</button>
          <span className={s.espaco} />
          {!podeConferir ? (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Fechar</button>
          ) : devolvendo ? (
            <>
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setDevolvendo(false)}>Voltar</button>
              <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${s.btnDevolver}`} disabled={!motivo.trim()} onClick={() => onDevolver(f, motivo.trim(), total)}>
                <Undo2 /> Devolver para ajuste
              </button>
            </>
          ) : (
            <>
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setDevolvendo(true)}><Undo2 /> Devolver</button>
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => onAprovar(f, ajuste, false, total)}>Aprovar conferência</button>
              <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => onAprovar(f, ajuste, true, total)}>
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
        {f.travada && <span className={s.travadaTag}>NF emitida: a fatura não recalcula mais</span>}
      </div>

      {f.situacao === 'devolvida' && (
        <div className={s.devolvidaCaixa}>
          <Undo2 size={15} />
          <div>
            <b>Devolvida na conferência:</b> {f.motivo}
            <div className={s.devolvidaSub}>Ajuste o contrato na pasta (extras, componentes, escopo) e use "Atualizar e reenviar para conferência".</div>
          </div>
        </div>
      )}

      {devolvendo && (
        <label className={s.motivo}>
          <span>Motivo da devolução (quem ajustar o contrato vai ler isto)</span>
          <textarea autoFocus rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: faltou lançar as 6 horas extras do evento do dia 20; o cliente pediu desconto de R$ 200 combinado com o André." />
        </label>
      )}

      <h4 className={s.confTitulo}><Receipt size={14} /> Composição</h4>
      <div className={s.comp}>
        {linhasComposicao ? (
          f.composicao.filter((l) => l.valor !== null).map((l) => (
            <div key={`${l.apelido}-${l.nome}`} className={s.compLinha}>
              <span>
                {l.nome} <small>({l.regra === 'formula' ? l.detalhe : l.regra === 'unico' ? 'cobrança única' : l.detalhe})</small>
                {l.erro && <small className={s.erroTxt}> · {l.erro}</small>}
              </span>
              <b>{formatBRL(l.valor ?? 0)}</b>
            </div>
          ))
        ) : f.documentos.length ? (
          f.documentos.map((d) => (
            <div key={d.id} className={s.compLinha}>
              <span>{d.tipo} {d.numero} · {d.descricao} <small>({dataBR(d.data)}{d.mdfe ? ` · MDF-e ${d.mdfe}` : ''}{d.canhoto ? ' · canhoto ok' : ' · sem canhoto'})</small></span>
              <b>{formatBRL(d.valor)}</b>
            </div>
          ))
        ) : (
          <div className={s.compLinha}>
            <span>{f.avulsa ? f.descricao : f.modalidade === 'spot' ? `Serviço spot · ${f.descricao}` : 'Mensalidade do contrato (fotografia da NF emitida)'}</span>
            <b>{formatBRL(f.previsto)}</b>
          </div>
        )}
        {f.extras.map((e) => (
          <label key={e.id} className={`${s.compLinha} ${s.compExtra} ${fora.has(e.id) ? s.compFora : ''}`}>
            <span>
              <input type="checkbox" checked={!fora.has(e.id)} disabled={!podeConferir} onChange={() => alternar(e.id)} />
              Extra · {e.descricao} <small>({e.quantidade} × {formatBRL(e.valorUnitario)} · {dataBR(e.data)})</small>
            </span>
            <b>{formatBRL(valorExtra(e))}</b>
          </label>
        ))}
        <div className={s.compLinha}>
          <span>Desconto</span>
          <input className={s.descontoInput} type="number" min={0} step="0.01" value={desconto} disabled={!podeConferir} onChange={(e) => setDesconto(Math.max(0, Number(e.target.value)))} aria-label="Desconto em reais" />
        </div>
        <div className={`${s.compLinha} ${s.compTotal}`}>
          <span>Total da fatura</span>
          <b>{formatBRL(total)}</b>
        </div>
      </div>
      {fora.size > 0 && <div className={s.confNota}>O extra tirado continua "a faturar" na pasta do contrato e entra na fatura seguinte.</div>}

      <div className={s.confGrade}>
        <div>
          <h4 className={s.confTitulo}><FileText size={14} /> Nota fiscal</h4>
          {f.documentoDaOperacao ? (
            <div className={s.confCaixa}>
              <b>{f.nf}</b> emitido{f.documentos.length > 1 ? 's' : ''} na viagem. Transporte não gera NFS-e: a cobrança usa o documento da operação.
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

      {f.versoes.length > 0 && (
        <>
          <h4 className={s.confTitulo}><History size={14} /> Histórico desta fatura</h4>
          <ol className={s.versoes}>
            {[...f.versoes].reverse().map((v, i) => (
              <li key={i}>
                <span>{v.texto}</span>
                <small>{quando(v.em)} · {v.quem} · {formatBRL(v.total)}</small>
              </li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  )
}
