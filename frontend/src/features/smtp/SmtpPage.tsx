import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Mail, Save, Send } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Field } from '@/features/common/Field'
import { getErrorMessage } from '@/lib/api'
import { listarEnviados, obterSmtp, salvarSmtp, testarSmtp, type SalvarSmtp, type Smtp } from './api'
import s from './smtp.module.css'

const PORTAS: Record<SalvarSmtp['seguranca'], number> = { starttls: 587, ssl: 465, nenhuma: 25 }
const dataHora = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '')

/**
 * Administrativo › Integração SMTP (só o perfil Suporte): de onde saem os e-mails do sistema
 * (pagamento efetuado, fatura, boleto). No piloto, tudo vai só para o e-mail de teste.
 */
export function SmtpPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['integracao-smtp'], queryFn: obterSmtp })
  const { data: enviados } = useQuery({ queryKey: ['integracao-smtp', 'enviados'], queryFn: listarEnviados })
  if (isLoading || !data) return <PageHeader breadcrumb="Administrativo" title="Integração SMTP" subtitle="Carregando..." />
  return <Formulario key={data.alteradoEm} atual={data} enviados={enviados ?? []} onSalvo={() => qc.invalidateQueries({ queryKey: ['integracao-smtp'] })} />
}

function Formulario({ atual, enviados, onSalvo }: { atual: Smtp; enviados: Awaited<ReturnType<typeof listarEnviados>>; onSalvo: () => void }) {
  const [d, setD] = useState<SalvarSmtp>({ ...atual, senha: null })
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [paraTeste, setParaTeste] = useState('')
  const set = (p: Partial<SalvarSmtp>) => setD((x) => ({ ...x, ...p }))

  const executar = async (fn: () => Promise<string>) => {
    setOcupado(true)
    setAviso(null)
    try {
      setAviso({ texto: await fn(), ok: true })
      onSalvo()
    } catch (err) {
      setAviso({ texto: getErrorMessage(err), ok: false })
    } finally {
      setOcupado(false)
    }
  }
  const salvar = () => executar(async () => { await salvarSmtp(d); return 'Configuração salva.' })
  const testar = () => executar(async () => { await salvarSmtp(d); return (await testarSmtp(paraTeste)).mensagem })

  return (
    <div>
      <PageHeader
        breadcrumb="Administrativo"
        title="Integração SMTP"
        subtitle="Servidor de e-mail do sistema: de onde saem os avisos (pagamento efetuado, fatura, boleto). Só a equipe ELROND configura."
        action={
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void salvar()} disabled={ocupado}>
            <Save /> Salvar
          </button>
        }
      />
      {aviso && (
        <div className={`${s.aviso} ${aviso.ok ? s.ok : s.erro}`} role="status">
          {aviso.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {aviso.texto}
        </div>
      )}
      <div className={s.grade}>
        <section className={ui.card}>
          <div className={s.cartao}>
            <div className={s.linhaTopo}>
              <label className={ui.checkItem}>
                <input type="checkbox" checked={d.ativo} onChange={(e) => set({ ativo: e.target.checked })} /> Envio de e-mails ligado
              </label>
              {atual.testadoEm && (
                <span className={atual.testeOk ? s.okTexto : s.erroTexto}>
                  Último teste {dataHora(atual.testadoEm)}: {atual.testeOk ? 'enviado' : 'falhou'}
                </span>
              )}
            </div>
            <div className={ui.grid}>
              <Field className={ui.col2} label="Servidor (host)" req>
                <input value={d.host} onChange={(e) => set({ host: e.target.value })} placeholder="Ex.: smtp.gmail.com" />
              </Field>
              <Field label="Segurança">
                <select value={d.seguranca} onChange={(e) => { const v = e.target.value as SalvarSmtp['seguranca']; set({ seguranca: v, porta: PORTAS[v] }) }}>
                  <option value="starttls">STARTTLS (587)</option>
                  <option value="ssl">SSL/TLS (465)</option>
                  <option value="nenhuma">Nenhuma</option>
                </select>
              </Field>
              <Field label="Porta" req>
                <input type="number" min={1} max={65535} value={d.porta} onChange={(e) => set({ porta: Number(e.target.value) || 0 })} />
              </Field>
              <Field className={ui.col2} label="Usuário">
                <input value={d.usuario} onChange={(e) => set({ usuario: e.target.value })} placeholder="Normalmente o próprio e-mail" autoComplete="off" />
              </Field>
              <Field className={ui.col2} label="Senha" hint={atual.temSenha ? 'Já existe uma senha gravada. Deixe em branco para manter.' : 'Fica cifrada; nunca volta para a tela.'}>
                <input type="password" value={d.senha ?? ''} onChange={(e) => set({ senha: e.target.value || null })} placeholder={atual.temSenha ? '•••••••• (mantida)' : ''} autoComplete="new-password" />
              </Field>
              <Field className={ui.col2} label="Nome do remetente">
                <input value={d.remetenteNome} onChange={(e) => set({ remetenteNome: e.target.value })} placeholder="Ex.: Financeiro Mirai" />
              </Field>
              <Field className={ui.col2} label="E-mail do remetente" req>
                <input type="email" value={d.remetenteEmail} onChange={(e) => set({ remetenteEmail: e.target.value })} placeholder="financeiro@empresa.com.br" />
              </Field>
              <Field className={ui.col2} label="Responder para" hint="Vazio = o próprio remetente.">
                <input type="email" value={d.responderPara} onChange={(e) => set({ responderPara: e.target.value })} />
              </Field>
              <Field className={ui.col2} label="E-mail de teste" hint="Recebe o teste e, no modo piloto, todos os e-mails do sistema.">
                <input type="email" value={d.emailTeste} onChange={(e) => set({ emailTeste: e.target.value })} />
              </Field>
              <div className={ui.col4}>
                <label className={ui.checkItem}>
                  <input type="checkbox" checked={d.somenteTeste} onChange={(e) => set({ somenteTeste: e.target.checked })} />
                  Modo piloto: mandar tudo só para o e-mail de teste (o destinatário real aparece no assunto)
                </label>
              </div>
            </div>
            <div className={s.teste}>
              <input type="email" value={paraTeste} onChange={(e) => setParaTeste(e.target.value)} placeholder={d.emailTeste || 'para quem mandar o teste'} aria-label="Mandar o teste para" />
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => void testar()} disabled={ocupado}>
                <Send /> {ocupado ? 'Enviando...' : 'Salvar e enviar e-mail de teste'}
              </button>
            </div>
          </div>
        </section>

        <section className={ui.card}>
          <div className={s.cartao}>
            <div className={ui.fsectionTitle}><Mail size={14} /> Últimos envios</div>
            {enviados.length === 0 ? (
              <p className={ui.cellMut}>Nenhum e-mail enviado ainda.</p>
            ) : (
              <ul className={s.envios}>
                {enviados.slice(0, 30).map((e) => (
                  <li key={e.id}>
                    <span className={`${ui.badge} ${e.situacao === 'enviado' ? ui.badgeOk : e.situacao === 'falhou' ? ui.badgeErr : ui.badgeOff}`}>{e.situacao}</span>
                    <div>
                      <b>{e.assunto}</b>
                      <span>
                        {dataHora(e.em)} · para {e.para || '—'}
                        {e.enviadoPara && e.enviadoPara !== e.para ? ` (foi para ${e.enviadoPara})` : ''}
                        {e.erro ? ` · ${e.erro}` : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
