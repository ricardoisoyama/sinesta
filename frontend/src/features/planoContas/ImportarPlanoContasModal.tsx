import { useQueryClient } from '@tanstack/react-query'
import { ImportadorXlsx } from '@/features/common/ImportadorXlsx'
import type { LinhaMapeada } from '@/features/common/importador'
import { importarPlanoContas } from '@/features/cadastros/api'
import { parseNumeroPlanilha } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import { usePlanoContas } from './store'
import { contaContabilDoCodigo, type GrupoDre, type PlanoConta, type TipoConta } from './types'

/** Linha validada; o pai é resolvido pelo código na hora de gravar. */
interface ContaImportada {
  codigo: string
  nome: string
  grupoDre: GrupoDre
  contaContabil: string
  limiteGasto?: number
  tipo: TipoConta
}

const COLUNAS = [
  { titulo: 'Código', exemplo: '2.01', obrigatoria: true },
  { titulo: 'Nome', exemplo: 'Despesas com pessoal', obrigatoria: true },
  { titulo: 'Grupo DRE', exemplo: 'Despesa' },
  { titulo: 'Tipo', exemplo: 'Fixa' },
  { titulo: 'Conta contábil', exemplo: '201' },
  { titulo: 'Limite de gasto', exemplo: '' },
]

/** Código do pai: "2.01.01" → "2.01"; raiz ("2") não tem pai. */
const codigoPai = (codigo: string): string | null => {
  const partes = codigo.split('.')
  return partes.length > 1 ? partes.slice(0, -1).join('.') : null
}

/** Grupo pelo primeiro dígito do código (1 = Receita, 2 = Despesa), quando a planilha não diz. */
const grupoPeloCodigo = (codigo: string): GrupoDre | null => {
  const primeiro = codigo.split('.')[0]
  if (primeiro === '1') return 'Receita'
  if (primeiro === '2') return 'Despesa'
  return null
}

interface Props {
  open: boolean
  onClose: () => void
}

export function ImportarPlanoContasModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const { contas } = usePlanoContas()

  const mapear = (linha: Record<string, string>): LinhaMapeada<ContaImportada> => {
    const codigo = linha['Código']
    if (!codigo) return { erro: 'Código vazio' }
    if (contas.some((c) => c.codigo === codigo)) return { erro: `Código ${codigo} já cadastrado` }

    const nome = linha['Nome']
    if (nome.length < 2) return { erro: 'Nome vazio' }

    const grupoTexto = semAcento(linha['Grupo DRE'] || '')
    let grupoDre: GrupoDre
    if (grupoTexto === 'receita') grupoDre = 'Receita'
    else if (grupoTexto === 'despesa') grupoDre = 'Despesa'
    else if (!grupoTexto) grupoDre = grupoPeloCodigo(codigo) ?? 'Despesa'
    else return { erro: 'Grupo DRE deve ser Despesa ou Receita' }

    const tipoTexto = semAcento(linha['Tipo'] || '')
    let tipo: TipoConta = ''
    if (tipoTexto === 'fixa' || tipoTexto === 'fixo') tipo = 'fixa'
    else if (tipoTexto === 'variavel') tipo = 'variavel'
    else if (tipoTexto) return { erro: 'Tipo deve ser Fixa ou Variável (ou vazio)' }

    const limiteTexto = linha['Limite de gasto']
    return {
      item: {
        codigo,
        nome,
        grupoDre,
        tipo,
        contaContabil: linha['Conta contábil'] || contaContabilDoCodigo(codigo),
        limiteGasto: limiteTexto ? parseNumeroPlanilha(limiteTexto) : undefined,
      },
      resumo: `${codigo} · ${nome}`,
    }
  }

  const importar = async (itens: ContaImportada[]) => {
    // Pais antes dos filhos: o código mais curto entra primeiro.
    const ordenadas = [...itens].sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true }),
    )

    const idPorCodigo = new Map(contas.map((c) => [c.codigo, c.id]))
    const novas: PlanoConta[] = ordenadas.map((i) => {
      const id = crypto.randomUUID()
      idPorCodigo.set(i.codigo, id)
      const pai = codigoPai(i.codigo)
      return {
        id,
        codigo: i.codigo,
        nome: i.nome,
        paiId: pai ? (idPorCodigo.get(pai) ?? null) : null,
        grupoDre: i.grupoDre,
        tipo: i.tipo,
        contaContabil: i.contaContabil,
        limiteGasto: i.limiteGasto,
        status: 'ativo',
      }
    })

    await importarPlanoContas(novas)
    await qc.invalidateQueries({ queryKey: ['plano-contas'] })
  }

  return (
    <ImportadorXlsx
      open={open}
      titulo="Plano de Contas"
      descricao="Baixe o modelo e preencha uma linha por conta. A hierarquia vem do código: 2.01.01 entra automaticamente abaixo de 2.01, que entra abaixo de 2. Receita começa em 1 e Despesa em 2; o Grupo DRE pode ficar em branco que o sistema deduz pelo código. Tipo aceita Fixa ou Variável."
      colunas={COLUNAS}
      nomeArquivo="modelo-plano-de-contas.xlsx"
      mapear={mapear}
      onImportar={importar}
      onClose={onClose}
    />
  )
}
