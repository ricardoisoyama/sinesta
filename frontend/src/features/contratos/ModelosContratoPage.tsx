import { useState } from 'react'
import { Copy, LayoutTemplate, ListChecks, Plus, Receipt, Save, Trash2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { AvisoPrototipo } from '@/features/common/AvisoPrototipo'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { referencias } from '@/lib/formula'
import { AJUDA_REGRA, apelidoDe, ROTULO_REGRA, ROTULO_TIPO_CAMPO, type CampoModelo, type ComponenteModelo, type ModeloContrato, type TipoCampo } from './modelos'
import { prototipo, usePrototipo } from './store'
import type { RegraComponente } from './types'
import s from './form.module.css'

const CADASTROS = ['Veículos', 'Funcionários', 'Fornecedores', 'Serviços']
const novoId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/**
 * Modelos de Contrato (protótipo, Parametrizações): o cliente monta os modelos do negócio dele.
 * Campos (características, com apelido) + componentes de cobrança (o que entra na fatura e a regra).
 * Mesma ideia da Ficha Técnica e dos Dados da Operação.
 */
export function ModelosContratoPage() {
  const { modelos, contratos } = usePrototipo()
  const [selecionado, setSelecionado] = useState(modelos[0]?.id ?? '')
  const original = modelos.find((m) => m.id === selecionado)
  const [rascunho, setRascunho] = useState<ModeloContrato | null>(original ?? null)
  const [editandoId, setEditandoId] = useState(selecionado)
  if (editandoId !== selecionado) {
    setEditandoId(selecionado)
    setRascunho(modelos.find((m) => m.id === selecionado) ?? null)
  }
  const tipos = [...new Set(modelos.map((m) => m.tipoOperacao))]
  const usados = contratos.filter((c) => c.modeloId === selecionado).length
  const mudou = !!rascunho && JSON.stringify(rascunho) !== JSON.stringify(original)

  const set = (p: Partial<ModeloContrato>) => rascunho && setRascunho({ ...rascunho, ...p })
  const setCampo = (id: string, p: Partial<CampoModelo>) => rascunho && set({ campos: rascunho.campos.map((c) => (c.id === id ? { ...c, ...p } : c)) })
  const setComp = (id: string, p: Partial<ComponenteModelo>) => rascunho && set({ componentes: rascunho.componentes.map((c) => (c.id === id ? { ...c, ...p } : c)) })

  // Fórmulas só podem usar apelidos que existem: componentes fixos, outras fórmulas, campos numéricos e "subtotal".
  const conhecidos = new Set<string>(['subtotal'])
  rascunho?.componentes.filter((c) => c.regra === 'fixo' || c.regra === 'formula').forEach((c) => conhecidos.add(c.apelido))
  rascunho?.campos.filter((c) => ['numero', 'valor', 'percentual'].includes(c.tipo)).forEach((c) => conhecidos.add(c.apelido))
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

  const salvar = () => {
    if (!rascunho || temErro) return
    prototipo.salvarModelo(rascunho)
    void avisar({ titulo: 'Modelo salvo', mensagem: `"${rascunho.nome}" já aparece no cadastro de contrato. Contratos existentes continuam com o que têm; campos novos aparecem vazios na pasta.` })
  }
  const novoModelo = (base?: ModeloContrato) => {
    const m: ModeloContrato = base
      ? { ...base, id: novoId('m'), nome: `${base.nome} (cópia)`, campos: base.campos.map((c) => ({ ...c, id: novoId('cp') })), componentes: base.componentes.map((c) => ({ ...c, id: novoId('co') })) }
      : { id: novoId('m'), nome: 'Novo modelo', tipoOperacao: '', descricao: '', campos: [], componentes: [{ id: novoId('co'), apelido: 'mensalidade', nome: 'Mensalidade', regra: 'fixo', unidade: 'mês', valorPadrao: 0, formula: '', documento: '', servicoNfse: '', opcional: false }], agrupamento: 'periodo', fechamento: 'mensal', status: 'ativo' }
    prototipo.salvarModelo(m)
    setSelecionado(m.id)
  }
  const trocar = async (id: string) => {
    if (mudou && !(await confirmar({ titulo: 'Descartar alterações', mensagem: 'O modelo tem alterações não salvas. Trocar mesmo assim?', confirmar: 'Descartar', perigo: true }))) return
    setSelecionado(id)
  }

  return (
    <div>
      <PageHeader breadcrumb="Parametrizações" title="Modelos de Contrato" subtitle="Cada negócio monta os seus: os campos do contrato (com apelido) e o que entra na fatura, com a regra de cada componente." />
      <AvisoPrototipo>modelos de exemplo, guardados só neste navegador; o que salvar aqui já vale no cadastro de contrato do protótipo.</AvisoPrototipo>

      <div className={s.modelosGrade}>
        <div className={s.listaModelos}>
          {modelos.map((m) => (
            <button key={m.id} type="button" className={`${s.cartaoModelo} ${m.id === selecionado ? s.modeloOn : ''}`} onClick={() => void trocar(m.id)}>
              <b>{m.nome}</b>
              <span>{m.tipoOperacao || 'sem tipo de operação'} · {m.campos.length} campo(s) · {m.componentes.length} componente(s)</span>
              <span>{contratos.filter((c) => c.modeloId === m.id).length} contrato(s) usando</span>
            </button>
          ))}
          <button type="button" className={s.novoModelo} onClick={() => novoModelo()}><Plus size={14} /> Novo modelo</button>
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
                <span className={s.mut} style={{ marginRight: 'auto', alignSelf: 'center' }}>{usados} contrato(s) usando este modelo</span>
                <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => novoModelo(rascunho)}><Copy /> Duplicar</button>
                <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!mudou || temErro} onClick={salvar}><Save /> Salvar modelo</button>
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
              <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnLinha}`} onClick={() => set({ campos: [...rascunho.campos, { id: novoId('cp'), apelido: `campo_${rascunho.campos.length + 1}`, nome: '', tipo: 'texto', opcoes: [], obrigatorio: false, ajuda: '' }] })}>
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
                      <th>Serviço da nota</th>
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
                        <td><input value={c.servicoNfse} onChange={(e) => setComp(c.id, { servicoNfse: e.target.value })} placeholder="do cadastro de serviços" /></td>
                        <td><input type="checkbox" checked={c.opcional} onChange={(e) => setComp(c.id, { opcional: e.target.checked })} style={{ width: 16 }} /></td>
                        <td><button type="button" className={ui.iconBtn} title="Tirar o componente" onClick={() => set({ componentes: rascunho.componentes.filter((x) => x.id !== c.id) })}><Trash2 /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnLinha}`} onClick={() => set({ componentes: [...rascunho.componentes, { id: novoId('co'), apelido: `componente_${rascunho.componentes.length + 1}`, nome: '', regra: 'lancamento', unidade: '', valorPadrao: 0, formula: '', documento: '', servicoNfse: '', opcional: true }] })}>
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
          <div className={s.secao}>Escolha um modelo ou crie um novo.</div>
        )}
      </div>
    </div>
  )
}
