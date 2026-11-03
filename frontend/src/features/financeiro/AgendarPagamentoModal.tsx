import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, Landmark, Loader2, Send, Smartphone } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { hojeISO } from './calculos'
import { lerCodigoBoleto } from './codigoBoleto'
import { lerArquivoBoleto, lerBoletoDosAnexos } from './lerBoleto'
import { LerOutroDispositivo } from './LerOutroDispositivo'
import { agendarPagamentos, prepararPagamentos, rotuloPagamento, type PreparoPagamento, type ResultadoAgendamento } from './pagamentos'
import s from './financeiro.module.css'

interface Props {
  movimentoIds: string[]
  onClose: () => void
  onFeito: () => void
}

type Forma = 'pix' | 'boleto'
const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—')

/**
 * Agendar pagamento: os lançamentos a pagar escolhidos vão ao banco como Pix (chave) ou boleto (linha
 * digitável), na data escolhida. Na conta que exige aprovação, o pagamento fica esperando no app do banco;
 * quando for aprovado e efetivado, o aviso do banco dá a baixa e manda o e-mail ao favorecido.
 */
export function AgendarPagamentoModal({ movimentoIds, onClose, onFeito }: Props) {
  const [itens, setItens] = useState<PreparoPagamento[] | null>(null)
  const [formas, setFormas] = useState<Record<string, Forma>>({})
  const [chaves, setChaves] = useState<Record<string, string>>({})
  const [codigos, setCodigos] = useState<Record<string, string>>({})
  const [vencimentos, setVencimentos] = useState<Record<string, string>>({})
  const [data, setData] = useState(hojeISO())
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultados, setResultados] = useState<ResultadoAgendamento[] | null>(null)
  // Boleto por arquivo (PDF ou foto, lido no navegador) ou pelo celular (QR).
  const [lendoArquivo, setLendoArquivo] = useState('')
  const [erroArquivo, setErroArquivo] = useState<Record<string, string>>({})
  const [noCelular, setNoCelular] = useState<PreparoPagamento | null>(null)
  /** De qual anexo veio o código (o boleto que o financeiro anexou no lançamento). */
  const [doAnexo, setDoAnexo] = useState<Record<string, string>>({})
  const usarArquivo = async (id: string, arquivo: File | undefined) => {
    if (!arquivo) return
    setLendoArquivo(id)
    setErroArquivo((x) => ({ ...x, [id]: '' }))
    const r = await lerArquivoBoleto(arquivo)
    setLendoArquivo('')
    if ('codigo' in r) setCodigos((x) => ({ ...x, [id]: r.codigo }))
    else setErroArquivo((x) => ({ ...x, [id]: r.erro }))
  }

  useEffect(() => {
    let vivo = true
    prepararPagamentos(movimentoIds)
      .then((l) => {
        if (!vivo) return
        setItens(l)
        setChaves(Object.fromEntries(l.map((p) => [p.movimentoId, p.chaveSugerida])))
        // Sem chave Pix no cadastro, o mais provável é ter chegado um boleto.
        setFormas(Object.fromEntries(l.map((p) => [p.movimentoId, p.chaveSugerida ? 'pix' : 'boleto'])))
        setVencimentos(Object.fromEntries(l.map((p) => [p.movimentoId, p.vencimento])))
        // Boleto anexado ao lançamento: já preenche a linha digitável (e escolhe Boleto) sem ninguém digitar.
        for (const p of l.filter((x) => !x.problema)) {
          setLendoArquivo((atual) => atual || p.movimentoId)
          void lerBoletoDosAnexos(p.movimentoId)
            .then((achado) => {
              if (!vivo || !achado) return
              setCodigos((x) => (x[p.movimentoId] ? x : { ...x, [p.movimentoId]: achado.codigo }))
              setFormas((x) => ({ ...x, [p.movimentoId]: 'boleto' }))
              setDoAnexo((x) => ({ ...x, [p.movimentoId]: achado.arquivo }))
            })
            .catch(() => undefined)
            .finally(() => vivo && setLendoArquivo((atual) => (atual === p.movimentoId ? '' : atual)))
        }
      })
      .catch((e) => vivo && setErro(getErrorMessage(e)))
    return () => {
      vivo = false
    }
  }, [movimentoIds])

  const hoje = hojeISO()
  const forma = (id: string): Forma => formas[id] ?? 'pix'
  /** O que impede mandar este boleto (vazio = pode); o servidor confere de novo. */
  const leitura = (p: PreparoPagamento) => {
    const { codigo, erro } = lerCodigoBoleto(codigos[p.movimentoId] ?? '', hoje)
    if (!codigo) return { codigo, problema: erro ?? '' }
    const venc = codigo.vencimento || vencimentos[p.movimentoId] || ''
    const depoisDoVencimento = !!venc && data > venc
    const valorBate = !codigo.valor || Math.abs(codigo.valor - p.valor) < 0.005 || (p.valor > codigo.valor && depoisDoVencimento)
    return {
      codigo,
      problema: !valorBate ? `O boleto é de ${formatBRL(codigo.valor)} e o lançamento, de ${formatBRL(p.valor)}: ajuste o lançamento.` : !venc ? 'Informe o vencimento.' : '',
    }
  }

  const aptos = (itens ?? []).filter((p) => !p.problema)
  const pendencias = aptos.filter((p) => (forma(p.movimentoId) === 'pix' ? !(chaves[p.movimentoId] ?? '').trim() : !!leitura(p).problema))
  const total = aptos.reduce((a, p) => a + p.valor, 0)

  const enviar = async () => {
    setEnviando(true)
    setErro('')
    try {
      const r = await agendarPagamentos(
        aptos.map((p) =>
          forma(p.movimentoId) === 'boleto'
            ? { movimentoId: p.movimentoId, chave: '', forma: 'boleto', codigo: codigos[p.movimentoId] ?? '', vencimento: vencimentos[p.movimentoId] ?? '' }
            : { movimentoId: p.movimentoId, chave: (chaves[p.movimentoId] ?? '').trim(), forma: 'pix' },
        ),
        data,
      )
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
      subtitle="Pix ou boleto pelo banco da empresa, na data escolhida"
      icon={<Landmark />}
      maxWidth={980}
      error={erro}
      busy={enviando}
      footer={
        resultados ? (
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={onClose}>Fechar</button>
        ) : (
          <>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void enviar()} disabled={enviando || aptos.length === 0 || pendencias.length > 0}>
              <Send /> {enviando ? 'Enviando ao banco...' : `Enviar ${aptos.length} ${aptos.length === 1 ? 'pagamento' : 'pagamentos'} ao banco · ${formatBRL(total)}`}
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
                  <span>{r.pagamento ? rotuloPagamento(r.pagamento) : ''}{r.ok ? '' : ` · ${r.mensagem}`}</span>
                </div>
              </li>
            )
          })}
          {/* A nota segue o que o banco respondeu: só fala em aprovar no app quando há pagamento esperando aprovação. */}
          {resultados.some((r) => r.pagamento?.situacao === 'aguardando-aprovacao') ? (
            <li className={s.pagNota}>
              Aguardando aprovação: aprove no app do banco. Quando o banco efetivar, o ELROND dá a baixa no lançamento e manda o e-mail ao favorecido sozinho.
            </li>
          ) : resultados.some((r) => r.pagamento?.situacao === 'incerto') ? (
            <li className={s.pagNota}>
              O banco não respondeu a tempo. O ELROND confere no banco sozinho (pelo código do boleto) e não manda de novo: não reenvie antes de conferir no app.
            </li>
          ) : resultados.some((r) => r.ok) ? (
            <li className={s.pagNota}>
              Quando o banco efetivar, o ELROND dá a baixa no lançamento e manda o e-mail ao favorecido sozinho.
            </li>
          ) : null}
        </ul>
      ) : (
        <>
          <div className={s.pagTopo}>
            <label className={s.periodo}>
              Data do pagamento
              <input type="date" value={data} min={hoje} onChange={(e) => setData(e.target.value)} />
            </label>
            <span className={ui.cellMut}>Hoje = sai assim que for aprovado no app do banco. Data futura = fica agendado. Boleto só é pago em dia útil.</span>
          </div>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Favorecido</th>
                <th style={{ width: 130 }}>Forma</th>
                <th>Chave Pix ou linha digitável</th>
                <th className={ui.right}>Valor</th>
                <th>Banco</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => {
                const f = forma(p.movimentoId)
                const l = f === 'boleto' && (codigos[p.movimentoId] ?? '').trim() ? leitura(p) : null
                return (
                  <tr key={p.movimentoId}>
                    <td>
                      <div className={ui.cellStrong}>{p.favorecido}</div>
                      <div className={ui.cellMut}>
                        nº {p.numero} · vence {dataBR(p.vencimento)}{p.email ? ` · ${p.email}` : ' · sem e-mail no cadastro'}
                      </div>
                      {p.problema && <div className={s.pagProblema}><AlertTriangle size={12} /> {p.problema}</div>}
                    </td>
                    <td>
                      {!p.problema && (
                        <div className={s.pagForma} role="radiogroup" aria-label={`Forma de pagamento de ${p.favorecido}`}>
                          {(['pix', 'boleto'] as Forma[]).map((x) => (
                            <button key={x} type="button" role="radio" aria-checked={f === x} className={f === x ? s.pagFormaOn : undefined} onClick={() => setFormas({ ...formas, [p.movimentoId]: x })}>
                              {x === 'pix' ? 'Pix' : 'Boleto'}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {p.problema ? (
                        <span className={ui.cellMut}>—</span>
                      ) : f === 'pix' ? (
                        <>
                          <input
                            className={s.pagChave}
                            value={chaves[p.movimentoId] ?? ''}
                            onChange={(e) => setChaves({ ...chaves, [p.movimentoId]: e.target.value })}
                            placeholder="CPF/CNPJ, e-mail, celular ou chave aleatória"
                            aria-label={`Chave Pix de ${p.favorecido}`}
                          />
                          {!p.chaveSugerida && <div className={ui.cellMut}>Sem chave no cadastro: informe aqui.</div>}
                        </>
                      ) : (
                        <>
                          <input
                            className={`${s.pagChave} ${s.pagCodigo}`}
                            value={codigos[p.movimentoId] ?? ''}
                            onChange={(e) => setCodigos({ ...codigos, [p.movimentoId]: e.target.value })}
                            placeholder="Cole a linha digitável ou o código de barras"
                            aria-label={`Linha digitável do boleto de ${p.favorecido}`}
                            inputMode="numeric"
                          />
                          <div className={s.pagFontes}>
                            <label className={s.pagFonte} title="O boleto em PDF ou uma foto: o sistema acha a linha digitável ou lê o código de barras">
                              {lendoArquivo === p.movimentoId ? <Loader2 size={13} className={s.girando} /> : <FileUp size={13} />}
                              {lendoArquivo === p.movimentoId ? 'Lendo...' : 'Enviar boleto (PDF ou foto)'}
                              <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => { void usarArquivo(p.movimentoId, e.target.files?.[0]); e.target.value = '' }} />
                            </label>
                            <button type="button" className={s.pagFonte} onClick={() => setNoCelular(p)} title="Mostra um QR Code: o celular lê o código de barras com a câmera">
                              <Smartphone size={13} /> Ler em outro dispositivo
                            </button>
                          </div>
                          {erroArquivo[p.movimentoId] && <div className={s.pagProblema}><AlertTriangle size={12} /> {erroArquivo[p.movimentoId]}</div>}
                          {doAnexo[p.movimentoId] && codigos[p.movimentoId] && <div className={ui.cellMut}>Lido do anexo {doAnexo[p.movimentoId]}</div>}
                          {l?.codigo && !l.problema && (
                            <div className={s.pagLido}>
                              <CheckCircle2 size={12} /> {l.codigo.valor ? formatBRL(l.codigo.valor) : 'valor do lançamento'}
                              {l.codigo.vencimento ? ` · vence ${dataBR(l.codigo.vencimento)}` : ''}
                              {l.codigo.arrecadacao ? ' · conta de consumo/tributo' : ''}
                            </div>
                          )}
                          {l?.codigo?.vencimento && !l.problema && l.codigo.vencimento !== p.vencimento && (
                            <div className={s.pagProblema}><AlertTriangle size={12} /> O lançamento vence em {dataBR(p.vencimento)}: confira se é o boleto certo.</div>
                          )}
                          {l?.codigo?.arrecadacao && (
                            <label className={s.pagVenc}>
                              Vencimento
                              <input type="date" value={vencimentos[p.movimentoId] ?? ''} onChange={(e) => setVencimentos({ ...vencimentos, [p.movimentoId]: e.target.value })} />
                            </label>
                          )}
                          {l?.problema && <div className={s.pagProblema}><AlertTriangle size={12} /> {l.problema}</div>}
                        </>
                      )}
                    </td>
                    <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(p.valor)}</td>
                    <td className={ui.cellMut}>{p.banco || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {noCelular && (
            <LerOutroDispositivo
              favorecido={`${noCelular.favorecido} · ${formatBRL(noCelular.valor)}`}
              onLido={(codigo) => { setCodigos((x) => ({ ...x, [noCelular.movimentoId]: codigo })); setNoCelular(null) }}
              onClose={() => setNoCelular(null)}
            />
          )}
          {pendencias.length > 0 && (
            <p className={s.pagProblema}>
              <AlertTriangle size={12} /> Falta {pendencias.map((p) => `${forma(p.movimentoId) === 'pix' ? 'a chave Pix' : 'o boleto'} de ${p.favorecido}`).join(', ')}.
            </p>
          )}
        </>
      )}
    </Modal>
  )
}
