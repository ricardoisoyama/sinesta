import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus, SquareKanban, Video, X } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Hint } from '@/features/common/Hint'
import { Modal } from '@/features/common/Modal'
import { useCrm } from '@/features/crm/store'
import { useAuth } from '@/features/auth/auth-context'
import { useUsuarios } from '@/features/usuarios/store'
import { useCompromissos } from './api'
import { useGoogleAgenda, useOcupadoGoogle } from './google'
import { GoogleConexao } from './GoogleConexao'
import { GoogleEventoModal } from './GoogleEventoModal'
import { CompromissoModal, compromissoVazio } from './CompromissoModal'
import {
  SEMANA_CURTA,
  VISTAS,
  agoraMomento,
  andar,
  diaDaSemana,
  diaDe,
  diasDaVista,
  gradeDoMes,
  hojeDia,
  horaDe,
  minutosDe,
  momentoDe,
  nomeDoMes,
  somarMeses,
  somarMinutos,
  tituloDoPeriodo,
  type Vista,
} from './datas'
import { COR_CRM, COR_GOOGLE, TIPOS_COMPROMISSO, corDoEvento, posicionar, type Compromisso, type EventoAgenda } from './types'
import s from './agenda.module.css'

const HORA_PX = 44
const VISTA_KEY = 'elrond.agenda.vista'
const lerVista = (): Vista => {
  try {
    const v = localStorage.getItem(VISTA_KEY)
    return VISTAS.some((x) => x.valor === v) ? (v as Vista) : 'semana-util'
  } catch {
    return 'semana-util'
  }
}

/**
 * Agenda visual (como a do Outlook): dia, semana útil, semana e mês. Clicar num horário vazio
 * cria o compromisso ali; clicar num compromisso abre para editar. As próximas ações dos cards
 * do CRM aparecem junto (tracejadas) e abrem o card. Google/Microsoft entram depois.
 */
export function AgendaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { usuarios } = useUsuarios()
  const { oportunidades } = useCrm()
  const { compromissos, salvar, excluir } = useCompromissos()
  const meuId = usuarios.find((u) => u.email === user?.email)?.id ?? ''

  const [vista, setVista] = useState<Vista>(lerVista)
  const [foco, setFoco] = useState(hojeDia())
  const [mini, setMini] = useState(hojeDia())
  const [pessoa, setPessoa] = useState<string>('eu')
  const [verAgenda, setVerAgenda] = useState(true)
  const [verCrm, setVerCrm] = useState(true)
  const [editando, setEditando] = useState<Compromisso | null>(null)
  const [acaoCrm, setAcaoCrm] = useState<EventoAgenda | null>(null)
  const [eventoGoogle, setEventoGoogle] = useState<EventoAgenda | null>(null)
  const [agora, setAgora] = useState(agoraMomento())
  const gradeRef = useRef<HTMLDivElement>(null)
  const { status: google } = useGoogleAgenda()
  const [verGoogle, setVerGoogle] = useState(true)
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'ok' | 'erro' } | null>(null)
  // Volta do Google (?google=conectado|erro): mostra o aviso uma vez e limpa o endereço.
  const [params, setParams] = useSearchParams()
  const retornoGoogle = params.get('google')
  const [retornoLido, setRetornoLido] = useState('')
  if (retornoGoogle && retornoGoogle !== retornoLido) {
    setRetornoLido(retornoGoogle)
    setAviso(
      retornoGoogle === 'conectado'
        ? { texto: 'Google Agenda conectado. Os compromissos e as próximas ações do CRM já estão indo para a sua agenda.', tipo: 'ok' }
        : { texto: params.get('motivo') || 'Não foi possível conectar o Google Agenda.', tipo: 'erro' },
    )
  }
  const fecharAviso = () => {
    setAviso(null)
    if (retornoGoogle) setParams({}, { replace: true })
  }

  // Linha do "agora" anda sozinha.
  useEffect(() => {
    const t = window.setInterval(() => setAgora(agoraMomento()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  // Abre a grade de horários no começo do expediente (07:00), como o Outlook.
  useEffect(() => {
    if (gradeRef.current) gradeRef.current.scrollTop = 7 * HORA_PX
  }, [vista])

  const trocarVista = (v: Vista) => {
    setVista(v)
    try {
      localStorage.setItem(VISTA_KEY, v)
    } catch {
      // sem armazenamento: só não lembra a escolha
    }
  }
  const irPara = (dia: string) => {
    setFoco(dia)
    setMini(dia)
  }

  // ── eventos ──
  const quemVe = (responsavelId: string, responsavelNome: string) =>
    pessoa === 'todos' ? true : pessoa === 'eu' ? responsavelId === meuId || (!responsavelId && responsavelNome === user?.name) : responsavelId === pessoa
  const nomeDe = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? ''
  const eventos: EventoAgenda[] = [
    ...(verAgenda
      ? compromissos
          .filter((c) => quemVe(c.responsavelId, c.responsavelNome))
          .map((c): EventoAgenda => ({
            id: c.id,
            origem: 'agenda',
            titulo: c.titulo,
            tipo: c.tipo,
            inicio: c.inicio,
            fim: c.fim || c.inicio,
            diaInteiro: c.diaInteiro,
            cliente: c.clienteNome,
            responsavel: c.responsavelNome || nomeDe(c.responsavelId),
            concluido: c.concluido,
            compromisso: c,
            linkReuniao: c.linkReuniao,
          }))
      : []),
    ...(verCrm
      ? oportunidades
          .filter((o) => o.proximaAcao && o.proximaAcaoEm)
          .filter((o) => {
            // Dono do card pelo id do responsável; card antigo (só com o nome) é casado pelo nome.
            const idResp = o.responsavelId || usuarios.find((u) => u.nome === o.responsavel)?.id || ''
            return quemVe(idResp, o.responsavel)
          })
          .map((o): EventoAgenda => {
            const comHora = o.proximaAcaoEm.length > 10
            return {
              id: `crm-${o.id}`,
              origem: 'crm',
              titulo: o.proximaAcao,
              tipo: 'crm',
              inicio: o.proximaAcaoEm.slice(0, 16),
              fim: comHora ? somarMinutos(o.proximaAcaoEm.slice(0, 16), 30) : o.proximaAcaoEm.slice(0, 10),
              diaInteiro: !comHora,
              cliente: o.cliente,
              responsavel: o.responsavel,
              concluido: false,
              oportunidadeId: o.id,
            }
          })
      : []),
  ]
  // Agenda pessoal do Google: só o período ocupado, para enxergar os horários livres.
  const diasVisiveis = diasDaVista(vista, foco)
  const ocupados = useOcupadoGoogle(diasVisiveis[0], diasVisiveis[diasVisiveis.length - 1], !!google?.conectado && verGoogle && pessoa === 'eu')
  eventos.push(
    ...ocupados.map((o, i): EventoAgenda => ({
      id: `google-${i}-${o.inicio}`,
      origem: 'google',
      titulo: o.titulo,
      tipo: 'google',
      inicio: o.inicio,
      fim: o.fim,
      diaInteiro: o.diaInteiro,
      cliente: '',
      responsavel: '',
      concluido: false,
      local: o.local,
      link: o.link,
      googleId: o.id,
      linkReuniao: o.linkReuniao,
      podeEditar: o.podeEditar,
      recorrente: o.recorrente,
    })),
  )
  const doDia = (dia: string) => eventos.filter((e) => (e.diaInteiro ? diaDe(e.inicio) <= dia && diaDe(e.fim) >= dia : diaDe(e.inicio) === dia))

  const novo = (inicio: string) => setEditando(compromissoVazio(inicio, meuId, user?.name ?? ''))
  const abrir = (e: EventoAgenda) => {
    if (e.origem === 'google') return setEventoGoogle(e)
    if (e.compromisso) setEditando(e.compromisso)
    else setAcaoCrm(e)
  }

  const dias = diasVisiveis
  const hoje = hojeDia()

  /** Clique num horário vazio: cria o compromisso na meia hora clicada. */
  const clicarHorario = (dia: string, ev: MouseEvent<HTMLDivElement>) => {
    if (ev.target !== ev.currentTarget) return
    const y = ev.nativeEvent.offsetY
    const minutos = Math.floor(y / HORA_PX) * 60 + (y % HORA_PX >= HORA_PX / 2 ? 30 : 0)
    novo(momentoDe(dia, minutos))
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Comercial"
        title="Agenda"
        subtitle="Clique num horário para marcar um compromisso. As próximas ações dos cards do CRM aparecem junto."
        action={
          <div className={s.acoes}>
            <GoogleConexao onAviso={(texto, tipo) => setAviso({ texto, tipo })} />
            <Hint text="Com o Google Agenda conectado, seus compromissos e as próximas ações dos seus cards vão para a sua agenda. Se você mudar o horário ou apagar lá, o ELROND acompanha em até 5 minutos. Os seus outros eventos do Google aparecem aqui em cinza e podem ser editados por aqui." />
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => novo(momentoDe(foco, 9 * 60))}>
              <Plus /> Novo compromisso
            </button>
          </div>
        }
      />

      {aviso && (
        <div className={`${s.aviso} ${aviso.tipo === 'erro' ? s.avisoErro : ''}`} role="status">
          {aviso.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{aviso.texto}</span>
          <button type="button" onClick={fecharAviso} aria-label="Fechar"><X size={14} /></button>
        </div>
      )}

      <div className={s.layout}>
        {/* ── lateral: mini calendário e filtros ── */}
        <aside className={s.lateral}>
          <MiniCalendario mes={mini} foco={foco} hoje={hoje} vista={vista} onMes={setMini} onDia={irPara} />

          <div className={s.lateralBloco}>
            <div className={s.lateralTitulo}>
              Compromissos de <Hint text="Filtro do ELROND: de quem são os compromissos e as próximas ações do CRM mostrados. Os seus eventos do Google aparecem só na sua própria agenda." />
            </div>
            <select id="agenda-pessoa" className={s.pessoa} value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
              <option value="eu">Só a minha</option>
              <option value="todos">Todos</option>
              {usuarios.filter((u) => u.status === 'ativo' && u.id !== meuId).map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div className={s.lateralBloco}>
            <div className={s.lateralTitulo}>Calendários</div>
            <label className={s.calendario}>
              <input id="agenda-ver-compromissos" type="checkbox" checked={verAgenda} onChange={(e) => setVerAgenda(e.target.checked)} />
              <i style={{ background: TIPOS_COMPROMISSO[0].cor }} /> Compromissos
            </label>
            <label className={s.calendario}>
              <input id="agenda-ver-crm" type="checkbox" checked={verCrm} onChange={(e) => setVerCrm(e.target.checked)} />
              <i style={{ background: COR_CRM.cor }} /> Próximas ações do CRM
            </label>
            {google?.conectado && (
              <label className={s.calendario} title={pessoa === 'eu' ? undefined : 'Os seus eventos do Google aparecem só quando o filtro está em Só a minha'}>
                <input id="agenda-ver-google" type="checkbox" checked={verGoogle} onChange={(e) => setVerGoogle(e.target.checked)} />
                <i style={{ background: COR_GOOGLE.cor }} /> Meus eventos do Google
              </label>
            )}
            <div className={s.legenda}>
              {TIPOS_COMPROMISSO.map((t) => (
                <span key={t.valor}><i style={{ background: t.cor }} /> {t.label}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* ── calendário ── */}
        <section className={s.calendarioCard}>
          <div className={s.barra}>
            <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnHoje}`} onClick={() => irPara(hoje)}>
              <CalendarDays /> Hoje
            </button>
            <button type="button" className={s.seta} onClick={() => irPara(andar(vista, foco, -1))} aria-label="Período anterior"><ChevronLeft /></button>
            <button type="button" className={s.seta} onClick={() => irPara(andar(vista, foco, 1))} aria-label="Próximo período"><ChevronRight /></button>
            <h2 className={s.periodo}>{tituloDoPeriodo(vista, foco)}</h2>
            <div className={s.vistas} role="tablist" aria-label="Visualização">
              {VISTAS.map((v) => (
                <button key={v.valor} type="button" role="tab" aria-selected={vista === v.valor} className={vista === v.valor ? s.vistaOn : ''} onClick={() => trocarVista(v.valor)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {vista === 'mes' ? (
            <GradeMes foco={foco} hoje={hoje} doDia={doDia} onNovo={(dia) => novo(momentoDe(dia, 9 * 60))} onAbrir={abrir} onDia={(dia) => { irPara(dia); trocarVista('dia') }} />
          ) : (
            <div className={s.semana} style={{ '--colunas': dias.length } as CSSProperties}>
              {/* Cabeçalho dos dias + faixa do dia inteiro */}
              <div className={s.cabecalho}>
                <div className={s.cantoHoras} />
                {dias.map((dia) => (
                  <button key={dia} type="button" className={`${s.diaCab} ${dia === hoje ? s.diaCabHoje : ''}`} onClick={() => { irPara(dia); trocarVista('dia') }} title="Ver o dia">
                    <b>{Number(dia.slice(8, 10))}</b>
                    <span>{SEMANA_CURTA[diaDaSemana(dia)]}</span>
                  </button>
                ))}
              </div>
              <div className={s.diaInteiroFaixa}>
                <div className={s.cantoHoras}>dia todo</div>
                {dias.map((dia) => (
                  <div key={dia} className={s.diaInteiroCel} onDoubleClick={() => novo(dia)}>
                    {doDia(dia).filter((e) => e.diaInteiro).map((e) => (
                      <BlocoEvento key={e.id} e={e} compacto onAbrir={abrir} />
                    ))}
                  </div>
                ))}
              </div>
              {/* Grade de horários */}
              <div className={s.gradeHoras} ref={gradeRef}>
                <div className={s.horas}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className={s.hora} style={{ height: HORA_PX }}>{h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}</div>
                  ))}
                </div>
                {dias.map((dia) => {
                  const posicionados = posicionar(doDia(dia).filter((e) => !e.diaInteiro))
                  return (
                    <div key={dia} className={`${s.colunaDia} ${dia === hoje ? s.colunaHoje : ''}`} style={{ height: 24 * HORA_PX }} onClick={(ev) => clicarHorario(dia, ev)} title="Clique para marcar um compromisso">
                      {posicionados.map(({ evento: e, coluna, colunas }) => {
                        const ini = minutosDe(e.inicio)
                        const fim = Math.max(minutosDe(e.fim), ini + 15)
                        return (
                          <BlocoEvento
                            key={e.id}
                            e={e}
                            onAbrir={abrir}
                            estilo={{
                              top: (ini / 60) * HORA_PX,
                              height: Math.max(18, ((fim - ini) / 60) * HORA_PX - 2),
                              left: `calc(${(coluna / colunas) * 100}% + 2px)`,
                              width: `calc(${100 / colunas}% - 4px)`,
                            }}
                          />
                        )
                      })}
                      {dia === diaDe(agora) && <div className={s.agora} style={{ top: (minutosDe(agora) / 60) * HORA_PX }} aria-hidden />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <CompromissoModal compromisso={editando} onClose={() => setEditando(null)} onSalvar={salvar} onExcluir={excluir} />

      <Modal
        open={!!acaoCrm}
        onClose={() => setAcaoCrm(null)}
        title="Próxima ação do CRM"
        subtitle={acaoCrm?.cliente}
        icon={<SquareKanban />}
        maxWidth={460}
        footer={
          <>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setAcaoCrm(null)}>Fechar</button>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => acaoCrm && navigate(`/crm?op=${acaoCrm.oportunidadeId}`)}>
              <SquareKanban /> Abrir o card no CRM
            </button>
          </>
        }
      >
        {acaoCrm && (
          <div className={s.acaoCrm}>
            <b>{acaoCrm.titulo}</b>
            <span>{acaoCrm.diaInteiro ? diaDe(acaoCrm.inicio).split('-').reverse().join('/') : `${diaDe(acaoCrm.inicio).split('-').reverse().join('/')} às ${horaDe(acaoCrm.inicio)}`}</span>
            <span>Responsável: {acaoCrm.responsavel || '—'}</span>
            <small>A próxima ação é editada no próprio card do CRM (data, hora e detalhe).</small>
          </div>
        )}
      </Modal>

      <GoogleEventoModal evento={eventoGoogle} onClose={() => setEventoGoogle(null)} />
    </div>
  )
}

function BlocoEvento({ e, estilo, compacto, onAbrir }: { e: EventoAgenda; estilo?: CSSProperties; compacto?: boolean; onAbrir: (e: EventoAgenda) => void }) {
  const cor = corDoEvento(e)
  const hora = e.diaInteiro ? '' : horaDe(e.inicio)
  return (
    <button
      type="button"
      className={`${s.evento} ${estilo ? s.eventoPosicionado : ''} ${e.origem === 'crm' ? s.eventoCrm : ''} ${e.origem === 'google' ? s.eventoGoogle : ''}${e.concluido ? s.eventoConcluido : ''} ${compacto ? s.eventoCompacto : ''}`}
      style={{ ...estilo, '--cor': cor.cor, '--fundo': cor.fundo } as CSSProperties}
      onClick={(ev) => {
        ev.stopPropagation()
        onAbrir(e)
      }}
      title={`${hora ? `${hora} · ` : ''}${e.titulo}${e.cliente ? ` · ${e.cliente}` : ''}${e.responsavel ? ` (${e.responsavel})` : ''}`}
    >
      <span className={s.eventoTitulo}>
        {hora && <em>{hora}</em>} {(e.linkReuniao || e.compromisso?.comMeet) && <Video size={12} className={s.eventoMeet} aria-label="com Google Meet" />} {e.titulo}
      </span>
      {!compacto && e.cliente && <span className={s.eventoCliente}>{e.cliente}</span>}
    </button>
  )
}

function MiniCalendario({ mes, foco, hoje, vista, onMes, onDia }: { mes: string; foco: string; hoje: string; vista: Vista; onMes: (d: string) => void; onDia: (d: string) => void }) {
  const dias = gradeDoMes(mes)
  const selecionados = new Set(vista === 'mes' ? [] : diasDaVista(vista, foco))
  return (
    <div className={s.mini}>
      <div className={s.miniTopo}>
        <b>{nomeDoMes(mes)}</b>
        <span>
          <button type="button" onClick={() => onMes(somarMeses(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={15} /></button>
          <button type="button" onClick={() => onMes(somarMeses(mes, 1))} aria-label="Próximo mês"><ChevronRight size={15} /></button>
        </span>
      </div>
      <div className={s.miniGrade}>
        {SEMANA_CURTA.map((d) => (
          <span key={d} className={s.miniSemana}>{d[0]}</span>
        ))}
        {dias.map((d) => (
          <button
            key={d}
            type="button"
            className={`${s.miniDia} ${d.slice(0, 7) !== mes.slice(0, 7) ? s.miniFora : ''} ${selecionados.has(d) ? s.miniSel : ''} ${d === hoje ? s.miniHoje : ''}`}
            onClick={() => onDia(d)}
          >
            {Number(d.slice(8, 10))}
          </button>
        ))}
      </div>
    </div>
  )
}

function GradeMes({ foco, hoje, doDia, onNovo, onAbrir, onDia }: { foco: string; hoje: string; doDia: (d: string) => EventoAgenda[]; onNovo: (d: string) => void; onAbrir: (e: EventoAgenda) => void; onDia: (d: string) => void }) {
  const dias = gradeDoMes(foco)
  return (
    <div className={s.mes}>
      {SEMANA_CURTA.map((d) => (
        <div key={d} className={s.mesSemana}>{d}</div>
      ))}
      {dias.map((dia) => {
        const lista = doDia(dia).sort((a, b) => Number(b.diaInteiro) - Number(a.diaInteiro) || a.inicio.localeCompare(b.inicio))
        return (
          <div
            key={dia}
            className={`${s.mesCel} ${dia.slice(0, 7) !== foco.slice(0, 7) ? s.mesFora : ''}`}
            onClick={(ev) => ev.target === ev.currentTarget && onNovo(dia)}
            title="Clique para marcar um compromisso"
          >
            <button type="button" className={`${s.mesNum} ${dia === hoje ? s.mesNumHoje : ''}`} onClick={() => onDia(dia)}>{Number(dia.slice(8, 10))}</button>
            {lista.slice(0, 3).map((e) => (
              <BlocoEvento key={e.id} e={e} compacto onAbrir={onAbrir} />
            ))}
            {lista.length > 3 && (
              <button type="button" className={s.mesMais} onClick={() => onDia(dia)}>+{lista.length - 3} mais</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
