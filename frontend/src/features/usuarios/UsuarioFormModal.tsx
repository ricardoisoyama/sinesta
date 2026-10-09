import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Users, ShieldCheck, Eye, EyeOff, IdCard, Landmark } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { CampoCep } from '@/features/common/CampoCep'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import { DadosBancariosFields } from '@/features/parceiros/DadosBancariosFields'
import { mesclar } from '@/lib/mesclar'
import ui from '@/features/common/ui.module.css'
import { formatCpf, formatRg, formatTelefone } from '@/lib/format'
import s from './usuarios.module.css'
import { usuarioSchema, emptyUsuario, type UsuarioForm } from './usuario-schema'
import type { Perfil, Usuario } from './types'
import { funcionalidadesPorGrupo, PERFIL_PRESET, GRUPO_ESPECIAIS, ehExtra } from './funcionalidades'

interface Props {
  open: boolean
  initial?: Usuario | null
  error?: string | null
  onClose: () => void
  onSave: (data: UsuarioForm) => void
}

const grupos = funcionalidadesPorGrupo()

export function UsuarioFormModal({ open, initial, error, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<UsuarioForm>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: emptyUsuario,
  })

  const [showPw, setShowPw] = useState(false)
  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const perfil = useWatch({ control, name: 'perfil' }) ?? 'Colaborador'
  const permissoes = useWatch({ control, name: 'permissoes' }) ?? []
  const cpf = useWatch({ control, name: 'cpf' }) ?? ''
  const rg = useWatch({ control, name: 'rg' }) ?? ''
  const telefone = useWatch({ control, name: 'telefone' }) ?? ''
  const cep = useWatch({ control, name: 'endereco.cep' }) ?? ''
  const cidade = useWatch({ control, name: 'cidade' }) ?? ''
  const banco = useWatch({ control, name: 'banco' }) ?? emptyUsuario.banco
  const isGestor = perfil === 'Gestor'

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowPw(false)
    reset(
      initial
        ? {
            ...emptyUsuario,
            ...initial,
            senha: '',
            // Cadastros de antes não têm endereço nem banco: começam em branco (sem null no salvar).
            cidade: initial.cidade ?? '',
            endereco: mesclar(emptyUsuario.endereco, initial.endereco),
            banco: mesclar(emptyUsuario.banco, initial.banco),
          }
        : emptyUsuario,
    )
  }, [open, initial, reset])

  const trocarPerfil = (p: Perfil) => {
    setValue('perfil', p)
    // As especiais que já estavam ligadas continuam: são independentes do perfil.
    const especiais = permissoes.filter(ehExtra)
    setValue('permissoes', [...PERFIL_PRESET[p], ...especiais], { shouldValidate: true })
  }

  // Gestor: as comuns são fixas (tem todas); as especiais ele liga uma a uma.
  const bloqueada = (key: string) => isGestor && !ehExtra(key)

  const togglePerm = (key: string) => {
    if (bloqueada(key)) return
    const next = permissoes.includes(key)
      ? permissoes.filter((k) => k !== key)
      : [...permissoes, key]
    setValue('permissoes', next, { shouldValidate: true })
  }

  const toggleGrupo = (keys: string[], liga: boolean) => {
    if (keys.some(bloqueada)) return
    const set = new Set(permissoes)
    keys.forEach((k) => (liga ? set.add(k) : set.delete(k)))
    setValue('permissoes', [...set], { shouldValidate: true })
  }

  const submit = handleSubmit((data) => {
    // No cadastro a senha é obrigatória (mín. 8, igual ao servidor). Na edição, em branco = manter.
    const senha = data.senha.trim()
    if ((!initial && senha.length < 8) || (initial && senha.length > 0 && senha.length < 8)) {
      setError('senha', { message: 'Defina uma senha de ao menos 8 caracteres.' })
      return
    }
    onSave(data)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Funcionário"
      subtitle={initial ? 'Editar cadastro' : 'Novo funcionário'}
      icon={<Users />}
      maxWidth={720}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="usuarioForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar
          </button>
        </>
      }
    >
      <form id="usuarioForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>
            Quem trabalha na empresa e acessa o portal. O perfil define o acesso padrão;
            ajuste as funcionalidades abaixo.
          </span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col2} label="Nome" req error={errors.nome?.message}>
              <input {...register('nome')} placeholder="Ex.: Marina Alves" />
            </Field>
            <Field className={ui.col2} label="E-mail" req error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="nome@empresa.com.br" />
            </Field>
            <Field className={ui.col2} label="Perfil" req error={errors.perfil?.message}>
              <select value={perfil} onChange={(e) => trocarPerfil(e.target.value as Perfil)}>
                <option value="Gestor">Gestor (acesso total)</option>
                <option value="Colaborador">Colaborador (acesso restrito)</option>
              </select>
            </Field>
            <Field
              className={ui.col2}
              label={initial ? 'Nova senha' : 'Senha'}
              req={!initial}
              error={errors.senha?.message}
            >
              <div className={s.pwWrap}>
                <input
                  {...register('senha')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={initial ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                />
                <button
                  type="button"
                  className={s.pwEye}
                  onClick={() => setShowPw((v) => !v)}
                  title={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </Field>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            <IdCard /> Dados do funcionário
          </div>
          <div className={ui.grid}>
            <Field className={ui.col2} label="Cargo">
              <input {...register('cargo')} placeholder="Ex.: Analista comercial" />
            </Field>
            <Field className={ui.col2} label="Departamento">
              <input {...register('departamento')} placeholder="Ex.: Comercial" />
            </Field>
            <Field className={ui.col2} label="CPF">
              <input
                value={cpf}
                onChange={(e) => setValue('cpf', formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
              />
            </Field>
            <Field className={ui.col2} label="RG">
              <input
                value={rg}
                onChange={(e) => setValue('rg', formatRg(e.target.value))}
                placeholder="00.000.000-0"
                maxLength={12}
              />
            </Field>
            <Field className={ui.col2} label="Telefone">
              <input
                value={telefone}
                onChange={(e) => setValue('telefone', formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                maxLength={15}
              />
            </Field>
            <Field className={ui.col2} label="Data de admissão">
              <input type="date" {...register('dataAdmissao')} />
            </Field>

            <div className={`${ui.col4} ${ui.fsectionTitle}`} style={{ marginTop: 4, marginBottom: 0 }}>
              Endereço
            </div>
            <Field label="CEP" hint="Com os 8 números, rua, bairro e cidade são preenchidos sozinhos.">
              <CampoCep
                value={cep}
                onChange={(v) => setValue('endereco.cep', v)}
                onEncontrado={(c) => {
                  // Número e complemento ficam como estão: o CEP não sabe deles.
                  if (c.logradouro) setValue('endereco.logradouro', c.logradouro)
                  if (c.bairro) setValue('endereco.bairro', c.bairro)
                  if (c.cidade) setValue('cidade', c.cidade)
                }}
              />
            </Field>
            <Field className={ui.col2} label="Rua">
              <input {...register('endereco.logradouro')} placeholder="Rua, avenida..." />
            </Field>
            <Field label="Número">
              <input {...register('endereco.numero')} placeholder="Ex.: 45 ou S/N" />
            </Field>
            <Field label="Complemento">
              <input {...register('endereco.complemento')} placeholder="Apto, bloco..." />
            </Field>
            <Field label="Bairro">
              <input {...register('endereco.bairro')} />
            </Field>
            <Field className={ui.col2} label="Cidade">
              <CidadeAutocomplete value={cidade} onChange={(v) => setValue('cidade', v)} placeholder="Digite e escolha a cidade" />
            </Field>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            <Landmark /> Dados bancários
          </div>
          <DadosBancariosFields value={banco} onChange={(v) => setValue('banco', v)} />
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            <ShieldCheck /> Permissões por funcionalidade
          </div>

          {isGestor && (
            <div className={s.perfilNote}>
              <ShieldCheck />
              Gestor tem acesso a todas as funcionalidades comuns. Só as permissões especiais, no fim
              da lista, precisam ser ligadas uma a uma.
            </div>
          )}

          {grupos.map((g) => {
            const keys = g.itens.map((i) => i.key)
            const todosOn = keys.every((k) => permissoes.includes(k))
            const especial = g.grupo === GRUPO_ESPECIAIS
            return (
              <div key={g.grupo} className={s.permGroup}>
                <div className={s.permGroupHead}>
                  <span className={s.permGroupTitle}>{g.grupo}</span>
                  {(!isGestor || especial) && (
                    <button type="button" className={s.permAll} onClick={() => toggleGrupo(keys, !todosOn)}>
                      {todosOn ? 'Desmarcar grupo' : 'Marcar grupo'}
                    </button>
                  )}
                </div>
                {especial && (
                  <div className={s.permHint}>
                    Desligadas por padrão para todos os perfis. Ligue só para quem precisa.
                  </div>
                )}
                <div className={s.permGrid}>
                  {g.itens.map((f) => {
                    const on = bloqueada(f.key) || permissoes.includes(f.key)
                    return (
                      <div key={f.key} className={`${s.permRow} ${on ? s.permRowOn : ''}`}>
                        <span className={s.permName}>{f.label}</span>
                        <button
                          type="button"
                          className={`${s.sw} ${on ? s.swOn : ''}`}
                          onClick={() => togglePerm(f.key)}
                          disabled={bloqueada(f.key)}
                          aria-label={`Liberar ${f.label}`}
                        >
                          <span className={s.swDot} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {errors.permissoes && <div className={s.permErr}>{errors.permissoes.message}</div>}
        </section>
      </form>
    </Modal>
  )
}
