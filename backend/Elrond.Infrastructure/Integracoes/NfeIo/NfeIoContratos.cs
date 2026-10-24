namespace Elrond.Infrastructure.Integracoes.NfeIo;

// Corpo da emissão na NFE.io (NFS-e da reforma tributária, OpenAPI service-invoice-rtc-v1).
// Só os campos que o ELROND usa; nulos não vão no JSON (o provedor aplica o padrão dele).

internal sealed class NfeIoEmissao
{
    public string? ExternalId { get; init; }
    public required string CityServiceCode { get; init; }
    public string? FederalServiceCode { get; init; }
    public required string NbsCode { get; init; }
    public string? CnaeCode { get; init; }
    public string? CstPisCofins { get; init; }
    public required string Description { get; init; }
    public decimal ServicesAmount { get; init; }
    public decimal? DiscountUnconditionedAmount { get; init; }
    public decimal? DiscountConditionedAmount { get; init; }
    public decimal? DeductionsAmount { get; init; }
    /// <summary>Competência, AAAA-MM-DD.</summary>
    public string? AccrualOn { get; init; }
    public string? TaxationType { get; init; }
    /// <summary>Fração (0.02 = 2%).</summary>
    public decimal? IssRate { get; init; }
    public string? RetentionType { get; init; }
    public decimal? IssAmountWithheld { get; init; }
    public decimal? InssAmountWithheld { get; init; }
    public decimal? IrAmountWithheld { get; init; }
    public decimal? PisAmountWithheld { get; init; }
    public decimal? CofinsAmountWithheld { get; init; }
    public decimal? CsllAmountWithheld { get; init; }
    public decimal? OthersAmountWithheld { get; init; }
    public NfeIoParte? Borrower { get; init; }
    public NfeIoEndereco? Location { get; init; }
    public NfeIoImovel? RealEstate { get; init; }
    public NfeIoIbsCbs? IbsCbs { get; init; }
    public string? AdditionalInformation { get; init; }
    public NfeIoInformacoes? AdditionalInformationGroup { get; init; }
}

internal sealed class NfeIoParte
{
    /// <summary>NaturalPerson | LegalEntity.</summary>
    public required string Type { get; init; }
    public required string Name { get; init; }
    /// <summary>CPF/CNPJ como número (a API recusa texto).</summary>
    public long FederalTaxNumber { get; init; }
    public string? MunicipalTaxNumber { get; init; }
    public string? StateTaxNumber { get; init; }
    public string? Email { get; init; }
    public string? PhoneNumber { get; init; }
    public NfeIoEndereco? Address { get; init; }
}

internal sealed class NfeIoEndereco
{
    public string Country { get; init; } = "BRA";
    /// <summary>"99999-999".</summary>
    public required string PostalCode { get; init; }
    public required string Street { get; init; }
    public required string Number { get; init; }
    public string? AdditionalInformation { get; init; }
    public required string District { get; init; }
    public required NfeIoCidade City { get; init; }
    public required string State { get; init; }
}

internal sealed class NfeIoCidade
{
    /// <summary>Código IBGE, 7 dígitos.</summary>
    public required string Code { get; init; }
    public string? Name { get; init; }
}

internal sealed class NfeIoImovel
{
    public required NfeIoEndereco SiteAddress { get; init; }
}

internal sealed class NfeIoIbsCbs
{
    public required string OperationIndicator { get; init; }
    public required string ClassCode { get; init; }
    public string? SituationCode { get; init; }
    public bool? PersonalUse { get; init; }
}

internal sealed class NfeIoInformacoes
{
    public string? Order { get; init; }
    public string? OtherInformation { get; init; }
}
