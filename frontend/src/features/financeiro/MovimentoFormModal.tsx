import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { listCategoriasCusto, listClientes, listFornecedores } from '@/features/cadastros/api'
import { usePlanoContas } from '@/features/planoContas/store'
import { useUsuarios } from '@/features/usuarios/store'
import { FORMAS_PAGAMENTO } from '@/features/parceiros/types'
import { formatBRL } from '@/lib/format'
import { gerarParcelas, hojeISO } from './calculos'
import { carteiraDaEmpresa, movimentoVazio, PERIODICIDADES, type Carteira, type Movimento, type Periodicidade, type TipoMovimento } from './types'
import { empresaPadrao } from '@/features/unidades/types'
import s from './financeiro.module.css'

interface Props {
  open: boolean
  /** Editando uma parcela existente; null = novo lançamento. */
  initial: Movimento | null
  carteiras: Carteira[]
  onClose: () => void
  onSave: (mov: Movimento, parcelas: number, periodicidade: Periodicidade) => Promise<void> | void
}

/** Lançamento a pagar ou a receber, com gerador de parcelas. */
export function MovimentoFormModal({ open, initial, carteiras, onClose, onSave }: Props) {
  const [d, setD] = useState<Movimento>(movimentoVazio())
  const [parcelas, setParcelas] = useState(1)
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal')
  const [erros, setErros] = useState<Record<string, string>>({})
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
  const { usuarios } = useUsuarios()
  const { analiticas } = usePlanoContas()

  const receber = d.tipo === 'receber'
  // Receita para receber, despesa para pagar (regra do plano de contas do cliente).
  const contas = analiticas().filter((c) => (receber ? c.grupoDre === 'Receita' : c.grupoDre === 'Despesa') && c.status === 'ativo')
  const parceiros: { id: string; nome: string; grupo: string }[] = receber
    ? (clientes ?? []).filter((c) => c.status === 'ativo').map((c) => ({ id: c.id, nome: c.nomeFantasia || c.nome, grupo: 'Clientes' }))
    : [
        ...(fornecedores ?? []).filter((f) => f.status === 'ativo').map((f) => ({ id: f.id, nome: f.nomeFantasia || f.nome, grupo: 'Fornecedores' })),
        ...usuarios.filter((u) => u.status === 'ativo').map((u) => ({ id: `func-${u.id}`, nome: u.nome, grupo: 'Funcionários' })),
      ]
  const grupos = [...new Set(parceiros.map((p) => p.grupo))]

  const trocarTipo = (tipo: TipoMovimento) => set({ tipo, parceiroId: '', parceiroNome: '', planoContaId: '' })
  const escolherParceiro = (id: string) => set({ parceiroId: id, parceiroNome: parceiros.find((p) => p.id === id)?.nome ?? '' })

  const preview = d.valor > 0 && d.vencimento && parcelas > 1 ? gerarParcelas(d, parcelas, periodicidade) : []

  const [salvando, setSalvando] = useState(false)
  const submit = async () => {
    const e: Record<string, string> = {}
    if (!d.descricao.trim()) e.descricao = 'Descreva o lançamento.'
    if (!d.vencimento) e.vencimento = 'Informe o vencimento.'
    if (!(d.valor > 0)) e.valor = 'Informe o valor.'
    if (!d.carteiraId) e.carteiraId = 'Escolha a carteira.'
    if (!d.parceiroNome.trim()) e.parceiroId = receber ? 'Escolha o cliente.' : 'Escolha o fornecedor ou funcionário.'
    setErros(e)
    if (Object.keys(e).length) return
    setSalvando(true)
    try {
      await onSave({ ...d, descricao: d.descricao.trim() }, initial ? 1 : parcelas, periodicidade)
    } finally {
      setSalvando(false)
    }
  }

  const editando = !!initial

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? `Lançamento ${initial?.parcela}/${initial?.totalParcelas}` : 'Novo lançamento'}
      subtitle={editando ? initial?.descricao : 'Conta a pagar ou a receber'}
      icon={<Receipt />}
      maxWidth={760}
      busy={salvando}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={submit} disabled={salvando || carteiras.length === 0}>
            {editando ? 'Salvar' : parcelas > 1 ? `Lançar ${parcelas} parcelas` : 'Lançar'}
          </button>
        </>
      }
    >
      {carteiras.filter((c) => c.status === 'ativo').length === 0 && (
        <div className={s.aprovAviso}>
          Nenhuma conta cadastrada. Crie a conta bancária ou o caixa em <Link to="/cadastros/unidades">Cadastros › Empresas</Link>, aba Dados bancários, antes de lançar.
        </div>
      )}
      {!editando && (
        <div className={s.tipoSeg}>
          <label className={receber ? s.onReceber : ''}>
            <input type="radio" name="tipo" checked={receber} onChange={() => trocarTipo('receber')} />
            <ArrowDownLeft /> A receber
          </label>
          <label className={!receber ? s.onPagar : ''}>
            <input type="radio" name="tipo" checked={!receber} onChange={() => trocarTipo('pagar')} />
            <ArrowUpRight /> A pagar
          </label>
        </div>
      )}

      <section className={ui.fsection}>
        <div className={ui.grid}>
          <Field className={ui.col2} label={receber ? 'Cliente' : 'Fornecedor / funcionário'} req error={erros.parceiroId}>
            <select value={d.parceiroId} onChange={(e) => escolherParceiro(e.target.value)}>
              <option value="">Selecione</option>
              {grupos.map((g) => (
                <optgroup key={g} label={g}>
                  {parceiros.filter((p) => p.grupo === g).map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
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
          <Field className={ui.col2} label="Plano de contas" hint={receber ? 'Só contas de Receita.' : 'Só contas de Despesa.'}>
            <select value={d.planoContaId} onChange={(e) => set({ planoContaId: e.target.value })}>
              <option value="">Nenhuma</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>
              ))}
            </select>
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
          <Field label="Valor (R$)" req error={erros.valor}>
            <MoneyInput value={d.valor} onChange={(n) => set({ valor: n })} invalid={!!erros.valor} />
          </Field>
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
            <select value={d.carteiraId} onChange={(e) => trocarCarteira(e.target.value)}>
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
    </Modal>
  )
}
