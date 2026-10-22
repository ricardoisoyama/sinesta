import { useMemo, useState } from 'react'
import { Mail, Plus, UserRound } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { useQueryClient } from '@tanstack/react-query'
import { enviarConviteUsuario } from '@/features/cadastros/api'
import { useUsuarios } from './store'
import { UsuarioFormModal } from './UsuarioFormModal'
import { useAuth } from '@/features/auth/auth-context'
import { FUNCIONALIDADES_CONCEDIVEIS } from './funcionalidades'
import { rotuloPerfil, temPoderDeGestor, type Usuario } from './types'
import type { UsuarioForm } from './usuario-schema'

const ROTULO_CONVITE: Record<string, string> = {
  enviado: 'Convite enviado',
  'nao-enviado': 'Convite não enviado',
  clicou: 'Abriu o link',
  aceito: 'Ativo (criou a senha)',
  expirado: 'Convite expirado',
}
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export function UsuariosPage() {
  const { usuarios, add, update } = useUsuarios()
  const souAdmin = useAuth().user?.perfil === 'Admin'
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.cargo ?? '').toLowerCase().includes(q),
    )
  }, [usuarios, query])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (u: Usuario) => { setEditing(u); setModalOpen(true) }
  const close = () => { setEditing(null); setModalOpen(false) }

  const qc = useQueryClient()
  const [reenviando, setReenviando] = useState<string | null>(null)
  const reenviar = async (u: Usuario) => {
    setReenviando(u.id)
    try {
      await enviarConviteUsuario(u.id)
      void avisar({ titulo: 'Convite enviado', mensagem: `Mandamos um link novo para ${u.email}. O anterior deixou de valer.` })
    } catch (err) {
      void avisar({ titulo: 'Não foi possível mandar o convite', mensagem: getErrorMessage(err) })
    } finally {
      setReenviando(null)
      void qc.invalidateQueries({ queryKey: ['usuarios'] })
    }
  }

  const save = async (data: UsuarioForm) => {
    setSaveError(null)
    try {
      if (editing) await update(editing.id, data)
      else {
        const criado = await add({ ...data, id: crypto.randomUUID() })
        if (data.enviarConvite && criado?.convite === 'nao-enviado')
          void avisar({ titulo: 'Cadastro feito, convite não enviado', mensagem: `${criado.conviteErro || 'O e-mail não saiu.'} Confira a Integração SMTP e use "Reenviar convite" na lista.` })
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    close()
  }

  const setStatus = async (u: Usuario, status: 'ativo' | 'inativo') => {
    try {
      await update(u.id, { status })
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
    }
  }

  const totalFuncs = FUNCIONALIDADES_CONCEDIVEIS.length

  const columns: Column<Usuario>[] = [
    {
      header: 'Funcionário',
      fixa: true,
      valor: (u) => `${u.nome} ${u.email}`,
      cell: (u) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>{iniciais(u.nome) || <UserRound size={15} />}</span>
          <div>
            <div className={ui.cellStrong}>{u.nome}</div>
            <div className={ui.cellMut}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Cargo',
      largura: LARGURA.media,
      valor: (u) => `${u.cargo ?? ''} ${u.departamento ?? ''}`,
      cell: (u) => (
        <div>
          <div className={ui.cellMut}>{u.cargo || '—'}</div>
          {u.departamento && <div className={ui.cellMut}>{u.departamento}</div>}
        </div>
      ),
    },
    {
      header: 'Perfil',
      largura: LARGURA.status + 30,
      valor: (u) => rotuloPerfil(u.perfil),
      cell: (u) => (
        <span className={`${ui.badge} ${u.perfil === 'Admin' ? ui.badgeInfo : u.perfil === 'Gestor' ? ui.badgeOk : ui.badgeOff}`}>
          {rotuloPerfil(u.perfil)}
        </span>
      ),
    },
    {
      header: 'Acessos',
      largura: LARGURA.curta,
      className: ui.right,
      cell: (u) => (
        <span className={ui.cellMut}>
          {temPoderDeGestor(u.perfil) ? 'Todas' : `${u.permissoes.filter((p) => FUNCIONALIDADES_CONCEDIVEIS.includes(p)).length} de ${totalFuncs}`}
        </span>
      ),
    },
    {
      header: 'Convite',
      largura: LARGURA.media,
      valor: (u) => ROTULO_CONVITE[u.convite ?? ''] ?? '',
      cell: (u) => {
        const c = u.convite ?? ''
        if (!c) return <span className={ui.cellMut}>—</span>
        const quando = c === 'aceito' ? u.conviteAceitoEm : c === 'clicou' ? u.conviteClicadoEm : u.conviteEnviadoEm
        return (
          <div title={c === 'nao-enviado' ? u.conviteErro : undefined}>
            <span className={`${ui.badge} ${c === 'aceito' ? ui.badgeOk : c === 'nao-enviado' || c === 'expirado' ? ui.badgeErr : ui.badgeInfo}`}>{ROTULO_CONVITE[c]}</span>
            {quando && <div className={ui.cellMut}>{dataHora(quando)}</div>}
          </div>
        )
      },
    },
    { header: 'Status', largura: LARGURA.status, valor: (u) => u.status, cell: (u) => <StatusBadge status={u.status} /> },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes + 34,
      className: ui.colActions,
      cell: (u) => (
        <>
        {u.status === 'ativo' && !!u.convite && u.convite !== 'aceito' && (souAdmin || u.perfil !== 'Admin') && (
          <button
            type="button"
            className={ui.iconBtn}
            title="Reenviar convite (link novo; o anterior deixa de valer)"
            disabled={reenviando === u.id}
            onClick={() => void reenviar(u)}
          >
            <Mail />
          </button>
        )}
        <RowActions
          status={u.status}
          onEdit={() => openEdit(u)}
          onSetStatus={(st) => setStatus(u, st)}
          // Suporte é da equipe ELROND: o cliente vê, mas não altera.
          podeEditar={souAdmin || u.perfil !== 'Admin'}
          motivoBloqueio="Usuário de suporte da equipe ELROND"
        />
        </>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Funcionários"
        subtitle="A equipe da empresa e o acesso de cada um ao portal (perfil e permissões por funcionalidade)."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={openNew}>
            <Plus /> Novo funcionário
          </button>
        }
      />

      <CrudList
        id="funcionarios"
        query={query}
        onQuery={setQuery}
        searchPlaceholder="Buscar por nome, e-mail ou cargo..."
        columns={columns}
        rows={filtered}
        getKey={(u) => u.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <UsuarioFormModal
        open={modalOpen}
        initial={editing}
        error={saveError}
        onClose={() => {
          setSaveError(null)
          close()
        }}
        onSave={save}
      />
    </div>
  )
}
