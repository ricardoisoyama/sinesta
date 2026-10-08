import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { SquareKanban, FileText, Trash2, Plus, Trophy, XCircle, CalendarPlus, CheckCircle2, Video } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { useCompromissos } from '@/features/agenda/api'
import { CompromissoModal, compromissoVazio } from '@/features/agenda/CompromissoModal'
import { agoraMomento, dataCurta as diaCurto, horaDe, diaDe } from '@/features/agenda/datas'
import { infoTipo, type Compromisso } from '@/features/agenda/types'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { formatBRL, formatCpfCnpj, formatTelefone } from '@/lib/format'
import { listClientes, listServicos, listVendedores } from '@/features/cadastros/api'
import { useUsuarios } from '@/features/usuarios/store'
import { usePropostas } from '@/features/propostas/store'
import { PERFIS_COMPRA, TIPOS_VENDEDOR, contatosDoParceiro, type PerfilCompra } from '@/features/parceiros/types'
import { ORIGENS, PROXIMAS_ACOES, type Funil, type Oportunidade, type Recorrencia } from './types'
import s from './crm.module.css'

interface Props {
  open: boolean
  /** null = nova oportunidade. */
  initial: Oportunidade | null
  funil: Funil
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSave: (op: Oportunidade) => void
  onRemove: (op: Oportunidade) => void
  onGerarProposta: (op: Oportunidade) => void
}

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function OportunidadeModal({ open, initial, funil, busy, error, onClose, onSave, onRemove, onGerarProposta }: Props) {
  const temGanho = funil.etapas.some((e) => e.tipo === 'ganho')
  const temPerdido = funil.etapas.some((e) => e.tipo === 'perdido')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Oportunidade"
      subtitle={initial ? initial.cliente : 'Novo registro'}
      icon={<SquareKanban />}
      maxWidth={980}
      busy={busy}
      error={error}
      footer={
        <>
          {initial && (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnGhost}`}
              onClick={() => onRemove(initial)}
              title="Arquivar: sai do kanban, o histórico fica guardado"
            >
              <Trash2 /> Arquivar
            </button>
          )}
          {temGanho && (
            <button
              type="submit"
              form="opForm"
              className={`${ui.btn} ${ui.btnGhost} ${s.btnGanho}`}
              data-acao="ganho"
              title="Marca como ganha e move para a etapa de ganho"
            >
              <Trophy /> Ganhar
            </button>
          )}
          {temPerdido && (
            <button
              type="submit"
              form="opForm"
              className={`${ui.btn} ${ui.btnGhost} ${s.btnPerdido}`}
              data-acao="perdido"
              title="Marca como perdida (pede o motivo)"
            >
              <XCircle /> Perder
            </button>
          )}
          {initial && (
            <button
              type="submit"
              form="opForm"
              className={`${ui.btn} ${ui.btnGhost}`}
              data-acao="proposta"
              title="Salva e abre o Pricing com o cliente preenchido"
            >
              <FileText /> Gerar proposta
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="opForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      {open && (
        <OportunidadeForm
          key={initial?.id ?? 'nova'}
          initial={initial}
          funil={funil}
          onSave={onSave}
          onGerarProposta={onGerarProposta}
        />
      )}
    </Modal>
  )
}

function OportunidadeForm({
  initial,
  funil,
  onSave,
  onGerarProposta,
}: {
  initial: Oportunidade | null
  funil: Funil
  onSave: (op: Oportunidade) => void
  onGerarProposta: (op: Oportunidade) => void
}) {
  const { usuarios } = useUsuarios()
  const { user } = useAuth()
  const eu = usuarios.find((u) => u.email === user?.email)
  const { propostas } = usePropostas()
  const { data: servicosData } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })
  const { data: clientesData } = useQuery({ queryKey: ['clientes'], queryFn: listClientes })
  const { data: vendedoresData } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores })
  const servicos = (servicosData ?? []).filter((x) => x.status === 'ativo')
  const clientes = (clientesData ?? []).filter((c) => c.status === 'ativo')
  const vendedores = (vendedoresData ?? []).filter((v) => v.status === 'ativo')

  const [d, setD] = useState<Oportunidade>(
    () =>
      initial ?? {
        id: crypto.randomUUID(),
        funilId: funil.id,
        etapaId: funil.etapas[0].id,
        cliente: '',
        clienteId: '',
        cnpj: '',
        contato: '',
        telefone: '',
        email: '',
        perfilComprador: '',
        decisorNome: '',
        decisorTelefone: '',
        decisorEmail: '',
        servico: '',
        valorEstimado: 0,
        propostaNumero: '',
        recorrencia: '',
        origem: 'Prospecção',
        // Card novo fica com quem está criando (aparece na agenda dele).
        responsavel: eu?.nome ?? usuarios.find((u) => u.status === 'ativo')?.nome ?? '',
        responsavelId: eu?.id ?? usuarios.find((u) => u.status === 'ativo')?.id ?? '',
        vendedorId: '',
        entrouNaEtapaEm: new Date().toISOString(),
        proximaAcao: '',
        proximaAcaoEm: '',
        proximaAcaoDetalhe: '',
        motivoPerda: '',
        anotacoes: [],
        camposValores: [],
        status: 'ativo',
      },
  )
  const [novaAnotacao, setNovaAnotacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const set = (patch: Partial<Oportunidade>) => setD((p) => ({ ...p, ...patch }))

  const etapaSel = funil.etapas.find((e) => e.id === d.etapaId) ?? funil.etapas[0]
  // Responsável pelo id; card antigo só tem o nome e é casado por ele.
  const ativos = usuarios.filter((u) => u.status === 'ativo')
  const responsavelId = d.responsavelId || usuarios.find((u) => u.nome === d.responsavel)?.id || ''
  const responsavelSemCadastro = !responsavelId && d.responsavel ? d.responsavel : ''
  const escolherResponsavel = (id: string) => set({ responsavelId: id, responsavel: usuarios.find((u) => u.id === id)?.nome ?? '' })
  const escolherVendedor = (id: string) => {
    // Vendedor ligado a um funcionário: ele passa a ser o responsável (vai para a agenda dele).
    const doVendedor = usuarios.find((u) => u.id === vendedores.find((v) => v.id === id)?.usuarioId)
    set(doVendedor ? { vendedorId: id, responsavelId: doVendedor.id, responsavel: doVendedor.nome } : { vendedorId: id })
  }

  // ── agenda do negócio ──
  const { compromissos, salvar: salvarCompromisso, excluir: excluirCompromisso } = useCompromissos()
  const doNegocio = initial ? compromissos.filter((c) => c.oportunidadeId === initial.id).sort((a, b) => b.inicio.localeCompare(a.inicio)) : []
  const [compromissoAberto, setCompromissoAberto] = useState<Compromisso | null>(null)
  const agendar = () => {
    // Próxima hora cheia, já com o cliente, o card e o responsável do negócio.
    const agora = agoraMomento()
    const proximaHora = `${diaDe(agora)}T${String(Math.min(23, Number(agora.slice(11, 13)) + 1)).padStart(2, '0')}:00`
    const nome = usuarios.find((u) => u.id === responsavelId)?.nome ?? d.responsavel
    setCompromissoAberto({
      ...compromissoVazio(proximaHora, responsavelId, nome),
      titulo: `Reunião · ${d.cliente}`,
      clienteId: d.clienteId,
      clienteNome: d.cliente,
      oportunidadeId: d.id,
    })
  }

  // ── concluir a próxima ação ──
  const [concluindo, setConcluindo] = useState(false)
  const [resultado, setResultado] = useState('')
  const concluirAcao = () => {
    const quando = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    const texto = `✔ ${d.proximaAcao}: feita em ${quando} por ${user?.name ?? 'usuário'}${resultado.trim() ? `. ${resultado.trim()}` : ''}`
    set({
      anotacoes: [{ id: crypto.randomUUID(), texto, em: new Date().toISOString() }, ...d.anotacoes],
      proximaAcao: '',
      proximaAcaoEm: '',
      proximaAcaoDetalhe: '',
    })
    setConcluindo(false)
    setResultado('')
    setInfo('Ação concluída e registrada nas anotações. Escolha a próxima ação e clique em Salvar.')
  }

  const vendedorSel = vendedores.find((v) => v.id === d.vendedorId)
  const funcaoVendedor = TIPOS_VENDEDOR.find((t) => t.valor === vendedorSel?.tipoVendedor)?.label

  // Cliente escolhido do cadastro: puxa CNPJ e o contato principal.
  const escolherCliente = (nome: string) => {
    const cad = clientes.find((c) => c.nome === nome || c.nomeFantasia === nome)
    if (!cad) {
      set({ cliente: nome, clienteId: '' })
      return
    }
    const principal = contatosDoParceiro(cad)[0]
    const decisor = contatosDoParceiro(cad).find((c) => c.perfilCompra === 'decisor')
    set({
      cliente: nome,
      clienteId: cad.id,
      cnpj: cad.cpfCnpj ? formatCpfCnpj(cad.cpfCnpj) : d.cnpj,
      contato: d.contato || principal?.nome || '',
      telefone: d.telefone || principal?.telefone || '',
      email: d.email || principal?.email || '',
      perfilComprador: d.perfilComprador || principal?.perfilCompra || '',
      decisorNome: d.decisorNome || (decisor && decisor !== principal ? decisor.nome : ''),
      decisorTelefone: d.decisorTelefone || (decisor && decisor !== principal ? decisor.telefone : ''),
      decisorEmail: d.decisorEmail || (decisor && decisor !== principal ? decisor.email : ''),
    })
  }

  // Influenciador: abre o bloco do decisor já com os dados do contato (o cliente pediu assim).
  const trocarPerfil = (perfil: PerfilCompra) => {
    if (perfil === 'influenciador' && !d.decisorNome && !d.decisorTelefone && !d.decisorEmail)
      set({ perfilComprador: perfil, decisorNome: d.contato, decisorTelefone: d.telefone, decisorEmail: d.email })
    else set({ perfilComprador: perfil })
  }

  const escolherProposta = (numero: string) => {
    const p = propostas.find((x) => x.numero === numero)
    set({ propostaNumero: numero, valorEstimado: p ? p.total : d.valorEstimado })
  }

  const adicionarAnotacao = () => {
    const texto = novaAnotacao.trim()
    if (!texto) return
    set({ anotacoes: [{ id: crypto.randomUUID(), texto, em: new Date().toISOString() }, ...d.anotacoes] })
    setNovaAnotacao('')
  }

  const validar = (dados: Oportunidade): Oportunidade | null => {
    if (dados.cliente.trim().length < 2) {
      setErro('Informe o nome do cliente.')
      return null
    }
    const etapa = funil.etapas.find((e) => e.id === dados.etapaId)
    if (etapa?.tipo === 'perdido' && !dados.motivoPerda.trim()) {
      setErro('Informe o motivo da perda.')
      return null
    }
    setErro(null)
    return { ...dados, cliente: dados.cliente.trim() }
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const botao = (ev.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const acao = botao?.dataset.acao
    let dados = d
    if (acao === 'ganho') {
      const etapa = funil.etapas.find((e) => e.tipo === 'ganho')
      if (etapa) dados = { ...d, etapaId: etapa.id }
    }
    if (acao === 'perdido') {
      const etapa = funil.etapas.find((e) => e.tipo === 'perdido')
      if (etapa && d.etapaId !== etapa.id) {
        // Primeiro clique: leva para a etapa de perda e pede o motivo.
        set({ etapaId: etapa.id })
        setErro(d.motivoPerda.trim() ? null : 'Informe o motivo da perda e clique em Perder de novo.')
        if (!d.motivoPerda.trim()) return
        dados = { ...d, etapaId: etapa.id }
      }
    }
    const op = validar(dados)
    if (!op) return
    if (acao === 'proposta') onGerarProposta(op)
    else onSave(op)
  }

  const clientesNomes = [...new Set(clientes.flatMap((c) => [c.nome, c.nomeFantasia].filter(Boolean)))].sort()

  // Campos customizados do funil: valores guardados por id do campo.
  const valorCampo = (campoId: string) => d.camposValores.find((v) => v.campoId === campoId)?.valor ?? ''
  const setCampo = (campoId: string, valor: string) =>
    set({
      camposValores: d.camposValores.some((v) => v.campoId === campoId)
        ? d.camposValores.map((v) => (v.campoId === campoId ? { ...v, valor } : v))
        : [...d.camposValores, { campoId, valor }],
    })

  return (
    <form id="opForm" onSubmit={submit} noValidate>
      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}>Cliente</div>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Cliente" req hint="Digite ou escolha um cliente do cadastro: o CNPJ e o contato vêm junto.">
            <input
              value={d.cliente}
              onChange={(e) => escolherCliente(e.target.value)}
              placeholder="Nome da empresa"
              list="crm-clientes"
            />
            <datalist id="crm-clientes">
              {clientesNomes.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field className={ui.col2} label="CNPJ">
            <input
              value={d.cnpj}
              onChange={(e) => set({ cnpj: formatCpfCnpj(e.target.value) })}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              maxLength={18}
            />
          </Field>
          <Field className={ui.col2} label="Responsável" hint="A pessoa com quem você fala no cliente.">
            <input value={d.contato} onChange={(e) => set({ contato: e.target.value })} placeholder="Nome do responsável" />
          </Field>
          <Field className={ui.col2} label="Perfil do comprador" hint="Se for influenciador, informe também quem decide.">
            <select value={d.perfilComprador} onChange={(e) => trocarPerfil(e.target.value as PerfilCompra)}>
              {PERFIS_COMPRA.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field className={ui.col2} label="Telefone">
            <input
              value={d.telefone}
              onChange={(e) => set({ telefone: formatTelefone(e.target.value) })}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              maxLength={15}
            />
          </Field>
          <Field className={ui.col2} label="E-mail">
            <input value={d.email} onChange={(e) => set({ email: e.target.value })} placeholder="contato@empresa.com.br" />
          </Field>

          {d.perfilComprador === 'influenciador' && (
            <>
              <div className={ui.col4}>
                <div className={ui.fsectionTitle}>
                  Decisor <span className={ui.fsectionHint}>quem fecha a compra</span>
                </div>
              </div>
              <Field className={ui.col2} label="Nome do decisor">
                <input value={d.decisorNome} onChange={(e) => set({ decisorNome: e.target.value })} />
              </Field>
              <Field label="Telefone">
                <input
                  value={d.decisorTelefone}
                  onChange={(e) => set({ decisorTelefone: formatTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  maxLength={15}
                />
              </Field>
              <Field label="E-mail">
                <input value={d.decisorEmail} onChange={(e) => set({ decisorEmail: e.target.value })} />
              </Field>
            </>
          )}
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}>Negócio</div>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Serviço de interesse">
            <select value={d.servico} onChange={(e) => set({ servico: e.target.value })}>
              <option value="">Selecione</option>
              {d.servico && !servicos.some((sv) => sv.nome === d.servico) && (
                <option value={d.servico}>{d.servico}</option>
              )}
              {servicos.map((sv) => (
                <option key={sv.id} value={sv.nome}>
                  {sv.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recorrência" hint="Recorrente: contrato que se repete. Spot: venda única.">
            <select value={d.recorrencia} onChange={(e) => set({ recorrencia: e.target.value as Recorrencia })}>
              <option value="">Não informada</option>
              <option value="recorrente">Recorrente</option>
              <option value="spot">Spot</option>
            </select>
          </Field>
          <Field label="Origem">
            <select value={d.origem} onChange={(e) => set({ origem: e.target.value })}>
              {!ORIGENS.includes(d.origem as (typeof ORIGENS)[number]) && d.origem && (
                <option value={d.origem}>{d.origem}</option>
              )}
              {ORIGENS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field
            className={ui.col2}
            label="Proposta"
            hint="Número da proposta emitida para esta oportunidade. Ao escolher, o valor estimado vira o total dela."
          >
            <select value={d.propostaNumero} onChange={(e) => escolherProposta(e.target.value)}>
              <option value="">Ainda sem proposta</option>
              {d.propostaNumero && !propostas.some((p) => p.numero === d.propostaNumero) && (
                <option value={d.propostaNumero}>{d.propostaNumero}</option>
              )}
              {propostas.map((p) => (
                <option key={p.id} value={p.numero}>
                  {p.numero} · {p.cliente} · {formatBRL(p.total)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            className={ui.col2}
            label="Valor estimado (R$)"
            hint="Quanto o negócio deve valer. É uma previsão até existir a proposta; com a proposta escolhida, é o total dela."
          >
            <MoneyInput value={d.valorEstimado} onChange={(n) => set({ valorEstimado: n })} />
          </Field>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}>Atendimento</div>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Vendedor" hint="Do cadastro de Vendedores. A função (SDR, Sales, CS) vem de lá.">
            <select value={d.vendedorId} onChange={(e) => escolherVendedor(e.target.value)}>
              <option value="">Não definido</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
            {funcaoVendedor && <span className={s.vendedorFuncao}>{funcaoVendedor}</span>}
          </Field>
          <Field className={ui.col2} label="Usuário responsável" hint="Quem acompanha o card no portal. A próxima ação vai para a Agenda (e o Google) desta pessoa.">
            <select value={responsavelId} onChange={(e) => escolherResponsavel(e.target.value)}>
              <option value="">{responsavelSemCadastro ? `${responsavelSemCadastro} (sem cadastro)` : 'Selecione'}</option>
              {ativos.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field className={ui.col2} label="Etapa">
            <select value={d.etapaId} onChange={(e) => set({ etapaId: e.target.value })}>
              {funil.etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Próxima ação" hint="Lista fixa; vira compromisso na agenda do vendedor.">
            <select value={d.proximaAcao} onChange={(e) => set({ proximaAcao: e.target.value })}>
              <option value="">Nenhuma</option>
              {d.proximaAcao && !PROXIMAS_ACOES.includes(d.proximaAcao as (typeof PROXIMAS_ACOES)[number]) && (
                <option value={d.proximaAcao}>{d.proximaAcao}</option>
              )}
              {PROXIMAS_ACOES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quando" hint="Data e hora: vira o compromisso na agenda do vendedor.">
            <input type="datetime-local" value={d.proximaAcaoEm} onChange={(e) => set({ proximaAcaoEm: e.target.value })} />
          </Field>
          {d.proximaAcao && (
            <Field className={ui.col4} label="Detalhe da próxima ação">
              <div className={s.acaoLinha}>
                <input
                  value={d.proximaAcaoDetalhe}
                  onChange={(e) => set({ proximaAcaoDetalhe: e.target.value })}
                  placeholder="Ex.: ligar para o financeiro e confirmar o prazo"
                />
                {initial && !concluindo && (
                  <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setConcluindo(true)} title="Registrar que a ação foi feita e escolher a próxima">
                    <CheckCircle2 /> Concluir
                  </button>
                )}
              </div>
            </Field>
          )}
          {d.proximaAcao && concluindo && (
            <div className={`${ui.col4} ${s.concluirBox}`}>
              <label htmlFor="op-resultado">Como foi? <small>(opcional, vai para as anotações)</small></label>
              <div className={s.acaoLinha}>
                <input
                  id="op-resultado"
                  autoFocus
                  value={resultado}
                  onChange={(e) => setResultado(e.target.value)}
                  placeholder="Ex.: cliente pediu a proposta até sexta"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      concluirAcao()
                    }
                  }}
                />
                <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setConcluindo(false)}>Cancelar</button>
                <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={concluirAcao}><CheckCircle2 /> Registrar</button>
              </div>
            </div>
          )}
          {funil.camposCustomizados.map((c) => (
            <Field key={c.id} className={ui.col2} label={c.nome}>
              {c.tipo === 'lista' ? (
                <select value={valorCampo(c.id)} onChange={(e) => setCampo(c.id, e.target.value)}>
                  <option value="">Selecione</option>
                  {c.opcoes.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={c.tipo === 'data' ? 'date' : c.tipo === 'numero' ? 'number' : 'text'}
                  value={valorCampo(c.id)}
                  onChange={(e) => setCampo(c.id, e.target.value)}
                />
              )}
            </Field>
          ))}
          {etapaSel.tipo === 'perdido' && (
            <Field className={ui.col4} label="Motivo da perda" req>
              <input
                value={d.motivoPerda}
                onChange={(e) => set({ motivoPerda: e.target.value })}
                placeholder="Ex.: preço, prazo, fechou com concorrente"
              />
            </Field>
          )}
        </div>
      </section>

      {initial && (
        <section className={ui.fsection}>
          <div className={s.etapasHead}>
            <span>Agenda deste negócio ({doNegocio.length})</span>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={agendar}>
              <CalendarPlus /> Agendar
            </button>
          </div>
          {doNegocio.length === 0 ? (
            <div className={s.agendaVazia}>Nenhum compromisso ligado a este card. "Agendar" marca reunião, ligação ou visita já com o cliente.</div>
          ) : (
            <ul className={s.agendaLista}>
              {doNegocio.map((c) => {
                const t = infoTipo(c.tipo)
                return (
                  <li key={c.id}>
                    <button type="button" className={`${s.agendaItem} ${c.concluido ? s.agendaFeito : ''}`} onClick={() => setCompromissoAberto(c)}>
                      <i style={{ background: t.cor }} />
                      <span className={s.agendaQuando}>{diaCurto(diaDe(c.inicio))}{c.diaInteiro ? '' : ` ${horaDe(c.inicio)}`}</span>
                      <span className={s.agendaTitulo}>{(c.linkReuniao || c.comMeet) && <Video size={13} className={s.agendaMeet} aria-label="com Google Meet" />} {c.titulo}</span>
                      <span className={s.agendaTipo}>{c.concluido ? 'concluído' : t.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {/* Fora do formulário do card (portal): Enter no compromisso não salva o card, e a janela não fica presa dentro da outra. */}
          {createPortal(
            <CompromissoModal
              compromisso={compromissoAberto}
              onClose={() => setCompromissoAberto(null)}
              onSalvar={salvarCompromisso}
              onExcluir={excluirCompromisso}
            />,
            document.body,
          )}
        </section>
      )}

      <section className={ui.fsection}>
        <div className={s.etapasHead}>
          <span>Anotações ({d.anotacoes.length})</span>
        </div>
        <div className={s.anotacaoNova}>
          <input
            value={novaAnotacao}
            onChange={(e) => setNovaAnotacao(e.target.value)}
            placeholder="Registrar contato, retorno, combinado..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarAnotacao()
              }
            }}
          />
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={adicionarAnotacao}>
            <Plus /> Adicionar
          </button>
        </div>
        {d.anotacoes.length > 0 && (
          <ul className={s.timeline}>
            {d.anotacoes.map((a) => (
              <li key={a.id}>
                <span className={s.timelineData}>{dataCurta(a.em)}</span>
                <span>{a.texto}</span>
              </li>
            ))}
          </ul>
        )}
        {info && <div className={s.formInfo}>{info}</div>}
        {erro && <div className={s.formErro}>{erro}</div>}
      </section>
    </form>
  )
}
