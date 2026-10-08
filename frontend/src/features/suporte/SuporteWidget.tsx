import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronRight, MessageCircle, Search, Send, Sparkles, Ticket, X } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { visibleGroups } from '@/features/layout/nav'
import { ARTIGOS, artigoPorId, artigosDaTela, type Artigo } from './artigos'
import { buscar, responder } from './assistente'
import { abrirChamado, lerChamados, type Chamado, type MensagemChat } from './chamados'
import { aoPedirSuporte } from './eventos'
import s from './suporte.module.css'

type Vista = 'inicio' | 'artigo' | 'chat' | 'chamados'

const SUGESTOES = ['Como precificar um serviço?', 'Por que o fator mudou?', 'Como aprovar um lançamento?', 'Como montar a ficha técnica?']

/** Nome da tela aberta, pelo menu. */
function nomeDaTela(rota: string, permissoes?: string[]): string {
  for (const g of visibleGroups(permissoes)) for (const i of g.items) if (rota === i.path || rota.startsWith(`${i.path}/`)) return i.label
  return 'ELROND'
}

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

/**
 * Suporte no canto inferior direito (versão inicial): base de artigos, assistente que
 * responde pela base e abertura de chamado. Nada sai do navegador ainda; a etiqueta
 * "prévia" deixa isso claro para quem testa.
 */
export function SuporteWidget() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [vista, setVista] = useState<Vista>('inicio')
  const [busca, setBusca] = useState('')
  const [artigo, setArtigo] = useState<Artigo | null>(null)
  const [voltarPara, setVoltarPara] = useState<Vista>('inicio')
  const [feedback, setFeedback] = useState<'sim' | null>(null)
  const [conversa, setConversa] = useState<MensagemChat[]>([])
  const [texto, setTexto] = useState('')
  const [digitando, setDigitando] = useState(false)
  const [chamados, setChamados] = useState<Chamado[]>([])
  const fimRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const email = user?.email ?? ''
  const primeiroNome = (user?.name ?? '').split(' ')[0]
  const tela = nomeDaTela(pathname, user?.permissoes)
  const daTela = artigosDaTela(pathname)
  const resultados = busca.trim() ? buscar(busca).map((r) => r.artigo) : []

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [conversa, digitando])

  // "Suporte (prévia)" no menu e na busca global abrem esta mesma janela.
  useEffect(
    () =>
      aoPedirSuporte(() => {
        setAberto(true)
        setVista('inicio')
        setChamados(lerChamados(email))
      }),
    [email],
  )

  const abrir = () => {
    setAberto(true)
    setChamados(lerChamados(email))
  }
  const verArtigo = (a: Artigo, de: Vista) => {
    setArtigo(a)
    setVoltarPara(de)
    setFeedback(null)
    setVista('artigo')
  }
  const iniciarChat = (pergunta?: string) => {
    setVista('chat')
    if (conversa.length === 0) {
      setConversa([{ de: 'assistente', texto: `Olá${primeiroNome ? `, ${primeiroNome}` : ''}. Sou o assistente do ELROND. Pergunte sobre qualquer tela; respondo pela base de conhecimento.` }])
    }
    if (pergunta) perguntar(pergunta)
    else setTimeout(() => inputRef.current?.focus(), 50)
  }
  const perguntar = (pergunta: string) => {
    const p = pergunta.trim()
    if (!p) return
    setConversa((c) => [...c, { de: 'voce', texto: p }])
    setTexto('')
    setDigitando(true)
    // Pequena pausa para a resposta não "piscar" (o agente real também leva um instante).
    setTimeout(() => {
      const r = responder(p)
      setConversa((c) => [...c, { de: 'assistente', texto: r.texto, artigoId: r.artigoId }])
      setDigitando(false)
    }, 650)
  }
  const enviar = (e: FormEvent) => {
    e.preventDefault()
    perguntar(texto)
  }
  const falarComPessoa = () => {
    const primeira = conversa.find((m) => m.de === 'voce')?.texto ?? 'Atendimento pelo chat'
    const ch = abrirChamado(email, { assunto: primeira.slice(0, 80), tela, conversa })
    setChamados(lerChamados(email))
    setConversa((c) => [
      ...c,
      { de: 'voce', texto: 'Quero falar com uma pessoa.' },
      { de: 'sistema', texto: `Chamado ${ch.numero} aberto com esta conversa e a tela ${tela}. Nesta prévia o chamado fica registrado só aqui; na versão final, a equipe recebe e responde nesta mesma janela.` },
    ])
  }
  const irPara = (rota: string) => {
    navigate(rota)
    setAberto(false)
  }

  const ultimaResposta = [...conversa].reverse().find((m) => m.de === 'assistente')
  const jaAbriuChamado = conversa.some((m) => m.de === 'sistema')
  const abertos = chamados.filter((c) => c.situacao !== 'resolvido').length

  return (
    <>
      {!aberto && (
        <button type="button" className={s.fab} onClick={abrir} aria-label="Abrir o suporte" title="Suporte">
          <img src="/sun.png" alt="" className={s.fabSol} />
        </button>
      )}

      {aberto && (
        <section className={s.painel} role="dialog" aria-label="Suporte ELROND">
          <header className={s.topo}>
            {vista !== 'inicio' && (
              <button type="button" className={s.topoBtn} onClick={() => setVista(vista === 'artigo' ? voltarPara : 'inicio')} aria-label="Voltar">
                <ArrowLeft size={18} />
              </button>
            )}
            <img src="/sun.png" alt="" className={s.topoSol} />
            <div className={s.topoTitulo}>
              <b>{vista === 'chat' ? 'Assistente ELROND' : vista === 'chamados' ? 'Meus chamados' : vista === 'artigo' ? 'Base de conhecimento' : 'Suporte ELROND'}</b>
              <small>{vista === 'chat' ? 'Responde pela base de conhecimento' : `Você está em ${tela}`}</small>
            </div>
            <span className={s.previa} title="Versão inicial: o assistente responde pelos artigos e os chamados ficam neste navegador">prévia</span>
            <button type="button" className={s.topoBtn} onClick={() => setAberto(false)} aria-label="Fechar o suporte">
              <X size={18} />
            </button>
          </header>

          {vista === 'inicio' && (
            <div className={s.corpo}>
              <div className={s.ola}>
                <b>Olá{primeiroNome ? `, ${primeiroNome}` : ''}.</b>
                <span>Como podemos ajudar?</span>
              </div>
              <label className={s.busca}>
                <Search size={16} />
                <input id="suporte-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Busque na base: fator, conciliação, meta..." />
              </label>

              {busca.trim() ? (
                <div className={s.bloco}>
                  <div className={s.blocoTitulo}>Resultados na base</div>
                  {resultados.map((a) => (
                    <button key={a.id} type="button" className={s.linha} onClick={() => verArtigo(a, 'inicio')}>
                      <BookOpen size={15} />
                      <span>{a.titulo}<small>{a.tela}</small></span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  {resultados.length === 0 && (
                    <div className={s.vazio}>
                      Nenhum artigo com esse termo.{' '}
                      <button type="button" className={s.link} onClick={() => iniciarChat(busca)}>Perguntar ao assistente</button>
                    </div>
                  )}
                </div>
              ) : (
                daTela.length > 0 && (
                  <div className={s.bloco}>
                    <div className={s.blocoTitulo}>Para esta tela · {tela}</div>
                    {daTela.map((a) => (
                      <button key={a.id} type="button" className={s.linha} onClick={() => verArtigo(a, 'inicio')}>
                        <BookOpen size={15} />
                        <span>{a.titulo}</span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                )
              )}

              <div className={s.bloco}>
                <div className={s.blocoTitulo}>Falar com a gente</div>
                <button type="button" className={s.opcao} onClick={() => iniciarChat()}>
                  <span className={s.opcaoIcone}><Sparkles size={16} /></span>
                  <span><b>Perguntar ao assistente</b><small>Responde na hora, com base nos artigos</small></span>
                  <ChevronRight size={15} />
                </button>
                <button type="button" className={s.opcao} onClick={() => setVista('chamados')}>
                  <span className={s.opcaoIcone}><Ticket size={16} /></span>
                  <span><b>Meus chamados</b><small>{abertos ? `${abertos} em aberto` : 'Acompanhe o que você já pediu'}</small></span>
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className={s.rodape}>{ARTIGOS.length} artigos na base · WhatsApp e atendimento humano entram na próxima etapa</div>
            </div>
          )}

          {vista === 'artigo' && artigo && (
            <div className={s.corpo}>
              <article className={s.artigo}>
                <span className={s.artigoTela}>{artigo.tela}</span>
                <h3>{artigo.titulo}</h3>
                <p>{artigo.resumo}</p>
                <ol>
                  {artigo.passos.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
                {artigo.dica && <div className={s.dica}>{artigo.dica}</div>}
                {artigo.rotas[0] && artigo.rotas[0] !== pathname && (
                  <button type="button" className={s.link} onClick={() => irPara(artigo.rotas[0])}>Abrir a tela {artigo.tela} →</button>
                )}
              </article>
              <div className={s.resolveu}>
                {feedback === 'sim' ? (
                  <span>Obrigado. Isso ajuda a melhorar a base.</span>
                ) : (
                  <>
                    <span>Isso resolveu a sua dúvida?</span>
                    <div>
                      <button type="button" className={s.chip} onClick={() => setFeedback('sim')}>Sim, resolveu</button>
                      <button type="button" className={s.chip} onClick={() => iniciarChat(artigo.titulo)}>Não, perguntar ao assistente</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {vista === 'chat' && (
            <>
              <div className={`${s.corpo} ${s.chat}`}>
                {conversa.map((m, i) => {
                  const a = m.artigoId ? artigoPorId(m.artigoId) : undefined
                  return (
                    <div key={i} className={`${s.msg} ${s[`msg_${m.de}`]}`}>
                      <div className={s.balao}>
                        {m.texto}
                        {a && (
                          <button type="button" className={s.citacao} onClick={() => verArtigo(a, 'chat')}>
                            <BookOpen size={13} /> Artigo: {a.titulo}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {digitando && (
                  <div className={`${s.msg} ${s.msg_assistente}`}>
                    <div className={`${s.balao} ${s.digitando}`} aria-label="Assistente digitando">
                      <i /><i /><i />
                    </div>
                  </div>
                )}
                {!digitando && (
                  <div className={s.chips}>
                    {conversa.length <= 1 && SUGESTOES.map((q) => (
                      <button key={q} type="button" className={s.chip} onClick={() => perguntar(q)}>{q}</button>
                    ))}
                    {conversa.length > 1 && !jaAbriuChamado && ultimaResposta && (
                      <button type="button" className={s.chip} onClick={falarComPessoa}>
                        <MessageCircle size={13} /> Falar com uma pessoa
                      </button>
                    )}
                  </div>
                )}
                <div ref={fimRef} />
              </div>
              <form className={s.envio} onSubmit={enviar}>
                <input id="suporte-mensagem" ref={inputRef} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua dúvida..." autoComplete="off" />
                <button type="submit" disabled={!texto.trim() || digitando} aria-label="Enviar">
                  <Send size={16} />
                </button>
              </form>
            </>
          )}

          {vista === 'chamados' && (
            <div className={s.corpo}>
              {chamados.length === 0 ? (
                <div className={s.vazio}>
                  Nenhum chamado ainda. Se o assistente não resolver, use "Falar com uma pessoa" na conversa.
                </div>
              ) : (
                chamados.map((c) => (
                  <div key={c.numero} className={s.chamado}>
                    <div className={s.chamadoTopo}>
                      <b>{c.numero}</b>
                      <span className={s.situacao}>{c.situacao}</span>
                    </div>
                    <span>{c.assunto}</span>
                    <small>{c.tela} · {quando(c.abertoEm)}</small>
                  </div>
                ))
              )}
              <button type="button" className={s.opcao} onClick={() => iniciarChat()}>
                <span className={s.opcaoIcone}><Sparkles size={16} /></span>
                <span><b>Nova conversa</b><small>O assistente tenta resolver antes de abrir chamado</small></span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </section>
      )}
    </>
  )
}
