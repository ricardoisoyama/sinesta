import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { formatCnpj } from '@/lib/format'
import { enviarCertificadoEmpresa, getCertificadoEmpresa, removerCertificadoEmpresa } from '@/features/cadastros/api'
import s from './empresa.module.css'

const DIA = 24 * 60 * 60 * 1000

/**
 * Certificado digital A1 da empresa (assina as notas fiscais). Envio na hora, à parte do
 * "Salvar empresa": o arquivo e a senha vão para o servidor, que confere e guarda cifrado;
 * daqui para frente a tela só vê titular, CNPJ e validade.
 */
export function CertificadoEmpresa({ empresaId }: { empresaId?: string }) {
  const qc = useQueryClient()
  const chave = ['empresa-certificado', empresaId]
  const { data, isLoading } = useQuery({ queryKey: chave, queryFn: () => getCertificadoEmpresa(empresaId!), enabled: !!empresaId })
  const [arquivo, setArquivo] = useState<{ nome: string; base64: string } | null>(null)
  const [senha, setSenha] = useState('')
  const [trocando, setTrocando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ texto: string; alerta: boolean } | null>(null)
  // Data de referência para "faltam N dias": a da abertura da tela basta.
  const [agora] = useState(() => Date.now())
  // Confirmação dentro do próprio quadro (a janela do navegador destoa do sistema).
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)

  if (!empresaId) {
    return <span className={s.logoEmpty}>Salve a empresa para enviar o certificado.</span>
  }
  if (isLoading) return <Loader2 className={s.certGira} aria-label="Carregando" />
  if (data && !data.disponivel) {
    return <span className={ui.errMsg}>O servidor ainda não está preparado para guardar certificados.</span>
  }

  const cert = data?.certificado ?? null
  const mostrarEnvio = !cert || trocando

  const escolher = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    setMsg(null)
    if (!f) return
    if (f.size > 100 * 1024) {
      setMsg({ texto: 'O arquivo do certificado A1 costuma ter poucos KB. Confira se é o .pfx.', alerta: true })
      return
    }
    const r = new FileReader()
    r.onload = () => setArquivo({ nome: f.name, base64: String(r.result) })
    r.readAsDataURL(f)
  }

  const enviar = async () => {
    if (!arquivo || !senha) return
    setEnviando(true)
    setMsg(null)
    try {
      await enviarCertificadoEmpresa(empresaId, { arquivoBase64: arquivo.base64, senha, nomeArquivo: arquivo.nome })
      setArquivo(null)
      setSenha('')
      setTrocando(false)
      setMsg({ texto: 'Certificado guardado.', alerta: false })
      await qc.invalidateQueries({ queryKey: chave })
    } catch (err) {
      setMsg({ texto: getErrorMessage(err).replace(/^Não foi possível salvar \(\d+\)\. /, ''), alerta: true })
    } finally {
      setEnviando(false)
    }
  }
  // Enter na senha envia o certificado (e não o formulário da empresa).
  const enterEnvia = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    enviar()
  }

  const remover = async () => {
    setConfirmarRemocao(false)
    try {
      await removerCertificadoEmpresa(empresaId)
      setMsg({ texto: 'Certificado removido.', alerta: false })
      await qc.invalidateQueries({ queryKey: chave })
    } catch (err) {
      setMsg({ texto: getErrorMessage(err), alerta: true })
    }
  }

  const vence = cert ? new Date(cert.validoAte) : null
  const dias = vence ? Math.floor((vence.getTime() - agora) / DIA) : 0
  const situacao = !cert ? null : dias < 0 ? 'vencido' : dias <= 30 ? 'vencendo' : 'ok'

  return (
    <div className={s.cert}>
      {cert && (
        <div className={`${s.certInfo} ${situacao === 'ok' ? '' : s.certAlerta}`}>
          {situacao === 'ok' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          <div>
            <b>{cert.titular || cert.nomeArquivo}</b>
            <span>
              {cert.cnpj && <>CNPJ {formatCnpj(cert.cnpj)} · </>}
              {situacao === 'vencido'
                ? `venceu em ${vence!.toLocaleDateString('pt-BR')}`
                : `válido até ${vence!.toLocaleDateString('pt-BR')}${situacao === 'vencendo' ? ` (faltam ${dias} dias)` : ''}`}
            </span>
            <span className={s.certMeta}>
              Enviado em {new Date(cert.enviadoEm).toLocaleDateString('pt-BR')}
              {cert.enviadoPor && <> por {cert.enviadoPor}</>}
            </span>
          </div>
        </div>
      )}
      {cert && !trocando && !confirmarRemocao && (
        <div className={s.logoRow}>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setTrocando(true)}>Trocar</button>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => { setMsg(null); setConfirmarRemocao(true) }}>Remover</button>
        </div>
      )}
      {cert && confirmarRemocao && (
        <div className={s.certConfirma} role="alertdialog" aria-label="Remover o certificado">
          <span>Remover o certificado? As notas fiscais desta empresa não poderão ser assinadas até enviar outro.</span>
          <div className={s.logoRow}>
            <button type="button" className={`${ui.btn} ${s.btnPerigo}`} onClick={remover}>Remover</button>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setConfirmarRemocao(false)} autoFocus>Cancelar</button>
          </div>
        </div>
      )}
      {mostrarEnvio && (
        <div className={s.certEnvio}>
          <label className={`${ui.btn} ${ui.btnGhost}`} style={{ cursor: 'pointer' }}>
            <KeyRound size={15} /> {arquivo ? arquivo.nome : 'Escolher arquivo .pfx'}
            <input type="file" accept=".pfx,.p12,application/x-pkcs12" style={{ display: 'none' }} onChange={escolher} />
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={enterEnvia}
            placeholder="Senha do certificado"
            autoComplete="new-password"
            aria-label="Senha do certificado"
          />
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={enviar} disabled={!arquivo || !senha || enviando}>
            {enviando ? 'Conferindo...' : 'Enviar'}
          </button>
          {trocando && (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => { setTrocando(false); setArquivo(null); setSenha('') }}>
              Cancelar
            </button>
          )}
        </div>
      )}
      {msg && <span className={msg.alerta ? ui.errMsg : ui.okMsg}>{msg.texto}</span>}
    </div>
  )
}
