import { calcularFicha } from './calculo'
import type { ColunaFicha, FichaTecnica, GradeFichas } from './types'

/**
 * Copiar itens de uma ficha para outra (e duplicar a ficha inteira). Tudo acontece na grade da
 * tela: o salvamento automático manda a grade inteira e o servidor grava as linhas novas.
 * O que chega no destino é independente da origem: ids novos, mudar um não mexe no outro.
 */

/** Item com o mesmo nome no destino: substitui os valores dele ou cria outro "(cópia)". */
export type ModoRepetido = 'substituir' | 'novo'

/** O que a cópia vai fazer numa ficha de destino (a janela mostra antes de gravar). */
export interface PlanoCopia {
  grupoId: string
  /** Itens que entram como novos. */
  novos: number
  /** Nomes que já existiam no destino. */
  repetidos: string[]
  /** Colunas da origem que o destino não tinha: são criadas iguais (tipo, fórmula, opções). */
  colunasNovas: string[]
  /** Colunas que existem no destino com outro tipo: o valor delas não é copiado. */
  tipoDiferente: string[]
  /** Itens que já estavam no destino e mudam de total por causa das colunas novas (ex.: um cálculo). */
  mudamTotal: number
  /** O total do destino sai de uma fórmula: as colunas novas não entram nele sozinhas. */
  totalPorFormula: boolean
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

/** Copia os itens (com as colunas da origem) para uma ficha. Devolve a grade nova e o plano. */
export function copiarParaFicha(
  grade: GradeFichas,
  colunasOrigem: ColunaFicha[],
  itens: FichaTecnica[],
  destinoId: string,
  modo: ModoRepetido,
): { grade: GradeFichas; plano: PlanoCopia } {
  const formula = grade.grupos.find((g) => g.id === destinoId)?.formulaTotal ?? ''
  const doDestino = grade.colunas.filter((c) => c.grupoId === destinoId && c.status === 'ativo')

  // Coluna da origem → coluna do destino: pela chave (nome nas fórmulas), depois pelo nome.
  const mapa = new Map<string, string>()
  const novas: ColunaFicha[] = []
  const tipoDiferente: string[] = []
  for (const c of colunasOrigem) {
    const par =
      doDestino.find((d) => d.chave === c.chave) ??
      doDestino.find((d) => normalizar(d.nome) === normalizar(c.nome))
    if (par) {
      if (par.tipo === c.tipo) mapa.set(c.id, par.id)
      else tipoDiferente.push(c.nome)
      continue
    }
    const nova: ColunaFicha = {
      ...c,
      id: crypto.randomUUID(),
      grupoId: destinoId,
      opcoes: [...c.opcoes],
      status: 'ativo',
    }
    novas.push(nova)
    mapa.set(c.id, nova.id)
  }
  const valoresNoDestino = (f: FichaTecnica) => {
    const v: FichaTecnica['valores'] = {}
    for (const [colunaId, valor] of Object.entries(f.valores)) {
      const destino = mapa.get(colunaId)
      if (destino) v[destino] = valor
    }
    return v
  }

  const existentes = grade.fichas.filter((f) => f.grupoId === destinoId && f.status === 'ativo')
  const substituidos = new Set<string>()
  const repetidos: string[] = []
  const novosItens: FichaTecnica[] = []
  let fichas = grade.fichas
  for (const item of itens) {
    const igual = existentes.find((e) => normalizar(e.nome) === normalizar(item.nome))
    if (igual) repetidos.push(item.nome)
    if (igual && modo === 'substituir') {
      substituidos.add(igual.id)
      fichas = fichas.map((f) =>
        f.id === igual.id ? { ...f, valores: { ...f.valores, ...valoresNoDestino(item) } } : f,
      )
    } else {
      novosItens.push({
        id: crypto.randomUUID(),
        grupoId: destinoId,
        nome: igual ? `${item.nome} (cópia)` : item.nome,
        valores: valoresNoDestino(item),
        status: 'ativo',
      })
    }
  }

  const colunasDepois = [...doDestino, ...novas]
  const mudamTotal =
    novas.length === 0
      ? 0
      : existentes.filter(
          (f) =>
            !substituidos.has(f.id) &&
            calcularFicha(doDestino, f.valores, formula).total !==
              calcularFicha(colunasDepois, f.valores, formula).total,
        ).length

  return {
    grade: { ...grade, colunas: [...grade.colunas, ...novas], fichas: [...fichas, ...novosItens] },
    plano: {
      grupoId: destinoId,
      novos: novosItens.length,
      repetidos,
      colunasNovas: novas.map((c) => c.nome),
      tipoDiferente,
      mudamTotal,
      totalPorFormula: !!formula.trim() && novas.length > 0,
    },
  }
}

/** Copia para várias fichas de uma vez (uma depois da outra, na mesma grade). */
export function copiarParaFichas(
  grade: GradeFichas,
  colunasOrigem: ColunaFicha[],
  itens: FichaTecnica[],
  destinos: string[],
  modo: ModoRepetido,
) {
  let atual = grade
  const planos: PlanoCopia[] = []
  for (const id of destinos) {
    const r = copiarParaFicha(atual, colunasOrigem, itens, id, modo)
    atual = r.grade
    planos.push(r.plano)
  }
  return { grade: atual, planos }
}

/** Ficha nova "(cópia)" logo abaixo da original, com as colunas, a fórmula do total e os itens ativos. */
export function duplicarFicha(
  grade: GradeFichas,
  grupoId: string,
): { grade: GradeFichas; id: string } {
  const i = grade.grupos.findIndex((g) => g.id === grupoId)
  const origem = grade.grupos[i]
  const nova = {
    ...origem,
    id: crypto.randomUUID(),
    nome: `${origem.nome} (cópia)`,
    status: 'ativo' as const,
  }
  const grupos = [...grade.grupos]
  grupos.splice(i + 1, 0, nova)
  const colunas = grade.colunas.filter((c) => c.grupoId === grupoId && c.status === 'ativo')
  const itens = grade.fichas.filter((f) => f.grupoId === grupoId && f.status === 'ativo')
  return {
    grade: copiarParaFicha({ ...grade, grupos }, colunas, itens, nova.id, 'novo').grade,
    id: nova.id,
  }
}
