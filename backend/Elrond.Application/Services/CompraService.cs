using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>
/// Limite de compra por comprador (Regra de Compras). Hoje a "compra" do ELROND é a
/// despesa lançada em Custos Fixos com fornecedor: acima do limite do comprador logado,
/// a despesa não entra sem aprovação (a mensagem diz quem aprova).
/// </summary>
public class CompraService : ICompraService
{
    private readonly ICrudRepository<RegraAprovacao> _regras;
    private readonly IUsuarioRepository _usuarios;

    public CompraService(ICrudRepository<RegraAprovacao> regras, IUsuarioRepository usuarios)
    {
        _regras = regras;
        _usuarios = usuarios;
    }

    public async Task<Result> ValidarLimiteAsync(CustoFixo custo, UsuarioAtual quem)
    {
        if (custo.ValorMensal <= 0 || string.IsNullOrEmpty(quem.Id)) return Result.Success();

        var regras = (await _regras.GetAllAsync())
            .Where(r => r.Status == "ativo" && r.Tipo == "compras" && r.CompradorId == quem.Id && r.Limite > 0)
            .ToList();
        if (regras.Count == 0) return Result.Success();

        foreach (var regra in regras)
        {
            if (!string.IsNullOrEmpty(custo.FornecedorId) && regra.Excecoes.Contains(custo.FornecedorId)) continue;
            if (custo.ValorMensal <= regra.Limite) continue;

            var nomes = new List<string>();
            foreach (var id in regra.Aprovadores)
            {
                var u = await _usuarios.GetByIdAsync(id);
                if (u is not null) nomes.Add(u.Name);
            }
            var quemAprova = nomes.Count > 0 ? $" Peça aprovação a: {string.Join(", ", nomes)}." : string.Empty;
            return Result.Failure(
                $"Esta despesa ({custo.ValorMensal:C}) passa do seu limite de compra ({regra.Limite:C}) da regra \"{regra.Nome}\".{quemAprova}");
        }
        return Result.Success();
    }
}
