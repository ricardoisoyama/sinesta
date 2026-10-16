using System.Text.Json;
using System.Text.Json.Serialization;

namespace Elrond.Infrastructure.Bancos.Inter;

// Contratos da API Cobrança v3 (Boleto com Pix) do Inter, como no OpenAPI oficial
// (docs/bancos/inter/openapi/swagger-cobranca-bolepix-yaml.yaml). Só os campos que usamos.

public static class InterJson
{
    public static readonly JsonSerializerOptions Opcoes = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
}

public sealed record InterPagador(
    string CpfCnpj, string TipoPessoa, string Nome, string Endereco, string Cidade, string Uf, string Cep,
    string? Numero, string? Complemento, string? Bairro, string? Email, string? Ddd, string? Telefone);

public sealed record InterMensagem(string? Linha1, string? Linha2, string? Linha3, string? Linha4, string? Linha5);

/// <summary>Multa, mora ou desconto: código + taxa (percentual) ou valor; o desconto leva os dias antes do vencimento.</summary>
public sealed record InterEncargo(string Codigo, decimal? Taxa = null, decimal? Valor = null, int? QuantidadeDias = null);

public sealed record InterEmitirCobranca(
    string SeuNumero, decimal ValorNominal, string DataVencimento, int NumDiasAgenda, InterPagador Pagador, InterMensagem? Mensagem,
    InterEncargo? Multa = null, InterEncargo? Mora = null, InterEncargo? Desconto = null, List<string>? FormasRecebimento = null);

public sealed record InterEmitirResposta(string? CodigoSolicitacao);

public sealed record InterCobrancaDados(
    string? CodigoSolicitacao, string? SeuNumero, string? Situacao, string? DataSituacao, string? DataVencimento,
    JsonElement? ValorTotalRecebido, string? OrigemRecebimento, string? MotivoCancelamento);

public sealed record InterBoleto(string? NossoNumero, string? CodigoBarras, string? LinhaDigitavel);

public sealed record InterPix(string? Txid, string? PixCopiaECola);

public sealed record InterCobrancaResposta(InterCobrancaDados? Cobranca, InterBoleto? Boleto, InterPix? Pix);

public sealed record InterCobrancasResposta(List<InterCobrancaResposta>? Cobrancas);

public sealed record InterPdfResposta(string? Pdf);

public sealed record InterCancelar(string MotivoCancelamento);

/// <summary>Erro padrão do Inter: title, detail e a lista de violações (campo e razão).</summary>
public sealed record InterProblema(string? Title, string? Detail, List<InterViolacao>? Violacoes);

public sealed record InterViolacao(string? Razao, string? Propriedade, string? Valor);
