using Elrond.Domain.Entities;

namespace Elrond.Domain.Regras;

/// <summary>O que a proposta aprovada leva para o contrato (e que ali fica travado).</summary>
public sealed record MontagemContrato(
    string Modalidade, string EmpresaId, string ServicoId, string TipoOperacao, string Inicio, string Fim,
    List<ItemEscopo> Itens, List<ComponenteContrato> Componentes);

/// <summary>
/// Contrato a partir da proposta aprovada: o que foi precificado vira a cobrança. Recorrente vira contrato
/// com a vigência combinada; avulso vira spot. No recorrente, cada item diz como entra (<see cref="CobrancaItem"/>):
/// todo mês (linha do escopo), por documento (linha da tabela + soma dos CT-es), por ocorrência (preço do
/// lançamento na pasta) ou uma vez (primeira fatura). O preço do item já tem o ad valorem.
/// </summary>
public static class ContratoDaProposta
{
    public static (MontagemContrato? Montagem, string? Erro) Montar(Proposta p)
    {
        if (p.Itens.Count == 0) return (null, "A proposta não tem itens.");
        if (p.Itens.Select(i => i.EmpresaId).Distinct().Count() > 1)
            return (null, "A proposta tem itens de mais de uma empresa, e o contrato é de uma empresa só. Faça uma proposta por empresa.");
        var recorrente = p.Modalidade == ModalidadeProposta.Recorrente;
        var itens = new List<ItemEscopo>();
        var componentes = new List<ComponenteContrato>();
        var n = 0;
        foreach (var i in p.Itens)
        {
            var apelido = $"item{++n}";
            var preco = Math.Round(i.PrecoComAdValorem, 2, MidpointRounding.AwayFromZero);
            var custo = Math.Round(i.CustoTotal, 2, MidpointRounding.AwayFromZero);
            var servico = i.TipoOperacao is { Length: > 0 } t ? t : "Serviço";
            var cobranca = recorrente ? i.Cobranca ?? CobrancaItem.Mensal : CobrancaItem.Mensal;
            switch (cobranca)
            {
                case CobrancaItem.PorOcorrencia:
                    componentes.Add(new ComponenteContrato
                    {
                        Id = i.Id, Apelido = apelido, Nome = i.Descricao, Regra = RegraComponente.Lancamento,
                        Unidade = i.Unidade is { Length: > 0 } u ? u : "un.", ValorUnitario = preco, Ativo = true,
                    });
                    break;
                case CobrancaItem.Unica:
                    componentes.Add(new ComponenteContrato { Id = i.Id, Apelido = apelido, Nome = i.Descricao, Regra = RegraComponente.Unico, Quantidade = 1, ValorUnitario = preco, Ativo = true });
                    break;
                case CobrancaItem.PorDocumento:
                    itens.Add(new ItemEscopo { Id = i.Id, Apelido = apelido, Tabela = true, Servico = servico, Descricao = i.Descricao, Quantidade = 1, Unidade = "documento", ValorUnitario = preco, CustoUnitario = custo });
                    if (componentes.All(c => c.Regra != RegraComponente.Documento))
                        componentes.Add(new ComponenteContrato { Id = $"{p.Id}-documentos", Apelido = "documentos", Nome = "Documentos da operação", Regra = RegraComponente.Documento, Documento = "CT-e", Ativo = true });
                    break;
                default:
                    itens.Add(new ItemEscopo
                    {
                        Id = i.Id, Apelido = apelido, Tabela = false, Servico = servico, Descricao = i.Descricao, Quantidade = 1,
                        Unidade = recorrente ? "mês" : "serviço", ValorUnitario = preco, CustoUnitario = custo,
                    });
                    break;
            }
        }
        var primeiro = p.Itens[0];
        return (new MontagemContrato(
            recorrente ? Modalidade.Recorrente : Modalidade.Spot,
            primeiro.EmpresaId,
            p.Itens.Select(i => i.ServicoId).FirstOrDefault(s => s.Length > 0) ?? string.Empty,
            primeiro.TipoOperacao ?? string.Empty,
            recorrente ? p.VigenciaInicio : string.Empty,
            recorrente ? p.VigenciaFim : string.Empty,
            itens, componentes), null);
    }
}
