using System.Text;
using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>
/// Configuração de uma integração (implantação). Segredo, certificado e chave vazios = mantém os
/// gravados. Carteira e padrões do boleto nulos = mantém os gravados.
/// </summary>
public sealed record ConfigurarIntegracaoDto(
    string Banco, string Ambiente, string ClientId, string? ClientSecret, string? CertificadoPem, string? ChavePem,
    string? ContaCorrente, List<string>? Recursos, bool Ativa, string? CarteiraId = null, RegrasBoleto? Boleto = null);

/// <summary>Integração como as telas veem: sem nenhum segredo.</summary>
public sealed record IntegracaoResumoDto(
    string Id, string EmpresaId, string Banco, string Ambiente, string ContaCorrente, List<string> Recursos,
    bool Ativa, string CertificadoValidoAte, bool Configurada, string ClientId, string CarteiraId, RegrasBoleto Boleto,
    string AlteradoEm, string AlteradoPor, string AvisoRegistradoEm);

/// <summary>Banco que o motor sabe usar (para a tela escolher).</summary>
public sealed record BancoDisponivelDto(string Codigo, string Nome, List<string> Recursos);

public interface IIntegracaoBancariaService
{
    Task<List<IntegracaoResumoDto>> ListarAsync(string? empresaId = null);
    Task<Result<IntegracaoResumoDto>> ConfigurarAsync(string empresaId, ConfigurarIntegracaoDto dto);
    IReadOnlyList<BancoDisponivelDto> Bancos();
    /// <summary>Confere credenciais e certificado gravados no banco (só leitura, nada é gravado).</summary>
    Task<Result<string>> TestarAsync(string integracaoId, CancellationToken ct = default);
    /// <summary>Cadastra no banco o endereço de aviso deste ambiente (urlBase = https://ambiente).</summary>
    Task<Result<IntegracaoResumoDto>> RegistrarAvisoAsync(string integracaoId, string urlBase, CancellationToken ct = default);
}

/// <summary>
/// Liga e configura a integração bancária de uma empresa. Só a nossa equipe usa (permissão
/// especial): o cliente pede, nós cadastramos as credenciais da conta dele. Uma por empresa e banco.
/// </summary>
public sealed class IntegracaoBancariaService(
    ICrudRepository<IntegracaoBancaria> integracoes,
    ICrudRepository<Empresa> empresas,
    ICrudRepository<Carteira> carteiras,
    IBancos bancos,
    ICofreBancario cofre,
    IAuditoriaService auditoria) : IIntegracaoBancariaService
{
    private static readonly string[] RecursosValidos = [IntegracaoBancaria.RecursoCobranca, IntegracaoBancaria.RecursoExtrato, IntegracaoBancaria.RecursoSaldo];

    public async Task<List<IntegracaoResumoDto>> ListarAsync(string? empresaId = null) =>
        (await integracoes.ListarAsync(i => empresaId == null || i.EmpresaId == empresaId)).Select(Resumo).ToList();

    public IReadOnlyList<BancoDisponivelDto> Bancos() =>
        bancos.Todos.Select(b => new BancoDisponivelDto(b.Codigo, b.Nome, b.Recursos.ToList())).ToList();

    public async Task<Result<string>> TestarAsync(string integracaoId, CancellationToken ct = default)
    {
        if (await integracoes.GetByIdAsync(integracaoId) is not { } i) return Result.Failure<string>("Integração não encontrada.");
        if (bancos.Modulo(i.Banco) is not { } modulo) return Result.Failure<string>($"O banco \"{i.Banco}\" não está disponível.");
        if (!cofre.Configurado) return Result.Failure<string>("A chave de cifra das credenciais não está configurada neste ambiente.");
        var erro = await modulo.TestarConexaoAsync(cofre.Abrir(i), ct);
        await auditoria.RegistrarAsync("testar", "IntegracaoBancaria", i.Id, $"Teste de conexão {i.Banco}/{i.Ambiente}: {erro ?? "ok"}");
        return erro is null
            ? Result.Success($"Conexão OK: o {modulo.Nome} aceitou o certificado e as credenciais ({(i.Ambiente == "producao" ? "produção" : "sandbox")}).")
            : Result.Failure<string>(erro);
    }

    public async Task<Result<IntegracaoResumoDto>> RegistrarAvisoAsync(string integracaoId, string urlBase, CancellationToken ct = default)
    {
        if (await integracoes.GetByIdAsync(integracaoId) is not { } i) return Result.Failure<IntegracaoResumoDto>("Integração não encontrada.");
        if (bancos.Modulo(i.Banco)?.Cobranca is not { } cobranca) return Result.Failure<IntegracaoResumoDto>($"O banco \"{i.Banco}\" não emite cobrança.");
        if (!Uri.TryCreate(urlBase, UriKind.Absolute, out var u) || (u.Scheme != "https" && i.Banco != "simulador"))
            return Result.Failure<IntegracaoResumoDto>("O banco só avisa em endereço https (o deste ambiente publicado).");
        if (!cofre.Configurado) return Result.Failure<IntegracaoResumoDto>("A chave de cifra das credenciais não está configurada neste ambiente.");
        // O segredo no endereço é o que identifica a integração no aviso (e impede aviso falso de outra origem).
        if (i.AvisoToken.Length == 0) i.AvisoToken = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        var url = $"{u.GetLeftPart(UriPartial.Authority)}/api/bancos/aviso/{i.AvisoToken}";
        if (await cobranca.RegistrarAvisoAsync(cofre.Abrir(i), url, ct) is { } erro) return Result.Failure<IntegracaoResumoDto>($"O banco recusou o cadastro do aviso: {erro}");
        i.AvisoRegistradoEm = DateTime.UtcNow.ToString("o");
        await integracoes.UpdateAsync(i.Id, i);
        await auditoria.RegistrarAsync("editar", "IntegracaoBancaria", i.Id, $"Aviso de pagamento cadastrado no {i.Banco}/{i.Ambiente} ({u.Host})");
        return Result.Success(Resumo(i));
    }

    public async Task<Result<IntegracaoResumoDto>> ConfigurarAsync(string empresaId, ConfigurarIntegracaoDto dto)
    {
        if (await empresas.GetByIdAsync(empresaId) is not { } empresa) return Result.Failure<IntegracaoResumoDto>("Empresa não encontrada.");
        var banco = (dto.Banco ?? string.Empty).Trim().ToLowerInvariant();
        if (bancos.Modulo(banco) is null)
            return Result.Failure<IntegracaoResumoDto>($"Banco \"{dto.Banco}\" não suportado. Disponíveis: {string.Join(", ", bancos.Todos.Select(b => b.Codigo))}.");
        var ambiente = dto.Ambiente is "producao" ? "producao" : "sandbox";
        if (string.IsNullOrWhiteSpace(dto.ClientId)) return Result.Failure<IntegracaoResumoDto>("Informe o Client ID.");
        if (!cofre.Configurado) return Result.Failure<IntegracaoResumoDto>("A chave de cifra (Certificados__Chave) não está configurada neste ambiente.");
        if (dto.Boleto is { } regras && ConferirRegras(regras) is { } erroRegras) return Result.Failure<IntegracaoResumoDto>(erroRegras);
        if (!string.IsNullOrEmpty(dto.CarteiraId))
        {
            var carteira = await carteiras.GetByIdAsync(dto.CarteiraId);
            if (carteira is null || carteira.Tipo != "banco")
                return Result.Failure<IntegracaoResumoDto>("Escolha uma conta bancária do Caixa para ligar à integração.");
            if (carteira.EmpresaId.Length > 0 && carteira.EmpresaId != empresaId)
                return Result.Failure<IntegracaoResumoDto>($"A conta \"{carteira.Nome}\" é de outra empresa.");
        }

        var existente = (await integracoes.ListarAsync(i => i.EmpresaId == empresaId && i.Banco == banco)).FirstOrDefault();
        var i = existente ?? new IntegracaoBancaria { Id = Guid.NewGuid().ToString(), EmpresaId = empresaId, Banco = banco };
        i.Ambiente = ambiente;
        i.ClientId = dto.ClientId.Trim();
        i.ContaCorrente = new string((dto.ContaCorrente ?? string.Empty).Where(char.IsDigit).ToArray());
        i.Recursos = (dto.Recursos ?? new()).Select(r => r.Trim().ToLowerInvariant()).Where(RecursosValidos.Contains).Distinct().ToList();
        i.Ativa = dto.Ativa;
        i.Status = "ativo";
        if (dto.CarteiraId is not null) i.CarteiraId = dto.CarteiraId;
        if (dto.Boleto is not null) i.Boleto = Normalizar(dto.Boleto);

        // Segredos: só troca o que veio; o que não veio continua o gravado.
        var novoSegredo = !string.IsNullOrWhiteSpace(dto.ClientSecret);
        var novoCertificado = !string.IsNullOrWhiteSpace(dto.CertificadoPem) || !string.IsNullOrWhiteSpace(dto.ChavePem);
        if (existente is null && (!novoSegredo || !novoCertificado))
            return Result.Failure<IntegracaoResumoDto>("Na primeira configuração, envie o Client Secret, o certificado e a chave.");

        var atual = existente is null ? null : cofre.Abrir(existente);
        var segredo = novoSegredo ? dto.ClientSecret!.Trim() : atual!.ClientSecret;
        var certificado = novoCertificado ? Encoding.UTF8.GetBytes(dto.CertificadoPem ?? string.Empty) : atual!.Certificado;
        var chave = novoCertificado ? Encoding.UTF8.GetBytes(dto.ChavePem ?? string.Empty) : atual!.Chave;
        if (novoCertificado)
        {
            if (cofre.ConferirCertificado(certificado, chave, out var validoAte) is { } erro) return Result.Failure<IntegracaoResumoDto>(erro);
            i.CertificadoValidoAte = validoAte;
        }
        (i.SegredoCifrado, i.CertificadoCifrado, i.ChaveCifrada) = cofre.Fechar(i.Id, segredo, certificado, chave);

        if (existente is null) await integracoes.AddAsync(i);
        else await integracoes.UpdateAsync(i.Id, i);
        // Nunca registra segredos: só o que mudou de configuração.
        await auditoria.RegistrarAsync(existente is null ? "criar" : "editar", "IntegracaoBancaria", i.Id,
            $"Integração {banco}/{ambiente} da {empresa.Nome}: {(i.Ativa ? "ativa" : "desligada")}, recursos {string.Join(", ", i.Recursos)}{(novoCertificado ? $", certificado até {i.CertificadoValidoAte}" : string.Empty)}",
            depois: new { i.Ambiente, i.Ativa, i.Recursos, i.ContaCorrente, i.CarteiraId, boleto = i.RegrasDoBoleto });
        return Result.Success(Resumo(i));
    }

    /// <summary>Confere os padrões do boleto. Devolve a mensagem do problema ou null.</summary>
    public static string? ConferirRegras(RegrasBoleto r)
    {
        if (r.MultaTipo is not (RegrasBoleto.Nenhum or RegrasBoleto.Percentual or RegrasBoleto.Valor)) return "Tipo de multa inválido.";
        if (r.JurosTipo is not (RegrasBoleto.Nenhum or RegrasBoleto.PercentualMes or RegrasBoleto.ValorDia)) return "Tipo de juros inválido.";
        if (r.DescontoTipo is not (RegrasBoleto.Nenhum or RegrasBoleto.Percentual or RegrasBoleto.Valor)) return "Tipo de desconto inválido.";
        if (r.MultaTipo != RegrasBoleto.Nenhum && r.Multa <= 0) return "Informe o valor da multa (ou escolha \"sem multa\").";
        if (r.JurosTipo != RegrasBoleto.Nenhum && r.Juros <= 0) return "Informe o valor dos juros (ou escolha \"sem juros\").";
        if (r.DescontoTipo != RegrasBoleto.Nenhum && r.Desconto <= 0) return "Informe o valor do desconto (ou escolha \"sem desconto\").";
        if ((r.MultaTipo == RegrasBoleto.Percentual && r.Multa > 100) || (r.JurosTipo == RegrasBoleto.PercentualMes && r.Juros > 100)
            || (r.DescontoTipo == RegrasBoleto.Percentual && r.Desconto >= 100))
            return "Percentual acima de 100%.";
        if (r.DescontoTipo != RegrasBoleto.Nenhum && r.DescontoDiasAntes < 0) return "Os dias do desconto não podem ser negativos.";
        if (r.DiasBaixa is < 0 or > 60) return "A baixa automática vai de 0 a 60 dias depois do vencimento.";
        var linhas = (r.Instrucoes ?? new()).Where(l => !string.IsNullOrWhiteSpace(l)).ToList();
        if (linhas.Count > RegrasBoleto.MaxInstrucoes) return $"Use até {RegrasBoleto.MaxInstrucoes} linhas de instrução.";
        if (linhas.Any(l => l.Trim().Length > RegrasBoleto.MaxCaracteresLinha)) return $"Cada linha de instrução vai até {RegrasBoleto.MaxCaracteresLinha} caracteres.";
        return null;
    }

    private static RegrasBoleto Normalizar(RegrasBoleto r) => new()
    {
        MultaTipo = r.MultaTipo,
        Multa = r.MultaTipo == RegrasBoleto.Nenhum ? 0 : Math.Round(r.Multa, 2),
        JurosTipo = r.JurosTipo,
        Juros = r.JurosTipo == RegrasBoleto.Nenhum ? 0 : Math.Round(r.Juros, 2),
        DescontoTipo = r.DescontoTipo,
        Desconto = r.DescontoTipo == RegrasBoleto.Nenhum ? 0 : Math.Round(r.Desconto, 2),
        DescontoDiasAntes = r.DescontoTipo == RegrasBoleto.Nenhum ? 0 : r.DescontoDiasAntes,
        DiasBaixa = r.DiasBaixa,
        ComPix = r.ComPix,
        Instrucoes = (r.Instrucoes ?? new()).Select(l => l.Trim()).Where(l => l.Length > 0).ToList(),
    };

    private static IntegracaoResumoDto Resumo(IntegracaoBancaria i) =>
        new(i.Id, i.EmpresaId, i.Banco, i.Ambiente, i.ContaCorrente, i.Recursos, i.Ativa, i.CertificadoValidoAte, i.SegredoCifrado.Length > 0,
            i.ClientId, i.CarteiraId, i.RegrasDoBoleto,
            i.AlteradoEm.Length > 0 ? i.AlteradoEm : i.CriadoEm, i.AlteradoEm.Length > 0 ? i.AlteradoPor : i.CriadoPor, i.AvisoRegistradoEm);
}
