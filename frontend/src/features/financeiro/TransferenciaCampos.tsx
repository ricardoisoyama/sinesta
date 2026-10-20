import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { FORMAS_PAGAMENTO } from '@/features/parceiros/types'
import type { Carteira } from './types'

/** O que a tela manda para criar a transferência entre contas. */
export interface DadosTransferencia {
  origemId: string
  destinoId: string
  valor: number
  data: string
  descricao: string
  documento: string
  observacao: string
  planoContaId: string
  centroCustoId: string
  formaPagamento: string
  /** Já foi feita no banco: ao ser aprovada, entra baixada nas duas contas. */
  jaFeita: boolean
}

interface Props {
  d: DadosTransferencia
  set: (p: Partial<DadosTransferencia>) => void
  carteiras: Carteira[]
  nomeEmpresa: (id: string) => string
  contas: { id: string; codigo: string; nome: string }[]
  centros: { id: string; nome: string }[]
  erros: Record<string, string>
}

/**
 * Campos da transferência entre contas: de uma conta para outra (inclusive de empresas diferentes,
 * como Filial → Matriz). Vira uma saída na origem e uma entrada no destino, ligadas.
 */
export function TransferenciaCampos({ d, set, carteiras, nomeEmpresa, contas, centros, erros }: Props) {
  const ativas = carteiras.filter((c) => c.status === 'ativo')
  const rotulo = (c: Carteira) => `${c.nome}${c.empresaId ? ` · ${nomeEmpresa(c.empresaId)}` : ''}`
  return (
    <>
      <section className={ui.fsection}>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Conta de origem" req error={erros.origemId} hint="De onde o dinheiro sai.">
            <select value={d.origemId} onChange={(e) => set({ origemId: e.target.value })}>
              <option value="">Selecione</option>
              {ativas.map((c) => <option key={c.id} value={c.id}>{rotulo(c)}</option>)}
            </select>
          </Field>
          <Field className={ui.col2} label="Conta de destino" req error={erros.destinoId} hint="Para onde o dinheiro vai (pode ser de outra empresa).">
            <select value={d.destinoId} onChange={(e) => set({ destinoId: e.target.value })}>
              <option value="">Selecione</option>
              {ativas.filter((c) => c.id !== d.origemId).map((c) => <option key={c.id} value={c.id}>{rotulo(c)}</option>)}
            </select>
          </Field>
          <Field className={ui.col4} label="Descrição">
            <input value={d.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder="Transferência entre contas" />
          </Field>
          <Field label="Valor (R$)" req error={erros.valor}>
            <MoneyInput value={d.valor} onChange={(n) => set({ valor: n })} invalid={!!erros.valor} />
          </Field>
          <Field label="Data" req error={erros.data}>
            <input type="date" value={d.data} onChange={(e) => set({ data: e.target.value })} />
          </Field>
          <Field label="Forma">
            <select value={d.formaPagamento} onChange={(e) => set({ formaPagamento: e.target.value })}>
              {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Documento" hint="Comprovante, nº da TED...">
            <input value={d.documento} onChange={(e) => set({ documento: e.target.value })} />
          </Field>
          <Field className={ui.col2} label="Plano de contas" hint="Não entra no resultado (não é receita nem despesa). Serve para o contador identificar.">
            <select value={d.planoContaId} onChange={(e) => set({ planoContaId: e.target.value })}>
              <option value="">Nenhuma</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>)}
            </select>
          </Field>
          <Field className={ui.col2} label="Centro de custo">
            <select value={d.centroCustoId} onChange={(e) => set({ centroCustoId: e.target.value })}>
              <option value="">Nenhum</option>
              {centros.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field className={ui.col4} label="Observação">
            <input value={d.observacao} onChange={(e) => set({ observacao: e.target.value })} placeholder="Opcional" />
          </Field>
          <div className={ui.col4}>
            <label className={ui.checkItem}>
              <input type="checkbox" checked={d.jaFeita} onChange={(e) => set({ jaFeita: e.target.checked })} />
              Já foi feita no banco: ao ser aprovada, entra baixada nas duas contas na data informada
            </label>
            {!d.jaFeita && <div className={ui.modalNote}>Fica em aberto depois de aprovada: baixe quando sair do banco (ou envie pelo Pix do ELROND, quando o piloto liberar).</div>}
          </div>
        </div>
      </section>
    </>
  )
}
