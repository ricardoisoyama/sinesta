import { Plus, Trash2 } from 'lucide-react'
import { Field } from '@/features/common/Field'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import ui from '@/features/common/ui.module.css'
import { mockIcms } from '@/features/icms/mock'
import { PAISES } from './types'
import type { RegiaoBloqueada } from './regiao'
import s from './parceiros.module.css'

interface Props {
  value: RegiaoBloqueada[]
  onChange: (v: RegiaoBloqueada[]) => void
}

const UFS = [...mockIcms].sort((a, b) => a.nome.localeCompare(b.nome))

/** Regiões em que o vendedor não pode vender: país inteiro, um estado (todas as cidades) ou uma cidade. */
export function RegioesEditor({ value, onChange }: Props) {
  const upd = (i: number, patch: Partial<RegiaoBloqueada>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const rm = (i: number) => onChange(value.filter((_, j) => j !== i))
  const add = () => onChange([...value, { tipo: 'estado', valor: '' }])

  return (
    <div>
      {value.length === 0 && <div className={s.contatosVazio}>Nenhuma região bloqueada: o vendedor pode vender para qualquer lugar.</div>}
      {value.map((r, i) => (
        <div key={i} className={s.regiaoLinha}>
          <Field label="Bloquear">
            <select value={r.tipo} onChange={(e) => upd(i, { tipo: e.target.value as RegiaoBloqueada['tipo'], valor: '' })}>
              <option value="estado">Estado inteiro</option>
              <option value="cidade">Uma cidade</option>
              <option value="pais">País inteiro</option>
            </select>
          </Field>
          <Field label={r.tipo === 'estado' ? 'Estado' : r.tipo === 'cidade' ? 'Cidade' : 'País'}>
            {r.tipo === 'estado' ? (
              <select value={r.valor} onChange={(e) => upd(i, { valor: e.target.value })}>
                <option value="">Selecione</option>
                {UFS.map((u) => (
                  <option key={u.uf} value={u.uf}>
                    {u.nome} ({u.uf})
                  </option>
                ))}
              </select>
            ) : r.tipo === 'cidade' ? (
              <CidadeAutocomplete value={r.valor} onChange={(v) => upd(i, { valor: v })} placeholder="Digite e escolha a cidade" />
            ) : (
              <>
                <input value={r.valor} onChange={(e) => upd(i, { valor: e.target.value })} list="paises-regiao" placeholder="Ex.: Brasil" />
                <datalist id="paises-regiao">
                  <option value="Brasil" />
                  {PAISES.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <button type="button" className={`${ui.iconBtn} ${ui.danger}`} onClick={() => rm(i)} title="Remover" style={{ marginTop: 18 }}>
            <Trash2 />
          </button>
        </div>
      ))}
      <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={add}>
        <Plus /> Bloquear região
      </button>
    </div>
  )
}
