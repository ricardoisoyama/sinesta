import { useState } from 'react'
import { ChevronDown, ChevronUp, Eye, Lightbulb, Plus, Trash2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import sheet from '@/features/common/planilha.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Hint } from '@/features/common/Hint'
import { useSalvamentoAutomatico } from '@/features/common/useSalvamentoAutomatico'
import { SituacaoSalvamento } from '@/features/common/SituacaoSalvamento'
import { chaveDe } from '@/lib/formula'
import { useEmpresaAtiva } from './useEmpresaAtiva'
import { chaveCampos, listCampos, salvarCampos } from './api'
import { BlocoDadosOperacao } from './BlocoDadosOperacao'
import { CADASTROS, EFEITOS, EFEITOS_POR_TIPO, LARGURAS, TIPOS_CAMPO, campoUfDaCidade, efeitoDe, novoCampo, type CampoOperacao, type EfeitoCampo, type LarguraCampo, type TipoCampoOperacao, type ValoresOperacao } from './types'
import s from './camposOperacao.module.css'

const notaOpcoes = { padding: '0 10px', fontSize: 12 } as const

/** Chave única entre os ativos (o servidor confere de novo). */
function comChaveUnica(lista: CampoOperacao[]): CampoOperacao[] {
  const usadas = new Set<string>()
  return lista.map((c) => {
    if (c.status !== 'ativo') return c
    const base = chaveDe(c.chave || c.nome) || 'campo'
    let k = base
    for (let n = 2; usadas.has(k); n++) k = `${base}_${n}`
    usadas.add(k)
    return k === c.chave ? c : { ...c, chave: k }
  })
}

/**
 * Cadastro dos campos de "Dados da operação": uma linha por campo, editada direto na
 * tabela (como numa planilha), com a prévia do bloco do Pricing logo acima.
 * Grava sozinho um instante depois de cada alteração.
 */
export function CamposOperacaoPage() {
  const { empresas, empresaId, setEmpresaId, carregando } = useEmpresaAtiva()
  const auto = useSalvamentoAutomatico<CampoOperacao[]>({
    chave: chaveCampos(empresaId),
    carregar: () => listCampos(empresaId),
    salvar: (lista) => salvarCampos(empresaId, lista),
    habilitado: !!empresaId,
  })
  const todos = auto.dados ?? []
  const ativos = todos.filter((c) => c.status === 'ativo')
  const removidos = todos.filter((c) => c.status !== 'ativo')
  const [mostrarRemovidos, setMostrarRemovidos] = useState(false)
  const [valoresPrevia, setValoresPrevia] = useState<ValoresOperacao>({})
  const [focoId, setFocoId] = useState('')

  const gravar = (lista: CampoOperacao[]) => auto.alterar(comChaveUnica(lista))
  const upd = (id: string, patch: Partial<CampoOperacao>) => gravar(todos.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  // Trocar o tipo mantém o efeito se ele ainda vale; senão sugere o efeito "natural" do tipo novo.
  const trocarTipo = (c: CampoOperacao, tipo: TipoCampoOperacao) => {
    const permitidos = EFEITOS_POR_TIPO[tipo]
    const efeito = permitidos.includes(c.efeito) ? c.efeito : permitidos[permitidos.length - 1]
    upd(c.id, { tipo, efeito, cadastro: tipo === 'cadastro' ? c.cadastro || 'cliente' : '', opcoes: tipo === 'lista' ? c.opcoes : [] })
  }
  /** Mover dentro da ordem dos ativos (os removidos ficam no fim). */
  const mover = (i: number, delta: -1 | 1) => {
    const j = i + delta
    if (j < 0 || j >= ativos.length) return
    const lista = [...ativos]
    const [item] = lista.splice(i, 1)
    lista.splice(j, 0, item)
    gravar([...lista, ...removidos])
  }
  const adicionar = (apos?: number) => {
    const novo = novoCampo()
    const lista = [...ativos]
    lista.splice(apos === undefined ? lista.length : apos + 1, 0, novo)
    gravar([...lista, ...removidos])
    setFocoId(novo.id)
  }
  const trocarEmpresa = (id: string) => {
    setEmpresaId(id)
    setValoresPrevia({})
  }

  const linha = (c: CampoOperacao, i: number, removido: boolean) => {
    const ef = efeitoDe(c)
    const efeitosPermitidos = EFEITOS_POR_TIPO[c.tipo]
    return (
      <tr key={c.id} className={removido ? sheet.removida : ''}>
        <td className={sheet.center}>
          {!removido && (
            <span className={sheet.ordem}>
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} title="Subir"><ChevronUp /></button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === ativos.length - 1} title="Descer"><ChevronDown /></button>
            </span>
          )}
        </td>
        <td>
          <input
            value={c.nome}
            autoFocus={focoId === c.id}
            disabled={removido}
            placeholder="Nome do campo"
            onChange={(e) => upd(c.id, { nome: e.target.value, chave: '' })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionar(i)
              }
            }}
          />
        </td>
        <td>
          <select value={c.tipo} disabled={removido} onChange={(e) => trocarTipo(c, e.target.value as TipoCampoOperacao)}>
            {TIPOS_CAMPO.map((t) => (
              <option key={t.valor} value={t.valor}>{t.label}</option>
            ))}
          </select>
        </td>
        <td>
          {c.tipo === 'lista' && (
            <input value={c.opcoes.join(', ')} disabled={removido} placeholder="Opções separadas por vírgula" onChange={(e) => upd(c.id, { opcoes: e.target.value.split(',').map((o) => o.trimStart()) })} />
          )}
          {c.tipo === 'cadastro' && (
            <select value={c.cadastro} disabled={removido} onChange={(e) => upd(c.id, { cadastro: e.target.value as CampoOperacao['cadastro'] })}>
              {CADASTROS.map((o) => (
                <option key={o.valor} value={o.valor}>{o.label}</option>
              ))}
            </select>
          )}
          {c.tipo === 'uf' && <span className={sheet.mut} style={notaOpcoes}>— as 27 UFs do Brasil</span>}
          {c.tipo === 'cidade' && (
            <span className={sheet.mut} style={notaOpcoes}>
              {(() => {
                const campoUf = campoUfDaCidade(ativos, c)
                return campoUf ? `— cidades do IBGE, filtradas pela UF de “${campoUf.nome}”` : '— cidades do IBGE de todas as UFs (crie um campo de UF para filtrar)'
              })()}
            </span>
          )}
          {!['lista', 'cadastro', 'uf', 'cidade'].includes(c.tipo) && <span className={sheet.mut} style={notaOpcoes}>— não se aplica a {TIPOS_CAMPO.find((t) => t.valor === c.tipo)?.label.toLowerCase()}</span>}
        </td>
        <td className={sheet[EFEITOS[ef].cor]} title={EFEITOS[ef].ajuda}>
          {efeitosPermitidos.length > 1 && !removido ? (
            <select value={ef} onChange={(e) => upd(c.id, { efeito: e.target.value as EfeitoCampo })} style={{ fontWeight: 600 }}>
              {efeitosPermitidos.map((e) => (
                <option key={e} value={e}>{EFEITOS[e].label}</option>
              ))}
            </select>
          ) : (
            <span className={`${sheet.badge} ${sheet[EFEITOS[ef].cor]}`} style={{ margin: '0 10px' }}>{EFEITOS[ef].label}</span>
          )}
        </td>
        <td className={sheet.center}>
          <input type="checkbox" checked={c.obrigatorio} disabled={removido} onChange={(e) => upd(c.id, { obrigatorio: e.target.checked })} />
        </td>
        <td>
          <select value={c.largura} disabled={removido} onChange={(e) => upd(c.id, { largura: Number(e.target.value) as LarguraCampo })}>
            {LARGURAS.map((l) => (
              <option key={l.valor} value={l.valor}>{l.label}</option>
            ))}
          </select>
        </td>
        <td>
          <input value={c.ajuda} disabled={removido} placeholder="Explicação que aparece no ⓘ do campo" onChange={(e) => upd(c.id, { ajuda: e.target.value })} />
        </td>
        <td>
          <div className={sheet.acoes}>
            {removido ? (
              <button type="button" className={sheet.restaurar} style={{ width: 'auto' }} onClick={() => gravar([...ativos, { ...c, status: 'ativo' }, ...removidos.filter((x) => x.id !== c.id)])}>Restaurar</button>
            ) : (
              <button type="button" className={sheet.perigo} title="Remover campo (fica guardado para as propostas antigas)" onClick={() => upd(c.id, { status: 'inativo' })}><Trash2 /></button>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb="Cadastros"
        title="Dados da Operação"
        subtitle="Monte os campos que o Pricing mostra para esta empresa. Nada é fixo: cada campo tem um tipo, e você escolhe o que ele faz com o preço."
        action={
          <div className={s.acoes}>
            {empresaId && <SituacaoSalvamento situacao={auto.situacao} erro={auto.erro} onTentar={auto.tentarDeNovo} />}
            <label className={s.empresaSel}>
              Empresa
              <select value={empresaId} onChange={(e) => trocarEmpresa(e.target.value)} disabled={carregando}>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </label>
            {removidos.length > 0 && (
              <label className={ui.chip}>
                <input className={ui.chipCheck} type="checkbox" checked={mostrarRemovidos} onChange={(e) => setMostrarRemovidos(e.target.checked)} />
                {mostrarRemovidos ? 'Ocultar removidos' : `Removidos (${removidos.length})`}
              </label>
            )}
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => adicionar()} disabled={!empresaId}>
              <Plus /> Campo
            </button>
          </div>
        }
      />

      {auto.erroCarga && <div className={s.blocoVazio}>{auto.erroCarga}</div>}

      <div className={`${ui.card} ${s.previaCard}`}>
        <div className={s.previaTitulo}>
          <Eye size={14} /> Prévia · como fica no Pricing
          <small>Preencha para testar. Os campos com etiqueta mexem no preço; os demais só informam.</small>
        </div>
        <BlocoDadosOperacao campos={ativos} valores={valoresPrevia} onChange={(k, v) => setValoresPrevia((p) => ({ ...p, [k]: v }))} mostrarEfeito />
        <div className={s.legenda}>
          <span><i className={s.laranja} /> Multiplica o preço (número usado como quantidade)</span>
          <span><i className={s.verde} /> Soma ao custo (valor em R$, % sobre o custo)</span>
          <span><i className={s.cinza} /> Só informa</span>
        </div>
      </div>

      <div className={ui.card}>
        <div className={sheet.wrap}>
          <table className={sheet.sheet}>
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th style={{ minWidth: 200 }}>Campo</th>
                <th style={{ width: 170 }}>Tipo</th>
                <th style={{ minWidth: 220 }}>Opções / origem</th>
                <th style={{ width: 180 }}>
                  Efeito no preço <Hint text="Você escolhe: número pode multiplicar o preço (quantidade), valor pode somar ao custo, percentual pode ser aplicado sobre o custo. Texto, lista, cadastro e data só informam." />
                </th>
                <th style={{ width: 70 }} className={sheet.center}>Obrig.</th>
                <th style={{ width: 120 }}>Largura</th>
                <th style={{ minWidth: 200 }}>Ajuda (balão)</th>
                <th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {ativos.map((c, i) => linha(c, i, false))}
              {ativos.length === 0 && !auto.carregando && (
                <tr className={sheet.vazio}>
                  <td colSpan={9}>
                    <b>Nenhum campo ainda para esta empresa.</b> Clique em <b>+ Campo</b> e monte o bloco do seu jeito: cliente, cidade, quantidade, forma de cobrança...
                  </td>
                </tr>
              )}
              <tr className={sheet.addRow}>
                <td colSpan={9}>
                  <button type="button" onClick={() => adicionar()} disabled={!empresaId}><Plus /> Adicionar campo</button>
                </td>
              </tr>
              {mostrarRemovidos && removidos.map((c, i) => linha(c, i, true))}
            </tbody>
          </table>
        </div>
        <div className={s.dica}>
          <Lightbulb />
          <span>
            Grava sozinho a cada alteração. <kbd>Enter</kbd> no nome cria o campo seguinte; <kbd>Tab</kbd> anda pelas células. Remover um campo só o tira das próximas precificações: as propostas já feitas continuam mostrando o que foi preenchido.
          </span>
        </div>
      </div>
    </>
  )
}
