import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  X,
} from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { Modal } from '@/features/common/Modal'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { useCustosFixosQuery, useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import { useAuth } from '@/features/auth/auth-context'
import { BLOCOS, type DefinicaoBloco } from './blocos'
import {
  COLUNAS,
  ROTULO_TAMANHO,
  type BlocoNoLayout,
  type LayoutDashboard as Layout,
  useLayoutDashboard,
} from './layout'
import s from './dashboard.module.css'

const POR_ID = new Map(BLOCOS.map((b) => [b.id, b]))
const iguais = (a: BlocoNoLayout[], b: BlocoNoLayout[]) => JSON.stringify(a) === JSON.stringify(b)

export function DashboardPage() {
  const { data: empresasData } = useEmpresasQuery()
  useCustosFixosQuery()
  const unidades = (empresasData ?? []).filter((u) => u.status === 'ativo')
  const [unidadeId, setUnidadeId] = useState('')
  const { user } = useAuth()
  const { layout, personalizado, salvar, restaurar, salvarComoPadrao } = useLayoutDashboard()
  // Enquanto personaliza, mexe num rascunho; "Concluir" grava.
  const [rascunho, setRascunho] = useState<BlocoNoLayout[] | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [catalogo, setCatalogo] = useState(false)
  const [gravando, setGravando] = useState(false)

  useEffect(() => {
    if (unidades.length && !unidades.some((u) => u.id === unidadeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnidadeId((empresaPadrao(unidades) ?? unidades[0]).id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidades.map((u) => u.id).join(','), unidadeId])

  const ehAdmin = user?.perfil === 'Admin'
  const ehGestor = ehAdmin || user?.perfil === 'Gestor'
  const pode = (b: DefinicaoBloco) =>
    !b.permissao || ehAdmin || !!user?.permissoes?.includes(b.permissao)
  const editando = rascunho !== null
  const blocos = rascunho ?? layout.blocos
  // Bloco que a pessoa não pode ver (ou que saiu do sistema) fica no layout gravado, só não aparece.
  const visiveis = blocos.filter((b) => {
    const d = POR_ID.get(b.id)
    return d && pode(d)
  })
  const disponiveis = BLOCOS.filter((d) => pode(d) && !blocos.some((b) => b.id === d.id))

  const mudar = (fn: (l: BlocoNoLayout[]) => BlocoNoLayout[]) =>
    setRascunho((r) => fn(r ?? layout.blocos))
  const mover = (id: string, para: number) =>
    mudar((l) => {
      const de = l.findIndex((b) => b.id === id)
      if (de < 0 || para < 0 || para >= l.length || de === para) return l
      const n = [...l]
      const [b] = n.splice(de, 1)
      n.splice(para, 0, b)
      return n
    })
  /** Move pela posição entre os visíveis (os escondidos não contam para as setas). */
  const moverVisivel = (id: string, passo: number) => {
    const i = visiveis.findIndex((b) => b.id === id)
    const alvo = visiveis[i + passo]
    if (alvo)
      mover(
        id,
        blocos.findIndex((b) => b.id === alvo.id),
      )
  }

  const concluir = async () => {
    if (!rascunho) return
    if (iguais(rascunho, layout.blocos)) return setRascunho(null)
    setGravando(true)
    try {
      await salvar({ versao: 1, blocos: rascunho })
      setRascunho(null)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível salvar o dashboard.')
    } finally {
      setGravando(false)
    }
  }

  const voltarAoPadrao = async () => {
    const ok = await confirmar({
      titulo: 'Restaurar o padrão',
      mensagem:
        'O seu dashboard volta a ser o padrão do ambiente. As suas mudanças de blocos, ordem e tamanho são descartadas.',
      confirmar: 'Restaurar',
    })
    if (!ok) return
    setGravando(true)
    try {
      await restaurar()
      setRascunho(null)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível restaurar o padrão.')
    } finally {
      setGravando(false)
    }
  }

  const definirPadraoDoAmbiente = async () => {
    const ok = await confirmar({
      titulo: 'Usar como padrão do ambiente',
      mensagem:
        'Este layout passa a ser o que todo mundo vê ao entrar. Quem já personalizou o próprio dashboard continua com o seu (pode voltar com "Restaurar padrão"). Cada pessoa só vê os blocos das telas a que tem acesso.',
      confirmar: 'Usar como padrão',
    })
    if (!ok) return
    const l: Layout = { versao: 1, blocos }
    setGravando(true)
    try {
      await salvarComoPadrao(l)
      // O meu também fica igual, para não ficar preso a um layout antigo.
      if (personalizado || rascunho) await restaurar()
      setRascunho(null)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível definir o padrão do ambiente.')
    } finally {
      setGravando(false)
    }
  }

  return (
    <div>
      <div className={s.head}>
        <div className={ui.pageTitle}>Dashboard</div>
        <div className={s.headAcoes}>
          <select
            className={ui.filterSelect}
            value={unidadeId}
            onChange={(e) => setUnidadeId(e.target.value)}
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
          {!editando && (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnGhost}`}
              onClick={() => setRascunho(layout.blocos)}
            >
              <Settings2 /> Personalizar
            </button>
          )}
        </div>
      </div>

      {editando && (
        <div className={s.barraEdicao}>
          <div className={s.barraTexto}>
            <b>Personalizando o seu dashboard</b>
            <span>
              Arraste um bloco pela alça para mudar a ordem, escolha o tamanho (P, M ou G) e tire o
              que não usa. Só você vê as mudanças.
            </span>
          </div>
          <div className={s.barraBotoes}>
            <button
              type="button"
              className={`${ui.btn} ${ui.btnGhost}`}
              onClick={() => setCatalogo(true)}
              disabled={gravando}
            >
              <Plus /> Adicionar blocos
            </button>
            <button
              type="button"
              className={`${ui.btn} ${ui.btnGhost}`}
              onClick={voltarAoPadrao}
              disabled={gravando}
            >
              <RotateCcw /> Restaurar padrão
            </button>
            {ehGestor && (
              <button
                type="button"
                className={`${ui.btn} ${ui.btnGhost}`}
                onClick={definirPadraoDoAmbiente}
                disabled={gravando}
              >
                <Share2 /> Usar como padrão do ambiente
              </button>
            )}
            <button
              type="button"
              className={`${ui.btn} ${ui.btnGhost}`}
              onClick={() => setRascunho(null)}
              disabled={gravando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`${ui.btn} ${ui.btnPrimary}`}
              onClick={concluir}
              disabled={gravando}
            >
              {gravando ? 'Salvando…' : 'Concluir'}
            </button>
          </div>
        </div>
      )}

      <div className={`${s.grade} ${editando ? s.editando : ''}`}>
        {visiveis.map((b, i) => {
          const d = POR_ID.get(b.id)!
          return (
            <div
              key={b.id}
              className={`${s.bloco} ${s[`t${b.tamanho}`]} ${arrastando === b.id ? s.arrastado : ''}`}
              style={{ ['--span' as string]: COLUNAS[b.tamanho] }}
              draggable={editando}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', b.id)
                setArrastando(b.id)
              }}
              onDragEnter={() =>
                arrastando &&
                arrastando !== b.id &&
                mover(
                  arrastando,
                  blocos.findIndex((x) => x.id === b.id),
                )
              }
              onDragOver={(e) => editando && e.preventDefault()}
              onDragEnd={() => setArrastando(null)}
              onDrop={(e) => e.preventDefault()}
            >
              {editando && (
                <div className={s.ferramentas}>
                  <span className={s.alca} title="Arraste para mudar a ordem">
                    <GripVertical />
                    {d.titulo}
                  </span>
                  <span className={s.ferramentasDir}>
                    <button
                      type="button"
                      title="Para trás"
                      aria-label={`Mover ${d.titulo} para trás`}
                      disabled={i === 0}
                      onClick={() => moverVisivel(b.id, -1)}
                    >
                      <ArrowLeft />
                    </button>
                    <button
                      type="button"
                      title="Para a frente"
                      aria-label={`Mover ${d.titulo} para a frente`}
                      disabled={i === visiveis.length - 1}
                      onClick={() => moverVisivel(b.id, 1)}
                    >
                      <ArrowRight />
                    </button>
                    {d.tamanhos.length > 1 && (
                      <span className={s.tamanhos} role="group" aria-label="Tamanho">
                        {d.tamanhos.map((t) => (
                          <button
                            key={t}
                            type="button"
                            title={ROTULO_TAMANHO[t]}
                            className={b.tamanho === t ? s.tamanhoOn : undefined}
                            aria-pressed={b.tamanho === t}
                            onClick={() =>
                              mudar((l) => l.map((x) => (x.id === b.id ? { ...x, tamanho: t } : x)))
                            }
                          >
                            {t.toUpperCase()}
                          </button>
                        ))}
                      </span>
                    )}
                    <button
                      type="button"
                      title="Tirar do dashboard"
                      aria-label={`Tirar ${d.titulo}`}
                      className={s.tirar}
                      onClick={() => mudar((l) => l.filter((x) => x.id !== b.id))}
                    >
                      <X />
                    </button>
                  </span>
                </div>
              )}
              <div className={s.conteudo}>{d.render({ empresaId: unidadeId })}</div>
            </div>
          )
        })}
        {editando && (
          <button
            type="button"
            className={`${s.bloco} ${s.adicionar}`}
            style={{ ['--span' as string]: 1 }}
            onClick={() => setCatalogo(true)}
          >
            <Plus /> Adicionar blocos
          </button>
        )}
      </div>

      {!editando && visiveis.length === 0 && (
        <div className={s.vazio}>
          <LayoutDashboard />
          <b>O dashboard está vazio.</b>
          <span>Clique em Personalizar para escolher os blocos.</span>
        </div>
      )}

      <Modal
        open={catalogo}
        onClose={() => setCatalogo(false)}
        title="Adicionar blocos"
        subtitle="Escolha o que quer ver no dashboard. Depois é só arrastar para o lugar."
        maxWidth={720}
        maximizavel={false}
        footer={
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary}`}
            onClick={() => setCatalogo(false)}
          >
            Pronto
          </button>
        }
      >
        {disponiveis.length === 0 ? (
          <div className={s.catalogoVazio}>
            Todos os blocos disponíveis para você já estão no dashboard.
          </div>
        ) : (
          <div className={s.catalogo}>
            {disponiveis.map((d) => (
              <div key={d.id} className={s.catalogoItem}>
                <span className={s.catalogoIcone}>
                  <d.icone />
                </span>
                <span className={s.catalogoTexto}>
                  <b>{d.titulo}</b>
                  <small>{d.descricao}</small>
                </span>
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnGhost}`}
                  onClick={() => mudar((l) => [...l, { id: d.id, tamanho: d.tamanhos[0] }])}
                >
                  <Plus /> Adicionar
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
