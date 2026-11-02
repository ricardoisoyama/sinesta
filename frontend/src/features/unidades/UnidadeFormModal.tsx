import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import { PercentInput } from '@/features/common/PercentInput'
import ui from '@/features/common/ui.module.css'
import { formatCnpj } from '@/lib/format'
import { mesclar } from '@/lib/mesclar'
import { REGIMES, faturamentoVazio, type Unidade, type RegimeTributario, type TipoUnidade } from './types'
import { emptyUnidade, type UnidadeForm } from './unidade-schema'
import { ContasEmpresa } from './ContasEmpresa'
import { FaturamentoEmpresaCampos } from './FaturamentoEmpresaCampos'
import { bancoVazio, enderecoVazio } from '@/features/parceiros/types'
import { useAuth } from '@/features/auth/auth-context'
import { useFator } from '@/features/pricing/usePreco'
import { useQuery } from '@tanstack/react-query'
import { getNumeracaoEmpresa } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { consultarCnpj, resumoCnpj, type CepConsulta } from '@/features/common/consultas'
import { CampoCep } from '@/features/common/CampoCep'
import { FatorPainel } from '@/features/pricing/FatorPainel'
import { CertificadoEmpresa } from './CertificadoEmpresa'
import s from './empresa.module.css'

type Aba = 'empresa' | 'dv' | 'proposta' | 'faturamento' | 'banco'

interface Props {
  open: boolean
  initial?: Unidade | null
  error?: string | null
  onClose: () => void
  onSave: (data: UnidadeForm) => void
}

export function UnidadeFormModal({ open, initial, error, onClose, onSave }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Empresa"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<Building2 />}
      maxWidth={820}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="empresaForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar empresa
          </button>
        </>
      }
    >
      {open && <EmpresaForm key={initial?.id ?? 'novo'} initial={initial ?? null} onSave={onSave} />}
    </Modal>
  )
}

const ehSimples = (r: RegimeTributario) => r === 'Simples Nacional' || r === 'MEI'

function EmpresaForm({ initial, onSave }: { initial: Unidade | null; onSave: (data: UnidadeForm) => void }) {
  // Registros antigos não têm dados bancários: começa em branco.
  const [d, setD] = useState<UnidadeForm>(() =>
    initial
      ? {
          ...initial,
          padrao: initial.padrao ?? false,
          propostaPrefixo: initial.propostaPrefixo ?? '',
          propostaDigitos: initial.propostaDigitos || 4,
          contratoPrefixo: initial.contratoPrefixo ?? '',
          contratoDigitos: initial.contratoDigitos || 4,
          validadesProposta: initial.validadesProposta ?? [],
          dv: { ...initial.dv, outras: initial.dv.outras ?? [] },
          // Simples cadastrado antes só com o total: o total vira o DAS (no Simples é a mesma coisa).
          das: ehSimples(initial.regime) && !initial.das ? initial.dv.impostos : initial.das,
          simplesAnexo: initial.simplesAnexo ?? '',
          banco: mesclar(bancoVazio(), initial.banco),
          faturamento: mesclar(faturamentoVazio(), initial.faturamento),
          markupMinimo: initial.markupMinimo ?? 0,
          enderecoCompleto: mesclar(enderecoVazio(), initial.enderecoCompleto),
          inscricaoMunicipal: initial.inscricaoMunicipal ?? '',
          inscricaoEstadual: initial.inscricaoEstadual ?? '',
        }
      : emptyUnidade,
  )
  // Lucro da empresa: só quem tem a permissão mexe (o Gestor já nasce com ela).
  const { user } = useAuth()
  const podeMarkup = !!user?.permissoes?.includes('/cadastros/unidades/markup')
  const [tab, setTab] = useState<Aba>('empresa')
  // Numeração das propostas: trava depois da primeira proposta emitida no padrão da empresa.
  const numeracao = useQuery({ queryKey: ['empresa-numeracao', initial?.id], queryFn: () => getNumeracaoEmpresa(initial!.id), enabled: !!initial?.id })
  const proximoNumero = d.propostaPrefixo
    ? `${d.propostaPrefixo}-${String((numeracao.data?.emitidas ?? 0) + 1).padStart(d.propostaDigitos, '0')}`
    : 'PROP-0000 (sequência do sistema)'

  const set = (patch: Partial<UnidadeForm>) => setD((p) => ({ ...p, ...patch }))
  const setEnd = (patch: Partial<UnidadeForm['enderecoCompleto']>) =>
    setD((p) => ({ ...p, enderecoCompleto: { ...p.enderecoCompleto, ...patch } }))
  const semPrefixo = (err: unknown) => getErrorMessage(err).replace(/^Não foi possível salvar \(\d+\)\. /, '')

  // Os impostos e as retenções da NFS-e ficam no cadastro de cada serviço (mudam por atividade e regime).
  const paraSalvar = (x: UnidadeForm): UnidadeForm => ({ ...x, simplesAnexo: '' })
  // Fator ao vivo: o motor do servidor calcula com o rascunho do formulário (antes de salvar),
  // somando custos fixos e meta gravados da empresa.
  const fatorAoVivo = useFator({ empresaId: initial?.id ?? '', empresa: { ...(paraSalvar(d) as Unidade), id: initial?.id ?? '' } })

  // CNPJ → Receita (base aberta): ao sair do campo com os 14 números, preenche razão social,
  // fantasia, endereço e regime. Só busca quando o CNPJ mudou (passar pelo campo de uma
  // empresa já salva não sobrescreve nada).
  const [buscando, setBuscando] = useState(false)
  const [infoCnpj, setInfoCnpj] = useState<{ texto: string; alerta: boolean } | null>(null)
  const [cnpjConsultado, setCnpjConsultado] = useState(() => (initial?.cnpj ?? '').replace(/\D/g, ''))
  const buscarCnpj = async () => {
    const digitos = d.cnpj.replace(/\D/g, '')
    if (digitos.length !== 14 || digitos === cnpjConsultado) return
    setCnpjConsultado(digitos)
    setBuscando(true)
    setInfoCnpj(null)
    try {
      const c = await consultarCnpj(digitos)
      const regime = REGIMES.find((r) => r.toLowerCase() === c.regime.toLowerCase())
      setD((p) => ({
        ...p,
        razaoSocial: c.razaoSocial,
        nomeFantasia: c.nomeFantasia || p.nomeFantasia,
        nome: p.nome.trim() ? p.nome : c.nomeFantasia || c.razaoSocial,
        endereco: c.cidade || p.endereco,
        enderecoCompleto: { ...p.enderecoCompleto, cep: c.cep, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento, bairro: c.bairro },
        ...(regime ? { regime } : {}),
      }))
      setInfoCnpj({ texto: resumoCnpj(c), alerta: c.situacao.toLowerCase() !== 'ativa' })
    } catch (err) {
      setInfoCnpj({ texto: semPrefixo(err), alerta: true })
      // Falhou: o próximo Tab tenta de novo.
      setCnpjConsultado('')
    } finally {
      setBuscando(false)
    }
  }
  // CEP encontrado → rua, bairro e cidade (número e complemento ficam como estão).
  const aplicarCep = (c: CepConsulta) =>
    setD((p) => ({
      ...p,
      endereco: c.cidade || p.endereco,
      enderecoCompleto: { ...p.enderecoCompleto, cep: c.cep, logradouro: c.logradouro || p.enderecoCompleto.logradouro, bairro: c.bairro || p.enderecoCompleto.bairro },
    }))

  const setDv = (patch: Partial<UnidadeForm['dv']>) => setD((p) => ({ ...p, dv: { ...p.dv, ...patch } }))

  // ── Validades da proposta (aba Proposta) ──
  type Validade = UnidadeForm['validadesProposta'][number]
  const setValidades = (fn: (l: Validade[]) => Validade[]) => setD((p) => ({ ...p, validadesProposta: fn(p.validadesProposta) }))

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      // Reduz a imagem antes de guardar: o logo vai em base64 no JSON e na proposta,
      // então limitamos ao tamanho realmente usado em tela/PDF.
      const img = new Image()
      img.onload = () => {
        const MAX = 480
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          set({ logo: String(reader.result) })
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const manterTransparencia = file.type === 'image/png' || file.type === 'image/svg+xml'
        set({
          logo: manterTransparencia ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85),
        })
      }
      img.onerror = () => set({ logo: String(reader.result) })
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSave(paraSalvar(d))
  }

  const aba = (id: Aba, label: string) => (
    <button type="button" className={`${s.tab} ${tab === id ? s.tabActive : ''}`} onClick={() => setTab(id)}>
      {label}
    </button>
  )

  return (
    <form id="empresaForm" onSubmit={submit} noValidate>
      <div className={ui.topRow}>
        <span className={ui.modalNote}>Estabelecimento e markup. Os impostos e as retenções da NFS-e ficam no cadastro de cada serviço.</span>
        <StatusToggle value={d.status !== 'inativo'} onChange={(v) => set({ status: v ? 'ativo' : 'inativo' })} />
      </div>

      <div className={s.tabs}>
        {aba('empresa', 'Empresa')}
        {aba('dv', 'Markup')}
        {aba('proposta', 'Proposta')}
        {aba('faturamento', 'Faturamento')}
        {aba('banco', 'Dados bancários')}
      </div>

      {tab === 'faturamento' && (
        <section className={ui.fsection}>
          <FaturamentoEmpresaCampos empresaId={initial?.id ?? ''} valor={d.faturamento} onChange={(faturamento) => set({ faturamento })} />
        </section>
      )}

      {tab === 'banco' && (
        <section className={ui.fsection}>
          <ContasEmpresa empresaId={initial?.id ?? ''} bancoAntigo={d.banco} />
        </section>
      )}

      {tab === 'empresa' && (
        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col2} label="CNPJ" hint="Digite os 14 números e saia do campo (Tab): razão social, fantasia, endereço e regime vêm da Receita Federal (base aberta).">
              <div className={ui.comLoader}>
                <input
                  value={d.cnpj}
                  onChange={(e) => set({ cnpj: formatCnpj(e.target.value) })}
                  onBlur={buscarCnpj}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  maxLength={18}
                  autoFocus={!initial}
                  aria-busy={buscando}
                />
                {buscando && <Loader2 className={ui.loaderCampo} aria-label="Consultando a Receita Federal" />}
              </div>
              {!buscando && infoCnpj && <span className={infoCnpj.alerta ? ui.errMsg : ui.okMsg}>{infoCnpj.texto}</span>}
            </Field>
            <Field label="Inscrição Municipal" hint="Número da empresa na prefeitura (está no cartão do CCM / alvará). Necessária para emitir NFS-e.">
              <input value={d.inscricaoMunicipal} onChange={(e) => set({ inscricaoMunicipal: e.target.value.slice(0, 20) })} />
            </Field>
            <Field label="Inscrição Estadual" hint='Prestadora só de serviço normalmente não tem: escreva "ISENTO".'>
              <input value={d.inscricaoEstadual} onChange={(e) => set({ inscricaoEstadual: e.target.value.toUpperCase().slice(0, 20) })} placeholder="ISENTO" />
            </Field>
            <Field className={ui.col2} label="Razão social" req>
              <input value={d.razaoSocial} onChange={(e) => set({ razaoSocial: e.target.value })} />
            </Field>
            <Field className={ui.col2} label="Nome fantasia" req>
              <input value={d.nomeFantasia} onChange={(e) => set({ nomeFantasia: e.target.value })} />
            </Field>
            <Field className={ui.col2} label="Nome curto" req hint="Como a empresa aparece nos seletores das telas.">
              <input value={d.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Matriz" />
            </Field>
            <Field label="Tipo" req>
              <select value={d.tipo} onChange={(e) => set({ tipo: e.target.value as TipoUnidade })}>
                <option value="Matriz">Matriz</option>
                <option value="Filial">Filial</option>
              </select>
            </Field>
            <Field label="Regime tributário" req hint="Escolhe a tabela de impostos de cada serviço (Cadastros › Serviços) que vale para esta empresa no Pricing e na NFS-e.">
              <select value={d.regime} onChange={(e) => set({ regime: e.target.value as RegimeTributario })}>
                {REGIMES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <div className={`${ui.col4} ${ui.fsectionTitle}`} style={{ marginTop: 4, marginBottom: 0 }}>
              Endereço
              <span className={ui.fsectionHint}>sai na proposta e na nota fiscal</span>
            </div>
            <Field label="CEP" hint="Com os 8 números, rua, bairro e cidade são preenchidos sozinhos.">
              <CampoCep value={d.enderecoCompleto.cep} onChange={(cep) => setEnd({ cep })} onEncontrado={aplicarCep} />
            </Field>
            <Field className={ui.col2} label="Rua">
              <input value={d.enderecoCompleto.logradouro} onChange={(e) => setEnd({ logradouro: e.target.value })} placeholder="Rua, avenida..." />
            </Field>
            <Field label="Número">
              <input value={d.enderecoCompleto.numero} onChange={(e) => setEnd({ numero: e.target.value })} placeholder="Ex.: 45 ou S/N" />
            </Field>
            <Field label="Complemento">
              <input value={d.enderecoCompleto.complemento} onChange={(e) => setEnd({ complemento: e.target.value })} placeholder="Sala, conjunto..." />
            </Field>
            <Field label="Bairro">
              <input value={d.enderecoCompleto.bairro} onChange={(e) => setEnd({ bairro: e.target.value })} />
            </Field>
            <Field className={ui.col2} label="Cidade" req>
              <CidadeAutocomplete
                value={d.endereco}
                onChange={(v) => set({ endereco: v })}
                placeholder="Digite para buscar (ex.: Campinas)"
              />
            </Field>

            <Field className={ui.col4} label="Empresa padrão" hint="As telas (Pricing, Dados da Operação, relatórios) abrem com esta empresa selecionada. Só uma pode ser a padrão.">
              <label className={s.checkLinha}>
                <input type="checkbox" checked={d.padrao} onChange={(e) => set({ padrao: e.target.checked })} /> Abrir as telas com esta empresa
              </label>
            </Field>
            <div className={`${ui.col4} ${s.logoCert}`}>
            <Field label="Logo da empresa">
              <div className={s.logoRow}>
                {d.logo ? (
                  <img src={d.logo} alt="logo" className={s.logoPreview} />
                ) : (
                  <span className={s.logoEmpty}>Sem logo</span>
                )}
                <label className={`${ui.btn} ${ui.btnGhost}`} style={{ cursor: 'pointer' }}>
                  Enviar logo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogo} />
                </label>
                {d.logo && (
                  <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => set({ logo: '' })}>
                    Remover
                  </button>
                )}
              </div>
            </Field>
            <Field
              label="Certificado digital (A1)"
              hint="Arquivo .pfx da empresa, usado para assinar as notas fiscais. Fica guardado cifrado no servidor; a senha não volta para a tela. Vale na hora, sem precisar salvar a empresa."
            >
              <CertificadoEmpresa empresaId={initial?.id} />
            </Field>
            </div>
          </div>
        </section>
      )}

      {tab === 'dv' && (
        <section className={ui.fsection}>
          <div className={s.dvLayout}>
            <div>
              <div className={ui.grid}>
                <Field
                  className={ui.col2}
                  label="Comissão padrão (%)"
                  hint="Vale quando o vendedor não tem regra de comissão própria. No Pricing dá para ajustar por operação, sem mexer no lucro."
                >
                  <PercentInput value={d.dv.comissoes} onChange={(n) => setDv({ comissoes: n })} />
                </Field>
                <Field className={ui.col2} label="Despesa financeira (%)" hint="Custos de recebimento e prazo (ex.: meio de pagamento, antecipação).">
                  <PercentInput value={d.dv.despFinanceira} onChange={(n) => setDv({ despFinanceira: n })} />
                </Field>
              </div>

              <div className={ui.fsectionTitle} style={{ marginTop: 16 }}>
                Outras despesas
                <span className={ui.fsectionHint}>em % da receita; somam no markup</span>
              </div>
              {(d.dv.outras ?? []).map((o) => (
                <div key={o.id} className={ui.grid} style={{ marginBottom: 8 }}>
                  <Field className={ui.col3} label="Despesa">
                    <input
                      value={o.nome}
                      onChange={(e) => setDv({ outras: (d.dv.outras ?? []).map((x) => (x.id === o.id ? { ...x, nome: e.target.value } : x)) })}
                      placeholder="Ex.: Taxa de cartão, garantia"
                    />
                  </Field>
                  <Field label="% da receita">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <PercentInput
                        value={o.percentual}
                        onChange={(n) => setDv({ outras: (d.dv.outras ?? []).map((x) => (x.id === o.id ? { ...x, percentual: n } : x)) })}
                      />
                      <button type="button" className={ui.iconBtn} title="Remover" onClick={() => setDv({ outras: (d.dv.outras ?? []).filter((x) => x.id !== o.id) })}>
                        ×
                      </button>
                    </div>
                  </Field>
                </div>
              ))}
              <button
                type="button"
                className={`${ui.btn} ${ui.btnGhost}`}
                onClick={() => setDv({ outras: [...(d.dv.outras ?? []), { id: crypto.randomUUID(), nome: '', percentual: 0 }] })}
              >
                + Outras despesas
              </button>

              <div className={ui.fsectionTitle} style={{ marginTop: 18 }}>
                Lucro
                <span className={ui.fsectionHint}>
                  {podeMarkup ? 'o lucro da empresa entra em toda precificação' : 'só quem tem a permissão "Alterar o lucro da empresa" muda'}
                </span>
              </div>
              <fieldset disabled={!podeMarkup} className={s.fsetInline}>
                <div className={ui.grid}>
                  <Field
                    className={ui.col2}
                    label="Lucro líquido (%)"
                    hint="O que sobra para a empresa em cada venda. Soma no markup e muda o fator na hora; o vendedor não altera."
                  >
                    <PercentInput value={d.dv.lucro} onChange={(n) => setDv({ lucro: n })} />
                  </Field>
                </div>
              </fieldset>
              <div className={s.dvNota}>
                Os impostos ficam em <b>Cadastros › Serviços</b>, uma tabela por regime: no Pricing vale a do serviço do item; o fator ao lado usa a média dos serviços. A despesa fixa vem de <b>Despesas Fixas</b> e da <b>Meta</b> da empresa.
              </div>
            </div>
            <FatorPainel fator={fatorAoVivo.fator} carregando={fatorAoVivo.carregando} />
          </div>
        </section>
      )}


      {tab === 'proposta' && (
        <section className={ui.fsection}>
          <div className={s.blocoTitulo}>
            Validades da proposta
            <span>aparecem no Pricing para as propostas desta empresa; a padrão já vem escolhida</span>
          </div>
          <div className={s.validades}>
            {d.validadesProposta.map((v) => (
              <div key={v.id} className={s.validadeLinha}>
                <input
                  type="text"
                  value={v.descricao}
                  onChange={(e) => setValidades((l) => l.map((x) => (x.id === v.id ? { ...x, descricao: e.target.value } : x)))}
                  placeholder="Ex.: 15 dias"
                  aria-label="Validade"
                />
                <label className={s.radioPadrao}>
                  <input
                    type="radio"
                    name="validadePadrao"
                    checked={v.padrao}
                    onChange={() => setValidades((l) => l.map((x) => ({ ...x, padrao: x.id === v.id })))}
                  />
                  Padrão
                </label>
                <button type="button" className={ui.iconBtn} title="Remover" onClick={() => setValidades((l) => l.filter((x) => x.id !== v.id))}>
                  ×
                </button>
              </div>
            ))}
            {d.validadesProposta.length === 0 && <span className={s.logoEmpty}>Nenhuma validade: o Pricing não deixa gerar proposta sem uma.</span>}
            <div>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnGhost}`}
                onClick={() => setValidades((l) => [...l, { id: crypto.randomUUID(), descricao: '', padrao: l.length === 0 }])}
              >
                + Validade
              </button>
            </div>
          </div>

          <div className={s.numeracao} style={{ marginTop: 20 }}>
            <div className={s.numeracaoTitulo}>
              Numeração das propostas
              <span>
                {numeracao.data?.travado
                  ? `travada: a empresa já emitiu ${numeracao.data.emitidas} proposta(s) neste padrão`
                  : 'defina antes da primeira proposta; depois de emitida, não muda mais'}
              </span>
            </div>
            <div className={ui.grid}>
              <Field className={ui.col2} label="Prefixo" hint="Letras, números e hífen (até 15). Ex.: SIN ou SINESTA. Em branco = padrão do sistema (PROP-0001). Cada empresa tem o seu.">
                <input
                  value={d.propostaPrefixo}
                  onChange={(e) => set({ propostaPrefixo: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 15) })}
                  placeholder="PROP (padrão)"
                  disabled={numeracao.data?.travado}
                />
              </Field>
              <Field label="Dígitos">
                <select value={d.propostaDigitos} onChange={(e) => set({ propostaDigitos: Number(e.target.value) })} disabled={numeracao.data?.travado || !d.propostaPrefixo}>
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Próxima proposta">
                <input value={proximoNumero} readOnly />
              </Field>
            </div>
          </div>

          <div className={s.numeracao} style={{ marginTop: 16 }}>
            <div className={s.numeracaoTitulo}>
              Numeração dos contratos
              <span>
                {numeracao.data?.contratoTravado
                  ? `travada: a empresa já tem ${numeracao.data.contratos} contrato(s) neste padrão`
                  : 'mesmo esquema da proposta: defina antes do primeiro contrato'}
              </span>
            </div>
            <div className={ui.grid}>
              <Field className={ui.col2} label="Prefixo" hint="Ex.: MIR ou MIRAI. Em branco = padrão do sistema (CTR-0001).">
                <input
                  value={d.contratoPrefixo}
                  onChange={(e) => set({ contratoPrefixo: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 15) })}
                  placeholder="CTR (padrão)"
                  disabled={numeracao.data?.contratoTravado}
                />
              </Field>
              <Field label="Dígitos">
                <select value={d.contratoDigitos} onChange={(e) => set({ contratoDigitos: Number(e.target.value) })} disabled={numeracao.data?.contratoTravado || !d.contratoPrefixo}>
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Próximo contrato">
                <input value={d.contratoPrefixo ? `${d.contratoPrefixo}-${String((numeracao.data?.contratos ?? 0) + 1).padStart(d.contratoDigitos, '0')}` : 'CTR-0000 (sequência do sistema)'} readOnly />
              </Field>
            </div>
          </div>
        </section>
      )}
    </form>
  )
}
