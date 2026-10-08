using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>Regras da carteira de clientes: transferência entre vendedores e o que cada usuário enxerga.</summary>
public class CarteiraService : ICarteiraService
{
    private readonly ICrudRepository<Vendedor> _vendedores;
    private readonly ICrudRepository<Cliente> _clientes;
    private readonly IAuditoriaService _auditoria;

    public CarteiraService(ICrudRepository<Vendedor> vendedores, ICrudRepository<Cliente> clientes, IAuditoriaService auditoria)
    {
        _vendedores = vendedores;
        _clientes = clientes;
        _auditoria = auditoria;
    }

    public async Task<Result<int>> TransferirAsync(string deVendedorId, string paraVendedorId)
    {
        if (string.IsNullOrWhiteSpace(deVendedorId) || string.IsNullOrWhiteSpace(paraVendedorId))
            return Result.Failure<int>("Informe o vendedor de origem e o de destino.");
        if (deVendedorId == paraVendedorId)
            return Result.Failure<int>("Origem e destino são o mesmo vendedor.");

        var origem = await _vendedores.GetByIdAsync(deVendedorId);
        if (origem is null) return Result.Failure<int>("Vendedor de origem não encontrado.");
        var destino = await _vendedores.GetByIdAsync(paraVendedorId);
        if (destino is null) return Result.Failure<int>("Vendedor de destino não encontrado.");
        if (destino.Status != "ativo") return Result.Failure<int>("O vendedor de destino está inativo.");

        var alterados = 0;
        foreach (var c in await _clientes.GetAllAsync())
        {
            var mudou = false;
            if (c.VendedorSdrId == deVendedorId) { c.VendedorSdrId = paraVendedorId; mudou = true; }
            if (c.VendedorSalesId == deVendedorId) { c.VendedorSalesId = paraVendedorId; mudou = true; }
            if (c.VendedorCsId == deVendedorId) { c.VendedorCsId = paraVendedorId; mudou = true; }
            if (!mudou) continue;
            await _clientes.UpdateAsync(c.Id, c);
            alterados++;
        }

        await _auditoria.RegistrarAsync("transferir-carteira", "Vendedor", deVendedorId,
            $"Carteira de {origem.Nome} transferida para {destino.Nome} ({alterados} cliente(s))");
        return Result.Success(alterados);
    }

    public async Task<Result<int>> TransferirClientesAsync(IReadOnlyList<string> clienteIds, string? sdrId, string? salesId, string? csId)
    {
        if (clienteIds is null || clienteIds.Count == 0)
            return Result.Failure<int>("Selecione ao menos um cliente.");
        var funcoes = new (string Funcao, string? Id)[] { ("SDR", sdrId), ("Sales", salesId), ("CS", csId) }
            .Where(f => !string.IsNullOrWhiteSpace(f.Id))
            .Select(f => (f.Funcao, Id: f.Id!.Trim()))
            .ToList();
        if (funcoes.Count == 0)
            return Result.Failure<int>("Escolha o vendedor de ao menos uma função (SDR, Sales ou CS).");

        var vendedores = await _vendedores.GetAllAsync();
        var nomes = new List<string>();
        foreach (var (funcao, id) in funcoes)
        {
            var v = vendedores.FirstOrDefault(x => x.Id == id);
            if (v is null) return Result.Failure<int>($"Vendedor de {funcao} não encontrado.");
            if (v.Status != "ativo") return Result.Failure<int>($"O vendedor escolhido para {funcao} ({v.Nome}) está inativo.");
            nomes.Add($"{funcao}: {v.Nome}");
        }

        var ids = clienteIds.ToHashSet();
        var alterados = 0;
        foreach (var c in (await _clientes.GetAllAsync()).Where(c => ids.Contains(c.Id)))
        {
            var mudou = false;
            if (!string.IsNullOrWhiteSpace(sdrId) && c.VendedorSdrId != sdrId) { c.VendedorSdrId = sdrId.Trim(); mudou = true; }
            if (!string.IsNullOrWhiteSpace(salesId) && c.VendedorSalesId != salesId) { c.VendedorSalesId = salesId.Trim(); mudou = true; }
            if (!string.IsNullOrWhiteSpace(csId) && c.VendedorCsId != csId) { c.VendedorCsId = csId.Trim(); mudou = true; }
            if (!mudou) continue;
            await _clientes.UpdateAsync(c.Id, c);
            alterados++;
        }

        await _auditoria.RegistrarAsync("transferir-carteira", "Cliente", string.Join(",", ids.Take(5)),
            $"{alterados} de {ids.Count} cliente(s) selecionado(s) transferido(s) — {string.Join("; ", nomes)}");
        return Result.Success(alterados);
    }

    public async Task<CarteiraVisao> VisaoAsync(UsuarioAtual quem)
    {
        if (quem.EhGestor || string.IsNullOrEmpty(quem.Id)) return CarteiraVisao.Tudo;

        // Vendedor = cadastro de vendedor ligado a este usuário. Quem não é vendedor (financeiro,
        // administrativo...) não tem carteira e continua vendo tudo o que a permissão da tela libera.
        var meus = (await _vendedores.GetAllAsync())
            .Where(v => v.UsuarioId == quem.Id)
            .Select(v => v.Id)
            .ToHashSet();
        if (meus.Count == 0) return CarteiraVisao.Tudo;

        var clientes = (await _clientes.GetAllAsync())
            .Where(c => meus.Contains(c.VendedorSdrId) || meus.Contains(c.VendedorSalesId) || meus.Contains(c.VendedorCsId))
            .Select(c => c.Id)
            .ToHashSet();
        return new CarteiraVisao(false, meus, clientes);
    }
}
