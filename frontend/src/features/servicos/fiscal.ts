import { useQuery } from '@tanstack/react-query'
import type { OpcaoBusca } from '@/features/common/BuscaOpcoes'

/**
 * Dados fiscais do serviço para a NFS-e, por empresa emitente, com as retenções. A alíquota do ISS vem dos
 * impostos do serviço; inscrição municipal e regime, da empresa.
 */
export interface ServicoFiscal {
  empresaId: string
  ativo: boolean
  itemLc116: string
  codigoNacional: string
  codigoMunicipal: string
  descricao: string
  cnae: string
  nbs: string
  tributacaoIss: 'NoMunicipio' | 'ForaDoMunicipio' | 'Exportacao' | 'Isenta' | 'Imune'
  cstPisCofins: string
  transparenciaAliquota: number
  transparenciaFonte: string
  indicadorOperacao: string
  cstIbsCbs: string
  classificacaoTributaria: string
  descontarImpostos: boolean
  issNoLiquido: boolean
  /** Retenções na fonte pelo tomador pessoa jurídica (fração; 0 = não retém). */
  retencaoIr: number
  retencaoPis: number
  retencaoCofins: number
  retencaoCsll: number
  retencaoInss: number
  /** O tomador retém o ISS (pela alíquota do ISS do serviço). */
  issRetido: boolean
}

export const RETENCOES: { campo: 'retencaoIr' | 'retencaoPis' | 'retencaoCofins' | 'retencaoCsll' | 'retencaoInss'; nome: string; exemplo: string }[] = [
  { campo: 'retencaoIr', nome: 'IR', exemplo: '1,5% (ou 1%)' },
  { campo: 'retencaoPis', nome: 'PIS', exemplo: '0,65%' },
  { campo: 'retencaoCofins', nome: 'COFINS', exemplo: '3%' },
  { campo: 'retencaoCsll', nome: 'CSLL', exemplo: '1%' },
  { campo: 'retencaoInss', nome: 'INSS', exemplo: '11% (cessão de mão de obra)' },
]

export const novoFiscal = (empresaId: string): ServicoFiscal => ({
  empresaId,
  ativo: true,
  itemLc116: '',
  codigoNacional: '',
  codigoMunicipal: '',
  descricao: '',
  cnae: '',
  nbs: '',
  tributacaoIss: 'NoMunicipio',
  cstPisCofins: '',
  transparenciaAliquota: 0,
  transparenciaFonte: 'IBPT',
  indicadorOperacao: '',
  cstIbsCbs: '',
  classificacaoTributaria: '',
  descontarImpostos: true,
  issNoLiquido: false,
  retencaoIr: 0,
  retencaoPis: 0,
  retencaoCofins: 0,
  retencaoCsll: 0,
  retencaoInss: 0,
  issRetido: false,
})

export const TRIBUTACOES_ISS: { valor: ServicoFiscal['tributacaoIss']; label: string }[] = [
  { valor: 'NoMunicipio', label: 'No município do prestador' },
  { valor: 'ForaDoMunicipio', label: 'Fora do município (local da prestação)' },
  { valor: 'Exportacao', label: 'Exportação de serviço' },
  { valor: 'Isenta', label: 'Isenta' },
  { valor: 'Imune', label: 'Imune' },
]

/** CST do PIS/COFINS nas saídas (tabela da Receita Federal). */
export const CSTS_PIS_COFINS: { valor: string; label: string }[] = [
  { valor: '01', label: '01 - Operação tributável com alíquota básica' },
  { valor: '02', label: '02 - Operação tributável com alíquota diferenciada' },
  { valor: '03', label: '03 - Operação tributável com alíquota por unidade de medida de produto' },
  { valor: '04', label: '04 - Operação tributável monofásica - revenda a alíquota zero' },
  { valor: '05', label: '05 - Operação tributável por substituição tributária' },
  { valor: '06', label: '06 - Operação tributável a alíquota zero' },
  { valor: '07', label: '07 - Operação isenta da contribuição' },
  { valor: '08', label: '08 - Operação sem incidência da contribuição' },
  { valor: '09', label: '09 - Operação com suspensão da contribuição' },
  { valor: '49', label: '49 - Outras operações de saída' },
]

/** Tabelas oficiais (gov.br/nfse e Conformidade Fácil), carregadas só quando a tela abre. */
export interface TabelasFiscais {
  /** Lista nacional de serviços: [código nacional (6 dígitos ou vazio no título), item LC 116, descrição]. */
  lista: [string, string, string][]
  nbs: [string, string][]
  /** [código, tipo de operação, característica, local]. */
  indop: [string, string, string, string][]
  cclasstrib: { cst: string; nome: string; itens: [string, string][] }[]
  /** Item LC 116 → [NBS, indicadores, classificações] sugeridos. */
  correlacao: Record<string, [string[], string[], string[]]>
}

async function carregar(): Promise<TabelasFiscais> {
  const [lista, nbs, indop, cclasstrib, correlacao] = await Promise.all([
    import('./fiscal/lista-servicos.json'),
    import('./fiscal/nbs.json'),
    import('./fiscal/indop.json'),
    import('./fiscal/cclasstrib.json'),
    import('./fiscal/correlacao.json'),
  ])
  return {
    lista: lista.default as TabelasFiscais['lista'],
    nbs: nbs.default as TabelasFiscais['nbs'],
    indop: indop.default as TabelasFiscais['indop'],
    cclasstrib: cclasstrib.default as TabelasFiscais['cclasstrib'],
    correlacao: correlacao.default as unknown as TabelasFiscais['correlacao'],
  }
}

export const useTabelasFiscais = () => useQuery({ queryKey: ['tabelas-fiscais'], queryFn: carregar, staleTime: Infinity })

/** Opções dos combos, montadas das tabelas. */
export function opcoesFiscais(t: TabelasFiscais) {
  // Item da lista nacional: o título do item (ex.: "11 - Guarda...") é o grupo; o desdobro nacional é a opção.
  const itens: OpcaoBusca[] = []
  let grupo = ''
  for (const [codigo, item, descricao] of t.lista) {
    if (!codigo) {
      if (!item.includes('.')) grupo = `${item} - ${descricao}`
      continue
    }
    itens.push({ valor: codigo, rotulo: `${item} · ${codigo} - ${descricao}`, grupo })
  }
  const nbs: OpcaoBusca[] = t.nbs.map(([c, d]) => ({ valor: c, rotulo: `${c} - ${d}` }))
  const indop: OpcaoBusca[] = t.indop.map(([c, tipo, carac, local]) => ({ valor: c, rotulo: `${c} - ${tipo}`, grupo: tipo, detalhe: `${carac} · ${local}` }))
  const cclass: OpcaoBusca[] = t.cclasstrib.flatMap((g) => g.itens.map(([c, n]) => ({ valor: c, rotulo: `${c} - ${n}`, grupo: `${g.cst} - ${g.nome}` })))
  return { itens, nbs, indop, cclass }
}
