import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Camera, CheckCircle2, Keyboard } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { lerCodigoBoleto } from '@/features/financeiro/codigoBoleto'
import { enviarLeitura, leituraValida } from './api'
import s from './leituraBoleto.module.css'

type Estado = 'conferindo' | 'expirado' | 'lendo' | 'enviando' | 'pronto'

const hoje = () => new Date().toISOString().slice(0, 10)
const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')

/**
 * Página do celular do "Ler boleto em outro dispositivo" (pública: o celular não está logado; vale o token
 * do QR, por 10 minutos). Abre a câmera traseira, lê o código de barras do boleto e manda só os dígitos para
 * a tela do computador. Sem câmera (ou se não ler), dá para digitar a linha digitável.
 */
export function LeituraBoletoPage() {
  const { token = '' } = useParams()
  const [estado, setEstado] = useState<Estado>('conferindo')
  const [erro, setErro] = useState('')
  const [digitando, setDigitando] = useState(false)
  const [texto, setTexto] = useState('')
  const [lido, setLido] = useState<{ valor: number; vencimento: string } | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const parar = useRef<(() => void) | null>(null)
  const enviando = useRef(false)

  useEffect(() => {
    leituraValida(token)
      .then((r) => setEstado(r.valida ? 'lendo' : 'expirado'))
      .catch(() => setEstado('expirado'))
  }, [token])

  const enviar = async (codigo: string) => {
    if (enviando.current) return
    enviando.current = true
    setEstado('enviando')
    try {
      setLido(await enviarLeitura(token, codigo))
      parar.current?.()
      setEstado('pronto')
    } catch (e) {
      setErro(getErrorMessage(e))
      setEstado('lendo')
    } finally {
      enviando.current = false
    }
  }

  // Câmera: lê ITF (o código de barras do boleto) e só aceita código que confere (dígitos verificadores).
  useEffect(() => {
    if (estado !== 'lendo' || digitando || !video.current) return
    let vivo = true
    ;(async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
        const hints = new Map<number, unknown>([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.ITF]], [DecodeHintType.TRY_HARDER, true]])
        const leitor = new BrowserMultiFormatReader(hints as never)
        const controles = await leitor.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
          video.current!,
          (resultado) => {
            if (!resultado || !vivo) return
            const t = resultado.getText()
            if (lerCodigoBoleto(t, hoje()).codigo) void enviar(t)
          },
        )
        if (!vivo) controles.stop()
        else parar.current = () => controles.stop()
      } catch (e) {
        const negou = e instanceof Error && /permission|notallowed/i.test(`${e.name} ${e.message}`)
        if (vivo) setErro(negou ? 'A câmera não foi liberada. Libere nas permissões do navegador ou digite a linha digitável.' : 'Não consegui abrir a câmera deste aparelho. Digite a linha digitável.')
        if (vivo) setDigitando(true)
      }
    })()
    return () => {
      vivo = false
      parar.current?.()
      parar.current = null
    }
  }, [estado, digitando]) // eslint-disable-line react-hooks/exhaustive-deps

  const digitado = lerCodigoBoleto(texto, hoje())

  return (
    <div className={s.fundo}>
      <div className={s.cartao}>
        <div className={s.marca}>ELROND</div>
        {estado === 'conferindo' && <p className={s.texto}>Abrindo...</p>}
        {estado === 'expirado' && (
          <>
            <h1 className={s.titulo}>Link expirado</h1>
            <p className={s.texto}>Este link vale 10 minutos e uma leitura. No computador, clique de novo em <b>Ler boleto em outro dispositivo</b>.</p>
          </>
        )}
        {estado === 'pronto' && (
          <div className={s.pronto}>
            <CheckCircle2 size={44} />
            <h1 className={s.titulo}>Boleto lido</h1>
            <p className={s.texto}>
              {lido?.valor ? <>{formatBRL(lido.valor)}{lido.vencimento ? ` · vence ${dataBR(lido.vencimento)}` : ''}. </> : null}
              O código já apareceu na tela do computador. Pode fechar esta página.
            </p>
          </div>
        )}
        {(estado === 'lendo' || estado === 'enviando') && (
          <>
            <h1 className={s.titulo}>Ler o código de barras</h1>
            {!digitando ? (
              <>
                <p className={s.texto}>Aponte a câmera para o código de barras do boleto, com ele inteiro e na horizontal dentro do quadro.</p>
                <div className={s.camera}>
                  <video ref={video} muted playsInline />
                  <span className={s.mira} aria-hidden />
                </div>
                <p className={s.dica}><Camera size={14} /> {estado === 'enviando' ? 'Mandando para o computador...' : 'Procurando o código...'}</p>
                <button type="button" className={s.botaoSec} onClick={() => setDigitando(true)}><Keyboard size={15} /> Digitar a linha digitável</button>
              </>
            ) : (
              <>
                <p className={s.texto}>Digite os números da linha digitável (os 47 dígitos de cima do boleto, ou 48 na conta de consumo).</p>
                <input className={s.campo} inputMode="numeric" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="00000.00000 00000.000000 ..." aria-label="Linha digitável" />
                {texto.replace(/\D/g, '').length >= 44 && !digitado.codigo && <p className={s.erro}>{digitado.erro}</p>}
                <button type="button" className={s.botao} disabled={!digitado.codigo || estado === 'enviando'} onClick={() => void enviar(texto)}>
                  Mandar para o computador
                </button>
                <button type="button" className={s.botaoSec} onClick={() => { setErro(''); setDigitando(false) }}><Camera size={15} /> Usar a câmera</button>
              </>
            )}
            {erro && <p className={s.erro}>{erro}</p>}
          </>
        )}
      </div>
    </div>
  )
}
