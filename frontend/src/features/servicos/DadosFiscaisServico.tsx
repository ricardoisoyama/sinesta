import { useState } from 'react'
import { Copy, Info, Plus, Trash2 } from 'lucide-react'
import { Field } from '@/features/common/Field'
import { PercentInput } from '@/features/common/PercentInput'
import { BuscaOpcoes } from '@/features/common/BuscaOpcoes'
import ui from '@/features/common/ui.module.css'
import { formatPct } from '@/lib/format'
import type { Unidade } from '@/features/unidades/types'
import { CSTS_PIS_COFINS, TRIBUTACOES_ISS, novoFiscal, opcoesFiscais, useTabelasFiscais, type ServicoFiscal } from './fiscal'
import s from './servicos.module.css'

interface Props {
  value: ServicoFiscal[]
  onChange: (v: ServicoFiscal[]) => void
  empresas: Unidade[]
}

/**
 * Dados fiscais do serviço (NFS-e), um bloco por empresa emitente. As tabelas oficiais sugerem a NBS, o
 * indicador da operação e a classificação tributária pelo item da LC 116. A alíquota do ISS vem dos impostos do serviço; as retenções, da empresa.
 */
export function DadosFiscaisServico({ value, onChange, empresas }: Props) {
  const { data: tabelas, isLoading } = useTabelasFiscais()
  const [empresaId, setEmpresaId] = useState(() => value[0]?.empresaId ?? empresas[0]?.id ?? '')
  const atual = value.find((f) => f.empresaId === empresaId)
  const empresa = empresas.find((e) => e.id === empresaId)
  const opcoes = tabelas ? opcoesFiscais(tabelas) : null
  const sugestao = tabelas && atual?.itemLc116 ? tabelas.correlacao[atual.itemLc116] : undefined

  const mudar = (p: Partial<ServicoFiscal>) => onChange(value.map((f) => (f.empresaId === empresaId ? { ...f, ...p } : f)))
  const criar = (copiarDe?: ServicoFiscal) =>
    onChange([...value.filter((f) => f.empresaId !== empresaId), copiarDe ? { ...copiarDe, empresaId, codigoMunicipal: '' } : novoFiscal(empresaId)])
  const remover = () => onChange(value.filter((f) => f.empresaId !== empresaId))

  /** Escolher o item da lista nacional preenche o item da LC 116 e, se vazia, a descrição. */
  const escolherItem = (codigo: string) => {
    const linha = tabelas?.lista.find((l) => l[0] === codigo)
    if (!linha) return mudar({ codigoNacional: '', itemLc116: '' })
    mudar({ codigoNacional: codigo, itemLc116: linha[1], descricao: atual?.descricao || linha[2] })
  }
  const escolherClassificacao = (codigo: string) =>
    mudar({ classificacaoTributaria: codigo, cstIbsCbs: codigo ? (tabelas?.cclasstrib.find((g) => g.itens.some((i) => i[0] === codigo))?.cst ?? codigo.slice(0, 3)) : '' })

  const ret = (nome: string, i?: { aliquota: number; retido: boolean }) => (i?.retido ? `${nome}${i.aliquota > 0 ? ` ${formatPct(i.aliquota)}` : ''}` : '')
  const daEmpresa = empresa
    ? [ret('ISS', empresa.iss), ret('PIS', empresa.pis), ret('COFINS', empresa.cofins), ret('CSLL', empresa.csll), ret('INSS', empresa.inss), ret('IR', empresa.ir)].filter(Boolean).join(' · ')
    : ''

  return (
    <div className={s.fiscal}>
      <div className={s.empresas} role="tablist" aria-label="Empresa emitente">
        {empresas.map((e) => {
          const tem = value.find((f) => f.empresaId === e.id)
          return (
            <button key={e.id} type="button" role="tab" aria-selected={e.id === empresaId} className={`${s.empresa} ${e.id === empresaId ? s.empresaOn : ''}`} onClick={() => setEmpresaId(e.id)}>
              {e.nome} <small className={tem ? (tem.ativo ? s.ok : s.off) : s.vazio}>{tem ? (tem.ativo ? 'configurado' : 'inativo') : 'sem dados'}</small>
            </button>
          )
        })}
      </div>

      {!atual ? (
        <div className={s.semDados}>
          <p>Este serviço ainda não sai na NFS-e da {empresa?.nome ?? 'empresa'}.</p>
          <div className={s.semDadosAcoes}>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => criar()} disabled={!empresaId}><Plus /> Configurar para esta empresa</button>
            {value.length > 0 && (
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => criar(value[0])}><Copy /> Copiar da {empresas.find((e) => e.id === value[0].empresaId)?.nome}</button>
            )}
          </div>
        </div>
      ) : isLoading || !opcoes ? (
        <p className={ui.cellMut}>Carregando as tabelas oficiais...</p>
      ) : (
        <>
          <div className={s.daEmpresa}>
            <Info size={14} /> <span>A alíquota do ISS vem dos impostos deste serviço (acima). Da empresa vêm as retenções (Empresa › Regime e retenções): {daEmpresa || 'nenhuma retenção marcada'}. Inscrição municipal e regime também.</span>
          </div>
          <div className={ui.grid}>
            <Field className={ui.col4} label="Item do serviço (lista nacional / LC 116)" req hint="Tabela oficial da NFS-e Nacional. Escolher o item sugere a NBS, o indicador da operação e a classificação tributária.">
              <BuscaOpcoes id={`item-${empresaId}`} value={atual.codigoNacional} onChange={escolherItem} opcoes={opcoes.itens} placeholder="Ex.: 11.04 armazenamento" />
            </Field>
            <Field className={ui.col4} label="Descrição da atividade" req hint="Texto que sai na nota antes da referência da fatura.">
              <input value={atual.descricao} onChange={(e) => mudar({ descricao: e.target.value })} placeholder="Ex.: Armazenamento, depósito, carga e descarga" />
            </Field>
            <Field label="Cód. tributação municipal" req hint="Código do serviço na prefeitura da empresa (ex.: 370407).">
              <input value={atual.codigoMunicipal} onChange={(e) => mudar({ codigoMunicipal: e.target.value.trim() })} placeholder="Ex.: 370407" />
            </Field>
            <Field label="CNAE" hint="CNAE da atividade (7 dígitos).">
              <input value={atual.cnae} onChange={(e) => mudar({ cnae: e.target.value.replace(/\D/g, '').slice(0, 7) })} placeholder="Ex.: 5211701" inputMode="numeric" />
            </Field>
            <Field className={ui.col2} label="Código NBS" req hint="Nomenclatura Brasileira de Serviços. Os sugeridos vêm da tabela oficial de correlação com o item.">
              <BuscaOpcoes id={`nbs-${empresaId}`} value={atual.nbs} onChange={(v) => mudar({ nbs: v })} opcoes={opcoes.nbs} sugeridos={sugestao?.[0]} placeholder="Ex.: 1.0601.10.00" />
            </Field>
            <Field className={ui.col2} label="Onde o ISS é devido">
              <select value={atual.tributacaoIss} onChange={(e) => mudar({ tributacaoIss: e.target.value as ServicoFiscal['tributacaoIss'] })}>
                {TRIBUTACOES_ISS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
              </select>
            </Field>
            <Field className={ui.col2} label="PIS/COFINS - CST" hint="Vazio = o padrão do emissor.">
              <select value={atual.cstPisCofins} onChange={(e) => mudar({ cstPisCofins: e.target.value })}>
                <option value="">Padrão do emissor</option>
                {CSTS_PIS_COFINS.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
              </select>
            </Field>
          </div>

          <div className={ui.fsectionTitle} style={{ marginTop: 14 }}>
            Reforma tributária <span className={ui.fsectionHint}>IBS e CBS: obrigatório para Lucro Presumido e Real</span>
          </div>
          <div className={ui.grid}>
            <Field className={ui.col2} label="Indicador da operação (cIndOp)" hint="Define o local da operação (para qual município e UF vai o IBS). Tabela oficial: Anexo VII da NFS-e Nacional.">
              <BuscaOpcoes id={`indop-${empresaId}`} value={atual.indicadorOperacao} onChange={(v) => mudar({ indicadorOperacao: v })} opcoes={opcoes.indop} sugeridos={sugestao?.[1]} vazio="Nenhum" />
            </Field>
            <Field className={ui.col2} label="CST / Classificação tributária (cClassTrib)" hint="Tabela oficial da Receita (Conformidade Fácil), agrupada por CST.">
              <BuscaOpcoes id={`class-${empresaId}`} value={atual.classificacaoTributaria} onChange={escolherClassificacao} opcoes={opcoes.cclass} sugeridos={sugestao?.[2]} vazio="Nenhuma" />
            </Field>
          </div>

          <div className={ui.fsectionTitle} style={{ marginTop: 14 }}>
            Lei da Transparência e valores <span className={ui.fsectionHint}>carga aproximada que sai na nota</span>
          </div>
          <div className={ui.grid}>
            <Field label="Alíquota aproximada" hint="Carga tributária aproximada do serviço (Lei 12.741). Zero = não sai na nota.">
              <PercentInput value={atual.transparenciaAliquota} onChange={(n) => mudar({ transparenciaAliquota: n })} />
            </Field>
            <Field label="Fonte">
              <input value={atual.transparenciaFonte} onChange={(e) => mudar({ transparenciaFonte: e.target.value })} placeholder="Ex.: IBPT" />
            </Field>
            <div className={`${ui.col2} ${s.marcas}`}>
              <label className={ui.checkItem}>
                <input type="checkbox" checked={atual.descontarImpostos} onChange={(e) => mudar({ descontarImpostos: e.target.checked })} /> Descontar as retenções do total
              </label>
              <label className={ui.checkItem}>
                <input type="checkbox" checked={atual.issNoLiquido} onChange={(e) => mudar({ issNoLiquido: e.target.checked })} /> Incluir ISS no valor líquido
              </label>
              <label className={ui.checkItem}>
                <input type="checkbox" checked={atual.ativo} onChange={(e) => mudar({ ativo: e.target.checked })} /> Ativo para esta empresa
              </label>
            </div>
          </div>
          <div className={s.rodapeFiscal}>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={remover}><Trash2 /> Tirar os dados fiscais desta empresa</button>
          </div>
        </>
      )}
    </div>
  )
}
