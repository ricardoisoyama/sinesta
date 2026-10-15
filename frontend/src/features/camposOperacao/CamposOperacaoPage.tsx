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
import { chaveCampos, listDadosOperacao, salvarDadosOperacao } from './api'
import { BlocoDadosOperacao } from './BlocoDadosOperacao'
import { SeletorTipoOperacao } from './SeletorTipoOperacao'
import {
  CADASTROS,
  EFEITOS,
  EFEITOS_POR_TIPO,
  LARGURAS,
  TIPOS_CAMPO,
  campoUfDaCidade,
  efeitoDe,
  idTipoPadrao,
  novoCampo,
  type CampoOperacao,
  type DadosOperacao,
  type EfeitoCampo,
  type LarguraCampo,
  type TipoCampoOperacao,
  type TipoOperacao,
  type ValoresOperacao,
} from './types'
import s from './camposOperacao.module.css'

const notaOpcoes = { padding: '0 10px', fontSize: 12 } as const

/** Chave única entre os ativos do MESMO tipo de operação (o servidor confere de novo). */
function comChaveUnica(lista: CampoOperacao[]): CampoOperacao[] {
  const usadasPorTipo = new Map<string, Set<string>>()
  return lista.map((c) => {
    if (c.status !== 'ativo') return c
    const usadas = usadasPorTipo.get(c.tipoOperacaoId) ?? new Set<string>()
    usadasPorTipo.set(c.tipoOperacaoId, usadas)
    const base = chaveDe(c.chave || c.nome) || 'campo'
    let k = base
    for (let n = 2; usadas.has(k); n++) k = `${base}_${n}`
    usadas.add(k)
    return k === c.chave ? c : { ...c, chave: k }
  })
}

/**
 * Cadastro de "Dados da operação": a empresa tem tipos de operação (Transporte, Armazenagem...)
 * e cada tipo tem os seus campos, uma linha por campo editada direto na tabela (como numa
 * planilha), com a prévia do bloco do Pricing logo acima. Grava sozinho a cada alteração.
 */
export function CamposOperacaoPage() {
  const { empresas, empresaId, setEmpresaId, carregando } = useEmpresaAtiva()
  const auto = useSalvamentoAutomatico<DadosOperacao>({
    chave: chaveCampos(empresaId),
    carregar: () => listDadosOperacao(empresaId),
    salvar: (dados) => salvarDadosOperacao(empresaId, dados),
    habilitado: !!empresaId,
  })
  // Empresa ainda sem tipos: começa com "Geral" (vira registro na primeira gravação).
  const tipoPadrao: TipoOperacao = { id: idTipoPadrao(empresaId), nome: 'Geral', status: 'ativo' }
  const dados = auto.dados ?? { tipos: [], campos: [] }
  const tipos = dados.tipos.length > 0 ? dados.tipos : [tipoPadrao]
  const tiposAtivos = tipos.filter((t) => t.status === 'ativo')
  const [tipoEscolhido, setTipoEscolhido] = useState('')
  const tipoId = tiposAtivos.some((t) => t.id === tipoEscolhido) ? tipoEscolhido : (tiposAtivos[0]?.id ?? '')
  const doTipo = (c: CampoOperacao) => c.tipoOperacaoId === tipoId

  const todos = dados.campos
  const camposDoTipo = todos.filter(doTipo)
  const ativos = camposDoTipo.filter((c) => c.status === 'ativo')
  const removidos = camposDoTipo.filter((c) => c.status !== 'ativo')
  const qtdCampos = (id: string) => todos.filter((c) => c.tipoOperacaoId === id && c.status === 'ativo').length
  const [mostrarRemovidos, setMostrarRemovidos] = useState(false)
  const [valoresPrevia, setValoresPrevia] = useState<ValoresOperacao>({})
  const [focoId, setFocoId] = useState('')

  const gravarDados = (d: DadosOperacao) => auto.alterar({ tipos: d.tipos, campos: comChaveUnica(d.campos) })
  /** Grava a lista do tipo escolhido; os campos dos outros tipos ficam como estão. */
  const gravar = (listaDoTipo: CampoOperacao[]) =>
    gravarDados({ tipos, campos: [...todos.filter((c) => !doTipo(c)), ...listaDoTipo.map((c) => ({ ...c, tipoOperacaoId: tipoId }))] })
  const upd = (id: string, patch: Partial<CampoOperacao>) => gravar(camposDoTipo.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  // ── tipos de operação ──
  const escolherTipo = (id: string) => {
    setTipoEscolhido(id)
    setValoresPrevia({})
  }
  const adicionarTipo = (nome: string) => {
    const novo: TipoOperacao = { id: crypto.randomUUID(), nome, status: 'ativo' }
    gravarDados({ tipos: [...tipos, novo], campos: todos })
    escolherTipo(novo.id)
  }
  const mudarTipo = (id: string, patch: Partial<TipoOperacao>) =>
    gravarDados({ tipos: tipos.map((t) => (t.id === id ? { ...t, ...patch } : t)), campos: todos })
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
    const novo = novoCampo('', 'texto', tipoId)
    const lista = [...ativos]
    lista.splice(apos === undefined ? lista.length : apos + 1, 0, novo)
    gravar([...lista, ...removidos])
    setFocoId(novo.id)
  }
  const trocarEmpresa = (id: string) => {
    setEmpresaId(id)
    setTipoEscolhido('')
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
        subtitle="Monte, para cada tipo de operação da empresa (Transporte, Armazenagem...), os campos que o Pricing mostra. Nada é fixo: cada campo tem um tipo, e você escolhe o que ele faz com o preço."
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
            {empresaId && (
              <SeletorTipoOperacao
                tipos={tipos}
                selecionadoId={tipoId}
                qtdCampos={qtdCampos}
                onSelecionar={escolherTipo}
                onAdicionar={adicionarTipo}
                onRenomear={(id, nome) => mudarTipo(id, { nome })}
                onStatus={(id, status) => mudarTipo(id, { status })}
              />
            )}
            {removidos.length > 0 && (
              <label className={ui.chip}>
                <input className={ui.chipCheck} type="checkbox" checked={mostrarRemovidos} onChange={(e) => setMostrarRemovidos(e.target.checked)} />
                {mostrarRemovidos ? 'Ocultar removidos' : `Removidos (${removidos.length})`}
              </label>
            )}
          </div>
        }
      />

      {auto.erroCarga && <div className={s.blocoVazio}>{auto.erroCarga}</div>}

      <div className={`${ui.card} ${s.previaCard}`}>
        <div className={s.previaTitulo}>
          <Eye size={14} /> Prévia · como fica no Pricing{tiposAtivos.length > 1 && ` (${tiposAtivos.find((t) => t.id === tipoId)?.nome})`}
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
                    <b>Nenhum campo ainda neste tipo de operação.</b> Clique em <b>+ Adicionar campo</b> e monte o bloco do seu jeito: cliente, cidade, quantidade, forma de cobrança...
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
