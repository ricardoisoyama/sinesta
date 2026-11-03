import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Paperclip, Plus, Receipt, Trash2, X } from 'lucide-react'
import { TransferenciaCampos, type DadosTransferencia } from './TransferenciaCampos'
import { ComprovantePix } from './ComprovantePix'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { useCustosFixosQuery, useEmpresasQuery } from '@/features/cadastros/hooks'
import { CadastroBusca, type OpcaoCadastro } from '@/features/camposOperacao/CadastroBusca'
import { AnexosTab } from '@/features/anexos/AnexosTab'
import { EXTENSOES_ANEXO, TAMANHO_MAXIMO_ANEXO, enviarAnexo } from '@/features/anexos/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { getErrorMessage } from '@/lib/api'
import { listCategoriasCusto, listClientes, listFornecedores } from '@/features/cadastros/api'
import { usePlanoContas } from '@/features/planoContas/store'
import { PlanoContaBusca } from '@/features/planoContas/PlanoContaBusca'
import { useUsuarios } from '@/features/usuarios/store'
import { FORMAS_PAGAMENTO } from '@/features/parceiros/types'
import { formatBRL } from '@/lib/format'
import { gerarParcelas, hojeISO } from './calculos'
import { carteiraDaEmpresa, movimentoVazio, PERIODICIDADES, TIPOS_VARIAVEL, comSinal, type Carteira, type ItemVariavelMovimento, type Movimento, type Periodicidade, type TipoMovimento } from './types'
import { empresaPadrao } from '@/features/unidades/types'
import s from './financeiro.module.css'

interface Props {
  open: boolean
  /** Editando uma parcela existente; null = novo lançamento. */
  initial: Movimento | null
  carteiras: Carteira[]
  onClose: () => void
  /** Devolve os lançamentos criados (para anexar os documentos escolhidos antes de salvar), ou null se não gravou. */
  onSave: (mov: Movimento, parcelas: number, periodicidade: Periodicidade) => Promise<Movimento[] | null>
  /** Transferência entre contas: devolve as duas pernas criadas, ou null se não gravou. */
  onTransferir: (d: DadosTransferencia) => Promise<Movimento[] | null>
}

const transferenciaVazia = (): DadosTransferencia => ({
  origemId: '', destinoId: '', valor: 0, data: hojeISO(), descricao: '', documento: '', observacao: '', planoContaId: '', centroCustoId: '', formaPagamento: 'Pix', jaFeita: true,
})
/** Conta do plano que parece de transferência (o plano de cada cliente é dele: só sugere quando acha). */
const pareceTransferencia = (nome: string) => /transfer|m[uú]tuo|entre (empresas|contas)/i.test(nome)

/** Lançamento a pagar ou a receber, com gerador de parcelas. */
export function MovimentoFormModal({ open, initial, carteiras, onClose, onSave, onTransferir }: Props) {
  const [d, setD] = useState<Movimento>(movimentoVazio())
  const [parcelas, setParcelas] = useState(1)
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal')
  const [erros, setErros] = useState<Record<string, string>>({})
  // Documentos escolhidos num lançamento novo: sobem depois de gravar (o lançamento ainda não tem id).
  const [arquivos, setArquivos] = useState<File[]>([])
  // Plano de contas e centro de custo que vieram do fornecedor: trocar o fornecedor troca só esses.
  const [auto, setAuto] = useState({ planoContaId: '', centroCustoId: '' })
  // Terceiro tipo do "Novo lançamento": transferência entre contas.
  const [modoTransferencia, setModoTransferencia] = useState(false)
  const [t, setT] = useState<DadosTransferencia>(transferenciaVazia())
  const { data: empresas } = useEmpresasQuery()
  const ativas = carteiras.filter((c) => c.status === 'ativo')
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) {
      // Novo lançamento: empresa padrão e a primeira carteira dela.
      const empresaId = empresaPadrao((empresas ?? []).filter((e) => e.status === 'ativo'))?.id ?? ''
      const carteiraId = ativas.find((c) => carteiraDaEmpresa(c, empresaId))?.id ?? ''
      setD(initial ?? { ...movimentoVazio('pagar'), empresaId, vencimento: hojeISO(), competencia: hojeISO().slice(0, 7), carteiraId })
      setParcelas(1)
      setPeriodicidade('mensal')
      setErros({})
      setArquivos([])
      setAuto({ planoContaId: '', centroCustoId: '' })
      setModoTransferencia(false)
      setT(transferenciaVazia())
    }
  }
  const set = (p: Partial<Movimento>) => setD((x) => ({ ...x, ...p }))
  // Cada CNPJ tem as suas contas: só aparecem as carteiras da empresa do lançamento.
  const carteirasDaEmpresa = ativas.filter((c) => carteiraDaEmpresa(c, d.empresaId))
  const trocarEmpresa = (empresaId: string) => {
    const atual = carteiras.find((c) => c.id === d.carteiraId)
    const serve = atual && carteiraDaEmpresa(atual, empresaId)
    set({ empresaId, carteiraId: serve ? d.carteiraId : (ativas.find((c) => carteiraDaEmpresa(c, empresaId))?.id ?? '') })
  }
  // Escolher a carteira de uma empresa com o lançamento sem empresa já preenche a empresa.
  const trocarCarteira = (carteiraId: string) => {
    const c = carteiras.find((x) => x.id === carteiraId)
    set({ carteiraId, empresaId: d.empresaId || c?.empresaId || '' })
  }
  const { data: clientes } = useQuery({ queryKey: ['clientes'], queryFn: listClientes })
  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores })
  const { data: categorias } = useQuery({ queryKey: ['categorias-custo'], queryFn: listCategoriasCusto })
  const { data: custosFixos } = useCustosFixosQuery()
  const { usuarios } = useUsuarios()
  const { analiticas, contas: planoContas } = usePlanoContas()

  const receber = d.tipo === 'receber'
  // Receita para receber, despesa para pagar (regra do plano de contas do cliente).
  const contas = analiticas().filter((c) => (receber ? c.grupoDre === 'Receita' : c.grupoDre === 'Despesa') && c.status === 'ativo')
  // Busca por nome ou CPF/CNPJ (com milhares de fornecedores, um combo não serve).
  const parceiros: (OpcaoCadastro & { nomeLimpo: string })[] = receber
    ? (clientes ?? []).filter((c) => c.status === 'ativo').map((c) => ({ id: c.id, nome: c.nomeFantasia || c.nome, nomeLimpo: c.nomeFantasia || c.nome, doc: c.cpfCnpj, busca: c.nome }))
    : [
        ...(fornecedores ?? []).filter((f) => f.status === 'ativo').map((f) => ({ id: f.id, nome: f.nomeFantasia || f.nome, nomeLimpo: f.nomeFantasia || f.nome, doc: f.cpfCnpj, busca: f.nome })),
        ...usuarios.filter((u) => u.status === 'ativo').map((u) => ({ id: `func-${u.id}`, nome: `${u.nome} · funcionário`, nomeLimpo: u.nome, busca: u.email })),
      ]
  // Lançamento antigo de alguém que saiu do cadastro: continua aparecendo com o nome gravado.
  if (d.parceiroId && !parceiros.some((p) => p.id === d.parceiroId)) parceiros.push({ id: d.parceiroId, nome: d.parceiroNome, nomeLimpo: d.parceiroNome })

  const trocarTipo = (tipo: TipoMovimento) => {
    set({ tipo, parceiroId: '', parceiroNome: '', planoContaId: '', centroCustoId: '' })
    setAuto({ planoContaId: '', centroCustoId: '' })
  }
  /**
   * Escolher o fornecedor traz o plano de contas e o centro de custo: da despesa fixa (DF) dele, se
   * houver, senão do cadastro do fornecedor. Só troca o que estava vazio ou tinha vindo do fornecedor anterior.
   */
  const escolherParceiro = (id: string) => {
    const nome = parceiros.find((p) => p.id === id)?.nomeLimpo ?? ''
    const f = (fornecedores ?? []).find((x) => x.id === id)
    const df = (custosFixos ?? []).filter((c) => c.fornecedorId === id && c.status === 'ativo' && (!d.empresaId || c.unidadeId === d.empresaId || (c.rateio ?? []).some((r) => r.empresaId === d.empresaId)))[0]
      ?? (custosFixos ?? []).find((c) => c.fornecedorId === id && c.status === 'ativo')
    const sugestao = { planoContaId: df?.planoContaId || f?.planoContaId || '', centroCustoId: df?.categoriaId || f?.centroCustoId || '' }
    const planoServe = sugestao.planoContaId && contas.some((c) => c.id === sugestao.planoContaId)
    const novo: Partial<Movimento> = { parceiroId: id, parceiroNome: nome }
    if (!receber && planoServe && (!d.planoContaId || d.planoContaId === auto.planoContaId)) novo.planoContaId = sugestao.planoContaId
    if (!receber && sugestao.centroCustoId && (!d.centroCustoId || d.centroCustoId === auto.centroCustoId)) novo.centroCustoId = sugestao.centroCustoId
    setAuto({ planoContaId: novo.planoContaId ?? auto.planoContaId, centroCustoId: novo.centroCustoId ?? auto.centroCustoId })
    set(novo)
  }

  const escolherArquivos = (lista: FileList | null) => {
    const novos = Array.from(lista ?? [])
    const ruim = novos.find((f) => !EXTENSOES_ANEXO.includes(`.${f.name.split('.').pop()?.toLowerCase() ?? ''}`) || f.size > TAMANHO_MAXIMO_ANEXO)
    if (ruim) return void avisar({ titulo: 'Arquivo não aceito', mensagem: `"${ruim.name}": envie PDF, Word, Excel, JPG ou PNG de até 12 MB.` })
    setArquivos((a) => [...a, ...novos])
  }

  const preview = d.valor > 0 && d.vencimento && parcelas > 1 ? gerarParcelas(d, parcelas, periodicidade) : []

  // ── Despesa fixa: o financeiro inclui a parte variável (seguro por viagem, juros, mora...) e o lançamento
  // passa a valer a parte fixa + os itens. Ficam atrelados à despesa (relatório de fixo × variável). ──
  const daDespesaFixa = !!initial && initial.origem === 'custo-fixo'
  const variaveis = d.itensVariaveis ?? []
  const centavos = (n: number) => Math.round(n * 100) / 100
  const totalVariavel = centavos(variaveis.reduce((a, i) => a + comSinal(i), 0))
  const parteFixa = centavos(d.valor - totalVariavel)
  const acrescimos = centavos(variaveis.filter((i) => i.tipo !== 'desconto').reduce((a, i) => a + (i.valor || 0), 0))
  const descontos = centavos(variaveis.filter((i) => i.tipo === 'desconto').reduce((a, i) => a + (i.valor || 0), 0))
  const mudarVariaveis = (lista: ItemVariavelMovimento[]) => {
    const novoTotal = centavos(lista.reduce((a, i) => a + comSinal(i), 0))
    set({ itensVariaveis: lista, valorVariavel: novoTotal, valor: centavos(parteFixa + novoTotal) })
  }
  const mudarVariavel = (id: string, p: Partial<ItemVariavelMovimento>) => mudarVariaveis(variaveis.map((i) => (i.id === id ? { ...i, ...p } : i)))
  const despesaFixa = daDespesaFixa ? (custosFixos ?? []).find((c) => c.id === initial?.origemId) : undefined

  const [salvando, setSalvando] = useState(false)
  const nomeEmpresa = (id: string) => (empresas ?? []).find((e) => e.id === id)?.nome ?? ''
  const contasTransferencia = analiticas().filter((c) => c.status === 'ativo')
  const escolherTransferencia = () => {
    setModoTransferencia(true)
    setArquivos([])
    // Sugere a conta do plano com cara de transferência, se o plano do cliente tiver uma.
    const sugerida = contasTransferencia.find((c) => pareceTransferencia(c.nome))
    setT((x) => ({ ...x, planoContaId: x.planoContaId || sugerida?.id || '' }))
  }
  const enviarArquivos = async (gravados: Movimento[]) => {
    if (arquivos.length === 0) return
    try {
      for (const m of gravados) for (const f of arquivos) await enviarAnexo('movimento', m.id, f)
    } catch (err) {
      void avisar({ titulo: 'Lançamento gravado, documento não', mensagem: `O lançamento foi gravado, mas o documento não subiu: ${getErrorMessage(err)}. Abra o lançamento e anexe de novo.` })
    }
  }
  const submitTransferencia = async () => {
    const e: Record<string, string> = {}
    if (!t.origemId) e.origemId = 'Escolha a conta de origem.'
    if (!t.destinoId) e.destinoId = 'Escolha a conta de destino.'
    if (!(t.valor > 0)) e.valor = 'Informe o valor.'
    if (!t.data) e.data = 'Informe a data.'
    setErros(e)
    if (Object.keys(e).length) return
    setSalvando(true)
    try {
      await onTransferir({ ...t, descricao: t.descricao.trim() })
    } finally {
      setSalvando(false)
    }
  }
  const submit = async () => {
    if (modoTransferencia) return submitTransferencia()
    const e: Record<string, string> = {}
    if (!d.descricao.trim()) e.descricao = 'Descreva o lançamento.'
    if (!d.vencimento) e.vencimento = 'Informe o vencimento.'
    if (!(d.valor > 0)) e.valor = 'Informe o valor.'
    if (daDespesaFixa && parteFixa < 0) e.valor = 'A parte fixa não pode ficar negativa.'
    if (variaveis.some((i) => !(i.valor > 0) || !i.descricao.trim())) e.variaveis = 'Descreva e informe o valor de cada item variável (ou tire o item).'
    if (!d.carteiraId) e.carteiraId = 'Escolha a carteira.'
    if (!d.parceiroNome.trim()) e.parceiroId = receber ? 'Escolha o cliente.' : 'Escolha o fornecedor ou funcionário.'
    setErros(e)
    if (Object.keys(e).length) return
    setSalvando(true)
    try {
      const criados = await onSave({ ...d, descricao: d.descricao.trim() }, initial ? 1 : parcelas, periodicidade)
      // Documentos escolhidos antes de gravar: vão para cada parcela criada.
      if (criados) await enviarArquivos(criados)
    } finally {
      setSalvando(false)
    }
  }

  const editando = !!initial
  // Liquidado: abre para consulta e anexos; o servidor não aceita alterar (pago por Pix do ELROND, nem estornando).
  const liquidado = !!initial?.pagoEm
  // Pix em andamento no banco: também só consulta, até o banco responder.
  const pixAndamento = !initial?.pagoEm && !!initial?.pixSituacao
  const transferenciaEditada = !!initial?.transferencia

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transferenciaEditada ? 'Transferência entre contas' : editando ? `Lançamento ${initial?.parcela}/${initial?.totalParcelas}` : 'Novo lançamento'}
      subtitle={editando ? initial?.descricao : 'Conta a pagar, a receber ou transferência entre contas'}
      icon={<Receipt />}
      maxWidth={760}
      busy={salvando}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          {!liquidado && !pixAndamento && (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={submit} disabled={salvando || carteiras.length === 0}>
              {editando ? 'Salvar' : modoTransferencia ? 'Lançar transferência' : parcelas > 1 ? `Lançar ${parcelas} parcelas` : 'Lançar'}
            </button>
          )}
        </>
      }
    >
      {pixAndamento && (
        <div className={s.transfInfo}>
          Pix em andamento no banco ({initial?.pixSituacao === 'aguardando-aprovacao' ? 'aguardando aprovação no app' : initial?.pixSituacao}): o lançamento fica só para consulta até o banco responder. Se precisar desistir, reprove o Pix no app do banco.
        </div>
      )}
      {liquidado && (
        <div className={s.transfInfo}>
          {initial?.pagoPeloBanco
            ? 'Pago por Pix pelo ELROND: o dinheiro já saiu do banco, então não há estorno nem alteração. Os documentos ainda podem ser anexados.'
            : 'Lançamento liquidado: só consulta. Para alterar, estorne a baixa na lista. Os documentos ainda podem ser anexados.'}
        </div>
      )}
      {carteiras.filter((c) => c.status === 'ativo').length === 0 && (
        <div className={s.aprovAviso}>
          Nenhuma conta cadastrada. Crie a conta bancária ou o caixa em <Link to="/cadastros/unidades">Cadastros › Empresas</Link>, aba Dados bancários, antes de lançar.
        </div>
      )}
      {!editando && (
        <div className={s.tipoSeg}>
          <label className={receber && !modoTransferencia ? s.onReceber : ''}>
            <input type="radio" name="tipo" checked={receber && !modoTransferencia} onChange={() => { setModoTransferencia(false); trocarTipo('receber') }} />
            <ArrowDownLeft /> A receber
          </label>
          <label className={!receber && !modoTransferencia ? s.onPagar : ''}>
            <input type="radio" name="tipo" checked={!receber && !modoTransferencia} onChange={() => { setModoTransferencia(false); trocarTipo('pagar') }} />
            <ArrowUpRight /> A pagar
          </label>
          <label className={modoTransferencia ? s.onTransferencia : ''}>
            <input type="radio" name="tipo" checked={modoTransferencia} onChange={escolherTransferencia} />
            <ArrowLeftRight /> Transferência entre contas
          </label>
        </div>
      )}

      {modoTransferencia ? (
        <TransferenciaCampos
          d={t}
          set={(p) => setT((x) => ({ ...x, ...p }))}
          carteiras={carteiras}
          nomeEmpresa={nomeEmpresa}
          contas={contasTransferencia}
          centros={(categorias ?? []).filter((c) => c.status === 'ativo')}
          erros={erros}
        />
      ) : (
      <>
      {transferenciaEditada && (
        <div className={s.transfInfo}>
          <ArrowLeftRight size={15} /> Transferência entre contas · {initial?.tipo === 'pagar' ? 'saída' : 'entrada'} {initial?.parceiroNome.toLowerCase()}. Valor, data e textos valem para as duas pernas; as contas não mudam.
        </div>
      )}
      <section className={ui.fsection}>
        <div className={ui.grid}>
          {!transferenciaEditada && (
          <Field className={ui.col2} label={receber ? 'Cliente' : 'Fornecedor / funcionário'} req error={erros.parceiroId}>
            <CadastroBusca
              opcoes={parceiros}
              value={d.parceiroId}
              onChange={escolherParceiro}
              placeholder={receber ? 'Digite o nome ou o CNPJ do cliente' : 'Digite o nome, o CNPJ ou o funcionário'}
            />
          </Field>
          )}
          <Field className={ui.col2} label="Empresa">
            <select value={d.empresaId} onChange={(e) => trocarEmpresa(e.target.value)}>
              <option value="">Selecione</option>
              {(empresas ?? []).filter((e) => e.status === 'ativo').map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </Field>
          <Field className={ui.col4} label="Descrição" req error={erros.descricao}>
            <input value={d.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder={receber ? 'Ex.: PROP-0007 · Consultoria mensal' : 'Ex.: Aluguel · sala 402'} />
          </Field>
          <Field className={ui.col2} label="Plano de contas" hint={receber ? 'Só contas de Receita.' : 'Só contas de Despesa. Ao escolher o fornecedor, vem da despesa fixa (DF) ou do cadastro dele.'}>
            <PlanoContaBusca
              value={d.planoContaId}
              onChange={(id) => set({ planoContaId: id })}
              contas={planoContas}
              permitida={(c) => (receber ? c.grupoDre === 'Receita' : c.grupoDre === 'Despesa') && c.status === 'ativo'}
              vazio="Nenhuma"
            />
          </Field>
          <Field className={ui.col2} label="Centro de custo">
            <select value={d.centroCustoId} onChange={(e) => set({ centroCustoId: e.target.value })}>
              <option value="">Nenhum</option>
              {(categorias ?? []).filter((c) => c.status === 'ativo').map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}>
          Valor e vencimento {!editando && <span className={ui.fsectionHint}>parcelas dividem o valor e avançam a data</span>}
        </div>
        <div className={ui.grid}>
          {daDespesaFixa ? (
            <Field label="Parte fixa (R$)" req error={erros.valor} hint={`O valor da despesa fixa${despesaFixa ? ` nº ${despesaFixa.numero} (${formatBRL(despesaFixa.valorMensal)}/mês)` : ''}. Os variáveis entram abaixo.`}>
              <MoneyInput value={parteFixa} onChange={(n) => set({ valor: centavos(n + totalVariavel) })} invalid={!!erros.valor} />
            </Field>
          ) : (
            <Field label="Valor (R$)" req error={erros.valor}>
              <MoneyInput value={d.valor} onChange={(n) => set({ valor: n })} invalid={!!erros.valor} />
            </Field>
          )}
          <Field label="Vencimento" req error={erros.vencimento}>
            <input type="date" value={d.vencimento} onChange={(e) => set({ vencimento: e.target.value, competencia: d.competencia || e.target.value.slice(0, 7) })} />
          </Field>
          <Field label="Competência" hint="Mês a que a receita ou despesa pertence (DRE), mesmo que vença em outro.">
            <input type="month" value={d.competencia} onChange={(e) => set({ competencia: e.target.value })} />
          </Field>
          <Field label="Documento" hint="Nº da NF, fatura ou boleto.">
            <input value={d.documento} onChange={(e) => set({ documento: e.target.value })} placeholder="NF 123" />
          </Field>
          {!editando && (
            <>
              <Field label="Parcelas">
                <input type="number" min={1} max={60} value={parcelas} onChange={(e) => setParcelas(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
              </Field>
              <Field label="A cada">
                <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as Periodicidade)} disabled={parcelas <= 1}>
                  {PERIODICIDADES.map((p) => (
                    <option key={p.valor} value={p.valor}>{p.label}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label="Carteira" req error={erros.carteiraId} hint="Conta por onde o dinheiro entra ou sai. Aparecem só as contas da empresa do lançamento.">
            <select value={d.carteiraId} onChange={(e) => trocarCarteira(e.target.value)} disabled={transferenciaEditada}>
              <option value="">{carteirasDaEmpresa.length ? 'Selecione' : 'Nenhuma carteira desta empresa'}</option>
              {carteirasDaEmpresa.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Forma">
            <select value={d.formaPagamento} onChange={(e) => set({ formaPagamento: e.target.value })}>
              <option value="">—</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field className={ui.col4} label="Observação">
            <input value={d.observacao} onChange={(e) => set({ observacao: e.target.value })} placeholder="Opcional" />
          </Field>
        </div>
        {daDespesaFixa && (
          <div className={s.variaveis}>
            <div className={s.variaveisTitulo}>
              Variáveis desta despesa fixa
              <span>cobranças e descontos que mudam a cada mês e entram neste pagamento; ficam atreladas à despesa fixa</span>
            </div>
            {variaveis.map((i) => (
              <div key={i.id} className={s.variavelLinha}>
                <select value={i.tipo} onChange={(e) => mudarVariavel(i.id, { tipo: e.target.value as ItemVariavelMovimento['tipo'] })} aria-label="Tipo do item variável">
                  {TIPOS_VARIAVEL.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                </select>
                <input value={i.descricao} onChange={(e) => mudarVariavel(i.id, { descricao: e.target.value })} placeholder={TIPOS_VARIAVEL.find((t) => t.valor === i.tipo)?.exemplo} aria-label="Descrição do item variável" />
                <MoneyInput value={i.valor} onChange={(n) => mudarVariavel(i.id, { valor: n })} />
                <button type="button" className={ui.iconBtn} title="Tirar este item" onClick={() => mudarVariaveis(variaveis.filter((x) => x.id !== i.id))}><Trash2 size={14} /></button>
              </div>
            ))}
            {erros.variaveis && <span className={ui.errMsg}>{erros.variaveis}</span>}
            <div className={s.variaveisRodape}>
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => mudarVariaveis([...variaveis, { id: crypto.randomUUID(), tipo: 'seguro', descricao: '', valor: 0 }])} disabled={liquidado || pixAndamento}>
                <Plus /> Item variável
              </button>
              <span className={s.variaveisTotal}>
                Fixo {formatBRL(parteFixa)}
                {acrescimos > 0 && <> + variável {formatBRL(acrescimos)}</>}
                {descontos > 0 && <> − desconto {formatBRL(descontos)}</>}
                {' '}= <b>{formatBRL(d.valor)}</b>
              </span>
            </div>
            {initial && d.valor !== initial.valor && initial.aprovacao === 'aprovado' && (
              <span className={ui.cellMut}>O valor mudou: ao salvar, o lançamento volta para aprovação.</span>
            )}
          </div>
        )}
        {preview.length > 0 && (
          <div className={s.parcelasPreview}>
            {preview.map((p) => (
              <span key={p.parcela}>
                {p.parcela}/{p.totalParcelas} · {p.vencimento.split('-').reverse().join('/')} · {formatBRL(p.valor)}
              </span>
            ))}
          </div>
        )}
      </section>
      </>
      )}

      {initial?.pagoPeloBanco && <ComprovantePix movimentoId={initial.id} />}

      {/* Transferência entre contas não tem boleto, nota nem título: sem documentos. */}
      {!modoTransferencia && !transferenciaEditada && (
      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}>
          <Paperclip size={13} /> Documentos <span className={ui.fsectionHint}>boleto, nota fiscal ou título</span>
        </div>
        {editando && initial ? (
          <AnexosTab entidade="movimento" entidadeId={initial.id} />
        ) : (
          <div className={s.anexosNovos}>
            <label className={`${ui.btn} ${ui.btnGhost}`}>
              <Paperclip /> Anexar documento
              <input type="file" multiple hidden accept={EXTENSOES_ANEXO.join(',')} onChange={(e) => { escolherArquivos(e.target.files); e.target.value = '' }} />
            </label>
            {arquivos.length === 0 ? (
              <span className={ui.cellMut}>PDF, Word, Excel, JPG ou PNG, até 12 MB. Sobe ao lançar{parcelas > 1 ? ' (vai para cada parcela)' : ''}.</span>
            ) : (
              <ul>
                {arquivos.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    {f.name}
                    <button type="button" className={ui.iconBtn} title="Tirar" onClick={() => setArquivos((a) => a.filter((_, j) => j !== i))}><X /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
      )}
    </Modal>
  )
}
