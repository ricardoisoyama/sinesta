using System.Text;
using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>Configuração de uma integração (implantação). Segredo, certificado e chave vazios = mantém os gravados.</summary>
public sealed record ConfigurarIntegracaoDto(
    string Banco, string Ambiente, string ClientId, string? ClientSecret, string? CertificadoPem, string? ChavePem,
    string? ContaCorrente, List<string>? Recursos, bool Ativa);

/// <summary>Integração como as telas veem: sem nenhum segredo.</summary>
public sealed record IntegracaoResumoDto(
    string Id, string EmpresaId, string Banco, string Ambiente, string ContaCorrente, List<string> Recursos,
    bool Ativa, string CertificadoValidoAte, bool Configurada);

public interface IIntegracaoBancariaService
{
    Task<List<IntegracaoResumoDto>> ListarAsync(string? empresaId = null);
    Task<Result<IntegracaoResumoDto>> ConfigurarAsync(string empresaId, ConfigurarIntegracaoDto dto);
}

/// <summary>
/// Liga e configura a integração bancária de uma empresa. Só a nossa equipe usa (permissão
/// especial): o cliente pede, nós cadastramos as credenciais da conta dele. Uma por empresa e banco.
/// </summary>
public sealed class IntegracaoBancariaService(
    ICrudRepository<IntegracaoBancaria> integracoes,
    ICrudRepository<Empresa> empresas,
    IBancos bancos,
    ICofreBancario cofre,
    IAuditoriaService auditoria) : IIntegracaoBancariaService
{
    private static readonly string[] RecursosValidos = [IntegracaoBancaria.RecursoCobranca, IntegracaoBancaria.RecursoExtrato, IntegracaoBancaria.RecursoSaldo];

    public async Task<List<IntegracaoResumoDto>> ListarAsync(string? empresaId = null) =>
        (await integracoes.ListarAsync(i => empresaId == null || i.EmpresaId == empresaId)).Select(Resumo).ToList();

    public async Task<Result<IntegracaoResumoDto>> ConfigurarAsync(string empresaId, ConfigurarIntegracaoDto dto)
    {
        if (await empresas.GetByIdAsync(empresaId) is not { } empresa) return Result.Failure<IntegracaoResumoDto>("Empresa não encontrada.");
        var banco = (dto.Banco ?? string.Empty).Trim().ToLowerInvariant();
        if (bancos.Modulo(banco) is null)
            return Result.Failure<IntegracaoResumoDto>($"Banco \"{dto.Banco}\" não suportado. Disponíveis: {string.Join(", ", bancos.Todos.Select(b => b.Codigo))}.");
        var ambiente = dto.Ambiente is "producao" ? "producao" : "sandbox";
        if (string.IsNullOrWhiteSpace(dto.ClientId)) return Result.Failure<IntegracaoResumoDto>("Informe o Client ID.");
        if (!cofre.Configurado) return Result.Failure<IntegracaoResumoDto>("A chave de cifra (Certificados__Chave) não está configurada neste ambiente.");

        var existente = (await integracoes.ListarAsync(i => i.EmpresaId == empresaId && i.Banco == banco)).FirstOrDefault();
        var i = existente ?? new IntegracaoBancaria { Id = Guid.NewGuid().ToString(), EmpresaId = empresaId, Banco = banco };
        i.Ambiente = ambiente;
        i.ClientId = dto.ClientId.Trim();
        i.ContaCorrente = new string((dto.ContaCorrente ?? string.Empty).Where(char.IsDigit).ToArray());
        i.Recursos = (dto.Recursos ?? new()).Select(r => r.Trim().ToLowerInvariant()).Where(RecursosValidos.Contains).Distinct().ToList();
        i.Ativa = dto.Ativa;
        i.Status = "ativo";

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
            $"Integração {banco}/{ambiente} da {empresa.Nome}: {(i.Ativa ? "ativa" : "desligada")}, recursos {string.Join(", ", i.Recursos)}{(novoCertificado ? $", certificado até {i.CertificadoValidoAte}" : string.Empty)}");
        return Result.Success(Resumo(i));
    }

    private static IntegracaoResumoDto Resumo(IntegracaoBancaria i) =>
        new(i.Id, i.EmpresaId, i.Banco, i.Ambiente, i.ContaCorrente, i.Recursos, i.Ativa, i.CertificadoValidoAte, i.SegredoCifrado.Length > 0);
}
