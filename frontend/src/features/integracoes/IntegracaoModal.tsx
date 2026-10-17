import { useState, type ChangeEvent } from 'react'
import { BellRing, FileKey2, KeyRound, Landmark, PlugZap, Receipt, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { confirmar } from '@/features/common/dialogo/dialogo'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import type { Carteira } from '@/features/financeiro/types'
import {
  MAX_CARACTERES_LINHA,
  MAX_INSTRUCOES,
  REGRAS_PADRAO,
  ROTULO_RECURSO,
  configurarIntegracao,
  registrarAviso,
  testarIntegracao,
  type BancoDisponivel,
  type ConfigurarIntegracao,
  type Integracao,
  type Recurso,
  type RegrasBoleto,
  type TipoJuros,
  type TipoMulta,
} from './api'
import { diasAteVencer, resumoRegras } from './regras'
import s from './integracoes.module.css'

interface Props {
  empresa: { id: string; nome: string; cnpj: string }
  /** Integração gravada (editar) ou nula (nova). */
  integracao: Integracao | null
  bancos: BancoDisponivel[]
  /** Contas bancárias do Caixa que atendem a empresa. */
  carteiras: Carteira[]
  onClose: () => void
  onSaved: () => void
}

const hoje = () => new Date()
const dataBR = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : '')

/** Lê um arquivo de texto (PEM) escolhido no computador. */
const lerTexto = (f: File) =>
  new Promise<string>((ok, erro) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => erro(r.error)
    r.readAsText(f)
  })

/**
 * Implantação da integração de uma empresa com um banco: conexão (ambiente, credenciais e
 * certificado), a conta do Caixa que corresponde a ela e os padrões dos boletos. Segredos
 * nunca voltam do servidor: em branco = mantém o gravado.
 */
export function IntegracaoModal({ empresa, integracao, bancos, carteiras, onClose, onSaved }: Props) {
  const [banco, setBanco] = useState(integracao?.banco ?? bancos[0]?.codigo ?? 'inter')
  const [ambiente, setAmbiente] = useState<'sandbox' | 'producao'>(integracao?.ambiente ?? 'sandbox')
  const [ativa, setAtiva] = useState(integracao?.ativa ?? false)
  const [recursos, setRecursos] = useState<Recurso[]>(integracao?.recursos ?? ['cobranca'])
  const [clientId, setClientId] = useState(integracao?.clientId ?? '')
  const [clientSecret, setClientSecret] = useState('')
  const [certificado, setCertificado] = useState<{ nome: string; pem: string } | null>(null)
  const [chave, setChave] = useState<{ nome: string; pem: string } | null>(null)
  const [contaCorrente, setContaCorrente] = useState(integracao?.contaCorrente ?? '')
  const [carteiraId, setCarteiraId] = useState(integracao?.carteiraId ?? '')
  const [regras, setRegras] = useState<RegrasBoleto>({ ...REGRAS_PADRAO, ...integracao?.boleto })
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [teste, setTeste] = useState<{ texto: string; ok: boolean } | null>(null)
  const [testando, setTestando] = useState(false)
  const [aviso, setAviso] = useState(integracao?.avisoRegistradoEm ?? '')
  const [cadastrandoAviso, setCadastrandoAviso] = useState(false)

  const modulo = bancos.find((b) => b.codigo === banco)
  const oferece = modulo?.recursos ?? ['cobranca']
  const regra = <K extends keyof RegrasBoleto>(k: K, v: RegrasBoleto[K]) => setRegras((r) => ({ ...r, [k]: v }))
  const instrucoes = Array.from({ length: MAX_INSTRUCOES }, (_, i) => regras.instrucoes[i] ?? '')
  const setInstrucao = (i: number, v: string) =>
    regra('instrucoes', instrucoes.map((l, j) => (j === i ? v.slice(0, MAX_CARACTERES_LINHA) : l)))

  const dias = integracao ? diasAteVencer(integracao.certificadoValidoAte, hoje()) : null
  const precisaSegredos = !integracao?.configurada

  const escolherArquivo = (onLido: (a: { nome: string; pem: string }) => void) => async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 64 * 1024) {
      setErro('Arquivo grande demais para um certificado ou chave (.crt / .key costumam ter poucos KB).')
      return
    }
    const pem = await lerTexto(f)
    if (!pem.includes('-----BEGIN')) {
      setErro(`"${f.name}" não parece um arquivo PEM (precisa começar com -----BEGIN).`)
      return
    }
    setErro(null)
    onLido({ nome: f.name, pem })
  }

  const salvar = async () => {
    setErro(null)
    if (!clientId.trim()) return setErro('Informe o Client ID.')
    if (precisaSegredos && (!clientSecret.trim() || !certificado || !chave))
      return setErro('Na primeira configuração, envie o Client Secret, o certificado (.crt) e a chave (.key).')
    if ((certificado && !chave) || (!certificado && chave)) return setErro('Envie o certificado e a chave juntos (um par).')

    // Produção = cobrança real ao cliente: confirma ao ligar ou ao passar de sandbox para produção.
    const ligandoProducao = ambiente === 'producao' && ativa && !(integracao?.ambiente === 'producao' && integracao.ativa)
    if (ligandoProducao) {
      const ok = await confirmar({
        titulo: 'Ligar em produção?',
        mensagem: `A partir de agora os boletos da ${empresa.nome} saem de verdade pelo ${modulo?.nome ?? banco}, como cobrança real.`,
        confirmar: 'Ligar em produção',
        perigo: true,
      })
      if (!ok) return
    }

    const dados: ConfigurarIntegracao = {
      banco,
      ambiente,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim() || null,
      certificadoPem: certificado?.pem ?? null,
      chavePem: chave?.pem ?? null,
      contaCorrente,
      recursos: recursos.filter((r) => oferece.includes(r)),
      ativa,
      carteiraId,
      boleto: { ...regras, instrucoes: regras.instrucoes.map((l) => l.trim()).filter(Boolean) },
    }
    setSalvando(true)
    try {
      await configurarIntegracao(empresa.id, dados)
      onSaved()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }

  const cadastrarAviso = async () => {
    if (!integracao) return
    setTeste(null)
    setCadastrandoAviso(true)
    try {
      setAviso((await registrarAviso(integracao.id)).avisoRegistradoEm)
      setTeste({ texto: 'Aviso de pagamento cadastrado no banco.', ok: true })
    } catch (err) {
      setTeste({ texto: getErrorMessage(err), ok: false })
    } finally {
      setCadastrandoAviso(false)
    }
  }

  const testar = async () => {
    if (!integracao) return
    setTeste(null)
    setTestando(true)
    try {
      setTeste({ texto: (await testarIntegracao(integracao.id)).mensagem, ok: true })
    } catch (err) {
      setTeste({ texto: getErrorMessage(err), ok: false })
    } finally {
      setTestando(false)
    }
  }

  const unidadeMulta = regras.multaTipo === 'percentual' ? '%' : 'R$'
  const unidadeJuros = regras.jurosTipo === 'percentual-mes' ? '% ao mês' : 'R$ por dia'
  const unidadeDesconto = regras.descontoTipo === 'percentual' ? '%' : 'R$'
  const numero = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0)

  return (
    <Modal
      open
      onClose={onClose}
      title={`Integração bancária · ${empresa.nome}`}
      subtitle={integracao ? 'Editar a integração' : 'Nova integração'}
      icon={<Landmark />}
      maxWidth={820}
      error={erro}
      busy={salvando}
      footer={
        <>
          {integracao?.configurada && (
            <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.footerEsq}`} onClick={testar} disabled={testando}>
              <PlugZap /> {testando ? 'Testando...' : 'Testar conexão'}
            </button>
          )}
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      {teste && (
        <div className={`${s.aviso} ${teste.ok ? s.avisoOk : s.avisoErro}`} role="status">
          {teste.ok ? <ShieldCheck /> : <ShieldAlert />} <span>{teste.texto}</span>
        </div>
      )}

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><Landmark /> Banco e ambiente</div>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Banco" req>
            <select value={banco} onChange={(e) => setBanco(e.target.value)} disabled={!!integracao}>
              {bancos.map((b) => <option key={b.codigo} value={b.codigo}>{b.nome}</option>)}
            </select>
          </Field>
          <Field className={ui.col2} label="Ambiente" req>
            <div className={s.segmento} role="radiogroup" aria-label="Ambiente">
              {(['sandbox', 'producao'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={ambiente === a}
                  className={`${s.segmentoOpcao} ${ambiente === a ? (a === 'producao' ? s.segmentoProducao : s.segmentoOn) : ''}`}
                  onClick={() => setAmbiente(a)}
                >
                  {a === 'producao' ? 'Produção' : 'Sandbox (testes)'}
                </button>
              ))}
            </div>
          </Field>
          <div className={ui.col4}>
            <div className={s.linhaLigar}>
              <button type="button" className={ui.switchWrap} onClick={() => setAtiva((v) => !v)}>
                <span className={`${ui.switch} ${ativa ? ui.switchOn : ''}`}><span className={ui.switchDot} /></span>
                <span className={ui.switchLbl}>{ativa ? 'Integração ligada' : 'Integração desligada'}</span>
              </button>
              <span className={s.nota}>Desligada, nada é enviado ao banco. Quem liga é a equipe ELROND, a pedido do cliente.</span>
            </div>
            {ambiente === 'producao' && (
              <div className={`${s.aviso} ${s.avisoAtencao}`}>
                <ShieldAlert /> <span>Produção: boletos emitidos aqui são cobranças reais, registradas no banco.</span>
              </div>
            )}
          </div>
          <div className={ui.col4}>
            <span className={s.rotulo}>O que fica liberado</span>
            <div className={s.chips}>
              {oferece.map((r) => {
                const on = recursos.includes(r)
                return (
                  <label key={r} className={`${ui.chip} ${on ? ui.chipOn : ''}`}>
                    <input
                      type="checkbox"
                      className={ui.chipCheck}
                      checked={on}
                      onChange={() => setRecursos((rs) => (on ? rs.filter((x) => x !== r) : [...rs, r]))}
                    />
                    {ROTULO_RECURSO[r]}
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><KeyRound /> Credenciais do banco</div>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Client ID" req>
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
          <Field className={ui.col2} label="Client Secret" req={precisaSegredos} hint={precisaSegredos ? undefined : 'Gravado e cifrado. Em branco, continua o mesmo.'}>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={precisaSegredos ? '' : '••••••••••••'}
              autoComplete="new-password"
            />
          </Field>
          <div className={ui.col4}>
            <span className={s.rotulo}>Certificado da integração (mTLS)</span>
            {integracao?.configurada && (
              <div className={`${s.cert} ${dias !== null && dias <= 30 ? s.certAlerta : ''}`}>
                {dias !== null && dias <= 30 ? <ShieldAlert /> : <ShieldCheck />}
                <span>
                  {dias === null
                    ? 'Certificado gravado.'
                    : dias < 0
                      ? `Certificado venceu em ${dataBR(integracao.certificadoValidoAte)}. Envie um novo par.`
                      : `Certificado gravado, válido até ${dataBR(integracao.certificadoValidoAte)}${dias <= 30 ? ` (faltam ${dias} dias)` : ''}.`}
                </span>
              </div>
            )}
            <div className={s.arquivos}>
              <label className={`${ui.btn} ${ui.btnGhost} ${s.arquivo}`}>
                <FileKey2 /> {certificado ? certificado.nome : integracao?.configurada ? 'Trocar certificado (.crt)' : 'Certificado (.crt)'}
                <input type="file" accept=".crt,.pem,.cer" hidden onChange={escolherArquivo(setCertificado)} />
              </label>
              <label className={`${ui.btn} ${ui.btnGhost} ${s.arquivo}`}>
                <KeyRound /> {chave ? chave.nome : integracao?.configurada ? 'Trocar chave (.key)' : 'Chave (.key)'}
                <input type="file" accept=".key,.pem" hidden onChange={escolherArquivo(setChave)} />
              </label>
            </div>
            <span className={s.nota}>O par é conferido no servidor e guardado cifrado. A tela nunca mostra o conteúdo.</span>
          </div>
          <Field className={ui.col2} label="Conta corrente" hint="Só quando a mesma integração atende mais de uma conta.">
            <input value={contaCorrente} onChange={(e) => setContaCorrente(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Opcional" />
          </Field>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><Wallet /> Conta no ELROND</div>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Conta do Caixa" hint="Liga o extrato do banco à Conciliação e, depois, a baixa dos boletos pagos.">
            <select value={carteiraId} onChange={(e) => setCarteiraId(e.target.value)}>
              <option value="">Nenhuma por enquanto</option>
              {carteiras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}{c.agencia || c.conta ? ` · ag. ${c.agencia || '—'} cc ${c.conta || '—'}` : ''}
                </option>
              ))}
            </select>
          </Field>
          {carteiras.length === 0 && (
            <span className={`${ui.col2} ${s.nota}`}>Esta empresa ainda não tem conta bancária em Financeiro › Caixa.</span>
          )}
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><Receipt /> Padrões do boleto</div>
        <div className={s.regras}>
          <div className={s.regrasCampos}>
            <div className={s.par}>
              <Field label="Multa por atraso">
                <select value={regras.multaTipo} onChange={(e) => regra('multaTipo', e.target.value as TipoMulta)}>
                  <option value="nenhum">Sem multa</option>
                  <option value="percentual">Percentual</option>
                  <option value="valor">Valor fixo</option>
                </select>
              </Field>
              {regras.multaTipo !== 'nenhum' && (
                <Field label={unidadeMulta === '%' ? 'Multa (%)' : 'Multa (R$)'}>
                  <input inputMode="decimal" value={regras.multa || ''} onChange={(e) => regra('multa', numero(e.target.value))} placeholder={unidadeMulta === '%' ? '2' : '10,00'} />
                </Field>
              )}
            </div>
            <div className={s.par}>
              <Field label="Juros por atraso">
                <select value={regras.jurosTipo} onChange={(e) => regra('jurosTipo', e.target.value as TipoJuros)}>
                  <option value="nenhum">Sem juros</option>
                  <option value="percentual-mes">% ao mês</option>
                  <option value="valor-dia">Valor por dia</option>
                </select>
              </Field>
              {regras.jurosTipo !== 'nenhum' && (
                <Field label={`Juros (${unidadeJuros})`}>
                  <input inputMode="decimal" value={regras.juros || ''} onChange={(e) => regra('juros', numero(e.target.value))} placeholder={regras.jurosTipo === 'percentual-mes' ? '1' : '0,50'} />
                </Field>
              )}
            </div>
            <div className={s.par}>
              <Field label="Desconto por antecipação">
                <select value={regras.descontoTipo} onChange={(e) => regra('descontoTipo', e.target.value as TipoMulta)}>
                  <option value="nenhum">Sem desconto</option>
                  <option value="percentual">Percentual</option>
                  <option value="valor">Valor fixo</option>
                </select>
              </Field>
              {regras.descontoTipo !== 'nenhum' && (
                <>
                  <Field label={`Desconto (${unidadeDesconto})`}>
                    <input inputMode="decimal" value={regras.desconto || ''} onChange={(e) => regra('desconto', numero(e.target.value))} />
                  </Field>
                  <Field label="Até quantos dias antes">
                    <input type="number" min={0} value={regras.descontoDiasAntes} onChange={(e) => regra('descontoDiasAntes', Math.max(0, Math.trunc(Number(e.target.value) || 0)))} />
                  </Field>
                </>
              )}
            </div>
            <div className={s.par}>
              <Field label="Baixa automática (dias)" hint="Dias depois do vencimento (0 a 60) até o banco cancelar o boleto não pago.">
                <input type="number" min={0} max={60} value={regras.diasBaixa} onChange={(e) => regra('diasBaixa', Math.min(60, Math.max(0, Math.trunc(Number(e.target.value) || 0))))} />
              </Field>
              <Field label="Pix junto">
                <button type="button" className={ui.switchWrap} onClick={() => regra('comPix', !regras.comPix)}>
                  <span className={`${ui.switch} ${regras.comPix ? ui.switchOn : ''}`}><span className={ui.switchDot} /></span>
                  <span className={ui.switchLbl}>{regras.comPix ? 'Boleto + Pix' : 'Só boleto'}</span>
                </button>
              </Field>
            </div>
            <div>
              <span className={s.rotulo}>Instruções impressas no boleto</span>
              <div className={s.instrucoes}>
                {instrucoes.map((l, i) => (
                  <div key={i} className={s.instrucao}>
                    <input
                      id={`instrucao-${i}`}
                      value={l}
                      onChange={(e) => setInstrucao(i, e.target.value)}
                      placeholder={i === 0 ? 'Ex.: Não receber após 30 dias do vencimento' : `Linha ${i + 1} (opcional)`}
                      aria-label={`Instrução ${i + 1}`}
                    />
                    <span className={s.contador}>{l.length}/{MAX_CARACTERES_LINHA}</span>
                  </div>
                ))}
              </div>
              <span className={s.nota}>As 2 primeiras linhas do boleto ficam com a referência da cobrança (ex.: "Fatura 61 · parcela 1/2").</span>
            </div>
          </div>
          <aside className={s.previa} aria-label="Como o boleto vai sair">
            <span className={s.previaTitulo}>Como o boleto vai sair</span>
            <ul>
              {resumoRegras(regras).map((t) => <li key={t}>{t}</li>)}
            </ul>
          </aside>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><BellRing /> Aviso de pagamento</div>
        <div className={s.linhaLigar}>
          {aviso ? (
            <span className={`${s.aviso} ${s.avisoOk}`} style={{ margin: 0 }}><ShieldCheck /> <span>Cadastrado no banco em {new Date(aviso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}, apontando para {window.location.host}.</span></span>
          ) : (
            <span className={s.nota} style={{ margin: 0 }}>Ainda não cadastrado: o pagamento só aparece pela conferência de hora em hora ou quando alguém consulta.</span>
          )}
          {integracao?.configurada && integracao.ativa && (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => void cadastrarAviso()} disabled={cadastrandoAviso}>
              <BellRing /> {cadastrandoAviso ? 'Cadastrando...' : aviso ? 'Cadastrar de novo' : 'Cadastrar aviso no banco'}
            </button>
          )}
        </div>
        <span className={s.nota}>
          O banco chama o ELROND na hora em que o boleto é pago, cancelado ou expira; o ELROND confere no banco antes de dar baixa. Uma
          conferência automática de hora em hora cobre qualquer aviso perdido. A tela de boletos mostra quanto o banco demorou para avisar.
        </span>
      </section>
    </Modal>
  )
}
