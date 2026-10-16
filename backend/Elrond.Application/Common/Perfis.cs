namespace Elrond.Application.Common;

/// <summary>
/// Perfis de acesso. Admin = a nossa equipe (aparece para o cliente como "Suporte"): tem tudo,
/// inclusive as funcionalidades administrativas. Gestor = o máximo do cliente. Colaborador = só o liberado.
/// </summary>
public static class Perfis
{
    public const string Admin = "Admin";
    public const string Gestor = "Gestor";
    public const string Colaborador = "Colaborador";

    public static readonly IReadOnlyList<string> Validos = new[] { Admin, Gestor, Colaborador };

    /// <summary>Admin e Gestor: decidem o que é de gestor (metas, preço abaixo do mínimo, carteira inteira...).</summary>
    public static bool TemPoderDeGestor(string? perfil) => perfil is Admin or Gestor;
}
