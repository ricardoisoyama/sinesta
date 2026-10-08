using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

public class OportunidadeService : IOportunidadeService
{
    private readonly ICrudRepository<Oportunidade> _oportunidades;
    private readonly ICrudRepository<Funil> _funis;
    private readonly ICrudRepository<Vendedor> _vendedores;
    private readonly ICrudRepository<Cliente> _clientes;

    public OportunidadeService(
        ICrudRepository<Oportunidade> oportunidades,
        ICrudRepository<Funil> funis,
        ICrudRepository<Vendedor> vendedores,
        ICrudRepository<Cliente> clientes)
    {
        _oportunidades = oportunidades;
        _funis = funis;
        _vendedores = vendedores;
        _clientes = clientes;
    }

    public async Task<Result> ValidarRegiaoAsync(Oportunidade op)
    {
        if (string.IsNullOrEmpty(op.VendedorId) || string.IsNullOrEmpty(op.ClienteId)) return Result.Success();
        var vendedor = await _vendedores.GetByIdAsync(op.VendedorId);
        var cliente = await _clientes.GetByIdAsync(op.ClienteId);
        if (vendedor is null || cliente is null) return Result.Success();

        var bloqueio = RegiaoVendedor.Bloqueio(vendedor.RegioesBloqueadas, cliente.Cidade);
        return bloqueio is null
            ? Result.Success()
            : Result.Failure($"O vendedor {vendedor.Nome} não atende a região do cliente ({cliente.Cidade}): bloqueado em \"{bloqueio.Valor}\".");
    }

    public async Task MarcarGanhoPorPropostaAsync(string propostaNumero)
    {
        if (string.IsNullOrWhiteSpace(propostaNumero)) return;
        var cards = (await _oportunidades.GetAllAsync()).Where(o => o.PropostaNumero == propostaNumero).ToList();
        if (cards.Count == 0) return;
        var funis = await _funis.GetAllAsync();
        foreach (var card in cards)
        {
            var ganho = funis.FirstOrDefault(f => f.Id == card.FunilId)?.Etapas.FirstOrDefault(e => e.Tipo == "ganho");
            if (ganho is null || card.EtapaId == ganho.Id) continue;
            card.EtapaId = ganho.Id;
            card.EntrouNaEtapaEm = DateTime.UtcNow.ToString("o");
            card.Anotacoes.Insert(0, new AnotacaoOportunidade
            {
                Id = Guid.NewGuid().ToString(),
                Texto = $"Proposta {propostaNumero} aprovada: card movido para {ganho.Nome} automaticamente.",
                Em = DateTime.UtcNow.ToString("o"),
            });
            await _oportunidades.UpdateAsync(card.Id, card);
        }
    }
}
