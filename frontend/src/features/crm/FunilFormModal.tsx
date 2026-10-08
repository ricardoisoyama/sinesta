import { useState } from 'react'
import { Filter, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import ui from '@/features/common/ui.module.css'
import { TIPOS_CAMPO, type CampoCustomizado, type EtapaFunil, type Funil, type TipoCampoCustomizado, type TipoEtapa } from './types'
import s from './crm.module.css'

interface Props {
  open: boolean
  initial?: Funil | null
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSave: (funil: Funil) => void
}

const TIPOS: { valor: TipoEtapa; label: string }[] = [
  { valor: 'normal', label: 'Normal' },
  { valor: 'ganho', label: 'Ganho' },
  { valor: 'perdido', label: 'Perdido' },
]

const novaEtapa = (nome = '', tipo: TipoEtapa = 'normal', cor = '#8a97a0'): EtapaFunil => ({
  id: crypto.randomUUID(),
  nome,
  cor,
  tipo,
})

const funilNovo = (): Funil => ({
  id: crypto.randomUUID(),
  nome: '',
  status: 'ativo',
  horasAlerta: 48,
  corCard: '',
  etapas: [
    novaEtapa('Novo lead', 'normal', '#8a97a0'),
    novaEtapa('Contato feito', 'normal', '#3a7d9a'),
    novaEtapa('Cotação enviada', 'normal', '#e8702f'),
    novaEtapa('Negociação', 'normal', '#b5651d'),
    novaEtapa('Ganho', 'ganho', '#2e7d44'),
    novaEtapa('Perdido', 'perdido', '#c0392b'),
  ],
  camposCustomizados: [],
})

export function FunilFormModal({ open, initial, busy, error, onClose, onSave }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Funil"
      subtitle={initial ? 'Editar funil e etapas' : 'Novo funil'}
      icon={<Filter />}
      maxWidth={680}
      busy={busy}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="funilForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            {busy ? 'Salvando...' : 'Salvar funil'}
          </button>
        </>
      }
    >
      {open && <FunilForm key={initial?.id ?? 'novo'} initial={initial ?? null} onSave={onSave} />}
    </Modal>
  )
}

function FunilForm({ initial, onSave }: { initial: Funil | null; onSave: (f: Funil) => void }) {
  const [d, setD] = useState<Funil>(() => initial ?? funilNovo())
  const [erro, setErro] = useState<string | null>(null)

  const setEtapa = (i: number, patch: Partial<EtapaFunil>) =>
    setD((p) => ({ ...p, etapas: p.etapas.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }))

  const mover = (i: number, delta: -1 | 1) =>
    setD((p) => {
      const destino = i + delta
      if (destino < 0 || destino >= p.etapas.length) return p
      const etapas = [...p.etapas]
      const [item] = etapas.splice(i, 1)
      etapas.splice(destino, 0, item)
      return { ...p, etapas }
    })

  const remover = (i: number) =>
    setD((p) => (p.etapas.length <= 1 ? p : { ...p, etapas: p.etapas.filter((_, idx) => idx !== i) }))

  const adicionar = () => setD((p) => ({ ...p, etapas: [...p.etapas, novaEtapa('Nova etapa')] }))

  // Campos customizados do funil.
  const setCampo = (i: number, patch: Partial<CampoCustomizado>) =>
    setD((p) => ({ ...p, camposCustomizados: p.camposCustomizados.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }))
  const addCampo = () =>
    setD((p) => ({ ...p, camposCustomizados: [...p.camposCustomizados, { id: crypto.randomUUID(), nome: '', tipo: 'texto', opcoes: [] }] }))
  const rmCampo = (i: number) => setD((p) => ({ ...p, camposCustomizados: p.camposCustomizados.filter((_, idx) => idx !== i) }))

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (d.nome.trim().length < 2) {
      setErro('Informe o nome do funil.')
      return
    }
    if (d.etapas.some((e) => !e.nome.trim())) {
      setErro('Toda etapa precisa de um nome.')
      return
    }
    if (d.camposCustomizados.some((c) => !c.nome.trim())) {
      setErro('Todo campo customizado precisa de um nome.')
      return
    }
    setErro(null)
    onSave({
      ...d,
      nome: d.nome.trim(),
      etapas: d.etapas.map((e) => ({ ...e, nome: e.nome.trim() })),
      camposCustomizados: d.camposCustomizados.map((c) => ({
        ...c,
        nome: c.nome.trim(),
        opcoes: c.tipo === 'lista' ? c.opcoes.map((o) => o.trim()).filter(Boolean) : [],
      })),
    })
  }

  return (
    <form id="funilForm" onSubmit={submit} noValidate>
      <div className={ui.topRow}>
        <span className={ui.modalNote}>As etapas viram as colunas do kanban, na ordem abaixo.</span>
      </div>

      <section className={ui.fsection}>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Nome do funil" req>
            <input
              value={d.nome}
              onChange={(e) => setD((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Ex.: Comercial, Reativação de clientes"
            />
          </Field>
          <Field
            label="Temperatura (horas)"
            hint="Card parado numa etapa por mais horas que isto fica vermelho: sinal de que a empresa pode estar perdendo o negócio. Zero desliga."
          >
            <input
              type="number"
              min={0}
              value={d.horasAlerta}
              onChange={(e) => setD((p) => ({ ...p, horasAlerta: Math.max(0, Math.trunc(Number(e.target.value) || 0)) }))}
            />
          </Field>
          <Field label="Cor dos cards" hint="Cor de fundo dos cards deste funil. Deixe em branco para o padrão.">
            <div className={s.corCardRow}>
              <input
                type="color"
                value={d.corCard || '#ffffff'}
                onChange={(e) => setD((p) => ({ ...p, corCard: e.target.value }))}
                className={s.etapaCor}
                title="Cor dos cards"
              />
              {d.corCard && (
                <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setD((p) => ({ ...p, corCard: '' }))}>
                  Padrão
                </button>
              )}
            </div>
          </Field>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={s.etapasHead}>
          <span>Campos customizados ({d.camposCustomizados.length})</span>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={addCampo}>
            <Plus /> Campo
          </button>
        </div>
        {d.camposCustomizados.length === 0 && (
          <div className={s.etapaDica}>Campos extras que aparecem no card deste funil (ex.: Nº de postos, Data da visita, Segmento).</div>
        )}
        {d.camposCustomizados.map((c, i) => (
          <div key={c.id} className={s.campoRow}>
            <input value={c.nome} onChange={(ev) => setCampo(i, { nome: ev.target.value })} placeholder="Nome do campo" />
            <select value={c.tipo} onChange={(ev) => setCampo(i, { tipo: ev.target.value as TipoCampoCustomizado })}>
              {TIPOS_CAMPO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </select>
            {c.tipo === 'lista' ? (
              <input
                value={c.opcoes.join(', ')}
                onChange={(ev) => setCampo(i, { opcoes: ev.target.value.split(',').map((o) => o.trimStart()) })}
                placeholder="Opções separadas por vírgula"
              />
            ) : (
              <span />
            )}
            <button type="button" className={ui.iconBtn} onClick={() => rmCampo(i)} title="Remover campo">
              <Trash2 />
            </button>
          </div>
        ))}
      </section>

      <section className={ui.fsection}>
        <div className={s.etapasHead}>
          <span>Etapas ({d.etapas.length})</span>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={adicionar}>
            <Plus /> Etapa
          </button>
        </div>

        {d.etapas.map((e, i) => (
          <div key={e.id} className={s.etapaRow}>
            <input
              type="color"
              value={e.cor}
              onChange={(ev) => setEtapa(i, { cor: ev.target.value })}
              className={s.etapaCor}
              title="Cor da etapa"
            />
            <input
              value={e.nome}
              onChange={(ev) => setEtapa(i, { nome: ev.target.value })}
              placeholder="Nome da etapa"
              className={s.etapaNome}
            />
            <select
              value={e.tipo}
              onChange={(ev) => setEtapa(i, { tipo: ev.target.value as TipoEtapa })}
              className={s.etapaTipo}
              title="Tipo da etapa"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </select>
            <button type="button" className={ui.iconBtn} onClick={() => mover(i, -1)} disabled={i === 0} title="Subir">
              <ChevronUp />
            </button>
            <button
              type="button"
              className={ui.iconBtn}
              onClick={() => mover(i, 1)}
              disabled={i === d.etapas.length - 1}
              title="Descer"
            >
              <ChevronDown />
            </button>
            <button
              type="button"
              className={ui.iconBtn}
              onClick={() => remover(i)}
              disabled={d.etapas.length <= 1}
              title="Remover etapa"
            >
              <Trash2 />
            </button>
          </div>
        ))}
        <div className={s.etapaDica}>
          Etapas do tipo Ganho e Perdido encerram a oportunidade e ficam fora do "em negociação". Proposta aprovada
          leva o card para a etapa de Ganho automaticamente.
        </div>
        {erro && <div className={s.formErro}>{erro}</div>}
      </section>
    </form>
  )
}
