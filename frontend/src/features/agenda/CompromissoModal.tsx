import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, Trash2, Video, X } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { confirmar } from '@/features/common/dialogo/dialogo'
import { listClientes } from '@/features/cadastros/api'
import { useUsuarios } from '@/features/usuarios/store'
import { useCrm } from '@/features/crm/store'
import { CadastroBusca } from '@/features/camposOperacao/CadastroBusca'
import { contatosDoParceiro } from '@/features/parceiros/types'
import { diaDe, horaDe, somarMinutos } from './datas'
import { TIPOS_COMPROMISSO, type Compromisso, type TipoCompromisso } from './types'
import s from './agenda.module.css'

interface Props {
  /** Compromisso aberto (novo tem id vazio); null = fechado. */
  compromisso: Compromisso | null
  onClose: () => void
  onSalvar: (c: Compromisso) => Promise<unknown>
  onExcluir: (id: string) => Promise<unknown>
}

/** Novo compromisso já no horário clicado no calendário, ou edição de um existente. */
export const compromissoVazio = (inicio: string, responsavelId: string, responsavelNome: string): Compromisso => ({
  id: '',
  titulo: '',
  tipo: 'reuniao',
  inicio,
  fim: somarMinutos(inicio, 60),
  diaInteiro: false,
  responsavelId,
  responsavelNome,
  clienteId: '',
  clienteNome: '',
  oportunidadeId: '',
  local: '',
  convidados: [],
  comMeet: false,
  linkReuniao: '',
  descricao: '',
  concluido: false,
  status: 'ativo',
})

export function CompromissoModal({ compromisso, onClose, onSalvar, onExcluir }: Props) {
  const [d, setD] = useState<Compromisso | null>(compromisso)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [abertoPara, setAbertoPara] = useState(compromisso)
  const [convidado, setConvidado] = useState('')
  if (compromisso !== abertoPara) {
    setAbertoPara(compromisso)
    // Registros de antes dos convidados/Meet chegam sem esses campos.
    setD(compromisso ? { ...compromisso, convidados: compromisso.convidados ?? [], comMeet: !!compromisso.comMeet, linkReuniao: compromisso.linkReuniao ?? '' } : null)
    setConvidado('')
    setErro('')
  }
  const { usuarios } = useUsuarios()
  const { data: clientesData } = useQuery({ queryKey: ['clientes'], queryFn: listClientes, enabled: !!compromisso })
  const { oportunidades } = useCrm()
  if (!d) return null

  const set = (p: Partial<Compromisso>) => setD((x) => (x ? { ...x, ...p } : x))
  const clientes = (clientesData ?? []).filter((c) => c.status === 'ativo').map((c) => ({ id: c.id, nome: c.nomeFantasia || c.nome, doc: c.cpfCnpj }))
  const cards = oportunidades.filter((o) => !d.clienteId || o.clienteId === d.clienteId || o.id === d.oportunidadeId)

  // Convidados: funcionários e contatos do cliente escolhido (ou qualquer e-mail digitado).
  const cadCliente = (clientesData ?? []).find((c) => c.id === d.clienteId)
  const sugestoes = [
    ...(cadCliente ? contatosDoParceiro(cadCliente).filter((c) => c.email).map((c) => ({ email: c.email.toLowerCase(), nome: c.nome })) : []),
    ...usuarios.filter((u) => u.status === 'ativo' && u.email).map((u) => ({ email: u.email.toLowerCase(), nome: u.nome })),
  ].filter((x, i, l) => l.findIndex((y) => y.email === x.email) === i && !d.convidados.includes(x.email))
  const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const separar = (texto: string) => texto.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
  const adicionarConvidados = (texto: string) => {
    const novos = separar(texto)
    const invalido = novos.find((e) => !emailValido(e))
    if (invalido) return setErro(`E-mail de convidado inválido: ${invalido}`)
    set({ convidados: [...new Set([...d.convidados, ...novos])] })
    setConvidado('')
    setErro('')
  }

  const dia = diaDe(d.inicio)
  const horaIni = horaDe(d.inicio) || '09:00'
  const horaFim = horaDe(d.fim) || '10:00'
  const trocarDia = (novo: string) =>
    set(d.diaInteiro ? { inicio: novo, fim: diaDe(d.fim) < novo ? novo : diaDe(d.fim) } : { inicio: `${novo}T${horaIni}`, fim: `${novo}T${horaFim}` })
  const trocarInicio = (h: string) => {
    // Mantém a duração ao mudar o início (como no Outlook).
    const dur = Math.max(15, minutos(horaFim) - minutos(horaIni))
    set({ inicio: `${dia}T${h}`, fim: somarMinutos(`${dia}T${h}`, dur) })
  }
  const alternarDiaInteiro = (on: boolean) =>
    set(on ? { diaInteiro: true, inicio: dia, fim: dia } : { diaInteiro: false, inicio: `${dia}T09:00`, fim: `${dia}T10:00` })

  const salvar = async () => {
    if (!d.titulo.trim()) return setErro('Dê um título ao compromisso.')
    if (d.fim < d.inicio) return setErro('O fim não pode ser antes do início.')
    // E-mail digitado e não confirmado com Enter também entra.
    const pendentes = separar(convidado)
    if (pendentes.some((e) => !emailValido(e))) return setErro('Confira o e-mail do convidado antes de salvar.')
    const convidados = [...new Set([...d.convidados, ...pendentes])]
    setSalvando(true)
    try {
      const resp = usuarios.find((u) => u.id === d.responsavelId)
      await onSalvar({ ...d, convidados, titulo: d.titulo.trim(), responsavelNome: resp?.nome ?? d.responsavelNome })
      onClose()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }
  const excluir = async () => {
    const ok = await confirmar({
      titulo: 'Excluir compromisso',
      mensagem: 'Excluir este compromisso? Ele sai da Agenda e fica no histórico.',
      confirmar: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    setSalvando(true)
    try {
      await onExcluir(d.id)
      onClose()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={d.id ? 'Compromisso' : 'Novo compromisso'}
      subtitle={d.id ? d.titulo : 'Agenda'}
      icon={<CalendarPlus />}
      maxWidth={640}
      busy={salvando}
      error={erro || null}
      footer={
        <>
          {d.id && (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={excluir} style={{ marginRight: 'auto' }}>
              <Trash2 /> Excluir
            </button>
          )}
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar}>Salvar</button>
        </>
      }
    >
      <section className={ui.fsection}>
        <div className={ui.grid}>
          <Field className={ui.col4} label="Título" req>
            <input id="comp-titulo" value={d.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="Ex.: Reunião de apresentação" autoFocus />
          </Field>
          <div className={`${ui.col4} ${s.tiposForm}`} role="radiogroup" aria-label="Tipo">
            {TIPOS_COMPROMISSO.map((t) => (
              <button
                key={t.valor}
                type="button"
                role="radio"
                aria-checked={d.tipo === t.valor}
                className={`${s.tipoOpcao} ${d.tipo === t.valor ? s.tipoOn : ''}`}
                style={{ '--cor': t.cor, '--fundo': t.fundo } as CSSProperties}
                onClick={() => set({ tipo: t.valor as TipoCompromisso })}
              >
                <i /> {t.label}
              </button>
            ))}
          </div>
          <Field label="Data" req>
            <input id="comp-dia" type="date" value={dia} onChange={(e) => e.target.value && trocarDia(e.target.value)} />
          </Field>
          {d.diaInteiro ? (
            <Field label="Até">
              <input id="comp-ate" type="date" value={diaDe(d.fim)} min={dia} onChange={(e) => e.target.value && set({ fim: e.target.value })} />
            </Field>
          ) : (
            <>
              <Field label="Início">
                <input id="comp-ini" type="time" step={900} value={horaIni} onChange={(e) => e.target.value && trocarInicio(e.target.value)} />
              </Field>
              <Field label="Fim">
                <input id="comp-fim" type="time" step={900} value={horaFim} min={horaIni} onChange={(e) => e.target.value && set({ fim: `${dia}T${e.target.value}` })} />
              </Field>
            </>
          )}
          <Field label="Dia inteiro">
            <label className={s.check}>
              <input id="comp-diainteiro" type="checkbox" checked={d.diaInteiro} onChange={(e) => alternarDiaInteiro(e.target.checked)} /> o dia todo
            </label>
          </Field>
          <Field className={ui.col2} label="Responsável">
            <select id="comp-resp" value={d.responsavelId} onChange={(e) => set({ responsavelId: e.target.value })}>
              <option value="">Eu</option>
              {usuarios.filter((u) => u.status === 'ativo').map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </Field>
          <Field className={ui.col2} label="Cliente">
            <CadastroBusca
              opcoes={clientes}
              value={d.clienteId}
              onChange={(id) => set({ clienteId: id, clienteNome: clientes.find((c) => c.id === id)?.nome ?? '', oportunidadeId: id === d.clienteId ? d.oportunidadeId : '' })}
              placeholder="Buscar cliente (opcional)"
            />
          </Field>
          <Field className={ui.col2} label="Card do CRM" hint="Ligue ao negócio para ver o compromisso a partir do card.">
            <select id="comp-card" value={d.oportunidadeId} onChange={(e) => set({ oportunidadeId: e.target.value })}>
              <option value="">Nenhum</option>
              {cards.map((o) => (
                <option key={o.id} value={o.id}>{o.cliente}{o.servico ? ` · ${o.servico}` : ''}</option>
              ))}
            </select>
          </Field>
          <Field className={ui.col4} label="Convidados" hint="Recebem o convite por e-mail pelo Google do responsável. Enter ou vírgula adiciona.">
            <div className={s.convidados}>
              {d.convidados.map((e) => (
                <span key={e} className={s.convidado}>
                  {e}
                  <button type="button" aria-label={`Remover ${e}`} onClick={() => set({ convidados: d.convidados.filter((x) => x !== e) })}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                id="comp-convidado"
                list="comp-convidados-sugestoes"
                value={convidado}
                onChange={(e) => setConvidado(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',') && convidado.trim()) {
                    e.preventDefault()
                    adicionarConvidados(convidado)
                  }
                  if (e.key === 'Backspace' && !convidado && d.convidados.length) set({ convidados: d.convidados.slice(0, -1) })
                }}
                onBlur={() => convidado.trim() && emailValido(convidado.trim()) && adicionarConvidados(convidado)}
                placeholder={d.convidados.length ? '' : 'nome@empresa.com.br'}
              />
              <datalist id="comp-convidados-sugestoes">
                {sugestoes.map((x) => (
                  <option key={x.email} value={x.email}>{x.nome}</option>
                ))}
              </datalist>
            </div>
          </Field>
          <Field className={ui.col4} label="Videoconferência">
            <div className={s.meet}>
              <label className={s.check}>
                <input id="comp-meet" type="checkbox" checked={d.comMeet} onChange={(e) => set({ comMeet: e.target.checked })} />
                <Video size={15} /> Adicionar Google Meet
              </label>
              {d.linkReuniao ? (
                <a className={`${ui.btn} ${ui.btnGhost}`} href={d.linkReuniao} target="_blank" rel="noreferrer">
                  <Video /> Entrar com o Google Meet
                </a>
              ) : (
                d.comMeet && <small>A sala é criada ao salvar, na agenda Google do responsável (ele precisa estar com o Google conectado).</small>
              )}
            </div>
          </Field>
          <Field className={ui.col2} label="Local">
            <input id="comp-local" value={d.local} onChange={(e) => set({ local: e.target.value })} placeholder="Endereço, sala ou link da reunião" />
          </Field>
          <Field className={ui.col4} label="Descrição">
            <textarea id="comp-desc" rows={3} value={d.descricao} onChange={(e) => set({ descricao: e.target.value })} placeholder="Pauta, observações" />
          </Field>
          {d.id && (
            <Field className={ui.col4} label="Situação">
              <label className={s.check}>
                <input id="comp-concluido" type="checkbox" checked={d.concluido} onChange={(e) => set({ concluido: e.target.checked })} /> concluído
              </label>
            </Field>
          )}
        </div>
      </section>
    </Modal>
  )
}

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
