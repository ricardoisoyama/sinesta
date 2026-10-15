import { useQuery } from '@tanstack/react-query'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import { listClientes, listFornecedores, listServicos, listVendedores } from '@/features/cadastros/api'
import ui from '@/features/common/ui.module.css'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import { UFS } from '@/lib/ufs'
import { CadastroBusca, type OpcaoCadastro } from './CadastroBusca'
import { EFEITOS, campoUfDaCidade, efeitoDe, textoCidade, type CampoOperacao, type ValoresOperacao } from './types'
import s from './camposOperacao.module.css'

interface Props {
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
export function BlocoDadosOperacao({ campos, valores, onChange, mostrarFaltas, mostrarEfeito }: Props) {
  const precisaCadastro = campos.some((c) => c.tipo === 'cadastro')
  const { data: clientes } = useQuery({ queryKey: ['clientes'], queryFn: listClientes, enabled: precisaCadastro })
  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores, enabled: precisaCadastro })
  const { data: vendedores } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores, enabled: precisaCadastro })
  const { data: servicos } = useQuery({ queryKey: ['servicos'], queryFn: listServicos, enabled: precisaCadastro })

  const opcoesCadastro = (c: CampoOperacao): OpcaoCadastro[] => {
    if (c.cadastro === 'cliente') return (clientes ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: x.nomeFantasia || x.nome, doc: x.cpfCnpj }))
    if (c.cadastro === 'fornecedor') return (fornecedores ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: x.nomeFantasia || x.nome, doc: x.cpfCnpj }))
    if (c.cadastro === 'vendedor') return (vendedores ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: x.nome }))
    if (c.cadastro === 'servico') return (servicos ?? []).filter((x) => x.status === 'ativo').map((x) => ({ id: x.id, nome: x.nome }))
    return []
  }

  // Cidade ligada a um campo de UF: busca só naquela UF quando ela está preenchida.
  const ufDe = (cidade: CampoOperacao) => {
    const campoUf = campoUfDaCidade(campos, cidade)
    return campoUf ? String(valores[campoUf.chave] ?? '') : ''
  }
  // Trocar a UF limpa as cidades ligadas a ela que eram de outra UF ("SP - Santos" com UF = RJ).
  const trocarUf = (campoUf: CampoOperacao, uf: string) => {
    onChange(campoUf.chave, uf)
    for (const cidade of campos.filter((x) => x.tipo === 'cidade' && campoUfDaCidade(campos, x)?.id === campoUf.id)) {
      const atual = String(valores[cidade.chave] ?? '')
      if (uf && atual && !atual.startsWith(textoCidade(uf, ''))) onChange(cidade.chave, '')
    }
  }

  if (campos.length === 0)
    return <div className={s.blocoVazio}>Nenhum campo configurado para esta empresa. Configure em Parametrizações › Dados da Operação.</div>

  return (
    <div className={s.bloco}>
      {campos.map((c) => {
        const v = valores[c.chave]
        const vazio = v === undefined || v === '' || (typeof v === 'number' && v === 0 && c.tipo !== 'numero')
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
            {c.tipo === 'valor' && <MoneyInput value={Number(v) || 0} onChange={(n) => onChange(c.chave, n)} />}
            {c.tipo === 'percentual' && <PercentInput value={Number(v) || 0} onChange={(n) => onChange(c.chave, n)} />}
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
                onChange={(t) => onChange(c.chave, t)}
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
                placeholder={c.cadastro === 'cliente' || c.cadastro === 'fornecedor' ? 'Digite o nome ou o CNPJ' : 'Digite o nome'}
              />
            )}
          </Field>
        )
      })}
      {campos.length === 0 && <span className={ui.cellMut}>Sem campos.</span>}
    </div>
  )
}
