import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Landmark, Pencil, Plus, Wallet } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { atualizarCarteira, criarCarteira, listCarteiras } from '@/features/financeiro/api'
import { CHAVE_CARTEIRAS } from '@/features/financeiro/store'
import { CarteiraFormModal } from '@/features/financeiro/CarteiraFormModal'
import type { Carteira } from '@/features/financeiro/types'
import type { DadosBancarios } from '@/features/parceiros/types'
import s from './empresa.module.css'

interface Props {
  /** Empresa já gravada (conta nova precisa do id dela). */
  empresaId: string
  /** Dados bancários antigos da empresa: viram a primeira conta com um clique. */
  bancoAntigo?: DadosBancarios | null
}

const ROTULO_TIPO: Record<Carteira['tipo'], string> = { banco: 'Banco', caixa: 'Caixa', cartao: 'Cartão' }

/**
 * Contas da empresa (aba Dados bancários): cada conta é a carteira que o Caixa, a Conciliação,
 * as Entradas e Saídas e as Integrações Bancárias usam. É o único lugar onde se cadastra conta.
 */
export function ContasEmpresa({ empresaId, bancoAntigo }: Props) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: CHAVE_CARTEIRAS, queryFn: listCarteiras })
  const [editando, setEditando] = useState<Carteira | null | undefined>(undefined)
  const contas = (data ?? []).filter((c) => c.empresaId === empresaId)

  const salvar = async (c: Carteira) => {
    const existe = (data ?? []).some((x) => x.id === c.id)
    await (existe ? atualizarCarteira(c) : criarCarteira({ ...c, id: c.id || crypto.randomUUID() }))
    await qc.invalidateQueries({ queryKey: ['financeiro'] })
  }
  // A conta que já estava nos dados bancários da empresa vira a primeira carteira (preenchida, para conferir).
  const deAntigo = (): Carteira | null =>
    bancoAntigo && (bancoAntigo.banco || bancoAntigo.conta)
      ? { id: '', nome: bancoAntigo.banco || 'Conta principal', empresaId, tipo: 'banco', banco: bancoAntigo.banco, agencia: bancoAntigo.agencia, conta: bancoAntigo.conta, saldoInicial: 0, saldoInicialEm: new Date().toLocaleDateString('sv-SE'), cor: '#2563eb', status: 'ativo' }
      : null

  if (!empresaId)
    return <div className={ui.modalNote}>Salve a empresa primeiro; depois cadastre aqui as contas dela (banco, caixa ou cartão).</div>

  return (
    <div className={s.contas}>
      <div className={ui.modalNote}>
        Cada conta é uma carteira do Caixa: entra nas Entradas e Saídas, na Conciliação e pode ser ligada ao banco em Administrativo › Integrações Bancárias.
      </div>
      {contas.length === 0 ? (
        <div className={s.contasVazio}>
          Nenhuma conta cadastrada para esta empresa.
          {deAntigo() && (
            <button type="button" className={ui.linkBtn} onClick={() => setEditando(deAntigo())}>
              Criar a conta com os dados bancários já informados
            </button>
          )}
        </div>
      ) : (
        <ul className={s.contasLista}>
          {contas.map((c) => (
            <li key={c.id} className={c.status === 'inativo' ? s.contaInativa : undefined} style={{ borderLeftColor: c.cor }}>
              {c.tipo === 'banco' ? <Landmark size={16} /> : <Wallet size={16} />}
              <div>
                <b>{c.nome}</b>
                <span>
                  {ROTULO_TIPO[c.tipo]}
                  {c.tipo === 'banco' && (c.banco || c.agencia || c.conta) ? ` · ${[c.banco, c.agencia && `ag ${c.agencia}`, c.conta && `cc ${c.conta}`].filter(Boolean).join(' · ')}` : ''}
                  {` · saldo inicial ${formatBRL(c.saldoInicial)}`}
                  {c.status === 'inativo' ? ' · inativa' : ''}
                </span>
              </div>
              <button type="button" className={ui.iconBtn} title="Editar a conta" onClick={() => setEditando(c)}>
                <Pencil />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setEditando(null)}>
          <Plus /> Nova conta
        </button>
      </div>
      <CarteiraFormModal open={editando !== undefined} initial={editando ?? null} empresaFixa={empresaId} onClose={() => setEditando(undefined)} onSave={salvar} />
    </div>
  )
}
