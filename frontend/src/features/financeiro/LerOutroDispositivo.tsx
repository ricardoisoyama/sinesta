import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { abrirLeitura, consultarLeitura, linkDaLeitura } from '@/features/leituraBoleto/api'
import s from './financeiro.module.css'

interface Props {
  /** Para quem é o boleto (aparece no título). */
  favorecido: string
  onLido: (codigo: string) => void
  onClose: () => void
}

/**
 * "Ler boleto em outro dispositivo": mostra um QR com um link de uso único (10 minutos). O celular abre o
 * link, lê o código de barras com a câmera e o código aparece aqui sozinho (a tela pergunta a cada 2 segundos).
 */
export function LerOutroDispositivo({ favorecido, onLido, onClose }: Props) {
  const [link, setLink] = useState('')
  const [qr, setQr] = useState('')
  const [token, setToken] = useState('')
  const [erro, setErro] = useState('')
  const [expirou, setExpirou] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let vivo = true
    setErro('')
    setExpirou(false)
    abrirLeitura()
      .then(async (sessao) => {
        if (!vivo) return
        const l = linkDaLeitura(sessao.token)
        const { toDataURL } = await import('qrcode')
        const img = await toDataURL(l, { margin: 1, width: 240, color: { dark: '#143d18', light: '#ffffff' } })
        if (!vivo) return
        setToken(sessao.token)
        setLink(l)
        setQr(img)
      })
      .catch((e) => vivo && setErro(getErrorMessage(e)))
    return () => {
      vivo = false
    }
  }, [tentativa])

  useEffect(() => {
    if (!token || expirou) return
    const id = window.setInterval(async () => {
      try {
        const r = await consultarLeitura(token)
        if (!r.valida) setExpirou(true)
        else if (r.codigo) {
          window.clearInterval(id)
          onLido(r.codigo)
        }
      } catch {
        setExpirou(true)
      }
    }, 2000)
    return () => window.clearInterval(id)
  }, [token, expirou]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      open
      onClose={onClose}
      title="Ler boleto em outro dispositivo"
      subtitle={favorecido}
      icon={<Smartphone />}
      maxWidth={460}
      maximizavel={false}
      error={erro}
      footer={<button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Fechar</button>}
    >
      <div className={s.outroDispositivo}>
        {expirou ? (
          <>
            <p>O link expirou (vale 10 minutos).</p>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => { setToken(''); setQr(''); setTentativa((t) => t + 1) }}>Gerar outro QR</button>
          </>
        ) : qr ? (
          <>
            <img src={qr} width={240} height={240} alt="QR Code para abrir a leitura no celular" />
            <ol>
              <li>Aponte a câmera do celular para o QR Code e abra o link.</li>
              <li>Permita a câmera e mire no código de barras do boleto.</li>
              <li>O código aparece aqui sozinho.</li>
            </ol>
            <p className={ui.cellMut}>Aguardando o celular... O link vale 10 minutos e uma leitura: <span className={s.linkLeitura}>{link}</span></p>
          </>
        ) : (
          !erro && <p className={ui.cellMut}>Gerando o QR Code...</p>
        )}
      </div>
    </Modal>
  )
}
