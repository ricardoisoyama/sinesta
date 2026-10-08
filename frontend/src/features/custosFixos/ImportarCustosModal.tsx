import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ImportadorXlsx } from '@/features/common/ImportadorXlsx'
import type { LinhaMapeada } from '@/features/common/importador'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import {
  listCategoriasCusto,
  createCategoriaCusto,
  listFornecedores,
  createFornecedor,
  importarCustosFixos,
} from '@/features/cadastros/api'
import { usePlanoContas } from '@/features/planoContas/store'
import { formatBRL, parseNumeroPlanilha } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import { emptyParceiro } from '@/features/parceiros/parceiro-schema'
import { DATA_FIM_SEM_PRAZO, type CustoFixo, type TipoCustoFixo } from './types'

/** Linha já validada, ainda com categoria e fornecedor por NOME (resolvidos ao importar). */
interface CustoImportado {
  unidadeId: string
  descricao: string
  categoriaNome: string
  valorMensal: number
  tipo: TipoCustoFixo
  dataInicio: string
  dataFim: string
  fornecedorNome: string
  planoContaId: string
  diaVencimento: number
}

const COLUNAS = [
  { titulo: 'Empresa', exemplo: 'Matriz', obrigatoria: true },
  { titulo: 'Descrição', exemplo: 'Sistema de gestão', obrigatoria: true },
  { titulo: 'Centro de custo', exemplo: 'Sistemas/TI', obrigatoria: true },
  { titulo: 'Valor mensal', exemplo: '787,40', obrigatoria: true },
  { titulo: 'Tipo', exemplo: 'Recorrente' },
  { titulo: 'Início', exemplo: '01/01/2026' },
  { titulo: 'Término', exemplo: '' /* vazio = sem prazo final (31/12/9999) */ },
  { titulo: 'Fornecedor', exemplo: 'Softline Sistemas' },
  { titulo: 'Plano de contas (código)', exemplo: '3.03.001' },
  { titulo: 'Dia de vencimento', exemplo: '10' },
]

/** Aceita "dd/mm/aaaa" e "aaaa-mm-dd"; devolve null quando o texto não é data. */
function normalizarData(v: string): string | null {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}

interface Props {
  open: boolean
  onClose: () => void
}

export function ImportarCustosModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const { data: empresas } = useEmpresasQuery()
  const { data: categorias } = useQuery({ queryKey: ['categorias-custo'], queryFn: listCategoriasCusto })
  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores })
  const { analiticas } = usePlanoContas()

  const mapear = (linha: Record<string, string>): LinhaMapeada<CustoImportado> => {
    const nomeEmpresa = linha['Empresa']
    const empresa = (empresas ?? []).find((e) => semAcento(e.nome) === semAcento(nomeEmpresa))
    if (!empresa) return { erro: `Empresa "${nomeEmpresa}" não está cadastrada` }

    const descricao = linha['Descrição']
    if (descricao.length < 2) return { erro: 'Descrição vazia' }

    const categoriaNome = linha['Centro de custo']
    if (!categoriaNome) return { erro: 'Centro de custo vazio' }

    const valorMensal = parseNumeroPlanilha(linha['Valor mensal'])
    if (!Number.isFinite(valorMensal) || valorMensal < 0) return { erro: 'Valor mensal inválido' }

    const tipoTexto = semAcento(linha['Tipo'] || 'recorrente')
    if (tipoTexto !== 'recorrente' && tipoTexto !== 'spot')
      return { erro: 'Tipo deve ser Recorrente ou Spot' }
    const tipo: TipoCustoFixo = tipoTexto === 'spot' ? 'spot' : 'recorrente'

    const dataInicio = normalizarData(linha['Início'])
    const fimLido = normalizarData(linha['Término'])
    if (dataInicio === null || fimLido === null) return { erro: 'Data inválida (use dd/mm/aaaa)' }
    // Recorrente sem término = sem prazo final (31/12/9999), igual ao cadastro pela tela.
    const dataFim = !fimLido && tipo === 'recorrente' ? DATA_FIM_SEM_PRAZO : fimLido
    if (dataInicio && dataFim && dataFim < dataInicio)
      return { erro: 'Término antes do início' }

    const codigoConta = linha['Plano de contas (código)']
    const conta = codigoConta ? analiticas().find((c) => c.codigo === codigoConta) : undefined
    if (codigoConta && !conta) return { erro: `Conta "${codigoConta}" não existe no plano de contas` }

    const diaTexto = (linha['Dia de vencimento'] ?? '').trim()
    const diaVencimento = diaTexto ? Number(diaTexto) : 0
    if (!Number.isInteger(diaVencimento) || diaVencimento < 0 || diaVencimento > 31) return { erro: 'Dia de vencimento deve ser de 1 a 31' }

    return {
      item: {
        unidadeId: empresa.id,
        descricao,
        categoriaNome,
        valorMensal,
        tipo,
        dataInicio,
        dataFim,
        fornecedorNome: linha['Fornecedor'],
        planoContaId: conta?.id ?? '',
        diaVencimento,
      },
      resumo: `${descricao} · ${empresa.nome} · ${formatBRL(valorMensal)}`,
    }
  }

  /** Cria o que faltar (categorias e fornecedores citados na planilha) e grava em lote. */
  const importar = async (itens: CustoImportado[]) => {
    const catPorNome = new Map((categorias ?? []).map((c) => [semAcento(c.nome), c.id]))
    for (const nome of new Set(itens.map((i) => i.categoriaNome))) {
      if (catPorNome.has(semAcento(nome))) continue
      const criada = await createCategoriaCusto({ id: '', nome, planoContaId: '', status: 'ativo' })
      catPorNome.set(semAcento(nome), criada.id)
    }

    const fornPorNome = new Map((fornecedores ?? []).map((f) => [semAcento(f.nome), f.id]))
    for (const nome of new Set(itens.map((i) => i.fornecedorNome).filter(Boolean))) {
      if (fornPorNome.has(semAcento(nome))) continue
      const criado = await createFornecedor({ ...emptyParceiro, id: '', nome })
      fornPorNome.set(semAcento(nome), criado.id)
    }

    const custos: CustoFixo[] = itens.map((i) => ({
      id: '',
      unidadeId: i.unidadeId,
      descricao: i.descricao,
      categoriaId: catPorNome.get(semAcento(i.categoriaNome)) ?? '',
      valorMensal: i.valorMensal,
      planoContaId: i.planoContaId,
      tipo: i.tipo,
      dataInicio: i.dataInicio,
      dataFim: i.dataFim,
      fornecedorId: i.fornecedorNome ? (fornPorNome.get(semAcento(i.fornecedorNome)) ?? '') : '',
      diaVencimento: i.diaVencimento,
      status: 'ativo',
    }))

    await importarCustosFixos(custos)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['custos-fixos'] }),
      qc.invalidateQueries({ queryKey: ['categorias-custo'] }),
      qc.invalidateQueries({ queryKey: ['fornecedores'] }),
    ])
  }

  return (
    <ImportadorXlsx
      open={open}
      titulo="Despesas Fixas (DF)"
      descricao="Baixe o modelo, preencha uma linha por despesa e envie de volta. Centros de custo e fornecedores que ainda não existirem são criados automaticamente; a empresa precisa estar cadastrada."
      colunas={COLUNAS}
      nomeArquivo="modelo-custos-fixos.xlsx"
      mapear={mapear}
      onImportar={importar}
      onClose={onClose}
    />
  )
}
