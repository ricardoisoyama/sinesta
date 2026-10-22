import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye, Mail, ShieldCheck, Pencil, ClipboardCheck, FileSignature } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { DataTable, type Column } from '@/features/common/DataTable'
import { LARGURA, LARGURA_ICONE } from '@/features/common/grid'
import { MoneyInput } from '@/features/common/MoneyInput'
import { formatBRL, formatPct } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { nomeUnidade } from '@/features/unidades/mock'
import { useAuth } from '@/features/auth/auth-context'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { usePropostas } from './store'
import { ConferenciaModal } from './ConferenciaModal'
import type { Proposta, StatusProposta } from './types'
import s from './propostas.module.css'

const STATUS_LABEL: Record<StatusProposta, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente de aprovação',
  enviada: 'Enviada',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
}

const dataHora = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR')
}

export function PropostasPage() {
  useEmpresasQuery()
  const navigate = useNavigate()
  const { propostas, setStatus, salvarItens, aprovar } = usePropostas()
  const { user } = useAuth()
  // Só quem tem a permissão de Aprovação vê o botão de liberar o preço.
  const podeAprovar = !user?.permissoes || user.permissoes.includes('/propostas/aprovar')
  // Conferência do resultado: permissão especial, desligada por padrão (o gestor liga no perfil).
  const podeConferir = !!user?.permissoes?.includes('/propostas/conferencia')
  // Proposta aprovada vira contrato (ou spot): o cadastro abre com cliente, empresa e escopo dela.
  const podeContrato = !!user?.permissoes?.includes('/contratos')
  const [conferindo, setConferindo] = useState<Proposta | null>(null)
  const [detalhe, setDetalhe] = useState<Proposta | null>(null)
  const [salvandoCustos, setSalvandoCustos] = useState(false)
  const [emailFor, setEmailFor] = useState<Proposta | null>(null)
  const [email, setEmail] = useState('')

  const enviarEmail = async () => {
    if (!emailFor || !email.trim()) return
    try {
      await setStatus(emailFor.id, 'enviada')
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    setEmailFor(null)
    setEmail('')
  }

  /** Lançamento do custo executado por item (alimenta o RPO). Só faz sentido depois de aprovada. */
  const setCustoReal = (itemId: string, valor: number) =>
    setDetalhe((d) =>
      d ? { ...d, itens: d.itens.map((i) => (i.id === itemId ? { ...i, custoReal: valor } : i)) } : d,
    )

  const gravarCustosReais = async () => {
    if (!detalhe) return
    setSalvandoCustos(true)
    try {
      await salvarItens(detalhe.id, detalhe.itens)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      setSalvandoCustos(false)
      return
    }
    setSalvandoCustos(false)
    setDetalhe(null)
  }

  const aprovarProposta = async (p: Proposta) => {
    try {
      const upd = await aprovar(p.id)
      setDetalhe((d) => (d && d.id === p.id ? upd : d))
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
    }
  }

  const mudarStatus = async (p: Proposta, st: StatusProposta) => {
    try {
      await setStatus(p.id, st)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    setDetalhe({ ...p, status: st })
  }

  // Custo realizado só é lançado depois que a proposta virou operação de verdade.
  const aprovada = detalhe?.status === 'aprovada'

  const columns: Column<Proposta>[] = [
    { header: 'Nº', largura: LARGURA.documento, cell: (p) => <span className={ui.cellStrong}>{p.numero}</span> },
    { header: 'Cliente', valor: (p) => p.cliente, cell: (p) => <span className={ui.cellStrong}>{p.cliente}</span> },
    { header: 'Data', largura: LARGURA.data, cell: (p) => <span className={ui.cellMut}>{p.data}</span> },
    { header: 'Itens', largura: LARGURA.numero, cell: (p) => <span className={ui.cellMut}>{p.itens.length}</span> },
    { header: 'Total', largura: LARGURA.valor, className: ui.right, cell: (p) => <span className={ui.cellStrong}>{formatBRL(p.total)}</span> },
    {
      header: 'Status',
      largura: LARGURA.situacao,
      cell: (p) => <span className={`${s.stat} ${s[p.status]}`}>{STATUS_LABEL[p.status]}</span>,
    },
    {
      header: 'Ações',
      largura: LARGURA.acoes + 2 * LARGURA_ICONE,
      className: ui.colActions,
      cell: (p) => (
        <>
          {p.status === 'pendente' && podeAprovar && (
            <button
              className={`${s.ic} ${s.icAprovar}`}
              title="Aprovar preço negociado"
              onClick={() => aprovarProposta(p)}
            >
              <ShieldCheck />
            </button>
          )}
          {p.status === 'rascunho' && (
            <button className={s.ic} title="Editar no Pricing (itens, descontos e condições)" onClick={() => navigate(`/simulador?proposta=${p.id}`)}>
              <Pencil />
            </button>
          )}
          {podeConferir && (
            <button className={s.ic} title="Conferir o resultado (custo, DF, DV, margem)" onClick={() => setConferindo(p)}>
              <ClipboardCheck />
            </button>
          )}
          {p.status === 'aprovada' && podeContrato && (
            <button className={s.ic} title="Gerar contrato a partir desta proposta" onClick={() => navigate(`/contratos/novo?proposta=${p.id}`)}>
              <FileSignature />
            </button>
          )}
          <button className={s.ic} title="Ver itens" onClick={() => setDetalhe(p)}>
            <Eye />
          </button>
          <button className={s.ic} title="Gerar PDF" onClick={() => navigate(`/propostas/${p.id}/pdf`)}>
            <FileText />
          </button>
          <button className={s.ic} title="Enviar por e-mail" onClick={() => setEmailFor(p)}>
            <Mail />
          </button>
        </>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Operação"
        title="Propostas"
        subtitle="Propostas geradas a partir do Pricing."
      />

      <div className={ui.card}>
        <div className={ui.toolbar}>
          <div style={{ flex: 1 }} />
          <span className={ui.count}>
            {propostas.length} {propostas.length === 1 ? 'proposta' : 'propostas'}
          </span>
        </div>
        <DataTable columns={columns} rows={propostas} getKey={(p) => p.id} empty="Nenhuma proposta gerada ainda." />
      </div>

      <ConferenciaModal proposta={conferindo} onClose={() => setConferindo(null)} />

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title={detalhe ? `Proposta ${detalhe.numero}` : ''}
        subtitle={detalhe?.cliente}
        icon={<FileText />}
        maxWidth={860}
        footer={
          <>
            <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setDetalhe(null)}>
              Fechar
            </button>
            {detalhe?.status === 'aprovada' && (
              <button
                className={`${ui.btn} ${ui.btnPrimary}`}
                onClick={gravarCustosReais}
                disabled={salvandoCustos}
              >
                {salvandoCustos ? 'Salvando...' : 'Salvar custo realizado'}
              </button>
            )}
          </>
        }
      >
        {detalhe && (
          <div>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Serviço / descrição</th>
                  <th>Empresa</th>
                  <th className={ui.right}>Custo orçado</th>
                  {aprovada && <th className={ui.right}>Custo realizado</th>}
                  <th className={ui.right}>Desc.</th>
                  <th className={ui.right}>ML</th>
                  <th className={ui.right}>Preço final</th>
                </tr>
              </thead>
              <tbody>
                {detalhe.itens.map((it) => (
                  <tr key={it.id}>
                    <td className={ui.cellStrong}>{it.descricao}</td>
                    <td className={ui.cellMut}>{nomeUnidade(it.empresaId)}</td>
                    <td className={ui.right}>{formatBRL(it.custoTotal)}</td>
                    {aprovada && (
                      <td className={ui.right}>
                        <div className={s.custoRealCell}>
                          <MoneyInput
                            value={it.custoReal ?? 0}
                            onChange={(v) => setCustoReal(it.id, v)}
                          />
                        </div>
                      </td>
                    )}
                    <td className={ui.right}>{it.desconto > 0 ? formatPct(it.desconto) : '—'}</td>
                    <td className={ui.right}>{formatPct(it.ml)}</td>
                    <td className={`${ui.right} ${ui.cellStrong}`}>
                      {formatBRL(it.precoFinal)}
                      {(it.adValorem ?? 0) > 0 && <div className={ui.cellMut} style={{ fontWeight: 500 }}>+ ad valorem {formatBRL(it.adValorem ?? 0)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {aprovada && (
              <div className={s.custoRealNota}>
                Lance aqui o custo que a operação realmente teve. É esse valor que alimenta o
                RPO, comparando orçado com realizado.
              </div>
            )}
            <div className={s.detTotal}>Total: {formatBRL(detalhe.total)}</div>
            {(detalhe.prazoEntrega || detalhe.validade || detalhe.formaPagamento || detalhe.vendedorNome) && (
              <div className={s.custoRealNota}>
                {detalhe.vendedorNome && <>Vendedor: <b>{detalhe.vendedorNome}</b> · </>}
                {detalhe.prazoEntrega && <>Prazo de entrega: <b>{detalhe.prazoEntrega}</b> · </>}
                {detalhe.formaPagamento && (
                  <>
                    Pagamento: <b>{detalhe.formaPagamento}{(detalhe.prazoPagamentoDias ?? 0) > 0 ? ` em ${detalhe.prazoPagamentoDias} dias` : ''}</b> ·{' '}
                  </>
                )}
                {detalhe.validade && <>Validade: <b>{detalhe.validade}</b></>}
              </div>
            )}

            {(detalhe.justificativa || (detalhe.precoOriginal ?? 0) > 0 || detalhe.motivoAprovacao) && (
              <div className={s.alcada}>
                <div className={s.alcadaTitulo}>
                  <ShieldCheck size={15} />{' '}
                  {detalhe.motivoAprovacao === 'abaixo-markup-minimo' ? 'Margem abaixo do markup mínimo' : 'Preço negociado'}
                </div>
                {(detalhe.precoOriginal ?? 0) > 0 && (
                  <div className={s.alcadaLinha}>
                    <span>Preço calculado pelo sistema</span>
                    <b>{formatBRL(detalhe.precoOriginal ?? 0)}</b>
                  </div>
                )}
                <div className={s.alcadaLinha}>
                  <span>Preço solicitado</span>
                  <b>{formatBRL(detalhe.total)}</b>
                </div>
                {detalhe.justificativa && (
                  <div className={s.alcadaJustificativa}>“{detalhe.justificativa}”</div>
                )}
                {(detalhe.aprovacoes ?? []).length > 0 && (
                  <div className={s.assinaturas}>
                    {(detalhe.aprovacoes ?? []).map((a) => (
                      <div key={a.usuarioId} className={s.assinatura}>
                        Aprovado por <b>{a.nome}</b> em {dataHora(a.em)}
                      </div>
                    ))}
                  </div>
                )}
                {detalhe.status === 'pendente' && podeAprovar && (
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.btnPrimary}`}
                    onClick={() => aprovarProposta(detalhe)}
                  >
                    <ShieldCheck /> Aprovar este preço
                  </button>
                )}
              </div>
            )}
            <div className={s.detStatus}>
              Status:
              <select
                className={s.statusSel}
                value={detalhe.status}
                // Pendente/aprovada só mudam pela mão de um aprovador (o servidor confere também).
                disabled={(detalhe.status === 'pendente' || detalhe.status === 'aprovada') && !podeAprovar}
                title={
                  (detalhe.status === 'pendente' || detalhe.status === 'aprovada') && !podeAprovar
                    ? 'Só um aprovador altera o status desta proposta.'
                    : undefined
                }
                onChange={(e) => mudarStatus(detalhe, e.target.value as StatusProposta)}
              >
                {(Object.keys(STATUS_LABEL) as StatusProposta[])
                  // "Aprovada" só pelo botão de aprovação, que registra quem aprovou.
                  .filter((st) => st !== 'aprovada' || detalhe.status === 'aprovada')
                  .map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABEL[st]}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!emailFor}
        onClose={() => setEmailFor(null)}
        title="Enviar proposta por e-mail"
        subtitle={emailFor ? `${emailFor.numero} · ${emailFor.cliente}` : ''}
        icon={<Mail />}
        maxWidth={520}
        maximizavel={false}
        footer={
          <>
            <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setEmailFor(null)}>
              Cancelar
            </button>
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={enviarEmail} disabled={!email.trim()}>
              Enviar
            </button>
          </>
        }
      >
        <section className={ui.fsection}>
          <Field label="E-mail do destinatário" req>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@empresa.com.br" />
          </Field>
          <div style={{ fontSize: 12, color: '#6b7b72', marginTop: 10 }}>
            O envio real de e-mail entra na Fase 2 (backend). Por ora, ao enviar, a proposta é marcada como{' '}
            <b>Enviada</b>.
          </div>
        </section>
      </Modal>
    </div>
  )
}
