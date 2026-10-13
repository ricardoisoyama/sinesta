import { CheckCircle2, X } from 'lucide-react'
import { PercentInput } from '@/features/common/PercentInput'
import ui from '@/features/common/ui.module.css'
import { formatBRL, formatPct } from '@/lib/format'
import { conferirRateio, dividirIgual, somaRateio } from './regras'
import type { RateioEmpresa } from './types'
import s from './rateio.module.css'

interface Props {
  rateio: RateioEmpresa[]
  onChange: (rateio: RateioEmpresa[]) => void
  /** Empresa que paga a conta ("Empresa que paga" do formulário): sempre faz parte do rateio. */
  pagadoraId: string
  empresas: { id: string; nome: string }[]
  valorMensal: number
}

/**
 * Rateio da despesa entre empresas: cada uma leva a sua parte para a DF (e o markup) dela.
 * Desligado, a despesa é inteira da empresa que paga. Ligado, a que paga fica sempre na lista
 * e os percentuais precisam fechar 100% (o formulário não salva antes disso).
 */
export function RateioEmpresas({ rateio, onChange, pagadoraId, empresas, valorMensal }: Props) {
  const ligado = rateio.length > 0
  const nome = (id: string) => empresas.find((e) => e.id === id)?.nome ?? 'empresa removida'
  const nomePagadora = pagadoraId ? nome(pagadoraId) : ''

  // A que paga vem primeiro; as outras na ordem em que entraram.
  const linhas = [...rateio].sort((a, b) => Number(b.empresaId === pagadoraId) - Number(a.empresaId === pagadoraId))
  const disponiveis = empresas.filter((e) => !rateio.some((r) => r.empresaId === e.id))
  const total = somaRateio(rateio)
  const problema = conferirRateio(rateio, pagadoraId)

  const ligar = () => onChange(ligado ? [] : [{ empresaId: pagadoraId, percentual: 1 }])
  const mudar = (empresaId: string, percentual: number) =>
    onChange(rateio.map((r) => (r.empresaId === empresaId ? { ...r, percentual } : r)))
  const remover = (empresaId: string) => onChange(rateio.filter((r) => r.empresaId !== empresaId))
  const adicionar = (empresaId: string) => empresaId && onChange([...rateio, { empresaId, percentual: 0 }])

  return (
    <section className={`${ui.fsection} ${ligado ? s.ativo : ''}`}>
      <div className={s.topo}>
        <div className={ui.fsectionTitle} style={{ border: 'none', margin: 0, padding: 0 }}>
          Rateio entre empresas <span className={ui.fsectionHint}>a parte de cada uma entra na DF e no markup dela</span>
        </div>
        <button type="button" className={s.chave} onClick={ligar} disabled={!pagadoraId} aria-pressed={ligado}>
          <span className={`${s.sw} ${ligado ? s.swOn : ''}`}><span className={s.swDot} /></span>
          Ratear entre empresas
        </button>
      </div>

      {!ligado && (
        <div className={s.semRateio}>
          {pagadoraId ? (
            <>
              Sem rateio: os <b>{formatBRL(valorMensal)}</b> entram inteiros na DF da <b>{nomePagadora}</b>.
            </>
          ) : (
            'Escolha a empresa que paga para poder ratear.'
          )}
        </div>
      )}

      {ligado && (
        <>
          <div className={s.grade} role="table" aria-label="Rateio entre empresas">
            <div className={`${s.linha} ${s.cabecalho}`} role="row">
              <span role="columnheader">Empresa</span>
              <span role="columnheader" className={s.dir}>Percentual</span>
              <span role="columnheader" className={s.dir}>Valor no mês</span>
              <span role="columnheader" aria-label="Ações" />
            </div>
            {linhas.map((r) => {
              const paga = r.empresaId === pagadoraId
              return (
                <div key={r.empresaId} className={s.linha} role="row">
                  <span className={s.empresa} role="cell">
                    {nome(r.empresaId)}
                    {paga && <span className={s.selo}>paga a conta</span>}
                  </span>
                  <span className={s.pct} role="cell">
                    <PercentInput value={r.percentual} onChange={(n) => mudar(r.empresaId, n)} invalid={!(r.percentual > 0)} />
                  </span>
                  <span className={s.dir} role="cell">{formatBRL(valorMensal * r.percentual)}</span>
                  <span role="cell" className={s.acoes}>
                    {!paga && (
                      <button type="button" className={ui.iconBtn} onClick={() => remover(r.empresaId)} aria-label={`Tirar ${nome(r.empresaId)} do rateio`} title="Tirar do rateio">
                        <X size={15} />
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
            <div className={`${s.linha} ${s.rodape}`} role="row">
              <span role="cell">Total</span>
              <span role="cell" className={`${s.dir} ${problema ? s.ruim : s.bom}`}>{formatPct(total)}</span>
              <span role="cell" className={s.dir}>{formatBRL(valorMensal * total)}</span>
              <span role="cell" />
            </div>
          </div>

          <div className={s.acoesRodape}>
            {disponiveis.length > 0 && (
              <select className={s.adicionar} value="" onChange={(e) => adicionar(e.target.value)} aria-label="Adicionar empresa ao rateio">
                <option value="">+ Adicionar empresa</option>
                {disponiveis.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            )}
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => onChange(dividirIgual(linhas))} disabled={rateio.length < 2}>
              Dividir igual
            </button>
            <span className={s.espaco} />
            {problema ? (
              <span className={s.ruim} role="status">{problema}</span>
            ) : (
              <span className={s.bom} role="status"><CheckCircle2 size={15} /> Fecha em 100%</span>
            )}
          </div>
        </>
      )}
    </section>
  )
}
