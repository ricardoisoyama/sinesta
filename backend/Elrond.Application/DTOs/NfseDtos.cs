using System.Text.Json.Serialization;

namespace Elrond.Application.DTOs;

// ───────────────────────────── Pedido de emissão ─────────────────────────────
// Entrada do motor de NFS-e. Não depende das telas nem do provedor: quem emite (lançamento a
// receber, proposta, integração) monta este pedido; o motor confere, traduz e envia.

/// <summary>Pedido de emissão de uma NFS-e.</summary>
/// <param name="EmpresaId">Empresa emissora (o prestador vem do cadastro dela no provedor).</param>
/// <param name="Retencoes">Null = o provedor calcula as retenções. Informadas = vão todas, como estão.</param>
/// <param name="IbsCbs">Obrigatório para Lucro Presumido e Real.</param>
/// <param name="EnderecoImovel">Obrigatório quando a operação envolve imóvel (ex.: limpeza, 020201).</param>
/// <param name="NumeroPedido">Contrato, pedido ou proposta que sai na nota.</param>
public sealed record PedidoNfseDto(
    string EmpresaId,
    TomadorNfseDto Tomador,
    ServicoNfseDto Servico,
    ValoresNfseDto Valores,
    IssNfseDto? Iss = null,
    RetencoesNfseDto? Retencoes = null,
    IbsCbsNfseDto? IbsCbs = null,
    DateOnly? Competencia = null,
    EnderecoNfseDto? LocalPrestacao = null,
    EnderecoNfseDto? EnderecoImovel = null,
    string? NumeroPedido = null,
    string? InformacoesAdicionais = null,
    OrigemNfseDto? Origem = null);

/// <param name="Tipo">"juridica" ou "fisica".</param>
/// <param name="Documento">CNPJ ou CPF (com ou sem máscara).</param>
public sealed record TomadorNfseDto(
    string Tipo,
    string Nome,
    string Documento,
    string? InscricaoMunicipal = null,
    string? InscricaoEstadual = null,
    string? Email = null,
    string? Telefone = null,
    EnderecoNfseDto? Endereco = null);

/// <param name="CodigoIbge">Código do município (7 dígitos).</param>
public sealed record EnderecoNfseDto(
    string Cep,
    string Logradouro,
    string Numero,
    string Bairro,
    string CodigoIbge,
    string Uf,
    string? Cidade = null,
    string? Complemento = null);

/// <param name="CodigoMunicipal">Código do serviço na tabela da prefeitura do prestador.</param>
/// <param name="ItemLc116">Item da LC 116 (ex.: "17.05").</param>
/// <param name="Nbs">Nomenclatura Brasileira de Serviços (9 dígitos, com ou sem pontos).</param>
/// <param name="Descricao">Texto da nota (até 2.000 caracteres).</param>
public sealed record ServicoNfseDto(
    string CodigoMunicipal,
    string ItemLc116,
    string Nbs,
    string Descricao,
    string? Cnae = null);

public sealed record ValoresNfseDto(
    decimal ValorServicos,
    decimal DescontoIncondicionado = 0,
    decimal DescontoCondicionado = 0,
    decimal Deducoes = 0);

/// <param name="Tributacao">Onde o ISS é devido; null = no município do prestador.</param>
/// <param name="Aliquota">Fração (0,05 = 5%); null = a do cadastro do serviço no provedor.</param>
/// <param name="RetidoPeloTomador">null = o provedor decide pela regra do serviço.</param>
public sealed record IssNfseDto(
    TributacaoIss? Tributacao = null,
    decimal? Aliquota = null,
    bool? RetidoPeloTomador = null);

/// <summary>Onde e como o ISS é tributado (no JSON, pelo nome: "ForaDoMunicipio").</summary>
[JsonConverter(typeof(JsonStringEnumConverter<TributacaoIss>))]
public enum TributacaoIss
{
    NoMunicipio,
    ForaDoMunicipio,
    Exportacao,
    Isenta,
    Imune,
}

/// <summary>Retenções em reais. Informadas, vão todas (zero = não retém) e o provedor não calcula nenhuma.</summary>
public sealed record RetencoesNfseDto(
    decimal Inss = 0,
    decimal Ir = 0,
    decimal Pis = 0,
    decimal Cofins = 0,
    decimal Csll = 0,
    decimal Iss = 0,
    decimal Outras = 0)
{
    public decimal Total => Inss + Ir + Pis + Cofins + Csll + Iss + Outras;
}

/// <param name="IndicadorOperacao">cIndOp, 6 dígitos (ex.: 100301, 020201).</param>
/// <param name="ClassificacaoTributaria">cClassTrib, 6 dígitos (000001 = tributação integral).</param>
/// <param name="UsoPessoal">Uso ou consumo pessoal do tomador (pessoa física).</param>
public sealed record IbsCbsNfseDto(
    string IndicadorOperacao,
    string ClassificacaoTributaria,
    bool? UsoPessoal = null);

/// <summary>Quem originou a nota no ELROND (ex.: Tipo "movimento", Id do lançamento).</summary>
public sealed record OrigemNfseDto(string Tipo, string Id);

/// <summary>Pedido de cancelamento.</summary>
public sealed record CancelamentoNfseDto(string Motivo);

// ───────────────────────────── Saída ─────────────────────────────

/// <summary>Nota como o ELROND a vê (sem o pedido completo).</summary>
public sealed record NotaFiscalServicoDto(
    string Id,
    string EmpresaId,
    string Provedor,
    string Ambiente,
    string Situacao,
    string Mensagem,
    string Numero,
    string CodigoVerificacao,
    string SerieRps,
    string NumeroRps,
    string TomadorNome,
    string TomadorDocumento,
    string Descricao,
    DateOnly? Competencia,
    decimal ValorServicos,
    decimal ValorIss,
    decimal ValorRetido,
    decimal ValorLiquido,
    string OrigemTipo,
    string OrigemId,
    DateTime CriadaEm,
    string CriadaPor,
    DateTime AtualizadaEm,
    DateTime? EmitidaEm,
    DateTime? CanceladaEm,
    string MotivoCancelamento,
    bool EmAndamento,
    bool TemArquivos);

/// <summary>Configuração fiscal da empresa (implantação).</summary>
public sealed record ConfiguracaoFiscalDto(string Provedor, string IdEmpresaProvedor, bool Ativa = true);
