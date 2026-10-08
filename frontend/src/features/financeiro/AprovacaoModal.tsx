import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, ShieldCheck, X } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import type { RegraAprovacao } from '@/features/aprovadores/types'
import { APROVACAO_LABEL, type Movimento } from './types'
import s from './financeiro.module.css'

interface Props {
  movimento: Movimento | null
  regra: RegraAprovacao | undefined
  /** Nome de cada funcionário pelo id. */
  nomeDe: (id: string) => string
  /** Id do usuário logado (para saber se ele é aprovador). */
  meuId: string
  podeAprovar: boolean
  onClose: () => void
  onAprovar: (m: Movimento) => Promise<void>
  onReprovar: (m: Movimento, motivo: string) => Promise<void>
}

const quando = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '')

/** Quem aprova o lançamento, quem já assinou e quem falta. Aprovar e reprovar ficam aqui. */
export function AprovacaoModal({ movimento: m, regra, nomeDe, meuId, podeAprovar, onClose, onAprovar, onReprovar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [reprovando, setReprovando] = useState(false)
  const [busy, setBusy] = useState(false)
  const [abertoPara, setAbertoPara] = useState<string | null>(null)
  if ((m?.id ?? null) !== abertoPara) {
    setAbertoPara(m?.id ?? null)
    setMotivo('')
    setReprovando(false)
  }
  if (!m) return null

  const assinaturas = m.aprovacoes ?? []
  const assinou = (id: string) => assinaturas.find((a) => a.usuarioId === id)
  const situacao = m.aprovacao ?? 'pendente'
  const souAprovador = !!regra && regra.aprovadores.includes(meuId)
  const jaAssinei = !!assinou(meuId)
  const podeAgir = situacao === 'pendente' && podeAprovar && souAprovador && !jaAssinei
  const total = m.totalParcelas > 1 ? `${m.totalParcelas} parcelas` : ''

  const executar = async (acao: () => Promise<void>) => {
    setBusy(true)
    try {
      await acao()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={!!m}
      onClose={onClose}
      title="Aprovação do lançamento"
      subtitle={`${m.parceiroNome} · ${m.descricao}${total ? ` · ${total}` : ''}`}
      icon={<ShieldCheck />}
      maxWidth={620}
      maximizavel={false}
      busy={busy}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Fechar</button>
          {podeAgir && !reprovando && (
            <>
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setReprovando(true)}><X /> Reprovar</button>
              <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => executar(() => onAprovar(m))}><Check /> Aprovar</button>
            </>
          )}
          {podeAgir && reprovando && (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!motivo.trim()} onClick={() => executar(() => onReprovar(m, motivo.trim()))}>Confirmar reprovação</button>
          )}
        </>
      }
    >
      <div className={s.aprovTopo}>
        <span className={`${s.aprov} ${s[`aprov_${situacao}`]}`}>{APROVACAO_LABEL[situacao]}</span>
        <span>{formatBRL(m.valor)}{m.totalParcelas > 1 ? ' nesta parcela' : ''}</span>
        {regra && <span className={ui.cellMut}>Regra: <b>{regra.nome}</b></span>}
      </div>

      {!regra && situacao === 'pendente' && (
        <div className={s.aprovAviso}>
          <AlertTriangle size={16} />
          <span>
            Não existem regras ou aprovadores cadastrados para este valor. Ninguém consegue aprovar até o gestor criar a regra em{' '}
            <Link to="/cadastros/aprovadores">Parametrizações › Aprovadores e Regras</Link> (tipo "Lançamentos financeiros").
          </span>
        </div>
      )}

      {regra && (
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Aprovador</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {regra.aprovadores.map((id) => {
              const a = assinou(id)
              return (
                <tr key={id}>
                  <td className={ui.cellStrong}>{nomeDe(id) || 'Funcionário removido'}{id === meuId ? ' (você)' : ''}</td>
                  <td>
                    {a ? (
                      <span className={`${s.aprov} ${s.aprov_aprovado}`}>Assinou em {quando(a.em)}</span>
                    ) : situacao === 'reprovado' ? (
                      <span className={ui.cellMut}>—</span>
                    ) : (
                      <span className={`${s.aprov} ${s.aprov_pendente}`}>Aguardando</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {situacao === 'reprovado' && (
        <div className={s.aprovAviso}>
          <X size={16} />
          <span>
            Reprovado por <b>{m.reprovadoPor}</b> em {quando(m.reprovadoEm ?? '')}: {m.motivoReprovacao}
          </span>
        </div>
      )}

      {situacao === 'pendente' && regra && !podeAgir && (
        <div className={s.aprovNota}>
          {!podeAprovar
            ? 'Você não tem a permissão de aprovar lançamentos (Funcionários e permissões).'
            : !souAprovador
              ? 'Você não está entre os aprovadores desta regra.'
              : 'Você já assinou. Falta a assinatura dos demais.'}
        </div>
      )}

      {reprovando && (
        <label className={s.aprovMotivo}>
          Motivo da reprovação
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex.: valor diferente do contrato" autoFocus />
        </label>
      )}
    </Modal>
  )
}
