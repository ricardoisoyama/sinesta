import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Calculator, FilePlus2, FileSignature, Lock, Save, ScrollText, Settings2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { listPropostas, listServicos } from '@/features/cadastros/api'
import { listCarteiras } from '@/features/financeiro/api'
import { carteiraDaEmpresa } from '@/features/financeiro/types'
import { atualizarContrato, criarContrato, daProposta, useContrato, useModelosContrato, useRecarregarContratos, type SalvarContrato } from './api'
import { previaCobranca, ROTULO_REGRA, type ModeloContrato } from './modelos'
import { escopoVigente, hojeISO } from './regras'
import type { ComponenteContrato, CondicoesContrato, Contrato, ItemEscopo } from './types'
import s from './form.module.css'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—')
const proximoMes = (iso: string) => {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const condicoesPadrao = (hoje: string): CondicoesContrato => ({
  faturarDesde: hoje.slice(0, 7), diaFaturamento: 1, referencia: 'mes-anterior', diaVencimento: 10, anteciparFimDeSemana: true, renovacaoAutomatica: true,
  avisoPrevioDias: 60, reajusteIndice: 'IPCA', reajusteMesBase: 1, multaRescisoria: '', carteiraId: '', formaCobranca: 'Boleto com Pix', prazoPagamentoDias: 15,
  agrupamento: 'periodo', fechamento: 'mensal', semNotaFiscal: false, semBoleto: false,
})

/**
 * Cadastro do contrato. Ele nasce de uma proposta aprovada: cliente, empresa, modalidade, o que foi precificado
 * e como cada item é cobrado vêm dela e ficam TRAVADOS (mudam só por aditivo, com outra proposta aprovada do
 * mesmo cliente). O contrato define o que é dele: vigência, fechamento, documentos, reajuste, renovação e cláusulas.
 */
export function ContratoFormPage() {
  const { id } = useParams()
  const contrato = useContrato(id)
  const modelos = useModelosContrato()
  if ((id && !contrato.data) || !modelos.data) return <div className={s.carregando}>{contrato.isError ? 'Contrato não encontrado.' : 'Carregando...'}</div>
  return <Formulario key={id ?? 'novo'} existente={contrato.data?.contratos[0]} modelos={modelos.data} />
}

function Formulario({ existente, modelos }: { existente?: Contrato; modelos: ModeloContrato[] }) {
  const navigate = useNavigate()
  const recarregar = useRecarregarContratos()
  const [params] = useSearchParams()
  const editando = !!existente
  const hoje = hojeISO()
  const ativos = modelos.filter((m) => m.status === 'ativo' || m.id === existente?.modeloId)
  const { data: empresasData } = useEmpresasQuery()
  const { data: servicos } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })
  const { data: carteiras } = useQuery({ queryKey: ['carteiras'], queryFn: listCarteiras })
  const { data: propostasData } = useQuery({ queryKey: ['propostas'], queryFn: listPropostas })
  const aprovadas = (propostasData ?? []).filter((p) => p.status === 'aprovada' && (!existente || p.clienteId === existente.clienteId))

  // A proposta escolhida (no novo) ou a do aditivo (na edição): o servidor diz o que ela leva ao contrato.
  const [propostaId, setPropostaId] = useState(() => (editando ? '' : params.get('proposta') ?? ''))
  const { data: montagem, error: erroMontagem, isFetching: montando } = useQuery({
    queryKey: ['contrato-da-proposta', propostaId],
    queryFn: () => daProposta(propostaId),
    enabled: !!propostaId,
    retry: false,
  })
  const [aplicada, setAplicada] = useState('')

  const [d, setD] = useState(() => ({
    contato: existente?.contato ?? '',
    modeloId: existente?.modeloId ?? '',
    situacao: existente?.situacao ?? 'vigente',
    inicio: existente?.inicio ?? '',
    fim: existente?.fim ?? '',
    local: existente?.localServico ?? '',
    servicoId: existente?.servicoId ?? '',
    textoNota: existente?.textoAdicionalNota ?? '',
    clausulas: existente?.clausulas ?? '',
  }))
  const [cond, setCond] = useState<CondicoesContrato>(() => ({ ...condicoesPadrao(hoje), ...existente?.condicoes }))
  const [aditivo, setAditivo] = useState({ desde: proximoMes(hoje), motivo: '' })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Chegou a montagem da proposta (novo): vigência, serviço e prazo de pagamento vêm dela, uma vez.
  if (!editando && montagem && aplicada !== montagem.propostaId) {
    setAplicada(montagem.propostaId)
    const p = propostasData?.find((x) => x.id === montagem.propostaId)
    setD((x) => ({ ...x, inicio: montagem.inicio || x.inicio || hoje, fim: montagem.fim || x.fim, servicoId: montagem.servicoId || x.servicoId }))
    // A primeira fatura pelo ELROND é a do mês em que a vigência começa (se ainda não passou).
    if (montagem.inicio && montagem.inicio.slice(0, 7) > hoje.slice(0, 7)) setCond((c) => ({ ...c, faturarDesde: montagem.inicio.slice(0, 7) }))
    if (p?.prazoPagamentoDias) setCond((c) => ({ ...c, prazoPagamentoDias: p.prazoPagamentoDias ?? c.prazoPagamentoDias }))
  }

  // O que vale: no novo, o que a proposta leva; na edição, o do contrato (ou o do aditivo, se escolhido).
  const vigente = existente ? escopoVigente(existente, hoje) : undefined
  const usandoProposta = !!montagem && (!editando || !!propostaId)
  const itens: ItemEscopo[] = usandoProposta ? montagem!.itens : vigente?.itens ?? []
  const componentes: ComponenteContrato[] = usandoProposta ? montagem!.componentes : existente?.componentes ?? []
  const empresaId = existente?.empresaId ?? montagem?.empresaId ?? ''
  const spot = (existente?.modalidade ?? montagem?.modalidade) === 'spot'
  const porDocumento = componentes.some((c) => c.regra === 'documento' && c.ativo)
  const empresa = (empresasData ?? []).find((e) => e.id === empresaId)
  const carteirasDaEmpresa = (carteiras ?? []).filter((c) => c.status !== 'inativo' && carteiraDaEmpresa(c, empresaId))
  const previa = previaCobranca(itens, componentes, existente?.caracteristicas ?? {}, true)
  const proposta = propostasData?.find((p) => p.id === (existente?.propostaId || montagem?.propostaId))

  const usarModelo = (m: ModeloContrato | undefined) => {
    setD((x) => ({ ...x, modeloId: m?.id ?? '', clausulas: m && !x.clausulas.trim() ? m.clausulas ?? '' : x.clausulas, servicoId: x.servicoId || m?.servicoId || '' }))
    if (m?.condicoesPadrao) setCond((c) => ({ ...c, ...m.condicoesPadrao, carteiraId: c.carteiraId, faturarDesde: c.faturarDesde }))
  }

  const jaUsada = montagem?.contratoExistente ?? ''
  const faltas = [
    !editando && !propostaId && 'escolher a proposta aprovada',
    !editando && !!jaUsada && `outra proposta (esta já está no contrato ${jaUsada})`,
    editando && !!propostaId && !!jaUsada && `outra proposta para o aditivo (esta já está no contrato ${jaUsada})`,
    !d.inicio && (spot ? 'a data do serviço' : 'o início da vigência'),
    !spot && (!d.fim || d.fim <= d.inicio) && 'um fim de vigência depois do início',
    editando && !!propostaId && !aditivo.desde && 'a data do aditivo',
    !cond.carteiraId && 'a conta que recebe',
  ].filter(Boolean) as string[]

  const salvar = async () => {
    setTentou(true)
    setErro('')
    if (faltas.length || (propostaId && !montagem)) return
    const dados: SalvarContrato = {
      empresaId, clienteId: existente?.clienteId ?? montagem?.clienteId ?? '', modeloId: d.modeloId, modalidade: spot ? 'spot' : 'recorrente',
      inicio: d.inicio, fim: spot ? d.inicio : d.fim, condicoes: cond, itens, contato: d.contato, situacao: spot ? undefined : d.situacao,
      localServico: spot ? d.local : '', servicoId: d.servicoId, textoAdicionalNota: d.textoNota, caracteristicas: existente?.caracteristicas ?? {}, componentes,
      clausulas: d.clausulas,
      ...(editando ? (propostaId ? { aditivoPropostaId: propostaId, aditivoDesde: aditivo.desde, aditivoMotivo: aditivo.motivo } : {}) : { propostaId }),
    }
    setSalvando(true)
    try {
      const c = existente ? await atualizarContrato(existente.id, dados) : await criarContrato(dados)
      await recarregar()
      navigate(`/contratos/${c.id}`)
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }
  const voltar = existente ? `/contratos/${existente.id}` : '/contratos'

  return (
    <div>
      <Link to={voltar} className={s.voltar}><ArrowLeft size={15} /> {existente ? `Pasta ${existente.numero}` : 'Contratos'}</Link>
      <div className={s.cabeca}>
        <div>
          <h1 className={s.titulo}>{existente ? `Editar contrato ${existente.numero}` : 'Novo contrato'}</h1>
          <div className={s.sub}>O contrato nasce de uma proposta aprovada: o que foi precificado vem dela, travado. Aqui ficam a vigência, o faturamento, o reajuste e as cláusulas.</div>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void salvar()} disabled={salvando}><Save /> {salvando ? 'Salvando...' : existente ? 'Salvar alterações' : 'Criar contrato'}</button>
      </div>

      {((tentou && faltas.length > 0) || erro) && (
        <div className={s.faltas} role="alert"><AlertTriangle size={15} /> {erro || `Falta ${faltas.join(', ')}.`}</div>
      )}

      <Secao icone={FileSignature} titulo={editando ? 'Proposta e aditivo' : '1 · Proposta aprovada'}>
        {!editando ? (
          <label className={s.campo}>
            Proposta
            <select value={propostaId} onChange={(e) => setPropostaId(e.target.value)} className={tentou && !propostaId ? s.invalido : ''}>
              <option value="">{aprovadas.length ? 'Escolha a proposta aprovada' : 'Nenhuma proposta aprovada'}</option>
              {aprovadas.map((p) => <option key={p.id} value={p.id}>{p.numero} · {p.cliente} · {p.modalidade === 'recorrente' ? 'recorrente' : 'avulso'} · {formatBRL(p.total)}</option>)}
            </select>
            <small className={s.ajuda}>Sem proposta não tem contrato: precifique no Pricing, gere a proposta e aprove. A cobrança avulsa (reembolso, multa) nasce na Central de Faturamento.</small>
          </label>
        ) : (
          <div className={s.origemAtual}>
            {existente.propostaNumero ? <>Nasceu da proposta <b>{existente.propostaNumero}</b>.</> : <>Contrato anterior ao fluxo por proposta.</>}
            {existente.escopo.filter((v) => v.propostaNumero && v.propostaNumero !== existente.propostaNumero).map((v) => (
              <span key={v.versao}> Aditivo v{v.versao}: proposta <b>{v.propostaNumero}</b> desde {dataBR(v.vigenteDesde)}.</span>
            ))}
          </div>
        )}
        {erroMontagem && <div className={s.faltas}><AlertTriangle size={15} /> {getErrorMessage(erroMontagem)}</div>}
        {montando && <p className={s.mut}>Lendo a proposta...</p>}

        {editando && (
          <div className={s.aditivo}>
            <span>Mudar o que foi precificado é <b>aditivo</b>: escolha outra proposta aprovada de {existente.clienteNome}</span>
            <select value={propostaId} onChange={(e) => setPropostaId(e.target.value)} aria-label="Proposta do aditivo">
              <option value="">Sem aditivo</option>
              {aprovadas.filter((p) => p.id !== existente.propostaId).map((p) => <option key={p.id} value={p.id}>{p.numero} · {formatBRL(p.total)}</option>)}
            </select>
            {propostaId && (
              <>
                <span>valendo a partir de</span>
                <input type="date" value={aditivo.desde} onChange={(e) => setAditivo({ ...aditivo, desde: e.target.value })} aria-label="Vale a partir de" />
                <input value={aditivo.motivo} onChange={(e) => setAditivo({ ...aditivo, motivo: e.target.value })} placeholder="Motivo (ex.: ampliação para 400 posições)" aria-label="Motivo do aditivo" />
                <small>As faturas ainda não emitidas a partir dessa data já usam o escopo novo; as emitidas ficam como foram.</small>
              </>
            )}
          </div>
        )}

        {(existente || montagem) && (
          <div className={s.travado}>
            <div className={s.travadoTopo}>
              <span><Lock size={13} /> {usandoProposta ? `Da proposta ${montagem!.propostaNumero}` : `Do contrato (versão ${vigente?.versao ?? 1})`}</span>
              <span>{existente?.clienteNome ?? montagem?.cliente} · {empresa?.nome ?? '—'} · {spot ? 'Spot (avulso)' : 'Recorrente'}{montagem?.tipoOperacao ? ` · ${montagem.tipoOperacao}` : ''}</span>
            </div>
            <div className={ui.tableScroll}>
              <table className={`${ui.table} ${s.itens}`}>
                <thead>
                  <tr><th>Item</th><th>Como cobra</th><th className={ui.right}>Preço</th><th className={ui.right}>Custo</th></tr>
                </thead>
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.id}>
                      <td>{i.descricao || i.servico}</td>
                      <td className={s.mut}>{i.tabela ? 'Por documento (tabela)' : spot ? 'Uma vez' : 'Todo mês'}</td>
                      <td className={ui.right}>{formatBRL(i.quantidade * i.valorUnitario)}</td>
                      <td className={`${ui.right} ${s.mut}`}>{formatBRL(i.quantidade * i.custoUnitario)}</td>
                    </tr>
                  ))}
                  {componentes.filter((c) => c.regra !== 'documento').map((c) => (
                    <tr key={c.id}>
                      <td>{c.nome}</td>
                      <td className={s.mut}>{ROTULO_REGRA[c.regra]}{c.regra === 'lancamento' ? ` · por ${c.unidade || 'unidade'}` : ''}</td>
                      <td className={ui.right}>{c.regra === 'formula' ? c.formula : formatBRL(c.valorUnitario)}</td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {proposta && (proposta.itens.some((i) => (i.dadosOperacao ?? []).length > 0 || (i.fichas ?? []).length > 0)) && (
              <details className={s.daProposta}>
                <summary>Dados da operação e fichas técnicas da proposta</summary>
                {proposta.itens.map((i) => (
                  <div key={i.id} className={s.daPropostaItem}>
                    <b>{i.descricao}</b>
                    {(i.dadosOperacao ?? []).length > 0 && <div>{(i.dadosOperacao ?? []).map((x) => `${x.nome}: ${x.texto || x.numero}`).join(' · ')}</div>}
                    {(i.fichas ?? []).length > 0 && <div className={s.mut}>{(i.fichas ?? []).map((f) => `${f.grupo ? `${f.grupo} › ` : ''}${f.nome} × ${f.quantidade}`).join(' · ')}</div>}
                  </div>
                ))}
              </details>
            )}
            <div className={s.previa}>
              <h3 className={s.subtitulo}><Calculator size={14} /> Prévia da {spot ? 'cobrança' : 'primeira fatura'}</h3>
              {previa.linhas.map((l) => (
                <div key={`${l.apelido}-${l.nome}-${l.regra}`} className={`${s.previaLinha} ${l.valor === null ? s.previaVar : ''}`}>
                  <span>{l.nome} <small>{l.detalhe}</small></span>
                  <b>{l.valor === null ? 'variável' : formatBRL(l.valor)}</b>
                </div>
              ))}
              <div className={`${s.previaLinha} ${s.previaTotal}`}>
                <span>{porDocumento ? 'Fixo do período (os documentos somam por fora)' : 'Total previsto'}</span>
                <b>{formatBRL(previa.total)}</b>
              </div>
            </div>
          </div>
        )}
      </Secao>

      <Secao icone={Settings2} titulo={`${editando ? '' : '2 · '}Contrato`}>
        <div className={s.grade}>
          <label className={s.campo}>
            Modelo de contrato
            <select value={d.modeloId} onChange={(e) => usarModelo(modelos.find((m) => m.id === e.target.value))}>
              <option value="">Sem modelo</option>
              {ativos.map((m) => <option key={m.id} value={m.id}>{m.nome}{m.tipoOperacao ? ` · ${m.tipoOperacao}` : ''}</option>)}
            </select>
            <small className={s.ajuda}>Traz as cláusulas e as condições padrão (Parametrizações › Modelos de Contrato).</small>
          </label>
          <label className={s.campo}>
            Contato
            <input value={d.contato} onChange={(e) => setD({ ...d, contato: e.target.value })} placeholder="Nome e telefone (vazio = o do cliente)" />
          </label>
          {spot ? (
            <>
              <label className={s.campo}>
                Data do serviço
                <input type="date" value={d.inicio} onChange={(e) => setD({ ...d, inicio: e.target.value })} />
              </label>
              <label className={`${s.campo} ${s.largo}`}>
                Local ou rota
                <input value={d.local} onChange={(e) => setD({ ...d, local: e.target.value })} placeholder="Ex.: Cubatão (SP) → Sorocaba (SP)" />
              </label>
            </>
          ) : (
            <>
              <label className={s.campo}>
                Início da vigência
                <input type="date" value={d.inicio} onChange={(e) => setD({ ...d, inicio: e.target.value })} />
              </label>
              <label className={s.campo}>
                Fim da vigência
                <input type="date" value={d.fim} onChange={(e) => setD({ ...d, fim: e.target.value })} />
              </label>
              <label className={s.check}>
                <input type="checkbox" checked={cond.renovacaoAutomatica} onChange={(e) => setCond({ ...cond, renovacaoAutomatica: e.target.checked })} /> Renova automaticamente
              </label>
              <label className={s.campo}>
                Aviso prévio (dias)
                <input type="number" min={0} value={cond.avisoPrevioDias} onChange={(e) => setCond({ ...cond, avisoPrevioDias: Number(e.target.value) })} />
              </label>
              {editando && (
                <label className={s.campo}>
                  Situação
                  <select value={d.situacao} onChange={(e) => setD({ ...d, situacao: e.target.value as Contrato['situacao'] })}>
                    <option value="vigente">Vigente</option>
                    <option value="suspenso">Suspenso (não gera fatura nova)</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </label>
              )}
            </>
          )}
        </div>
      </Secao>

      <Secao icone={ScrollText} titulo={`${editando ? '' : '3 · '}Faturamento e documentos`}>
        <div className={s.grade}>
          {!spot && (
            <label className={s.campo}>
              Primeira fatura pelo ELROND
              <input type="month" value={cond.faturarDesde} onChange={(e) => setCond({ ...cond, faturarDesde: e.target.value })} />
              <small className={s.ajuda}>As de antes já foram cobradas fora (ex.: na SIIMP) e não entram na Central.</small>
            </label>
          )}
          {!spot && !porDocumento && (
            <>
              <label className={s.campo}>
                Dia do fechamento
                <input type="number" min={1} max={28} value={cond.diaFaturamento} onChange={(e) => setCond({ ...cond, diaFaturamento: Number(e.target.value) })} />
              </label>
              <label className={s.campo}>
                O que a fatura cobra
                <select value={cond.referencia} onChange={(e) => setCond({ ...cond, referencia: e.target.value as CondicoesContrato['referencia'] })}>
                  <option value="mes-anterior">O serviço do mês anterior</option>
                  <option value="mes-atual">O serviço do próprio mês</option>
                </select>
              </label>
              <label className={s.campo}>
                Dia do vencimento
                <input type="number" min={1} max={28} value={cond.diaVencimento} onChange={(e) => setCond({ ...cond, diaVencimento: Number(e.target.value) })} />
              </label>
            </>
          )}
          {porDocumento && (
            <>
              <label className={s.campo}>
                Como fatura os documentos
                <select value={cond.agrupamento} onChange={(e) => setCond({ ...cond, agrupamento: e.target.value as CondicoesContrato['agrupamento'] })}>
                  <option value="periodo">Uma fatura juntando os CT-es do período</option>
                  <option value="por-documento">Uma cobrança por CT-e</option>
                </select>
              </label>
              <label className={s.campo}>
                Fechamento
                <select value={cond.fechamento} onChange={(e) => setCond({ ...cond, fechamento: e.target.value as CondicoesContrato['fechamento'] })} disabled={cond.agrupamento === 'por-documento'}>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </label>
            </>
          )}
          {(spot || porDocumento) && (
            <label className={s.campo}>
              Vence em (dias após o {spot ? 'serviço' : 'fechamento'})
              <input type="number" min={0} value={cond.prazoPagamentoDias} onChange={(e) => setCond({ ...cond, prazoPagamentoDias: Number(e.target.value) })} />
            </label>
          )}
          <div className={`${s.campo} ${s.largo}`}>
            Documentos do fechamento
            <div className={s.documentos}>
              <label className={s.check}><input type="checkbox" checked disabled /> Fatura</label>
              <label className={s.check}><input type="checkbox" checked={!cond.semNotaFiscal} onChange={(e) => setCond({ ...cond, semNotaFiscal: !e.target.checked })} /> Nota fiscal (NFS-e)</label>
              <label className={s.check}><input type="checkbox" checked={!cond.semBoleto} onChange={(e) => setCond({ ...cond, semBoleto: !e.target.checked, formaCobranca: e.target.checked ? 'Boleto com Pix' : cond.formaCobranca.includes('Boleto') ? 'Pix' : cond.formaCobranca })} /> Boleto</label>
            </div>
            <small className={s.ajuda}>Sem nota fiscal: a Central emite só a fatura (locação, reembolso). Sem boleto: recebe por Pix ou transferência.</small>
          </div>
          <label className={s.check}>
            <input type="checkbox" checked={cond.anteciparFimDeSemana} onChange={(e) => setCond({ ...cond, anteciparFimDeSemana: e.target.checked })} /> Vencimento em dia não útil antecipa
          </label>
          <label className={s.campo}>
            Conta que recebe
            <select value={cond.carteiraId} onChange={(e) => setCond({ ...cond, carteiraId: e.target.value })} className={tentou && !cond.carteiraId ? s.invalido : ''}>
              <option value="">{empresaId ? 'Escolha a conta' : 'Escolha a proposta antes'}</option>
              {carteirasDaEmpresa.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label className={s.campo}>
            Forma de cobrança
            <select value={cond.formaCobranca} onChange={(e) => setCond({ ...cond, formaCobranca: e.target.value })}>
              {(cond.semBoleto ? ['Pix', 'Transferência'] : ['Boleto com Pix', 'Boleto']).map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          {!cond.semNotaFiscal && (
            <>
              <label className={s.campo}>
                Serviço da nota fiscal
                <select value={d.servicoId} onChange={(e) => setD({ ...d, servicoId: e.target.value })}>
                  <option value="">Escolha o serviço</option>
                  {(servicos ?? []).filter((x) => x.status !== 'inativo' || x.id === d.servicoId).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </label>
              <label className={`${s.campo} ${s.largo}`}>
                Texto adicional da nota
                <input value={d.textoNota} onChange={(e) => setD({ ...d, textoNota: e.target.value })} placeholder="Ex.: PIX CNPJ 41.627.718/0001-90 · vencimento dia 10" />
              </label>
            </>
          )}
        </div>
      </Secao>

      <Secao icone={FilePlus2} titulo={`${editando ? '' : '4 · '}Reajuste e cláusulas`}>
        <div className={s.grade}>
          {!spot && (
            <>
              <label className={s.campo}>
                Reajuste (aviso)
                <select value={cond.reajusteIndice} onChange={(e) => setCond({ ...cond, reajusteIndice: e.target.value as CondicoesContrato['reajusteIndice'] })}>
                  {['IPCA', 'IGP-M', 'INPC', 'Negociado'].map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className={s.campo}>
                Mês-base do reajuste
                <select value={cond.reajusteMesBase} onChange={(e) => setCond({ ...cond, reajusteMesBase: Number(e.target.value) })}>
                  {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label className={`${s.campo} ${s.largo}`}>
                Multa rescisória
                <input value={cond.multaRescisoria} onChange={(e) => setCond({ ...cond, multaRescisoria: e.target.value })} placeholder="Ex.: 3 mensalidades, proporcional ao tempo restante" />
              </label>
            </>
          )}
          <label className={`${s.campo} ${s.cheio}`}>
            Cláusulas
            <textarea rows={6} value={d.clausulas} onChange={(e) => setD({ ...d, clausulas: e.target.value })} placeholder="As cláusulas do modelo entram aqui; ajuste o que for deste contrato." />
          </label>
        </div>
      </Secao>

      <div className={s.rodape}>
        <Link to={voltar} className={`${ui.btn} ${ui.btnGhost}`}>Cancelar</Link>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void salvar()} disabled={salvando}><Save /> {existente ? 'Salvar alterações' : 'Criar contrato'}</button>
      </div>
    </div>
  )
}

function Secao({ icone: Icone, titulo, nota, children }: { icone: typeof Save; titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className={s.secao}>
      <h2 className={s.secTitulo}><Icone size={15} /> {titulo}</h2>
      {nota && <p className={s.nota}>{nota}</p>}
      {children}
    </section>
  )
}

