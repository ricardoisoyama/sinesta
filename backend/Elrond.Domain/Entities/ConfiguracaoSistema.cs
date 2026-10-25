using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Configuração do ambiente (um registro, id "padrao"): os menus que a equipe ELROND desligou na
/// implantação (ex.: Veículos e Motoristas numa empresa de tecnologia). Não é permissão: some do
/// menu de todo mundo do ambiente.
/// </summary>
public class ConfiguracaoSistema : Rastreavel, IEntity
{
    public const string IdPadrao = "padrao";
    /// <summary>Menus que nascem desligados num ambiente sem configuração.</summary>
    public static readonly string[] DesligadosPorPadrao = { "/cadastros/motoristas" };

    public string Id { get; set; } = IdPadrao;
    /// <summary>Rotas dos itens de menu desligados.</summary>
    public List<string> MenusDesligados { get; set; } = new();
    /// <summary>Layout padrão do dashboard do ambiente (JSON dos blocos); vazio = o padrão do sistema.</summary>
    public string DashboardPadrao { get; set; } = string.Empty;
}
