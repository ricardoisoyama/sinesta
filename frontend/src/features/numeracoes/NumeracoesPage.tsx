import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Hash, Save } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { avisar } from '@/features/common/dialogo/dialogo'
import { apiFetch, getErrorMessage } from '@/lib/api'
import s from './numeracoes.module.css'

interface Numeracao {
  empresaId: string
  empresaNome: string
  tipo: string
  tipoNome: string
  serie: string
  ultimo: number
  proximo: number
  alteradoEm: string
  alteradoPor: string
}

const CHAVE = ['numeracoes']
const listar = () => apiFetch<Numeracao[]>('/numeracoes')
const salvar = (n: Numeracao, serie: string, ultimo: number) =>
  apiFetch<Numeracao>(`/numeracoes/${encodeURIComponent(n.empresaId)}/${n.tipo}`, { method: 'PUT', body: JSON.stringify({ serie, ultimo }) })

/** O que cada documento usa hoje (para quem implanta saber de onde parte). */
const USO: Record<string, string> = {
  fatura: 'Usada na fatura ao cliente. Durante a convivência, o próximo número é o maior entre este e o último da SIIMP.',
  nfe: 'Para quando o ELROND emitir NF-e (continue o número que está na SEFAZ).',
  nfse: 'Para quando o ELROND emitir NFS-e.',
  rps: 'RPS da NFS-e (alguns municípios numeram pelo RPS).',
  cte: 'Para quando o ELROND emitir CT-e (continue o número que está na SEFAZ).',
  mdfe: 'Para quando o ELROND emitir MDF-e.',
}
const quando = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')

/**
 * Administrativo › Numerações (a equipe ELROND, na implantação): por empresa (CNPJ) e documento, a série
 * e o último número já usado. O sistema pega o seguinte sozinho; o número só avança (não volta para trás).
 */
export function NumeracoesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: CHAVE, queryFn: listar })
  // Edição por linha: chave "empresa:tipo" → valores digitados.
  const [edicao, setEdicao] = useState<Record<string, { serie: string; ultimo: string }>>({})
  const [gravando, setGravando] = useState<string | null>(null)

  const empresas = [...new Map((data ?? []).map((n) => [n.empresaId, n.empresaNome])).entries()]
  const chave = (n: Numeracao) => `${n.empresaId}:${n.tipo}`
  const valor = (n: Numeracao) => edicao[chave(n)] ?? { serie: n.serie, ultimo: String(n.ultimo) }
  const mudou = (n: Numeracao) => {
    const v = valor(n)
    return v.serie !== n.serie || Number(v.ultimo) !== n.ultimo
  }

  const gravar = async (n: Numeracao) => {
    const v = valor(n)
    const ultimo = Math.trunc(Number(v.ultimo))
    if (!Number.isFinite(ultimo) || ultimo < 0) return void avisar({ titulo: 'Número inválido', mensagem: 'Informe o último número já usado (0 se nenhum).' })
    setGravando(chave(n))
    try {
      await salvar(n, v.serie, ultimo)
      setEdicao(({ [chave(n)]: _, ...resto }) => resto)
      await qc.invalidateQueries({ queryKey: CHAVE })
    } catch (err) {
      void avisar({ titulo: 'Não foi possível salvar', mensagem: getErrorMessage(err) })
    } finally {
      setGravando(null)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Administrativo"
        title="Numerações"
        subtitle="De onde parte cada sequência na implantação: por empresa (CNPJ) e documento, a série e o último número já usado. O sistema pega o seguinte sozinho, e o número só avança."
      />
      {isLoading && <p className={ui.cellMut}>Carregando...</p>}
      {empresas.map(([empresaId, nome]) => (
        <section key={empresaId} className={s.empresa}>
          <h3 className={s.titulo}><Hash size={15} /> {nome}</h3>
          <div className={s.tabela} role="table" aria-label={`Numerações de ${nome}`}>
            <div className={`${s.linha} ${s.cabecalho}`} role="row">
              <span role="columnheader">Documento</span>
              <span role="columnheader">Série</span>
              <span role="columnheader">Último usado</span>
              <span role="columnheader">Próximo</span>
              <span role="columnheader">Alterado</span>
              <span role="columnheader" />
            </div>
            {(data ?? []).filter((n) => n.empresaId === empresaId).map((n) => {
              const v = valor(n)
              const id = chave(n)
              return (
                <div key={id} className={s.linha} role="row">
                  <span role="cell" className={s.doc}>
                    <b>{n.tipoNome}</b>
                    <small>{USO[n.tipo]}</small>
                  </span>
                  <span role="cell">
                    <input id={`serie-${id}`} aria-label={`Série de ${n.tipoNome}`} value={v.serie} maxLength={10} onChange={(e) => setEdicao((x) => ({ ...x, [id]: { ...v, serie: e.target.value } }))} placeholder="—" />
                  </span>
                  <span role="cell">
                    <input id={`ultimo-${id}`} aria-label={`Último número de ${n.tipoNome}`} inputMode="numeric" value={v.ultimo} onChange={(e) => setEdicao((x) => ({ ...x, [id]: { ...v, ultimo: e.target.value.replace(/\D/g, '') } }))} />
                  </span>
                  <span role="cell" className={s.proximo}>{(Number(v.ultimo) || 0) + 1}</span>
                  <span role="cell" className={ui.cellMut}>{n.alteradoEm ? `${quando(n.alteradoEm)} · ${n.alteradoPor}` : 'nunca'}</span>
                  <span role="cell">
                    <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${s.salvar}`} disabled={!mudou(n) || gravando === id} onClick={() => void gravar(n)}>
                      <Save /> {gravando === id ? 'Salvando...' : 'Salvar'}
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
