import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Filter, SquareKanban, EyeOff } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { RowActions } from '@/features/common/RowActions'
import { StatusBadge } from '@/features/common/StatusBadge'
import { getErrorMessage } from '@/lib/api'
import { useCrm } from './store'
import { FunilFormModal } from './FunilFormModal'
import type { Funil } from './types'
import s from './crm.module.css'

export function FunisPage() {
  const { todosFunis, oportunidades, salvarFunil, inativarFunil, reativarFunil } = useCrm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Funil | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarInativos, setMostrarInativos] = useState(false)

  const lista = mostrarInativos ? todosFunis : todosFunis.filter((f) => f.status !== 'inativo')
  const inativos = todosFunis.length - todosFunis.filter((f) => f.status !== 'inativo').length
  const qtdeOps = (funilId: string) => oportunidades.filter((o) => o.funilId === funilId).length

  const abrirNovo = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const abrirEdicao = (f: Funil) => {
    setEditing(f)
    setModalOpen(true)
  }
  const salvar = async (f: Funil) => {
    setErro(null)
    setSalvando(true)
    try {
      await salvarFunil(f)
    } catch (err) {
      setErro(getErrorMessage(err))
      return
    } finally {
      setSalvando(false)
    }
    setModalOpen(false)
    setEditing(null)
  }
  // Funil nunca é apagado: inativar tira do CRM e guarda o histórico (quem/quando).
  const mudarStatus = async (f: Funil, status: 'ativo' | 'inativo') => {
    try {
      if (status === 'inativo') {
        const r = await inativarFunil(f.id)
        if (!r.ok && r.motivo) window.alert(r.motivo)
      } else await reativarFunil(f.id)
    } catch (err) {
      window.alert(getErrorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Funis do CRM"
        subtitle="Parametrize os funis e as etapas que viram as colunas do kanban."
        action={
          <div className={s.acoes}>
            <Link to="/crm" className={`${ui.btn} ${ui.btnGhost}`}>
              <SquareKanban /> Abrir o CRM
            </Link>
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={abrirNovo}>
              <Plus /> Novo funil
            </button>
          </div>
        }
      />

      <div className={s.funisCard}>
        {inativos > 0 && (
          <div className={ui.toolbar}>
            <label className={`${ui.chip} ${mostrarInativos ? ui.chipOn : ''}`} title="Funis inativos ficam escondidos por padrão">
              <input type="checkbox" className={ui.chipCheck} checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
              <EyeOff /> Mostrar inativos ({inativos})
            </label>
          </div>
        )}
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Funil</th>
              <th>Etapas</th>
              <th className={ui.right}>Oportunidades</th>
              <th>Status</th>
              <th className={ui.colActions}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id}>
                <td>
                  <div className={ui.rowName}>
                    <span className={ui.avatarSm}>
                      <Filter size={15} />
                    </span>
                    <span className={ui.cellStrong}>{f.nome}</span>
                  </div>
                </td>
                <td>
                  <div className={s.etapasResumo}>
                    {f.etapas.map((e) => (
                      <span key={e.id} className={s.etapaPill} title={e.nome}>
                        <span className={s.dot} style={{ background: e.cor }} />
                        {e.nome}
                      </span>
                    ))}
                  </div>
                  <div className={ui.cellMut} style={{ marginTop: 4 }}>
                    Temperatura: {f.horasAlerta > 0 ? `${f.horasAlerta}h` : 'desligada'}
                    {f.camposCustomizados.length > 0 && ` · ${f.camposCustomizados.length} campo(s) customizado(s)`}
                  </div>
                </td>
                <td className={`${ui.right} ${ui.cellMut}`}>{qtdeOps(f.id)}</td>
                <td><StatusBadge status={f.status} /></td>
                <td className={ui.colActions}>
                  <RowActions status={f.status} onEdit={() => abrirEdicao(f)} onSetStatus={(st) => mudarStatus(f, st)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FunilFormModal
        open={modalOpen}
        initial={editing}
        busy={salvando}
        error={erro}
        onClose={() => {
          setErro(null)
          setModalOpen(false)
          setEditing(null)
        }}
        onSave={salvar}
      />
    </div>
  )
}
