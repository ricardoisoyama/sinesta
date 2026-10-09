using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Como terminou um envio (emissão ou cancelamento) ao provedor.</summary>
public enum DesfechoEnvioNfse
{
    /// <summary>O provedor recebeu e vai processar.</summary>
    Aceito,
    /// <summary>O provedor recusou (dado inválido, configuração). Nada foi emitido.</summary>
    Recusado,
    /// <summary>Não dá para saber se chegou (queda, demora, erro do provedor). Conferir antes de reenviar.</summary>
    Incerto,
}

public sealed record EnvioNfse(DesfechoEnvioNfse Desfecho, RetornoNfse? Retorno, string Mensagem)
{
    public static EnvioNfse Aceito(RetornoNfse retorno) => new(DesfechoEnvioNfse.Aceito, retorno, string.Empty);
    public static EnvioNfse Recusado(string mensagem) => new(DesfechoEnvioNfse.Recusado, null, mensagem);
    public static EnvioNfse Incerto(string mensagem) => new(DesfechoEnvioNfse.Incerto, null, mensagem);
}

/// <summary>Resultado de uma consulta: achou (com o retorno), não existe no provedor, ou a consulta falhou.</summary>
public sealed record ConsultaNfse(RetornoNfse? Retorno, bool NaoExiste, string Falha)
{
    public static ConsultaNfse Encontrada(RetornoNfse retorno) => new(retorno, false, string.Empty);
    public static ConsultaNfse Inexistente() => new(null, true, string.Empty);
    public static ConsultaNfse Falhou(string motivo) => new(null, false, motivo);
}

public enum TipoArquivoNfse { Pdf, Xml }

public sealed record ArquivoNfse(byte[] Conteudo, string TipoConteudo, string NomeArquivo);

/// <summary>Aviso de mudança de situação enviado pelo provedor (webhook), já conferido e traduzido.</summary>
public sealed record AvisoNfse(string IdAviso, string Provedor, string IdExterno, RetornoNfse Retorno);

/// <summary>
/// Porta para quem emite de fato (NFE.io, simulador). O motor só conversa com esta interface:
/// trocar de provedor é trocar a implementação, sem mexer nas regras.
/// </summary>
public interface INfseProvedor
{
    /// <summary>Nome gravado na configuração da empresa ("nfeio", "simulador").</summary>
    string Nome { get; }
    /// <summary>Se o ambiente tem o necessário (chave de API etc.) para usar este provedor.</summary>
    bool Configurado { get; }

    Task<EnvioNfse> EmitirAsync(string idEmpresaProvedor, PedidoNfseDto pedido, string idExterno, CancellationToken ct = default);
    Task<ConsultaNfse> ConsultarAsync(string idEmpresaProvedor, string idProvedor, CancellationToken ct = default);
    Task<ConsultaNfse> ConsultarPorIdExternoAsync(string idEmpresaProvedor, string idExterno, CancellationToken ct = default);
    Task<EnvioNfse> CancelarAsync(string idEmpresaProvedor, string idProvedor, CancellationToken ct = default);
    Task<ArquivoNfse?> BaixarAsync(string idEmpresaProvedor, string idProvedor, TipoArquivoNfse tipo, CancellationToken ct = default);
}

/// <summary>Escolhe o provedor pelo nome gravado na configuração fiscal da empresa.</summary>
public interface INfseProvedores
{
    INfseProvedor? Para(string nome);
}
