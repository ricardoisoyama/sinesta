import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Landmark, Send } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { hojeISO } from './calculos'
import { agendarPagamentos, prepararPagamentos, ROTULO_PAGAMENTO, type PreparoPagamento, type ResultadoAgendamento } from './pagamentos'
import s from './financeiro.module.css'

interface Props {
  movimentoIds: string[]
  onClose: () => void
  onFeito: () => void
}

const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—')

/**
 * Agendar pagamento (piloto): os lançamentos a pagar escolhidos vão ao banco como Pix na data
 * escolhida. Na conta que exige aprovação, o Pix fica esperando no app do banco; quando for
 * aprovado e efetivado, o aviso do banco dá a baixa e manda o e-mail ao favorecido.
 */
export function AgendarPagamentoModal({ movimentoIds, onClose, onFeito }: Props) {
  const [itens, setItens] = useState<PreparoPagamento[] | null>(null)
  const [chaves, setChaves] = useState<Record<string, string>>({})
  const [data, setData] = useState(hojeISO())
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultados, setResultados] = useState<ResultadoAgendamento[] | null>(null)

  useEffect(() => {
    let vivo = true
    prepararPagamentos(movimentoIds)
      .then((l) => {
        if (!vivo) return
        setItens(l)
        setChaves(Object.fromEntries(l.map((p) => [p.movimentoId, p.chaveSugerida])))
      })
      .catch((e) => vivo && setErro(getErrorMessage(e)))
    return () => {
      vivo = false
    }
  }, [movimentoIds])

  const aptos = (itens ?? []).filter((p) => !p.problema)
  const semChave = aptos.filter((p) => !(chaves[p.movimentoId] ?? '').trim())
  const total = aptos.reduce((a, p) => a + p.valor, 0)

  const enviar = async () => {
    setEnviando(true)
    setErro('')
    try {
      const r = await agendarPagamentos(aptos.map((p) => ({ movimentoId: p.movimentoId, chave: (chaves[p.movimentoId] ?? '').trim() })), data)
      setResultados(r)
      onFeito()
    } catch (e) {
      setErro(getErrorMessage(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Agendar pagamento"
      subtitle="Pix pelo banco da empresa, na data escolhida"
      icon={<Landmark />}
      maxWidth={860}
      error={erro}
      busy={enviando}
      footer={
        resultados ? (
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={onClose}>Fechar</button>
        ) : (
          <>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void enviar()} disabled={enviando || aptos.length === 0 || semChave.length > 0}>
              <Send /> {enviando ? 'Enviando ao banco...' : `Enviar ${aptos.length} Pix ao banco · ${formatBRL(total)}`}
            </button>
          </>
        )
      }
    >
      {!itens ? (
        <p className={ui.cellMut}>Carregando os lançamentos...</p>
      ) : resultados ? (
        <ul className={s.pagLista}>
          {resultados.map((r) => {
            const p = itens.find((x) => x.movimentoId === r.movimentoId)
            return (
              <li key={r.movimentoId} className={r.ok ? s.pagOk : s.pagErro}>
                {r.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <div>
                  <b>{p?.favorecido} · {formatBRL(p?.valor ?? 0)}</b>
                  <span>{r.pagamento ? ROTULO_PAGAMENTO[r.pagamento.situacao] : ''}{r.ok ? '' : ` · ${r.mensagem}`}</span>
                </div>
              </li>
            )
          })}
          {/* A nota segue o que o banco respondeu: só fala em aprovar no app quando há Pix esperando aprovação. */}
          {resultados.some((r) => r.pagamento?.situacao === 'aguardando-aprovacao') ? (
            <li className={s.pagNota}>
              Pix aguardando aprovação: aprove no app do banco. Quando o banco efetivar, o ELROND dá a baixa no lançamento e manda o e-mail ao favorecido sozinho.
            </li>
          ) : resultados.some((r) => r.ok) ? (
            <li className={s.pagNota}>
              Quando o banco efetivar (costuma levar segundos), o ELROND dá a baixa no lançamento e manda o e-mail ao favorecido sozinho.
            </li>
          ) : null}
        </ul>
      ) : (
        <>
          <div className={s.pagTopo}>
            <label className={s.periodo}>
              Data do pagamento
              <input type="date" value={data} min={hojeISO()} onChange={(e) => setData(e.target.value)} />
            </label>
            <span className={ui.cellMut}>Hoje = o Pix sai assim que for aprovado no app do banco. Data futura = fica agendado.</span>
          </div>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Favorecido</th>
                <th>Chave Pix</th>
                <th className={ui.right}>Valor</th>
                <th>Banco</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => (
                <tr key={p.movimentoId}>
                  <td>
                    <div className={ui.cellStrong}>{p.favorecido}</div>
                    <div className={ui.cellMut}>
                      nº {p.numero} · vence {dataBR(p.vencimento)}{p.email ? ` · ${p.email}` : ' · sem e-mail no cadastro'}
                    </div>
                    {p.problema && <div className={s.pagProblema}><AlertTriangle size={12} /> {p.problema}</div>}
                  </td>
                  <td>
                    {p.problema ? (
                      <span className={ui.cellMut}>—</span>
                    ) : (
                      <input
                        className={s.pagChave}
                        value={chaves[p.movimentoId] ?? ''}
                        onChange={(e) => setChaves({ ...chaves, [p.movimentoId]: e.target.value })}
                        placeholder="CPF/CNPJ, e-mail, celular ou chave aleatória"
                        aria-label={`Chave Pix de ${p.favorecido}`}
                      />
                    )}
                    {!p.problema && !p.chaveSugerida && <div className={ui.cellMut}>Sem chave no cadastro: informe aqui.</div>}
                  </td>
                  <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(p.valor)}</td>
                  <td className={ui.cellMut}>{p.banco || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {semChave.length > 0 && <p className={s.pagProblema}><AlertTriangle size={12} /> Falta a chave Pix de {semChave.map((p) => p.favorecido).join(', ')}.</p>}
        </>
      )}
    </Modal>
  )
}
