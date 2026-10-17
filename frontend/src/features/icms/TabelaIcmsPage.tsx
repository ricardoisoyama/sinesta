import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Undo2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { TabelaPorUf, type TaxaUf } from '@/features/common/TabelaPorUf'
import { avisar } from '@/features/common/dialogo/dialogo'
import { getErrorMessage } from '@/lib/api'
import { listAliquotasIcms, salvarAliquotasIcms, type AliquotaIcms } from './api'

const CHAVE = ['aliquotas-icms']
const chaveDe = (t: { ufOrigem: string; ufDestino: string }) => `${t.ufOrigem}-${t.ufDestino}`

/**
 * Tabela de ICMS do transporte por UF de origem × destino. Vem pré-cadastrada (tbdICMS da ESL);
 * o campo ICMS dos Dados da Operação busca aqui. Zerar = isento. Grava só o que mudou.
 */
export function TabelaIcmsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: CHAVE, queryFn: listAliquotasIcms })
  // Rascunho por cima do que veio do servidor: rota → alíquota editada.
  const [editadas, setEditadas] = useState<Record<string, number>>({})
  const [salvando, setSalvando] = useState(false)

  const original = new Map((data ?? []).map((a) => [chaveDe(a), a]))
  const linhas: TaxaUf[] = [...original.values()].map((a) => ({ ufOrigem: a.ufOrigem, ufDestino: a.ufDestino, valor: editadas[a.id] ?? a.aliquota }))
  for (const [k, v] of Object.entries(editadas)) {
    if (original.has(k)) continue
    const [ufOrigem, ufDestino] = k.split('-')
    linhas.push({ ufOrigem, ufDestino, valor: v })
  }
  const mudadas = Object.entries(editadas).filter(([k, v]) => original.get(k)?.aliquota !== v)

  const mudar = (novas: TaxaUf[]) => {
    const e: Record<string, number> = {}
    for (const t of novas) {
      const k = chaveDe(t)
      if (original.get(k)?.aliquota !== t.valor) e[k] = t.valor
    }
    setEditadas(e)
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      const enviar = mudadas.map(([k, aliquota]) => {
        const [ufOrigem, ufDestino] = k.split('-')
        return { ufOrigem, ufDestino, aliquota, fundamentacao: original.get(k)?.fundamentacao ?? '' }
      })
      const novas = await salvarAliquotasIcms(enviar)
      qc.setQueryData<AliquotaIcms[]>(CHAVE, novas)
      setEditadas({})
    } catch (err) {
      void avisar({ titulo: 'Não foi possível salvar', mensagem: getErrorMessage(err) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Parametrizações"
        title="Tabela de ICMS"
        subtitle="Alíquota de ICMS do transporte por UF de origem × destino. O campo ICMS dos Dados da Operação preenche por aqui; só vale para empresa contribuinte (fora do Simples Nacional)."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {mudadas.length > 0 && (
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setEditadas({})} disabled={salvando}>
                <Undo2 /> Descartar
              </button>
            )}
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar} disabled={salvando || mudadas.length === 0}>
              <Save /> {salvando ? 'Salvando...' : mudadas.length ? `Salvar ${mudadas.length} ${mudadas.length === 1 ? 'alteração' : 'alterações'}` : 'Salvo'}
            </button>
          </div>
        }
      />
      <div className={ui.card} style={{ padding: 18 }}>
        {isLoading ? (
          <span className={ui.cellMut}>Carregando...</span>
        ) : (
          <TabelaPorUf linhas={linhas} onChange={mudar} coluna="Alíquota %" nomeArquivo="tabela-icms.xlsx" zeroRemove={false} />
        )}
      </div>
    </div>
  )
}
