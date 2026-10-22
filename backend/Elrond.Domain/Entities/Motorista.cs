using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Contato de referência do motorista (nome e telefone).</summary>
public class ContatoReferencia
{
    public string Nome { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
}

/// <summary>
/// Motorista (ou ajudante/operador) habilitado para as operações: dados pessoais, CNH, endereço e
/// contatos de referência. O menu só aparece no ambiente se a equipe ELROND ligar o módulo.
/// </summary>
public class Motorista : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";

    // Dados pessoais
    public string Nome { get; set; } = string.Empty;
    /// <summary>Só dígitos.</summary>
    public string Cpf { get; set; } = string.Empty;
    public string Rg { get; set; } = string.Empty;
    public string DataEmissaoRg { get; set; } = string.Empty;
    public string NomeMae { get; set; } = string.Empty;
    public string NomePai { get; set; } = string.Empty;
    public string DataNascimento { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    /// <summary>Motorista | Ajudante | Operador.</summary>
    public string Tipo { get; set; } = "Motorista";
    /// <summary>Autônomo | Agregado | Frota própria | Terceiro.</summary>
    public string Vinculo { get; set; } = string.Empty;

    // CNH
    public string NumeroCnh { get; set; } = string.Empty;
    public string RegistroCnh { get; set; } = string.Empty;
    /// <summary>A, B, C, D, E, AB, AC, AD, AE.</summary>
    public string CategoriaCnh { get; set; } = string.Empty;
    /// <summary>yyyy-MM-dd.</summary>
    public string ValidadeCnh { get; set; } = string.Empty;
    public string PrimeiraHabilitacao { get; set; } = string.Empty;

    // Endereço ("Santos - SP" na cidade; rua e número no endereço)
    public string Cidade { get; set; } = string.Empty;
    public Endereco? Endereco { get; set; }

    public List<ContatoReferencia> Referencias { get; set; } = new();
    public string Observacao { get; set; } = string.Empty;

    public void Normalizar()
    {
        Nome = Nome.Trim();
        Cpf = new string(Cpf.Where(char.IsDigit).ToArray());
        CategoriaCnh = CategoriaCnh.Trim().ToUpperInvariant();
        Referencias = Referencias.Where(r => !string.IsNullOrWhiteSpace(r.Nome) || !string.IsNullOrWhiteSpace(r.Telefone)).Take(5).ToList();
    }
}
