import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, FolderInput, Info, Lightbulb, Plus, Power, Settings2, Trash2, X } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import sheet from '@/features/common/planilha.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import { useSalvamentoAutomatico } from '@/features/common/useSalvamentoAutomatico'
import { SituacaoSalvamento } from '@/features/common/SituacaoSalvamento'
import { formatBRL, formatNumberBRL, formatPct } from '@/lib/format'
import { chaveDe, trocarReferencia } from '@/lib/formula'
import camposCss from '@/features/camposOperacao/camposOperacao.module.css'
import { chaveFichas, listFichas, salvarFichas } from './api'
import { calcularFicha } from './calculo'
import { duplicarFicha, type PlanoCopia } from './copiar'
import { CopiarItensModal } from './CopiarItensModal'
import { ArvoreFichas } from './ArvoreFichas'
import { EditorFormula } from './EditorFormula'
import { TIPOS_COLUNA, TIPOS_NUMERICOS, novaColuna, novaFicha, novoGrupo, type ColunaFicha, type FichaTecnica, type GradeFichas, type GrupoFicha, type TipoColunaFicha } from './types'
import css from './fichaTecnica.module.css'

const TAG: Record<TipoColunaFicha, { label: string; cls: string }> = {
  valor: { label: 'R$', cls: 'tagValor' },
  percentual: { label: '%', cls: 'tagPct' },
  calculo: { label: 'fx', cls: 'tagCalc' },
  numero: { label: 'nº', cls: 'tagInfo' },
  texto: { label: 'abc', cls: 'tagInfo' },
  lista: { label: 'lista', cls: 'tagInfo' },
}

const VAZIA: GradeFichas = { grupos: [], colunas: [], fichas: [], pastas: [] }
/** Seleção da pasta virtual com o que ficou de antes das fichas. */
const SEM_FICHA = '__sem_ficha__'
/** Id da coluna Item (a do nome) na largura das colunas. */
const ITEM = '__item__'

/** Chave nova para a coluna (a partir do nome), sem repetir as das outras colunas ativas. */
function chaveLivre(nome: string, outras: ColunaFicha[]): string {
  const usadas = new Set(outras.filter((c) => c.status === 'ativo').map((c) => c.chave))
  const base = chaveDe(nome) || 'coluna'
  let k = base
  for (let n = 2; usadas.has(k); n++) k = `${base}_${n}`
  return k
}

/**
 * Ficha Técnica: as fichas ficam à esquerda, como pastas (Funcionários, Tecnologia...). A
 * ficha escolhida abre num grid tipo planilha, com as colunas DELA (painel à direita) e os
 * itens (Porteiro diurno, Plano CRM...) cujo total vira o custo no Pricing.
 * Vale para todas as empresas (é o único cadastro comum: o Pricing de qualquer empresa usa as mesmas fichas).
 * Grava sozinho um instante depois de cada alteração.
 */
export function FichasTecnicasPage() {
  const auto = useSalvamentoAutomatico<GradeFichas>({
    chave: chaveFichas,
    carregar: listFichas,
    salvar: salvarFichas,
    habilitado: true,
  })
  const grade = auto.dados ?? VAZIA
  const [painel, setPainel] = useState(false)
  const [colunaSel, setColunaSel] = useState('')
  const [aberta, setAberta] = useState('')
  const [mostrarInativas, setMostrarInativas] = useState(false)
  const [focoId, setFocoId] = useState('')
  const [grupoSel, setGrupoSel] = useState('')
  const [focoGrupo, setFocoGrupo] = useState('')
  /** Janela "Copiar para outra ficha" aberta (com o id do item clicado; '' = nenhum marcado). */
  const [copiarDe, setCopiarDe] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<{ texto: string; destinoId: string } | null>(null)

  // ── fichas (pastas) ──
  // Itens e colunas de antes das pastas (sem ficha) aparecem numa pasta "Sem ficha" até serem movidos.
  const temSemFicha = grade.colunas.some((c) => !grade.grupos.some((g) => g.id === c.grupoId)) || grade.fichas.some((x) => !grade.grupos.some((g) => g.id === x.grupoId))
  const gruposVisiveis = grade.grupos.filter((g) => mostrarInativas || g.status === 'ativo')
  const grupoValido = gruposVisiveis.some((g) => g.id === grupoSel) || (grupoSel === SEM_FICHA && temSemFicha)
  const grupoAtual = grupoValido ? grupoSel : (gruposVisiveis[0]?.id ?? (temSemFicha ? SEM_FICHA : ''))
  const semFicha = grupoAtual === SEM_FICHA
  /** Ficha onde entram as colunas e itens novos. */
  const grupoId = semFicha ? '' : grupoAtual
  const grupo = grade.grupos.find((g) => g.id === grupoId)
  const doGrupo = <T extends { grupoId: string }>(x: T) => (semFicha ? !grade.grupos.some((g) => g.id === x.grupoId) : x.grupoId === grupoAtual)

  const colunas = grade.colunas.filter((c) => c.status === 'ativo' && doGrupo(c))
  const colunasRemovidas = grade.colunas.filter((c) => c.status !== 'ativo' && doGrupo(c))
  const outrasColunas = grade.colunas.filter((c) => !doGrupo(c))
  /** Troca as colunas desta ficha mantendo as das outras. */
  const comOutras = (desta: ColunaFicha[]) => [...outrasColunas, ...desta]

  const visiveis = grade.fichas.filter((x) => doGrupo(x) && (mostrarInativas || x.status === 'ativo'))
  const gravar = (g: Partial<GradeFichas>) => auto.alterar({ ...grade, ...g })

  // ── total do item: soma das colunas marcadas ou fórmula da ficha ──
  const formulaTotal = grupo?.formulaTotal ?? ''
  const [totalPorFormula, setTotalPorFormula] = useState(false)
  const [grupoDoModo, setGrupoDoModo] = useState(grupoId)
  if (grupoDoModo !== grupoId) {
    // Trocou de ficha: o modo segue o que está gravado nela.
    setGrupoDoModo(grupoId)
    setTotalPorFormula(false)
  }
  const modoFormula = !!formulaTotal || totalPorFormula
  const escolherModoTotal = (formula: boolean) => {
    setTotalPorFormula(formula)
    if (!formula && grupo && formulaTotal) salvarGrupo({ ...grupo, formulaTotal: '' })
  }

  const salvarGrupo = (g: GrupoFicha) => gravar({ grupos: grade.grupos.map((x) => (x.id === g.id ? g : x)) })
  const adicionarGrupo = (pastaId = '') => {
    const g = { ...novoGrupo(), pastaId }
    gravar({ grupos: [...grade.grupos, g] })
    setGrupoSel(g.id)
    setFocoGrupo(g.id)
    setColunaSel('')
    setAberta('')
  }
  const escolherGrupo = (id: string) => {
    setGrupoSel(id)
    setColunaSel('')
    setAberta('')
    setCopiado(null)
  }
  /** Cópia da ficha aberta logo abaixo dela, já selecionada e com o nome pronto para trocar. */
  const duplicarGrupo = (id: string) => {
    const r = duplicarFicha(grade, id)
    gravar(r.grade)
    escolherGrupo(r.id)
    setFocoGrupo(r.id)
  }
  const aoCopiar = (nova: GradeFichas, planos: PlanoCopia[], itens: number) => {
    gravar(nova)
    setCopiarDe(null)
    const nomes = planos.map((p) => grade.grupos.find((g) => g.id === p.grupoId)?.nome || 'Sem nome')
    setCopiado({ texto: `${itens === 1 ? '1 item copiado' : `${itens} itens copiados`} para ${nomes.join(', ')}.`, destinoId: planos.length === 1 ? planos[0].grupoId : '' })
  }
  const qtdItens = (gid: string) => grade.fichas.filter((x) => x.status === 'ativo' && (gid === '' ? !grade.grupos.some((g) => g.id === x.grupoId) : x.grupoId === gid)).length

  // ── linhas ──
  const salvarFicha = (f: FichaTecnica) => gravar({ fichas: grade.fichas.map((x) => (x.id === f.id ? f : x)) })
  const setValor = (f: FichaTecnica, colunaId: string, v: number | string) => salvarFicha({ ...f, valores: { ...f.valores, [colunaId]: v } })
  const adicionarFicha = () => {
    const nova = novaFicha(grupoId)
    gravar({ fichas: [...grade.fichas, nova] })
    setFocoId(nova.id)
  }
  const duplicar = (f: FichaTecnica) => {
    const copia: FichaTecnica = { ...f, id: crypto.randomUUID(), nome: `${f.nome} (cópia)`, valores: { ...f.valores }, status: 'ativo' }
    const i = grade.fichas.findIndex((x) => x.id === f.id)
    const lista = [...grade.fichas]
    lista.splice(i + 1, 0, copia)
    gravar({ fichas: lista })
    setFocoId(copia.id)
  }
  const alternarStatus = (f: FichaTecnica) => salvarFicha({ ...f, status: f.status === 'ativo' ? 'inativo' : 'ativo' })

  // ── colunas ──
  const updColuna = (id: string, patch: Partial<ColunaFicha>) =>
    gravar({ colunas: grade.colunas.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  /** Renomear troca a chave e reescreve as fórmulas e bases que apontavam para a antiga. */
  const renomearColuna = (c: ColunaFicha, nome: string) => {
    const nova = chaveLivre(nome, grade.colunas.filter((x) => x.id !== c.id && x.grupoId === c.grupoId))
    gravar({
      // A fórmula do total da ficha também acompanha o nome novo.
      grupos: grade.grupos.map((g) => (g.id === c.grupoId && g.formulaTotal ? { ...g, formulaTotal: trocarReferencia(g.formulaTotal, c.chave, nova) } : g)),
      colunas: grade.colunas.map((x) =>
        x.id === c.id
          ? { ...x, nome, chave: nova }
          : x.grupoId !== c.grupoId
            ? x // fórmulas só enxergam as colunas da mesma ficha
            : { ...x, formula: trocarReferencia(x.formula, c.chave, nova), base: x.base === c.chave ? nova : x.base },
      ),
    })
  }
  const trocarTipoColuna = (c: ColunaFicha, tipo: TipoColunaFicha) =>
    updColuna(c.id, { tipo, compoeTotal: tipo === 'valor' || tipo === 'percentual' || tipo === 'calculo' ? true : tipo === 'numero' ? c.compoeTotal : false })
  const removerColuna = (id: string) => {
    updColuna(id, { status: 'inativo' })
    if (colunaSel === id) setColunaSel('')
  }
  const restaurarColuna = (c: ColunaFicha) =>
    gravar({ colunas: comOutras([...colunas, { ...c, status: 'ativo', chave: chaveLivre(c.chave || c.nome, colunas) }, ...colunasRemovidas.filter((x) => x.id !== c.id)]) })
  const moverColuna = (i: number, delta: -1 | 1) => {
    const j = i + delta
    if (j < 0 || j >= colunas.length) return
    const lista = [...colunas]
    const [item] = lista.splice(i, 1)
    lista.splice(j, 0, item)
    gravar({ colunas: comOutras([...lista, ...colunasRemovidas]) })
  }
  const adicionarColuna = () => {
    const c = { ...novaColuna(grupoId, 'Nova coluna'), chave: chaveLivre('Nova coluna', colunas) }
    gravar({ colunas: comOutras([...colunas, c, ...colunasRemovidas]) })
    setColunaSel(c.id)
    setPainel(true)
  }
  const abrirColuna = (id: string) => {
    setColunaSel(id)
    setPainel(true)
  }
  const podeLancar = !auto.carregando && (!!grupo || semFicha)

  // ── largura das colunas: arrastar a borda do título (como no Excel); quem ajusta, vale para todos ──
  const [arrastando, setArrastando] = useState<{ id: string; largura: number } | null>(null)
  const larguraDe = (id: string, padrao: number) =>
    arrastando?.id === id ? arrastando.largura : (id === ITEM ? grupo?.larguraItem : colunas.find((c) => c.id === id)?.largura) || padrao
  const redimensionar = (id: string) => (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const th = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
    const x0 = e.clientX
    let largura = Math.round(th.width)
    const mover = (ev: MouseEvent) => {
      largura = Math.max(70, Math.min(900, Math.round(th.width + ev.clientX - x0)))
      setArrastando({ id, largura })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      setArrastando(null)
      if (id === ITEM) { if (grupo) salvarGrupo({ ...grupo, larguraItem: largura }) }
      else gravar({ colunas: grade.colunas.map((c) => (c.id === id ? { ...c, largura } : c)) })
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }
  const alca = (id: string) => (
    <span className={css.redim} onMouseDown={redimensionar(id)} onDoubleClick={() => (id === ITEM ? grupo && salvarGrupo({ ...grupo, larguraItem: 0 }) : gravar({ colunas: grade.colunas.map((c) => (c.id === id ? { ...c, largura: 0 } : c)) }))} title="Arraste para alargar (duplo clique volta ao padrão)" aria-hidden />
  )

  // Prévia da fórmula usa a primeira ficha (ou zeros) para mostrar se a conta fecha.
  const amostra = visiveis[0]?.valores ?? {}
  const calcAmostra = calcularFicha(colunas, amostra, formulaTotal)
  const colunasDaConta = colunas.filter((x) => TIPOS_NUMERICOS.includes(x.tipo)).map((x) => ({ chave: x.chave, nome: x.nome || x.chave }))

  return (
    <>
      <PageHeader
        breadcrumb="Cadastros"
        title="Ficha Técnica"
        subtitle="Cada ficha (Funcionários, Tecnologia...) tem as suas colunas e os seus itens, e pode ficar numa pasta com subpastas (ex.: COBRECOM › Operação Santos). O total de cada item é o custo que o Pricing usa. Vale para todas as empresas."
        action={
          <div className={camposCss.acoes}>
            <SituacaoSalvamento situacao={auto.situacao} erro={auto.erro} onTentar={auto.tentarDeNovo} />
            <button type="button" className={`${ui.chip} ${painel ? ui.chipOn : ''}`} onClick={() => setPainel((p) => !p)} disabled={!podeLancar}>
              <Settings2 /> Colunas ({colunas.length})
            </button>
            <label className={ui.chip}>
              <input className={ui.chipCheck} type="checkbox" checked={mostrarInativas} onChange={(e) => setMostrarInativas(e.target.checked)} />
              {mostrarInativas ? 'Ocultar inativas' : 'Mostrar inativas'}
            </label>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={adicionarFicha} disabled={!podeLancar}>
              <Plus /> Item
            </button>
          </div>
        }
      />

      {auto.erroCarga && <div className={camposCss.blocoVazio}>{auto.erroCarga}</div>}

      <div className={css.layout}>
      <ArvoreFichas
        grade={grade}
        mostrarInativas={mostrarInativas}
        grupoAtual={grupoAtual}
        focoGrupo={focoGrupo}
        carregando={auto.carregando}
        qtdItens={qtdItens}
        onEscolher={escolherGrupo}
        onSalvarGrupo={salvarGrupo}
        onDuplicar={duplicarGrupo}
        onNovaFicha={adicionarGrupo}
        onGravar={gravar}
        semFicha={temSemFicha ? { ativo: semFicha, qtd: qtdItens(''), onEscolher: () => escolherGrupo(SEM_FICHA) } : undefined}
      />

      <div className={`${sheet.split} ${painel ? '' : sheet.splitFechado}`}>
        <div className={ui.card}>
          {copiado && (
            <div className={css.copiado} role="status">
              <span>{copiado.texto}</span>
              {copiado.destinoId && <button type="button" onClick={() => escolherGrupo(copiado.destinoId)}>Abrir a ficha</button>}
              <button type="button" className={ui.iconBtn} onClick={() => setCopiado(null)} aria-label="Fechar aviso"><X /></button>
            </div>
          )}
          <div className={sheet.wrap}>
            <table className={sheet.sheet}>
              <thead>
                <tr>
                  <th className={sheet.fixa} style={{ width: larguraDe(ITEM, 220), minWidth: larguraDe(ITEM, 220), maxWidth: larguraDe(ITEM, 220) }}>Item{grupo && alca(ITEM)}</th>
                  {colunas.map((c) => (
                    <th key={c.id} style={{ position: 'relative', width: larguraDe(c.id, c.tipo === 'texto' ? 160 : 120), minWidth: larguraDe(c.id, c.tipo === 'texto' ? 160 : 120), maxWidth: larguraDe(c.id, c.tipo === 'texto' ? 160 : 120) }} className={TIPOS_NUMERICOS.includes(c.tipo) ? sheet.num : ''}>
                      <button type="button" className={`${sheet.colHead} ${colunaSel === c.id && painel ? sheet.colHeadOn : ''}`} onClick={() => abrirColuna(c.id)} title="Configurar coluna">
                        {c.nome || 'Sem nome'}
                        <span className={`${sheet.tag} ${sheet[TAG[c.tipo].cls]}`}>{TAG[c.tipo].label}</span>
                      </button>
                      {alca(c.id)}
                    </th>
                  ))}
                  <th className={sheet.num} style={{ minWidth: 130 }}>Total (custo)</th>
                  <th style={{ width: 120 }}>
                    <button type="button" className={sheet.addCol} onClick={adicionarColuna} disabled={!podeLancar}><Plus /> Coluna</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((f) => {
                  const calc = calcularFicha(colunas, f.valores, formulaTotal)
                  const por = Object.fromEntries(calc.colunas.map((c) => [c.chave, c]))
                  const expandida = aberta === f.id
                  return (
                    <FichaLinha
                      key={f.id}
                      f={f}
                      colunas={colunas}
                      por={por}
                      total={calc.total}
                      porFormula={!!calc.porFormula}
                      erro={calc.erro}
                      expandida={expandida}
                      foco={focoId === f.id}
                      onNome={(nome) => salvarFicha({ ...f, nome })}
                      onValor={(k, v) => setValor(f, k, v)}
                      onExpandir={() => setAberta(expandida ? '' : f.id)}
                      onDuplicar={() => duplicar(f)}
                      onCopiar={() => setCopiarDe(f.id)}
                      onStatus={() => alternarStatus(f)}
                      onEnter={adicionarFicha}
                    />
                  )
                })}
                {visiveis.length === 0 && !auto.carregando && (
                  <tr className={sheet.vazio}>
                    <td colSpan={colunas.length + 3}>
                      {!podeLancar ? (
                        <>
                          <b>Nenhuma ficha ainda.</b> Clique em <b>+ Nova ficha</b> à esquerda (ex.: Funcionários).
                        </>
                      ) : colunas.length === 0 ? (
                        <>
                          <b>{grupo?.nome || 'Ficha'} vazia.</b> Comece pelas colunas desta ficha: clique em <b>+ Coluna</b> (salário, encargos... ou valor mensal). Depois, <b>+ Item</b> para cada cargo, plano ou serviço.
                        </>
                      ) : (
                        <>
                          <b>Nenhum item ainda.</b> Clique em <b>+ Item</b> para cadastrar o primeiro.
                        </>
                      )}
                    </td>
                  </tr>
                )}
                <tr className={sheet.addRow}>
                  <td colSpan={colunas.length + 3}>
                    <button type="button" onClick={adicionarFicha} disabled={!podeLancar}><Plus /> Adicionar item</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={camposCss.dica}>
            <Lightbulb />
            <span>
              Grava sozinho a cada alteração. Clique no título de uma coluna para mudar tipo, fórmula ou se ela entra no total. Clique no total para ver a composição. <kbd>Enter</kbd> no nome cria o próximo item. <FolderInput size={13} style={{ verticalAlign: -2 }} /> no item copia os custos para outra ficha. Remover coluna ou inativar item ou ficha não apaga nada: as propostas feitas guardam a composição do dia.
            </span>
          </div>
        </div>

        {painel && (
          <aside className={sheet.painel}>
            <div className={sheet.painelHead}>
              <span>Colunas de {grupo?.nome || 'Sem ficha'}</span>
              <button type="button" className={ui.iconBtn} onClick={() => setPainel(false)} title="Fechar"><X /></button>
            </div>
            <div className={sheet.painelBody}>
              {grupo && (
                <div className={css.totalBloco}>
                  <div className={css.totalTitulo}>Total do item (o custo que vai para o Pricing)</div>
                  <label className={css.totalOpcao}>
                    <input type="radio" name="modo-total" checked={!modoFormula} onChange={() => escolherModoTotal(false)} />
                    <span>
                      <b>Soma das colunas</b> marcadas com "Entra no total"
                    </span>
                  </label>
                  <label className={css.totalOpcao}>
                    <input type="radio" name="modo-total" checked={modoFormula} onChange={() => escolherModoTotal(true)} />
                    <span>
                      <b>Fórmula</b>: monte a conta do total (ex.: Valor hora × Horas)
                    </span>
                  </label>
                  {modoFormula && (
                    <EditorFormula
                      valor={formulaTotal}
                      onChange={(v) => salvarGrupo({ ...grupo, formulaTotal: v })}
                      colunas={colunasDaConta}
                      previa={visiveis.length > 0 && formulaTotal.trim() ? { valor: calcAmostra.total, erro: calcAmostra.erro?.startsWith('Total:') ? calcAmostra.erro.slice(7) : undefined } : null}
                      placeholder="Ex.: clique em Valor hora, depois ×, depois Horas"
                    />
                  )}
                </div>
              )}
              {colunas.length === 0 && <span className={sheet.chave}>Nenhuma coluna. Clique em + Coluna.</span>}
              {colunas.map((c, i) => {
                const numerica = TIPOS_NUMERICOS.includes(c.tipo)
                const previa = c.tipo === 'calculo' || c.tipo === 'percentual' ? calcAmostra.colunas.find((x) => x.chave === c.chave) : undefined
                return (
                  <div key={c.id} className={`${sheet.colItem} ${colunaSel === c.id ? sheet.colItemOn : ''}`} onFocus={() => setColunaSel(c.id)}>
                    <div className={sheet.colItemTop}>
                      <span className={sheet.ordem}>
                        <button type="button" onClick={() => moverColuna(i, -1)} disabled={i === 0} title="Mover para a esquerda"><ChevronUp /></button>
                        <button type="button" onClick={() => moverColuna(i, 1)} disabled={i === colunas.length - 1} title="Mover para a direita"><ChevronDown /></button>
                      </span>
                      <input value={c.nome} placeholder="Nome da coluna" autoFocus={colunaSel === c.id && c.nome === 'Nova coluna'} onChange={(e) => renomearColuna(c, e.target.value)} />
                      <button type="button" className={ui.iconBtn} title="Remover coluna (fica guardada para as propostas antigas)" onClick={() => removerColuna(c.id)}><Trash2 /></button>
                    </div>
                    <div className={sheet.colItemLinha}>
                      <select value={c.tipo} onChange={(e) => trocarTipoColuna(c, e.target.value as TipoColunaFicha)}>
                        {TIPOS_COLUNA.map((t) => (
                          <option key={t.valor} value={t.valor}>{t.label}</option>
                        ))}
                      </select>
                      {numerica && modoFormula ? (
                        <span className={sheet.chave}>o total vem da fórmula</span>
                      ) : numerica ? (
                        <label className={sheet.chk}>
                          <input type="checkbox" checked={c.compoeTotal} onChange={(e) => updColuna(c.id, { compoeTotal: e.target.checked })} /> Entra no total
                        </label>
                      ) : (
                        <span className={sheet.chave}>só informa</span>
                      )}
                    </div>
                    {c.tipo === 'percentual' && (
                      <select value={c.base} onChange={(e) => updColuna(c.id, { base: e.target.value })}>
                        <option value="">% sobre qual coluna?</option>
                        {colunas.filter((x) => x.id !== c.id && TIPOS_NUMERICOS.includes(x.tipo)).map((x) => (
                          <option key={x.id} value={x.chave}>{x.nome}</option>
                        ))}
                      </select>
                    )}
                    {c.tipo === 'calculo' && (
                      <EditorFormula
                        valor={c.formula}
                        onChange={(v) => updColuna(c.id, { formula: v })}
                        colunas={colunasDaConta.filter((x) => x.chave !== c.chave)}
                        previa={previa && visiveis.length > 0 ? { valor: previa.valor, erro: previa.erro } : null}
                      />
                    )}
                    {c.tipo === 'lista' && (
                      <input className={sheet.txt} value={c.opcoes.join(', ')} placeholder="Opções separadas por vírgula" onChange={(e) => updColuna(c.id, { opcoes: e.target.value.split(',').map((o) => o.trimStart()) })} />
                    )}
                    {previa && c.tipo === 'percentual' && (previa.erro ? <span className={sheet.erro}>{previa.erro}</span> : visiveis.length > 0 && <span className={sheet.ok}>No 1º item dá {formatBRL(previa.valor)}</span>)}
                    <span className={sheet.chave}>nas fórmulas: {c.chave}</span>
                  </div>
                )
              })}
              {colunasRemovidas.length > 0 && (
                <>
                  <span className={sheet.chave} style={{ marginTop: 6 }}>Removidas ({colunasRemovidas.length})</span>
                  {colunasRemovidas.map((c) => (
                    <div key={c.id} className={sheet.colItem} style={{ opacity: 0.7 }}>
                      <div className={sheet.colItemTop}>
                        <span style={{ flex: 1, fontSize: 13 }}>{c.nome}</span>
                        <button type="button" className={sheet.restaurar} onClick={() => restaurarColuna(c)}>Restaurar</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className={sheet.painelFoot}>
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={adicionarColuna}><Plus /> Coluna</button>
            </div>
          </aside>
        )}
      </div>
      </div>

      {copiarDe !== null && (
        <CopiarItensModal
          grade={grade}
          origemId={grupoId}
          origemNome={grupo?.nome || 'Sem ficha'}
          colunas={colunas}
          itens={visiveis.filter((f) => f.status === 'ativo')}
          formulaTotal={formulaTotal}
          marcado={copiarDe}
          onClose={() => setCopiarDe(null)}
          onCopiar={aoCopiar}
        />
      )}
    </>
  )
}

interface LinhaProps {
  f: FichaTecnica
  colunas: ColunaFicha[]
  por: Record<string, { valor: number; erro?: string; compoeTotal: boolean; nome: string }>
  total: number
  /** O total vem da fórmula da ficha (não da soma das colunas marcadas). */
  porFormula: boolean
  erro?: string
  expandida: boolean
  foco: boolean
  onNome: (nome: string) => void
  onValor: (colunaId: string, v: number | string) => void
  onExpandir: () => void
  onDuplicar: () => void
  onCopiar: () => void
  onStatus: () => void
  onEnter: () => void
}

function FichaLinha({ f, colunas, por, total, porFormula, erro, expandida, foco, onNome, onValor, onExpandir, onDuplicar, onCopiar, onStatus, onEnter }: LinhaProps) {
  const inativa = f.status !== 'ativo'
  return (
    <>
      <tr className={inativa ? sheet.ativoOff : ''}>
        <td className={sheet.fixa}>
          <input
            value={f.nome}
            autoFocus={foco}
            placeholder="Nome do item (ex.: Porteiro · Diurno)"
            onChange={(e) => onNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onEnter()
              }
            }}
          />
        </td>
        {colunas.map((c) => {
          const v = f.valores[c.id]
          if (c.tipo === 'valor') return <td key={c.id} className={sheet.num}><MoneyInput value={Number(v) || 0} onChange={(n) => onValor(c.id, n)} /></td>
          if (c.tipo === 'percentual') return <td key={c.id} className={sheet.num}><PercentInput value={Number(v) || 0} onChange={(n) => onValor(c.id, n)} /></td>
          if (c.tipo === 'numero')
            return (
              <td key={c.id} className={sheet.num}>
                <input inputMode="decimal" value={v === undefined ? '' : typeof v === 'number' ? formatNumberBRL(v).replace(/,00$/, '') : String(v)} placeholder="0" onChange={(e) => onValor(c.id, e.target.value.replace(/[^\d.,]/g, ''))} />
              </td>
            )
          if (c.tipo === 'lista')
            return (
              <td key={c.id}>
                <select value={String(v ?? '')} onChange={(e) => onValor(c.id, e.target.value)}>
                  <option value="">—</option>
                  {c.opcoes.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </td>
            )
          if (c.tipo === 'calculo') {
            const r = por[c.chave]
            return (
              <td key={c.id} className={sheet.calc} title={c.formula}>
                {r?.erro ? <span className={sheet.calcErro}>erro</span> : formatNumberBRL(r?.valor ?? 0)}
              </td>
            )
          }
          return <td key={c.id}><input value={String(v ?? '')} onChange={(e) => onValor(c.id, e.target.value)} /></td>
        })}
        <td className={sheet.total}>
          <button type="button" className={sheet.totalBtn} onClick={onExpandir} title={erro ?? 'Ver composição'}>
            {erro ? <span className={sheet.calcErro}>{erro}</span> : formatBRL(total)} <Info />
          </button>
        </td>
        <td>
          <div className={sheet.acoes}>
            <button type="button" title="Duplicar item" onClick={onDuplicar}><Copy /></button>
            <button type="button" title="Copiar para outra ficha" onClick={onCopiar} disabled={inativa}><FolderInput /></button>
            <button type="button" className={inativa ? '' : sheet.perigo} title={inativa ? 'Reativar' : 'Inativar (fica no histórico)'} onClick={onStatus}><Power /></button>
          </div>
        </td>
      </tr>
      {expandida && (
        <tr className={sheet.detalhe}>
          <td colSpan={colunas.length + 3}>
            <div className={sheet.comp}>
              {colunas.map((c) => {
                const r = por[c.chave]
                const numerica = TIPOS_NUMERICOS.includes(c.tipo)
                const v = f.valores[c.id]
                return (
                  <div key={c.id} className={numerica && (porFormula || r?.compoeTotal) ? '' : sheet.fora}>
                    <span>{c.nome}{c.tipo === 'percentual' ? ` (${formatPct(Number(v) || 0)})` : ''}{c.tipo === 'calculo' ? ' (fx)' : ''}</span>
                    <b>{numerica ? formatNumberBRL(r?.valor ?? 0) : String(v ?? '—')}</b>
                  </div>
                )
              })}
            </div>
            <div className={sheet.compTotal}>
              Total {formatBRL(total)}{' '}
              <small>{porFormula ? 'pela fórmula do total da ficha (Colunas › Total do item)' : 'soma das colunas marcadas como "entra no total"; as apagadas só informam ou alimentam fórmulas'}</small>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
