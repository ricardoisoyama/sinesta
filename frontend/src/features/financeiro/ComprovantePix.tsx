import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Landmark, Printer } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import ui from '@/features/common/ui.module.css'
import s from './financeiro.module.css'

/** Espelho do ComprovantePixDto: o banco devolve dados (não PDF); o comprovante é montado aqui. */
export interface ComprovantePixDados {
  movimentoId: string
  numero: number
  descricao: string
  valor: number
  efetivadoEm: string
  favorecido: string
  chave: string
  tipoChave: string
  banco: string
  empresa: string
  conta: string
  ambiente: string
  idPix: string
  codigoBanco: string
  agendadoPor: string
  agendadoEm: string
  confirmadoComo: string
  confirmadoEm: string
  emailSituacao: string
  emailPara: string
  emailEm: string
}

const TIPO_CHAVE: Record<string, string> = { cpf: 'CPF', cnpj: 'CNPJ', celular: 'Celular', email: 'E-mail', aleatoria: 'Chave aleatória' }

/** Data e hora local (o banco manda em UTC). */
const quando = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

const linhasDo = (c: ComprovantePixDados): [string, string][] => [
  ['Valor', formatBRL(c.valor)],
  ['Efetivado no banco em', quando(c.efetivadoEm)],
  ['Favorecido', c.favorecido],
  ['Chave Pix', `${c.chave}${c.tipoChave ? ` (${TIPO_CHAVE[c.tipoChave] ?? c.tipoChave})` : ''}`],
  ['Pago por', [c.empresa, c.banco, c.conta].filter(Boolean).join(' · ')],
  ['ID do Pix (fim a fim)', c.idPix || '—'],
  ['Código da solicitação no banco', c.codigoBanco || '—'],
  ['Referência', c.descricao],
  ['Agendado por', `${c.agendadoPor || '—'} em ${quando(c.agendadoEm)}`],
  ['Confirmação', `${c.confirmadoComo} em ${quando(c.confirmadoEm)}`],
  ['Aviso ao favorecido', c.emailSituacao ? `${c.emailSituacao}${c.emailPara ? ` para ${c.emailPara}` : ''} em ${quando(c.emailEm)}` : 'não enviado'],
]

const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)

/** Página limpa para imprimir ou salvar como PDF pelo navegador. */
function imprimir(c: ComprovantePixDados) {
  const w = window.open('', '_blank', 'width=720,height=860')
  if (!w) return
  const linhas = linhasDo(c).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante Pix · lançamento ${c.numero}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2a24; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #143d18; }
  p.sub { margin: 0 0 24px; color: #6b7b72; font-size: 13px; }
  .valor { font-size: 30px; font-weight: 700; color: #143d18; margin: 0 0 20px; font-variant-numeric: tabular-nums; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th { text-align: left; color: #6b7b72; font-weight: 600; padding: 9px 16px 9px 0; width: 38%; vertical-align: top; border-top: 1px solid #e6e3db; }
  td { padding: 9px 0; border-top: 1px solid #e6e3db; word-break: break-all; }
  footer { margin-top: 28px; font-size: 11px; color: #9aa39b; }
  ${c.ambiente !== 'producao' ? '.teste { color: #b5651d; font-weight: 700; }' : ''}
</style></head><body>
<h1>Comprovante de pagamento Pix</h1>
<p class="sub">Lançamento nº ${c.numero}${c.ambiente !== 'producao' ? ' · <span class="teste">AMBIENTE DE TESTE (sandbox)</span>' : ''}</p>
<div class="valor">${esc(formatBRL(c.valor))}</div>
<table>${linhas}</table>
<footer>Gerado pelo ELROND com os dados devolvidos pelo banco. O ID do Pix identifica a transação em qualquer banco.</footer>
<script>window.onload = () => window.print()</script>
</body></html>`)
  w.document.close()
}

/** Bloco do comprovante no lançamento pago por Pix pelo ELROND. */
export function ComprovantePix({ movimentoId }: { movimentoId: string }) {
  const { data: c, isLoading, isError } = useQuery({
    queryKey: ['financeiro', 'comprovante-pix', movimentoId],
    queryFn: () => apiFetch<ComprovantePixDados>(`/financeiro/movimentos/${encodeURIComponent(movimentoId)}/comprovante-pix`),
  })
  const [copiado, setCopiado] = useState(false)
  if (isLoading) return <p className={ui.cellMut}>Carregando o comprovante...</p>
  if (isError || !c) return <p className={ui.cellMut}>Comprovante indisponível.</p>
  const copiar = async () => {
    await navigator.clipboard.writeText(c.idPix)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1600)
  }
  return (
    <section className={ui.fsection}>
      <div className={ui.fsectionTitle}>
        <Landmark size={13} /> Comprovante do Pix <span className={ui.fsectionHint}>pago pelo ELROND</span>
      </div>
      <dl className={s.comprovante}>
        {linhasDo(c).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              {v}
              {k.startsWith('ID do Pix') && c.idPix && (
                <button type="button" className={ui.iconBtn} title="Copiar o ID do Pix" onClick={() => void copiar()}>
                  <Copy size={13} />
                </button>
              )}
              {k.startsWith('ID do Pix') && copiado && <span className={s.copiado}>copiado</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className={s.comprovanteAcoes}>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => imprimir(c)}>
          <Printer /> Imprimir comprovante
        </button>
        <span className={ui.cellMut}>Na impressão, escolha “Salvar como PDF” para guardar o arquivo.</span>
      </div>
    </section>
  )
}
