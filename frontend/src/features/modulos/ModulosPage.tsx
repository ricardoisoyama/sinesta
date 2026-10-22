import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Lock, Save } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { navGroups } from '@/features/layout/nav'
import { getErrorMessage } from '@/lib/api'
import { CHAVE_MODULOS, ESSENCIAIS, IMPORTANTES, lerModulos, salvarModulos } from './api'
import s from './modulos.module.css'

/**
 * Módulos do sistema (só a equipe ELROND): quais itens o menu deste ambiente mostra. Não é
 * permissão de perfil: o que for desligado some do menu de todo mundo do ambiente.
 */
export function ModulosPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: CHAVE_MODULOS, queryFn: lerModulos })
  const [editado, setEditado] = useState<string[] | null>(null)
  const [salvando, setSalvando] = useState(false)
  const desligados = editado ?? data?.menusDesligados ?? []
  const mudou = editado !== null && JSON.stringify([...editado].sort()) !== JSON.stringify([...(data?.menusDesligados ?? [])].sort())

  const grupos = navGroups
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.acao) }))
    .filter((g) => g.items.length > 0)

  const alternar = async (path: string, nome: string) => {
    const ligado = !desligados.includes(path)
    if (ligado && IMPORTANTES[path]) {
      const ok = await confirmar({
        titulo: `Desligar ${nome}?`,
        mensagem: `${IMPORTANTES[path]} O menu some para todo mundo deste ambiente.`,
        confirmar: 'Desligar mesmo assim',
        cancelar: 'Manter ligado',
        perigo: true,
      })
      if (!ok) return
    }
    setEditado(ligado ? [...desligados, path] : desligados.filter((p) => p !== path))
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      await salvarModulos(desligados)
      await qc.invalidateQueries({ queryKey: CHAVE_MODULOS })
      setEditado(null)
      void avisar({ titulo: 'Módulos salvos', mensagem: 'O menu deste ambiente já mostra a configuração nova (quem estiver com o sistema aberto vê ao recarregar a página).' })
    } catch (err) {
      void avisar({ titulo: 'Não foi possível salvar', mensagem: getErrorMessage(err) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Administrativo"
        title="Módulos do sistema"
        subtitle="O que o menu deste ambiente mostra. Não é permissão de perfil: o que for desligado some do menu de todo mundo. Só a equipe ELROND altera."
        action={
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!mudou || salvando} onClick={() => void salvar()}>
            <Save /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        }
      />
      {isLoading ? (
        <p className={ui.cellMut}>Carregando...</p>
      ) : (
        <div className={s.grade}>
          {grupos.map((g) => (
            <section key={g.label ?? 'inicio'} className={ui.card}>
              <div className={s.grupoTitulo}>{g.label ?? 'Início'}</div>
              <ul className={s.lista}>
                {g.items.map((it) => {
                  const essencial = ESSENCIAIS[it.path]
                  const ligado = !desligados.includes(it.path)
                  const Icone = it.icon
                  return (
                    <li key={it.path} className={`${s.item} ${ligado ? '' : s.desligado}`}>
                      <Icone size={16} className={s.icone} />
                      <div className={s.texto}>
                        <b>{it.label}</b>
                        {essencial ? (
                          <small><Lock size={11} /> {essencial}</small>
                        ) : IMPORTANTES[it.path] ? (
                          <small className={ligado ? undefined : s.aviso}>{!ligado && <AlertTriangle size={11} />} {IMPORTANTES[it.path]}</small>
                        ) : null}
                      </div>
                      <label className={s.chave} title={essencial ? 'Essencial: não se desliga' : ligado ? 'Desligar do menu' : 'Ligar no menu'}>
                        <input type="checkbox" checked={ligado} disabled={!!essencial} onChange={() => void alternar(it.path, it.label)} />
                        <span>{ligado ? 'No menu' : 'Desligado'}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
