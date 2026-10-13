import { useState } from 'react'
import { AlertTriangle, ExternalLink, RefreshCw, Unplug } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { confirmar } from '@/features/common/dialogo/dialogo'
import { useGoogleAgenda } from './google'
import s from './agenda.module.css'

const haQuanto = (iso: string) => {
  if (!iso) return 'ainda não sincronizou'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  return min < 1 ? 'sincronizado agora' : min < 60 ? `sincronizado há ${min} min` : `sincronizado às ${new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/** Conectar, ver e desconectar o Google Agenda do usuário logado. */
export function GoogleConexao({ onAviso }: { onAviso: (texto: string, tipo: 'ok' | 'erro') => void }) {
  const { status, conectar, desconectar, sincronizar } = useGoogleAgenda()
  const [trabalhando, setTrabalhando] = useState(false)

  const executar = async (acao: () => Promise<unknown>, sucesso?: (r: unknown) => string) => {
    setTrabalhando(true)
    try {
      const r = await acao()
      if (sucesso) onAviso(sucesso(r), 'ok')
    } catch (err) {
      onAviso(getErrorMessage(err), 'erro')
    } finally {
      setTrabalhando(false)
    }
  }

  if (!status) return null
  if (!status.configurado)
    return (
      <button type="button" className={`${ui.btn} ${ui.btnGhost}`} disabled title="O app ELROND ainda não foi configurado no Google Cloud (chaves no servidor).">
        <ExternalLink /> Conectar Google Agenda
      </button>
    )
  if (!status.conectado)
    return (
      <span className={s.googleBox}>
        {status.ultimoErro && <span className={s.googleErro} title={status.ultimoErro}><AlertTriangle size={14} /> conexão caiu</span>}
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} disabled={trabalhando} onClick={() => executar(conectar)}>
          <ExternalLink /> Conectar Google Agenda
        </button>
      </span>
    )
  return (
    <span className={s.googleBox}>
      <span className={s.googleConta} title={status.ultimoErro || `Compromissos e próximas ações do CRM vão para ${status.email}; mudanças feitas lá voltam a cada 5 minutos.`}>
        <i className={status.ultimoErro ? s.googlePontoErro : s.googlePonto} />
        <span>
          <b>{status.email}</b>
          <small>{status.ultimoErro ? 'erro na última sincronização' : haQuanto(status.ultimaSincronia)}</small>
        </span>
      </span>
      <button type="button" className={ui.iconBtn} disabled={trabalhando} title="Sincronizar agora" onClick={() => executar(sincronizar, (n) => `Sincronizado com o Google: ${n} ${n === 1 ? 'item enviado' : 'itens conferidos'}.`)}>
        <RefreshCw className={trabalhando ? s.girando : ''} />
      </button>
      <button
        type="button"
        className={ui.iconBtn}
        disabled={trabalhando}
        title="Desconectar o Google Agenda"
        onClick={async () => {
          const ok = await confirmar({
            titulo: 'Desconectar Google Agenda',
            mensagem: 'Desconectar o Google Agenda? Os eventos já criados ficam no seu Google; os novos deixam de ir.',
            confirmar: 'Desconectar',
            perigo: true,
          })
          if (ok) executar(desconectar, () => 'Google Agenda desconectado.')
        }}
      >
        <Unplug />
      </button>
    </span>
  )
}
