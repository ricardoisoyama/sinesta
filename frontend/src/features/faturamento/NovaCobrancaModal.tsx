import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilePlus2 } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { listClientes, listServicos } from '@/features/cadastros/api'
import { listCarteiras } from '@/features/financeiro/api'
import { carteiraDaEmpresa } from '@/features/financeiro/types'
import { ClienteAutocomplete } from '@/features/parceiros/ClienteAutocomplete'
import { criarContrato, useRecarregarContratos } from '@/features/contratos/api'
import { hojeISO } from '@/features/contratos/regras'
import s from './faturamento.module.css'

/**
 * Cobrança avulsa (reembolso, venda pontual, multa contratual): vira uma pasta de spot por trás,
 * para nenhuma fatura existir solta, sem origem. Spot de serviço (um frete, um mutirão) nasce na
 * tela de Contratos, com o modelo de contrato.
 */
export function NovaCobrancaModal({ onClose, onCriado }: { onClose: () => void; onCriado: (contratoId: string, competencia: string) => void }) {
  const recarregar = useRecarregarContratos()
  const { data: empresasData } = useEmpresasQuery()
  const { data: clientes } = useQuery({ queryKey: ['clientes'], queryFn: listClientes })
  const { data: servicos } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })
  const { data: carteiras } = useQuery({ queryKey: ['carteiras'], queryFn: listCarteiras })
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo')
  const [f, setF] = useState({ clienteId: '', clienteTexto: '', empresaId: '', data: hojeISO(), descricao: '', valor: 0, prazo: 15, servicoId: '', carteiraId: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const empresaId = f.empresaId || empresas[0]?.id || ''
  const valido = !!f.clienteId && !!empresaId && f.descricao.trim() && f.valor > 0

  const criar = async () => {
    setErro('')
    setSalvando(true)
    try {
      const c = await criarContrato({
        empresaId, clienteId: f.clienteId, modeloId: '', modalidade: 'spot', inicio: f.data, fim: f.data,
        condicoes: {
          faturarDesde: f.data.slice(0, 7), diaFaturamento: 1, referencia: 'mes-atual', diaVencimento: 10, anteciparFimDeSemana: true, renovacaoAutomatica: false, avisoPrevioDias: 0,
          reajusteIndice: 'IPCA', reajusteMesBase: 1, multaRescisoria: '', carteiraId: f.carteiraId, formaCobranca: 'Boleto com Pix', prazoPagamentoDias: f.prazo,
          agrupamento: 'periodo', fechamento: 'mensal', semNotaFiscal: false, semBoleto: false,
        },
        itens: [{ id: crypto.randomUUID(), apelido: '', tabela: false, servico: 'Cobrança avulsa', descricao: f.descricao.trim(), quantidade: 1, unidade: 'serviço', valorUnitario: f.valor, custoUnitario: 0 }],
        contato: '', localServico: '', servicoId: f.servicoId, textoAdicionalNota: '', caracteristicas: {},
        componentes: [],
      })
      await recarregar()
      onCriado(c.id, f.data.slice(0, 7))
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova cobrança avulsa"
      subtitle="Reembolso, venda pontual, multa contratual: a fatura já entra na Central para conferir."
      icon={<FilePlus2 />}
      maxWidth={640}
      maximizavel={false}
      error={erro}
      busy={salvando}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!valido || salvando} onClick={() => void criar()}><FilePlus2 /> Criar</button>
        </>
      }
    >
      <div className={s.formGrade}>
        <label className={s.largo}>
          Cliente
          <ClienteAutocomplete clientes={clientes ?? []} value={f.clienteTexto} clienteId={f.clienteId} onChange={(t) => setF({ ...f, clienteTexto: t, clienteId: '' })} onSelect={(c) => setF({ ...f, clienteId: c.id, clienteTexto: c.nome, prazo: c.prazoPagamentoDias || f.prazo })} placeholder="Nome, fantasia ou CNPJ do cadastro" />
        </label>
        <label>
          Empresa
          <select value={empresaId} onChange={(e) => setF({ ...f, empresaId: e.target.value, carteiraId: '' })}>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </label>
        <label className={s.largo}>
          Descrição
          <input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Ex.: Reembolso de pedágio de setembro" />
        </label>
        <label>
          Data
          <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
        </label>
        <label>
          Valor (R$)
          <input type="number" min={0} step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} />
        </label>
        <label>
          Vence em (dias)
          <input type="number" min={0} value={f.prazo} onChange={(e) => setF({ ...f, prazo: Number(e.target.value) })} />
        </label>
        <label>
          Serviço da nota
          <select value={f.servicoId} onChange={(e) => setF({ ...f, servicoId: e.target.value })}>
            <option value="">Escolha</option>
            {(servicos ?? []).filter((x) => x.status !== 'inativo').map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
        <label>
          Conta que recebe
          <select value={f.carteiraId} onChange={(e) => setF({ ...f, carteiraId: e.target.value })}>
            <option value="">Escolha</option>
            {(carteiras ?? []).filter((c) => c.status !== 'inativo' && carteiraDaEmpresa(c, empresaId)).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      </div>
    </Modal>
  )
}
