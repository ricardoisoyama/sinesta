namespace Elrond.Application.Interfaces;

/// <summary>Onde os arquivos anexados ficam guardados (hoje: disco do servidor num volume).</summary>
public interface IArquivoStorage
{
    /// <summary>Grava o conteúdo no caminho relativo (cria as pastas que faltarem).</summary>
    Task SalvarAsync(string caminhoRelativo, Stream conteudo, CancellationToken ct = default);
    /// <summary>Abre o arquivo para leitura. null = não existe mais no disco.</summary>
    Stream? Abrir(string caminhoRelativo);
    void Excluir(string caminhoRelativo);
}
