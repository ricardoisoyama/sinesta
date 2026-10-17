import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Banknote, CalendarRange, CircleDollarSign, Clock, FileSignature, FileText, FolderOpen, History, Landmark, ListChecks, Lock, MapPin,
  Paperclip, Pencil, Plus, Receipt, RefreshCcw, ScrollText, Settings2, Sparkles, TrendingUp, Truck, Undo2, Wrench,
} from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { avisar } from '@/features/common/dialogo/dialogo'
import { AnexosTab } from '@/features/anexos/AnexosTab'
import { formatBRL, formatCpfCnpj, formatPct } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { alternarComponente, avancarFatura, lancarExtra, mudarCobrancaExtra, salvarDocumento, useContrato, useModelosContrato, useRecarregarContratos } from './api'
import {
  alertasDoContrato, custoItem, dataBR, diasEntre, diasParaFim, ehTabela, ETAPAS_FATURA, escopoVigente, extrasPendentes, hojeISO, margemPrecificada, mesAnoCurto,
  porDocumento as fatPorDocumento, progressoVigencia, proximaFatura, proximoReajuste, ROTULO_SITUACAO_FATURA, situacaoDe, somaDias, totalAReceber, totalEmitido,
  totalEscopo, totalItem, valorContrato, valorExtra,
} from './regras'
import { faturasCentrais, useNomes, type FaturaCentral, type Nomes } from './faturas'
import { ROTULO_REGRA, ROTULO_TIPO_CAMPO, type ModeloContrato } from './modelos'
import type { CobrancaExtra, ComponenteContrato, Contrato, DocumentoVinculado, ExtraContrato, TipoEvento, TipoExtra } from './types'
import { Alertas, BadgeFatura, BadgeModalidade, BadgeSituacao } from './componentes'
import s from './contratos.module.css'

type Aba = 'resumo' | 'caracteristicas' | 'escopo' | 'condicoes' | 'fretes' | 'faturas' | 'extras' | 'documentos' | 'historico'

const ROTULO_EXTRA: Record<TipoExtra, string> = { 'hora-extra': 'Hora extra', 'custo-extra': 'Custo extra', ocorrencia: 'Ocorrência' }
const ROTULO_COBRANCA: Record<CobrancaExtra, string> = { 'proxima-fatura': 'Na próxima fatura', separado: 'Faturar separado', 'nao-cobrar': 'Não cobrar' }
const ICONE_EVENTO: Record<TipoEvento, typeof Clock> = {
  assinatura: FileSignature, fatura: Receipt, aditivo: ScrollText, reajuste: TrendingUp, extra: Plus, ocorrencia: Wrench,
  renovacao: RefreshCcw, documento: Paperclip, encerramento: FolderOpen,
}

/** Pasta do contrato: tudo de um contrato ou spot num lugar só. */
export function PastaContratoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const recarregar = useRecarregarContratos()
  const nomes = useNomes()
  const { data, isLoading, isError } = useContrato(id)
  const { data: modelos } = useModelosContrato()
  const [aba, setAba] = useState<Aba>('resumo')
  const hoje = hojeISO()
  const c = data?.contratos[0]

  if (!c)
    return (
      <div>
        <Link to="/contratos" className={s.voltar}><ArrowLeft size={15} /> Contratos</Link>
        <div className={s.vazio}>{isLoading ? 'Carregando...' : isError ? 'Contrato não encontrado.' : ''}</div>
      </div>
    )

  const faturas = faturasCentrais([c], data!.faturas, nomes)
  const modelo = modelos?.find((m) => m.id === c.modeloId)
  const spot = c.modalidade === 'spot'
  const porDocumento = fatPorDocumento(c)
  const escopo = escopoVigente(c, hoje)
  const pendentes = extrasPendentes(c)
  const devolvidas = faturas.filter((f) => f.situacao === 'devolvida')
  const docsDoMes = c.documentos.filter((d) => d.data.slice(0, 7) === hoje.slice(0, 7) && d.situacao !== 'cancelado')
  const alertas = alertasDoContrato(c, data!.faturas, hoje)
  const prox = proximaFatura(c, data!.faturas)

  /** Toda ação da pasta: chama o servidor, recarrega e mostra o erro, se houver. */
  const acao = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      await recarregar()
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
    }
  }

  const abas: { id: Aba; rotulo: string; icone: typeof Clock; n?: number }[] = [
    { id: 'resumo', rotulo: 'Resumo', icone: Sparkles },
    ...(modelo?.campos.length ? [{ id: 'caracteristicas' as const, rotulo: 'Características', icone: ListChecks }] : []),
    { id: 'escopo', rotulo: porDocumento ? 'Tabela e cobrança' : 'Escopo e cobrança', icone: ScrollText },
    { id: 'condicoes', rotulo: 'Condições', icone: Settings2 },
    ...(porDocumento || spot ? [{ id: 'fretes' as const, rotulo: porDocumento ? 'Fretes' : 'Documentos da operação', icone: Truck, n: c.documentos.length }] : []),
    { id: 'faturas', rotulo: spot ? 'Fatura' : 'Faturas', icone: Receipt, n: spot ? undefined : faturas.length },
    ...(spot ? [] : [{ id: 'extras' as const, rotulo: 'Extras', icone: Plus, n: pendentes.length || undefined }]),
    { id: 'documentos', rotulo: 'Anexos', icone: Paperclip },
    { id: 'historico', rotulo: 'Histórico', icone: History },
  ]

  return (
    <div>
      <Link to="/contratos" className={s.voltar}><ArrowLeft size={15} /> Contratos</Link>

      {devolvidas.map((f) => (
        <div key={f.id} className={s.devolvida} role="alert">
          <Undo2 size={16} />
          <div className={s.devolvidaTexto}>
            <b>A conferência devolveu a fatura {f.referencia}:</b> {f.motivo}
            <span>Ajuste aqui no contrato (extras, componentes, escopo). A fatura ainda não foi emitida, então ela já se recalcula: agora está em {formatBRL(f.total)}.</span>
          </div>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void acao(() => avancarFatura(f.id, 'reenviar'))}><RefreshCcw /> Atualizar e reenviar para conferência</button>
        </div>
      ))}

      {/* ── capa da pasta ── */}
      <div className={s.pasta}>
        <div className={s.orelha}>
          <FolderOpen size={14} /> {c.numero}
        </div>
        <section className={s.capa}>
          <div className={s.capaTopo}>
            <div className={s.capaQuem}>
              <h1 className={s.capaCliente}>{c.clienteNome}</h1>
              <div className={s.capaSub}>{c.clienteDocumento ? formatCpfCnpj(c.clienteDocumento) : 'sem documento'}{c.contato ? ` · ${c.contato}` : ''}</div>
              <div className={s.capaChips}>
                <BadgeModalidade modalidade={c.modalidade} />
                {c.tipoOperacao && <span className={`${s.badge} ${s.badgeNeutro}`}>{c.tipoOperacao}</span>}
                {modelo && <span className={`${s.badge} ${s.badgeNeutro}`}>Modelo: {modelo.nome}</span>}
                <span className={`${s.badge} ${s.badgeNeutro}`}><Landmark size={12} /> {nomes.empresa(c.empresaId)}</span>
                <BadgeSituacao situacao={situacaoDe(c, data!.faturas)} />
                {alertas.length > 0 && <Alertas alertas={alertas} />}
              </div>
            </div>
            <div className={s.capaValor}>
              {porDocumento ? (
                <>
                  <div className={s.capaValorNum}>{formatBRL(docsDoMes.reduce((a, d) => a + d.valor, 0))}</div>
                  <div className={s.capaValorSub}>em fretes neste mês · {docsDoMes.length} CT-e(s)</div>
                </>
              ) : (
                <>
                  <div className={s.capaValorNum}>{formatBRL(valorContrato(c, hoje))}</div>
                  <div className={s.capaValorSub}>{spot ? 'valor do serviço' : 'por mês'}</div>
                </>
              )}
              <div className={s.capaBotoes}>
                {prox && <span className={s.capaProx}><CalendarRange size={13} /> próxima fatura {prox.referencia} · vence {dataBR(prox.vencimento)}</span>}
                <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnCompacto}`} onClick={() => navigate(`/contratos/${c.id}/editar`)}><Pencil /> Editar</button>
              </div>
            </div>
          </div>

          {spot ? <FaixaSpot c={c} fatura={faturas.find((f) => !f.avulsa)} /> : <LinhaVigencia c={c} hoje={hoje} />}

          <div className={s.capaNumeros}>
            <Numero rotulo={spot ? 'Faturado' : 'Faturado na vigência'} valor={formatBRL(totalEmitido(faturas))} sub={`${faturas.filter((f) => f.travada).length} fatura(s) emitida(s)`} />
            <Numero rotulo="A receber" valor={formatBRL(totalAReceber(faturas))} sub={faturas.some((f) => f.situacao === 'atrasada') ? 'tem fatura em atraso' : 'em dia'} alerta={faturas.some((f) => f.situacao === 'atrasada')} />
            <Numero rotulo={porDocumento ? 'Margem da tabela' : 'Margem precificada'} valor={formatPct(margemPrecificada(escopo), 1)} sub="preço − custo do escopo em vigor" />
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
        {aba === 'resumo' && <AbaResumo c={c} hoje={hoje} faturas={faturas} irPara={setAba} abrirCentral={() => navigate(`/financeiro/faturamento?contrato=${c.id}&mes=${(prox ?? faturas[faturas.length - 1])?.competencia ?? hoje.slice(0, 7)}`)} />}
        {aba === 'caracteristicas' && modelo && <AbaCaracteristicas c={c} modelo={modelo} onEditar={() => navigate(`/contratos/${c.id}/editar`)} />}
        {aba === 'escopo' && <AbaEscopo c={c} hoje={hoje} onAlternar={(comp) => void acao(() => alternarComponente(c.id, comp.id))} onAditivo={() => navigate(`/contratos/${c.id}/editar`)} />}
        {aba === 'condicoes' && <AbaCondicoes c={c} hoje={hoje} nomes={nomes} />}
        {aba === 'fretes' && <AbaFretes c={c} faturas={faturas} onSalvar={(d) => acao(() => salvarDocumento(c.id, d))} />}
        {aba === 'faturas' && <AbaFaturas faturas={faturas} abrirCentral={(comp) => navigate(`/financeiro/faturamento?contrato=${c.id}&mes=${comp}`)} />}
        {aba === 'extras' && <AbaExtras c={c} onCobranca={(e, cobranca) => void acao(() => mudarCobrancaExtra(c.id, e.id, cobranca))} onLancar={(e) => acao(() => lancarExtra(c.id, e))} />}
        {aba === 'documentos' && <AnexosTab entidade="contrato" entidadeId={c.id} />}
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
  const avisoAte = somaDias(c.fim, -c.condicoes.avisoPrevioDias)
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
function FaixaSpot({ c, fatura }: { c: Contrato; fatura?: FaturaCentral }) {
  return (
    <div className={s.spotFaixa}>
      <div className={s.spotLinha}>
        <span><CalendarRange size={14} /> {dataBR(c.inicio)}</span>
        {c.localServico && <span><MapPin size={14} /> {c.localServico}</span>}
      </div>
      {c.documentos.length > 0 && (
        <div className={s.spotDocs}>
          {c.documentos.map((d) => <span key={d.id} className={s.docChip}><FileText size={12} /> {d.tipo} {d.numero}</span>)}
        </div>
      )}
      {fatura && <EtapasFatura situacao={fatura.situacao} />}
    </div>
  )
}

function EtapasFatura({ situacao }: { situacao: FaturaCentral['situacao'] }) {
  const especial = situacao === 'atrasada' || situacao === 'devolvida'
  const idx = ETAPAS_FATURA.indexOf(situacao === 'atrasada' ? 'boleto-emitido' : especial ? 'a-conferir' : situacao)
  return (
    <ol className={s.etapas}>
      {ETAPAS_FATURA.map((e, i) => (
        <li key={e} className={i < idx ? s.etapaFeita : i === idx ? (especial ? s.etapaErro : s.etapaAtual) : ''}>
          <i />
          <span>{i === idx && especial ? ROTULO_SITUACAO_FATURA[situacao] : ROTULO_SITUACAO_FATURA[e]}</span>
        </li>
      ))}
    </ol>
  )
}

function AbaResumo({ c, hoje, faturas, irPara, abrirCentral }: { c: Contrato; hoje: string; faturas: FaturaCentral[]; irPara: (a: Aba) => void; abrirCentral: () => void }) {
  const mes = hoje.slice(0, 7)
  const abertas = faturas.filter((f) => !f.travada && !f.avulsa)
  const doMes = abertas[0] ?? [...faturas].sort((a, b) => b.vencimento.localeCompare(a.vencimento))[0]
  const reaj = proximoReajuste(c, hoje)
  const pend = extrasPendentes(c)
  return (
    <div className={s.resumoGrade}>
      <div>
        <h3 className={s.secTitulo}><History size={15} /> Últimos acontecimentos</h3>
        <LinhaDoTempo c={c} max={5} />
        {c.eventos.length > 5 && <button type="button" className={s.linkBtn} onClick={() => irPara('historico')}>Ver o histórico inteiro</button>}
      </div>
      <div className={s.resumoLado}>
        {doMes ? (
          <div className={s.cartao}>
            <h3 className={s.secTitulo}><Receipt size={15} /> Fatura · {doMes.referencia}</h3>
            <div className={s.faturaMes}>
              <div>
                <div className={s.faturaMesValor}>{formatBRL(doMes.total)}</div>
                <div className={s.numSub}>
                  {formatBRL(doMes.previsto)} {doMes.documentos.length ? `em ${doMes.documentos.length} CT-e(s)` : 'do contrato'}
                  {doMes.extras.length ? ` + ${formatBRL(doMes.extras.reduce((a, e) => a + valorExtra(e), 0))} de extras` : ''} · vence {dataBR(doMes.vencimento)}
                </div>
              </div>
              <BadgeFatura situacao={doMes.situacao} />
            </div>
            <EtapasFatura situacao={doMes.situacao} />
            <div className={s.numSub} style={{ marginTop: 10 }}>{doMes.travada ? 'NF registrada: esta fatura não muda mais.' : 'Ainda não emitida: muda junto com o contrato (extras, componentes).'}</div>
            <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnBloco}`} onClick={abrirCentral}><Banknote /> Abrir na Central de Faturamento</button>
          </div>
        ) : (
          <div className={s.cartao}>
            <h3 className={s.secTitulo}><Receipt size={15} /> Faturas</h3>
            <div className={s.numSub}>Nenhuma fatura ainda: a primeira aparece a partir de {mesAnoCurto(c.condicoes.faturarDesde || mes)}{fatPorDocumento(c) ? ', quando houver frete vinculado' : ''}.</div>
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
              {c.propostaNumero ? <>Proposta <b>{c.propostaNumero}</b></> : <>Lançado direto (sem proposta)</>} · cadastrado em {dataBR(c.criadoEm.slice(0, 10))} por {c.criadoPor || '—'}
            </span>
            <button type="button" className={s.linkBtn} onClick={() => irPara('escopo')}>ver o que foi precificado</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AbaCaracteristicas({ c, modelo, onEditar }: { c: Contrato; modelo: ModeloContrato; onEditar: () => void }) {
  const mostrar = (k: string, tipo: string) => {
    const x = c.caracteristicas[k]
    if (x === undefined || x === '') return <span className={s.mut}>—</span>
    if (tipo === 'percentual' && typeof x === 'number') return formatPct(x, 2)
    if (tipo === 'valor' && typeof x === 'number') return formatBRL(x)
    if (tipo === 'data' && typeof x === 'string') return dataBR(x)
    return String(x)
  }
  return (
    <div>
      <div className={s.faturasTopo}>
        <span className={s.numSub}>Campos do modelo <b>{modelo.nome}</b>. Cada cliente monta os seus em Parametrizações › Modelos de Contrato; o apelido é o que as fórmulas usam.</span>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onEditar}><Pencil /> Editar</button>
      </div>
      <div className={s.caracGrade}>
        {modelo.campos.map((campo) => (
          <div key={campo.id} className={s.caracItem}>
            <span className={s.caracNome}>{campo.nome}{campo.obrigatorio ? ' *' : ''}</span>
            <span className={s.caracValor}>{mostrar(campo.apelido, campo.tipo)}</span>
            <code className={s.apelido}>{campo.apelido} · {ROTULO_TIPO_CAMPO[campo.tipo]}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

function AbaEscopo({ c, hoje, onAlternar, onAditivo }: { c: Contrato; hoje: string; onAlternar: (comp: ComponenteContrato) => void; onAditivo: () => void }) {
  const vigente = escopoVigente(c, hoje)
  const [versao, setVersao] = useState(vigente.versao)
  const v = c.escopo.find((x) => x.versao === versao) ?? vigente
  const anterior = c.escopo.find((x) => x.versao === versao - 1)
  const novos = new Set(anterior ? v.itens.filter((i) => !anterior.itens.some((a) => a.id === i.id)).map((i) => i.id) : [])
  const tabela = ehTabela(v)
  const outros = c.componentes.filter((x) => x.regra !== 'fixo')
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
          <b>{v.motivo}</b> · desde {dataBR(v.vigenteDesde)}. {tabela ? 'Tabela de preços: cada frete (CT-e) sai com o preço da rota.' : 'Retrato do que foi precificado; um aditivo cria a versão seguinte.'}
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onAditivo} title="No cadastro, mudar o escopo pede a data do aditivo e cria a versão seguinte">
          <ScrollText /> Registrar aditivo
        </button>
      </div>
      <h3 className={s.secTitulo}>{tabela ? 'Tabela de fretes' : 'Mensalidade (componentes fixos)'}</h3>
      <div className={ui.tableScroll}>
        <table className={`${ui.table} ${s.tabela}`}>
          <thead>
            <tr>
              <th>Componente</th>
              <th>Descrição</th>
              <th className={ui.right}>{tabela ? 'Unidade' : 'Qtd'}</th>
              <th className={ui.right}>Preço unit.</th>
              <th className={ui.right}>Custo unit.</th>
              {!tabela && <th className={ui.right}>Total</th>}
              <th className={ui.right}>Margem</th>
            </tr>
          </thead>
          <tbody>
            {v.itens.map((i) => {
              const mg = totalItem(i) > 0 ? (totalItem(i) - custoItem(i)) / totalItem(i) : 0
              return (
                <tr key={i.id}>
                  <td>
                    <span className={ui.cellStrong}>{i.servico}</span>
                    {i.apelido && <code className={s.apelidoInline}>{i.apelido}</code>}
                  </td>
                  <td>
                    {i.descricao}
                    {novos.has(i.id) && <span className={s.novoTag}>novo no aditivo</span>}
                  </td>
                  <td className={ui.right}>{tabela ? i.unidade : `${i.quantidade} ${i.unidade}`}</td>
                  <td className={ui.right}>{formatBRL(i.valorUnitario)}</td>
                  <td className={`${ui.right} ${ui.cellMut}`}>{formatBRL(i.custoUnitario)}</td>
                  {!tabela && <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(totalItem(i))}</td>}
                  <td className={ui.right}>{formatPct(mg, 1)}</td>
                </tr>
              )
            })}
          </tbody>
          {!tabela && (
            <tfoot>
              <tr>
                <td colSpan={5}>{c.modalidade === 'spot' ? 'Total do serviço' : 'Total mensal fixo'}</td>
                <td className={ui.right}>{formatBRL(totalEscopo(v))}</td>
                <td className={ui.right}>{formatPct(margemPrecificada(v), 1)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {outros.length > 0 && (
        <>
          <h3 className={s.secTitulo} style={{ marginTop: 20 }}>Outros componentes de cobrança</h3>
          <div className={s.componentes}>
            {outros.map((x) => (
              <div key={x.id} className={`${s.componente} ${x.ativo ? '' : s.componenteOff}`}>
                <label className={s.chave} title={x.ativo ? 'Desligar neste contrato' : 'Ligar neste contrato'}>
                  <input type="checkbox" checked={x.ativo} onChange={() => onAlternar(x)} />
                  <span />
                </label>
                <div className={s.componenteTexto}>
                  <b>{x.nome} <code className={s.apelidoInline}>{x.apelido}</code></b>
                  <span>
                    {ROTULO_REGRA[x.regra]}
                    {x.regra === 'formula' && <> · <code className={s.codigoMini}>{x.formula}</code></>}
                    {x.regra === 'lancamento' && ` · ${formatBRL(x.valorUnitario)} por ${x.unidade || 'unidade'}, lançado em Extras`}
                    {x.regra === 'documento' && ` · soma dos ${x.documento || 'documentos'} vinculados do período`}
                    {x.regra === 'unico' && ` · ${formatBRL(x.quantidade * x.valorUnitario)} na primeira fatura`}
                  </span>
                </div>
                <span className={s.componenteEstado}>{x.ativo ? 'cobra' : 'não cobra'}</span>
              </div>
            ))}
          </div>
          <div className={s.defNota}>Ligar ou desligar aqui muda as faturas ainda não emitidas na hora (veja na Central). As já emitidas ficam como foram.</div>
        </>
      )}
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

function AbaCondicoes({ c, hoje, nomes }: { c: Contrato; hoje: string; nomes: Nomes }) {
  const k = c.condicoes
  const spot = c.modalidade === 'spot'
  const porDocumento = fatPorDocumento(c)
  const reaj = proximoReajuste(c, hoje)
  return (
    <div className={s.condGrade}>
      {!spot && (
        <Bloco titulo="Faturamento" icone={Receipt}>
          <Def k="Primeira fatura pelo ELROND" v={k.faturarDesde ? mesAnoCurto(k.faturarDesde) : '—'} />
          {porDocumento ? (
            <>
              <Def k="Como fatura" v={k.agrupamento === 'por-documento' ? 'uma cobrança por CT-e' : 'uma fatura juntando os CT-es do período'} />
              <Def k="Fechamento" v={k.fechamento === 'quinzenal' ? 'por quinzena (1 a 15 e 16 ao fim)' : k.fechamento === 'semanal' ? 'por semana' : 'mensal'} />
            </>
          ) : (
            <>
              <Def k="Dia do faturamento" v={`todo dia ${k.diaFaturamento}`} />
              <Def k="O que cobra" v={k.referencia === 'mes-anterior' ? 'o serviço do mês anterior' : 'o serviço do próprio mês'} />
            </>
          )}
          <Def k="Extras" v="entram na fatura do mês do serviço, salvo os marcados para faturar separado" />
        </Bloco>
      )}
      <Bloco titulo="Vencimento e cobrança" icone={CircleDollarSign}>
        <Def k="Vencimento" v={spot || porDocumento ? `${k.prazoPagamentoDias} dias após o ${spot ? 'serviço' : 'fechamento'}` : `dia ${k.diaVencimento}`} />
        <Def k="Fim de semana" v={k.anteciparFimDeSemana ? 'antecipa para sexta' : 'adia para segunda'} />
        <Def k="Forma" v={k.formaCobranca} />
        <Def k="Conta que recebe" v={nomes.carteira(k.carteiraId)} />
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
        nota={<span className={s.travado}><Lock size={12} /> Código municipal, alíquota e retenção ficam com o serviço (entram com a emissão de NFS-e pela Central); o contrato só escolhe o serviço e o texto adicional.</span>}
      >
        <Def k="Serviço" v={nomes.servico(c.servicoId)} />
        <Def k="Texto adicional" v={c.textoAdicionalNota || '—'} />
      </Bloco>
      {!spot && k.multaRescisoria && (
        <Bloco titulo="Rescisão" icone={ScrollText}>
          <Def k="Multa" v={k.multaRescisoria} />
        </Bloco>
      )}
    </div>
  )
}

const DOC_VAZIO = { numero: '', data: '', descricao: '', valor: 0, mdfe: '' }

/** Fretes (documentos da operação) vinculados: cada viagem com o seu CT-e, MDF-e e canhoto. */
function AbaFretes({ c, faturas, onSalvar }: { c: Contrato; faturas: FaturaCentral[]; onSalvar: (d: DocumentoVinculado) => Promise<void> }) {
  const docs = [...c.documentos].sort((a, b) => b.data.localeCompare(a.data))
  const faturaDe = (id: string) => faturas.find((f) => f.documentos.some((d) => d.id === id))
  const [form, setForm] = useState({ ...DOC_VAZIO, data: hojeISO() })
  const [aberto, setAberto] = useState(false)
  const incluir = async () => {
    await onSalvar({ id: '', tipo: 'CT-e', canhoto: false, situacao: 'entregue', ...form, numero: form.numero.trim() })
    setForm({ ...DOC_VAZIO, data: form.data })
    setAberto(false)
  }
  return (
    <div>
      <div className={s.faturasTopo}>
        <span className={s.numSub}>Cada viagem com os seus documentos. Por enquanto o CT-e é incluído aqui; a busca automática na SIIMP (CT-es do cliente ainda sem fatura) vem na próxima etapa.</span>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => setAberto((a) => !a)}><Plus /> Incluir CT-e</button>
      </div>
      {aberto && (
        <div className={s.extraForm}>
          <label>Número do CT-e<input autoFocus value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></label>
          <label>Data<input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
          <label className={s.extraDesc}>Rota / carga<input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Santos → Jaguaré · Truck" /></label>
          <label>MDF-e<input value={form.mdfe} onChange={(e) => setForm({ ...form, mdfe: e.target.value })} placeholder="opcional" /></label>
          <label>Valor (R$)<input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></label>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!form.numero.trim() || !form.data} onClick={() => void incluir()}>Incluir</button>
        </div>
      )}
      {docs.length === 0 ? (
        <div className={s.vazio}>Nenhum CT-e vinculado ainda.</div>
      ) : (
        <div className={ui.tableScroll}>
          <table className={`${ui.table} ${s.tabela}`}>
            <thead>
              <tr>
                <th>Data</th>
                <th>CT-e</th>
                <th>Rota / carga</th>
                <th>MDF-e</th>
                <th>Canhoto</th>
                <th className={ui.right}>Valor</th>
                <th>Situação</th>
                <th>Fatura</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const f = faturaDe(d.id)
                const travado = !!f?.travada
                return (
                  <tr key={d.id}>
                    <td>{dataBR(d.data)}</td>
                    <td className={ui.cellStrong}>{d.tipo} {d.numero}</td>
                    <td>{d.descricao || '—'}</td>
                    <td className={ui.cellMut}>{d.mdfe || '—'}</td>
                    <td>
                      <button type="button" className={`${s.badge} ${d.canhoto ? s.fRecebida : s.fConferir} ${s.badgeBotao}`} onClick={() => void onSalvar({ ...d, canhoto: !d.canhoto })} title="Marcar ou desmarcar o canhoto">
                        {d.canhoto ? 'ok' : 'falta'}
                      </button>
                    </td>
                    <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(d.valor)}</td>
                    <td>
                      <select className={s.selectMini} value={d.situacao} disabled={travado} onChange={(e) => void onSalvar({ ...d, situacao: e.target.value as DocumentoVinculado['situacao'] })} aria-label="Situação do CT-e">
                        <option value="em-transito">Em trânsito</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td>{f ? <span className={s.faturaRef}>{f.referencia} · <BadgeFatura situacao={f.situacao} /></span> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AbaFaturas({ faturas, abrirCentral }: { faturas: FaturaCentral[]; abrirCentral: (competencia: string) => void }) {
  const lista = [...faturas].sort((a, b) => b.competencia.localeCompare(a.competencia) || b.referencia.localeCompare(a.referencia))
  if (lista.length === 0) return <div className={s.vazio}>Nenhuma fatura ainda.</div>
  return (
    <div>
      <div className={s.faturasTopo}>
        <span className={s.numSub}>O histórico de faturas e notas do contrato. Conferir, registrar NF e boleto é na Central de Faturamento (clique na linha).</span>
      </div>
      <div className={ui.tableScroll}>
        <table className={`${ui.table} ${s.tabela} ${s.tabelaClicavel}`}>
          <thead>
            <tr>
              <th>Referência</th>
              <th>Vencimento</th>
              <th className={ui.right}>Contrato / fretes</th>
              <th className={ui.right}>Extras</th>
              <th className={ui.right}>Total</th>
              <th>NF / documento</th>
              <th>Boleto</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} onClick={() => abrirCentral(f.competencia)} title="Abrir na Central de Faturamento">
                <td className={ui.cellStrong}>{f.avulsa ? `Extra · ${f.descricao}` : f.referencia}</td>
                <td>{dataBR(f.vencimento)}</td>
                <td className={ui.right}>{formatBRL(f.previsto)}</td>
                <td className={`${ui.right} ${ui.cellMut}`}>{f.extras.length ? formatBRL(f.extras.reduce((a, e) => a + valorExtra(e), 0)) : '—'}</td>
                <td className={`${ui.right} ${ui.cellStrong}`}>{formatBRL(f.total)}</td>
                <td className={ui.cellMut}>{f.nf ? (f.documentoDaOperacao ? f.nf : `NF ${f.nf}`) : '—'}</td>
                <td className={ui.cellMut}>{f.boleto || '—'}</td>
                <td><BadgeFatura situacao={f.situacao} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Emitido (NF ou documento)</td>
              <td className={ui.right}>{formatBRL(totalEmitido(faturas))}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

type NovoExtra = Omit<ExtraContrato, 'id' | 'faturadoEm' | 'lancadoPor'>

function AbaExtras({ c, onCobranca, onLancar }: { c: Contrato; onCobranca: (e: ExtraContrato, cobranca: CobrancaExtra) => void; onLancar: (e: NovoExtra) => Promise<void> }) {
  const lancaveis = c.componentes.filter((x) => x.regra === 'lancamento' && x.ativo)
  const vazio = { componente: lancaveis[0]?.apelido ?? '', tipo: 'hora-extra' as TipoExtra, descricao: '', data: hojeISO(), quantidade: 1, valorUnitario: lancaveis[0]?.valorUnitario ?? 0, cobranca: 'proxima-fatura' as CobrancaExtra }
  const [form, setForm] = useState(vazio)
  const [aberto, setAberto] = useState(false)
  const escolherComponente = (apelido: string) => {
    const comp = lancaveis.find((x) => x.apelido === apelido)
    setForm({ ...form, componente: apelido, valorUnitario: comp?.valorUnitario ?? form.valorUnitario, tipo: comp && /hora|di[aá]ria/i.test(comp.unidade) ? 'hora-extra' : 'custo-extra' })
  }
  const salvar = async () => {
    if (!form.descricao.trim()) return
    const comp = lancaveis.find((x) => x.apelido === form.componente)
    await onLancar({ data: form.data, tipo: form.tipo, descricao: comp ? `${comp.nome}: ${form.descricao.trim()}` : form.descricao.trim(), quantidade: form.quantidade, valorUnitario: form.valorUnitario, cobranca: form.cobranca })
    setForm(vazio)
    setAberto(false)
  }
  return (
    <div>
      <div className={s.faturasTopo}>
        <span className={s.numSub}>Lançamentos do contrato (horas extras, custos extras, ocorrências). Os "na próxima fatura" entram sozinhos na fatura ainda não emitida do mês do serviço.</span>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => setAberto((a) => !a)}><Plus /> Lançar extra</button>
      </div>
      {aberto && (
        <div className={s.extraForm}>
          {lancaveis.length > 0 && (
            <label>
              Componente
              <select value={form.componente} onChange={(e) => escolherComponente(e.target.value)}>
                {lancaveis.map((x) => <option key={x.apelido} value={x.apelido}>{x.nome}</option>)}
                <option value="">Outro (avulso)</option>
              </select>
            </label>
          )}
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
            Data
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
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
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void salvar()} disabled={!form.descricao.trim()}>Lançar</button>
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
                      <select className={s.selectMini} value={e.cobranca} onChange={(ev) => onCobranca(e, ev.target.value as CobrancaExtra)} aria-label="Como cobrar">
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

const quando = (iso: string) => (iso.length > 10 ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : dataBR(iso))

function LinhaDoTempo({ c, max }: { c: Contrato; max?: number }) {
  const lista = [...c.eventos].sort((a, b) => b.em.localeCompare(a.em)).slice(0, max)
  if (lista.length === 0) return <div className={s.numSub}>Nada registrado ainda.</div>
  return (
    <ol className={s.tempo}>
      {lista.map((e, i) => {
        const Ic = ICONE_EVENTO[e.tipo] ?? Clock
        return (
          <li key={i} className={s[`ev_${e.tipo}`]}>
            <span className={s.tempoIcone}><Ic size={13} /></span>
            <div>
              <div className={s.tempoTexto}>{e.texto}</div>
              <div className={s.numSub}>{quando(e.em)} · {e.quem}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
