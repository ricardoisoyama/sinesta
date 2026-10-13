import { useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import { Plus, Clock, Settings2, SquareKanban, List } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import type { Column } from '@/features/common/DataTable'
import { formatBRL } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import { getErrorMessage } from '@/lib/api'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { useCrm } from './store'
import { OportunidadeModal } from './OportunidadeModal'
import { cardQuente, type EtapaFunil, type Funil, type Oportunidade } from './types'
import s from './crm.module.css'

type ModoVisualizacao = 'kanban' | 'lista'

const MODO_KEY = 'elrond.crm.modo'

const lerModo = (): ModoVisualizacao => {
  try {
    return localStorage.getItem(MODO_KEY) === 'lista' ? 'lista' : 'kanban'
  } catch {
    return 'kanban'
  }
}

const diasNaEtapa = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
/** "2026-09-20" → "20/09". */
/** "2026-09-22T14:30" → "22/09 14:30"; só data → "22/09". */
const dataBr = (iso: string) => {
  const dia = iso.slice(0, 10).split('-').slice(1).reverse().join('/')
  const hora = iso.length > 10 ? iso.slice(11, 16) : ''
  return hora ? `${dia} ${hora}` : dia
}

const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

/** Conteúdo visual do card (usado na coluna e no overlay do arrasto). */
function CardView({ op, funil }: { op: Oportunidade; etapa: EtapaFunil; funil: Funil }) {
  const dias = diasNaEtapa(op.entrouNaEtapaEm)
  // Temperatura do lead: parado além das horas do funil fica vermelho.
  const parado = cardQuente(op, funil)
  return (
    <>
      <div className={s.cardTopo}>
        <span className={s.cardCliente}>{op.cliente}</span>
        <span className={s.cardValor}>{formatBRL(op.valorEstimado)}</span>
      </div>
      <div className={s.cardServico}>{op.servico}</div>
      {op.proximaAcao && (
        <div className={s.cardAcao}>
          {op.proximaAcao}
          {op.proximaAcaoEm && <span className={s.proximaAcaoData}> · {dataBr(op.proximaAcaoEm)}</span>}
        </div>
      )}
      <div className={s.cardRodape}>
        <span className={s.origem}>{op.origem}</span>
        <span className={s.rodapeDireita}>
          <span
            className={`${s.dias} ${parado ? s.diasParado : ''}`}
            title={parado ? `Parado há mais de ${funil.horasAlerta}h nesta etapa` : `${dias} dia(s) nesta etapa`}
          >
            <Clock size={11} /> {dias}d
          </span>
          <span className={s.avatar} title={op.responsavel}>
            {iniciais(op.responsavel)}
          </span>
        </span>
      </div>
    </>
  )
}

function CardArrastavel({
  op,
  etapa,
  funil,
  onAbrir,
}: {
  op: Oportunidade
  etapa: EtapaFunil
  funil: Funil
  onAbrir: (op: Oportunidade) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: op.id })
  const quente = cardQuente(op, funil)
  return (
    <div
      ref={setNodeRef}
      className={`${s.card} ${isDragging ? s.cardArrastando : ''} ${quente ? s.cardQuente : ''}`}
      style={funil.corCard ? { background: funil.corCard } : undefined}
      onClick={() => onAbrir(op)}
      {...listeners}
      {...attributes}
    >
      <CardView op={op} etapa={etapa} funil={funil} />
    </div>
  )
}

function Coluna({
  etapa,
  funil,
  ops,
  onAbrir,
}: {
  etapa: EtapaFunil
  funil: Funil
  ops: Oportunidade[]
  onAbrir: (op: Oportunidade) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id })
  const soma = ops.reduce((a, o) => a + o.valorEstimado, 0)
  const tipoClasse = etapa.tipo === 'ganho' ? s.colGanho : etapa.tipo === 'perdido' ? s.colPerdido : ''
  return (
    /* A coluna INTEIRA é a área de soltar (não só o miolo): mira fácil. */
    <div ref={setNodeRef} className={`${s.col} ${tipoClasse} ${isOver ? s.colOver : ''}`}>
      <div className={s.colHead}>
        <span className={s.dot} style={{ background: etapa.cor }} />
        <span className={s.colNome}>{etapa.nome}</span>
        <span className={s.colQtde}>{ops.length}</span>
      </div>
      <div className={s.colSoma}>{formatBRL(soma)}</div>
      <div className={s.colBody}>
        {ops.map((op) => (
          <CardArrastavel key={op.id} op={op} etapa={etapa} funil={funil} onAbrir={onAbrir} />
        ))}
        {ops.length === 0 && <div className={s.colVazia}>Solte um card aqui</div>}
      </div>
    </div>
  )
}

export function CrmPage() {
  const navigate = useNavigate()
  const {
    funis,
    oportunidades,
    carregando,
    moverOportunidade,
    novaOportunidade: addOportunidade,
    salvarOportunidade,
    arquivarOportunidade,
  } = useCrm()
  const [modo, setModo] = useState<ModoVisualizacao>(lerModo)
  const trocarModo = (m: ModoVisualizacao) => {
    setModo(m)
    try {
      localStorage.setItem(MODO_KEY, m)
    } catch {
      // storage indisponível: só perde a memória da escolha
    }
  }

  const [funilId, setFunilId] = useState('')
  // Enquanto a escolha não existir na lista (ou ainda não houve escolha), vale o primeiro funil.
  const funil: Funil | undefined = funis.find((f) => f.id === funilId) ?? funis[0]
  const [arrastando, setArrastando] = useState<Oportunidade | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Oportunidade | null>(null)
  // /crm?op=<id> (vindo da Agenda) abre o card direto, no funil dele. Ajuste no render, sem efeito.
  const [params, setParams] = useSearchParams()
  const { key: chaveNavegacao } = useLocation()
  const opPedido = params.get('op') ?? ''
  // Cada clique na Agenda é uma navegação nova (key nova): o mesmo card pode ser reaberto.
  const pedidoAtual = opPedido ? `${opPedido}|${chaveNavegacao}` : ''
  const [opAberto, setOpAberto] = useState('')
  if (pedidoAtual && pedidoAtual !== opAberto) {
    const pedido = oportunidades.find((o) => o.id === opPedido)
    if (pedido) {
      setOpAberto(pedidoAtual)
      setFunilId(pedido.funilId)
      setEditando(pedido)
      setModalOpen(true)
    }
  }
  // Depois de um arrasto, o navegador ainda dispara um click no card: ignora-o.
  const acabouDeArrastar = useRef(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const doFunil = funil ? oportunidades.filter((o) => o.funilId === funil.id) : []
  const abertas = doFunil.filter((o) => funil?.etapas.find((e) => e.id === o.etapaId)?.tipo === 'normal')
  const somaAbertas = abertas.reduce((a, o) => a + o.valorEstimado, 0)

  // Modo lista: busca + grid padrão (filtro por coluna, colunas, paginação).
  const [busca, setBusca] = useState('')
  const q = semAcento(busca.trim())
  const listaFiltrada = q
    ? doFunil.filter((o) => semAcento(`${o.cliente} ${o.responsavel} ${o.servico} ${o.cnpj}`).includes(q))
    : doFunil
  const nomeEtapa = (op: Oportunidade) => funil?.etapas.find((e) => e.id === op.etapaId)?.nome ?? ''
  const colunasLista: Column<Oportunidade>[] = [
    { header: 'Cliente', fixa: true, valor: (op) => `${op.cliente} ${op.cnpj}`, cell: (op) => <span className={ui.cellStrong}>{op.cliente}</span> },
    { header: 'Serviço', valor: (op) => op.servico, cell: (op) => <span className={ui.cellMut}>{op.servico || '—'}</span> },
    {
      header: 'Etapa',
      valor: nomeEtapa,
      cell: (op) => {
        const etapa = funil?.etapas.find((e) => e.id === op.etapaId)
        return (
          <span className={s.etapaTag}>
            <span className={s.dot} style={{ background: etapa?.cor }} />
            {etapa?.nome ?? '—'}
          </span>
        )
      },
    },
    { header: 'Responsável', valor: (op) => op.responsavel, cell: (op) => <span className={ui.cellMut}>{op.responsavel}</span> },
    { header: 'Proposta', valor: (op) => op.propostaNumero, cell: (op) => <span className={ui.cellMut}>{op.propostaNumero || '—'}</span> },
    {
      header: 'Próxima ação',
      valor: (op) => `${op.proximaAcao} ${op.proximaAcaoDetalhe}`,
      cell: (op) => (
        <span className={ui.cellMut}>
          {op.proximaAcao || '—'}
          {op.proximaAcaoEm && <span className={s.proximaAcaoData}> · {dataBr(op.proximaAcaoEm)}</span>}
        </span>
      ),
    },
    { header: 'Valor', className: ui.right, valor: (op) => formatBRL(op.valorEstimado), cell: (op) => <span className={ui.cellStrong}>{formatBRL(op.valorEstimado)}</span> },
    { header: 'Na etapa', className: ui.right, valor: (op) => diasNaEtapa(op.entrouNaEtapaEm), cell: (op) => <span className={ui.cellMut}>{diasNaEtapa(op.entrouNaEtapaEm)}d</span> },
  ]

  const onDragStart = (ev: DragStartEvent) => {
    setArrastando(doFunil.find((o) => o.id === ev.active.id) ?? null)
  }

  const onDragEnd = (ev: DragEndEvent) => {
    setArrastando(null)
    acabouDeArrastar.current = true
    window.setTimeout(() => {
      acabouDeArrastar.current = false
    }, 250)
    const destino = ev.over?.id
    if (destino) moverOportunidade(String(ev.active.id), String(destino)).catch((err) => avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) }))
  }

  const abrirDetalhe = (op: Oportunidade) => {
    if (acabouDeArrastar.current) return
    setEditando(op)
    setModalOpen(true)
  }

  const novaOportunidade = () => {
    setEditando(null)
    setModalOpen(true)
  }

  const fecharModal = () => {
    setModalOpen(false)
    setEditando(null)
    if (opPedido) setParams({}, { replace: true })
  }

  const [erroModal, setErroModal] = useState<string | null>(null)
  const [salvandoOp, setSalvandoOp] = useState(false)

  const gravar = async (op: Oportunidade) => {
    setErroModal(null)
    setSalvandoOp(true)
    try {
      if (editando) await salvarOportunidade(op)
      else await addOportunidade(op)
      return true
    } catch (err) {
      setErroModal(getErrorMessage(err))
      return false
    } finally {
      setSalvandoOp(false)
    }
  }

  const salvar = async (op: Oportunidade) => {
    if (await gravar(op)) fecharModal()
  }

  // Exclusão lógica: o card sai do kanban e fica guardado no histórico (quem/quando).
  const excluir = async (op: Oportunidade) => {
    const ok = await confirmar({
      titulo: 'Arquivar oportunidade',
      mensagem: `Arquivar a oportunidade de "${op.cliente}"? Ela sai do kanban, mas o histórico fica guardado.`,
      confirmar: 'Arquivar',
      perigo: true,
    })
    if (!ok) return
    try {
      await arquivarOportunidade(op.id)
      fecharModal()
    } catch (err) {
      setErroModal(getErrorMessage(err))
    }
  }

  const gerarProposta = async (op: Oportunidade) => {
    if (!(await gravar(op))) return
    fecharModal()
    navigate(`/simulador?cliente=${encodeURIComponent(op.cliente)}`)
  }

  if (!funil) {
    return (
      <div className={s.page}>
        <PageHeader breadcrumb="Comercial" title="CRM" subtitle="Funil de oportunidades: arraste os cards entre as etapas." />
        <div className={s.resumo}>{carregando ? 'Carregando o CRM...' : 'Nenhum funil cadastrado. Crie um em Configurações > Funis do CRM.'}</div>
      </div>
    )
  }

  return (
    <div className={s.page}>
      <PageHeader
        breadcrumb="Comercial"
        title="CRM"
        subtitle="Funil de oportunidades: arraste os cards entre as etapas."
        action={
          <div className={s.acoes}>
            <div className={s.modoSwitch} role="group" aria-label="Modo de visualização">
              <button
                type="button"
                className={modo === 'kanban' ? s.modoOn : ''}
                onClick={() => trocarModo('kanban')}
                title="Ver como kanban"
              >
                <SquareKanban size={15} /> Kanban
              </button>
              <button
                type="button"
                className={modo === 'lista' ? s.modoOn : ''}
                onClick={() => trocarModo('lista')}
                title="Ver como lista"
              >
                <List size={15} /> Lista
              </button>
            </div>
            {funis.length > 1 && (
              <select className={ui.filterSelect} value={funil.id} onChange={(e) => setFunilId(e.target.value)}>
                {funis.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            )}
            <Link to="/cadastros/funis" className={ui.iconBtn} title="Parametrizar funis e etapas">
              <Settings2 />
            </Link>
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={novaOportunidade}>
              <Plus /> Nova oportunidade
            </button>
          </div>
        }
      />

      <div className={s.resumo}>
        <b>{abertas.length}</b>&nbsp;oportunidade{abertas.length === 1 ? '' : 's'} em aberto ·{' '}
        <b>{formatBRL(somaAbertas)}</b>&nbsp;em negociação
      </div>

      {modo === 'kanban' ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className={s.board}>
            {funil.etapas.map((etapa) => (
              <Coluna
                key={etapa.id}
                etapa={etapa}
                funil={funil}
                ops={doFunil.filter((o) => o.etapaId === etapa.id)}
                onAbrir={abrirDetalhe}
              />
            ))}
          </div>
          <DragOverlay>
            {arrastando && (
              <div className={`${s.card} ${s.cardOverlay}`}>
                <CardView
                  op={arrastando}
                  etapa={funil.etapas.find((e) => e.id === arrastando.etapaId) ?? funil.etapas[0]}
                  funil={funil}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className={s.lista}>
          <CrudList
            id="crm-lista"
            query={busca}
            onQuery={setBusca}
            searchPlaceholder="Buscar por cliente, responsável ou serviço..."
            columns={colunasLista}
            rows={listaFiltrada}
            getKey={(op) => op.id}
            onRowClick={abrirDetalhe}
            pageSize={12}
            rotulo={['oportunidade', 'oportunidades']}
            empty="Nenhuma oportunidade neste funil."
          />
        </div>
      )}

      <OportunidadeModal
        open={modalOpen}
        initial={editando}
        funil={funil}
        busy={salvandoOp}
        error={erroModal}
        onClose={() => {
          setErroModal(null)
          fecharModal()
        }}
        onSave={salvar}
        onRemove={excluir}
        onGerarProposta={gerarProposta}
      />
    </div>
  )
}
