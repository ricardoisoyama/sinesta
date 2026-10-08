namespace Elrond.Domain.Common;

/// <summary>
/// Rastro gravado em todo cadastro: quem criou, quem alterou por último e quem inativou,
/// com data/hora (UTC, ISO 8601). Preenchido pelo repositório a partir do usuário da requisição;
/// o cliente da API não controla esses campos.
/// </summary>
public abstract class Rastreavel
{
    public string CriadoEm { get; set; } = string.Empty;
    public string CriadoPor { get; set; } = string.Empty;
    public string AlteradoEm { get; set; } = string.Empty;
    public string AlteradoPor { get; set; } = string.Empty;
    /// <summary>Preenchido na inativação (exclusão lógica); limpo ao reativar.</summary>
    public string InativadoEm { get; set; } = string.Empty;
    public string InativadoPor { get; set; } = string.Empty;
}

/// <summary>Cadastro que nunca é apagado: "excluir" vira Status = "inativo" (exclusão lógica).</summary>
public interface IInativavel
{
    string Status { get; set; }
}
