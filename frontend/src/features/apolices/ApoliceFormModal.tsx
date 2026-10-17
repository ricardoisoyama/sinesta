import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import { StatusToggle } from '@/features/common/StatusToggle'
import { TabelaPorUf } from '@/features/common/TabelaPorUf'
import ui from '@/features/common/ui.module.css'
import type { Parceiro } from '@/features/parceiros/types'
import { baseRctrc } from './baseRctrc'
import { DOCUMENTOS_APOLICE, TIPOS_APOLICE, novaApolice, type Apolice, type DocumentoApolice, type TipoApolice } from './types'
import s from './apolices.module.css'

interface Props {
  open: boolean
  initial: Apolice | null
  seguradoras: Parceiro[]
  empresas: { id: string; nome: string }[]
  error?: string | null
  busy?: boolean
  onClose: () => void
  onSave: (a: Apolice) => void
}

/** Cadastro da apólice: seguradora, dados do contrato de seguro e a tabela de prêmio por UF. */
export function ApoliceFormModal({ open, initial, seguradoras, empresas, error, busy, onClose, onSave }: Props) {
  const [a, setA] = useState<Apolice>(novaApolice())
  const [abriuEm, setAbriuEm] = useState(false)
  const [tentou, setTentou] = useState(false)
  // Ao abrir, carrega a apólice escolhida (ou uma nova) — ajuste de estado quando a prop muda.
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) {
      setA(initial ? { ...novaApolice(), ...initial, taxas: initial.taxas ?? [] } : novaApolice())
      setTentou(false)
    }
  }
  const upd = (p: Partial<Apolice>) => setA((x) => ({ ...x, ...p }))
  const alternar = <K extends 'empresaIds' | 'documentos'>(campo: K, v: Apolice[K][number]) =>
    setA((x) => {
      const lista = x[campo] as string[]
      return { ...x, [campo]: lista.includes(v) ? lista.filter((y) => y !== v) : [...lista, v] }
    })

  const vigenciaInvertida = !!a.vigenciaInicio && !!a.vigenciaFim && a.vigenciaFim < a.vigenciaInicio
  const salvar = () => {
    setTentou(true)
    if (!a.seguradoraId || vigenciaInvertida) return
    onSave(a)
  }
  // A seguradora atual continua na lista mesmo que tenha deixado de ser seguradora/ativa.
  const opcoes = seguradoras.filter((f) => (f.seguradora && f.status === 'ativo') || f.id === a.seguradoraId)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apólice de seguro"
      subtitle={initial ? 'Editar apólice' : 'Nova apólice'}
      icon={<ShieldCheck />}
      maxWidth={920}
      error={error}
      busy={busy}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar} disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className={ui.topRow}>
        <span className={ui.modalNote}>O Pricing usa a apólice vigente do tipo para preencher o ad valorem pela origem e pelo destino.</span>
        <StatusToggle value={a.status !== 'inativo'} onChange={(v) => upd({ status: v ? 'ativo' : 'inativo' })} />
      </div>

      <section className={ui.fsection}>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Seguradora" req error={tentou && !a.seguradoraId ? 'Escolha a seguradora' : undefined}>
            <select value={a.seguradoraId} onChange={(e) => upd({ seguradoraId: e.target.value })}>
              <option value="">{opcoes.length ? 'Selecione' : 'Nenhum fornecedor marcado como seguradora'}</option>
              {opcoes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nomeFantasia || f.nome}
                </option>
              ))}
            </select>
            {opcoes.length === 0 && (
              <span className={ui.modalNote}>
                Marque a caixa “Seguradora” no cadastro do fornecedor em <Link to="/cadastros/fornecedores">Cadastros › Fornecedores</Link>.
              </span>
            )}
          </Field>
          <Field label="Tipo" req>
            <select value={a.tipo} onChange={(e) => upd({ tipo: e.target.value as TipoApolice })}>
              {TIPOS_APOLICE.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Número da apólice">
            <input value={a.numero} onChange={(e) => upd({ numero: e.target.value })} placeholder="Ex.: 44654034777282547" />
          </Field>
          <Field label="Início da vigência">
            <input type="date" value={a.vigenciaInicio} onChange={(e) => upd({ vigenciaInicio: e.target.value })} />
          </Field>
          <Field label="Fim da vigência" error={vigenciaInvertida ? 'Antes do início' : undefined}>
            <input type="date" value={a.vigenciaFim} onChange={(e) => upd({ vigenciaFim: e.target.value })} />
          </Field>
          <Field label="Limite por embarque" hint="Limite máximo de garantia (LMG) de cada embarque.">
            <MoneyInput value={a.limitePorEmbarque} onChange={(n) => upd({ limitePorEmbarque: n })} />
          </Field>
          <Field label="Custo de emissão" hint="Custo da apólice (R$).">
            <MoneyInput value={a.custoEmissao} onChange={(n) => upd({ custoEmissao: n })} />
          </Field>
          <Field label="Taxa urbana" hint="Prêmio quando origem e destino são a mesma cidade. Vazio = usa a tabela.">
            <PercentInput value={a.taxaUrbana} onChange={(n) => upd({ taxaUrbana: n })} />
          </Field>
          <Field label="Taxa padrão" hint="Prêmio das rotas que não estão na tabela. Vazio = a pessoa digita no Pricing.">
            <PercentInput value={a.taxaPadrao} onChange={(n) => upd({ taxaPadrao: n })} />
          </Field>
          <Field label="IOF" hint="Fica só registrado: não entra no ad valorem.">
            <PercentInput value={a.iof} onChange={(n) => upd({ iof: n })} />
          </Field>
          <Field label="Vale para">
            <div className={s.marcas}>
              {DOCUMENTOS_APOLICE.map((d) => (
                <label key={d.valor} className={ui.checkItem}>
                  <input type="checkbox" checked={a.documentos.includes(d.valor)} onChange={() => alternar('documentos', d.valor as DocumentoApolice)} /> {d.label}
                </label>
              ))}
            </div>
          </Field>
          <Field className={ui.col4} label="Empresas cobertas" hint="Nenhuma marcada = vale para todas as empresas.">
            <div className={s.marcas}>
              {empresas.map((e) => (
                <label key={e.id} className={ui.checkItem}>
                  <input type="checkbox" checked={a.empresaIds.includes(e.id)} onChange={() => alternar('empresaIds', e.id)} /> {e.nome}
                </label>
              ))}
            </div>
          </Field>
          <Field className={ui.col4} label="Observação">
            <input value={a.observacao} onChange={(e) => upd({ observacao: e.target.value })} placeholder="Corretor, franquia, condições especiais..." />
          </Field>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}>
          Tabela de prêmio por UF <span className={ui.fsectionHint}>sobre o valor da mercadoria; vazio = fora da tabela</span>
        </div>
        <TabelaPorUf
          linhas={a.taxas.map((t) => ({ ufOrigem: t.ufOrigem, ufDestino: t.ufDestino, valor: t.percentual }))}
          onChange={(l) => upd({ taxas: l.map((t) => ({ ufOrigem: t.ufOrigem, ufDestino: t.ufDestino, percentual: t.valor })) })}
          coluna="Prêmio %"
          nomeArquivo={`premio-${a.tipo}-${a.numero || 'apolice'}.xlsx`}
          zeroRemove
          base={a.tipo === 'RCTR-C' ? baseRctrc : undefined}
        />
      </section>
    </Modal>
  )
}
