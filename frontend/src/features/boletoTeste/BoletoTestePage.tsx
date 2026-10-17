import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Copy, FileText, FlaskConical, Landmark, Loader2, RefreshCw, Search, XCircle } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { getErrorMessage } from '@/lib/api'
import { formatBRL, formatCpfCnpj } from '@/lib/format'
import {
  FORMA_PAGAMENTO,
  SITUACAO_COBRANCA,
  SITUACAO_FATURA,
  SITUACAO_PARCELA,
  atualizarCobranca,
  cancelarCobranca,
  gerarBoleto,
  listCobrancas,
  listEmpresasComBanco,
  listFaturas,
  obterFatura,
  pdfCobranca,
  tempoDoAviso,
  type Cobranca,
  type ParcelaFatura,
} from './api'
import { BoletoTesteModal } from './BoletoTesteModal'
import s from './boleto.module.css'

const hojeISO = () => new Date().toISOString().slice(0, 10)
const dataBR = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : iso || '—')
/** Desde quando a Aldrava usa a SIIMP (data de corte combinada). */
const INICIO_SIIMP = '2025-10-01'

const copiar = async (texto: string, oQue: string) => {
  try {
    await navigator.clipboard.writeText(texto)
    void avisar({ titulo: 'Copiado', mensagem: `${oQue} copiado.` })
  } catch {
    void avisar({ titulo: oQue, mensagem: texto })
  }
}

/**
 * Página PROVISÓRIA (fora do menu): testa a integração de boletos ponta a ponta. Lista as
 * faturas da SIIMP (só leitura), mostra pagador e parcelas e gera o boleto da parcela pelo
 * banco da empresa (Inter sandbox). Valor e pagador vêm da SIIMP no servidor.
 */
export function BoletoTestePage() {
  const qc = useQueryClient()
  const { data: empresas, isLoading: carregandoEmpresas } = useQuery({ queryKey: ['boleto-teste', 'empresas'], queryFn: listEmpresasComBanco })
  const [empresaEscolhida, setEmpresaEscolhida] = useState('')
  const empresaId = empresas?.some((e) => e.empresaId === empresaEscolhida) ? empresaEscolhida : (empresas?.[0]?.empresaId ?? '')
  const empresa = empresas?.find((e) => e.empresaId === empresaId)

  const [de, setDe] = useState(INICIO_SIIMP)
  const [ate, setAte] = useState(hojeISO())
  const [periodo, setPeriodo] = useState({ de: INICIO_SIIMP, ate: hojeISO() })
  const [soBoleto, setSoBoleto] = useState(true)
  const faturasQ = useQuery({ queryKey: ['boleto-teste', 'faturas', empresaId, periodo], queryFn: () => listFaturas(empresaId, periodo.de, periodo.ate), enabled: !!empresaId })
  const faturas = (faturasQ.data ?? []).filter((f) => !soBoleto || f.formaPagamento === 6).sort((a, b) => b.numero - a.numero)

  const [faturaId, setFaturaId] = useState<number | null>(null)
  const detalheQ = useQuery({ queryKey: ['boleto-teste', 'fatura', faturaId, empresaId], queryFn: () => obterFatura(faturaId!, empresaId), enabled: faturaId !== null && !!empresaId })
  const cobrancasQ = useQuery({ queryKey: ['boleto-teste', 'cobrancas', empresaId], queryFn: () => listCobrancas(empresaId), enabled: !!empresaId })

  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: ['boleto-teste', 'cobrancas'] })
    void qc.invalidateQueries({ queryKey: ['boleto-teste', 'fatura'] })
  }
  const falhou = (titulo: string) => (err: unknown) => void avisar({ titulo, mensagem: getErrorMessage(err) })

  const [vencimentos, setVencimentos] = useState<Record<number, string>>({})
  const gerar = useMutation({
    mutationFn: (p: ParcelaFatura) => gerarBoleto(faturaId!, p.id, empresaId, vencimentos[p.id]),
    onSuccess: (c) => {
      recarregar()
      // O pedido chegou ao servidor, mas o banco recusou ou não confirmou: avisa já, não só na lista de baixo.
      if (c.situacao === 'falha') void avisar({ titulo: 'O banco recusou o boleto', mensagem: c.mensagem })
      if (c.situacao === 'incerta')
        void avisar({
          titulo: 'O banco não confirmou o boleto',
          mensagem: `${c.mensagem} Se o banco não tiver registrado, "Conferir no banco" libera a parcela para gerar de novo.`,
        })
    },
    onError: falhou('Não foi possível gerar o boleto'),
  })
  const atualizar = useMutation({ mutationFn: (c: Cobranca) => atualizarCobranca(c.id), onSuccess: recarregar, onError: falhou('Não foi possível consultar o banco') })
  const cancelar = useMutation({ mutationFn: (c: Cobranca) => cancelarCobranca(c.id, 'Teste ELROND'), onSuccess: recarregar, onError: falhou('Não foi possível cancelar') })
  const [abrindoPdf, setAbrindoPdf] = useState('')
  const [testando, setTestando] = useState(false)
  const abrirPdf = async (c: Cobranca) => {
    setAbrindoPdf(c.id)
    try {
      const url = URL.createObjectURL(await pdfCobranca(c.id))
      window.open(url, '_blank', 'noopener')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      void avisar({ titulo: 'PDF indisponível', mensagem: getErrorMessage(err) })
    } finally {
      setAbrindoPdf('')
    }
  }
  const pedirCancelamento = async (c: Cobranca) => {
    const ok = await confirmar({ titulo: 'Cancelar boleto', mensagem: `Cancelar o boleto ${c.seuNumero} (${formatBRL(c.valor)}, ${c.origemDescricao}) no banco?`, confirmar: 'Cancelar boleto', cancelar: 'Voltar', perigo: true })
    if (ok) cancelar.mutate(c)
  }

  if (!carregandoEmpresas && (empresas ?? []).length === 0)
    return (
      <div>
        <PageHeader breadcrumb="Financeiro · teste" title="Boleto (teste)" subtitle="Página provisória para testar a geração de boletos a partir das faturas da SIIMP." />
        <div className={s.aviso}>
          <AlertTriangle size={16} /> Nenhuma empresa tem integração bancária de cobrança ativa neste ambiente. A ativação é feita pela nossa equipe (implantação).
        </div>
      </div>
    )

  const detalhe = detalheQ.data
  const boletosDaParcela = (p: ParcelaFatura) => (detalhe?.boletos ?? []).filter((b) => b.origemParcelaId === String(p.id))
  const pagador = detalhe?.pagador
  const faltas = pagador ? [!pagador.rua && 'endereço', !pagador.cidade && 'cidade', !pagador.uf && 'UF', pagador.cep.replace(/\D/g, '').length !== 8 && 'CEP'].filter(Boolean) : []

  return (
    <div>
      <PageHeader
        breadcrumb="Financeiro · teste"
        title="Boleto (teste)"
        subtitle="Faturas da SIIMP (só leitura) → boleto com Pix no banco da empresa. Página provisória, fora do menu."
        action={
          <div className={s.topo}>
            <label className={s.campo}>
              Empresa
              <select
                value={empresaId}
                onChange={(e) => {
                  setEmpresaEscolhida(e.target.value)
                  setFaturaId(null)
                }}
              >
                {(empresas ?? []).map((e) => (
                  <option key={e.empresaId} value={e.empresaId}>{e.empresa}</option>
                ))}
              </select>
            </label>
            {empresa && (
              <span className={`${s.ambiente} ${empresa.ambiente === 'producao' ? s.producao : ''}`} title={`Certificado válido até ${dataBR(empresa.certificadoValidoAte)}`}>
                <Landmark size={13} /> {empresa.banco} · {empresa.ambiente === 'producao' ? 'PRODUÇÃO' : 'sandbox'}
              </span>
            )}
          </div>
        }
      />

      <div className={s.grade}>
        {/* ── Faturas da SIIMP ── */}
        <section className={`${ui.card} ${s.painel}`}>
          <div className={s.cardTitulo}>
            Faturas da SIIMP {empresa && <span className={s.sub}>emitidas pela {empresa.empresa}</span>}
          </div>
          <form
            className={s.filtros}
            onSubmit={(e) => {
              e.preventDefault()
              setPeriodo({ de, ate })
            }}
          >
            <label className={s.campo}>
              Emitidas de <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </label>
            <label className={s.campo}>
              até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </label>
            <button type="submit" className={`${ui.btn} ${ui.btnGhost}`}>
              <Search /> Buscar
            </button>
            <label className={s.check}>
              <input type="checkbox" checked={soBoleto} onChange={(e) => setSoBoleto(e.target.checked)} /> Só forma boleto
            </label>
          </form>
          {faturasQ.isLoading ? (
            <div className={s.vazio}><Loader2 className={s.gira} size={16} /> Consultando a SIIMP...</div>
          ) : faturasQ.error ? (
            <div className={s.aviso}><AlertTriangle size={16} /> {getErrorMessage(faturasQ.error)}</div>
          ) : faturas.length === 0 ? (
            <div className={s.vazio}>Nenhuma fatura no período{soBoleto ? ' com forma boleto' : ''}.</div>
          ) : (
            <div className={s.rolagem}>
              <table className={s.tabela}>
                <thead>
                  <tr><th>Nº</th><th>Vencimento</th><th>Forma</th><th>Situação</th><th className={s.dir}>Total</th></tr>
                </thead>
                <tbody>
                  {faturas.map((f) => (
                    <tr key={f.id} className={f.id === faturaId ? s.selecionada : ''} onClick={() => setFaturaId(f.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setFaturaId(f.id)}>
                      <td className={s.forte}>{f.numero}</td>
                      <td>{dataBR(f.vencimento)}</td>
                      <td>{FORMA_PAGAMENTO[f.formaPagamento] ?? `Forma ${f.formaPagamento}`}</td>
                      <td>{SITUACAO_FATURA[f.situacao] ?? f.situacao}</td>
                      <td className={s.dir}>{formatBRL(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Detalhe da fatura ── */}
        <section className={`${ui.card} ${s.painel}`}>
          {faturaId === null ? (
            <div className={s.vazio}>Escolha uma fatura ao lado para ver o pagador e as parcelas.</div>
          ) : detalheQ.isLoading ? (
            <div className={s.vazio}><Loader2 className={s.gira} size={16} /> Lendo a fatura na SIIMP...</div>
          ) : detalheQ.error ? (
            <div className={s.aviso}><AlertTriangle size={16} /> {getErrorMessage(detalheQ.error)}</div>
          ) : detalhe ? (
            <>
              <div className={s.cardTitulo}>
                Fatura {detalhe.fatura.numero} <span className={s.sub}>{SITUACAO_FATURA[detalhe.fatura.situacao]} · {formatBRL(detalhe.fatura.total)} · carteira {detalhe.fatura.carteira || '—'}</span>
              </div>

              <div className={s.pagador}>
                <b>{pagador?.nome || detalhe.fatura.pagadorNome}</b>
                <span>{formatCpfCnpj(pagador?.documento || detalhe.fatura.pagadorDocumento)}</span>
                {pagador ? (
                  <span>
                    {[pagador.rua, pagador.numero, pagador.complemento, pagador.bairro].filter(Boolean).join(', ')} · {pagador.cidade}/{pagador.uf} · CEP {pagador.cep}
                    {pagador.email && <> · {pagador.email}</>}
                  </span>
                ) : (
                  <span className={s.erro}>{detalhe.erroPagador}</span>
                )}
                {faltas.length > 0 && <span className={s.erro}>Falta no cadastro da SIIMP: {faltas.join(', ')}. O banco vai recusar.</span>}
              </div>

              {detalhe.fatura.documentos.length > 0 && (
                <div className={s.docs}>Documentos: {detalhe.fatura.documentos.map((d) => `${d.tipo} ${d.numero}`).join(', ')}</div>
              )}

              <table className={s.tabela}>
                <thead>
                  <tr><th>Parcela</th><th>Vencimento</th><th>Situação</th><th className={s.dir}>Valor</th><th /></tr>
                </thead>
                <tbody>
                  {detalhe.fatura.parcelas.map((p) => {
                    const vigente = boletosDaParcela(p).find((b) => !['cancelada', 'expirada', 'falha'].includes(b.situacao))
                    const vencida = p.vencimento < hojeISO()
                    const aberta = p.situacao === 0 || p.situacao === 2
                    return (
                      <tr key={p.id}>
                        <td className={s.forte}>{p.numero}/{detalhe.fatura.parcelas.length}</td>
                        <td>
                          {dataBR(p.vencimento)}
                          {vencida && !vigente && aberta && (
                            <label className={s.novoVenc} title="Vencimento já passou: para o teste, escolha um novo">
                              novo: <input type="date" min={hojeISO()} value={vencimentos[p.id] ?? ''} onChange={(e) => setVencimentos((v) => ({ ...v, [p.id]: e.target.value }))} />
                            </label>
                          )}
                        </td>
                        <td>{SITUACAO_PARCELA[p.situacao] ?? p.situacao}</td>
                        <td className={s.dir}>{formatBRL(p.valor - p.desconto)}</td>
                        <td className={s.dir}>
                          {vigente ? (
                            <>
                              <span className={`${s.pill} ${s[SITUACAO_COBRANCA[vigente.situacao].tom]}`}>Boleto {vigente.seuNumero} · {SITUACAO_COBRANCA[vigente.situacao].rotulo}</span>
                              {vigente.situacao === 'incerta' && (
                                <div className={s.incerta}>
                                  <span>{vigente.mensagem}</span>
                                  <button type="button" className={`${ui.btn} ${ui.btnGhost}`} disabled={atualizar.isPending} onClick={() => atualizar.mutate(vigente)}>
                                    {atualizar.isPending && atualizar.variables?.id === vigente.id ? <Loader2 className={s.gira} /> : <RefreshCw />} Conferir no banco
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              className={`${ui.btn} ${ui.btnPrimary}`}
                              disabled={!aberta || gerar.isPending || faltas.length > 0 || (vencida && !vencimentos[p.id])}
                              title={!aberta ? 'Parcela já liquidada ou cancelada' : vencida && !vencimentos[p.id] ? 'Escolha um novo vencimento' : undefined}
                              onClick={() => gerar.mutate(p)}
                            >
                              {gerar.isPending && gerar.variables?.id === p.id ? <Loader2 className={s.gira} /> : null} Gerar boleto
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          ) : null}
        </section>
      </div>

      {/* ── Boletos gerados ── */}
      <section className={`${ui.card} ${s.painel} ${s.boletos}`}>
        <div className={s.cardTitulo}>
          Boletos gerados <span className={s.sub}>{empresa?.empresa} · {empresa?.banco} {empresa?.ambiente}</span>
          <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnTeste}`} onClick={() => setTestando(true)} disabled={!empresaId}>
            <FlaskConical /> Boleto de teste
          </button>
        </div>
        {testando && (
          <BoletoTesteModal
            empresaId={empresaId}
            producao={empresa?.ambiente === 'producao'}
            onClose={() => setTestando(false)}
            onGerado={(c) => {
              setTestando(false)
              recarregar()
              void avisar({
                titulo: 'Boleto de teste enviado ao banco',
                mensagem: `Seu nº ${c.seuNumero} · ${SITUACAO_COBRANCA[c.situacao].rotulo}. ${c.mensagem || ''} Quando aparecer a linha digitável, abra o PDF; depois, cancele.`,
              })
            }}
          />
        )}
        {(cobrancasQ.data ?? []).length === 0 ? (
          <div className={s.vazio}>Nenhum boleto gerado ainda. Escolha uma fatura e clique em "Gerar boleto".</div>
        ) : (
          <div className={s.rolagem}>
            <table className={s.tabela}>
              <thead>
                <tr><th>Seu nº</th><th>Origem</th><th>Pagador</th><th>Vencimento</th><th className={s.dir}>Valor</th><th>Situação</th><th>Nosso nº / linha digitável</th><th /></tr>
              </thead>
              <tbody>
                {(cobrancasQ.data ?? []).map((c) => {
                  const sit = SITUACAO_COBRANCA[c.situacao]
                  return (
                    <tr key={c.id}>
                      <td className={s.forte}>{c.seuNumero}</td>
                      <td>{c.origemDescricao}</td>
                      <td>{c.pagadorNome}</td>
                      <td>{dataBR(c.vencimento)}</td>
                      <td className={s.dir}>{formatBRL(c.valor)}</td>
                      <td>
                        <span className={`${s.pill} ${s[sit.tom]}`} title={c.situacaoBanco ? `No banco: ${c.situacaoBanco}` : undefined}>{sit.rotulo}</span>
                        {c.situacao === 'recebida' && <div className={s.mini}>{formatBRL(c.valorRecebido)} por {c.recebidaPor || '—'} em {c.pagaEm ? new Date(c.pagaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : dataBR(c.recebidaEm)}</div>}
                        {c.situacao === 'recebida' && tempoDoAviso(c) && <div className={s.mini}>{tempoDoAviso(c)}</div>}
                        {c.mensagem && <div className={s.mini}>{c.mensagem}</div>}
                      </td>
                      <td className={s.linha}>
                        {c.nossoNumero && <div className={s.mini}>Nosso nº {c.nossoNumero}</div>}
                        {c.linhaDigitavel ? <code>{c.linhaDigitavel}</code> : <span className={s.mini}>aguardando o banco</span>}
                      </td>
                      <td>
                        <div className={s.acoes}>
                          <button type="button" className={ui.iconBtn} title="Consultar o banco agora" onClick={() => atualizar.mutate(c)} disabled={atualizar.isPending}>
                            {atualizar.isPending && atualizar.variables?.id === c.id ? <Loader2 className={s.gira} /> : <RefreshCw />}
                          </button>
                          <button type="button" className={ui.iconBtn} title="Abrir o PDF do boleto" onClick={() => void abrirPdf(c)} disabled={!c.idBanco || abrindoPdf === c.id}>
                            {abrindoPdf === c.id ? <Loader2 className={s.gira} /> : <FileText />}
                          </button>
                          <button type="button" className={ui.iconBtn} title="Copiar a linha digitável" onClick={() => void copiar(c.linhaDigitavel, 'Linha digitável')} disabled={!c.linhaDigitavel}>
                            <Copy />
                          </button>
                          <button type="button" className={ui.iconBtn} title="Copiar o Pix copia e cola" onClick={() => void copiar(c.pixCopiaECola, 'Pix copia e cola')} disabled={!c.pixCopiaECola}>
                            <span className={s.pix}>Pix</span>
                          </button>
                          <button type="button" className={ui.iconBtn} title="Cancelar o boleto no banco" onClick={() => void pedirCancelamento(c)} disabled={!['a-receber', 'processando'].includes(c.situacao)}>
                            <XCircle />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
