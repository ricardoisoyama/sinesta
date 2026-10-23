using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>Uma linha da tela Numerações (empresa × documento).</summary>
public sealed record NumeracaoDto(string EmpresaId, string EmpresaNome, string Tipo, string TipoNome, string Serie, long Ultimo, long Proximo, string AlteradoEm, string AlteradoPor);

public sealed record SalvarNumeracaoDto(string? Serie, long Ultimo);

/// <summary>
/// Administrativo › Numerações: de onde parte cada sequência na implantação (fatura continua a da SIIMP,
/// NF a da SEFAZ). O número só avança: não dá para gravar um último menor que o já usado.
/// </summary>
public sealed class NumeracaoService(ICrudRepository<NumeracaoDocumento> numeracoes, ICrudRepository<Empresa> empresas, IAuditoriaService auditoria)
{
    public async Task<List<NumeracaoDto>> ListarAsync()
    {
        var gravadas = (await numeracoes.GetAllAsync()).ToDictionary(n => n.Id);
        var lista = new List<NumeracaoDto>();
        foreach (var e in (await empresas.GetAllAsync()).Where(e => e.Status == "ativo").OrderBy(e => e.Nome))
            foreach (var (tipo, nome) in TipoNumeracao.Todos)
            {
                var n = gravadas.GetValueOrDefault(NumeracaoDocumento.IdDe(e.Id, tipo));
                lista.Add(new NumeracaoDto(e.Id, e.Nome, tipo, nome, n?.Serie ?? string.Empty, n?.Ultimo ?? 0, (n?.Ultimo ?? 0) + 1, n?.AlteradoEm ?? string.Empty, n?.AlteradoPor ?? string.Empty));
            }
        return lista;
    }

    public async Task<Result<NumeracaoDto>> SalvarAsync(string empresaId, string tipo, SalvarNumeracaoDto d, UsuarioAtual quem)
    {
        if (!TipoNumeracao.Valido(tipo)) return Result.Failure<NumeracaoDto>("Documento desconhecido.");
        if (await empresas.GetByIdAsync(empresaId) is not { } empresa) return Result.Failure<NumeracaoDto>("Empresa não encontrada.");
        if (d.Ultimo < 0) return Result.Failure<NumeracaoDto>("O último número usado não pode ser negativo.");
        var serie = (d.Serie ?? string.Empty).Trim();
        if (serie.Length > 10) return Result.Failure<NumeracaoDto>("A série vai até 10 caracteres.");
        var id = NumeracaoDocumento.IdDe(empresaId, tipo);
        var antes = await numeracoes.GetByIdAsync(id);
        if (antes is not null && d.Ultimo < antes.Ultimo)
            return Result.Failure<NumeracaoDto>($"O número só avança: o último usado é {antes.Ultimo}. Voltar repetiria números já emitidos.");
        var n = antes ?? new NumeracaoDocumento { Id = id, EmpresaId = empresaId, Tipo = tipo };
        var ultimoAntes = n.Ultimo;
        n.Serie = serie;
        n.Ultimo = d.Ultimo;
        n.AlteradoEm = DateTime.UtcNow.ToString("o");
        n.AlteradoPor = quem.Nome;
        if (antes is null) await numeracoes.AddAsync(n); else await numeracoes.UpdateAsync(n.Id, n);
        var nome = TipoNumeracao.Todos.First(t => t.Tipo == tipo).Nome;
        await auditoria.RegistrarAsync(antes is null ? "criar" : "editar", "NumeracaoDocumento", id,
            $"{quem.Nome} ajustou a numeração de {nome} de {empresa.Nome}: último usado {ultimoAntes} → {n.Ultimo}{(serie.Length > 0 ? $", série {serie}" : string.Empty)}");
        return Result.Success(new NumeracaoDto(empresaId, empresa.Nome, tipo, nome, n.Serie, n.Ultimo, n.Ultimo + 1, n.AlteradoEm, n.AlteradoPor));
    }
}
