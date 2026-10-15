import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Calculator, FilePlus2, FileSignature, ListChecks, Plus, Save, ScrollText, Settings2, Trash2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { AvisoPrototipo } from '@/features/common/AvisoPrototipo'
import { formatBRL } from '@/lib/format'
import { componenteDoModelo, previaCobranca, ROTULO_REGRA, type CampoModelo, type ModeloContrato } from './modelos'
import { escopoVigente, hojeISO } from './regras'
import { gerarId, prototipo, proximoNumero, usePrototipo } from './store'
import type { ComponenteContrato, CondicoesContrato, Contrato, ItemEscopo, Modalidade } from './types'
import s from './form.module.css'

/** Propostas aprovadas de exemplo (no sistema: as do Pricing com "Gerar contrato"). */
interface PropostaExemplo {
  numero: string
  cliente: string
  documento: string
  empresaId: string
  modeloId: string
  modalidade: Modalidade
  itens: ItemEscopo[]
}
const PROPOSTAS: PropostaExemplo[] = [
  {
    numero: 'MS-00025', cliente: 'Condomínio Vila Rica', documento: '11.222.333/0001-44', empresaId: 'matriz', modeloId: 'm-terceirizacao', modalidade: 'recorrente',
    itens: [
      { id: 'p1', apelido: 'posto', servico: 'Portaria', descricao: 'Porteiro · escala 12x36', quantidade: 2, unidade: 'posto', valorUnitario: 7250, custoUnitario: 5940 },
      { id: 'p2', apelido: 'posto', servico: 'Terceirização de mão de obra', descricao: 'Auxiliar de limpeza · escala 6x1', quantidade: 1, unidade: 'posto', valorUnitario: 6400, custoUnitario: 5150 },
    ],
  },
  {
    numero: 'MF-00027', cliente: 'Atacadão Baixada S.A.', documento: '78.901.234/0001-56', empresaId: 'filial', modeloId: 'm-frete', modalidade: 'recorrente',
    itens: [
      { id: 'p3', apelido: 'fretes', tabela: true, servico: 'Frete', descricao: 'Santos → São Paulo (CD Jaguaré) · Truck', quantidade: 1, unidade: 'viagem', valorUnitario: 2980, custoUnitario: 2210 },
      { id: 'p4', apelido: 'fretes', tabela: true, servico: 'Frete', descricao: 'Santos → Guarulhos · Carreta', quantidade: 1, unidade: 'viagem', valorUnitario: 4650, custoUnitario: 3520 },
    ],
  },
  {
    numero: 'SN-00003', cliente: 'Transportadora Litoral', documento: '22.333.444/0001-55', empresaId: 'matriz', modeloId: 'm-saas', modalidade: 'recorrente',
    itens: [{ id: 'p5', apelido: 'licenca', servico: 'Licença mensal', descricao: 'ELROND · Pricing, CRM e Financeiro · até 10 usuários', quantidade: 1, unidade: 'mês', valorUnitario: 1890, custoUnitario: 420 }],
  },
]

const CONDICOES_PADRAO: CondicoesContrato = {
  diaFaturamento: 1, referencia: 'mes-anterior', diaVencimento: 10, anteciparFimDeSemana: true, renovacaoAutomatica: true, avisoPrevioDias: 60,
  reajusteIndice: 'IPCA', reajusteMesBase: 1, multaRescisoria: '', carteira: 'Sicredi · Matriz', formaCobranca: 'Boleto com Pix', prazoPagamentoDias: 15,
  agrupamento: 'periodo', fechamento: 'mensal',
}
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const r2 = (v: number) => Math.round(v * 100) / 100
const umAno = (iso: string) => `${Number(iso.slice(0, 4)) + 1}${iso.slice(4, 8)}${String(Math.min(28, Number(iso.slice(8, 10)))).padStart(2, '0')}`
const proximoMes = (iso: string) => {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Cadastro do contrato (protótipo): parte fixa + características e componentes do modelo. */
export function ContratoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contratos, modelos } = usePrototipo()
  const existente = contratos.find((c) => c.id === id)
  const editando = !!existente
  const hoje = hojeISO()
  const ativos = modelos.filter((m) => m.status === 'ativo')

  const [origem, setOrigem] = useState<'proposta' | 'branco'>(editando ? 'branco' : 'proposta')
  const [propostaNum, setPropostaNum] = useState('')
  const [d, setD] = useState(() => ({
    cliente: existente?.clienteNome ?? '',
    documento: existente?.clienteDocumento ?? '',
    contato: existente?.contato ?? '',
    empresaId: existente?.empresaId ?? 'matriz',
    modeloId: existente?.modeloId ?? ativos[0]?.id ?? '',
    modalidade: existente?.modalidade ?? ('recorrente' as Modalidade),
    inicio: existente?.inicio ?? proximoMes(hoje),
    fim: existente?.fim ?? umAno(proximoMes(hoje)).replace(/-\d{2}$/, '-01'),
    local: existente?.localServico ?? '',
    servicoNfse: existente?.servicoNfse ?? '',
    textoNota: existente?.textoAdicionalNota ?? '',
    responsavel: existente?.responsavel ?? 'você',
  }))
  const [cond, setCond] = useState<CondicoesContrato>(existente?.condicoes ?? CONDICOES_PADRAO)
  const [carac, setCarac] = useState<Record<string, string | number>>(existente?.caracteristicas ?? {})
  const [itens, setItens] = useState<ItemEscopo[]>(() => (existente ? escopoVigente(existente, hoje).itens : []))
  const [componentes, setComponentes] = useState<ComponenteContrato[]>(() => existente?.componentes ?? (ativos[0] ? ativos[0].componentes.filter((c) => c.regra !== 'fixo').map(componenteDoModelo) : []))
  const [vigenteDesde, setVigenteDesde] = useState(proximoMes(hoje))
  const [tentou, setTentou] = useState(false)

  const modelo = modelos.find((m) => m.id === d.modeloId)
  const fixosDoModelo = modelo?.componentes.filter((c) => c.regra === 'fixo') ?? []
  const porDocumento = componentes.some((c) => c.regra === 'documento' && c.ativo)
  const spot = d.modalidade === 'spot'

  const trocarModelo = (m: ModeloContrato | undefined, manterItens = false) => {
    setD((x) => ({ ...x, modeloId: m?.id ?? '' }))
    setComponentes(m ? m.componentes.filter((c) => c.regra !== 'fixo').map(componenteDoModelo) : [])
    setCond((c) => ({ ...c, agrupamento: m?.agrupamento ?? 'periodo', fechamento: m?.fechamento ?? 'mensal' }))
    if (!manterItens) setItens([])
  }
  const usarProposta = (numero: string) => {
    setPropostaNum(numero)
    const p = PROPOSTAS.find((x) => x.numero === numero)
    if (!p) return
    const m = modelos.find((x) => x.id === p.modeloId)
    trocarModelo(m, true)
    setD((x) => ({ ...x, cliente: p.cliente, documento: p.documento, empresaId: p.empresaId, modeloId: p.modeloId, modalidade: p.modalidade }))
    setItens(p.itens.map((i) => ({ ...i, id: gerarId(`${i.id}-`) })))
  }
  const novoItem = () =>
    setItens((l) => [...l, { id: gerarId('i'), apelido: porDocumento ? componentes.find((c) => c.regra === 'documento')?.apelido : fixosDoModelo[0]?.apelido, tabela: porDocumento, servico: porDocumento ? 'Frete' : fixosDoModelo[0]?.nome ?? 'Serviço', descricao: '', quantidade: 1, unidade: porDocumento ? 'viagem' : fixosDoModelo[0]?.unidade || 'un.', valorUnitario: 0, custoUnitario: 0 }])
  const mudarItem = (i: number, p: Partial<ItemEscopo>) => setItens((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const mudarComp = (cid: string, p: Partial<ComponenteContrato>) => setComponentes((l) => l.map((x) => (x.id === cid ? { ...x, ...p } : x)))

  const previa = previaCobranca(itens, componentes, carac, true)
  const faltas = [
    !d.cliente.trim() && 'o cliente',
    !modelo && 'o modelo',
    ...(modelo?.campos.filter((c) => c.obrigatorio && (carac[c.apelido] === undefined || carac[c.apelido] === '')).map((c) => c.nome) ?? []),
    itens.length === 0 && (porDocumento ? 'pelo menos uma linha na tabela' : 'pelo menos um componente fixo no escopo'),
    !spot && d.fim <= d.inicio && 'um fim de vigência depois do início',
    previa.linhas.some((l) => l.erro) && 'corrigir a fórmula com erro',
  ].filter(Boolean) as string[]

  const escopoMudou = editando && JSON.stringify(escopoVigente(existente, hoje).itens) !== JSON.stringify(itens)

  const salvar = () => {
    setTentou(true)
    if (faltas.length) return
    const empresaNome = d.empresaId === 'filial' ? 'Mirai - Filial 02' : 'Mirai - Matriz'
    const servico = d.servicoNfse || modelo?.componentes.find((c) => c.servicoNfse)?.servicoNfse || 'Prestação de serviço'
    const fim = spot ? d.inicio : d.fim
    const prop = PROPOSTAS.find((x) => x.numero === propostaNum)
    const base: Contrato = existente ?? {
      id: gerarId('n'),
      numero: proximoNumero(contratos, d.empresaId),
      empresaId: d.empresaId, empresaNome, clienteNome: '', clienteDocumento: '', contato: '', tipoOperacao: '', modalidade: d.modalidade,
      situacao: spot ? 'a-faturar' : 'vigente', inicio: d.inicio, fim, propostaNumero: prop?.numero ?? '—', propostaAprovadaEm: hoje,
      servicoNfse: servico, servicoNfseDetalhe: 'Parâmetros fiscais do cadastro de serviços', textoAdicionalNota: '', centroCusto: modelo?.tipoOperacao ?? 'Geral',
      responsavel: d.responsavel, escopo: [], condicoes: cond, faturas: [], extras: [], documentos: [], eventos: [], margemRealizada: 0,
    }
    const escopo = !existente
      ? [{ versao: 1, vigenteDesde: d.inicio, motivo: prop ? `Proposta ${prop.numero} aprovada` : 'Cadastro do contrato', itens }]
      : escopoMudou
        ? [...existente.escopo, { versao: existente.escopo.length + 1, vigenteDesde, motivo: 'Alteração do escopo no cadastro', itens }]
        : existente.escopo
    const c: Contrato = {
      ...base,
      clienteNome: d.cliente.trim(),
      clienteDocumento: d.documento || '—',
      contato: d.contato,
      empresaId: d.empresaId,
      empresaNome,
      tipoOperacao: modelo?.tipoOperacao ?? base.tipoOperacao,
      modalidade: d.modalidade,
      inicio: d.inicio,
      fim,
      localServico: spot ? d.local : undefined,
      servicoNfse: servico,
      servicoNfseDetalhe: servico.includes('CT-e') ? 'Documento fiscal de cada viagem (CT-e emitido na saída)' : base.servicoNfseDetalhe,
      textoAdicionalNota: d.textoNota,
      responsavel: d.responsavel,
      condicoes: cond,
      escopo,
      modeloId: modelo?.id,
      caracteristicas: carac,
      componentes,
      // Spot nasce com a sua fatura única para a Central.
      faturas: !existente && spot ? [{ id: `${base.id}-f`, competencia: d.inicio.slice(0, 7), vencimento: d.inicio, previsto: previa.total, extras: 0, descontos: 0, situacao: 'prevista' }] : base.faturas,
      eventos: [
        { data: hoje, tipo: existente ? (escopoMudou ? 'aditivo' : 'documento') : 'assinatura', texto: existente ? (escopoMudou ? `Escopo alterado: versão ${existente.escopo.length + 1} a partir de ${vigenteDesde.split('-').reverse().join('/')}` : 'Cadastro do contrato alterado') : `Contrato cadastrado${prop ? ` a partir da proposta ${prop.numero}` : ''}`, quem: 'você' },
        ...base.eventos,
      ],
    }
    prototipo.salvarContrato(c)
    navigate(`/contratos/${c.id}`)
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
    return <input value={String(v ?? '')} onChange={(e) => set(e.target.value)} placeholder={campo.tipo === 'cadastro' ? `Escolha no cadastro de ${campo.opcoes[0] ?? '...'}` : ''} />
  }

  return (
    <div>
      <Link to={existente ? `/contratos/${existente.id}` : '/contratos'} className={s.voltar}><ArrowLeft size={15} /> {existente ? `Pasta ${existente.numero}` : 'Contratos'}</Link>
      <div className={s.cabeca}>
        <div>
          <h1 className={s.titulo}>{existente ? `Editar contrato ${existente.numero}` : 'Novo contrato'}</h1>
          <div className={s.sub}>A parte fixa vale para todo contrato; características e componentes de cobrança vêm do modelo (Parametrizações › Modelos de Contrato).</div>
        </div>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar}><Save /> {existente ? 'Salvar alterações' : 'Criar contrato'}</button>
      </div>
      <AvisoPrototipo>dados de exemplo, guardados só neste navegador; o contrato criado aparece na lista, na pasta e na Central.</AvisoPrototipo>

      {tentou && faltas.length > 0 && (
        <div className={s.faltas} role="alert"><AlertTriangle size={15} /> Falta {faltas.join(', ')}.</div>
      )}

      {!editando && (
        <Secao icone={FileSignature} titulo="1 · Origem">
          <div className={s.origens}>
            <button type="button" className={origem === 'proposta' ? s.origemOn : ''} onClick={() => setOrigem('proposta')}>
              <b>A partir de uma proposta aprovada</b>
              <span>Escopo, preço e cliente vêm do Pricing (o botão "Gerar contrato" da proposta faz isto).</span>
            </button>
            <button type="button" className={origem === 'branco' ? s.origemOn : ''} onClick={() => { setOrigem('branco'); setPropostaNum('') }}>
              <b>Em branco</b>
              <span>Para contratos que não passaram pelo Pricing.</span>
            </button>
          </div>
          {origem === 'proposta' && (
            <label className={s.campo}>
              Proposta aprovada
              <select value={propostaNum} onChange={(e) => usarProposta(e.target.value)}>
                <option value="">Escolha a proposta</option>
                {PROPOSTAS.map((p) => (
                  <option key={p.numero} value={p.numero}>
                    {p.numero} · {p.cliente} · {modelos.find((m) => m.id === p.modeloId)?.nome ?? ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Secao>
      )}

      <Secao icone={Settings2} titulo={`${editando ? '1' : '2'} · Dados gerais`}>
        <div className={s.grade}>
          <label className={`${s.campo} ${s.largo}`}>
            Cliente
            <input list="clientes-form" value={d.cliente} onChange={(e) => setD({ ...d, cliente: e.target.value })} placeholder="Nome do cliente" />
            <datalist id="clientes-form">{[...new Set(contratos.map((c) => c.clienteNome))].map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          <label className={s.campo}>
            CNPJ / CPF
            <input value={d.documento} onChange={(e) => setD({ ...d, documento: e.target.value })} />
          </label>
          <label className={s.campo}>
            Contato
            <input value={d.contato} onChange={(e) => setD({ ...d, contato: e.target.value })} placeholder="Nome e telefone" />
          </label>
          <label className={s.campo}>
            Empresa
            <select value={d.empresaId} onChange={(e) => setD({ ...d, empresaId: e.target.value })} disabled={editando}>
              <option value="matriz">Mirai - Matriz</option>
              <option value="filial">Mirai - Filial 02</option>
            </select>
          </label>
          <label className={s.campo}>
            Modelo de contrato
            <select value={d.modeloId} onChange={(e) => trocarModelo(modelos.find((m) => m.id === e.target.value))} disabled={editando}>
              {ativos.map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.tipoOperacao}</option>)}
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
            </>
          )}
        </div>
      </Secao>

      {modelo && (
        <Secao icone={ListChecks} titulo={`${editando ? '2' : '3'} · Características · ${modelo.nome}`} nota="Campos do modelo. Quem monta é o cliente, em Parametrizações › Modelos de Contrato; o apelido (em laranja) é o nome que as fórmulas usam.">
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

      <Secao icone={ScrollText} titulo={`${editando ? '3' : '4'} · Cobrança`}>
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
                      <select value={i.apelido ?? ''} onChange={(e) => { const f = fixosDoModelo.find((x) => x.apelido === e.target.value); mudarItem(k, { apelido: e.target.value, servico: f?.nome ?? i.servico, unidade: f?.unidade || i.unidade }) }}>
                        {fixosDoModelo.map((f) => <option key={f.apelido} value={f.apelido}>{f.nome}</option>)}
                        {!fixosDoModelo.some((f) => f.apelido === i.apelido) && <option value={i.apelido ?? ''}>{i.servico}</option>}
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
          <label className={s.aditivo}>
            <span>O escopo mudou: vira a versão {existente!.escopo.length + 1}, valendo a partir de</span>
            <input type="date" value={vigenteDesde} onChange={(e) => setVigenteDesde(e.target.value)} />
            <small>As faturas ainda não emitidas a partir dessa data já usam o escopo novo; as emitidas ficam como foram.</small>
          </label>
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
                {l.nome} <small>{l.regra === 'formula' ? l.detalhe : l.regra === 'fixo' ? l.detalhe : l.detalhe}</small>
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

      <Secao icone={FilePlus2} titulo={`${editando ? '4' : '5'} · Condições`}>
        <div className={s.grade}>
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
                <select value={cond.agrupamento ?? 'periodo'} onChange={(e) => setCond({ ...cond, agrupamento: e.target.value as CondicoesContrato['agrupamento'] })}>
                  <option value="periodo">Uma fatura juntando os CT-es do período</option>
                  <option value="por-documento">Uma cobrança por CT-e</option>
                </select>
              </label>
              <label className={s.campo}>
                Fechamento
                <select value={cond.fechamento ?? 'mensal'} onChange={(e) => setCond({ ...cond, fechamento: e.target.value as CondicoesContrato['fechamento'] })} disabled={cond.agrupamento === 'por-documento'}>
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
            Carteira
            <select value={cond.carteira} onChange={(e) => setCond({ ...cond, carteira: e.target.value })}>
              <option>Sicredi · Matriz</option>
              <option>Inter · Filial</option>
            </select>
          </label>
          <label className={s.campo}>
            Forma de cobrança
            <select value={cond.formaCobranca} onChange={(e) => setCond({ ...cond, formaCobranca: e.target.value })}>
              <option>Boleto com Pix</option>
              <option>Pix</option>
              <option>Transferência</option>
            </select>
          </label>
          <label className={s.campo}>
            Serviço da nota fiscal
            <select value={d.servicoNfse} onChange={(e) => setD({ ...d, servicoNfse: e.target.value })}>
              <option value="">O do modelo</option>
              {[...new Set(modelos.flatMap((m) => m.componentes.map((c) => c.servicoNfse)).filter(Boolean))].map((x) => <option key={x} value={x}>{x}</option>)}
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
        <div className={s.notaFiscal}>Código do serviço, alíquota e retenção ficam no cadastro de serviços; aqui o contrato só escolhe o serviço e o texto adicional.</div>
      </Secao>

      <div className={s.rodape}>
        <Link to={existente ? `/contratos/${existente.id}` : '/contratos'} className={`${ui.btn} ${ui.btnGhost}`}>Cancelar</Link>
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar}><Save /> {existente ? 'Salvar alterações' : 'Criar contrato'}</button>
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
