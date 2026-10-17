import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Calculator, FilePlus2, FileSignature, ListChecks, Plus, Save, ScrollText, Settings2, Trash2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { listClientes, listPropostas, listServicos } from '@/features/cadastros/api'
import { listCarteiras } from '@/features/financeiro/api'
import { carteiraDaEmpresa } from '@/features/financeiro/types'
import { ClienteAutocomplete } from '@/features/parceiros/ClienteAutocomplete'
import type { Proposta } from '@/features/propostas/types'
import { atualizarContrato, criarContrato, useContrato, useModelosContrato, useRecarregarContratos, type SalvarContrato } from './api'
import { componenteDoModelo, previaCobranca, ROTULO_REGRA, type CampoModelo, type ModeloContrato } from './modelos'
import { escopoVigente, hojeISO } from './regras'
import type { ComponenteContrato, CondicoesContrato, Contrato, ItemEscopo, Modalidade } from './types'
import s from './form.module.css'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const r2 = (v: number) => Math.round(v * 100) / 100
const proximoMes = (iso: string) => {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const umAnoDepois = (iso: string) => {
  const d = new Date(Number(iso.slice(0, 4)) + 1, Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const condicoesPadrao = (hoje: string): CondicoesContrato => ({
  faturarDesde: hoje.slice(0, 7), diaFaturamento: 1, referencia: 'mes-anterior', diaVencimento: 10, anteciparFimDeSemana: true, renovacaoAutomatica: true,
  avisoPrevioDias: 60, reajusteIndice: 'IPCA', reajusteMesBase: 1, multaRescisoria: '', carteiraId: '', formaCobranca: 'Boleto com Pix', prazoPagamentoDias: 15,
  agrupamento: 'periodo', fechamento: 'mensal',
})

/** Cadastro do contrato: parte fixa + características e componentes do modelo. Espera os dados para abrir já preenchido. */
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
  const { data: clientes } = useQuery({ queryKey: ['clientes'], queryFn: listClientes })
  const { data: servicos } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })
  const { data: carteiras } = useQuery({ queryKey: ['carteiras'], queryFn: listCarteiras })
  const { data: propostasData } = useQuery({ queryKey: ['propostas'], queryFn: listPropostas, enabled: !editando })
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo' || e.id === existente?.empresaId)
  const aprovadas = (propostasData ?? []).filter((p) => p.status === 'aprovada')

  const [origem, setOrigem] = useState<'proposta' | 'branco'>(editando ? 'branco' : 'proposta')
  const [propostaId, setPropostaId] = useState('')
  const [d, setD] = useState(() => ({
    clienteId: existente?.clienteId ?? '',
    clienteTexto: existente?.clienteNome ?? '',
    contato: existente?.contato ?? '',
    empresaId: existente?.empresaId ?? '',
    modeloId: existente?.modeloId ?? ativos[0]?.id ?? '',
    modalidade: existente?.modalidade ?? ('recorrente' as Modalidade),
    situacao: existente?.situacao ?? 'vigente',
    inicio: existente?.inicio ?? proximoMes(hoje),
    fim: existente?.fim ?? umAnoDepois(proximoMes(hoje)),
    local: existente?.localServico ?? '',
    servicoId: existente?.servicoId ?? ativos[0]?.servicoId ?? '',
    textoNota: existente?.textoAdicionalNota ?? '',
  }))
  const [cond, setCond] = useState<CondicoesContrato>(existente?.condicoes ?? condicoesPadrao(hoje))
  const [carac, setCarac] = useState<Record<string, string | number>>(existente?.caracteristicas ?? {})
  const [itens, setItens] = useState<ItemEscopo[]>(() => (existente ? escopoVigente(existente, hoje).itens : []))
  const [componentes, setComponentes] = useState<ComponenteContrato[]>(() => existente?.componentes ?? (ativos[0] ? ativos[0].componentes.filter((c) => c.regra !== 'fixo').map(componenteDoModelo) : []))
  const [aditivo, setAditivo] = useState({ desde: proximoMes(hoje), motivo: '' })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const modelo = modelos.find((m) => m.id === d.modeloId)
  const fixosDoModelo = modelo?.componentes.filter((c) => c.regra === 'fixo') ?? []
  const porDocumento = componentes.some((c) => c.regra === 'documento' && c.ativo)
  const spot = d.modalidade === 'spot'
  const carteirasDaEmpresa = (carteiras ?? []).filter((c) => c.status !== 'inativo' && carteiraDaEmpresa(c, d.empresaId))

  const trocarModelo = (m: ModeloContrato | undefined, manterItens = false) => {
    setD((x) => ({ ...x, modeloId: m?.id ?? '', servicoId: m?.servicoId || x.servicoId }))
    setComponentes(m ? m.componentes.filter((c) => c.regra !== 'fixo').map(componenteDoModelo) : [])
    setCond((c) => ({ ...c, agrupamento: m?.agrupamento ?? 'periodo', fechamento: m?.fechamento ?? 'mensal' }))
    if (!manterItens) setItens([])
  }
  const escolherCliente = (id: string, nome: string) => {
    const cli = clientes?.find((x) => x.id === id)
    setD((x) => ({ ...x, clienteId: id, clienteTexto: nome, contato: x.contato || cli?.contato || '' }))
    if (cli?.prazoPagamentoDias) setCond((c) => ({ ...c, prazoPagamentoDias: cli.prazoPagamentoDias ?? c.prazoPagamentoDias }))
  }
  // A proposta traz cliente, empresa e o que foi precificado (cada item vira uma linha do escopo).
  const usarProposta = (p: Proposta | undefined) => {
    setPropostaId(p?.id ?? '')
    if (!p) return
    if (p.clienteId) escolherCliente(p.clienteId, p.cliente)
    setD((x) => ({ ...x, empresaId: p.itens[0]?.empresaId || x.empresaId }))
    const fixo = fixosDoModelo[0]
    setItens(p.itens.map((i) => ({
      id: crypto.randomUUID(), apelido: fixo?.apelido ?? '', tabela: porDocumento, servico: servicos?.find((x) => x.id === i.servicoId)?.nome ?? fixo?.nome ?? 'Serviço',
      descricao: i.descricao, quantidade: 1, unidade: fixo?.unidade || 'un.', valorUnitario: r2(i.precoFinal + (i.adValorem ?? 0)), custoUnitario: r2(i.custoTotal),
    })))
  }
  // "Gerar contrato" na lista de propostas abre aqui com ?proposta=: aplica uma vez, quando a lista chega.
  const [urlAplicada, setUrlAplicada] = useState(false)
  const propostaDaUrl = params.get('proposta')
  if (propostaDaUrl && !urlAplicada && aprovadas.length) {
    setUrlAplicada(true)
    usarProposta(aprovadas.find((p) => p.id === propostaDaUrl))
  }

  const novoItem = () =>
    setItens((l) => [...l, { id: crypto.randomUUID(), apelido: porDocumento ? componentes.find((c) => c.regra === 'documento')?.apelido ?? '' : fixosDoModelo[0]?.apelido ?? '', tabela: porDocumento, servico: porDocumento ? 'Frete' : fixosDoModelo[0]?.nome ?? 'Serviço', descricao: '', quantidade: 1, unidade: porDocumento ? 'viagem' : fixosDoModelo[0]?.unidade || 'un.', valorUnitario: 0, custoUnitario: 0 }])
  const mudarItem = (i: number, p: Partial<ItemEscopo>) => setItens((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const mudarComp = (cid: string, p: Partial<ComponenteContrato>) => setComponentes((l) => l.map((x) => (x.id === cid ? { ...x, ...p } : x)))

  const previa = previaCobranca(itens, componentes, carac, true)
  const escopoMudou = editando && JSON.stringify(escopoVigente(existente, hoje).itens) !== JSON.stringify(itens)
  const faltas = [
    !d.clienteId && 'escolher o cliente no cadastro',
    !d.empresaId && 'a empresa',
    !modelo && 'o modelo',
    ...(modelo?.campos.filter((c) => c.obrigatorio && (carac[c.apelido] === undefined || carac[c.apelido] === '')).map((c) => c.nome) ?? []),
    itens.length === 0 && (porDocumento ? 'pelo menos uma linha na tabela' : 'pelo menos um componente fixo no escopo'),
    !spot && d.fim <= d.inicio && 'um fim de vigência depois do início',
    previa.linhas.some((l) => l.erro) && 'corrigir a fórmula com erro',
    escopoMudou && !aditivo.desde && 'a data do aditivo',
  ].filter(Boolean) as string[]

  const salvar = async () => {
    setTentou(true)
    setErro('')
    if (faltas.length) return
    const dados: SalvarContrato = {
      empresaId: d.empresaId, clienteId: d.clienteId, modeloId: d.modeloId, modalidade: d.modalidade, inicio: d.inicio, fim: spot ? d.inicio : d.fim,
      condicoes: cond, itens, contato: d.contato, situacao: spot ? undefined : d.situacao, localServico: spot ? d.local : '', propostaId: propostaId || undefined,
      servicoId: d.servicoId, textoAdicionalNota: d.textoNota, caracteristicas: carac, componentes,
      aditivoDesde: escopoMudou ? aditivo.desde : undefined, aditivoMotivo: escopoMudou ? aditivo.motivo : undefined,
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

  const campoInput = (campo: CampoModelo) => {
    const v = carac[campo.apelido]
    const set = (x: string | number) => setCarac((c) => ({ ...c, [campo.apelido]: x }))
    if (campo.tipo === 'lista')
      return (
        <select value={String(v ?? '')} onChange={(e) => set(e.target.value)}>
          <option value="">Escolha</option>
          {campo.opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    if (campo.tipo === 'numero' || campo.tipo === 'valor') return <input type="number" step={campo.tipo === 'valor' ? '0.01' : '1'} value={v === undefined ? '' : String(v)} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} />
    if (campo.tipo === 'percentual') return <input type="number" step="0.01" value={typeof v === 'number' ? r2(v * 100) : ''} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value) / 100)} placeholder="%" />
    if (campo.tipo === 'data') return <input type="date" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />
    return <input value={String(v ?? '')} onChange={(e) => set(e.target.value)} placeholder={campo.tipo === 'cadastro' ? `Do cadastro de ${campo.opcoes[0] ?? '...'}` : ''} />
  }
  const n = (k: number) => (editando ? k - 1 : k)

  return (
    <div>
      <Link to={existente ? `/contratos/${existente.id}` : '/contratos'} className={s.voltar}><ArrowLeft size={15} /> {existente ? `Pasta ${existente.numero}` : 'Contratos'}</Link>
      <div className={s.cabeca}>
        <div>
          <h1 className={s.titulo}>{existente ? `Editar contrato ${existente.numero}` : 'Novo contrato'}</h1>
          <div className={s.sub}>A parte fixa vale para todo contrato; características e componentes de cobrança vêm do modelo (Parametrizações › Modelos de Contrato).</div>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void salvar()} disabled={salvando}><Save /> {salvando ? 'Salvando...' : existente ? 'Salvar alterações' : 'Criar contrato'}</button>
      </div>

      {((tentou && faltas.length > 0) || erro) && (
        <div className={s.faltas} role="alert"><AlertTriangle size={15} /> {erro || `Falta ${faltas.join(', ')}.`}</div>
      )}

      {!editando && (
        <Secao icone={FileSignature} titulo="1 · Origem">
          <div className={s.origens}>
            <button type="button" className={origem === 'proposta' ? s.origemOn : ''} onClick={() => setOrigem('proposta')}>
              <b>A partir de uma proposta aprovada</b>
              <span>Cliente, empresa e o que foi precificado vêm da proposta (o botão "Gerar contrato" na lista de propostas faz isto).</span>
            </button>
            <button type="button" className={origem === 'branco' ? s.origemOn : ''} onClick={() => { setOrigem('branco'); setPropostaId('') }}>
              <b>Em branco</b>
              <span>Para contratos que não passaram pelo Pricing.</span>
            </button>
          </div>
          {origem === 'proposta' && (
            <label className={s.campo}>
              Proposta aprovada
              <select value={propostaId} onChange={(e) => usarProposta(aprovadas.find((p) => p.id === e.target.value))}>
                <option value="">{aprovadas.length ? 'Escolha a proposta' : 'Nenhuma proposta aprovada'}</option>
                {aprovadas.map((p) => <option key={p.id} value={p.id}>{p.numero} · {p.cliente} · {formatBRL(p.total)}</option>)}
              </select>
            </label>
          )}
        </Secao>
      )}

      <Secao icone={Settings2} titulo={`${n(2)} · Dados gerais`}>
        <div className={s.grade}>
          <label className={`${s.campo} ${s.largo}`}>
            Cliente
            <ClienteAutocomplete
              clientes={clientes ?? []}
              value={d.clienteTexto}
              clienteId={d.clienteId}
              onChange={(t) => setD({ ...d, clienteTexto: t, clienteId: '' })}
              onSelect={(c) => escolherCliente(c.id, c.nome)}
              placeholder="Nome, fantasia ou CNPJ do cadastro"
              invalid={tentou && !d.clienteId}
            />
          </label>
          <label className={s.campo}>
            Contato
            <input value={d.contato} onChange={(e) => setD({ ...d, contato: e.target.value })} placeholder="Nome e telefone" />
          </label>
          <label className={s.campo}>
            Empresa
            <select value={d.empresaId} onChange={(e) => setD({ ...d, empresaId: e.target.value })} disabled={editando}>
              <option value="">Escolha</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </label>
          <label className={s.campo}>
            Modelo de contrato
            <select value={d.modeloId} onChange={(e) => trocarModelo(modelos.find((m) => m.id === e.target.value), !!propostaId)} disabled={editando}>
              {ativos.map((m) => <option key={m.id} value={m.id}>{m.nome}{m.tipoOperacao ? ` · ${m.tipoOperacao}` : ''}</option>)}
            </select>
          </label>
          <div className={`${s.campo} ${s.largo}`}>
            Modalidade
            <div className={s.segmento} role="radiogroup" aria-label="Modalidade">
              <button type="button" role="radio" aria-checked={!spot} className={!spot ? s.segOn : ''} onClick={() => setD({ ...d, modalidade: 'recorrente' })} disabled={editando}>Recorrente</button>
              <button type="button" role="radio" aria-checked={spot} className={spot ? s.segOn : ''} onClick={() => setD({ ...d, modalidade: 'spot' })} disabled={editando}>Spot (serviço avulso)</button>
            </div>
          </div>
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

      {modelo && modelo.campos.length > 0 && (
        <Secao icone={ListChecks} titulo={`${n(3)} · Características · ${modelo.nome}`} nota="Campos do modelo. Quem monta é o cliente, em Parametrizações › Modelos de Contrato; o apelido (em laranja) é o nome que as fórmulas usam.">
          <div className={s.grade}>
            {modelo.campos.map((campo) => (
              <label key={campo.id} className={s.campo}>
                <span className={s.rotuloCampo}>
                  {campo.nome}{campo.obrigatorio ? ' *' : ''} <code className={s.apelido}>{campo.apelido}</code>
                </span>
                {campoInput(campo)}
                {campo.ajuda && <small className={s.ajuda}>{campo.ajuda}</small>}
              </label>
            ))}
          </div>
        </Secao>
      )}

      <Secao icone={ScrollText} titulo={`${n(4)} · Cobrança`}>
        <h3 className={s.subtitulo}>{porDocumento ? 'Tabela de preços (cada documento sai com o preço da linha)' : spot ? 'O que é cobrado' : 'Mensalidade (componentes fixos)'}</h3>
        <div className={ui.tableScroll}>
          <table className={`${ui.table} ${s.itens}`}>
            <thead>
              <tr>
                <th>Componente</th>
                <th>Descrição</th>
                <th className={ui.right}>Qtd</th>
                <th>Unidade</th>
                <th className={ui.right}>Preço unit.</th>
                <th className={ui.right}>Custo unit.</th>
                <th className={ui.right}>{porDocumento ? '' : 'Total'}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {itens.map((i, k) => (
                <tr key={i.id}>
                  <td>
                    {porDocumento ? (
                      <span className={s.mut}>linha da tabela</span>
                    ) : (
                      <select value={i.apelido} onChange={(e) => { const f = fixosDoModelo.find((x) => x.apelido === e.target.value); mudarItem(k, { apelido: e.target.value, servico: f?.nome ?? i.servico, unidade: f?.unidade || i.unidade }) }}>
                        {fixosDoModelo.map((f) => <option key={f.apelido} value={f.apelido}>{f.nome}</option>)}
                        {!fixosDoModelo.some((f) => f.apelido === i.apelido) && <option value={i.apelido}>{i.servico}</option>}
                      </select>
                    )}
                  </td>
                  <td><input value={i.descricao} onChange={(e) => mudarItem(k, { descricao: e.target.value })} placeholder={porDocumento ? 'Ex.: Santos → Campinas · Truck' : 'Ex.: Porteiro · escala 12x36'} /></td>
                  <td className={ui.right}><input className={s.num} type="number" min={0} value={i.quantidade} disabled={porDocumento} onChange={(e) => mudarItem(k, { quantidade: Number(e.target.value) })} /></td>
                  <td><input className={s.curto} value={i.unidade} onChange={(e) => mudarItem(k, { unidade: e.target.value })} /></td>
                  <td className={ui.right}><input className={s.num} type="number" min={0} step="0.01" value={i.valorUnitario} onChange={(e) => mudarItem(k, { valorUnitario: Number(e.target.value) })} /></td>
                  <td className={ui.right}><input className={s.num} type="number" min={0} step="0.01" value={i.custoUnitario} onChange={(e) => mudarItem(k, { custoUnitario: Number(e.target.value) })} /></td>
                  <td className={`${ui.right} ${ui.cellStrong}`}>{porDocumento ? '' : formatBRL(i.quantidade * i.valorUnitario)}</td>
                  <td><button type="button" className={ui.iconBtn} title="Tirar a linha" onClick={() => setItens((l) => l.filter((_, x) => x !== k))}><Trash2 /></button></td>
                </tr>
              ))}
              {itens.length === 0 && (
                <tr><td colSpan={8} className={s.vazio}>{origem === 'proposta' && !editando ? 'Escolha a proposta acima ou inclua as linhas.' : 'Inclua as linhas do escopo.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnLinha}`} onClick={novoItem}><Plus /> {porDocumento ? 'Incluir linha na tabela' : 'Incluir componente fixo'}</button>
        {escopoMudou && (
          <div className={s.aditivo}>
            <span>O escopo mudou: vira a versão {existente!.escopo.length + 1} (aditivo), valendo a partir de</span>
            <input type="date" value={aditivo.desde} onChange={(e) => setAditivo({ ...aditivo, desde: e.target.value })} aria-label="Vale a partir de" />
            <input value={aditivo.motivo} onChange={(e) => setAditivo({ ...aditivo, motivo: e.target.value })} placeholder="Motivo (ex.: inclusão de 1 posto)" aria-label="Motivo do aditivo" />
            <small>As faturas ainda não emitidas a partir dessa data já usam o escopo novo; as emitidas ficam como foram.</small>
          </div>
        )}

        {componentes.length > 0 && (
          <>
            <h3 className={s.subtitulo}>Outros componentes de cobrança</h3>
            <div className={s.componentes}>
              {componentes.map((c) => (
                <div key={c.id} className={`${s.componente} ${c.ativo ? '' : s.off}`}>
                  <label className={s.chave} title={c.ativo ? 'Desligar' : 'Ligar'}>
                    <input type="checkbox" checked={c.ativo} onChange={() => mudarComp(c.id, { ativo: !c.ativo })} />
                    <span />
                  </label>
                  <div className={s.compNome}>
                    <b>{c.nome}</b>
                    <span>{ROTULO_REGRA[c.regra]} <code className={s.apelido}>{c.apelido}</code></span>
                  </div>
                  {c.regra === 'formula' && (
                    <label className={s.compCampo}>
                      Fórmula
                      <input value={c.formula} onChange={(e) => mudarComp(c.id, { formula: e.target.value })} />
                    </label>
                  )}
                  {c.regra === 'lancamento' && (
                    <label className={s.compCampo}>
                      Preço por {c.unidade || 'unidade'}
                      <input type="number" step="0.01" value={c.valorUnitario} onChange={(e) => mudarComp(c.id, { valorUnitario: Number(e.target.value) })} />
                    </label>
                  )}
                  {c.regra === 'unico' && (
                    <label className={s.compCampo}>
                      Valor (uma vez)
                      <input type="number" step="0.01" value={c.valorUnitario} onChange={(e) => mudarComp(c.id, { valorUnitario: Number(e.target.value), quantidade: 1 })} />
                    </label>
                  )}
                  {c.regra === 'documento' && <span className={s.compInfo}>soma dos {c.documento || 'documentos'} vinculados</span>}
                </div>
              ))}
            </div>
          </>
        )}

        <div className={s.previa}>
          <h3 className={s.subtitulo}><Calculator size={14} /> Prévia da {spot ? 'cobrança' : 'primeira fatura'}</h3>
          {previa.linhas.map((l) => (
            <div key={`${l.apelido}-${l.nome}-${l.regra}`} className={`${s.previaLinha} ${l.valor === null ? s.previaVar : ''}`}>
              <span>
                {l.nome} <small>{l.detalhe}</small>
                {l.erro && <small className={s.erro}> · {l.erro}</small>}
              </span>
              <b>{l.valor === null ? 'variável' : formatBRL(l.valor)}</b>
            </div>
          ))}
          <div className={`${s.previaLinha} ${s.previaTotal}`}>
            <span>{porDocumento ? 'Fixo do período (os documentos somam por fora)' : 'Total previsto'}</span>
            <b>{formatBRL(previa.total)}</b>
          </div>
        </div>
      </Secao>

      <Secao icone={FilePlus2} titulo={`${n(5)} · Condições`}>
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
                Dia do faturamento
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
          <label className={s.check}>
            <input type="checkbox" checked={cond.anteciparFimDeSemana} onChange={(e) => setCond({ ...cond, anteciparFimDeSemana: e.target.checked })} /> Vencimento no fim de semana antecipa para sexta
          </label>
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
            </>
          )}
          <label className={s.campo}>
            Conta que recebe
            <select value={cond.carteiraId} onChange={(e) => setCond({ ...cond, carteiraId: e.target.value })}>
              <option value="">{d.empresaId ? 'Escolha a conta' : 'Escolha a empresa antes'}</option>
              {carteirasDaEmpresa.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label className={s.campo}>
            Forma de cobrança
            <select value={cond.formaCobranca} onChange={(e) => setCond({ ...cond, formaCobranca: e.target.value })}>
              {['Boleto com Pix', 'Pix', 'Transferência', 'Boleto'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
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
          {!spot && (
            <label className={`${s.campo} ${s.largo}`}>
              Multa rescisória
              <input value={cond.multaRescisoria} onChange={(e) => setCond({ ...cond, multaRescisoria: e.target.value })} placeholder="Ex.: 3 mensalidades, proporcional ao tempo restante" />
            </label>
          )}
        </div>
        <div className={s.notaFiscal}>O contrato escolhe o serviço e o texto adicional da nota; código municipal, alíquota e retenção ficam com o serviço (entram junto com a emissão de NFS-e pela Central).</div>
      </Secao>

      <div className={s.rodape}>
        <Link to={existente ? `/contratos/${existente.id}` : '/contratos'} className={`${ui.btn} ${ui.btnGhost}`}>Cancelar</Link>
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
