import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { formatBRL, formatPct } from '@/lib/format'
import type { FatorResultado } from './api'
import s from './fatorPainel.module.css'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const fator4 =(n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

interface Props {
  fator?: FatorResultado
  carregando?: boolean
  /** Mostra os links para Metas e Custos Fixos quando falta algo. */
  comLinks?: boolean
}

/**
 * Composição do fator (mesma conta da planilha): DF% + impostos + comissão + despesa
 * financeira + outras + lucro = markup; fator = 1 ÷ (1 − markup). Recalcula no servidor.
 */
export function FatorPainel({ fator: f, carregando, comLinks = true }: Props) {
  if (!f) return <div className={s.painel}><span className={s.mut}>{carregando ? 'Calculando o fator...' : 'Sem dados para calcular o fator.'}</span></div>
  const linha = (rotulo: string, valor: number, detalhe?: string) => (
    <div className={s.linha}>
      <span>{rotulo}{detalhe && <small>{detalhe}</small>}</span>
      <b>{formatPct(valor)}</b>
    </div>
  )
  return (
    <div className={`${s.painel} ${f.pronto ? '' : s.painelAviso}`}>
      <div className={s.topo}>
        <div>
          <span className={s.rotulo}>Fator (markup)</span>
          <div className={s.fator}>
            {f.pronto ? fator4(f.fator) : '—'}
            {carregando && <Loader2 className={s.gira} aria-label="Recalculando" />}
          </div>
          <span className={s.sub}>preço = custo × fator</span>
        </div>
        <div className={s.markup}>
          <span className={s.rotulo}>Markup</span>
          <b>{formatPct(f.markup)}</b>
          <span className={s.sub}>DF + DV + lucro</span>
        </div>
      </div>

      {!f.pronto && f.aviso && (
        <div className={s.aviso}>
          <AlertTriangle size={15} />
          <span>
            {f.aviso}
            {comLinks && !f.metaId && <> <Link to="/analises/metas">Abrir Metas</Link></>}
          </span>
        </div>
      )}

      <div className={s.lista}>
        {linha(
          'Despesa fixa (DF)',
          f.dfPct,
          f.faturamentoMensal <= 0
            ? `${formatBRL(f.totalDf)} de fixos · sem meta de ${MESES[f.mes - 1] ?? ''}/${f.ano}`
            : f.basePreco === 'media'
              ? `${formatBRL(f.totalDf)} de fixos ÷ ${formatBRL(f.faturamentoMensal)} (média mensal da meta de ${f.ano}); igual o ano todo`
              : `${formatBRL(f.totalDf)} de fixos ÷ ${formatBRL(f.faturamentoMensal)} de meta de ${MESES[f.mes - 1]}/${f.ano}; muda a cada mês`,
        )}
        {linha('Impostos', f.impostos, f.impostosDoCadastro ? 'detalhados na aba Impostos' : f.impostos > 0 ? 'total informado na aba Impostos' : 'nenhum informado na aba Impostos')}
        {linha('Comissão', f.comissoes, f.comissoes !== f.comissoesPadrao ? `padrão ${formatPct(f.comissoesPadrao)}, ajustada nesta operação` : 'padrão; ajustável no Pricing')}
        {linha('Despesa financeira', f.despFinanceira)}
        {f.outras > 0 && linha('Outras despesas', f.outras)}
        {linha('Lucro líquido', f.lucro, f.lucro !== f.lucroPadrao ? `da empresa ${formatPct(f.lucroPadrao)}, ajustado nesta operação` : undefined)}
        <div className={`${s.linha} ${s.total}`}>
          <span>Markup</span>
          <b>{formatPct(f.markup)}</b>
        </div>
      </div>
      <div className={s.formula}>
        Fator = 1 ÷ (1 − {formatPct(f.markup)}) {f.pronto && <>= <b>{fator4(f.fator)}</b></>}
        {comLinks && <> · <Link to="/cadastros/custos-fixos">despesas fixas</Link></>}
      </div>
    </div>
  )
}
