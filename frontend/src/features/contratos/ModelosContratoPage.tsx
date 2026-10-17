import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, LayoutTemplate, ListChecks, Plus, Receipt, Save, Trash2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { listServicos } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { referencias } from '@/lib/formula'
import { salvarModeloContrato, useContratos, useModelosContrato } from './api'
import { AJUDA_REGRA, apelidoDe, CAMPOS_NUMERICOS, modeloVazio, ROTULO_REGRA, ROTULO_TIPO_CAMPO, type CampoModelo, type ComponenteModelo, type ModeloContrato, type TipoCampo } from './modelos'
import type { RegraComponente } from './types'
import s from './form.module.css'

const CADASTROS = ['Veículos', 'Funcionários', 'Fornecedores', 'Serviços']
const NOVO = '__novo__'

/**
 * Modelos de Contrato (Parametrizações): o cliente monta os modelos do negócio dele.
 * Campos (características, com apelido) + componentes de cobrança (o que entra na fatura e a regra).
 * Mesma ideia da Ficha Técnica e dos Dados da Operação.
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

  const set = (p: Partial<ModeloContrato>) => rascunho && setRascunho({ ...rascunho, ...p })
  const setCampo = (id: string, p: Partial<CampoModelo>) => rascunho && set({ campos: rascunho.campos.map((c) => (c.id === id ? { ...c, ...p } : c)) })
  const setComp = (id: string, p: Partial<ComponenteModelo>) => rascunho && set({ componentes: rascunho.componentes.map((c) => (c.id === id ? { ...c, ...p } : c)) })

  // Fórmulas só podem usar apelidos que existem: componentes fixos, outras fórmulas, campos numéricos e "subtotal".
  const conhecidos = new Set<string>(['subtotal'])
  rascunho?.componentes.filter((c) => c.regra === 'fixo' || c.regra === 'formula').forEach((c) => conhecidos.add(c.apelido))
  rascunho?.campos.filter((c) => CAMPOS_NUMERICOS.includes(c.tipo)).forEach((c) => conhecidos.add(c.apelido))
  const erroFormula = (c: ComponenteModelo) => {
    if (c.regra !== 'formula') return ''
    if (!c.formula.trim()) return 'Escreva a fórmula'
    const fora = referencias(c.formula).find((r) => !conhecidos.has(r))
    return fora ? `Apelido desconhecido: ${fora}` : ''
  }
  const apelidosRepetidos = (() => {
    if (!rascunho) return new Set<string>()
    const todos = [...rascunho.campos.map((c) => c.apelido), ...rascunho.componentes.map((c) => c.apelido)]
    return new Set(todos.filter((a, i) => todos.indexOf(a) !== i))
  })()
  const temErro = !!rascunho && (rascunho.componentes.some((c) => erroFormula(c)) || apelidosRepetidos.size > 0 || !rascunho.nome.trim())

  const salvar = async () => {
    if (!rascunho || temErro) return
    setSalvando(true)
    try {
      const salvo = await salvarModeloContrato(rascunho)
      await qc.invalidateQueries({ queryKey: ['modelos-contrato'] })
      setSelecionado(salvo.id)
      setEditandoId('')
      void avisar({ titulo: 'Modelo salvo', mensagem: `"${salvo.nome}" já aparece no cadastro de contrato. Contratos existentes continuam com o que têm; campos novos aparecem vazios na pasta.` })
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
    setRascunho({
      ...rascunho,
      id: '',
      nome: `${rascunho.nome} (cópia)`,
      campos: rascunho.campos.map((c) => ({ ...c, id: crypto.randomUUID() })),
      componentes: rascunho.componentes.map((c) => ({ ...c, id: crypto.randomUUID() })),
    })
  }

  return (
    <div>
      <PageHeader breadcrumb="Parametrizações" title="Modelos de Contrato" subtitle="Cada negócio monta os seus: os campos do contrato (com apelido) e o que entra na fatura, com a regra de cada componente." />

      <div className={s.modelosGrade}>
        <div className={s.listaModelos}>
          {modelos.map((m) => (
            <button key={m.id} type="button" className={`${s.cartaoModelo} ${m.id === atualId ? s.modeloOn : ''}`} onClick={() => void trocar(m.id)}>
              <b>{m.nome}{m.status === 'inativo' ? ' (inativo)' : ''}</b>
              <span>{m.tipoOperacao || 'sem tipo de operação'} · {m.campos.length} campo(s) · {m.componentes.length} componente(s)</span>
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
                  <input value={rascunho.nome} onChange={(e) => set({ nome: e.target.value })} />
                </label>
                <label className={s.campo}>
                  Tipo de operação
                  <input list="tipos-op" value={rascunho.tipoOperacao} onChange={(e) => set({ tipoOperacao: e.target.value })} placeholder="Terceirização, Transporte, Tecnologia..." />
                  <datalist id="tipos-op">{tipos.map((t) => <option key={t} value={t} />)}</datalist>
                </label>
                <label className={s.campo}>
                  Serviço da nota (padrão)
                  <select value={rascunho.servicoId} onChange={(e) => set({ servicoId: e.target.value })}>
                    <option value="">Escolher no contrato</option>
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
              <div className={s.rodape} style={{ marginTop: 14 }}>
                <span className={s.mut} style={{ marginRight: 'auto', alignSelf: 'center' }}>{rascunho.id ? `${usados} contrato(s) usando este modelo` : 'Modelo novo, ainda não salvo'}</span>
                {rascunho.id && <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={duplicar}><Copy /> Duplicar</button>}
                <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!mudou || temErro || salvando} onClick={() => void salvar()}><Save /> {salvando ? 'Salvando...' : 'Salvar modelo'}</button>
              </div>
            </section>

            <section className={s.secao}>
              <h2 className={s.secTitulo}><ListChecks size={15} /> Campos do contrato (características)</h2>
              <p className={s.nota}>Aparecem no cadastro e na pasta. O apelido é o nome usado nas fórmulas (só letras, números e _).</p>
              <div className={ui.tableScroll}>
                <table className={`${ui.table} ${s.tabelaEdit}`}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Apelido</th>
                      <th>Tipo</th>
                      <th>Opções</th>
                      <th>Obrigatório</th>
                      <th>Ajuda</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rascunho.campos.map((c) => (
                      <tr key={c.id}>
                        <td><input value={c.nome} onChange={(e) => setCampo(c.id, { nome: e.target.value, apelido: c.apelido === apelidoDe(c.nome) || !c.apelido ? apelidoDe(e.target.value) : c.apelido })} /></td>
                        <td>
                          <input className={s.apelidoInput} value={c.apelido} onChange={(e) => setCampo(c.id, { apelido: apelidoDe(e.target.value) })} />
                          {apelidosRepetidos.has(c.apelido) && <div className={s.erroLinha}>Apelido repetido</div>}
                        </td>
                        <td>
                          <select value={c.tipo} onChange={(e) => setCampo(c.id, { tipo: e.target.value as TipoCampo, opcoes: e.target.value === 'cadastro' ? [CADASTROS[0]] : c.opcoes })}>
                            {(Object.keys(ROTULO_TIPO_CAMPO) as TipoCampo[]).map((t) => <option key={t} value={t}>{ROTULO_TIPO_CAMPO[t]}</option>)}
                          </select>
                        </td>
                        <td>
                          {c.tipo === 'lista' ? (
                            <input value={c.opcoes.join(', ')} onChange={(e) => setCampo(c.id, { opcoes: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="separadas por vírgula" />
                          ) : c.tipo === 'cadastro' ? (
                            <select value={c.opcoes[0] ?? ''} onChange={(e) => setCampo(c.id, { opcoes: [e.target.value] })}>
                              {CADASTROS.map((x) => <option key={x} value={x}>{x}</option>)}
                            </select>
                          ) : (
                            <span className={s.mut}>—</span>
                          )}
                        </td>
                        <td><input type="checkbox" checked={c.obrigatorio} onChange={(e) => setCampo(c.id, { obrigatorio: e.target.checked })} style={{ width: 16 }} /></td>
                        <td><input value={c.ajuda} onChange={(e) => setCampo(c.id, { ajuda: e.target.value })} placeholder="dica no cadastro" /></td>
                        <td><button type="button" className={ui.iconBtn} title="Tirar o campo" onClick={() => set({ campos: rascunho.campos.filter((x) => x.id !== c.id) })}><Trash2 /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnLinha}`} onClick={() => set({ campos: [...rascunho.campos, { id: crypto.randomUUID(), apelido: `campo_${rascunho.campos.length + 1}`, nome: '', tipo: 'texto', opcoes: [], obrigatorio: false, ajuda: '' }] })}>
                <Plus /> Incluir campo
              </button>
            </section>

            <section className={s.secao}>
              <h2 className={s.secTitulo}><Receipt size={15} /> Componentes de cobrança</h2>
              <p className={s.nota}>O que entra na fatura e como se calcula. "Opcional" = cada contrato liga ou desliga.</p>
              <div className={ui.tableScroll}>
                <table className={`${ui.table} ${s.tabelaEdit}`}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Apelido</th>
                      <th>Regra</th>
                      <th>Cálculo</th>
                      <th>Opcional</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rascunho.componentes.map((c) => (
                      <tr key={c.id}>
                        <td><input value={c.nome} onChange={(e) => setComp(c.id, { nome: e.target.value, apelido: c.apelido === apelidoDe(c.nome) || !c.apelido ? apelidoDe(e.target.value) : c.apelido })} /></td>
                        <td>
                          <input className={s.apelidoInput} value={c.apelido} onChange={(e) => setComp(c.id, { apelido: apelidoDe(e.target.value) })} />
                          {apelidosRepetidos.has(c.apelido) && <div className={s.erroLinha}>Apelido repetido</div>}
                        </td>
                        <td style={{ minWidth: 210 }}>
                          <select value={c.regra} onChange={(e) => setComp(c.id, { regra: e.target.value as RegraComponente })}>
                            {(Object.keys(ROTULO_REGRA) as RegraComponente[]).map((r) => <option key={r} value={r}>{ROTULO_REGRA[r]}</option>)}
                          </select>
                          <div className={s.ajudaRegra}>{AJUDA_REGRA[c.regra]}</div>
                        </td>
                        <td style={{ minWidth: 200 }}>
                          {c.regra === 'formula' ? (
                            <>
                              <input className={s.apelidoInput} value={c.formula} onChange={(e) => setComp(c.id, { formula: e.target.value })} placeholder="posto * 20%" />
                              {erroFormula(c) && <div className={s.erroLinha}>{erroFormula(c)}</div>}
                            </>
                          ) : c.regra === 'documento' ? (
                            <select value={c.documento} onChange={(e) => setComp(c.id, { documento: e.target.value })}>
                              {['CT-e', 'NF-e', 'OS', 'Medição'].map((x) => <option key={x} value={x}>{x}</option>)}
                            </select>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input value={c.unidade} onChange={(e) => setComp(c.id, { unidade: e.target.value })} placeholder="unidade" style={{ width: 90 }} />
                              <input type="number" step="0.01" value={c.valorPadrao} onChange={(e) => setComp(c.id, { valorPadrao: Number(e.target.value) })} title="Preço padrão (o contrato pode mudar)" />
                            </div>
                          )}
                        </td>
                        <td><input type="checkbox" checked={c.opcional} onChange={(e) => setComp(c.id, { opcional: e.target.checked })} style={{ width: 16 }} /></td>
                        <td><button type="button" className={ui.iconBtn} title="Tirar o componente" onClick={() => set({ componentes: rascunho.componentes.filter((x) => x.id !== c.id) })}><Trash2 /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnLinha}`} onClick={() => set({ componentes: [...rascunho.componentes, { id: crypto.randomUUID(), apelido: `componente_${rascunho.componentes.length + 1}`, nome: '', regra: 'lancamento', unidade: '', valorPadrao: 0, formula: '', documento: 'CT-e', opcional: true }] })}>
                <Plus /> Incluir componente
              </button>

              {rascunho.componentes.some((c) => c.regra === 'documento') && (
                <div className={s.grade} style={{ marginTop: 14 }}>
                  <label className={s.campo}>
                    Documentos: como fatura (padrão)
                    <select value={rascunho.agrupamento} onChange={(e) => set({ agrupamento: e.target.value as ModeloContrato['agrupamento'] })}>
                      <option value="periodo">Uma fatura juntando os documentos do período</option>
                      <option value="por-documento">Uma cobrança por documento</option>
                    </select>
                  </label>
                  <label className={s.campo}>
                    Fechamento (padrão)
                    <select value={rascunho.fechamento} onChange={(e) => set({ fechamento: e.target.value as ModeloContrato['fechamento'] })}>
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </label>
                </div>
              )}
              <div className={s.exemploNota}>
                <b>Exemplo:</b> duas terceirizadas usam o mesmo modelo; uma cobra adicional X e a outra não. Crie o componente <code>adicional_x</code> com a regra Fórmula (<code>posto * 15%</code>) e marque <b>Opcional</b>: cada contrato liga ou desliga. Se a outra empresa nem tem esse conceito, ela usa um modelo próprio, duplicado deste.
              </div>
            </section>
          </div>
        ) : (
          <div className={s.secao}>{isLoading ? 'Carregando...' : 'Escolha um modelo ou crie um novo.'}</div>
        )}
      </div>
    </div>
  )
}
