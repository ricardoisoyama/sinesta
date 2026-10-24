import { useQuery } from '@tanstack/react-query'
import { Field } from '@/features/common/Field'
import ui from '@/features/common/ui.module.css'
import { listCarteiras } from '@/features/financeiro/api'
import { CHAVE_CARTEIRAS } from '@/features/financeiro/store'
import { carteiraDaEmpresa } from '@/features/financeiro/types'
import { usePlanoContas } from '@/features/planoContas/store'
import { PlanoContaBusca } from '@/features/planoContas/PlanoContaBusca'
import type { FaturamentoEmpresa } from './types'
import { useAuth } from '@/features/auth/auth-context'
import { ConfiguracaoNfseEmpresa } from './ConfiguracaoNfseEmpresa'

interface Props {
  empresaId: string
  valor: FaturamentoEmpresa
  onChange: (v: FaturamentoEmpresa) => void
}

/**
 * Aba Faturamento da empresa: o que a fatura ao cliente usa por padrão (a tela de faturar deixa trocar).
 * Conta que recebe o boleto, plano de contas por tipo de documento e o contato do financeiro, que sai
 * no cabeçalho da fatura e recebe cópia de cada e-mail enviado ao cliente.
 */
export function FaturamentoEmpresaCampos({ empresaId, valor, onChange }: Props) {
  const { data: carteiras } = useQuery({ queryKey: CHAVE_CARTEIRAS, queryFn: listCarteiras })
  const { contas } = usePlanoContas()
  const set = (p: Partial<FaturamentoEmpresa>) => onChange({ ...valor, ...p })
  const daEmpresa = (carteiras ?? []).filter((c) => c.status === 'ativo' && carteiraDaEmpresa(c, empresaId))
  const receita = (c: { grupoDre: string; status: string }) => c.grupoDre === 'Receita' && c.status === 'ativo'
  const { user } = useAuth()
  const podeNfse = !!user?.permissoes?.includes('/fiscal/nfse')

  return (
    <>
      <div className={ui.fsectionTitle}>
        Fatura ao cliente <span className={ui.fsectionHint}>padrões ao faturar os CT-es e as minutas; dá para trocar na hora</span>
      </div>
      <div className={ui.grid}>
        <Field className={ui.col2} label="Conta que recebe" hint="A conta do boleto e do lançamento a receber (precisa ter a integração de cobrança ligada).">
          <select value={valor.carteiraId} onChange={(e) => set({ carteiraId: e.target.value })} disabled={!empresaId}>
            <option value="">{empresaId ? 'Escolha a conta' : 'Salve a empresa antes'}</option>
            {daEmpresa.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
        <div className={ui.col2} />
        <Field className={ui.col2} label="Plano de contas · fatura de CT-e" hint="Frete com CT-e (ex.: Receitas de venda de CT-e).">
          <PlanoContaBusca value={valor.planoContaCte} onChange={(id) => set({ planoContaCte: id })} contas={contas} permitida={receita} vazio="Nenhum" />
        </Field>
        <Field className={ui.col2} label="Plano de contas · fatura de minuta" hint="Minuta com NFS-e (ex.: Receitas de venda de NF-e).">
          <PlanoContaBusca value={valor.planoContaMinuta} onChange={(id) => set({ planoContaMinuta: id })} contas={contas} permitida={receita} vazio="Nenhum" />
        </Field>
        <Field className={ui.col2} label="Telefone do financeiro" hint="Sai no cabeçalho da fatura.">
          <input value={valor.telefone} onChange={(e) => set({ telefone: e.target.value })} placeholder="(13) 99717-4540" />
        </Field>
        <Field className={ui.col2} label="E-mail do financeiro" hint="Sai no cabeçalho da fatura e recebe cópia de cada e-mail enviado ao cliente.">
          <input type="email" value={valor.email} onChange={(e) => set({ email: e.target.value })} placeholder="financeiro@empresa.com.br" />
        </Field>
      </div>
      {podeNfse && (
        <>
          <div className={ui.fsectionTitle} style={{ marginTop: 16 }}>
            Emissão de NFS-e <span className={ui.fsectionHint}>emissor e cadastro da empresa nele; grava na hora</span>
          </div>
          <ConfiguracaoNfseEmpresa empresaId={empresaId} />
        </>
      )}
    </>
  )
}
