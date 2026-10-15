import { useState } from 'react'
import { FilePlus2 } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { gerarId, prototipo, proximoNumero, usePrototipo } from '@/features/contratos/store'
import { hojeISO } from '@/features/contratos/regras'
import type { Contrato } from '@/features/contratos/types'
import s from './faturamento.module.css'

type Tipo = 'spot' | 'avulsa'

const somaDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Novo spot (serviço avulso, ganha a sua pasta) ou cobrança avulsa (reembolso, venda pontual).
 * Os dois viram uma pasta de spot por trás: nenhuma fatura existe solta, sem origem.
 * No sistema, o spot nasce normalmente da proposta aprovada; aqui é o atalho rápido.
 */
export function NovaCobrancaModal({ onClose, onCriado }: { onClose: () => void; onCriado: (contratoId: string, competencia: string) => void }) {
  const { contratos, modelos } = usePrototipo()
  const clientes = [...new Map(contratos.map((c) => [c.clienteNome, c])).values()]
  const [tipo, setTipo] = useState<Tipo>('spot')
  const [f, setF] = useState({ cliente: '', empresaId: 'matriz', modeloId: modelos[0]?.id ?? '', data: hojeISO(), descricao: '', valor: 0, prazo: 15, servico: '' })
  const modelo = modelos.find((m) => m.id === f.modeloId)
  const servicos = [...new Set(modelos.flatMap((m) => m.componentes.map((c) => c.servicoNfse)).filter(Boolean))]
  const valido = f.cliente.trim() && f.descricao.trim() && f.valor > 0

  const criar = () => {
    const ref = clientes.find((c) => c.clienteNome === f.cliente.trim())
    const id = gerarId('n')
    const empresaNome = f.empresaId === 'filial' ? 'Mirai - Filial 02' : 'Mirai - Matriz'
    const servico = f.servico || modelo?.componentes.find((c) => c.servicoNfse)?.servicoNfse || 'Prestação de serviço'
    const vencimento = somaDias(f.data, f.prazo)
    const c: Contrato = {
      id,
      numero: proximoNumero(contratos, f.empresaId),
      empresaId: f.empresaId,
      empresaNome,
      clienteNome: f.cliente.trim(),
      clienteDocumento: ref?.clienteDocumento ?? '—',
      contato: ref?.contato ?? '',
      tipoOperacao: tipo === 'avulsa' ? 'Cobrança avulsa' : modelo?.tipoOperacao ?? 'Serviço',
      modalidade: 'spot',
      situacao: 'a-faturar',
      inicio: f.data,
      fim: f.data,
      propostaNumero: '—',
      propostaAprovadaEm: f.data,
      servicoNfse: servico,
      servicoNfseDetalhe: servico.includes('CT-e') ? 'Documento fiscal da própria viagem' : 'Parâmetros fiscais do cadastro de serviços',
      textoAdicionalNota: '',
      centroCusto: modelo?.tipoOperacao ?? 'Geral',
      responsavel: 'você',
      escopo: [{ versao: 1, vigenteDesde: f.data, motivo: tipo === 'avulsa' ? 'Cobrança avulsa' : 'Spot lançado na Central', itens: [{ id: `${id}-i`, servico: tipo === 'avulsa' ? 'Cobrança avulsa' : modelo?.nome ?? 'Serviço', descricao: f.descricao.trim(), quantidade: 1, unidade: 'serviço', valorUnitario: f.valor, custoUnitario: 0 }] }],
      condicoes: { ...(contratos[0]?.condicoes ?? ({} as Contrato['condicoes'])), diaVencimento: 0, prazoPagamentoDias: f.prazo, renovacaoAutomatica: false, carteira: f.empresaId === 'filial' ? 'Inter · Filial' : 'Sicredi · Matriz' },
      faturas: [{ id: `${id}-f`, competencia: f.data.slice(0, 7), vencimento, previsto: f.valor, extras: 0, descontos: 0, situacao: 'a-conferir' }],
      extras: [],
      documentos: [],
      eventos: [{ data: hojeISO(), tipo: 'assinatura', texto: tipo === 'avulsa' ? `Cobrança avulsa lançada na Central (${formatBRL(f.valor)})` : `Spot lançado na Central (${formatBRL(f.valor)})`, quem: 'você' }],
      margemRealizada: 0,
      modeloId: tipo === 'spot' ? f.modeloId : undefined,
    }
    prototipo.salvarContrato(c)
    onCriado(id, f.data.slice(0, 7))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Novo spot ou cobrança avulsa"
      subtitle="Cria a pasta do spot e a fatura já entra na Central como A conferir."
      icon={<FilePlus2 />}
      maxWidth={640}
      maximizavel={false}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!valido} onClick={criar}><FilePlus2 /> Criar</button>
        </>
      }
    >
      <div className={s.tipoEscolha} role="radiogroup" aria-label="O que é">
        <button type="button" role="radio" aria-checked={tipo === 'spot'} className={tipo === 'spot' ? s.tipoOn : ''} onClick={() => setTipo('spot')}>
          <b>Spot</b>
          <span>Serviço avulso (um frete, um mutirão). Usa um modelo de contrato.</span>
        </button>
        <button type="button" role="radio" aria-checked={tipo === 'avulsa'} className={tipo === 'avulsa' ? s.tipoOn : ''} onClick={() => setTipo('avulsa')}>
          <b>Cobrança avulsa</b>
          <span>Sem serviço: reembolso, venda pontual, multa contratual.</span>
        </button>
      </div>
      <div className={s.formGrade}>
        <label className={s.largo}>
          Cliente
          <input list="clientes-proto" value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} placeholder="Nome do cliente" />
          <datalist id="clientes-proto">{clientes.map((c) => <option key={c.clienteNome} value={c.clienteNome} />)}</datalist>
        </label>
        <label>
          Empresa
          <select value={f.empresaId} onChange={(e) => setF({ ...f, empresaId: e.target.value })}>
            <option value="matriz">Mirai - Matriz</option>
            <option value="filial">Mirai - Filial 02</option>
          </select>
        </label>
        {tipo === 'spot' && (
          <label>
            Modelo
            <select value={f.modeloId} onChange={(e) => setF({ ...f, modeloId: e.target.value })}>
              {modelos.filter((m) => m.status === 'ativo').map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </label>
        )}
        <label className={s.largo}>
          Descrição
          <input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder={tipo === 'spot' ? 'Ex.: Frete Cubatão → Sorocaba · Truck' : 'Ex.: Reembolso de pedágio de setembro'} />
        </label>
        <label>
          {tipo === 'spot' ? 'Data do serviço' : 'Data'}
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
          <select value={f.servico} onChange={(e) => setF({ ...f, servico: e.target.value })}>
            <option value="">{tipo === 'spot' ? 'O do modelo' : 'Prestação de serviço'}</option>
            {servicos.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
      </div>
    </Modal>
  )
}
