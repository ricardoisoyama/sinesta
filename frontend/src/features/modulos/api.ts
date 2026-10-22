import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface ConfiguracaoModulos {
  /** Rotas dos itens de menu desligados neste ambiente. */
  menusDesligados: string[]
}

export const CHAVE_MODULOS = ['configuracao-sistema']

export const lerModulos = () => apiFetch<ConfiguracaoModulos>('/configuracao-sistema')
export const salvarModulos = (menusDesligados: string[]) =>
  apiFetch<ConfiguracaoModulos>('/configuracao-sistema', { method: 'PUT', body: JSON.stringify({ menusDesligados }) })

/** Menus desligados do ambiente (o menu lateral esconde). Sem resposta ainda: nada escondido. */
export function useMenusDesligados(ativo = true): string[] {
  const { data } = useQuery({ queryKey: CHAVE_MODULOS, queryFn: lerModulos, enabled: ativo, staleTime: 5 * 60_000 })
  return data?.menusDesligados ?? []
}

/** Telas que não se desligam: sem elas o ambiente não funciona (ou ninguém liga de volta). */
export const ESSENCIAIS: Record<string, string> = {
  '/dashboard': 'É a tela inicial depois do login.',
  '/cadastros/unidades': 'As empresas (CNPJs) são a base de tudo: preço, financeiro e bancos.',
  '/cadastros/usuarios': 'Sem ela ninguém cadastra funcionários nem dá permissões.',
  '/administrativo/modulos': 'É esta tela: desligada, ninguém liga os módulos de volta.',
}

/** Telas importantes: dá para desligar, mas o sistema avisa o que deixa de funcionar. */
export const IMPORTANTES: Record<string, string> = {
  '/simulador': 'Sem o Pricing não se calcula preço nem se monta proposta.',
  '/propostas': 'As propostas enviadas e a aprovação delas ficam aqui.',
  '/analises/metas': 'A meta compõe o fator do Pricing: sem a tela, ninguém atualiza a meta e o preço fica preso.',
  '/cadastros/custos-fixos': 'As despesas fixas compõem o fator do Pricing e a Projeção.',
  '/cadastros/campos-operacao': 'Os Dados da Operação são os campos que o Pricing pede.',
  '/cadastros/fichas-tecnicas': 'As fichas técnicas são o custo da operação no Pricing.',
  '/financeiro/entradas-saidas': 'Os lançamentos a pagar e a receber, a aprovação e os Pix ficam aqui.',
  '/financeiro/conciliacao': 'Sem ela o extrato do banco não é conferido com os lançamentos.',
  '/cadastros/plano-contas': 'O plano de contas classifica despesas, lançamentos e fornecedores.',
  '/cadastros/aprovadores': 'Sem as regras, lançamentos e propostas não têm quem aprove.',
  '/administrativo/integracoes': 'Sem ela a equipe ELROND não configura bancos (boleto, extrato, Pix).',
  '/administrativo/smtp': 'Sem ela a equipe ELROND não configura o e-mail (avisos e convites).',
}
