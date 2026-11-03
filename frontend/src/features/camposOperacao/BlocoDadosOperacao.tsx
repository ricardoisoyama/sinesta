import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Field } from '@/features/common/Field'
import { Hint } from '@/features/common/Hint'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import { listClientes, listFornecedores, listServicos, listVeiculos, listVendedores } from '@/features/cadastros/api'
import { nomeVeiculo } from '@/features/veiculos/types'
import ui from '@/features/common/ui.module.css'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import { UFS } from '@/lib/ufs'
import { CadastroBusca, type OpcaoCadastro } from './CadastroBusca'
import { EFEITOS, campoUfDaCidade, efeitoDe, numeroDe, textoCidade, type CampoOperacao, type ValoresOperacao } from './types'
import { preencherAdValorem, taxaDaRota, ufDoValor, valoresIniciaisAdValorem } from './advalorem'
import { aliquotaDaRota, preencherIcms } from './icms'
import { listAliquotasIcms } from '@/features/icms/api'
import { useApolicesCarregadas } from './useApolices'
import { formatBRL, formatPct } from '@/lib/format'
import s from './camposOperacao.module.css'
import money from '@/features/common/MoneyInput.module.css'

interface Props {
  /** Empresa dos campos: escolhe a apólice do ad valorem. */
  empresaId: string
  campos: CampoOperacao[]
  valores: ValoresOperacao
  onChange: (chave: string, valor: string | number) => void
  /** Marca em vermelho os obrigatórios vazios (depois que o usuário tentou avançar). */
  mostrarFaltas?: boolean
  /** Mostra a etiqueta de efeito ao lado do rótulo (na prévia do cadastro). */
  mostrarEfeito?: boolean
}

/**
 * O bloco "Dados da operação" montado a partir da configuração da empresa. É o mesmo
 * componente na prévia do cadastro e na Precificação: o que se configura é o que se vê.
 */
export function BlocoDadosOperacao({ empresaId, campos, valores, onChange, mostrarFaltas, mostrarEfeito }: Props) {
  const precisaCadastro = campos.some((c) => c.tipo === 'cadastro')
  const { data: clientes } = useQuery({ queryKey: ['clientes'], queryFn: listClientes, enabled: precisaCadastro })
  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores, enabled: precisaCadastro })
  const { data: vendedores } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores, enabled: precisaCadastro })
  const { data: servicos } = useQuery({ queryKey: ['servicos'], queryFn: listServicos, enabled: precisaCadastro })
  const { data: veiculos } = useQuery({ queryKey: ['veiculos'], queryFn: listVeiculos, enabled: campos.some((c) => c.tipo === 'cadastro' && c.cadastro === 'veiculo') })

  const opcoesCadastro = (c: CampoOperacao): OpcaoCadastro[] => {
    if (c.cadastro === 'cliente') return (clientes ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: x.nomeFantasia || x.nome, doc: x.cpfCnpj }))
    if (c.cadastro === 'fornecedor') return (fornecedores ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: x.nomeFantasia || x.nome, doc: x.cpfCnpj }))
    if (c.cadastro === 'vendedor') return (vendedores ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: x.nome }))
    if (c.cadastro === 'servico') return (servicos ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: x.nome }))
    if (c.cadastro === 'veiculo') return (veiculos ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: nomeVeiculo(x), busca: `${x.placaTracao} ${x.placaReboque} ${x.nomeProprietario}` }))
    return []
  }

  // Ad valorem: mudar origem ou destino preenche o percentual pela apólice vigente (ajustável depois).
  // ICMS: o mesmo gatilho, pela Tabela de ICMS.
  const temAdValorem = campos.some((c) => c.tipo === 'advalorem')
  const temIcms = campos.some((c) => c.tipo === 'icms')
  const { apoliceDe, carregadas } = useApolicesCarregadas(empresaId, temAdValorem)
  // Primeira carga: ad valorem vazio recebe o % da apólice (rota ou taxa padrão) ou o % fixo do campo.
  // Depois disso vale o que a pessoa digitar (mudar origem/destino ainda recalcula pela apólice).
  useEffect(() => {
    if (!temAdValorem || !carregadas) return
    const depois = valoresIniciaisAdValorem(campos, valores, (t) => apoliceDe(t)?.apolice)
    for (const c of campos) if (c.tipo === 'advalorem' && depois[c.chave] !== valores[c.chave]) onChange(c.chave, depois[c.chave])
  }, [temAdValorem, carregadas, campos]) // eslint-disable-line react-hooks/exhaustive-deps
  const { data: tabelaIcms } = useQuery({ queryKey: ['aliquotas-icms'], queryFn: listAliquotasIcms, enabled: temIcms })
  const mudar = (chave: string, valor: string | number) => {
    onChange(chave, valor)
    if (!temAdValorem && !temIcms) return
    const antes = { ...valores, [chave]: valor }
    let depois = preencherAdValorem(campos, antes, chave, (t) => apoliceDe(t)?.apolice)
    depois = preencherIcms(campos, depois, chave, tabelaIcms ?? [])
    for (const c of campos) if ((c.tipo === 'advalorem' || c.tipo === 'icms') && depois[c.chave] !== antes[c.chave]) onChange(c.chave, depois[c.chave])
  }
  /** De onde veio a alíquota de ICMS (ou quanto a tabela daria, quando foi ajustada). */
  const notaIcms = (c: CampoOperacao) => {
    const o = ufDoValor(valores[c.campoOrigem ?? ''])
    const d = ufDoValor(valores[c.campoDestino ?? ''])
    if (!o || !d) return ''
    const aliq = aliquotaDaRota(tabelaIcms ?? [], o, d)
    if (aliq === null) return `${o} → ${d} fora da Tabela de ICMS`
    return Math.abs(aliq - numeroDe(valores[c.chave])) < 1e-9 ? `Tabela de ICMS ${o} → ${d}` : `ajustado (tabela ${o} → ${d}: ${formatPct(aliq)})`
  }
  /** De onde veio o percentual (ou quanto a apólice daria, quando foi ajustado). */
  const notaAdValorem = (c: CampoOperacao) => {
    const pct = numeroDe(valores[c.chave])
    const base = c.campoBase ? numeroDe(valores[c.campoBase]) : 0
    const emReais = pct > 0 && base > 0 ? `${formatBRL(pct * base)} sobre ${formatBRL(base)}` : ''
    const a = c.seguro ? apoliceDe(c.seguro) : undefined
    const fixo = (c.percentualFixo ?? 0) > 0 ? (Math.abs((c.percentualFixo ?? 0) - pct) < 1e-9 ? '% fixo do campo' : `ajustado (% fixo: ${formatPct(c.percentualFixo ?? 0)})`) : ''
    if (!a) return [emReais, fixo || (c.seguro && c.seguro !== 'Outro' ? `sem apólice ${c.seguro} vigente` : '')].filter(Boolean).join(' · ')
    const taxa = taxaDaRota(a.apolice, valores[c.campoOrigem ?? ''], valores[c.campoDestino ?? ''])
    const fonte = !taxa ? '' : Math.abs(taxa.pct - pct) < 1e-9 ? `venda da apólice ${a.apolice.numero || a.apolice.tipo}` : `ajustado (venda da apólice: ${formatPct(taxa.pct)})`
    // O custo aparece para mostrar a margem; sem venda cadastrada, avisa que está cobrando o custo.
    const custo = !taxa ? '' : taxa.semVenda ? `sem % de venda na apólice: cobrando o custo (${formatPct(taxa.custo)})` : `custo ${formatPct(taxa.custo)}`
    return [emReais, fonte, custo].filter(Boolean).join(' · ')
  }

  // Cidade ligada a um campo de UF: busca só naquela UF quando ela está preenchida.
  const ufDe = (cidade: CampoOperacao) => {
    const campoUf = campoUfDaCidade(campos, cidade)
    return campoUf ? String(valores[campoUf.chave] ?? '') : ''
  }
  // Trocar a UF limpa as cidades ligadas a ela que eram de outra UF ("SP - Santos" com UF = RJ).
  const trocarUf = (campoUf: CampoOperacao, uf: string) => {
    mudar(campoUf.chave, uf)
    for (const cidade of campos.filter((x) => x.tipo === 'cidade' && campoUfDaCidade(campos, x)?.id === campoUf.id)) {
      const atual = String(valores[cidade.chave] ?? '')
      if (uf && atual && !atual.startsWith(textoCidade(uf, ''))) mudar(cidade.chave, '')
    }
  }

  if (campos.length === 0)
    return <div className={s.blocoVazio}>Nenhum campo configurado. Configure em Parametrizações › Dados da Operação.</div>

  return (
    <div className={s.bloco}>
      {campos.map((c) => {
        const v = valores[c.chave]
        const vazio = v === undefined || v === '' || (typeof v === 'number' && v === 0 && c.tipo !== 'numero' && c.tipo !== 'peso')
        const falta = mostrarFaltas && c.obrigatorio && vazio
        const efeito = efeitoDe(c)
        const rotulo = mostrarEfeito && efeito !== 'informativo' ? `${c.nome}` : c.nome
        return (
          <Field
            key={c.id}
            className={`${s[`larg${c.largura}`]} ${falta ? s.campoFalta : ''}`}
            label={rotulo}
            req={c.obrigatorio}
            hint={c.ajuda || undefined}
            error={falta ? 'Obrigatório' : undefined}
          >
            {mostrarEfeito && efeito !== 'informativo' && (
              <span className={`${s.efeitoTag} ${s[EFEITOS[efeito].cor]}`}>{EFEITOS[efeito].label}</span>
            )}
            {c.tipo === 'texto' && (
              <input value={String(v ?? '')} onChange={(e) => onChange(c.chave, e.target.value)} placeholder={c.largura === 4 ? 'Texto livre' : ''} />
            )}
            {c.tipo === 'data' && <input type="date" value={String(v ?? '')} onChange={(e) => onChange(c.chave, e.target.value)} />}
            {c.tipo === 'numero' && (
              <input
                inputMode="decimal"
                value={v === undefined ? '' : String(v)}
                onChange={(e) => onChange(c.chave, e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder={efeito === 'multiplica' ? '1' : '0'}
              />
            )}
            {c.tipo === 'peso' && (
              // Mesmo desenho do campo em R$: unidade à esquerda, dentro do campo.
              <div className={money.money}>
                <span>kg</span>
                <input
                  inputMode="decimal"
                  value={v === undefined ? '' : String(v)}
                  onChange={(e) => onChange(c.chave, e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="0"
                />
              </div>
            )}
            {c.tipo === 'valor' && <MoneyInput value={Number(v) || 0} onChange={(n) => onChange(c.chave, n)} />}
            {c.tipo === 'percentual' && <PercentInput value={Number(v) || 0} onChange={(n) => onChange(c.chave, n)} />}
            {c.tipo === 'icms' && (
              <>
                <PercentInput value={Number(v) || 0} onChange={(n) => onChange(c.chave, n)} />
                {notaIcms(c) && <span className={s.notaCampo}>{notaIcms(c)}</span>}
              </>
            )}
            {c.tipo === 'advalorem' && (
              <>
                {/* De onde veio o % (apólice, fixo, ajustado) fica no balão, não embaixo do campo. */}
                <div className={s.comBalao}>
                  <PercentInput value={Number(v) || 0} onChange={(n) => onChange(c.chave, n)} />
                  {notaAdValorem(c) && <Hint text={notaAdValorem(c)} />}
                </div>
              </>
            )}
            {c.tipo === 'lista' && (
              <select value={String(v ?? '')} onChange={(e) => onChange(c.chave, e.target.value)}>
                <option value="">Selecione</option>
                {c.opcoes.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}
            {c.tipo === 'uf' && (
              <select value={String(v ?? '')} onChange={(e) => trocarUf(c, e.target.value)}>
                <option value="">Selecione</option>
                {UFS.map((u) => (
                  <option key={u.sigla} value={u.sigla}>{u.sigla} - {u.nome}</option>
                ))}
              </select>
            )}
            {c.tipo === 'cidade' && (
              <CidadeAutocomplete
                value={String(v ?? '')}
                onChange={(t) => mudar(c.chave, t)}
                uf={ufDe(c)}
                formato="uf-cidade"
                placeholder={ufDe(c) ? `Cidade de ${ufDe(c)}` : 'Digite a cidade'}
              />
            )}
            {c.tipo === 'cadastro' && (
              <CadastroBusca
                opcoes={opcoesCadastro(c)}
                value={String(v ?? '')}
                onChange={(id) => onChange(c.chave, id)}
                placeholder={
                  c.cadastro === 'cliente' || c.cadastro === 'fornecedor' ? 'Digite o nome ou o CNPJ' : c.cadastro === 'veiculo' ? 'Digite a placa ou o modelo' : 'Digite o nome'
                }
              />
            )}
          </Field>
        )
      })}
      {campos.length === 0 && <span className={ui.cellMut}>Sem campos.</span>}
    </div>
  )
}
