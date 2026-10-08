import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { useModelosProposta } from '@/features/modelosProposta/store'
import { COR_PRINCIPAL_PADRAO, novaPagina, type ModeloProposta } from '@/features/modelosProposta/types'
import { usePropostas } from './store'
import { PropostaPdfView } from './PropostaPdfView'
import s from './proposta-pdf.module.css'

/** Modelo de fallback (proposta sem modelo). */
const MODELO_PADRAO: ModeloProposta = {
  id: '',
  empresaId: '',
  nome: 'Padrão',
  status: 'ativo',
  cor: '#ff6a39',
  corPrincipal: COR_PRINCIPAL_PADRAO,
  rodapeEmpresa: '',
  responsavel: '',
  email: '',
  telefone: '',
  site: '',
  paginas: (['capa', 'composicao', 'proximos'] as const).map(novaPagina),
}

export function PropostaPdfPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { propostas } = usePropostas()
  const { modelos } = useModelosProposta()
  const proposta = propostas.find((p) => p.id === id)

  if (!proposta) {
    return (
      <div className={s.wrap}>
        <div className={s.controls}>
          <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => navigate('/propostas')}>
            <ArrowLeft /> Voltar
          </button>
        </div>
        <div className={s.folha} style={{ minHeight: 200, padding: 40 }}>Proposta não encontrada.</div>
      </div>
    )
  }

  const modelo =
    modelos.find((m) => m.id === proposta.modeloId) ??
    modelos.find((m) => m.empresaId === proposta.itens[0]?.empresaId) ??
    modelos[0] ??
    MODELO_PADRAO

  return (
    <div className={s.wrap}>
      <div className={s.controls}>
        <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => navigate('/propostas')}>
          <ArrowLeft /> Voltar
        </button>
        <div className={s.spacer} />
        <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => window.print()}>
          <Printer /> Imprimir / Salvar PDF
        </button>
      </div>

      <PropostaPdfView modelo={modelo} proposta={proposta} />
    </div>
  )
}
