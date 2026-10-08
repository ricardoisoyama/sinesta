namespace Elrond.Application.Interfaces;

/// <summary>Dados públicos de um CNPJ (base aberta da Receita Federal), já no formato do cadastro.</summary>
public record CnpjConsultaDto(
    string Cnpj,
    string RazaoSocial,
    string NomeFantasia,
    /// <summary>Ativa, Baixada, Inapta, Suspensa, Nula.</summary>
    string Situacao,
    string Abertura,
    string Porte,
    string NaturezaJuridica,
    bool? OptanteSimples,
    bool? OptanteMei,
    /// <summary>Regime sugerido para o cadastro: Simples Nacional, MEI, Lucro Presumido, Lucro Real ou vazio.</summary>
    string Regime,
    string Cep,
    string Logradouro,
    string Numero,
    string Complemento,
    string Bairro,
    /// <summary>"Cidade - UF", igual à base de cidades do sistema (vazio se não achou o código IBGE).</summary>
    string Cidade,
    string Uf,
    string Telefone,
    string Email,
    string AtividadePrincipal,
    /// <summary>De onde veio (CNPJá ou BrasilAPI) e a data da base.</summary>
    string Fonte,
    string AtualizadoEm);

/// <summary>Endereço de um CEP, com a cidade no formato da base do sistema.</summary>
public record CepConsultaDto(
    string Cep,
    string Logradouro,
    /// <summary>Observação do CEP (ex.: "lado ímpar"); não é o complemento do endereço.</summary>
    string Observacao,
    string Bairro,
    string Cidade,
    string Uf,
    string Ibge,
    string Fonte);

/// <summary>Resposta de uma consulta: os dados, ou o status HTTP (400 inválido, 404 não achou, 503 fonte fora) e o motivo.</summary>
public record ConsultaResposta<T>(T? Dados, int Status, string? Erro)
{
    public static ConsultaResposta<T> Ok(T dados) => new(dados, 200, null);
    public static ConsultaResposta<T> Falha(int status, string erro) => new(default, status, erro);
}

/// <summary>Consulta de CNPJ e CEP em fontes públicas e gratuitas, com reserva e cache.</summary>
public interface IConsultaPublicaService
{
    Task<ConsultaResposta<CnpjConsultaDto>> CnpjAsync(string cnpj, CancellationToken ct = default);
    Task<ConsultaResposta<CepConsultaDto>> CepAsync(string cep, CancellationToken ct = default);
}
