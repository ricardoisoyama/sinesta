import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, CircleX, Landmark, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react'
import { PageHeader } from '@/features/common/PageHeader'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { atualizarPagamento, cancelarRepresado, liberarPagamento, listarMonitor, rotuloPagamento, type ItemMonitor } from './pagamentos'
import { linhaDigitavel } from './codigoBoleto'
import s from './monitor.module.css'

const dataBR = (iso: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const quando = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

type Filtro = 'represados' | 'andamento' | 'todos'

/**
 * Monitor dos pagamentos assistidos: o que foi mandado ao banco fica REPRESADO aqui (não vai ao banco) até
 * alguém conferir e liberar. Cada pagamento mostra o lançamento como está agora e as conferências (o que
 * bate, o que pede atenção e o que impede liberar). Depois de liberado, acompanha a situação no banco.
 */
export function MonitorPagamentosPage() {
  const [filtro, setFiltro] = useState<Filtro>('represados')
  const [ocupado, setOcupado] = useState('')
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['financeiro', 'monitor-pagamentos'],
    queryFn: listarMonitor,
    refetchInterval: 15_000,
  })
  const itens = data ?? []
  const represados = itens.filter((i) => i.pagamento.situacao === 'represado')
  const andamento = itens.filter((i) => ['pendente', 'aguardando-aprovacao', 'agendado', 'processando', 'incerto'].includes(i.pagamento.situacao))
  const lista = filtro === 'represados' ? represados : filtro === 'andamento' ? andamento : itens

  const agir = async (id: string, acao: () => Promise<unknown>, erroTitulo: string) => {
    setOcupado(id)
    try {
      await acao()
    } catch (e) {
      void avisar({ titulo: erroTitulo, mensagem: getErrorMessage(e) })
    } finally {
      setOcupado('')
      await refetch()
    }
  }
  const liberar = async (i: ItemMonitor) => {
    const p = i.pagamento
    const erros = i.conferencias.filter((c) => c.nivel === 'erro')
    if (erros.length) return void avisar({ titulo: 'Não dá para liberar', mensagem: erros.map((e) => e.texto).join(' ') })
    const avisos = i.conferencias.filter((c) => c.nivel === 'aviso')
    const ok = await confirmar({
      titulo: `Mandar ao banco: ${formatBRL(p.valor)}`,
      mensagem: `${p.forma === 'boleto' ? 'Boleto' : 'Pix'} para ${p.favorecidoNome}, lançamento nº ${p.movimentoNumero}, pagar em ${dataBR(p.data)}.${avisos.length ? ` Atenção: ${avisos.map((a) => a.texto).join(' ')}` : ''} Depois de liberado, o banco pode pedir a aprovação no app.`,
      confirmar: 'Conferi, mandar ao banco',
      perigo: avisos.length > 0,
    })
    if (ok) await agir(p.id, () => liberarPagamento(p.id), 'O banco não recebeu')
  }
  const cancelar = async (i: ItemMonitor) => {
    const ok = await confirmar({ titulo: 'Cancelar o represado?', mensagem: `O pagamento de ${formatBRL(i.pagamento.valor)} para ${i.pagamento.favorecidoNome} não foi ao banco. Cancelando, o lançamento pode ser mandado de novo.`, confirmar: 'Cancelar o represado', perigo: true })
    if (ok) await agir(i.pagamento.id, () => cancelarRepresado(i.pagamento.id), 'Não foi possível cancelar')
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Financeiro"
        title="Monitor de pagamentos"
        subtitle="Pagamentos assistidos: o que for mandado ao banco fica represado aqui até ser conferido e liberado. Depois, acompanhe a situação no banco até a baixa."
        action={
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? s.girando : undefined} /> Atualizar
          </button>
        }
      />
      <div className={s.filtros} role="tablist" aria-label="Filtro">
        {([['represados', `Represados (${represados.length})`], ['andamento', `No banco (${andamento.length})`], ['todos', `Últimos 30 dias (${itens.length})`]] as [Filtro, string][]).map(([f, rotulo]) => (
          <button key={f} type="button" role="tab" aria-selected={filtro === f} className={filtro === f ? s.filtroOn : s.filtro} onClick={() => setFiltro(f)}>{rotulo}</button>
        ))}
      </div>
      {lista.length === 0 ? (
        <div className={s.vazio}>
          <Landmark size={18} />
          {filtro === 'represados' ? 'Nenhum pagamento represado. Mande pelo Agendar pagamento das Entradas e Saídas: ele para aqui antes de ir ao banco.' : 'Nada por aqui.'}
        </div>
      ) : (
        <div className={s.lista}>
          {lista.map((i) => {
            const p = i.pagamento
            const represado = p.situacao === 'represado'
            const temErro = i.conferencias.some((c) => c.nivel === 'erro')
            return (
              <article key={p.id} className={`${s.card} ${represado ? s.cardRepresado : ''}`}>
                <header className={s.topo}>
                  <div>
                    <div className={s.favorecido}>{p.favorecidoNome}</div>
                    <div className={s.sub}>
                      Lançamento nº {p.movimentoNumero} · {i.empresa}{i.conta ? ` · sai de ${i.conta}` : ''} · {p.forma === 'boleto' ? 'Boleto' : 'Pix'}
                    </div>
                  </div>
                  <div className={s.valor}>{formatBRL(p.valor)}</div>
                </header>
                <dl className={s.dados}>
                  <div><dt>Pagar em</dt><dd>{dataBR(p.data)}</dd></div>
                  {p.forma === 'boleto' ? (
                    <>
                      <div><dt>Vencimento do boleto</dt><dd>{dataBR(p.vencimentoBoleto ?? '')}</dd></div>
                      <div className={s.largo}><dt>Linha digitável</dt><dd className={s.codigo}>{linhaDigitavel(p.codigoBarras ?? '')}</dd></div>
                    </>
                  ) : (
                    <div className={s.largo}><dt>Chave Pix</dt><dd className={s.codigo}>{p.chave}</dd></div>
                  )}
                  <div><dt>Lançamento hoje</dt><dd>{formatBRL(i.valorLancamento)} · vence {dataBR(i.vencimentoLancamento)} · {i.aprovacao}</dd></div>
                  <div><dt>Situação</dt><dd><b>{rotuloPagamento(p)}</b>{p.situacaoBanco ? ` (banco: ${p.situacaoBanco})` : ''}</dd></div>
                  {p.liberadoPor && <div><dt>Liberado</dt><dd>{p.liberadoPor} · {quando(p.liberadoEm ?? '')}</dd></div>}
                  {p.idBanco && <div className={s.largo}><dt>Código no banco</dt><dd className={s.codigo}>{p.idBanco}</dd></div>}
                  {p.mensagem && !represado && <div className={s.largo}><dt>Banco disse</dt><dd>{p.mensagem}</dd></div>}
                  {p.situacao === 'pago' && <div className={s.largo}><dt>Pago</dt><dd>{quando(p.pagoEm)}{p.beneficiario ? ` · recebeu: ${p.beneficiario}` : ''}{p.emailSituacao ? ` · e-mail ${p.emailSituacao}` : ''}</dd></div>}
                </dl>
                {represado && (
                  <ul className={s.conferencias}>
                    {i.conferencias.map((c, k) => (
                      <li key={k} className={s[c.nivel]}>
                        {c.nivel === 'ok' ? <CheckCircle2 size={14} /> : c.nivel === 'aviso' ? <AlertTriangle size={14} /> : <CircleX size={14} />}
                        {c.texto}
                      </li>
                    ))}
                  </ul>
                )}
                <footer className={s.acoes}>
                  {represado ? (
                    <>
                      <button type="button" className={`${ui.btn} ${ui.btnGhost}`} disabled={ocupado === p.id} onClick={() => void cancelar(i)}><XCircle /> Cancelar</button>
                      <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={ocupado === p.id || temErro} onClick={() => void liberar(i)} title={temErro ? 'Resolva o que está em vermelho' : 'Conferido: mandar ao banco'}>
                        <Send /> {ocupado === p.id ? 'Mandando...' : 'Conferi, mandar ao banco'}
                      </button>
                    </>
                  ) : ['pendente', 'aguardando-aprovacao', 'agendado', 'processando', 'incerto'].includes(p.situacao) ? (
                    <button type="button" className={`${ui.btn} ${ui.btnGhost}`} disabled={ocupado === p.id} onClick={() => void agir(p.id, () => atualizarPagamento(p.id), 'Não foi possível consultar o banco')}>
                      <RefreshCw /> Consultar o banco
                    </button>
                  ) : p.situacao === 'pago' ? (
                    <span className={s.pago}><ShieldCheck size={15} /> Pago e baixado</span>
                  ) : null}
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
