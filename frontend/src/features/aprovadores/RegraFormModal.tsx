import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Search, X } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { PercentInput } from '@/features/common/PercentInput'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { useUsuarios } from '@/features/usuarios/store'
import { listFornecedores, listVendedores } from '@/features/cadastros/api'
import { BASES_COMISSAO, type ComissaoBase } from '@/features/parceiros/types'
import { semAcento } from '@/lib/texto'
import { BASES_REGRA, TIPOS_REGRA, regraVazia, tipoDaRegra, type BaseRegra, type RegraAprovacao, type TipoRegra } from './types'
import s from './aprovadores.module.css'

interface Props {
  open: boolean
  initial?: RegraAprovacao | null
  error?: string | null
  busy?: boolean
  onClose: () => void
  onSave: (data: RegraAprovacao) => void
}

/** Lista de funcionários com busca e checkbox (aguenta dezenas de nomes). */
function ListaFuncionarios({
  selecionados,
  onToggle,
  candidatos,
}: {
  selecionados: string[]
  onToggle: (id: string) => void
  candidatos: { id: string; nome: string; cargo?: string; perfil?: string }[]
}) {
  const [busca, setBusca] = useState('')
  const termo = semAcento(busca)
  const filtrados = termo
    ? candidatos.filter((u) => semAcento(u.nome).includes(termo) || semAcento(u.cargo ?? '').includes(termo))
    : candidatos
  const marcados = candidatos.filter((u) => selecionados.includes(u.id))
  return (
    <>
      {marcados.length > 0 && (
        <div className={s.chips}>
          {marcados.map((u) => (
            <span key={u.id} className={s.chip}>
              {u.nome}
              <button type="button" onClick={() => onToggle(u.id)} aria-label={`Remover ${u.nome}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={s.buscaWrap}>
        <Search size={15} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar funcionário por nome ou cargo..." />
      </div>
      <div className={s.lista}>
        {filtrados.map((u) => {
          const on = selecionados.includes(u.id)
          return (
            <label key={u.id} className={`${s.linha} ${on ? s.linhaOn : ''}`}>
              <input type="checkbox" checked={on} onChange={() => onToggle(u.id)} />
              <span className={s.linhaNome}>{u.nome}</span>
              <span className={s.linhaCargo}>{u.cargo || u.perfil}</span>
            </label>
          )
        })}
        {filtrados.length === 0 && <div className={s.listaVazia}>Nenhum funcionário encontrado.</div>}
      </div>
      <div className={s.contador}>
        {selecionados.length} de {candidatos.length} selecionado(s)
      </div>
    </>
  )
}

export function RegraFormModal({ open, initial, error, busy, onClose, onSave }: Props) {
  const { usuarios } = useUsuarios()
  const { data: fornecedoresData } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores })
  const { data: vendedoresData } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores })
  const [d, setD] = useState<RegraAprovacao>(regraVazia)
  const [buscaForn, setBuscaForn] = useState('')
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setD(initial ? { ...regraVazia(), ...initial, tipo: tipoDaRegra(initial), excecoes: initial.excecoes ?? [] } : regraVazia())
      setBuscaForn('')
      setErroLocal(null)
    }
  }, [open, initial])

  const set = (patch: Partial<RegraAprovacao>) => setD((cur) => ({ ...cur, ...patch }))
  const alternar = (campo: 'aprovadores' | 'excecoes', id: string) =>
    set({ [campo]: d[campo].includes(id) ? d[campo].filter((a) => a !== id) : [...d[campo], id] })

  const candidatos = usuarios.filter((u) => u.status === 'ativo')
  const fornecedores = (fornecedoresData ?? []).filter((f) => f.status === 'ativo')
  const vendedores = (vendedoresData ?? []).filter((v) => v.status === 'ativo')
  const termoForn = semAcento(buscaForn)
  const digitos = termoForn.replace(/\D/g, '')
  const fornFiltrados = termoForn
    ? fornecedores.filter(
        (f) =>
          semAcento(f.nome).includes(termoForn) ||
          semAcento(f.nomeFantasia).includes(termoForn) ||
          (digitos.length >= 3 && f.cpfCnpj.replace(/\D/g, '').includes(digitos)),
      )
    : []
  const tipoInfo = TIPOS_REGRA.find((t) => t.valor === d.tipo)

  const submit = () => {
    if (d.nome.trim().length < 2) return setErroLocal('Informe o nome da regra.')
    if (d.tipo === 'proposta') {
      if (d.ate > 0 && d.ate < d.de) return setErroLocal('O fim da faixa não pode ser menor que o início.')
      if (d.aprovadores.length === 0) return setErroLocal('Escolha ao menos um aprovador.')
    }
    if (d.tipo === 'compras') {
      if (!d.compradorId) return setErroLocal('Escolha o comprador.')
      if (d.limite <= 0) return setErroLocal('Informe o limite de compra.')
      if (d.aprovadores.length === 0) return setErroLocal('Escolha quem aprova acima do limite.')
    }
    if (d.tipo === 'movimento') {
      if (d.ate > 0 && d.ate < d.de) return setErroLocal('O fim da faixa não pode ser menor que o início.')
      if (d.aprovadores.length === 0) return setErroLocal('Escolha ao menos um aprovador.')
    }
    if (d.tipo === 'comissao' && !d.vendedorId) return setErroLocal('Escolha o vendedor.')
    setErroLocal(null)
    onSave(d.tipo === 'movimento' ? { ...d, base: 'valor' } : d)
  }

  const Faixa = d.base === 'margem' ? PercentInput : MoneyInput

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Regra"
      subtitle={initial ? 'Editar regra' : 'Nova regra'}
      icon={<ShieldCheck />}
      maxWidth={720}
      error={error ?? erroLocal}
      busy={busy}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={submit}>
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className={ui.topRow}>
        <span className={ui.modalNote}>{tipoInfo?.descricao}</span>
        <StatusToggle value={d.status !== 'inativo'} onChange={(v) => set({ status: v ? 'ativo' : 'inativo' })} />
      </div>

      <section className={ui.fsection}>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Tipo de regra" req hint="O tipo define o que a regra governa e quais campos aparecem abaixo.">
            <select value={d.tipo} onChange={(e) => set({ tipo: e.target.value as TipoRegra, de: 0, ate: 0 })} disabled={!!initial}>
              {TIPOS_REGRA.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field className={ui.col2} label="Nome da regra" req>
            <input
              value={d.nome}
              onChange={(e) => set({ nome: e.target.value })}
              placeholder={d.tipo === 'compras' ? 'Ex.: Compras do João até R$ 5.000' : d.tipo === 'comissao' ? 'Ex.: Comissão padrão vendas' : d.tipo === 'movimento' ? 'Ex.: Pagamentos até R$ 10.000' : 'Ex.: Margem abaixo de 5%'}
            />
          </Field>

          {d.tipo === 'proposta' && (
            <>
              <Field className={ui.col2} label="Faixa medida por" req hint="Margem usa a margem líquida média da proposta. Valor usa o total da proposta.">
                <select value={d.base} onChange={(e) => set({ base: e.target.value as BaseRegra, de: 0, ate: 0 })}>
                  {BASES_REGRA.map((b) => (
                    <option key={b.valor} value={b.valor}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="De">
                <Faixa value={d.de} onChange={(v) => set({ de: v })} />
              </Field>
              <Field label="Até" hint="Deixe zero para dizer “daqui para cima”.">
                <Faixa value={d.ate} onChange={(v) => set({ ate: v })} />
              </Field>
            </>
          )}

          {d.tipo === 'movimento' && (
            <>
              <Field className={ui.col2} label="Vale para" hint="A pagar, a receber ou os dois.">
                <select value={d.tipoMovimento ?? ''} onChange={(e) => set({ tipoMovimento: e.target.value as RegraAprovacao['tipoMovimento'] })}>
                  <option value="">A pagar e a receber</option>
                  <option value="pagar">Só a pagar</option>
                  <option value="receber">Só a receber</option>
                </select>
              </Field>
              <Field label="Valor de (R$)" hint="Valor total do lançamento (todas as parcelas).">
                <MoneyInput value={d.de} onChange={(v) => set({ de: v })} />
              </Field>
              <Field label="Até (R$)" hint="Deixe zero para dizer “daqui para cima”.">
                <MoneyInput value={d.ate} onChange={(v) => set({ ate: v })} />
              </Field>
            </>
          )}

          {d.tipo === 'compras' && (
            <>
              <Field className={ui.col2} label="Comprador" req hint="Funcionário a quem o limite se aplica.">
                <select value={d.compradorId} onChange={(e) => set({ compradorId: e.target.value })}>
                  <option value="">Selecione</option>
                  {candidatos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field className={ui.col2} label="Limite sem aprovação (R$)" req hint="Vale para qualquer fornecedor que não esteja nas exceções.">
                <MoneyInput value={d.limite} onChange={(v) => set({ limite: v })} />
              </Field>
            </>
          )}

          {d.tipo === 'comissao' && (
            <>
              <Field className={ui.col2} label="Vendedor" req>
                <select value={d.vendedorId} onChange={(e) => set({ vendedorId: e.target.value })}>
                  <option value="">Selecione</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Comissão">
                <PercentInput value={d.comissaoPercentual} onChange={(f) => set({ comissaoPercentual: f })} />
              </Field>
              <Field label="Base" hint="Sobre o preço de venda: sai do valor cheio. Sobre a margem: sai do que sobra depois dos custos.">
                <select value={d.comissaoBase} onChange={(e) => set({ comissaoBase: e.target.value as ComissaoBase })}>
                  {BASES_COMISSAO.map((b) => (
                    <option key={b.valor} value={b.valor}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className={`${ui.col4} ${ui.modalNote}`}>
                Perfis por etapa do CRM, comissão decrescente por período e por produtividade entram quando o
                cliente enviar o detalhamento das regras. Esta versão guarda o percentual e a base.
              </div>
            </>
          )}

          <Field className={ui.col4} label="Observação">
            <input value={d.observacao} onChange={(e) => set({ observacao: e.target.value })} placeholder="Anotações internas" />
          </Field>
        </div>
      </section>

      {d.tipo === 'compras' && (
        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            Exceções <span className={ui.fsectionHint}>fornecedores fora do limite</span>
          </div>
          {d.excecoes.length > 0 && (
            <div className={s.chips}>
              {d.excecoes.map((id) => {
                const f = fornecedores.find((x) => x.id === id)
                return (
                  <span key={id} className={s.chip}>
                    {f?.nomeFantasia || f?.nome || 'fornecedor removido'}
                    <button type="button" onClick={() => alternar('excecoes', id)} aria-label="Remover exceção">
                      <X size={12} />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          <div className={s.buscaWrap}>
            <Search size={15} />
            <input value={buscaForn} onChange={(e) => setBuscaForn(e.target.value)} placeholder="Buscar fornecedor por nome ou CNPJ para incluir..." />
          </div>
          {fornFiltrados.length > 0 && (
            <div className={s.lista}>
              {fornFiltrados.slice(0, 8).map((f) => {
                const on = d.excecoes.includes(f.id)
                return (
                  <label key={f.id} className={`${s.linha} ${on ? s.linhaOn : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => alternar('excecoes', f.id)} />
                    <span className={s.linhaNome}>{f.nomeFantasia || f.nome}</span>
                    <span className={s.linhaCargo}>{f.cpfCnpj || f.pais || ''}</span>
                  </label>
                )
              })}
            </div>
          )}
        </section>
      )}

      {(d.tipo === 'proposta' || d.tipo === 'compras' || d.tipo === 'movimento') && (
        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            Aprovadores <span className={ui.fsectionHint}>{d.tipo === 'compras' ? 'quem libera acima do limite' : 'todos precisam assinar'}</span>
          </div>
          {candidatos.length === 0 ? (
            <div className={ui.modalNote}>Cadastre funcionários para escolher os aprovadores.</div>
          ) : (
            <ListaFuncionarios selecionados={d.aprovadores} onToggle={(id) => alternar('aprovadores', id)} candidatos={candidatos} />
          )}
        </section>
      )}
    </Modal>
  )
}
