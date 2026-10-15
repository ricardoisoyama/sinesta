import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Banknote, CalendarRange, CircleDollarSign, Clock, FileSignature, FileText, FolderOpen, History, Landmark, Lock, MapPin,
  Paperclip, Plus, Receipt, RefreshCcw, ScrollText, Settings2, Sparkles, TrendingDown, TrendingUp, Upload, Wrench,
} from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { AvisoPrototipo } from '@/features/common/AvisoPrototipo'
import { avisar } from '@/features/common/dialogo/dialogo'
import { formatBRL, formatPct } from '@/lib/format'
import { CONTRATOS_EXEMPLO } from './mock'
import {
  aReceber, alertasDoContrato, custoItem, dataBR, diasEntre, diasParaFim, ETAPAS_FATURA, escopoVigente, extrasPendentes, faturadoNaVigencia,
  hojeISO, margemPrecificada, mesAnoCurto, progressoVigencia, proximoFaturamento, proximoReajuste, ROTULO_SITUACAO_FATURA, totalEscopo,
  totalFatura, totalItem, valorContrato, valorExtra,
} from './regras'
import type { CobrancaExtra, Contrato, ExtraContrato, TipoEvento, TipoExtra } from './types'
import { Alertas, BadgeFatura, BadgeModalidade, BadgeSituacao } from './componentes'
import s from './contratos.module.css'

type Aba = 'resumo' | 'escopo' | 'condicoes' | 'faturas' | 'extras' | 'documentos' | 'historico'

const ROTULO_EXTRA: Record<TipoExtra, string> = { 'hora-extra': 'Hora extra', 'custo-extra': 'Custo extra', ocorrencia: 'Ocorrência' }
const ROTULO_COBRANCA: Record<CobrancaExtra, string> = { 'proxima-fatura': 'Na próxima fatura', separado: 'Faturar separado', 'nao-cobrar': 'Não cobrar' }
const ICONE_EVENTO: Record<TipoEvento, typeof Clock> = {
  assinatura: FileSignature, fatura: Receipt, aditivo: ScrollText, reajuste: TrendingUp, extra: Plus, ocorrencia: Wrench,
  renovacao: RefreshCcw, documento: Paperclip, encerramento: FolderOpen,
}

/** Pasta do contrato (protótipo): tudo de um contrato ou spot num lugar só. */
export function PastaContratoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const original = CONTRATOS_EXEMPLO.find((c) => c.id === id)
  const [c, setC] = useState<Contrato | undefined>(original)
  const [aba, setAba] = useState<Aba>('resumo')
  const hoje = hojeISO()

  if (!c)
    return (
      <div>
        <Link to="/contratos" className={s.voltar}><ArrowLeft size={15} /> Contratos</Link>
        <div className={s.vazio}>Contrato não encontrado.</div>
      </div>
    )

  const spot = c.modalidade === 'spot'
  const escopo = escopoVigente(c, hoje)
  const margemPrec = margemPrecificada(escopo)
  const pendentes = extrasPendentes(c)
  const abas: { id: Aba; rotulo: string; icone: typeof Clock; n?: number }[] = [
    { id: 'resumo', rotulo: 'Resumo', icone: Sparkles },
    { id: 'escopo', rotulo: 'Escopo e preço', icone: ScrollText },
    { id: 'condicoes', rotulo: 'Condições', icone: Settings2 },
    { id: 'faturas', rotulo: spot ? 'Fatura' : 'Faturas', icone: Receipt, n: spot ? undefined : c.faturas.length },
    ...(spot ? [] : [{ id: 'extras' as const, rotulo: 'Extras', icone: Plus, n: pendentes.length || undefined }]),
    { id: 'documentos', rotulo: 'Documentos', icone: Paperclip, n: c.documentos.length },
    { id: 'historico', rotulo: 'Histórico', icone: History },
  ]

  const atualizarExtra = (e: ExtraContrato) => setC({ ...c, extras: c.extras.map((x) => (x.id === e.id ? e : x)) })
  const lancarExtra = (e: ExtraContrato) =>
    setC({
      ...c,
      extras: [e, ...c.extras],
      eventos: [{ data: hoje, tipo: 'extra', texto: `${ROTULO_EXTRA[e.tipo]} lançado: ${e.descricao} (${formatBRL(valorExtra(e))}, ${ROTULO_COBRANCA[e.cobranca].toLowerCase()})`, quem: 'você' }, ...c.eventos],
    })

  return (
    <div>
      <Link to="/contratos" className={s.voltar}><ArrowLeft size={15} /> Contratos</Link>
      <AvisoPrototipo>dados de exemplo; o que você mexer aqui (extras, cobrança) some ao sair da tela.</AvisoPrototipo>

      {/* ── capa da pasta ── */}
      <div className={s.pasta}>
        <div className={s.orelha}>
          <FolderOpen size={14} /> {c.numero}
        </div>
        <section className={s.capa}>
          <div className={s.capaTopo}>
            <div className={s.capaQuem}>
              <h1 className={s.capaCliente}>{c.clienteNome}</h1>
              <div className={s.capaSub}>{c.clienteDocumento} · {c.contato}</div>
              <div className={s.capaChips}>
                <BadgeModalidade modalidade={c.modalidade} />
                <span className={`${s.badge} ${s.badgeNeutro}`}>{c.tipoOperacao}</span>
                <span className={`${s.badge} ${s.badgeNeutro}`}><Landmark size={12} /> {c.empresaNome}</span>
                <BadgeSituacao situacao={c.situacao} />
                {alertasDoContrato(c, hoje).length > 0 && <Alertas alertas={alertasDoContrato(c, hoje)} />}
              </div>
            </div>
            <div className={s.capaValor}>
              <div className={s.capaValorNum}>{formatBRL(valorContrato(c, hoje))}</div>
              <div className={s.capaValorSub}>{spot ? 'valor do serviço' : 'por mês'}</div>
              {proximoFaturamento(c, hoje) && (
                <div className={s.capaProx}>
                  <CalendarRange size={13} /> {spot ? 'vence em' : 'próximo faturamento'} {dataBR(proximoFaturamento(c, hoje)!)}
                </div>
              )}
            </div>
          </div>

          {spot ? <FaixaSpot c={c} /> : <LinhaVigencia c={c} hoje={hoje} />}

          <div className={s.capaNumeros}>
            <Numero rotulo={spot ? 'Faturado' : 'Faturado na vigência'} valor={formatBRL(faturadoNaVigencia(c))} sub={`${c.faturas.filter((f) => f.nf).length} nota(s)`} />
            <Numero rotulo="A receber" valor={formatBRL(aReceber(c))} sub={c.faturas.some((f) => f.situacao === 'atrasada') ? 'tem fatura em atraso' : 'em dia'} alerta={c.faturas.some((f) => f.situacao === 'atrasada')} />
            <Numero
              rotulo="Margem precificada → realizada"
              valor={
                <span className={s.margens}>
                  {formatPct(margemPrec, 1)}
                  <span className={s.seta}>→</span>
                  <span className={c.margemRealizada && c.margemRealizada < margemPrec - 0.005 ? s.pior : s.melhor}>
                    {c.margemRealizada ? formatPct(c.margemRealizada, 1) : '—'}
                    {c.margemRealizada ? c.margemRealizada < margemPrec - 0.005 ? <TrendingDown size={15} /> : <TrendingUp size={15} /> : null}
                  </span>
                </span>
              }
              sub={c.margemRealizada ? 'custo real lançado (RPO)' : 'ainda sem custo realizado'}
            />
            {!spot && <Numero rotulo="Extras a faturar" valor={formatBRL(pendentes.reduce((a, e) => a + valorExtra(e), 0))} sub={`${pendentes.length} lançamento(s)`} />}
          </div>
        </section>
      </div>

      {/* ── abas da pasta ── */}
      <div className={s.abas} role="tablist">
        {abas.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={`${s.aba} ${aba === a.id ? s.abaOn : ''}`} onClick={() => setAba(a.id)}>
            <a.icone size={14} /> {a.rotulo}
            {a.n !== undefined && <span className={s.abaN}>{a.n}</span>}
          </button>
        ))}
      </div>
      <section className={s.folha}>
        {aba === 'resumo' && <AbaResumo c={c} hoje={hoje} irPara={setAba} abrirCentral={() => navigate(`/financeiro/faturamento?contrato=${c.id}`)} />}
        {aba === 'escopo' && <AbaEscopo c={c} hoje={hoje} />}
        {aba === 'condicoes' && <AbaCondicoes c={c} hoje={hoje} />}
        {aba === 'faturas' && <AbaFaturas c={c} abrirCentral={() => navigate(`/financeiro/faturamento?contrato=${c.id}`)} />}
        {aba === 'extras' && <AbaExtras c={c} onAtualizar={atualizarExtra} onLancar={lancarExtra} />}
        {aba === 'documentos' && <AbaDocumentos c={c} />}
        {aba === 'historico' && <LinhaDoTempo c={c} />}
      </section>
    </div>
  )
}

function Numero({ rotulo, valor, sub, alerta }: { rotulo: string; valor: ReactNode; sub: string; alerta?: boolean }) {
  return (
    <div className={s.numeroCard}>
      <div className={s.numRotulo}>{rotulo}</div>
      <div className={`${s.numValor} ${alerta ? s.numAlerta : ''}`}>{valor}</div>
      <div className={s.numSub}>{sub}</div>
    </div>
  )
}

/**
 * Linha da vigência: do início ao fim, com o "hoje", os aditivos, o reajuste e a faixa do aviso
 * prévio (até quando dá para avisar que não vai renovar).
 */
function LinhaVigencia({ c, hoje }: { c: Contrato; hoje: string }) {
  const total = Math.max(1, diasEntre(c.inicio, c.fim))
  const pos = (iso: string) => `${Math.min(100, Math.max(0, (diasEntre(c.inicio, iso) / total) * 100))}%`
  const reaj = proximoReajuste(c, hoje)
  const avisoAte = (() => {
    const d = new Date(`${c.fim}T12:00:00`)
    d.setDate(d.getDate() - c.condicoes.avisoPrevioDias)
    return d.toISOString().slice(0, 10)
  })()
  const prog = progressoVigencia(c, hoje)
  const dias = diasParaFim(c, hoje)
  return (
    <div className={s.vigencia}>
      <div className={s.vigTopo}>
        <span><b>Vigência</b> {dataBR(c.inicio)} a {dataBR(c.fim)}</span>
        <span className={s.vigResta}>{c.situacao === 'encerrado' ? 'encerrado' : dias >= 0 ? `faltam ${dias} dias · ${c.condicoes.renovacaoAutomatica ? 'renova sozinho' : 'não renova sozinho'}` : 'vencido'}</span>
      </div>
      <div className={s.trilho}>
        <div className={s.trilhoFeito} style={{ width: `${prog * 100}%` }} />
        <div className={s.trilhoAviso} style={{ left: pos(avisoAte), right: 0 }} title={`Aviso prévio: avisar até ${dataBR(avisoAte)} (${c.condicoes.avisoPrevioDias} dias antes do fim)`} />
        {c.escopo.slice(1).map((v) => (
          <span key={v.versao} className={s.marcoAditivo} style={{ left: pos(v.vigenteDesde) }} title={`${v.motivo} · ${dataBR(v.vigenteDesde)}`} />
        ))}
        {reaj && <span className={s.marcoReajuste} style={{ left: pos(reaj) }} title={`Reajuste ${c.condicoes.reajusteIndice} · ${mesAnoCurto(reaj.slice(0, 7))} (aviso)`} />}
        {c.situacao !== 'encerrado' && (
          <span className={s.marcoHoje} style={{ left: `${prog * 100}%` }}>
            <i>hoje</i>
          </span>
        )}
      </div>
      <div className={s.vigLegenda}>
        {c.escopo.length > 1 && <span><i className={s.legAditivo} /> aditivo</span>}
        {reaj && <span><i className={s.legReajuste} /> reajuste {c.condicoes.reajusteIndice} em {mesAnoCurto(reaj.slice(0, 7))}</span>}
        <span><i className={s.legAviso} /> aviso prévio a partir de {dataBR(avisoAte)}</span>
      </div>
    </div>
  )
}

/** Spot: o serviço em si (quando, onde, documentos da operação) no lugar da vigência. */
function FaixaSpot({ c }: { c: Contrato }) {
  const f = c.faturas[0]
  return (
    <div className={s.spotFaixa}>
      <div className={s.spotLinha}>
        <span><CalendarRange size={14} /> {dataBR(c.inicio)}</span>
        {c.localServico && <span><MapPin size={14} /> {c.localServico}</span>}
      </div>
      <div className={s.spotDocs}>
        {c.documentos.map((d) => (
          <span key={d.id} className={s.docChip}><FileText size={12} /> {d.nome.replace(/\.(xml|pdf|jpg)$/i, '')}</span>
        ))}
      </div>
      {f && <EtapasFatura situacao={f.situacao} />}
    </div>
  )
}

function EtapasFatura({ situacao }: { situacao: Contrato['faturas'][number]['situacao'] }) {
  const idx = ETAPAS_FATURA.indexOf(situacao === 'atrasada' ? 'boleto-emitido' : situacao)
  return (
    <ol className={s.etapas}>
      {ETAPAS_FATURA.map((e, i) => (
        <li key={e} className={i < idx ? s.etapaFeita : i === idx ? (situacao === 'atrasada' ? s.etapaErro : s.etapaAtual) : ''}>
          <i />
          <span>{i === idx && situacao === 'atrasada' ? 'Em atraso' : ROTULO_SITUACAO_FATURA[e]}</span>
        </li>
      ))}
    </ol>
  )
}

function AbaResumo({ c, hoje, irPara, abrirCentral }: { c: Contrato; hoje: string; irPara: (a: Aba) => void; abrirCentral: () => void }) {
  const mes = hoje.slice(0, 7)
  const doMes = c.faturas.find((f) => f.competencia === mes) ?? c.faturas[c.faturas.length - 1]
  const reaj = proximoReajuste(c, hoje)
  const pend = extrasPendentes(c)
  return (
    <div className={s.resumoGrade}>
      <div>
        <h3 className={s.secTitulo}><History size={15} /> Últimos acontecimentos</h3>
        <LinhaDoTempo c={c} max={5} />
        {c.eventos.length > 5 && (
          <button type="button" className={s.linkBtn} onClick={() => irPara('historico')}>Ver o histórico inteiro</button>
        )}
      </div>
      <div className={s.resumoLado}>
        {doMes && (
          <div className={s.cartao}>
            <h3 className={s.secTitulo}><Receipt size={15} /> Fatura de {mesAnoCurto(doMes.competencia)}</h3>
            <div className={s.faturaMes}>
              <div>
                <div className={s.faturaMesValor}>{formatBRL(totalFatura(doMes))}</div>
                <div className={s.numSub}>
                  {formatBRL(doMes.previsto)} do contrato{doMes.extras ? ` + ${formatBRL(doMes.extras)} de extras` : ''} · vence {dataBR(doMes.vencimento)}
                </div>
              </div>
              <BadgeFatura situacao={doMes.situacao} />
            </div>
            <EtapasFatura situacao={doMes.situacao} />
            <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnBloco}`} onClick={abrirCentral}>
              <Banknote /> Abrir na Central de Faturamento
            </button>
          </div>
        )}
        {c.modalidade === 'recorrente' && (
          <div className={s.cartao}>
            <h3 className={s.secTitulo}><CalendarRange size={15} /> Próximos marcos</h3>
            <ul className={s.marcos}>
              {reaj && (
                <li>
                  <TrendingUp size={14} />
                  <span><b>Reajuste {c.condicoes.reajusteIndice}</b> em {mesAnoCurto(reaj.slice(0, 7))} · aviso para alguém aplicar ({diasEntre(hoje, reaj)} dias)</span>
                </li>
              )}
              <li>
                <RefreshCcw size={14} />
                <span><b>Fim da vigência</b> em {dataBR(c.fim)} · {c.condicoes.renovacaoAutomatica ? 'renova automaticamente' : 'precisa renovar'}; aviso prévio de {c.condicoes.avisoPrevioDias} dias</span>
              </li>
              {pend.length > 0 && (
                <li>
                  <Plus size={14} />
                  <span><b>{pend.length} extra(s)</b> esperando a próxima fatura ({formatBRL(pend.reduce((a, e) => a + valorExtra(e), 0))}) · <button type="button" className={s.linkBtn} onClick={() => irPara('extras')}>ver extras</button></span>
                </li>
              )}
            </ul>
          </div>
        )}
        <div className={s.cartao}>
          <h3 className={s.secTitulo}><FileSignature size={15} /> Origem</h3>
          <div className={s.origem}>
            <span>
              Proposta <b>{c.propostaNumero}</b>, aprovada em {dataBR(c.propostaAprovadaEm)} · responsável {c.responsavel}
            </span>
            <button type="button" className={s.linkBtn} onClick={() => irPara('escopo')}>ver o que foi precificado</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AbaEscopo({ c, hoje }: { c: Contrato; hoje: string }) {
  const vigente = escopoVigente(c, hoje)
  const [versao, setVersao] = useState(vigente.versao)
  const v = c.escopo.find((x) => x.versao === versao) ?? vigente
  const anterior = c.escopo.find((x) => x.versao === versao - 1)
  const novos = new Set(anterior ? v.itens.filter((i) => !anterior.itens.some((a) => a.id === i.id)).map((i) => i.id) : [])
  return (
    <div>
      <div className={s.escopoTopo}>
        <div className={s.versoes} role="group" aria-label="Versão do escopo">
          {c.escopo.map((x) => (
            <button key={x.versao} type="button" className={x.versao === versao ? s.versaoOn : ''} onClick={() => setVersao(x.versao)} title={x.motivo}>
              v{x.versao}{x.versao === vigente.versao ? ' · em vigor' : ''}
            </button>
          ))}
        </div>
        <div className={s.escopoNota}>
          <b>{v.motivo}</b> · desde {dataBR(v.vigenteDesde)}. Retrato do que foi precificado; um aditivo cria a versão seguinte.
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => void avisar({ titulo: 'Registrar aditivo', mensagem: 'O aditivo abre o escopo no Pricing para reprecificar (incluir ou tirar posto, mudar quantidade). Ao aprovar, vira a versão seguinte do escopo a partir da data do aditivo; as faturas daí em diante usam o novo valor.' })}>
          <ScrollText /> Registrar aditivo
        </button>
      </div>
      <div className={ui.tableScroll}>
        <table className={`${ui.table} ${s.tabela}`}>
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Descrição</th>
              <th className={ui.right}>Qtd</th>
              <th className={ui.right}>Preço unit.</th>
              <th className={ui.right}>Custo unit.</th>
              <th className={ui.right}>Total</th>
              <th className={ui.right}>Margem</th>
            </tr>
          </thead>
          <tbody>
            {v.itens.map((i) => {
              const mg = totalItem(i) > 0 ? (totalItem(i) - custoItem(i)) / totalItem(i) : 0
              return (
                <tr key={i.id}>
                  <td className={ui.cellStrong}>{i.servico}</td>
                  <td>
                    {i.descricao}
                    {novos.has(i.id) && <span className={s.novoTag}>novo no aditivo</span>}
                  </td>
                  <td className={ui.right}>{i.quantidade} {i.unidade}</td>
                  <td className={ui.right}>{formatBRL(i.valorUnitario)}</td>
                  <td className={`${ui.right} ${ui.cellMut}`}>{formatBRL(i.custoUnitario)}</td>
                  <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(totalItem(i))}</td>
                  <td className={ui.right}>{formatPct(mg, 1)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>{c.modalidade === 'spot' ? 'Total do serviço' : 'Total mensal'}</td>
              <td className={ui.right}>{formatBRL(totalEscopo(v))}</td>
              <td className={ui.right}>{formatPct(margemPrecificada(v), 1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function Bloco({ titulo, icone: Icone, children, nota }: { titulo: string; icone: typeof Clock; children: ReactNode; nota?: ReactNode }) {
  return (
    <div className={s.cartao}>
      <h3 className={s.secTitulo}><Icone size={15} /> {titulo}</h3>
      <dl className={s.defs}>{children}</dl>
      {nota && <div className={s.defNota}>{nota}</div>}
    </div>
  )
}
const Def = ({ k, v }: { k: string; v: ReactNode }) => (
  <>
    <dt>{k}</dt>
    <dd>{v}</dd>
  </>
)

function AbaCondicoes({ c, hoje }: { c: Contrato; hoje: string }) {
  const k = c.condicoes
  const spot = c.modalidade === 'spot'
  const reaj = proximoReajuste(c, hoje)
  return (
    <div className={s.condGrade}>
      {!spot && (
        <Bloco titulo="Faturamento" icone={Receipt}>
          <Def k="Dia do faturamento" v={`todo dia ${k.diaFaturamento}`} />
          <Def k="O que cobra" v={k.referencia === 'mes-anterior' ? 'o serviço do mês anterior' : 'o serviço do próprio mês'} />
          <Def k="Extras" v="entram na fatura seguinte, salvo os marcados para faturar separado" />
        </Bloco>
      )}
      <Bloco titulo="Vencimento e cobrança" icone={CircleDollarSign}>
        <Def k="Vencimento" v={spot || !k.diaVencimento ? `${k.prazoPagamentoDias} dias após a emissão` : `dia ${k.diaVencimento} · ${k.anteciparFimDeSemana ? 'antecipa' : 'posterga'} em fim de semana e feriado`} />
        <Def k="Forma" v={k.formaCobranca} />
        <Def k="Carteira" v={k.carteira} />
      </Bloco>
      {!spot && (
        <Bloco titulo="Vigência e renovação" icone={CalendarRange}>
          <Def k="Vigência" v={`${dataBR(c.inicio)} a ${dataBR(c.fim)}`} />
          <Def k="Renovação" v={k.renovacaoAutomatica ? 'automática por igual período' : 'manual (precisa de novo contrato ou aditivo)'} />
          <Def k="Aviso prévio" v={`${k.avisoPrevioDias} dias`} />
        </Bloco>
      )}
      {!spot && (
        <Bloco titulo="Reajuste" icone={TrendingUp} nota="Por enquanto o reajuste é só um aviso: alguém confere o índice e aplica (vira um aditivo de preço).">
          <Def k="Índice" v={k.reajusteIndice} />
          <Def k="Mês-base" v={mesAnoCurto(`2000-${String(k.reajusteMesBase).padStart(2, '0')}`).slice(0, 3)} />
          <Def k="Próximo" v={reaj ? mesAnoCurto(reaj.slice(0, 7)) : 'não há dentro da vigência'} />
        </Bloco>
      )}
      <Bloco
        titulo="Nota fiscal"
        icone={FileText}
        nota={
          <span className={s.travado}>
            <Lock size={12} /> Código do serviço, alíquota e retenção vêm do <Link to="/cadastros/servicos">cadastro de serviços</Link>; o contrato só escolhe o serviço e o texto adicional.
          </span>
        }
      >
        <Def k="Serviço" v={c.servicoNfse} />
        <Def k="Tributação" v={c.servicoNfseDetalhe} />
        <Def k="Texto adicional" v={c.textoAdicionalNota || '—'} />
        {!spot && <Def k="Descrição gerada" v={<code className={s.codigo}>Contrato {c.numero} · Ref. {mesAnoCurto(hoje.slice(0, 7))} · Vencto. dia {k.diaVencimento}</code>} />}
      </Bloco>
      {!spot && (
        <Bloco titulo="Rescisão" icone={ScrollText}>
          <Def k="Multa" v={k.multaRescisoria} />
          <Def k="Centro de custo" v={c.centroCusto} />
        </Bloco>
      )}
    </div>
  )
}

function AbaFaturas({ c, abrirCentral }: { c: Contrato; abrirCentral: () => void }) {
  const lista = [...c.faturas].reverse()
  return (
    <div>
      <div className={s.faturasTopo}>
        <span className={s.numSub}>Todas as faturas do contrato. Conferir, emitir NF e boleto é na Central de Faturamento.</span>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={abrirCentral}><Banknote /> Central de Faturamento</button>
      </div>
      <div className={ui.tableScroll}>
        <table className={`${ui.table} ${s.tabela}`}>
          <thead>
            <tr>
              <th>Competência</th>
              <th>Vencimento</th>
              <th className={ui.right}>Contrato</th>
              <th className={ui.right}>Extras</th>
              <th className={ui.right}>Total</th>
              <th>NF</th>
              <th>Boleto</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td className={ui.cellStrong}>{mesAnoCurto(f.competencia)}</td>
                <td>{dataBR(f.vencimento)}</td>
                <td className={ui.right}>{formatBRL(f.previsto)}</td>
                <td className={`${ui.right} ${ui.cellMut}`}>{f.extras ? formatBRL(f.extras) : '—'}</td>
                <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(totalFatura(f))}</td>
                <td className={ui.cellMut}>{f.nf ?? '—'}</td>
                <td className={ui.cellMut}>{f.boleto ?? '—'}</td>
                <td><BadgeFatura situacao={f.situacao} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Faturado (NF emitida)</td>
              <td className={ui.right}>{formatBRL(faturadoNaVigencia(c))}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function AbaExtras({ c, onAtualizar, onLancar }: { c: Contrato; onAtualizar: (e: ExtraContrato) => void; onLancar: (e: ExtraContrato) => void }) {
  const [form, setForm] = useState({ tipo: 'hora-extra' as TipoExtra, descricao: '', quantidade: 1, valorUnitario: 0, cobranca: 'proxima-fatura' as CobrancaExtra })
  const [aberto, setAberto] = useState(false)
  const salvar = () => {
    if (!form.descricao.trim()) return
    onLancar({ id: `n${Date.now()}`, data: hojeISO(), lancadoPor: 'você', ...form, descricao: form.descricao.trim() })
    setForm({ ...form, descricao: '', quantidade: 1, valorUnitario: 0 })
    setAberto(false)
  }
  return (
    <div>
      <div className={s.faturasTopo}>
        <span className={s.numSub}>Horas extras, custos extras e ocorrências do cliente. Cada um diz como cobra; os da próxima fatura entram sozinhos na Central.</span>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => setAberto((a) => !a)}><Plus /> Lançar extra</button>
      </div>
      {aberto && (
        <div className={s.extraForm}>
          <label>
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoExtra })}>
              {Object.entries(ROTULO_EXTRA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className={s.extraDesc}>
            Descrição
            <input autoFocus value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: cobertura de folga na portaria (8h)" />
          </label>
          <label>
            Qtd
            <input type="number" min={0} value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} />
          </label>
          <label>
            Valor unit. (R$)
            <input type="number" min={0} step="0.01" value={form.valorUnitario} onChange={(e) => setForm({ ...form, valorUnitario: Number(e.target.value) })} />
          </label>
          <label>
            Cobrança
            <select value={form.cobranca} onChange={(e) => setForm({ ...form, cobranca: e.target.value as CobrancaExtra })}>
              {Object.entries(ROTULO_COBRANCA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar} disabled={!form.descricao.trim()}>Lançar</button>
        </div>
      )}
      {c.extras.length === 0 ? (
        <div className={s.vazio}>Nenhum extra lançado neste contrato.</div>
      ) : (
        <div className={ui.tableScroll}>
          <table className={`${ui.table} ${s.tabela}`}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th className={ui.right}>Qtd × valor</th>
                <th className={ui.right}>Total</th>
                <th>Cobrança</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {c.extras.map((e) => (
                <tr key={e.id}>
                  <td>{dataBR(e.data)}</td>
                  <td><span className={`${s.badge} ${s.badgeNeutro}`}>{ROTULO_EXTRA[e.tipo]}</span></td>
                  <td>
                    {e.descricao}
                    <div className={s.numSub}>lançado por {e.lancadoPor}</div>
                  </td>
                  <td className={`${ui.right} ${ui.cellMut}`}>{e.tipo === 'ocorrencia' ? '—' : `${e.quantidade} × ${formatBRL(e.valorUnitario)}`}</td>
                  <td className={`${ui.right} ${ui.cellStrong}`}>{e.tipo === 'ocorrencia' ? '—' : formatBRL(valorExtra(e))}</td>
                  <td>
                    {e.faturadoEm ? (
                      <span className={s.mut}>{ROTULO_COBRANCA[e.cobranca]}</span>
                    ) : (
                      <select className={s.selectMini} value={e.cobranca} onChange={(ev) => onAtualizar({ ...e, cobranca: ev.target.value as CobrancaExtra })} aria-label="Como cobrar">
                        {Object.entries(ROTULO_COBRANCA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    {e.faturadoEm ? (
                      <span className={`${s.badge} ${s.fRecebida}`}>Na fatura de {mesAnoCurto(e.faturadoEm)}</span>
                    ) : e.cobranca === 'nao-cobrar' ? (
                      <span className={`${s.badge} ${s.badgeNeutro}`}>Só registro</span>
                    ) : (
                      <span className={`${s.badge} ${s.fConferir}`}>A faturar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AbaDocumentos({ c }: { c: Contrato }) {
  return (
    <div>
      <div className={s.docsGrade}>
        {c.documentos.map((d) => (
          <div key={d.id} className={s.docCard}>
            <span className={`${s.docIcone} ${s[`doc_${d.tipo}`] ?? ''}`}><FileText size={18} /></span>
            <div className={s.docTexto}>
              <b title={d.nome}>{d.nome}</b>
              <span>{dataBR(d.data)} · {d.tamanho}</span>
            </div>
          </div>
        ))}
        <button type="button" className={s.docSoltar} onClick={() => void avisar({ titulo: 'Anexar documento', mensagem: 'Usa os anexos que o sistema já tem (os mesmos de cliente e fornecedor): contrato assinado, aditivos, CT-e, canhoto. No protótipo não grava.' })}>
          <Upload size={18} />
          <span>Anexar contrato, aditivo ou documento da operação</span>
        </button>
      </div>
    </div>
  )
}

function LinhaDoTempo({ c, max }: { c: Contrato; max?: number }) {
  const lista = [...c.eventos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, max)
  return (
    <ol className={s.tempo}>
      {lista.map((e, i) => {
        const Ic = ICONE_EVENTO[e.tipo]
        return (
          <li key={i} className={s[`ev_${e.tipo}`]}>
            <span className={s.tempoIcone}><Ic size={13} /></span>
            <div>
              <div className={s.tempoTexto}>{e.texto}</div>
              <div className={s.numSub}>{dataBR(e.data)} · {e.quem}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
