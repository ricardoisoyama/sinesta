using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Quem está operando nesta requisição (implementado na camada da API, a partir do token + banco).</summary>
public interface IUsuarioAtualProvider
{
    Task<UsuarioAtual> QuemAsync();
    /// <summary>IP de origem (já considerando o proxy), ou vazio.</summary>
    string Ip { get; }
}

/// <summary>Trilha de auditoria: grava e consulta o histórico de alterações.</summary>
public interface IAuditoriaService
{
    /// <summary>
    /// Registra uma ação. <paramref name="antes"/>/<paramref name="depois"/> são os objetos
    /// antes e depois (o serviço calcula só os campos que mudaram). <paramref name="quem"/>
    /// substitui o usuário da requisição (ex.: login, onde ainda não há token).
    /// </summary>
    Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao,
        object? antes = null, object? depois = null, UsuarioAtual? quem = null);

    Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null);
}

/// <summary>Próximo número de proposta (sequência do banco: nunca repete, mesmo em paralelo).</summary>
public interface IPropostaNumerador
{
    /// <summary>Próximo número; com a empresa que emite, usa o prefixo dela (se tiver).</summary>
    Task<string> ProximoAsync(string? empresaId = null);
    /// <summary>Quantas propostas a empresa já emitiu no prefixo próprio (0 = o padrão ainda pode mudar).</summary>
    Task<long> EmitidasAsync(string empresaId);
}
