using Elrond.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Elrond.Infrastructure.Storage;

/// <summary>
/// Guarda os anexos no disco, dentro da raiz configurada em `Arquivos:Raiz`
/// (em produção é um volume Docker montado em /app/arquivos).
/// </summary>
public class DiscoArquivoStorage : IArquivoStorage
{
    private readonly string _raiz;
    /// <summary>Raiz com separador no fim: "/app/arquivos-x/..." não pode passar por "/app/arquivos".</summary>
    private readonly string _raizComSeparador;

    public DiscoArquivoStorage(IConfiguration config)
    {
        var raiz = config["Arquivos:Raiz"];
        _raiz = Path.GetFullPath(string.IsNullOrWhiteSpace(raiz) ? Path.Combine(AppContext.BaseDirectory, "arquivos") : raiz);
        _raizComSeparador = _raiz.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
        Directory.CreateDirectory(_raiz);
    }

    /// <summary>Caminho absoluto, garantindo que fica dentro da raiz (sem "..", sem raiz "irmã").</summary>
    private string Completo(string relativo)
    {
        if (string.IsNullOrWhiteSpace(relativo) || Path.IsPathRooted(relativo))
            throw new InvalidOperationException("Caminho de arquivo inválido.");
        var alvo = Path.GetFullPath(Path.Combine(_raiz, relativo.Replace('\\', '/')));
        if (!alvo.StartsWith(_raizComSeparador, StringComparison.Ordinal))
            throw new InvalidOperationException("Caminho de arquivo inválido.");
        return alvo;
    }

    public async Task SalvarAsync(string caminhoRelativo, Stream conteudo, CancellationToken ct = default)
    {
        var alvo = Completo(caminhoRelativo);
        Directory.CreateDirectory(Path.GetDirectoryName(alvo)!);
        await using var fs = new FileStream(alvo, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await conteudo.CopyToAsync(fs, ct);
    }

    public Stream? Abrir(string caminhoRelativo)
    {
        var alvo = Completo(caminhoRelativo);
        return File.Exists(alvo) ? new FileStream(alvo, FileMode.Open, FileAccess.Read, FileShare.Read) : null;
    }

    public void Excluir(string caminhoRelativo)
    {
        var alvo = Completo(caminhoRelativo);
        if (File.Exists(alvo)) File.Delete(alvo);
    }
}
