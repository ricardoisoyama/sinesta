import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Ban, Check, CheckCheck, CheckCircle2, FileUp, Link2, Lightbulb, Plus, RotateCcw, Search, Sparkles, Undo2, Wand2, X } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Hint } from '@/features/common/Hint'
import { formatBRL } from '@/lib/format'
import { buscaPeloNumero, semAcento } from '@/lib/texto'
import { getErrorMessage } from '@/lib/api'
import { listCategoriasCusto } from '@/features/cadastros/api'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import { usePlanoContas } from '@/features/planoContas/store'
import { useFinanceiro } from './store'
import { criarDoExtrato, criarRegraConciliacao, desfazerExtrato, ignorarExtrato, importarExtrato, inativarRegraConciliacao, listExtrato, listRegrasConciliacao, vincularExtrato } from './api'
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
  const regras: RegraConciliacao[] = (regrasApi ?? []).filter((r) => (r.status ?? 'ativo') === 'ativo')

  const gravadas = linhasApi ?? []
  const fitidDe = new Map(gravadas.map((l) => [l.id, l.fitid]))
  const linhas: LinhaExtrato[] = gravadas.map((l) => ({ id: l.id, data: l.data, valor: l.valor, memo: l.memo, tipo: l.valor >= 0 ? 'credito' : 'debito' }))
  const vinculos: Record<string, string> = Object.fromEntries(gravadas.filter((l) => l.situacao === 'conciliado' && l.movimentoId).map((l) => [l.id, l.movimentoId]))
  const ignorados = gravadas.filter((l) => l.situacao === 'ignorado').map((l) => l.id)
  // O motor marca como "conciliado" o par sem dúvida; enquanto não for gravado, é sugestão (um clique aceita).
  const resultado: LinhaConciliada[] = conciliar({ linhas, movimentos, vinculos, ignorados, regras }).map((l) =>
    l.situacao === 'conciliado' && !vinculos[l.linha.id] ? { ...l, situacao: 'sugestao' } : l,
  )
  const r = resumoConciliacao(resultado)
  const visiveis = resultado.filter((l) => {
    if (filtro === 'pendentes') return l.situacao === 'sugestao' || l.situacao === 'sem-par' || l.situacao === 'regra'
    if (filtro === 'conciliados') return l.situacao === 'conciliado' || l.situacao === 'ignorado'
    return true
  })
  const datas = linhas.map((l) => l.data).sort()

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
  const onArquivo = (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]
    if (!f) return
    f.text().then(carregarTexto)
    ev.target.value = ''
  }

  // ── ações de linha ──
  /** Vincula a linha ao lançamento: se ainda estava em aberto, o servidor liquida na data do extrato. */
  const aceitar = async (l: LinhaConciliada, m: Movimento) => {
    if (await exec(() => vincularExtrato(l.linha.id, m.id))) setAberta(null)
  }
  const aceitarTodas = async () => {
    const pares = resultado.filter((l) => l.situacao === 'sugestao' && l.movimento)
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
  const criar = async (l: LinhaConciliada, dados: { parceiroNome: string; descricao: string; planoContaId: string; centroCustoId: string; lembrar: boolean }) => {
    const tipo: Movimento['tipo'] = l.linha.tipo === 'credito' ? 'receber' : 'pagar'
    const feito = await exec(async () => {
      await criarDoExtrato({ linhaId: l.linha.id, parceiroNome: dados.parceiroNome, descricao: dados.descricao, planoContaId: dados.planoContaId, centroCustoId: dados.centroCustoId, formaPagamento: formaDoMemo(l.linha.memo), empresaId: carteira?.empresaId ?? '' })
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
  const usados = new Set(Object.values(vinculos))

  return (
    <>
      <PageHeader
        breadcrumb="Financeiro"
        title="Conciliação"
        subtitle="Importe o extrato do banco (.ofx) e feche cada linha aqui mesmo: aceitar o par, trocar, criar o lançamento ou ignorar."
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
            <input ref={fileRef} type="file" accept=".ofx,.OFX,text/plain" hidden onChange={onArquivo} />
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!carteiraId || trabalhando} onClick={() => fileRef.current?.click()}>
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
          <b>Nenhuma carteira cadastrada</b>
          <span>Cadastre a conta bancária em <Link to="/financeiro/caixa">Financeiro › Caixa</Link> para importar o extrato dela.</span>
        </div>
      ) : linhas.length === 0 ? (
        <div className={`${ui.card} ${s.vazio}`}>
          <FileUp size={28} />
          <b>{isLoading ? 'Carregando o extrato...' : `Nenhum extrato importado em ${carteira?.nome ?? 'esta carteira'}`}</b>
          <span>Importe o .ofx exportado pelo banco. Reimportar o mesmo arquivo não duplica linhas.</span>
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
            {r.sugestoes > 0 && (
              <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={trabalhando} onClick={aceitarTodas}>
                <CheckCheck /> Aceitar as {r.sugestoes} sugestões
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
                    Lançamento no sistema <Hint text="O par que o sistema encontrou. Verde: conciliado. Amarelo: sugestão para você confirmar. Cinza: não achou nada parecido. Lançamento em aberto só concilia depois de aprovado." />
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
  onDesfazer: () => void
  onIgnorar: () => void
  onDesfazerIgnorar: () => void
  onCriar: (d: { parceiroNome: string; descricao: string; planoContaId: string; centroCustoId: string; lembrar: boolean }) => void
  movimentosAbertos: Movimento[]
  nomesConhecidos: string[]
}

function LinhaExtratoRow({ l, fitid, aberta, onAbrir, onFechar, onAceitar, onDesfazer, onIgnorar, onDesfazerIgnorar, onCriar, movimentosAbertos, nomesConhecidos }: RowProps) {
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
              </span>
              <small>
                {m.numero ? `nº ${m.numero} · ` : ''}
                {m.pagoEm ? `pago em ${dataBR(m.pagoEm)}` : `vence ${dataBR(m.vencimento)}`} · {formatBRL(liquidoDe(m))}
                {l.motivo && l.situacao === 'sugestao' && <> · <em className={s[`conf_${l.confianca}`]}>{l.motivo}</em></>}
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
              <button type="button" className={`${s.act} ${s.actOk}`} onClick={() => onCriar({ parceiroNome: l.regra!.parceiroNome, descricao: l.regra!.descricao, planoContaId: l.regra!.planoContaId, centroCustoId: l.regra!.centroCustoId, lembrar: false })} title="Criar o lançamento como a regra manda"><Plus /> Criar</button>
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
            <Vincular l={l} movimentos={movimentosAbertos} onEscolher={onAceitar} onFechar={onFechar} />
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
function Vincular({ l, movimentos, onEscolher, onFechar }: { l: LinhaConciliada; movimentos: Movimento[]; onEscolher: (m: Movimento) => void; onFechar: () => void }) {
  const [busca, setBusca] = useState('')
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
  return (
    <div className={s.painel}>
      <div className={s.painelHead}>
        <b>Vincular a um lançamento {credito ? 'a receber' : 'a pagar'}</b>
        <div className={ui.search}>
          <Search />
          <input autoFocus placeholder="Buscar por nº, nome, descrição ou documento" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button type="button" className={ui.iconBtn} onClick={onFechar} title="Fechar"><X /></button>
      </div>
      <div className={s.lista}>
        {lista.map((m) => {
          const c = pontos.get(m.id)
          return (
            <button key={m.id} type="button" className={s.opcao} onClick={() => onEscolher(m)}>
              <span className={s.opcaoNome}>{m.numero ? <>nº {m.numero} · </> : null}<b>{m.parceiroNome}</b> · {m.descricao}{m.documento ? ` · ${m.documento}` : ''}</span>
              <span className={s.opcaoMeta}>{m.pagoEm ? `pago ${dataBR(m.pagoEm)}` : `vence ${dataBR(m.vencimento)}${m.aprovacao === 'aprovado' ? '' : ' · aguardando aprovação'}`}</span>
              <span className={`${s.opcaoValor} ${Math.abs(liquidoDe(m) - alvo) < 0.005 ? s.cred : ''}`}>{formatBRL(liquidoDe(m))}</span>
              <span className={s.opcaoConf}>{c ? <em className={s[`conf_${c.confianca}`]}>{c.motivo}</em> : <em className={s.mut}>valor diferente</em>}</span>
            </button>
          )
        })}
        {lista.length === 0 && <div className={s.nada}>Nenhum lançamento em aberto com esse filtro. Use "Criar".</div>}
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
  const [parceiroNome, setParceiro] = useState(l.regra?.parceiroNome ?? '')
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
            {nomes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
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
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!ok} onClick={() => onCriar({ parceiroNome: parceiroNome.trim(), descricao: descricao.trim(), planoContaId, centroCustoId, lembrar })}>
            <Check /> Criar e conciliar
          </button>
        </div>
      </div>
    </div>
  )
}
