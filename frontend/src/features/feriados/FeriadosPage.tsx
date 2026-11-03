import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarOff, MapPin, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/features/common/PageHeader'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { confirmar } from '@/features/common/dialogo/dialogo'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { feriadoValePara, feriadosNacionais } from '@/features/financeiro/diasUteis'
import { excluirFeriado, salvarFeriado, useFeriados, type Feriado } from './api'
import s from './feriados.module.css'

const dataBR = (iso: string, todoAno: boolean) => (iso ? (todoAno ? iso.slice(5).split('-').reverse().join('/') : iso.split('-').reverse().join('/')) : '—')
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const diaDaSemana = (iso: string) => SEMANA[new Date(`${iso}T00:00:00Z`).getUTCDay()]
const vazio = (): Feriado => ({ id: '', data: '', nome: '', todoAno: true, abrangencia: 'cidade', uf: '', cidade: '', status: 'ativo' })
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
const ondeVale = (f: Feriado) => (f.abrangencia === 'cidade' ? f.cidade : f.abrangencia === 'uf' ? `Estado ${f.uf}` : 'Todas as empresas')

/**
 * Feriados que não são nacionais (estaduais, municipais, pontos facultativos da empresa). Somam aos
 * nacionais no dia útil dos vencimentos: antecipar ou postergar e o "atrasado" só depois do dia útil.
 */
export function FeriadosPage() {
  const qc = useQueryClient()
  const { data } = useFeriados()
  const [novo, setNovo] = useState<Feriado>(vazio())
  const [erro, setErro] = useState('')
  const { data: empresas } = useEmpresasQuery()
  const ano = new Date().getFullYear()
  // Quais empresas o feriado pega (pela cidade do cadastro da empresa).
  const empresasDe = (f: Feriado) => (empresas ?? []).filter((e) => e.status !== 'inativo' && feriadoValePara(f, e.endereco)).map((e) => e.nome)
  const lista = (data ?? []).filter((f) => f.status !== 'inativo').sort((a, b) => a.data.slice(5).localeCompare(b.data.slice(5)))

  const recarregar = () => qc.invalidateQueries({ queryKey: ['feriados'] })
  const tentar = async (acao: () => Promise<unknown>) => {
    try {
      await acao()
      setErro('')
      await recarregar()
      return true
    } catch (e) {
      setErro(getErrorMessage(e))
      return false
    }
  }
  const incluir = async () => {
    if (!novo.data || !novo.nome.trim()) return setErro('Informe a data e o nome do feriado.')
    if (novo.abrangencia === 'cidade' && !novo.cidade.includes(' - ')) return setErro('Escolha a cidade do feriado municipal.')
    if (novo.abrangencia === 'uf' && !novo.uf) return setErro('Escolha o estado do feriado estadual.')
    if (await tentar(() => salvarFeriado({ ...novo, nome: novo.nome.trim() }))) setNovo(vazio())
  }
  const remover = async (f: Feriado) => {
    if (!(await confirmar({ titulo: 'Tirar o feriado?', mensagem: `"${f.nome}" deixa de contar como dia não útil nos vencimentos novos.`, confirmar: 'Tirar', perigo: true }))) return
    await tentar(() => excluirFeriado(f.id))
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Feriados"
        subtitle="Os nacionais e bancários o sistema já conhece. Aqui entram os estaduais e municipais: vencimento nesses dias antecipa ou posterga, conforme a regra do cliente, do fornecedor ou da despesa fixa. O municipal vale só para as empresas daquela cidade (a cidade do cadastro da empresa)."
      />
      <div className={s.colunas}>
        <section className={`${ui.card} ${s.painel}`}>
          <div className={s.titulo}><CalendarOff size={15} /> Estaduais e municipais</div>
          <div className={s.novo}>
            <input id="feriado-data" type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} aria-label="Data do feriado" />
            <input id="feriado-nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Ex.: Aniversário de Santos" aria-label="Nome do feriado" />
            <label className={s.todoAno}><input type="checkbox" checked={novo.todoAno} onChange={(e) => setNovo({ ...novo, todoAno: e.target.checked })} /> todo ano</label>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void incluir()}><Plus /> Incluir</button>
          </div>
          <div className={s.vale}>
            <span className={s.valeRotulo}><MapPin size={13} /> Vale para</span>
            <select id="feriado-abrangencia" value={novo.abrangencia} onChange={(e) => setNovo({ ...novo, abrangencia: e.target.value as Feriado['abrangencia'] })} aria-label="Onde o feriado vale">
              <option value="cidade">Cidade (municipal)</option>
              <option value="uf">Estado (estadual)</option>
              <option value="todas">Todas as empresas</option>
            </select>
            {novo.abrangencia === 'cidade' && (
              <div className={s.valeCampo}><CidadeAutocomplete value={novo.cidade} onChange={(c) => setNovo({ ...novo, cidade: c })} placeholder="Ex.: Santos - SP" /></div>
            )}
            {novo.abrangencia === 'uf' && (
              <select id="feriado-uf" value={novo.uf} onChange={(e) => setNovo({ ...novo, uf: e.target.value })} aria-label="Estado">
                <option value="">Estado...</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
            {(novo.abrangencia === 'cidade' ? novo.cidade.includes(' - ') : novo.abrangencia === 'uf' && !!novo.uf) && (
              <small className={ui.cellMut}>
                {empresasDe(novo).length ? `Pega: ${empresasDe(novo).join(', ')}` : 'Nenhuma empresa cadastrada nessa ' + (novo.abrangencia === 'uf' ? 'UF' : 'cidade') + ' por enquanto.'}
              </small>
            )}
          </div>
          {erro && <p className={ui.errMsg}>{erro}</p>}
          {lista.length === 0 ? (
            <p className={ui.cellMut}>Nenhum feriado estadual ou municipal cadastrado.</p>
          ) : (
            <table className={ui.table}>
              <thead><tr><th>Data</th><th>Feriado</th><th>Vale para</th><th>Repete</th><th /></tr></thead>
              <tbody>
                {lista.map((f) => (
                  <tr key={f.id}>
                    <td className={s.data}>{dataBR(f.data, f.todoAno)}</td>
                    <td>{f.nome}</td>
                    <td>
                      {ondeVale(f)}
                      {f.abrangencia !== 'todas' && <small className={s.pega}>{empresasDe(f).join(', ') || 'nenhuma empresa nessa ' + (f.abrangencia === 'uf' ? 'UF' : 'cidade')}</small>}
                    </td>
                    <td><label className={s.todoAno}><input type="checkbox" checked={f.todoAno} onChange={() => void tentar(() => salvarFeriado({ ...f, todoAno: !f.todoAno }))} /> todo ano</label></td>
                    <td className={ui.right}><button type="button" className={ui.iconBtn} title="Tirar" onClick={() => void remover(f)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className={`${ui.card} ${s.painel}`}>
          <div className={s.titulo}>Nacionais e bancários de {ano} <span className={ui.cellMut}>automáticos</span></div>
          <ul className={s.nacionais}>
            {[...feriadosNacionais(ano)].sort().map((d) => (
              <li key={d}><span className={s.data}>{dataBR(d, false)}</span> <span className={ui.cellMut}>{diaDaSemana(d)}</span></li>
            ))}
          </ul>
          <p className={ui.cellMut}>Inclui Carnaval (segunda e terça), Sexta-feira Santa e Corpus Christi, dias sem expediente bancário.</p>
        </section>
      </div>
    </div>
  )
}
