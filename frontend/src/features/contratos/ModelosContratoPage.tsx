import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, LayoutTemplate, Plus, Receipt, Save, ScrollText } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { listServicos } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { salvarModeloContrato, useContratos, useModelosContrato } from './api'
import { modeloVazio, type ModeloContrato } from './modelos'
import type { CondicoesContrato } from './types'
import s from './form.module.css'

const NOVO = '__novo__'
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const PADRAO: CondicoesContrato = {
  faturarDesde: '', diaFaturamento: 1, referencia: 'mes-anterior', diaVencimento: 10, anteciparFimDeSemana: true, renovacaoAutomatica: true,
  avisoPrevioDias: 60, reajusteIndice: 'IPCA', reajusteMesBase: 1, multaRescisoria: '', carteiraId: '', formaCobranca: 'Boleto com Pix', prazoPagamentoDias: 15,
  agrupamento: 'periodo', fechamento: 'mensal', semNotaFiscal: false, semBoleto: false,
}

/**
 * Modelos de Contrato (Parametrizações): as cláusulas e as condições padrão que o contrato copia ao nascer.
 * O que se cobra (itens, valores, como cada um é cobrado) vem da proposta aprovada, não do modelo.
 */
export function ModelosContratoPage() {
  const qc = useQueryClient()
  const { data: modelosData, isLoading } = useModelosContrato()
  const { data: contratosData } = useContratos()
  const { data: servicos } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })
  const modelos = modelosData ?? []
  const contratos = contratosData?.contratos ?? []

  const [selecionado, setSelecionado] = useState('')
  const [rascunho, setRascunho] = useState<ModeloContrato | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Abre no primeiro modelo assim que a lista chega (ou num em branco, se ainda não há nenhum).
  const atualId = selecionado || modelos[0]?.id || (isLoading ? '' : NOVO)
  const original = modelos.find((m) => m.id === atualId) ?? null
  const [editandoId, setEditandoId] = useState('')
  if (atualId && editandoId !== atualId) {
    setEditandoId(atualId)
    setRascunho(atualId === NOVO ? modeloVazio() : original)
  }
  const tipos = [...new Set(modelos.map((m) => m.tipoOperacao).filter(Boolean))]
  const usados = contratos.filter((c) => c.modeloId === rascunho?.id).length
  const mudou = !!rascunho && (atualId === NOVO || JSON.stringify(rascunho) !== JSON.stringify(original))
  const cond = { ...PADRAO, ...rascunho?.condicoesPadrao }

  const set = (p: Partial<ModeloContrato>) => rascunho && setRascunho({ ...rascunho, ...p })
  const setCond = (p: Partial<CondicoesContrato>) => set({ condicoesPadrao: { ...cond, ...p } })

  const salvar = async () => {
    if (!rascunho || !rascunho.nome.trim()) return
    setSalvando(true)
    try {
      const salvo = await salvarModeloContrato(rascunho)
      await qc.invalidateQueries({ queryKey: ['modelos-contrato'] })
      setSelecionado(salvo.id)
      setEditandoId('')
      void avisar({ titulo: 'Modelo salvo', mensagem: `"${salvo.nome}" já aparece no cadastro de contrato. Os contratos que já existem continuam com as cláusulas e condições que têm.` })
    } catch (err) {
      void avisar({ titulo: 'Não foi possível salvar', mensagem: getErrorMessage(err) })
    } finally {
      setSalvando(false)
    }
  }
  const trocar = async (id: string) => {
    if (mudou && !(await confirmar({ titulo: 'Descartar alterações', mensagem: 'O modelo tem alterações não salvas. Trocar mesmo assim?', confirmar: 'Descartar', perigo: true }))) return
    setSelecionado(id)
    setEditandoId('')
  }
  const duplicar = () => {
    if (!rascunho) return
    setSelecionado(NOVO)
    setEditandoId(NOVO)
    setRascunho({ ...rascunho, id: '', nome: `${rascunho.nome} (cópia)`, campos: [], componentes: [] })
  }

  return (
    <div>
      <PageHeader breadcrumb="Parametrizações" title="Modelos de Contrato" subtitle="As cláusulas e as condições padrão de cada tipo de contrato. O que se cobra vem da proposta aprovada; o modelo só traz o texto e os combinados de sempre." />

      <div className={s.modelosGrade}>
        <div className={s.listaModelos}>
          {modelos.map((m) => (
            <button key={m.id} type="button" className={`${s.cartaoModelo} ${m.id === atualId ? s.modeloOn : ''}`} onClick={() => void trocar(m.id)}>
              <b>{m.nome}{m.status === 'inativo' ? ' (inativo)' : ''}</b>
              <span>{m.tipoOperacao || 'qualquer operação'} · {m.clausulas?.trim() ? 'com cláusulas' : 'sem cláusulas'}</span>
              <span>{contratos.filter((c) => c.modeloId === m.id).length} contrato(s) usando</span>
            </button>
          ))}
          {atualId === NOVO && <div className={`${s.cartaoModelo} ${s.modeloOn}`}><b>{rascunho?.nome || 'Novo modelo'}</b><span>ainda não salvo</span></div>}
          <button type="button" className={s.novoModelo} onClick={() => void trocar(NOVO)}><Plus size={14} /> Novo modelo</button>
        </div>

        {rascunho ? (
          <div>
            <section className={s.secao}>
              <h2 className={s.secTitulo}><LayoutTemplate size={15} /> Modelo</h2>
              <div className={s.grade}>
                <label className={s.campo}>
                  Nome
                  <input id="modelo-nome" value={rascunho.nome} onChange={(e) => set({ nome: e.target.value })} />
                </label>
                <label className={s.campo}>
                  Tipo de operação
                  <input id="modelo-tipo" list="tipos-op" value={rascunho.tipoOperacao} onChange={(e) => set({ tipoOperacao: e.target.value })} placeholder="Armazenagem, Transporte..." />
                  <datalist id="tipos-op">{tipos.map((t) => <option key={t} value={t} />)}</datalist>
                </label>
                <label className={s.campo}>
                  Serviço da nota (padrão)
                  <select value={rascunho.servicoId} onChange={(e) => set({ servicoId: e.target.value })}>
                    <option value="">O da proposta</option>
                    {(servicos ?? []).filter((x) => x.status !== 'inativo').map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                </label>
                <label className={s.campo}>
                  Situação
                  <select value={rascunho.status} onChange={(e) => set({ status: e.target.value as ModeloContrato['status'] })}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo (não aparece em contrato novo)</option>
                  </select>
                </label>
                <label className={`${s.campo} ${s.largo}`}>
                  Descrição
                  <input value={rascunho.descricao} onChange={(e) => set({ descricao: e.target.value })} />
                </label>
              </div>
            </section>

            <section className={s.secao}>
              <h2 className={s.secTitulo}><ScrollText size={15} /> Cláusulas</h2>
              <p className={s.nota}>O texto entra no contrato novo, que pode ajustar o que for daquele cliente.</p>
              <label className={s.campo}>
                <textarea id="modelo-clausulas" rows={12} value={rascunho.clausulas ?? ''} onChange={(e) => set({ clausulas: e.target.value })} placeholder={'1. Do objeto\n2. Da vigência e renovação\n3. Do preço e do reajuste\n...'} aria-label="Cláusulas do modelo" />
              </label>
            </section>

            <section className={s.secao}>
              <h2 className={s.secTitulo}><Receipt size={15} /> Condições padrão</h2>
              <p className={s.nota}>Vêm preenchidas no contrato novo; cada contrato pode mudar.</p>
              <div className={s.grade}>
                <label className={s.campo}>
                  Dia do fechamento
                  <input type="number" min={1} max={28} value={cond.diaFaturamento} onChange={(e) => setCond({ diaFaturamento: Number(e.target.value) })} />
                </label>
                <label className={s.campo}>
                  O que a fatura cobra
                  <select value={cond.referencia} onChange={(e) => setCond({ referencia: e.target.value as CondicoesContrato['referencia'] })}>
                    <option value="mes-anterior">O serviço do mês anterior</option>
                    <option value="mes-atual">O serviço do próprio mês</option>
                  </select>
                </label>
                <label className={s.campo}>
                  Dia do vencimento
                  <input type="number" min={1} max={28} value={cond.diaVencimento} onChange={(e) => setCond({ diaVencimento: Number(e.target.value) })} />
                </label>
                <label className={s.campo}>
                  Documentos por CT-e
                  <select value={cond.agrupamento} onChange={(e) => setCond({ agrupamento: e.target.value as CondicoesContrato['agrupamento'] })}>
                    <option value="periodo">Uma fatura juntando os do período</option>
                    <option value="por-documento">Uma cobrança por CT-e</option>
                  </select>
                </label>
                <label className={s.campo}>
                  Fechamento dos documentos
                  <select value={cond.fechamento} onChange={(e) => setCond({ fechamento: e.target.value as CondicoesContrato['fechamento'] })}>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </label>
                <label className={s.campo}>
                  Vence em (dias, spot e documentos)
                  <input type="number" min={0} value={cond.prazoPagamentoDias} onChange={(e) => setCond({ prazoPagamentoDias: Number(e.target.value) })} />
                </label>
                <div className={`${s.campo} ${s.largo}`}>
                  Documentos do fechamento
                  <div className={s.documentos}>
                    <label className={s.check}><input type="checkbox" checked disabled /> Fatura</label>
                    <label className={s.check}><input type="checkbox" checked={!cond.semNotaFiscal} onChange={(e) => setCond({ semNotaFiscal: !e.target.checked })} /> Nota fiscal (NFS-e)</label>
                    <label className={s.check}><input type="checkbox" checked={!cond.semBoleto} onChange={(e) => setCond({ semBoleto: !e.target.checked, formaCobranca: e.target.checked ? 'Boleto com Pix' : 'Pix' })} /> Boleto</label>
                  </div>
                </div>
                <label className={s.check}>
                  <input type="checkbox" checked={cond.renovacaoAutomatica} onChange={(e) => setCond({ renovacaoAutomatica: e.target.checked })} /> Renova automaticamente
                </label>
                <label className={s.campo}>
                  Aviso prévio (dias)
                  <input type="number" min={0} value={cond.avisoPrevioDias} onChange={(e) => setCond({ avisoPrevioDias: Number(e.target.value) })} />
                </label>
                <label className={s.campo}>
                  Reajuste (aviso)
                  <select value={cond.reajusteIndice} onChange={(e) => setCond({ reajusteIndice: e.target.value as CondicoesContrato['reajusteIndice'] })}>
                    {['IPCA', 'IGP-M', 'INPC', 'Negociado'].map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
                <label className={s.campo}>
                  Mês-base do reajuste
                  <select value={cond.reajusteMesBase} onChange={(e) => setCond({ reajusteMesBase: Number(e.target.value) })}>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </label>
                <label className={`${s.campo} ${s.largo}`}>
                  Multa rescisória
                  <input value={cond.multaRescisoria} onChange={(e) => setCond({ multaRescisoria: e.target.value })} placeholder="Ex.: 3 mensalidades, proporcional ao tempo restante" />
                </label>
              </div>
              <div className={s.rodape} style={{ marginTop: 14 }}>
                <span className={s.mut} style={{ marginRight: 'auto', alignSelf: 'center' }}>{rascunho.id ? `${usados} contrato(s) usando este modelo` : 'Modelo novo, ainda não salvo'}</span>
                {rascunho.id && <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={duplicar}><Copy /> Duplicar</button>}
                <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!mudou || !rascunho.nome.trim() || salvando} onClick={() => void salvar()}><Save /> {salvando ? 'Salvando...' : 'Salvar modelo'}</button>
              </div>
            </section>
          </div>
        ) : (
          <div className={s.carregando}>Carregando...</div>
        )}
      </div>
    </div>
  )
}
