using System.Text.RegularExpressions;
using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Veículo da frota, agregado ou de terceiro, habilitado para as operações. Campos do
/// cadastro de veículos do Erebor: identificação, características e proprietário.
/// O documento (CRLV) vai como anexo.
/// </summary>
public partial class Veiculo : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";

    // Identificação
    /// <summary>Placa do veículo (tração), sem hífen e em maiúsculas: ABC1234 ou ABC1D23 (Mercosul).</summary>
    public string PlacaTracao { get; set; } = string.Empty;
    public string PlacaReboque { get; set; } = string.Empty;
    public string Renavam { get; set; } = string.Empty;
    public string Chassi { get; set; } = string.Empty;
    /// <summary>Registro na ANTT (RNTRC).</summary>
    public string Antt { get; set; } = string.Empty;

    // Características
    public string TipoVeiculo { get; set; } = string.Empty;
    public string TipoCarroceria { get; set; } = string.Empty;
    /// <summary>Rastreador (Onixsat, Sascar...).</summary>
    public string Tecnologia { get; set; } = string.Empty;
    /// <summary>"Sim" | "Não" | vazio.</summary>
    public string TravaQuintaRoda { get; set; } = string.Empty;
    /// <summary>"Sim" | "Não" | vazio.</summary>
    public string Blindado { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Cor { get; set; } = string.Empty;
    /// <summary>Próprio | Agregado | Terceiro | Frota.</summary>
    public string Perfil { get; set; } = string.Empty;

    // Proprietário
    public string CpfCnpj { get; set; } = string.Empty;
    public string NomeProprietario { get; set; } = string.Empty;
    /// <summary>yyyy-MM-dd.</summary>
    public string DataNascimento { get; set; } = string.Empty;
    public string Rg { get; set; } = string.Empty;
    public string UfRg { get; set; } = string.Empty;
    public string NomeMae { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;

    /// <summary>Como o veículo aparece nas listas e na trilha: "ABC1D23 · Truck · Volvo FH".</summary>
    public string Nome => string.Join(" · ", new[] { PlacaFormatada(PlacaTracao), TipoVeiculo, $"{Marca} {Modelo}".Trim() }.Where(x => x.Length > 0));

    [GeneratedRegex("^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$")]
    private static partial Regex FormatoPlaca();

    /// <summary>Placa sem espaço nem hífen, em maiúsculas ("abc-1234" → "ABC1234").</summary>
    public static string NormalizarPlaca(string? placa) =>
        new string((placa ?? string.Empty).Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();

    /// <summary>Formato antigo (ABC1234) ou Mercosul (ABC1D23).</summary>
    public static bool PlacaValida(string? placa) => FormatoPlaca().IsMatch(NormalizarPlaca(placa));

    /// <summary>"ABC1234" → "ABC-1234" (a Mercosul fica sem hífen).</summary>
    public static string PlacaFormatada(string placa) =>
        placa.Length == 7 && char.IsDigit(placa[4]) ? $"{placa[..3]}-{placa[3..]}" : placa;

    /// <summary>Ajusta os campos antes de gravar: placas e documentos no formato padrão.</summary>
    public void Normalizar()
    {
        PlacaTracao = NormalizarPlaca(PlacaTracao);
        PlacaReboque = NormalizarPlaca(PlacaReboque);
        Renavam = new string((Renavam ?? string.Empty).Where(char.IsDigit).ToArray());
        Chassi = new string((Chassi ?? string.Empty).Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        Antt = new string((Antt ?? string.Empty).Where(char.IsDigit).ToArray());
        UfRg = (UfRg ?? string.Empty).Trim().ToUpperInvariant();
    }
}
