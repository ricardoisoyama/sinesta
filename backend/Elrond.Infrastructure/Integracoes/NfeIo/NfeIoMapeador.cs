using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Elrond.Application.DTOs;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Infrastructure.Integracoes.NfeIo;

/// <summary>
/// Tradução entre o vocabulário do ELROND e o da NFE.io, nos dois sentidos. Sem rede nem estado:
/// tudo aqui é coberto por teste.
/// </summary>
public static class NfeIoMapeador
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    // ───────────────────────────── Pedido → NFE.io ─────────────────────────────

    /// <summary>Corpo JSON da emissão. Retenções: informadas vão todas (o provedor deixa de calcular); null não vai nenhuma.</summary>
    public static string ParaEmissao(PedidoNfseDto p, string idExterno) =>
        JsonSerializer.Serialize(MontarEmissao(p, idExterno), Json);

    internal static NfeIoEmissao MontarEmissao(PedidoNfseDto p, string idExterno)
    {
        var r = p.Retencoes;
        var temInformacoes = !string.IsNullOrWhiteSpace(p.InformacoesAdicionais);
        var temPedido = !string.IsNullOrWhiteSpace(p.NumeroPedido);
        return new NfeIoEmissao
        {
            ExternalId = idExterno,
            CityServiceCode = p.Servico.CodigoMunicipal.Trim(),
            FederalServiceCode = p.Servico.ItemLc116.Trim(),
            NbsCode = DocumentoFiscal.Digitos(p.Servico.Nbs),
            CnaeCode = string.IsNullOrWhiteSpace(p.Servico.Cnae) ? null : DocumentoFiscal.Digitos(p.Servico.Cnae),
            CstPisCofins = string.IsNullOrWhiteSpace(p.Servico.CstPisCofins) ? null : p.Servico.CstPisCofins.Trim(),
            Description = p.Servico.Descricao.Trim(),
            ServicesAmount = Dinheiro(p.Valores.ValorServicos),
            DiscountUnconditionedAmount = SeMaiorQueZero(p.Valores.DescontoIncondicionado),
            DiscountConditionedAmount = SeMaiorQueZero(p.Valores.DescontoCondicionado),
            DeductionsAmount = SeMaiorQueZero(p.Valores.Deducoes),
            AccrualOn = p.Competencia?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            TaxationType = p.Iss?.Tributacao is { } t ? Tributacao(t) : null,
            IssRate = p.Iss?.Aliquota,
            RetentionType = TipoRetencao(p),
            IssAmountWithheld = r is null ? null : Dinheiro(r.Iss),
            InssAmountWithheld = r is null ? null : Dinheiro(r.Inss),
            IrAmountWithheld = r is null ? null : Dinheiro(r.Ir),
            PisAmountWithheld = r is null ? null : Dinheiro(r.Pis),
            CofinsAmountWithheld = r is null ? null : Dinheiro(r.Cofins),
            CsllAmountWithheld = r is null ? null : Dinheiro(r.Csll),
            OthersAmountWithheld = r is null ? null : Dinheiro(r.Outras),
            Borrower = Tomador(p.Tomador),
            Location = p.LocalPrestacao is null ? null : Endereco(p.LocalPrestacao),
            RealEstate = p.EnderecoImovel is null ? null : new NfeIoImovel { SiteAddress = Endereco(p.EnderecoImovel) },
            IbsCbs = p.IbsCbs is null ? null : new NfeIoIbsCbs
            {
                OperationIndicator = p.IbsCbs.IndicadorOperacao,
                ClassCode = p.IbsCbs.ClassificacaoTributaria,
                SituationCode = string.IsNullOrWhiteSpace(p.IbsCbs.Cst) ? null : p.IbsCbs.Cst.Trim(),
                PersonalUse = p.IbsCbs.UsoPessoal,
            },
            // Com o grupo estruturado, o texto livre vai dentro dele (a NFE.io faz o mesmo quando só há o texto).
            AdditionalInformation = temInformacoes && !temPedido ? p.InformacoesAdicionais!.Trim() : null,
            AdditionalInformationGroup = temPedido
                ? new NfeIoInformacoes { Order = p.NumeroPedido!.Trim(), OtherInformation = temInformacoes ? p.InformacoesAdicionais!.Trim() : null }
                : null,
        };
    }

    private static NfeIoParte Tomador(TomadorNfseDto t) => new()
    {
        Type = t.Tipo == "fisica" ? "NaturalPerson" : "LegalEntity",
        Name = t.Nome.Trim(),
        FederalTaxNumber = long.Parse(DocumentoFiscal.Digitos(t.Documento), CultureInfo.InvariantCulture),
        MunicipalTaxNumber = Vazio(t.InscricaoMunicipal),
        StateTaxNumber = Vazio(t.InscricaoEstadual),
        Email = Vazio(t.Email),
        PhoneNumber = string.IsNullOrWhiteSpace(t.Telefone) ? null : DocumentoFiscal.Digitos(t.Telefone),
        Address = t.Endereco is null ? null : Endereco(t.Endereco),
    };

    private static NfeIoEndereco Endereco(EnderecoNfseDto e) => new()
    {
        PostalCode = DocumentoFiscal.FormatarCep(e.Cep),
        Street = e.Logradouro.Trim(),
        Number = e.Numero.Trim(),
        AdditionalInformation = Vazio(e.Complemento),
        District = e.Bairro.Trim(),
        City = new NfeIoCidade { Code = DocumentoFiscal.Digitos(e.CodigoIbge), Name = Vazio(e.Cidade) },
        State = e.Uf.Trim().ToUpperInvariant(),
    };

    private static string Tributacao(TributacaoIss t) => t switch
    {
        TributacaoIss.NoMunicipio => "WithinCity",
        TributacaoIss.ForaDoMunicipio => "OutsideCity",
        TributacaoIss.Exportacao => "Export",
        TributacaoIss.Isenta => "Free",
        TributacaoIss.Imune => "Immune",
        _ => throw new ArgumentOutOfRangeException(nameof(t), t, "Tributação do ISS sem correspondência na NFE.io."),
    };

    /// <summary>Quem recolhe o ISS: o informado; ou, com ISS retido nas retenções, o tomador; senão o provedor decide.</summary>
    private static string? TipoRetencao(PedidoNfseDto p) =>
        p.Iss?.RetidoPeloTomador switch
        {
            true => "WithheldByBuyer",
            false => "NotWithheld",
            null => p.Retencoes is { Iss: > 0 } ? "WithheldByBuyer" : null,
        };

    // ───────────────────────────── NFE.io → ELROND ─────────────────────────────

    /// <summary>
    /// Traduz a nota da NFE.io (consulta, resposta da emissão ou aviso). A situação sai do par
    /// status + flowStatus, como a NFE.io orienta: os dois juntos dizem o que aconteceu.
    /// </summary>
    public static RetornoNfse ParaRetorno(JsonElement n)
    {
        var status = Texto(n, "status");
        var etapa = Etapa(n);
        var mensagem = Texto(n, "flowMessage");
        var (situacao, cancelamentoRecusado, msg) = Situacao(status, etapa, mensagem);
        return new RetornoNfse(
            IdProvedor: Texto(n, "id"),
            Situacao: situacao,
            Etapa: etapa,
            Mensagem: msg,
            CancelamentoRecusado: cancelamentoRecusado,
            Ambiente: Texto(n, "environment"),
            // Antes de numerar, a NFE.io manda 0: é "ainda sem número", não o número zero.
            Numero: SemZero(Texto(n, "number")),
            CodigoVerificacao: Texto(n, "checkCode"),
            SerieRps: Texto(n, "rpsSerialNumber"),
            NumeroRps: SemZero(Texto(n, "rpsNumber")),
            ValorIss: Numero(n, "issTaxAmount"),
            ValorRetido: Numero(n, "amountWithheld"),
            ValorLiquido: Numero(n, "amountNet"),
            EmitidaEm: Data(n, "issuedOn"),
            CanceladaEm: Data(n, "cancelledOn"));
    }

    internal static (SituacaoNfse Situacao, bool CancelamentoRecusado, string Mensagem) Situacao(string status, string etapa, string mensagem)
    {
        switch (etapa)
        {
            case "Issued":
            case "PullFromCityHall":
                return (SituacaoNfse.Emitida, false, string.Empty);
            case "Cancelled":
                return (SituacaoNfse.Cancelada, false, string.Empty);
            case "CancelFailed":
                return (SituacaoNfse.Emitida, true, mensagem);
            case "WaitingSendCancel":
            case "WaitingReturnCancel":
                return (SituacaoNfse.Cancelando, false, string.Empty);
            case "IssueFailed":
                // Armadilha documentada: status Issued + IssueFailed = a nota saiu, só o PDF falhou. Não reemitir.
                return status == "Issued"
                    ? (SituacaoNfse.Emitida, false, "Nota emitida; o PDF não foi gerado pelo provedor (peça o reprocessamento ao suporte).")
                    : (SituacaoNfse.Rejeitada, false, Recusa(mensagem));
            case "WaitingDownload":
                return status == "Issued" ? (SituacaoNfse.Emitida, false, string.Empty) : (SituacaoNfse.Processando, false, string.Empty);
        }
        return status switch
        {
            "Issued" => (SituacaoNfse.Emitida, false, string.Empty),
            "Cancelled" => (SituacaoNfse.Cancelada, false, string.Empty),
            "Error" => (SituacaoNfse.Rejeitada, false, Recusa(mensagem)),
            _ => (SituacaoNfse.Processando, false, string.Empty),
        };
    }

    private static string Recusa(string mensagem) =>
        string.IsNullOrWhiteSpace(mensagem) ? "A prefeitura recusou a nota (sem detalhe do provedor)." : $"Recusada: {mensagem}";

    /// <summary>flowStatus vem como texto; aceita também o código numérico, por garantia.</summary>
    private static string Etapa(JsonElement n)
    {
        if (!n.TryGetProperty("flowStatus", out var f)) return string.Empty;
        if (f.ValueKind == JsonValueKind.String) return f.GetString() ?? string.Empty;
        if (f.ValueKind != JsonValueKind.Number || !f.TryGetInt32(out var codigo)) return string.Empty;
        return codigo switch
        {
            -2 => "CancelFailed", -1 => "IssueFailed", 1 => "Issued", 2 => "Cancelled", 3 => "PullFromCityHall",
            10 => "WaitingCalculateTaxes", 11 => "WaitingDefineRpsNumber", 12 => "WaitingSend", 13 => "WaitingSendCancel",
            14 => "WaitingReturn", 15 => "WaitingDownload", 24 => "WaitingReturnCancel",
            _ => codigo.ToString(CultureInfo.InvariantCulture),
        };
    }

    private static string Texto(JsonElement n, string campo) =>
        n.TryGetProperty(campo, out var v) ? v.ValueKind switch
        {
            JsonValueKind.String => v.GetString() ?? string.Empty,
            JsonValueKind.Number => v.GetRawText(),
            _ => string.Empty,
        } : string.Empty;

    private static decimal? Numero(JsonElement n, string campo) =>
        n.TryGetProperty(campo, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d) ? d : null;

    private static DateTime? Data(JsonElement n, string campo) =>
        n.TryGetProperty(campo, out var v) && v.ValueKind == JsonValueKind.String
        && DateTimeOffset.TryParse(v.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var d)
            ? d.UtcDateTime
            : null;

    private static string SemZero(string s) => s.Trim('0').Length == 0 ? string.Empty : s;

    private static decimal Dinheiro(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal? SeMaiorQueZero(decimal v) => v > 0 ? Dinheiro(v) : null;
    private static string? Vazio(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
