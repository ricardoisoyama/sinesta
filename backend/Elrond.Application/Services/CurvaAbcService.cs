using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>Pedido da curva. Dimensao: clientes | fornecedores | plano | centro | servicos. Natureza: receita | despesa (plano e centro).</summary>
/// <param name="Base">lancado (competência, não cancelado) | realizado (pago, pela data de pagamento). Serviços usam as propostas aprovadas.</param>
public sealed record PedidoCurvaAbc(string Dimensao, string De, string Ate, string? EmpresaId = null, string Natureza = "receita", string Base = "lancado", decimal CorteA = 0.8m, decimal CorteB = 0.95m);

/// <summary>Um item da curva, já classificado. Margem: só nos serviços (média ponderada pelo valor).</summary>
public sealed record ItemCurvaAbc(int Posicao, string Chave, string Nome, decimal Valor, decimal Percentual, decimal Acumulado, string Classe, int Quantidade, decimal? Margem);

public sealed record ClasseCurvaAbc(string Classe, int Itens, decimal Valor, decimal Percentual);

public sealed record CurvaAbcDto(string Dimensao, string Natureza, string Base, decimal Total, int Itens, IReadOnlyList<ClasseCurvaAbc> Classes, IReadOnlyList<ItemCurvaAbc> Lista);

/// <summary>
/// Curva ABC (Pareto): ordena do maior para o menor e classifica pelo acumulado. A = até o corte A (80%),
/// B = até o corte B (95%), C = o resto. O item que cruza o corte fica na classe de cima (é ele que leva o
/// acumulado até lá). Transferência entre contas não é receita nem despesa e fica de fora.
/// </summary>
public sealed class CurvaAbcService(
    ICrudRepository<Movimento> movimentos,
    ICrudRepository<Proposta> propostas,
    ICrudRepository<PlanoConta> planos,
    ICrudRepository<CategoriaCusto> centros,
    ICrudRepository<Servico> servicos)
{
    public static readonly string[] Dimensoes = ["clientes", "fornecedores", "plano", "centro", "servicos"];

    public async Task<Result<CurvaAbcDto>> CalcularAsync(PedidoCurvaAbc p)
    {
        if (!Dimensoes.Contains(p.Dimensao)) return Result.Failure<CurvaAbcDto>("Escolha o que analisar.");
        if (!DateOnly.TryParse(p.De, out var de) || !DateOnly.TryParse(p.Ate, out var ate) || ate < de) return Result.Failure<CurvaAbcDto>("Período inválido.");
        if (p.CorteA is <= 0 or >= 1 || p.CorteB <= p.CorteA || p.CorteB >= 1) return Result.Failure<CurvaAbcDto>("Os cortes precisam ser crescentes e menores que 100% (ex.: A até 80%, B até 95%).");
        var natureza = p.Dimensao switch { "clientes" or "servicos" => "receita", "fornecedores" => "despesa", _ => p.Natureza == "despesa" ? "despesa" : "receita" };
        var dIso = de.ToString("yyyy-MM-dd");
        var aIso = ate.ToString("yyyy-MM-dd");

        List<(string Chave, string Nome, decimal Valor, decimal? Margem)> linhas;
        if (p.Dimensao == "servicos")
        {
            var nomes = (await servicos.GetAllAsync()).ToDictionary(s => s.Id, s => s.Nome);
            linhas = (await propostas.ListarAsync(x => x.Status == "aprovada"))
                .Where(x => string.CompareOrdinal(x.Data, dIso) >= 0 && string.CompareOrdinal(x.Data[..Math.Min(10, x.Data.Length)], aIso) <= 0)
                .SelectMany(x => x.Itens)
                .Where(i => string.IsNullOrEmpty(p.EmpresaId) || i.EmpresaId == p.EmpresaId)
                .Select(i =>
                {
                    var chave = i.ServicoId.Length > 0 ? i.ServicoId : $"desc:{i.Descricao.Trim().ToLowerInvariant()}";
                    var nome = i.ServicoId.Length > 0 && nomes.TryGetValue(i.ServicoId, out var n) ? n : (i.Descricao.Trim().Length > 0 ? i.Descricao.Trim() : "Sem serviço");
                    return (chave, nome, Valor: i.PrecoFinal + i.AdValorem, Margem: (decimal?)i.Ml);
                })
                .ToList();
        }
        else
        {
            var tipo = natureza == "receita" ? "receber" : "pagar";
            var realizado = p.Base == "realizado";
            var lista = (await movimentos.ListarAsync(m => m.Tipo == tipo && !m.Cancelado && m.Origem != Movimento.OrigemTransferencia))
                .Where(m => string.IsNullOrEmpty(p.EmpresaId) || m.EmpresaId == p.EmpresaId)
                .Where(m => realizado
                    ? m.PagoEm.Length >= 10 && string.CompareOrdinal(m.PagoEm[..10], dIso) >= 0 && string.CompareOrdinal(m.PagoEm[..10], aIso) <= 0
                    : m.Competencia.Length >= 7 && string.CompareOrdinal(m.Competencia, dIso[..7]) >= 0 && string.CompareOrdinal(m.Competencia, aIso[..7]) <= 0)
                .ToList();
            var nomesPlano = p.Dimensao == "plano" ? (await planos.GetAllAsync()).ToDictionary(x => x.Id, x => $"{x.Codigo} · {x.Nome}") : new();
            var nomesCentro = p.Dimensao == "centro" ? (await centros.GetAllAsync()).ToDictionary(x => x.Id, x => x.Nome) : new();
            linhas = lista.Select(m =>
            {
                var valor = realizado ? m.ValorPago : m.Valor;
                return p.Dimensao switch
                {
                    "plano" => (m.PlanoContaId, m.PlanoContaId.Length > 0 ? nomesPlano.GetValueOrDefault(m.PlanoContaId, "Conta removida") : "Sem plano de contas", valor, (decimal?)null),
                    "centro" => (m.CentroCustoId, m.CentroCustoId.Length > 0 ? nomesCentro.GetValueOrDefault(m.CentroCustoId, "Centro removido") : "Sem centro de custo", valor, (decimal?)null),
                    // Cliente/fornecedor: pelo cadastro; lançamento sem cadastro, pelo nome.
                    _ => (m.ParceiroId.Length > 0 ? m.ParceiroId : $"nome:{m.ParceiroNome.Trim().ToLowerInvariant()}", m.ParceiroNome.Trim().Length > 0 ? m.ParceiroNome.Trim() : "Sem nome", valor, (decimal?)null),
                };
            }).ToList();
        }

        return Result.Success(Classificar(p.Dimensao, natureza, p.Dimensao == "servicos" ? "propostas" : p.Base, linhas, p.CorteA, p.CorteB));
    }

    /// <summary>Agrupa, ordena e classifica (público para teste).</summary>
    public static CurvaAbcDto Classificar(string dimensao, string natureza, string @base, IEnumerable<(string Chave, string Nome, decimal Valor, decimal? Margem)> linhas, decimal corteA, decimal corteB)
    {
        var grupos = linhas.Where(l => l.Valor > 0).GroupBy(l => l.Chave)
            .Select(g =>
            {
                var valor = g.Sum(x => x.Valor);
                var comMargem = g.Where(x => x.Margem.HasValue).ToList();
                decimal? margem = comMargem.Count > 0 && comMargem.Sum(x => x.Valor) > 0 ? comMargem.Sum(x => x.Margem!.Value * x.Valor) / comMargem.Sum(x => x.Valor) : null;
                return (g.Key, Nome: g.First().Nome, Valor: valor, Qtd: g.Count(), Margem: margem);
            })
            .OrderByDescending(g => g.Valor).ThenBy(g => g.Nome).ToList();
        var total = grupos.Sum(g => g.Valor);
        var itens = new List<ItemCurvaAbc>();
        decimal acumuladoAntes = 0;
        foreach (var (g, i) in grupos.Select((g, i) => (g, i)))
        {
            var pct = total > 0 ? g.Valor / total : 0;
            // A classe vem do acumulado ANTES do item: quem começa abaixo do corte é da classe (inclusive o que cruza).
            var classe = acumuladoAntes < corteA ? "A" : acumuladoAntes < corteB ? "B" : "C";
            acumuladoAntes += pct;
            itens.Add(new ItemCurvaAbc(i + 1, g.Key, g.Nome, Math.Round(g.Valor, 2), pct, Math.Min(1, acumuladoAntes), classe, g.Qtd, g.Margem));
        }
        var classes = new[] { "A", "B", "C" }.Select(c =>
        {
            var daClasse = itens.Where(x => x.Classe == c).ToList();
            var v = daClasse.Sum(x => x.Valor);
            return new ClasseCurvaAbc(c, daClasse.Count, v, total > 0 ? v / total : 0);
        }).ToList();
        return new CurvaAbcDto(dimensao, natureza, @base, Math.Round(total, 2), itens.Count, classes, itens);
    }
}
