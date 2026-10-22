import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { abrirConvite, aceitarConvite } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { useAuth } from './auth-context'
import s from './ConvitePage.module.css'

/** Link do convite: a pessoa vê o próprio nome, cria a senha e já entra no ELROND. */
export function ConvitePage() {
  const { token = '' } = useParams()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [quem, setQuem] = useState<{ nome: string; email: string } | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [ver, setVer] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroSenha, setErroSenha] = useState('')

  useEffect(() => {
    let vivo = true
    abrirConvite(token)
      .then((r) => vivo && setQuem(r))
      .catch((e) => vivo && setErro(getErrorMessage(e)))
      .finally(() => vivo && setCarregando(false))
    return () => { vivo = false }
  }, [token])

  const criar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (senha.length < 8) return setErroSenha('A senha precisa ter ao menos 8 caracteres.')
    if (senha !== confirma) return setErroSenha('As duas senhas não são iguais.')
    setErroSenha('')
    setEnviando(true)
    try {
      const { email } = await aceitarConvite(token, senha)
      await signIn({ email, password: senha })
    } catch (e) {
      setErroSenha(getErrorMessage(e))
      setEnviando(false)
    }
  }

  return (
    <div className={s.fundo}>
      <main className={s.cartao}>
        <div className={s.marca}><KeyRound size={18} /> ELROND</div>
        {carregando ? (
          <p className={s.texto}>Abrindo o convite...</p>
        ) : erro ? (
          <>
            <h1 className={s.titulo}>Convite indisponível</h1>
            <p className={s.texto}>{erro}</p>
            <button type="button" className={s.botaoSec} onClick={() => navigate('/login')}>Ir para o login</button>
          </>
        ) : (
          <form onSubmit={criar} className={s.form}>
            <h1 className={s.titulo}>Olá, {quem?.nome.split(' ')[0]}</h1>
            <p className={s.texto}>Crie a sua senha para entrar no ELROND com <b>{quem?.email}</b>.</p>
            <label className={s.rotulo} htmlFor="senha-nova">Senha</label>
            <div className={s.senha}>
              <input id="senha-nova" type={ver ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" autoFocus placeholder="Mínimo 8 caracteres" />
              <button type="button" onClick={() => setVer((v) => !v)} title={ver ? 'Ocultar senha' : 'Mostrar senha'}>{ver ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            <label className={s.rotulo} htmlFor="senha-confirma">Repita a senha</label>
            <div className={s.senha}>
              <input id="senha-confirma" type={ver ? 'text' : 'password'} value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" />
            </div>
            {erroSenha && <p className={s.erro} role="alert">{erroSenha}</p>}
            <button type="submit" className={s.botao} disabled={enviando}>{enviando ? 'Entrando...' : 'Criar senha e entrar'}</button>
          </form>
        )}
      </main>
    </div>
  )
}
