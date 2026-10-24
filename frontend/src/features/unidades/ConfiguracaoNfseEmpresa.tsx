import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { Field } from '@/features/common/Field'
import ui from '@/features/common/ui.module.css'
import { avisar } from '@/features/common/dialogo/dialogo'
import { ApiError, apiFetch, getErrorMessage } from '@/lib/api'

interface Config {
  provedor: 'simulador' | 'nfeio'
  idEmpresaProvedor: string
  ativa: boolean
}

const chave = (empresaId: string) => ['nfse-configuracao', empresaId]
const ler = async (empresaId: string): Promise<Config | null> => {
  try {
    return await apiFetch<Config>(`/fiscal/nfse/empresas/${encodeURIComponent(empresaId)}/configuracao`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

/**
 * Emissão de NFS-e da empresa (implantação): o emissor (o simulador, para testar o fluxo inteiro sem
 * prefeitura, ou a NFE.io) e o identificador da empresa lá. Grava na hora, separado do cadastro da empresa.
 */
export function ConfiguracaoNfseEmpresa({ empresaId }: { empresaId: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: chave(empresaId), queryFn: () => ler(empresaId), enabled: !!empresaId })
  const [d, setD] = useState<Config>({ provedor: 'simulador', idEmpresaProvedor: '', ativa: false })
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setD(data)
  }, [data])

  if (!empresaId) return <p className={ui.cellMut}>Salve a empresa antes de configurar a emissão de NFS-e.</p>

  const salvar = async () => {
    setSalvando(true)
    try {
      await apiFetch(`/fiscal/nfse/empresas/${encodeURIComponent(empresaId)}/configuracao`, { method: 'PUT', body: JSON.stringify(d) })
      await qc.invalidateQueries({ queryKey: chave(empresaId) })
      void avisar({ titulo: 'Emissão de NFS-e salva', mensagem: d.ativa ? `A empresa emite pela ${d.provedor === 'nfeio' ? 'NFE.io' : 'simulação (sem valor fiscal)'}.` : 'A emissão está desligada para esta empresa.' })
    } catch (e) {
      void avisar({ titulo: 'Não foi possível salvar', mensagem: getErrorMessage(e) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={ui.grid}>
      <Field className={ui.col2} label="Emissor" hint="Simulação: testa o fluxo inteiro (nota, PDF, situação) sem enviar à prefeitura e sem valor fiscal. NFE.io: emissão real, depois de a empresa ser cadastrada lá.">
        <select value={d.provedor} onChange={(e) => setD({ ...d, provedor: e.target.value as Config['provedor'] })} disabled={isLoading}>
          <option value="simulador">Simulação (sem valor fiscal)</option>
          <option value="nfeio">NFE.io</option>
        </select>
      </Field>
      <Field className={ui.col2} label="Empresa na NFE.io (company_id)" hint="O identificador que a NFE.io dá ao cadastrar a empresa (certificado e inscrição municipal ficam lá).">
        <input value={d.idEmpresaProvedor} onChange={(e) => setD({ ...d, idEmpresaProvedor: e.target.value.trim() })} disabled={d.provedor !== 'nfeio'} placeholder={d.provedor === 'nfeio' ? 'Ex.: 6a1b2c3d4e...' : 'Só para a NFE.io'} />
      </Field>
      <div className={ui.col2}>
        <label className={ui.checkItem}>
          <input type="checkbox" checked={d.ativa} onChange={(e) => setD({ ...d, ativa: e.target.checked })} /> Emissão ligada para esta empresa
        </label>
      </div>
      <div className={ui.col2} style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => void salvar()} disabled={salvando}>
          <Save /> {salvando ? 'Salvando...' : 'Salvar a emissão de NFS-e'}
        </button>
      </div>
    </div>
  )
}
