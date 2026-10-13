import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ExternalLink, Trash2, Video } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import ui from '@/features/common/ui.module.css'
import { apiFetch, getErrorMessage } from '@/lib/api'
import { confirmar } from '@/features/common/dialogo/dialogo'
import { diaDe, horaDe } from './datas'
import type { EventoAgenda } from './types'
import s from './agenda.module.css'

interface Rascunho {
  titulo: string
  dia: string
  ate: string
  inicio: string
  fim: string
  diaInteiro: boolean
  local: string
}

const deEvento = (e: EventoAgenda): Rascunho => ({
  titulo: e.titulo,
  dia: diaDe(e.inicio),
  ate: diaDe(e.fim),
  inicio: horaDe(e.inicio) || '09:00',
  fim: horaDe(e.fim) || '10:00',
  diaInteiro: e.diaInteiro,
  local: e.local ?? '',
})

/**
 * Evento da agenda pessoal do Google, editável daqui: o que mudar vai direto para o Google.
 * Convite de outra pessoa fica só leitura (o Google só deixa o organizador mudar).
 */
export function GoogleEventoModal({ evento, onClose }: { evento: EventoAgenda | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [d, setD] = useState<Rascunho | null>(evento ? deEvento(evento) : null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [abertoPara, setAbertoPara] = useState(evento)
  if (evento !== abertoPara) {
    setAbertoPara(evento)
    setD(evento ? deEvento(evento) : null)
    setErro('')
  }
  if (!evento || !d) return null
  const set = (p: Partial<Rascunho>) => setD((x) => (x ? { ...x, ...p } : x))
  const editavel = !!evento.podeEditar && !!evento.googleId

  const executar = async (acao: () => Promise<unknown>) => {
    setSalvando(true)
    setErro('')
    try {
      await acao()
      await qc.invalidateQueries({ queryKey: ['google-agenda', 'ocupado'] })
      onClose()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }
  const salvar = () => {
    if (!d.titulo.trim()) return setErro('Dê um título ao evento.')
    const inicio = d.diaInteiro ? d.dia : `${d.dia}T${d.inicio}`
    const fim = d.diaInteiro ? (d.ate < d.dia ? d.dia : d.ate) : `${d.dia}T${d.fim}`
    if (fim < inicio) return setErro('O fim não pode ser antes do início.')
    return executar(() =>
      apiFetch<void>(`/integracoes/google/eventos/${encodeURIComponent(evento.googleId!)}`, {
        method: 'PUT',
        body: JSON.stringify({ titulo: d.titulo.trim(), inicio, fim, diaInteiro: d.diaInteiro, local: d.local }),
      }),
    )
  }
  const excluir = async () => {
    const ok = await confirmar({
      titulo: evento.recorrente ? 'Excluir ocorrência' : 'Excluir evento',
      mensagem: evento.recorrente ? 'Excluir só esta ocorrência do evento no seu Google Agenda?' : 'Excluir este evento do seu Google Agenda?',
      confirmar: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    return executar(() => apiFetch<void>(`/integracoes/google/eventos/${encodeURIComponent(evento.googleId!)}`, { method: 'DELETE' }))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Evento do Google Agenda"
      subtitle="Só você vê os seus eventos do Google aqui"
      icon={<CalendarDays />}
      maxWidth={560}
      busy={salvando}
      error={erro || null}
      footer={
        <>
          {editavel && (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={excluir} style={{ marginRight: 'auto' }}>
              <Trash2 /> Excluir
            </button>
          )}
          {evento.linkReuniao && (
            <a className={`${ui.btn} ${ui.btnGhost}`} href={evento.linkReuniao} target="_blank" rel="noreferrer">
              <Video /> Entrar com o Google Meet
            </a>
          )}
          {evento.link && (
            <a className={`${ui.btn} ${ui.btnGhost}`} href={evento.link} target="_blank" rel="noreferrer">
              <ExternalLink /> Abrir no Google
            </a>
          )}
          {editavel ? (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar}>Salvar</button>
          ) : (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={onClose}>Fechar</button>
          )}
        </>
      }
    >
      {!editavel ? (
        <div className={s.acaoCrm}>
          <b>{evento.titulo}</b>
          <span>
            {diaDe(evento.inicio).split('-').reverse().join('/')}
            {evento.diaInteiro ? ' · dia todo' : ` · ${horaDe(evento.inicio)}–${horaDe(evento.fim)}`}
          </span>
          {evento.local && <span>Local: {evento.local}</span>}
          <small>Este é um convite de outra pessoa: o Google só deixa o organizador mudar o horário. Para responder ao convite, abra no Google.</small>
        </div>
      ) : (
        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col4} label="Título" req>
              <input id="gev-titulo" value={d.titulo} onChange={(e) => set({ titulo: e.target.value })} autoFocus />
            </Field>
            <Field label="Data" req>
              <input id="gev-dia" type="date" value={d.dia} onChange={(e) => e.target.value && set({ dia: e.target.value, ate: d.ate < e.target.value ? e.target.value : d.ate })} />
            </Field>
            {d.diaInteiro ? (
              <Field label="Até">
                <input id="gev-ate" type="date" value={d.ate} min={d.dia} onChange={(e) => e.target.value && set({ ate: e.target.value })} />
              </Field>
            ) : (
              <>
                <Field label="Início">
                  <input id="gev-ini" type="time" step={900} value={d.inicio} onChange={(e) => e.target.value && set({ inicio: e.target.value })} />
                </Field>
                <Field label="Fim">
                  <input id="gev-fim" type="time" step={900} value={d.fim} min={d.inicio} onChange={(e) => e.target.value && set({ fim: e.target.value })} />
                </Field>
              </>
            )}
            <Field label="Dia inteiro">
              <label className={s.check}>
                <input id="gev-diainteiro" type="checkbox" checked={d.diaInteiro} onChange={(e) => set({ diaInteiro: e.target.checked, ate: d.dia })} /> o dia todo
              </label>
            </Field>
            <Field className={ui.col4} label="Local">
              <input id="gev-local" value={d.local} onChange={(e) => set({ local: e.target.value })} placeholder="Endereço, sala ou link" />
            </Field>
            {evento.recorrente && (
              <div className={`${ui.col4} ${ui.modalNote}`}>Este evento se repete: a alteração vale só para esta ocorrência.</div>
            )}
          </div>
        </section>
      )}
    </Modal>
  )
}
