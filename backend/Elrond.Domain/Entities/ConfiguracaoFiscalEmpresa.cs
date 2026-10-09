using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Como a empresa emite NFS-e: qual provedor e o identificador dela lá. Preenchida na implantação
/// do cliente (o cadastro da empresa no provedor é feito uma vez, fora do motor).
/// O <see cref="Id"/> é o id da Empresa.
/// </summary>
public class ConfiguracaoFiscalEmpresa : Rastreavel, IEntity
{
    public const string ProvedorNfeIo = "nfeio";
    public const string ProvedorSimulador = "simulador";

    public string Id { get; set; } = string.Empty;
    /// <summary>"nfeio" (NFE.io) ou "simulador" (testes internos, sem nota real).</summary>
    public string Provedor { get; set; } = ProvedorSimulador;
    /// <summary>Identificador da empresa no provedor (company_id na NFE.io).</summary>
    public string IdEmpresaProvedor { get; set; } = string.Empty;
    /// <summary>Desligada, o motor recusa emitir por esta empresa.</summary>
    public bool Ativa { get; set; } = true;
}

/// <summary>Aviso (webhook) já processado: o provedor pode mandar o mesmo aviso mais de uma vez.</summary>
public class AvisoNfseRecebido
{
    public string Id { get; set; } = string.Empty;
    public string Provedor { get; set; } = string.Empty;
    public DateTime RecebidoEm { get; set; }
}
