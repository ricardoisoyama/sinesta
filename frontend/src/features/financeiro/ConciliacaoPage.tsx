import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createCliente, createFornecedor } from '@/features/cadastros/api'
import { consultarCnpj } from '@/features/common/consultas'
import { emptyParceiro, type ParceiroForm } from '@/features/parceiros/parceiro-schema'
import { ParceiroFormModal } from '@/features/parceiros/ParceiroFormModal'
import { novoContato, type Parceiro } from '@/features/parceiros/types'
import { Link } from 'react-router-dom'
import { Ban, Check, CheckCheck, CheckCircle2, CloudDownload, FileUp, Link2, Lightbulb, Plus, RotateCcw, Search, Sparkles, Undo2, UserPlus, Wand2, X, Building2, Truck } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Hint } from '@/features/common/Hint'
import { formatBRL, formatCnpj } from '@/lib/format'
import { buscaPeloNumero, semAcento } from '@/lib/texto'
import { getErrorMessage } from '@/lib/api'
import { listCategoriasCusto, listClientes, listFornecedores } from '@/features/cadastros/api'
import { confirmar } from '@/features/common/dialogo/dialogo'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import { usePlanoContas } from '@/features/planoContas/store'
import { useFinanceiro } from './store'
import { buscarDoBanco, criarDoExtrato, criarRegraConciliacao, desfazerExtrato, ignorarExtrato, importarExtrato, inativarRegraConciliacao, listContasComExtrato, listExtrato, listRegrasConciliacao, vincularExtrato } from './api'
import { lerOfx, type LinhaExtrato } from './ofx'
import { conciliar, padraoDoMemo, resumoConciliacao, type Candidato, type LinhaConciliada, type RegraConciliacao } from './conciliar'
import { liquidoDe } from './calculos'
import type { Movimento } from './types'
import fin from './financeiro.module.css'
import s from './conciliacao.module.css'

type Filtro = 'todos' | 'pendentes' | 'conciliados'
const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—')

const SITUACAO: Record<LinhaConciliada['situacao'], { label: string; cls: string }> = {
  conciliado: { label: 'Conciliado', cls: 'stOk' },
  sugestao: { label: 'Sugestão', cls: 'stSug' },
  regra: { label: 'Reconhecido', cls: 'stRegra' },
  'sem-par': { label: 'Sem par', cls: 'stSem' },
  ignorado: { label: 'Ignorado', cls: 'stIgn' },
}

const formaDoMemo = (memo: string) => (/PIX/i.test(memo) ? 'Pix' : /BOLETO/i.test(memo) ? 'Boleto' : /TED|DOC/i.test(memo) ? 'Transferência' : '')
const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios)
const hoje = () => new Date().toLocaleDateString('sv-SE')

/**
 * Conciliação bancária num grid só: cada linha do extrato mostra o par que o sistema achou
 * e as ações na própria linha (aceitar, trocar, criar, ignorar). Nada abre em outra tela.
 * O extrato fica gravado por carteira (FITID único: reimportar o mesmo arquivo não duplica).
 */
export function ConciliacaoPage() {
  const { carteiras, movimentos: todosMovimentos, recarregar } = useFinanceiro()
  const { data: empresasData } = useEmpresasQuery()
  const empresas = empresasData ?? []
  const nomeEmpresa = (id?: string) => empresas.find((e) => e.id === id)?.nome ?? ''
  const ativas = carteiras.filter((c) => c.status === 'ativo')
  const [escolhida, setEscolhida] = useState('')
  // Abre numa carteira da empresa padrão (cada CNPJ tem as suas contas).
  const padrao = empresaPadrao(empresas.filter((e) => e.status === 'ativo'))?.id ?? ''
  const carteiraId = ativas.some((c) => c.id === escolhida) ? escolhida : ((ativas.find((c) => c.empresaId === padrao) ?? ativas[0])?.id ?? '')
  const carteira = carteiras.find((c) => c.id === carteiraId)
  // O par do extrato só pode ser lançamento da empresa dona da conta.
  const movimentos = todosMovimentos.filter((m) => !carteira?.empresaId || !m.empresaId || m.empresaId === carteira.empresaId)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [aberta, setAberta] = useState<{ id: string; modo: 'vincular' | 'criar' } | null>(null)
  const [aviso, setAviso] = useState('')
  const [trabalhando, setTrabalhando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: linhasApi, isLoading } = useQuery({ queryKey: ['financeiro', 'extrato', carteiraId], queryFn: () => listExtrato(carteiraId), enabled: !!carteiraId })
  const { data: regrasApi } = useQuery({ queryKey: ['financeiro', 'regras-conciliacao'], queryFn: listRegrasConciliacao })
  // CPF/CNPJ do cadastro de cada parceiro: o extrato traz o da outra ponta e é o sinal mais firme do par.
  const { data: fornecedoresData } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores })
  const { data: clientesData } = useQuery({ queryKey: ['clientes'], queryFn: listClientes })
  // Conta ligada a uma integração com extrato: o extrato vem pela API ("Buscar do banco"); o OFX fica de reserva.
  const { data: contasComExtrato } = useQuery({ queryKey: ['financeiro', 'contas-com-extrato'], queryFn: listContasComExtrato })
  const contaBanco = (contasComExtrato ?? []).find((c) => c.carteiraId === carteiraId)
  const regras: RegraConciliacao[] = (regrasApi ?? []).filter((r) => (r.status ?? 'ativo') === 'ativo')

  // Período da tela: começa no mês corrente; filtra as linhas e é o período do "Buscar do banco".
  const [periodo, setPeriodo] = useState(() => ({ de: `${hoje().slice(0, 7)}-01`, ate: hoje() }))
  const { de, ate } = periodo
  const gravadas = (linhasApi ?? []).filter((l) => (!de || l.data >= de) && (!ate || l.data <= ate))
  const fitidDe = new Map(gravadas.map((l) => [l.id, l.fitid]))
  const linhas: LinhaExtrato[] = gravadas.map((l) => ({ id: l.id, data: l.data, valor: l.valor, memo: l.memo, tipo: l.valor >= 0 ? 'credito' : 'debito' }))
  const vinculos: Record<string, string> = Object.fromEntries(gravadas.filter((l) => l.situacao === 'conciliado' && l.movimentoId).map((l) => [l.id, l.movimentoId]))
  // Linha que pagou vários lançamentos: os outros (além do principal) também estão usados.
  const grupoDe = (linhaId: string) => gravadas.find((x) => x.id === linhaId)?.movimentoIds ?? []
  const outrosUsados = gravadas.filter((l) => l.situacao === 'conciliado').flatMap((l) => (l.movimentoIds ?? []).filter((id) => id !== l.movimentoId))
  const ignorados = gravadas.filter((l) => l.situacao === 'ignorado').map((l) => l.id)
  // O motor marca como "conciliado" o par sem dúvida; enquanto não for gravado, é sugestão (um clique aceita).
  const contexto = {
    documentos: Object.fromEntries([...(fornecedoresData ?? []), ...(clientesData ?? [])].map((p) => [p.id, (p.cpfCnpj ?? '').replace(/\D/g, '')])),
    proprios: new Set((empresasData ?? []).map((e) => (e.cnpj ?? '').replace(/\D/g, '')).filter(Boolean)),
  }
  const resultado: LinhaConciliada[] = conciliar({ linhas, movimentos, vinculos, ignorados, regras, contexto, outrosUsados }).map((l) =>
    l.situacao === 'conciliado' && !vinculos[l.linha.id] ? { ...l, situacao: 'sugestao' } : l,
  )
  const r = resumoConciliacao(resultado)
  const visiveis = resultado.filter((l) => {
    if (filtro === 'pendentes') return l.situacao === 'sugestao' || l.situacao === 'sem-par' || l.situacao === 'regra'
    if (filtro === 'conciliados') return l.situacao === 'conciliado' || l.situacao === 'ignorado'
    return true
  })
  const datas = linhas.map((l) => l.data).sort()
  const fortes = resultado.filter((l) => l.situacao === 'sugestao' && l.movimento && l.confianca === 'exata').length

  /** Executa no servidor, recarrega e mostra o motivo quando ele recusa. */
  const exec = async (acao: () => Promise<unknown>): Promise<boolean> => {
    setTrabalhando(true)
    try {
      await acao()
      return true
    } catch (err) {
      setAviso(getErrorMessage(err))
      return false
    } finally {
      await recarregar()
      setTrabalhando(false)
    }
  }

  // ── importação ──
  const carregarTexto = async (texto: string) => {
    const e = lerOfx(texto)
    if (e.linhas.length === 0) {
      setAviso('Não encontrei transações neste arquivo. É um .ofx exportado do banco?')
      return
    }
    setAberta(null)
    await exec(async () => {
      const res = await importarExtrato(carteiraId, e.linhas.map((l) => ({ fitid: l.id, data: l.data, valor: l.valor, memo: l.memo })))
      const ja = res.jaImportadas ? ` · ${res.jaImportadas} ${plural(res.jaImportadas, 'já estava', 'já estavam')} no sistema` : ''
      setAviso(`${res.novas} ${plural(res.novas, 'linha nova importada', 'linhas novas importadas')}${ja}.`)
    })
  }
  const buscarBanco = async () => {
    setAberta(null)
    await exec(async () => {
      const res = await buscarDoBanco(carteiraId, de, ate)
      const ja = res.jaImportadas ? ` · ${res.jaImportadas} ${plural(res.jaImportadas, 'já estava', 'já estavam')} no sistema` : ''
      setAviso(
        res.lidas === 0
          ? `Nenhuma transação no banco de ${dataBR(res.de)} a ${dataBR(res.ate)}.`
          : `${res.lidas} ${plural(res.lidas, 'transação lida', 'transações lidas')} do banco (${dataBR(res.de)} a ${dataBR(res.ate)}): ${res.novas} ${plural(res.novas, 'nova', 'novas')}${ja}.`,
      )
    })
  }
  const onArquivo = (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]
    if (!f) return
    f.text().then(carregarTexto)
    ev.target.value = ''
  }

  // ── ações de linha ──
  /** Vincula a linha ao lançamento: se ainda estava em aberto, o servidor liquida na data do extrato. */
  /** Vários lançamentos numa linha só (ex.: pró-labore + participação num Pix): a soma já bate. */
  const aceitarVarios = async (l: LinhaConciliada, ms: Movimento[]) => {
    if (ms.length === 1) return aceitar(l, ms[0])
    if (await exec(() => vincularExtrato(l.linha.id, ms.map((m) => m.id)))) setAberta(null)
  }
  const aceitar = async (l: LinhaConciliada, m: Movimento) => {
    // Valor do extrato diferente do lançado (digitação, por exemplo): o valor pago passa a ser o do banco.
    const doBanco = Math.abs(l.linha.valor)
    const lancado = liquidoDe(m)
    if (!m.pagoEm && Math.abs(doBanco - lancado) >= 0.005) {
      const ok = await confirmar({
        titulo: 'Valor diferente do lançado',
        mensagem: `O banco mostra ${formatBRL(doBanco)} e o lançamento nº ${m.numero} tem ${formatBRL(lancado)}. Ao conciliar, o valor pago do lançamento fica ${formatBRL(doBanco)} (o do extrato).`,
        confirmar: 'Conciliar com o valor do extrato',
        cancelar: 'Voltar',
      })
      if (!ok) return
    }
    if (await exec(() => vincularExtrato(l.linha.id, m.id))) setAberta(null)
  }
  const aceitarTodas = async () => {
    // Em lote só as fortes (valor exato + nome ou CNPJ); as outras pedem um olhar, uma a uma.
    const pares = resultado.filter((l) => l.situacao === 'sugestao' && l.movimento && l.confianca === 'exata')
    let ok = 0
    const falhas: string[] = []
    setTrabalhando(true)
    for (const l of pares) {
      try {
        await vincularExtrato(l.linha.id, l.movimento!.id)
        ok++
      } catch (err) {
        falhas.push(`${l.movimento!.parceiroNome}: ${getErrorMessage(err)}`)
      }
    }
    await recarregar()
    setTrabalhando(false)
    const resto = falhas.length > 3 ? ` (+${falhas.length - 3})` : ''
    setAviso(`${ok} de ${pares.length} ${plural(pares.length, 'conciliada', 'conciliadas')}.${falhas.length ? ` Não foi possível: ${falhas.slice(0, 3).join(' · ')}${resto}` : ''}`)
  }
  const criar = async (l: LinhaConciliada, dados: { parceiroNome: string; parceiroId: string; descricao: string; planoContaId: string; centroCustoId: string; lembrar: boolean }) => {
    const tipo: Movimento['tipo'] = l.linha.tipo === 'credito' ? 'receber' : 'pagar'
    const feito = await exec(async () => {
      await criarDoExtrato({ linhaId: l.linha.id, parceiroNome: dados.parceiroNome, parceiroId: dados.parceiroId, descricao: dados.descricao, planoContaId: dados.planoContaId, centroCustoId: dados.centroCustoId, formaPagamento: formaDoMemo(l.linha.memo), empresaId: carteira?.empresaId ?? '' })
      if (dados.lembrar) {
        const regra: RegraConciliacao = { id: crypto.randomUUID(), padrao: padraoDoMemo(l.linha.memo), tipo, parceiroNome: dados.parceiroNome, planoContaId: dados.planoContaId, centroCustoId: dados.centroCustoId, descricao: dados.descricao }
        // Uma regra por padrão: a nova substitui a antiga.
        for (const antiga of regras.filter((x) => x.padrao === regra.padrao)) await inativarRegraConciliacao(antiga.id)
        await criarRegraConciliacao(regra)
        setAviso(`Aprendido: quando vier "${regra.padrao}", o sistema já sugere ${dados.parceiroNome}.`)
      }
    })
    if (feito) setAberta(null)
  }

  const nomesConhecidos = [...new Set(movimentos.map((m) => m.parceiroNome).filter(Boolean))].sort()
  const usados = new Set([...Object.values(vinculos), ...outrosUsados])

  return (
    <>
      <PageHeader
        breadcrumb="Financeiro"
        title="Conciliação"
        subtitle="Traga o extrato do banco (pela API ou .ofx) e feche cada linha aqui mesmo: aceitar o par, trocar, criar o lançamento ou ignorar."
        action={
          <div className={s.acoes}>
            <label className={s.carteiraSel}>
              Carteira
              <select value={carteiraId} onChange={(e) => { setEscolhida(e.target.value); setAberta(null) }}>
                {ativas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}{c.empresaId ? ` · ${nomeEmpresa(c.empresaId)}` : ''}</option>
                ))}
              </select>
            </label>
            <label className={s.carteiraSel}>
              De
              <input type="date" className={s.data} value={de} max={ate || undefined} onChange={(e) => setPeriodo({ de: e.target.value, ate })} />
            </label>
            <label className={s.carteiraSel}>
              Até
              <input type="date" className={s.data} value={ate} min={de || undefined} onChange={(e) => setPeriodo({ de, ate: e.target.value })} />
            </label>
            {contaBanco && (
              <>
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnPrimary}`}
                  disabled={trabalhando || !de || !ate}
                  onClick={buscarBanco}
                  title={`Lê o extrato pela API do ${contaBanco.banco}${contaBanco.ambiente === 'sandbox' ? ' (sandbox)' : ''}`}
                >
                  <CloudDownload /> Buscar do banco
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept=".ofx,.OFX,text/plain" hidden onChange={onArquivo} />
            <button
              type="button"
              className={`${ui.btn} ${contaBanco ? ui.btnGhost : ui.btnPrimary}`}
              disabled={!carteiraId || trabalhando}
              onClick={() => fileRef.current?.click()}
              title={contaBanco ? 'Alternativa quando a API do banco está fora' : undefined}
            >
              <FileUp /> Importar .ofx
            </button>
          </div>
        }
      />

      {aviso && (
        <div className={s.aviso}>
          <Lightbulb size={14} /> {aviso}
          <button type="button" onClick={() => setAviso('')} title="Fechar"><X size={13} /></button>
        </div>
      )}

      {!carteiraId ? (
        <div className={`${ui.card} ${s.vazio}`}>
          <FileUp size={28} />
          <b>Nenhuma conta cadastrada</b>
          <span>
            Cadastre a conta bancária em <Link to="/cadastros/unidades">Cadastros › Empresas</Link>, aba Dados bancários. Para trazer o extrato pela API, ligue a conta ao banco em
            Administrativo › Integrações Bancárias (campo "Conta do Caixa").
          </span>
        </div>
      ) : linhas.length === 0 ? (
        <div className={`${ui.card} ${s.vazio}`}>
          <FileUp size={28} />
          <b>{isLoading ? 'Carregando o extrato...' : (linhasApi ?? []).length > 0 ? `Nenhuma linha do extrato entre ${dataBR(de)} e ${dataBR(ate)}` : `Nenhum extrato importado em ${carteira?.nome ?? 'esta carteira'}`}</b>
          <span>
            {contaBanco
              ? `Clique em "Buscar do banco" para trazer o extrato pela API do ${contaBanco.banco}, ou importe o .ofx. Buscar ou reimportar não duplica linhas.`
              : 'Importe o .ofx exportado pelo banco. Reimportar o mesmo arquivo não duplica linhas.'}
          </span>
          <div className={s.passos}>
            <span><i>1</i> O sistema casa cada linha com um lançamento (valor, nome, documento, data).</span>
            <span><i>2</i> O que bateu vira sugestão: um clique (ou "Aceitar todas") concilia e dá a baixa.</span>
            <span><i>3</i> Você aceita, troca, cria ou ignora na própria linha. O sistema aprende o de/para.</span>
          </div>
        </div>
      ) : (
        <>
          <div className={s.resumo}>
            <div className={s.extratoInfo}>
              <b>{carteira?.nome ?? 'Carteira'}</b>
              <span>banco {carteira?.banco || '—'} · ag. {carteira?.agencia || '—'} · conta {carteira?.conta || '—'}</span>
              <span>período {dataBR(datas[0] ?? '')} a {dataBR(datas[datas.length - 1] ?? '')} · {r.total} linhas</span>
            </div>
            <div className={fin.segmento}>
              <button type="button" className={filtro === 'todos' ? fin.on : ''} onClick={() => setFiltro('todos')}>Todas ({r.total})</button>
              <button type="button" className={filtro === 'pendentes' ? fin.on : ''} onClick={() => setFiltro('pendentes')}>Pendentes ({r.sugestoes + r.semPar})</button>
              <button type="button" className={filtro === 'conciliados' ? fin.on : ''} onClick={() => setFiltro('conciliados')}>Fechadas ({r.conciliados + r.ignorados})</button>
            </div>
            <div className={s.kpis}>
              <span className={`${s.st} ${s.stOk}`}><CheckCircle2 /> {r.conciliados} conciliadas</span>
              <span className={`${s.st} ${s.stSug}`}><Wand2 /> {r.sugestoes} sugestões</span>
              <span className={`${s.st} ${s.stSem}`}><Search /> {r.semPar} sem par</span>
              {r.ignorados > 0 && <span className={`${s.st} ${s.stIgn}`}><Ban /> {r.ignorados} ignoradas</span>}
            </div>
            {fortes > 0 && (
              <button
                type="button"
                className={`${ui.btn} ${ui.btnPrimary}`}
                disabled={trabalhando}
                onClick={aceitarTodas}
                title="Aceita de uma vez só as sugestões fortes (valor exato e nome ou CNPJ no extrato). As outras, confira e aceite uma a uma."
              >
                <CheckCheck /> Aceitar as {fortes} {fortes === 1 ? 'sugestão forte' : 'sugestões fortes'}
              </button>
            )}
          </div>

          <div className={ui.card}>
            <table className={s.grid}>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Data</th>
                  <th>Linha do extrato</th>
                  <th style={{ width: 130 }} className={s.r}>Valor</th>
                  <th style={{ width: 120 }}>Situação</th>
                  <th>
                    Lançamento no sistema <Hint text="O par que o sistema encontrou. Verde: conciliado. Amarelo: sugestão para você confirmar. Cinza: não achou nada parecido. Lançamento ainda pendente de aprovação é aprovado ao conciliar: o extrato prova que já saiu (ou entrou)." />
                  </th>
                  <th style={{ width: 250 }} />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l) => (
                  <LinhaExtratoRow
                    key={l.linha.id}
                    l={l}
                    fitid={fitidDe.get(l.linha.id) ?? ''}
                    aberta={aberta?.id === l.linha.id ? aberta.modo : null}
                    onAbrir={(modo) => setAberta(aberta?.id === l.linha.id && aberta.modo === modo ? null : { id: l.linha.id, modo })}
                    onFechar={() => setAberta(null)}
                    onAceitar={(m) => aceitar(l, m)}
                    onAceitarVarios={(ms) => aceitarVarios(l, ms)}
                    qtdGrupo={grupoDe(l.linha.id).length}
                    onDesfazer={() => exec(() => desfazerExtrato(l.linha.id))}
                    onIgnorar={() => exec(() => ignorarExtrato(l.linha.id))}
                    onDesfazerIgnorar={() => exec(() => desfazerExtrato(l.linha.id))}
                    onCriar={(d) => criar(l, d)}
                    movimentosAbertos={movimentos.filter((m) => !m.cancelado && !usados.has(m.id))}
                    nomesConhecidos={nomesConhecidos}
                  />
                ))}
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={6} className={s.nada}>Nada aqui com este filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className={s.rodape}>
              <Lightbulb size={14} />
              <span>
                <kbd>Enter</kbd> numa linha aceita a sugestão. Ao criar um lançamento a partir do extrato, o sistema guarda o de/para: da próxima vez, a mesma descrição já vem reconhecida.
                {regras.length > 0 && (
                  <> Regras aprendidas: {regras.map((rg) => (
                    <span key={rg.id} className={s.regraChip} title={`${rg.parceiroNome} · ${rg.descricao}`}>
                      "{rg.padrao}" → {rg.parceiroNome}
                      <button type="button" onClick={() => exec(() => inativarRegraConciliacao(rg.id))} title="Esquecer regra"><X size={11} /></button>
                    </span>
                  ))}</>
                )}
              </span>
            </div>
          </div>
        </>
      )}
    </>
  )
}

interface RowProps {
  l: LinhaConciliada
  /** Identificador da transação no banco (FITID). */
  fitid: string
  aberta: 'vincular' | 'criar' | null
  onAbrir: (modo: 'vincular' | 'criar') => void
  onFechar: () => void
  onAceitar: (m: Movimento) => void
  onAceitarVarios: (ms: Movimento[]) => void
  /** Quantos lançamentos a linha conciliada pagou (mais de 1 = grupo). */
  qtdGrupo: number
  onDesfazer: () => void
  onIgnorar: () => void
  onDesfazerIgnorar: () => void
  onCriar: (d: { parceiroNome: string; parceiroId: string; descricao: string; planoContaId: string; centroCustoId: string; lembrar: boolean }) => void
  movimentosAbertos: Movimento[]
  nomesConhecidos: string[]
}

function LinhaExtratoRow({ l, fitid, aberta, onAbrir, onFechar, onAceitar, onAceitarVarios, qtdGrupo, onDesfazer, onIgnorar, onDesfazerIgnorar, onCriar, movimentosAbertos, nomesConhecidos }: RowProps) {
  const st = SITUACAO[l.situacao]
  const credito = l.linha.tipo === 'credito'
  const m = l.movimento
  return (
    <>
      <tr
        className={`${s[st.cls + 'Row']} ${aberta ? s.rowAberta : ''}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && l.situacao === 'sugestao' && m && e.target === e.currentTarget) onAceitar(m)
        }}
      >
        <td className={s.data}>{dataBR(l.linha.data)}</td>
        <td>
          <div className={s.memo}>
            <span>{l.linha.memo}</span>
            <small>{fitid}</small>
          </div>
        </td>
        <td className={`${s.r} ${s.valor} ${credito ? s.cred : s.deb}`}>{credito ? '+' : '−'} {formatBRL(Math.abs(l.linha.valor))}</td>
        <td>
          <span className={`${s.st} ${s[st.cls]}`}>
            {l.situacao === 'conciliado' && <CheckCircle2 />}
            {l.situacao === 'sugestao' && <Wand2 />}
            {l.situacao === 'regra' && <Sparkles />}
            {l.situacao === 'sem-par' && <Search />}
            {l.situacao === 'ignorado' && <Ban />}
            {st.label}
          </span>
        </td>
        <td>
          {m && (l.situacao === 'conciliado' || l.situacao === 'sugestao') && (
            <div className={s.par}>
              <span>
                <i className={`${fin.tipoDot} ${fin[m.tipo]}`} />
                <b>{m.parceiroNome}</b> · {m.descricao}
                {m.totalParcelas > 1 && <span className={fin.parcelaTag}>{m.parcela}/{m.totalParcelas}</span>}
                {l.situacao === 'conciliado' && qtdGrupo > 1 && <span className={fin.parcelaTag}>+ {qtdGrupo - 1} lançamento{qtdGrupo > 2 ? 's' : ''}</span>}
              </span>
              <small>
                {m.numero ? `nº ${m.numero} · ` : ''}
                {m.pagoEm ? `pago em ${dataBR(m.pagoEm)}` : `vence ${dataBR(m.vencimento)}`} · {formatBRL(liquidoDe(m))}
                {l.motivo && l.situacao === 'sugestao' && <> · <em className={s[`conf_${l.confianca}`]}>{l.motivo}</em></>}
                {/* O extrato prova que já saiu/entrou: confirmar aprova o pendente junto com a baixa. */}
                {l.situacao === 'sugestao' && !m.pagoEm && (m.aprovacao ?? 'pendente') !== 'aprovado' && <> · aprovação pendente: confirmar também aprova</>}
              </small>
            </div>
          )}
          {l.situacao === 'conciliado' && !m && <span className={s.mut}>Lançamento vinculado</span>}
          {l.situacao === 'regra' && l.regra && (
            <div className={s.par}>
              <span><Sparkles size={13} className={s.regraIcon} /> Criar como <b>{l.regra.parceiroNome}</b> · {l.regra.descricao}</span>
              <small>regra aprendida: "{l.regra.padrao}"</small>
            </div>
          )}
          {l.situacao === 'sem-par' && <span className={s.mut}>Nenhum lançamento parecido{l.candidatos.length ? ` (${l.candidatos.length} com valor próximo)` : ''}</span>}
          {l.situacao === 'ignorado' && <span className={s.mut}>Não entra no sistema (tarifa, transferência interna...)</span>}
        </td>
        <td>
          <div className={s.btns}>
            {l.situacao === 'sugestao' && m && (
              <button type="button" className={`${s.act} ${s.actOk}`} onClick={() => onAceitar(m)} title="Aceitar a sugestão (Enter)"><Check /> Aceitar</button>
            )}
            {l.situacao === 'regra' && l.regra && (
              <button type="button" className={`${s.act} ${s.actOk}`} onClick={() => onCriar({ parceiroNome: l.regra!.parceiroNome, parceiroId: '', descricao: l.regra!.descricao, planoContaId: l.regra!.planoContaId, centroCustoId: l.regra!.centroCustoId, lembrar: false })} title="Criar o lançamento como a regra manda"><Plus /> Criar</button>
            )}
            {(l.situacao === 'sugestao' || l.situacao === 'sem-par' || l.situacao === 'regra') && (
              <>
                <button type="button" className={`${s.act} ${aberta === 'vincular' ? s.actOn : ''}`} onClick={() => onAbrir('vincular')} title="Escolher outro lançamento em aberto"><Link2 /> {l.situacao === 'sugestao' ? 'Trocar' : 'Vincular'}</button>
                {l.situacao !== 'regra' && (
                  <button type="button" className={`${s.act} ${aberta === 'criar' ? s.actOn : ''}`} onClick={() => onAbrir('criar')} title="Criar o lançamento a partir desta linha"><Plus /> Criar</button>
                )}
                <button type="button" className={`${s.act} ${s.actMut}`} onClick={onIgnorar} title="Não é um lançamento (tarifa, aplicação, transferência entre contas)"><Ban /></button>
              </>
            )}
            {l.situacao === 'conciliado' && (
              <button type="button" className={`${s.act} ${s.actMut}`} onClick={onDesfazer} title="Desfazer a conciliação"><Undo2 /> Desfazer</button>
            )}
            {l.situacao === 'ignorado' && (
              <button type="button" className={`${s.act} ${s.actMut}`} onClick={onDesfazerIgnorar}><RotateCcw /> Voltar</button>
            )}
          </div>
        </td>
      </tr>
      {aberta === 'vincular' && (
        <tr className={s.painelRow}>
          <td colSpan={6}>
            <Vincular l={l} movimentos={movimentosAbertos} onEscolher={onAceitarVarios} onFechar={onFechar} />
          </td>
        </tr>
      )}
      {aberta === 'criar' && (
        <tr className={s.painelRow}>
          <td colSpan={6}>
            <Criar l={l} nomes={nomesConhecidos} onCriar={onCriar} onFechar={onFechar} />
          </td>
        </tr>
      )}
    </>
  )
}

/** Lista dos lançamentos em aberto para escolher o par, já ordenada do mais parecido ao menos. */
function Vincular({ l, movimentos, onEscolher, onFechar }: { l: LinhaConciliada; movimentos: Movimento[]; onEscolher: (ms: Movimento[]) => void; onFechar: () => void }) {
  const [busca, setBusca] = useState('')
  // Marcados para vincular juntos (a linha pagou vários: pró-labore + participação, por exemplo).
  const [marcados, setMarcados] = useState<Movimento[]>([])
  const alternar = (m: Movimento) => setMarcados((xs) => (xs.some((x) => x.id === m.id) ? xs.filter((x) => x.id !== m.id) : [...xs, m]))
  const somaMarcados = marcados.reduce((a, m) => a + liquidoDe(m), 0)
  const credito = l.linha.tipo === 'credito'
  const pontos = new Map<string, Candidato>(l.candidatos.map((c) => [c.movimento.id, c]))
  const q = semAcento(busca.trim())
  const alvo = Math.abs(l.linha.valor)
  const lista = movimentos
    .filter((m) => (credito ? m.tipo === 'receber' : m.tipo === 'pagar'))
    .filter((m) => !q || buscaPeloNumero(busca, m.numero) || semAcento(`${m.parceiroNome} ${m.descricao} ${m.documento}`).includes(q))
    .sort((a, b) => {
      const pa = pontos.get(a.id)?.pontos ?? -Math.abs(liquidoDe(a) - alvo) / 100
      const pb = pontos.get(b.id)?.pontos ?? -Math.abs(liquidoDe(b) - alvo) / 100
      return pb - pa
    })
        .slice(0, 12)
  // Marcados que saíram da lista pela busca continuam no topo (não somem da soma sem o usuário ver).
  const visiveis = [...marcados.filter((m) => !lista.some((x) => x.id === m.id)), ...lista]
  const diferenca = Math.round((alvo - somaMarcados) * 100) / 100
  const bate = marcados.length > 0 && Math.abs(diferenca) < 0.005
  return (
    <div className={s.painel}>
      <div className={s.painelHead}>
        <b>Vincular a lançamento(s) {credito ? 'a receber' : 'a pagar'}</b>
        <div className={ui.search}>
          <Search />
          <input autoFocus placeholder="Buscar por nº, nome, descrição ou documento" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button type="button" className={ui.iconBtn} onClick={onFechar} title="Fechar"><X /></button>
      </div>
      <div className={s.lista}>
        {visiveis.map((m) => {
          const c = pontos.get(m.id)
          const marcado = marcados.some((x) => x.id === m.id)
          return (
            <button key={m.id} type="button" className={`${s.opcao} ${marcado ? s.opcaoMarcada : ''}`} onClick={() => alternar(m)} aria-pressed={marcado}>
              <span className={s.opcaoNome}><input type="checkbox" readOnly checked={marcado} tabIndex={-1} className={s.opcaoCheck} />{m.numero ? <>nº {m.numero} · </> : null}<b>{m.parceiroNome}</b> · {m.descricao}{m.documento ? ` · ${m.documento}` : ''}</span>
              <span className={s.opcaoMeta}>{m.pagoEm ? `pago ${dataBR(m.pagoEm)}` : `vence ${dataBR(m.vencimento)}${m.aprovacao === 'aprovado' ? '' : ' · aguardando aprovação'}`}</span>
              <span className={`${s.opcaoValor} ${Math.abs(liquidoDe(m) - alvo) < 0.005 ? s.cred : ''}`}>{formatBRL(liquidoDe(m))}</span>
              <span className={s.opcaoConf}>{c ? <em className={s[`conf_${c.confianca}`]}>{c.motivo}</em> : <em className={s.mut}>valor diferente</em>}</span>
            </button>
          )
        })}
        {visiveis.length === 0 && <div className={s.nada}>Nenhum lançamento em aberto com esse filtro. Use "Criar".</div>}
      </div>
      <div className={s.vincularRodape}>
        <span>
          {marcados.length === 0
            ? 'Marque um ou mais lançamentos (vários quando um só pagamento quitou mais de um lançamento).'
            : <>{marcados.length} marcado{marcados.length > 1 ? 's' : ''} · <b>{formatBRL(somaMarcados)}</b> de {formatBRL(alvo)} {bate ? <em className={s.cred}>✓ bate com o extrato</em> : <em className={s.deb}>{diferenca > 0 ? `faltam ${formatBRL(diferenca)}` : `sobram ${formatBRL(-diferenca)}`}</em>}</>}
        </span>
        <button
          type="button"
          className={`${ui.btn} ${ui.btnPrimary}`}
          disabled={marcados.length === 0 || (marcados.length > 1 && !bate)}
          title={marcados.length > 1 && !bate ? 'Com mais de um lançamento, a soma precisa ser o valor do extrato' : undefined}
          onClick={() => onEscolher(marcados)}
        >
          <Link2 /> Vincular {marcados.length > 1 ? `${marcados.length} lançamentos` : ''}
        </button>
      </div>
    </div>
  )
}

/** Formulário compacto: cria o lançamento já liquidado, com data e valor do extrato. */
function Criar({ l, nomes, onCriar, onFechar }: { l: LinhaConciliada; nomes: string[]; onCriar: RowProps['onCriar']; onFechar: () => void }) {
  const credito = l.linha.tipo === 'credito'
  const { analiticas } = usePlanoContas()
  const { data: categorias } = useQuery({ queryKey: ['categorias-custo'], queryFn: listCategoriasCusto })
  const contas = analiticas().filter((c) => (credito ? c.grupoDre === 'Receita' : c.grupoDre === 'Despesa') && c.status === 'ativo')
  // Quem pagou/recebeu: do cadastro (fornecedor na saída, cliente na entrada). O CNPJ do extrato acha o cadastro
  // ou, se ainda não existe, cadastra pela Receita ali mesmo.
  const qc = useQueryClient()
  const { data: parceirosData } = useQuery({ queryKey: [credito ? 'clientes' : 'fornecedores'], queryFn: credito ? listClientes : listFornecedores })
  const parceiros = (parceirosData ?? []).filter((p) => p.status === 'ativo')
  const nomeDe = (p: Parceiro) => p.nomeFantasia || p.nome
  const cnpj = cnpjDoMemo(l.linha.memo)
  const doCnpj = cnpj ? parceiros.find((p) => p.cpfCnpj.replace(/\D/g, '') === cnpj) : undefined
  const [parceiroNome, setParceiroNome] = useState(l.regra?.parceiroNome ?? '')
  const [parceiroId, setParceiroId] = useState('')
  const [cadastrando, setCadastrando] = useState(false)
  const [erroCadastro, setErroCadastro] = useState('')
  /** Cadastro completo aberto (o mesmo de Cadastros › Fornecedores/Clientes), já preenchido. */
  const [modal, setModal] = useState<{ inicial: Parceiro | null; nome: string } | null>(null)
  const [salvandoModal, setSalvandoModal] = useState(false)
  const [erroModal, setErroModal] = useState<string | null>(null)
  const [achou, setAchou] = useState(false)
  if (!achou && doCnpj) {
    setAchou(true)
    setParceiroNome(nomeDe(doCnpj))
    setParceiroId(doCnpj.id)
  }
  const setParceiro = (nome: string) => {
    setParceiroNome(nome)
    setParceiroId(parceiros.find((p) => nomeDe(p) === nome || p.nome === nome)?.id ?? '')
  }
  // Com CNPJ: consulta a Receita e abre o cadastro completo já preenchido. Sem CNPJ (Pix a pessoa física): abre com o
  // nome digitado, para completar CPF, contato e banco ali mesmo.
  const cadastrar = async () => {
    setErroCadastro('')
    setErroModal(null)
    if (!cnpj) return setModal({ inicial: null, nome: parceiroNome.trim() })
    setCadastrando(true)
    try {
      const c = await consultarCnpj(cnpj)
      setModal({
        nome: '',
        inicial: {
          ...emptyParceiro, id: '', tipo: 'juridica', nome: c.razaoSocial, nomeFantasia: c.nomeFantasia, cpfCnpj: formatCnpj(cnpj), cidade: c.cidade,
          endereco: { ...emptyParceiro.endereco, cep: c.cep, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento, bairro: c.bairro },
          telefone: c.telefone, email: c.email,
          contatos: c.telefone || c.email ? [{ ...novoContato(), nome: c.nomeFantasia || c.razaoSocial, telefone: c.telefone, email: c.email }] : [],
        },
      })
    } catch (e) {
      // Receita fora do ar: abre do mesmo jeito, com o CNPJ (a pessoa completa).
      setErroCadastro(`Receita: ${getErrorMessage(e)}`)
      setModal({ nome: parceiroNome.trim(), inicial: { ...emptyParceiro, id: '', tipo: 'juridica', nome: parceiroNome.trim(), cpfCnpj: formatCnpj(cnpj) } })
    } finally {
      setCadastrando(false)
    }
  }
  const salvarModal = async (form: ParceiroForm) => {
    setSalvandoModal(true)
    setErroModal(null)
    try {
      const criado = await (credito ? createCliente({ ...form, id: '' } as Parceiro) : createFornecedor({ ...form, id: '' } as Parceiro))
      await qc.invalidateQueries({ queryKey: [credito ? 'clientes' : 'fornecedores'] })
      setParceiroNome(nomeDe(criado))
      setParceiroId(criado.id)
      setAchou(true)
      setModal(null)
    } catch (e) {
      setErroModal(getErrorMessage(e))
    } finally {
      setSalvandoModal(false)
    }
  }
  const [descricao, setDescricao] = useState(l.regra?.descricao ?? l.linha.memo)
  const [planoContaId, setPlano] = useState(l.regra?.planoContaId ?? '')
  const [centroCustoId, setCentro] = useState(l.regra?.centroCustoId ?? '')
  const [lembrar, setLembrar] = useState(true)
  const ok = parceiroNome.trim().length > 1 && descricao.trim().length > 1
  const padrao = padraoDoMemo(l.linha.memo)
  return (
    <div className={s.painel}>
      <div className={s.painelHead}>
        <b>Criar lançamento {credito ? 'a receber' : 'a pagar'} já liquidado</b>
        <span className={s.mut}>{dataBR(l.linha.data)} · {formatBRL(Math.abs(l.linha.valor))} · valor e data vêm do extrato</span>
        <button type="button" className={ui.iconBtn} onClick={onFechar} title="Fechar"><X /></button>
      </div>
      <div className={s.form}>
        <label>
          {credito ? 'Cliente' : 'Fornecedor / funcionário'}
          <input list={`nomes-${l.linha.id}`} autoFocus value={parceiroNome} onChange={(e) => setParceiro(e.target.value)} placeholder="Quem pagou / quem recebeu" />
          <datalist id={`nomes-${l.linha.id}`}>
            {[...new Set([...parceiros.map(nomeDe), ...nomes])].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          {parceiroId ? (
            <small className={s.cadastroOk}><Check size={12} /> do cadastro{doCnpj?.id === parceiroId && cnpj ? ` (CNPJ ${formatCnpj(cnpj)})` : ''}</small>
          ) : cnpj ? (
            <button type="button" className={s.cadastrarDoExtrato} onClick={() => void cadastrar()} disabled={cadastrando}>
              <UserPlus size={13} /> {cadastrando ? 'Consultando a Receita...' : `Cadastrar ${credito ? 'cliente' : 'fornecedor'} pelo CNPJ ${formatCnpj(cnpj)}`}
            </button>
          ) : (
            <button type="button" className={s.cadastrarDoExtrato} onClick={() => void cadastrar()} disabled={cadastrando}>
              <UserPlus size={13} /> {parceiroNome.trim().length > 1 ? `Cadastrar "${parceiroNome.trim()}" como ${credito ? 'cliente' : 'fornecedor'}` : `Novo ${credito ? 'cliente' : 'fornecedor'}`}
            </button>
          )}
          {erroCadastro && <small className={s.cadastroErro}>{erroCadastro}</small>}
        </label>
        {modal && (
          <ParceiroFormModal
            open
            titulo={credito ? 'Cliente' : 'Fornecedor'}
            tipoParceiro={credito ? 'cliente' : 'fornecedor'}
            icon={credito ? <Building2 /> : <Truck />}
            initial={modal.inicial}
            nomeInicial={modal.nome}
            error={erroModal}
            busy={salvandoModal}
            onClose={() => setModal(null)}
            onSave={(f) => void salvarModal(f)}
          />
        )}
        <label>
          Descrição
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </label>
        <label>
          Plano de contas
          <select value={planoContaId} onChange={(e) => setPlano(e.target.value)}>
            <option value="">Nenhuma</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>
            ))}
          </select>
        </label>
        <label>
          Centro de custo
          <select value={centroCustoId} onChange={(e) => setCentro(e.target.value)}>
            <option value="">Nenhum</option>
            {(categorias ?? []).filter((c) => c.status === 'ativo').map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={s.formFoot}>
        <label className={s.lembrar}>
          <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
          Lembrar: quando vier <b>"{padrao}"</b>, usar este {credito ? 'cliente' : 'fornecedor'} e esta conta
        </label>
        <div className={s.btns}>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onFechar}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!ok} onClick={() => onCriar({ parceiroNome: parceiroNome.trim(), parceiroId, descricao: descricao.trim(), planoContaId, centroCustoId, lembrar })}>
            <Check /> Criar e conciliar
          </button>
        </div>
      </div>
    </div>
  )
}

/** CNPJ que aparece na linha do extrato (com ou sem pontuação); a própria empresa fica de fora por quem chama. */
function cnpjDoMemo(memo: string): string {
  const m = /(\d{2})\.?(\d{3})\.?(\d{3})\/?(\d{4})-?(\d{2})/.exec(memo)
  return m ? m.slice(1).join('') : ''
}
