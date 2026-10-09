using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace Elrond.Application.Services;

/// <summary>
/// Motor de NFS-e. Fluxo da emissão:
/// 1. confere o pedido (formato e regras da empresa);
/// 2. grava a nota como pendente ANTES de chamar o provedor (se o processo cair no meio, a nota existe e é conferida);
/// 3. envia com o id da nota como identificador externo;
/// 4. envio sem confirmação → consulta pelo identificador antes de qualquer reenvio (nunca duplica);
/// 5. o resultado da prefeitura chega por aviso (webhook) ou pelo acompanhamento em segundo plano.
/// </summary>
public sealed class NfseService(
    INotasFiscaisServicoRepository notas,
    ICrudRepository<ConfiguracaoFiscalEmpresa> configuracoes,
    ICrudRepository<Empresa> empresas,
    INfseProvedores provedores,
    IValidator<PedidoNfseDto> validador,
    IUsuarioAtualProvider usuario,
    TimeProvider relogio,
    ILogger<NfseService> log) : INfseService
{
    /// <summary>Sem confirmação e sem registro no provedor depois deste tempo, o envio não chegou.</summary>
    private static readonly TimeSpan ToleranciaEnvioPerdido = TimeSpan.FromMinutes(10);
    private const int LoteAcompanhamento = 50;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    // ───────────────────────────── Emissão ─────────────────────────────

    public async Task<Result<NotaFiscalServicoDto>> EmitirAsync(PedidoNfseDto pedido, CancellationToken ct = default)
    {
        var validacao = await validador.ValidateAsync(pedido, ct);
        if (!validacao.IsValid)
            return Falha(string.Join(" ", validacao.Errors.Select(e => e.ErrorMessage).Distinct()));

        var empresa = await empresas.GetByIdAsync(pedido.EmpresaId);
        if (empresa is null) return Falha("Empresa emissora não encontrada.");
        if (RegrasNfse.ExigeIbsCbs(empresa.Regime) && pedido.IbsCbs is null)
            return Falha($"Empresa do {empresa.Regime}: informe o indicador da operação e a classificação do IBS/CBS.");

        var (config, provedor, erro) = await EmissorDaEmpresaAsync(pedido.EmpresaId);
        if (erro is not null) return Falha(erro);

        var agora = Agora();
        var quem = await usuario.QuemAsync();
        var nota = NotaFiscalServico.Criar(
            Guid.NewGuid().ToString("N"), pedido.EmpresaId, provedor!.Nome, config!.IdEmpresaProvedor,
            JsonSerializer.Serialize(pedido, Json),
            pedido.Tomador.Nome.Trim(), DocumentoFiscal.Digitos(pedido.Tomador.Documento), pedido.Servico.Descricao.Trim(),
            pedido.Competencia, pedido.Valores.ValorServicos,
            pedido.Origem?.Tipo ?? string.Empty, pedido.Origem?.Id ?? string.Empty, quem.Nome, agora);
        await notas.AdicionarAsync(nota, ct);

        var envio = await provedor.EmitirAsync(config.IdEmpresaProvedor, pedido, nota.Id, ct);
        switch (envio.Desfecho)
        {
            case DesfechoEnvioNfse.Aceito:
                nota.RegistrarAceite(envio.Retorno!, Agora());
                // O provedor pode já devolver o resultado final (ex.: simulador, prefeitura rápida).
                if (envio.Retorno!.Situacao != SituacaoNfse.Processando) nota.AplicarRetorno(envio.Retorno, Agora());
                break;
            case DesfechoEnvioNfse.Recusado:
                nota.RegistrarRecusa(envio.Mensagem, Agora());
                break;
            default:
                log.LogWarning("Envio da NFS-e {Nota} sem confirmação: {Motivo}", nota.Id, envio.Mensagem);
                nota.RegistrarEnvioIncerto(envio.Mensagem, Agora());
                await ConsultarNoProvedorAsync(nota, provedor, ct);
                break;
        }
        await notas.SalvarAsync(ct);
        return Result.Success(Mapear(nota));
    }

    // ───────────────────────────── Consulta e acompanhamento ─────────────────────────────

    public async Task<NotaFiscalServicoDto?> ObterAsync(string id, CancellationToken ct = default) =>
        await notas.ObterAsync(id, ct) is { } nota ? Mapear(nota) : null;

    public async Task<IReadOnlyList<NotaFiscalServicoDto>> ListarAsync(string? empresaId, int quantidade = 50, CancellationToken ct = default) =>
        (await notas.ListarAsync(empresaId, Math.Clamp(quantidade, 1, 200), ct)).Select(Mapear).ToList();

    public async Task<Result<NotaFiscalServicoDto>> AtualizarAsync(string id, CancellationToken ct = default)
    {
        var nota = await notas.ObterAsync(id, ct);
        if (nota is null) return Falha("Nota não encontrada.");
        var provedor = provedores.Para(nota.Provedor);
        if (provedor is null || !provedor.Configurado)
            return Falha($"O provedor \"{nota.Provedor}\" não está disponível neste ambiente.");
        await ConsultarNoProvedorAsync(nota, provedor, ct);
        await notas.SalvarAsync(ct);
        return Result.Success(Mapear(nota));
    }

    public async Task<int> AcompanharAsync(CancellationToken ct = default)
    {
        var pendentes = await notas.ParaAcompanharAsync(Agora(), LoteAcompanhamento, ct);
        foreach (var nota in pendentes)
        {
            var provedor = provedores.Para(nota.Provedor);
            if (provedor is null || !provedor.Configurado)
            {
                nota.RegistrarFalhaDeConsulta(Agora());
                continue;
            }
            try
            {
                await ConsultarNoProvedorAsync(nota, provedor, ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogWarning(e, "Acompanhamento da NFS-e {Nota} falhou; tenta de novo depois.", nota.Id);
                nota.RegistrarFalhaDeConsulta(Agora());
            }
        }
        if (pendentes.Count > 0) await notas.SalvarAsync(ct);
        return pendentes.Count;
    }

    /// <summary>Pergunta ao provedor pela nota (pelo id dele, ou pelo nosso se o envio não foi confirmado).</summary>
    private async Task ConsultarNoProvedorAsync(NotaFiscalServico nota, INfseProvedor provedor, CancellationToken ct)
    {
        var consulta = nota.IdProvedor.Length > 0
            ? await provedor.ConsultarAsync(nota.IdEmpresaProvedor, nota.IdProvedor, ct)
            : await provedor.ConsultarPorIdExternoAsync(nota.IdEmpresaProvedor, nota.Id, ct);

        if (consulta.Retorno is { } retorno) nota.AplicarRetorno(retorno, Agora());
        else if (consulta.NaoExiste && nota.IdProvedor.Length == 0) nota.RegistrarNaoEncontrada(Agora(), ToleranciaEnvioPerdido);
        else nota.RegistrarFalhaDeConsulta(Agora());
    }

    // ───────────────────────────── Cancelamento e arquivos ─────────────────────────────

    public async Task<Result<NotaFiscalServicoDto>> CancelarAsync(string id, string motivo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(motivo)) return Falha("Informe o motivo do cancelamento.");
        var nota = await notas.ObterAsync(id, ct);
        if (nota is null) return Falha("Nota não encontrada.");
        if (nota.Situacao != SituacaoNfse.Emitida)
            return Falha($"Só nota emitida pode ser cancelada (esta está {Nome(nota.Situacao)}).");
        var provedor = provedores.Para(nota.Provedor);
        if (provedor is null || !provedor.Configurado)
            return Falha($"O provedor \"{nota.Provedor}\" não está disponível neste ambiente.");

        var envio = await provedor.CancelarAsync(nota.IdEmpresaProvedor, nota.IdProvedor, ct);
        if (envio.Desfecho == DesfechoEnvioNfse.Recusado) return Falha(envio.Mensagem);
        // Sem confirmação, a nota continua emitida: pedir de novo não causa problema.
        if (envio.Desfecho == DesfechoEnvioNfse.Incerto)
            return Falha($"O provedor não confirmou o pedido de cancelamento ({envio.Mensagem}). Tente de novo.");

        var quem = await usuario.QuemAsync();
        nota.SolicitarCancelamento(motivo, quem.Nome, Agora());
        if (envio.Retorno is { } retorno) nota.AplicarRetorno(retorno, Agora());
        await notas.SalvarAsync(ct);
        return Result.Success(Mapear(nota));
    }

    public async Task<Result<ArquivoNfse>> BaixarAsync(string id, TipoArquivoNfse tipo, CancellationToken ct = default)
    {
        var nota = await notas.ObterAsync(id, ct);
        if (nota is null) return Result.Failure<ArquivoNfse>("Nota não encontrada.");
        if (!nota.TemArquivos) return Result.Failure<ArquivoNfse>($"A nota está {Nome(nota.Situacao)}: ainda não há PDF nem XML.");
        var provedor = provedores.Para(nota.Provedor);
        if (provedor is null || !provedor.Configurado)
            return Result.Failure<ArquivoNfse>($"O provedor \"{nota.Provedor}\" não está disponível neste ambiente.");
        var arquivo = await provedor.BaixarAsync(nota.IdEmpresaProvedor, nota.IdProvedor, tipo, ct);
        return arquivo is null
            ? Result.Failure<ArquivoNfse>($"O provedor ainda não liberou o {tipo.ToString().ToUpperInvariant()}. Tente em alguns minutos.")
            : Result.Success(arquivo);
    }

    // ───────────────────────────── Avisos do provedor ─────────────────────────────

    public async Task ProcessarAvisoAsync(AvisoNfse aviso, CancellationToken ct = default)
    {
        if (await notas.AvisoJaProcessadoAsync(aviso.IdAviso, ct)) return;

        var nota = (aviso.IdExterno.Length > 0 ? await notas.ObterAsync(aviso.IdExterno, ct) : null)
                   ?? (aviso.Retorno.IdProvedor.Length > 0 ? await notas.ObterPorIdProvedorAsync(aviso.Provedor, aviso.Retorno.IdProvedor, ct) : null);
        // Nota de fora do ELROND (ou de outro ambiente na mesma conta do provedor): só registra o aviso.
        if (nota is null) log.LogInformation("Aviso {Aviso} de NFS-e desconhecida ignorado.", aviso.IdAviso);
        else nota.AplicarRetorno(aviso.Retorno, Agora());

        notas.MarcarAvisoProcessado(aviso.IdAviso, aviso.Provedor, Agora());
        await notas.SalvarAsync(ct);
    }

    // ───────────────────────────── Configuração fiscal da empresa ─────────────────────────────

    public async Task<ConfiguracaoFiscalDto?> ObterConfiguracaoAsync(string empresaId, CancellationToken ct = default) =>
        await configuracoes.GetByIdAsync(empresaId) is { } c ? new ConfiguracaoFiscalDto(c.Provedor, c.IdEmpresaProvedor, c.Ativa) : null;

    public async Task<Result<ConfiguracaoFiscalDto>> SalvarConfiguracaoAsync(string empresaId, ConfiguracaoFiscalDto dto, CancellationToken ct = default)
    {
        if (await empresas.GetByIdAsync(empresaId) is null) return Result.Failure<ConfiguracaoFiscalDto>("Empresa não encontrada.");
        var nomeProvedor = (dto.Provedor ?? string.Empty).Trim().ToLowerInvariant();
        if (provedores.Para(nomeProvedor) is null)
            return Result.Failure<ConfiguracaoFiscalDto>($"Provedor \"{dto.Provedor}\" desconhecido. Use \"{ConfiguracaoFiscalEmpresa.ProvedorNfeIo}\" ou \"{ConfiguracaoFiscalEmpresa.ProvedorSimulador}\".");
        var idEmpresaProvedor = (dto.IdEmpresaProvedor ?? string.Empty).Trim();
        if (nomeProvedor == ConfiguracaoFiscalEmpresa.ProvedorNfeIo && idEmpresaProvedor.Length == 0)
            return Result.Failure<ConfiguracaoFiscalDto>("Informe o identificador da empresa na NFE.io (company_id).");

        var atual = await configuracoes.GetByIdAsync(empresaId);
        var config = atual ?? new ConfiguracaoFiscalEmpresa { Id = empresaId };
        config.Provedor = nomeProvedor;
        config.IdEmpresaProvedor = idEmpresaProvedor;
        config.Ativa = dto.Ativa;
        if (atual is null) await configuracoes.AddAsync(config);
        else await configuracoes.UpdateAsync(empresaId, config);
        return Result.Success(new ConfiguracaoFiscalDto(config.Provedor, config.IdEmpresaProvedor, config.Ativa));
    }

    // ───────────────────────────── Apoio ─────────────────────────────

    /// <summary>Configuração e provedor prontos para emitir pela empresa, ou o motivo de não estarem.</summary>
    private async Task<(ConfiguracaoFiscalEmpresa? Config, INfseProvedor? Provedor, string? Erro)> EmissorDaEmpresaAsync(string empresaId)
    {
        var config = await configuracoes.GetByIdAsync(empresaId);
        if (config is null)
            return (null, null, "A empresa ainda não está configurada para emitir NFS-e (provedor e identificador). Isso é feito na implantação.");
        if (!config.Ativa) return (null, null, "A emissão de NFS-e está desligada para esta empresa.");
        var provedor = provedores.Para(config.Provedor);
        if (provedor is null) return (null, null, $"Provedor \"{config.Provedor}\" desconhecido na configuração da empresa.");
        if (!provedor.Configurado) return (null, null, $"O provedor \"{config.Provedor}\" não está configurado neste ambiente (falta a chave de API).");
        if (config.Provedor == ConfiguracaoFiscalEmpresa.ProvedorNfeIo && config.IdEmpresaProvedor.Length == 0)
            return (null, null, "Falta o identificador da empresa na NFE.io na configuração fiscal.");
        return (config, provedor, null);
    }

    private DateTime Agora() => relogio.GetUtcNow().UtcDateTime;

    private static Result<NotaFiscalServicoDto> Falha(string mensagem) => Result.Failure<NotaFiscalServicoDto>(mensagem);

    private static string Nome(SituacaoNfse s) => s switch
    {
        SituacaoNfse.Pendente => "pendente",
        SituacaoNfse.Processando => "em processamento",
        SituacaoNfse.Emitida => "emitida",
        SituacaoNfse.Rejeitada => "rejeitada",
        SituacaoNfse.Cancelando => "em cancelamento",
        SituacaoNfse.Cancelada => "cancelada",
        _ => s.ToString().ToLowerInvariant(),
    };

    private static NotaFiscalServicoDto Mapear(NotaFiscalServico n) => new(
        n.Id, n.EmpresaId, n.Provedor, n.Ambiente, n.Situacao.ToString(), n.Mensagem,
        n.Numero, n.CodigoVerificacao, n.SerieRps, n.NumeroRps,
        n.TomadorNome, n.TomadorDocumento, n.Descricao, n.Competencia,
        n.ValorServicos, n.ValorIss, n.ValorRetido, n.ValorLiquido,
        n.OrigemTipo, n.OrigemId, n.CriadaEm, n.CriadaPor, n.AtualizadaEm, n.EmitidaEm, n.CanceladaEm,
        n.MotivoCancelamento, n.EmAndamento, n.TemArquivos);
}
