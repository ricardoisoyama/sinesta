import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Eye, FileText, Mail, Receipt } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { avisar } from '@/features/common/dialogo/dialogo'
import { getErrorMessage } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { listCategoriasCusto } from '@/features/cadastros/api'
import { listCarteiras } from '@/features/financeiro/api'
import { carteiraDaEmpresa } from '@/features/financeiro/types'
import { usePlanoContas } from '@/features/planoContas/store'
import { PlanoContaBusca } from '@/features/planoContas/PlanoContaBusca'
import { dataBR } from '@/features/contratos/regras'
import { abrirPreviaFatura, faturar, sugerirFatura, type FaturarDados, type SugestaoFatura } from './faturasClientes'
import type { DocumentoFaturavel } from './pendentes'
import s from './faturamento.module.css'

interface Props {
  documentos: DocumentoFaturavel[]
  nomeEmpresa: (id: string) => string
  onClose: () => void
  onFaturado: () => void
}

const REGRA: Record<SugestaoFatura['vencimentoRegra'], string> = {
  manter: 'mantém no fim de semana',
  antecipar: 'antecipa o fim de semana para sexta',
  postergar: 'posterga o fim de semana para segunda',
}
const fimDeSemana = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`)
  return d.getDay() === 0 || d.getDay() === 6
}

/**
 * Faturar os CT-es ou minutas escolhidos: o servidor sugere os padrões (vencimento pelo prazo e pela
 * regra de fim de semana do cliente, centro de custo do cliente, plano e conta da empresa) e confere
 * tudo antes. "Ver prévia" abre o PDF sem gravar; "Faturar" numera, lança, emite o boleto e envia.
 */
export function FaturarModal({ documentos, nomeEmpresa, onClose, onFaturado }: Props) {
  const ids = documentos.map((d) => d.id)
  const [sugestao, setSugestao] = useState<SugestaoFatura | null>(null)
  const [erroSugestao, setErroSugestao] = useState<string | null>(null)
  const [d, setD] = useState<FaturarDados>({ documentoIds: ids, enviar: true, adicional: 0, desconto: 0, observacao: '' })
  const [gravando, setGravando] = useState(false)
  const [abrindoPrevia, setAbrindoPrevia] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { data: categorias } = useQuery({ queryKey: ['categorias-custo'], queryFn: listCategoriasCusto })
  const { data: carteiras } = useQuery({ queryKey: ['carteiras'], queryFn: listCarteiras })
  const { contas: planoContas } = usePlanoContas()

  useEffect(() => {
    let vivo = true
    sugerirFatura({ documentoIds: ids })
      .then((r) => {
        if (!vivo) return
        setSugestao(r)
        setD((x) => ({ ...x, vencimento: r.vencimento, centroCustoId: r.centroCustoId, planoContaId: r.planoContaId, carteiraId: r.carteiraId }))
      })
      .catch((e) => vivo && setErroSugestao(getErrorMessage(e)))
    return () => {
      vivo = false
    }
    // Os documentos não mudam com o modal aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (p: Partial<FaturarDados>) => setD((x) => ({ ...x, ...p }))
  const total = (sugestao?.valor ?? 0) + (d.adicional ?? 0) - (d.desconto ?? 0)
  const contas = (carteiras ?? []).filter((c) => c.status === 'ativo' && !!sugestao && carteiraDaEmpresa(c, sugestao.empresaId))
  const tipo = sugestao?.tipo ?? documentos[0]?.tipo ?? 'cte'

  const previa = async () => {
    setAbrindoPrevia(true)
    try {
      await abrirPreviaFatura(d)
    } catch (e) {
      void avisar({ titulo: 'Não foi possível gerar a prévia', mensagem: getErrorMessage(e) })
    } finally {
      setAbrindoPrevia(false)
    }
  }

  const confirmar = async () => {
    setErro(null)
    setGravando(true)
    try {
      const r = await faturar(d)
      onFaturado()
      void avisar({
        titulo: `Fatura ${r.fatura.fatura.numero} emitida`,
        mensagem: r.avisos.length ? r.avisos.join('\n') : d.enviar ? 'Lançamento a receber criado, boleto emitido e e-mail enviado aos contatos do cliente.' : 'Lançamento a receber criado e boleto emitido. O e-mail pode ser enviado pela lista de faturas.',
      })
    } catch (e) {
      setErro(getErrorMessage(e))
    } finally {
      setGravando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={sugestao ? `Faturar ${sugestao.clienteNome}` : 'Faturar'}
      subtitle={sugestao ? `${nomeEmpresa(sugestao.empresaId)} · fatura nº ${sugestao.numeroProvavel} (provável) · ${documentos.length} ${tipo === 'cte' ? 'CT-e(s)' : 'minuta(s)'}` : 'Conferindo os documentos...'}
      icon={<Receipt />}
      maxWidth={860}
      error={erro ?? erroSugestao}
      busy={gravando}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => void previa()} disabled={!sugestao || abrindoPrevia}>
            <Eye /> {abrindoPrevia ? 'Gerando...' : 'Ver prévia (PDF)'}
          </button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void confirmar()} disabled={!sugestao || gravando}>
            <FileText /> {gravando ? 'Faturando...' : `Faturar ${formatBRL(total)}`}
          </button>
        </>
      }
    >
      {!sugestao && !erroSugestao && <p className={ui.cellMut}>Lendo os documentos e os padrões do cliente e da empresa...</p>}
      {sugestao && (
        <>
          <div className={s.comp}>
            {documentos.map((doc) => (
              <div key={doc.id} className={s.compLinha}>
                <span>
                  {doc.tipo === 'cte' ? 'CT-e' : 'Minuta'} {doc.numero}
                  {doc.tipo === 'minuta' && doc.nfseNumero ? ` · NFS-e ${doc.nfseNumero}` : ''} <small>{dataBR(doc.tipo === 'cte' ? doc.emissao : doc.criadoEm)}</small>
                </span>
                <b>{formatBRL(doc.valor)}</b>
              </div>
            ))}
            <div className={`${s.compLinha} ${s.compTotal}`}>
              <span>Total da fatura</span>
              <b>{formatBRL(total)}</b>
            </div>
          </div>

          {sugestao.avisos.length > 0 && (
            <div className={s.faturarAvisos}>
              {sugestao.avisos.map((a) => (
                <p key={a}><AlertTriangle size={14} /> {a}</p>
              ))}
            </div>
          )}

          <div className={ui.grid} style={{ marginTop: 16 }}>
            <Field label="Vencimento" req hint={`Prazo do cliente; a regra dele ${REGRA[sugestao.vencimentoRegra]} (cadastro do cliente › Comercial).`}>
              <input type="date" value={d.vencimento ?? ''} onChange={(e) => set({ vencimento: e.target.value })} />
              {d.vencimento && fimDeSemana(d.vencimento) && <span className={s.alertaCelula}>Cai no fim de semana.</span>}
            </Field>
            <Field label="Centro de custo" hint="Vem do cadastro do cliente.">
              <select value={d.centroCustoId ?? ''} onChange={(e) => set({ centroCustoId: e.target.value })}>
                <option value="">Nenhum</option>
                {(categorias ?? []).filter((c) => c.status === 'ativo').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field className={ui.col2} label="Plano de contas" req hint={`Padrão da empresa para fatura de ${tipo === 'cte' ? 'CT-e' : 'minuta'} (Empresa › Faturamento).`}>
              <PlanoContaBusca
                value={d.planoContaId ?? ''}
                onChange={(id) => set({ planoContaId: id })}
                contas={planoContas}
                permitida={(c) => c.grupoDre === 'Receita' && c.status === 'ativo'}
                vazio="Escolha"
              />
            </Field>
            <Field className={ui.col2} label="Conta que recebe" req hint="A conta do boleto (padrão em Empresa › Faturamento).">
              <select value={d.carteiraId ?? ''} onChange={(e) => set({ carteiraId: e.target.value })}>
                <option value="">Escolha</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Adicional">
              <MoneyInput value={d.adicional ?? 0} onChange={(n) => set({ adicional: n })} />
            </Field>
            <Field label="Desconto">
              <MoneyInput value={d.desconto ?? 0} onChange={(n) => set({ desconto: n })} />
            </Field>
            <Field className={ui.col4} label="Observação (interna)">
              <input value={d.observacao ?? ''} onChange={(e) => set({ observacao: e.target.value })} placeholder="Fica no lançamento a receber" />
            </Field>
          </div>

          <div className={s.faturarEnvio}>
            <label className={s.faturarCheck}>
              <input type="checkbox" checked={!!d.enviar} onChange={(e) => set({ enviar: e.target.checked })} />
              <Mail size={15} /> Enviar por e-mail agora
            </label>
            {sugestao.destinatarios.length === 0 ? (
              <span className={s.alertaCelula}>Nenhum contato do cliente marcado para receber (cadastro do cliente › Contatos).</span>
            ) : (
              <ul className={s.faturarDest}>
                {sugestao.destinatarios.map((c) => (
                  <li key={c.email}>
                    <b>{c.nome || c.email}</b> <span>{c.email}</span>
                    <small>{[c.boleto && 'boleto', c.fatura && 'fatura', c.notaFiscal && (tipo === 'cte' ? 'CT-e' : 'NFS-e')].filter(Boolean).join(' · ')}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
