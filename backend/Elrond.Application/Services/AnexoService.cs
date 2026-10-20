using System.Text.RegularExpressions;
using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>
/// Regras dos documentos anexados: quais entidades aceitam, quais tipos e tamanho,
/// e onde o arquivo é guardado (pasta por registro: clientes/&lt;id&gt;/).
/// O tipo (Content-Type) vem SEMPRE da extensão e o conteúdo é conferido pela
/// assinatura do arquivo: um "foto.jpg" que na verdade é SVG/HTML não entra.
/// </summary>
public partial class AnexoService : IAnexoService
{
    private static readonly string[] Entidades = { "cliente", "fornecedor", "veiculo", "contrato", "movimento" };
    private static readonly Dictionary<string, string> TiposPorExtensao = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".doc"] = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xls"] = "application/vnd.ms-excel",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
    };

    /// <summary>Assinaturas (magic bytes) aceitas por extensão.</summary>
    private static readonly Dictionary<string, byte[][]> AssinaturasPorExtensao = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = new[] { "%PDF"u8.ToArray() },
        [".jpg"] = new[] { new byte[] { 0xFF, 0xD8, 0xFF } },
        [".jpeg"] = new[] { new byte[] { 0xFF, 0xD8, 0xFF } },
        [".png"] = new[] { new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
        // Office 2007+ é um ZIP; Office 97-2003 é um contêiner OLE.
        [".docx"] = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } },
        [".xlsx"] = new[] { new byte[] { 0x50, 0x4B, 0x03, 0x04 } },
        [".doc"] = new[] { new byte[] { 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1 } },
        [".xls"] = new[] { new byte[] { 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1 } },
    };

    [GeneratedRegex("^[A-Za-z0-9._:-]{1,80}$")]
    private static partial Regex IdSeguro();

    private readonly IAnexoRepository _anexos;
    private readonly IArquivoStorage _storage;
    private readonly ICrudRepository<Cliente> _clientes;
    private readonly ICrudRepository<Fornecedor> _fornecedores;
    private readonly ICrudRepository<Veiculo> _veiculos;
    private readonly ICrudRepository<Contrato> _contratos;
    private readonly ICrudRepository<Movimento> _movimentos;
    private readonly IUsuarioAtualProvider _usuario;

    public AnexoService(
        IAnexoRepository anexos,
        IArquivoStorage storage,
        ICrudRepository<Cliente> clientes,
        ICrudRepository<Fornecedor> fornecedores,
        ICrudRepository<Veiculo> veiculos,
        ICrudRepository<Contrato> contratos,
        ICrudRepository<Movimento> movimentos,
        IUsuarioAtualProvider usuario)
    {
        _anexos = anexos;
        _storage = storage;
        _clientes = clientes;
        _fornecedores = fornecedores;
        _veiculos = veiculos;
        _contratos = contratos;
        _movimentos = movimentos;
        _usuario = usuario;
    }

    public long TamanhoMaximo => 12L * 1024 * 1024;
    public IReadOnlyList<string> ExtensoesAceitas => TiposPorExtensao.Keys.ToList();

    public Task<List<Anexo>> ListarAsync(string entidade, string entidadeId) =>
        _anexos.ListarAsync(entidade, entidadeId);

    public async Task<Result<Anexo>> EnviarAsync(string entidade, string entidadeId, string nomeArquivo, string contentType, long tamanho, Stream conteudo, string enviadoPor)
    {
        if (!Entidades.Contains(entidade))
            return Result.Failure<Anexo>("Este cadastro não aceita anexos.");
        if (string.IsNullOrWhiteSpace(entidadeId))
            return Result.Failure<Anexo>("Salve o cadastro antes de anexar documentos.");
        // O id entra no caminho do arquivo: só caracteres de identificador, e o registro precisa existir.
        if (!IdSeguro().IsMatch(entidadeId))
            return Result.Failure<Anexo>("Identificador do cadastro inválido.");
        if (!await ExisteAsync(entidade, entidadeId))
            return Result.Failure<Anexo>("Cadastro não encontrado. Salve o cadastro antes de anexar documentos.");

        var nome = Path.GetFileName(nomeArquivo ?? string.Empty).Trim();
        if (nome.Length == 0)
            return Result.Failure<Anexo>("Arquivo sem nome.");
        var ext = Path.GetExtension(nome);
        if (!TiposPorExtensao.TryGetValue(ext, out var tipoPelaExtensao))
            return Result.Failure<Anexo>("Tipo de arquivo não aceito. Envie PDF, Word, Excel ou JPG.");
        if (tamanho <= 0)
            return Result.Failure<Anexo>("O arquivo está vazio.");
        if (tamanho > TamanhoMaximo)
            return Result.Failure<Anexo>("O arquivo passa de 12 MB. Reduza ou divida o documento.");
        if (!await ConteudoBateComExtensaoAsync(conteudo, ext))
            return Result.Failure<Anexo>("O conteúdo do arquivo não corresponde à extensão. Envie o documento original.");

        var id = Guid.NewGuid().ToString();
        // Nome físico = id + extensão: sem acento, sem espaço, sem risco de colisão.
        var caminho = $"{entidade}s/{entidadeId}/{id}{ext.ToLowerInvariant()}";
        await _storage.SalvarAsync(caminho, conteudo);

        var anexo = new Anexo
        {
            Id = id,
            Entidade = entidade,
            EntidadeId = entidadeId,
            Nome = nome,
            // Nunca o Content-Type enviado pelo navegador: é o que permitiria servir SVG/HTML "inline".
            Tipo = tipoPelaExtensao,
            Tamanho = tamanho,
            Caminho = caminho,
            EnviadoPor = enviadoPor,
            Em = DateTime.UtcNow.ToString("o"),
            CriadoEm = DateTime.UtcNow.ToString("o"),
            CriadoPor = enviadoPor,
            AlteradoEm = DateTime.UtcNow.ToString("o"),
            AlteradoPor = enviadoPor,
        };
        await _anexos.AddAsync(anexo);
        return Result.Success(anexo);
    }

    public async Task<Result<AnexoAberto>> AbrirAsync(string id)
    {
        var anexo = await _anexos.GetByIdAsync(id);
        if (anexo is null || anexo.InativadoEm.Length > 0) return Result.Failure<AnexoAberto>("Anexo não encontrado.");
        var stream = _storage.Abrir(anexo.Caminho);
        if (stream is null) return Result.Failure<AnexoAberto>("O arquivo não está mais no servidor.");
        return Result.Success(new AnexoAberto(anexo, stream));
    }

    /// <summary>
    /// Exclusão lógica: o anexo some da lista, mas o registro e o arquivo ficam no servidor
    /// (histórico/compliance), com quem e quando excluiu.
    /// </summary>
    public async Task<Result> ExcluirAsync(string id)
    {
        var anexo = await _anexos.GetByIdAsync(id);
        if (anexo is null || anexo.InativadoEm.Length > 0) return Result.Failure("Anexo não encontrado.");
        var quem = await _usuario.QuemAsync();
        anexo.InativadoEm = DateTime.UtcNow.ToString("o");
        anexo.InativadoPor = string.IsNullOrEmpty(quem.Nome) ? "sistema" : quem.Nome;
        anexo.AlteradoEm = anexo.InativadoEm;
        anexo.AlteradoPor = anexo.InativadoPor;
        await _anexos.UpdateAsync(anexo);
        return Result.Success();
    }

    private async Task<bool> ExisteAsync(string entidade, string entidadeId) => entidade switch
    {
        "cliente" => await _clientes.GetByIdAsync(entidadeId) is not null,
        "fornecedor" => await _fornecedores.GetByIdAsync(entidadeId) is not null,
        "veiculo" => await _veiculos.GetByIdAsync(entidadeId) is not null,
        "contrato" => await _contratos.GetByIdAsync(entidadeId) is not null,
        // Lançamento das Entradas e Saídas: boleto, nota ou título que originou a conta.
        "movimento" => await _movimentos.GetByIdAsync(entidadeId) is not null,
        _ => false,
    };

    /// <summary>Lê os primeiros bytes e volta o stream ao início (o stream do upload é rebobinável).</summary>
    private static async Task<bool> ConteudoBateComExtensaoAsync(Stream conteudo, string ext)
    {
        if (!AssinaturasPorExtensao.TryGetValue(ext, out var assinaturas)) return false;
        if (!conteudo.CanSeek) return false;

        var cabecalho = new byte[8];
        var lidos = 0;
        while (lidos < cabecalho.Length)
        {
            var n = await conteudo.ReadAsync(cabecalho.AsMemory(lidos, cabecalho.Length - lidos));
            if (n == 0) break;
            lidos += n;
        }
        conteudo.Position = 0;

        return assinaturas.Any(a => lidos >= a.Length && cabecalho.AsSpan(0, a.Length).SequenceEqual(a));
    }
}
