using System.Globalization;
using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>Contratos e as faturas deles (a tela junta com empresas, carteiras e serviços).</summary>
public sealed record ContratosEFaturas(IReadOnlyList<Contrato> Contratos, IReadOnlyList<Fatura> Faturas);

/// <summary>Dados de uma etapa da fatura (cada ação usa os seus).</summary>
public sealed record EtapaFaturaDto(decimal? Descontos = null, List<string>? ExtrasFora = null, string? Motivo = null, string? Numero = null, string? Data = null);

public interface IFaturamentoService
{
    /// <summary>Alinha as faturas dos contratos com o que eles esperam hoje e devolve todas as deles.</summary>
    Task<List<Fatura>> SincronizarAsync(IReadOnlyList<Contrato> contratos);
    /// <summary>Faturas de uma competência (yyyy-MM), já sincronizadas, com os contratos delas.</summary>
    Task<ContratosEFaturas> DoMesAsync(string competencia);
    /// <summary>conferir | devolver | reenviar | nf | boleto | recebimento.</summary>
    Task<Result<Fatura>> AvancarAsync(string id, string etapa, EtapaFaturaDto dados);
    /// <summary>Confere várias de uma vez (as que estão na etapa). Devolve quantas foram.</summary>
    Task<Result<int>> ConferirLoteAsync(IReadOnlyList<string> ids);
}

/// <summary>
/// Central de Faturamento: a esteira da fatura (prevista → a conferir → conferida → NF → boleto →
/// recebida). A conferência pode devolver com motivo; a pasta do contrato reenvia. Com a NF
/// registrada a fatura trava e os extras dela ficam marcados como faturados no contrato.
/// Por enquanto NF e boleto são REGISTRADOS (número informado); a emissão pelo motor fiscal e pelo
/// banco entra depois, na mesma etapa.
/// </summary>
public sealed class FaturamentoService(
    ICrudRepository<Fatura> faturas,
    ICrudRepository<Contrato> contratos,
    IUnidadeTrabalho unidade,
    IUsuarioAtualProvider usuario,
    TimeProvider relogio) : IFaturamentoService
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private DateOnly Hoje => DateOnly.FromDateTime(relogio.GetLocalNow().DateTime);
    private string Agora => relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
    private async Task<string> QuemAsync() => (await usuario.QuemAsync()).Nome is { Length: > 0 } n ? n : "sistema";

    /// <summary>Recorrente suspenso ou encerrado não gera fatura nova (as que existem ficam como estão).</summary>
    private static bool GeraFatura(Contrato c) => c.Spot || c.Situacao == "vigente";

    public async Task<List<Fatura>> SincronizarAsync(IReadOnlyList<Contrato> lista)
    {
        var ids = lista.Select(c => c.Id).ToList();
        var gravadas = ids.Count == 0 ? new List<Fatura>() : await faturas.ListarAsync(f => ids.Contains(f.ContratoId));
        var existentes = gravadas.Select(f => f.Id).ToHashSet();
        var novas = new List<Fatura>();
        var alteradas = new List<Fatura>();
        foreach (var c in lista.Where(GeraFatura))
            foreach (var f in FaturamentoContrato.Sincronizar(c, gravadas.Where(f => f.ContratoId == c.Id).ToList(), Hoje, Agora))
                (existentes.Contains(f.Id) ? alteradas : novas).Add(f);
        await faturas.SalvarLoteAsync(novas, alteradas);
        return gravadas.Concat(novas).ToList();
    }

    public async Task<ContratosEFaturas> DoMesAsync(string competencia)
    {
        var todos = await contratos.GetAllAsync();
        var doMes = (await SincronizarAsync(todos)).Where(f => f.Competencia == competencia && f.Situacao != SituacaoFatura.Cancelada).ToList();
        var usados = doMes.Select(f => f.ContratoId).ToHashSet();
        return new ContratosEFaturas(todos.Where(c => usados.Contains(c.Id)).ToList(), doMes);
    }

    public async Task<Result<Fatura>> AvancarAsync(string id, string etapa, EtapaFaturaDto d)
    {
        if (await faturas.GetByIdAsync(id) is not { } f) return Result.Failure<Fatura>("Fatura não encontrada.");
        if (await contratos.GetByIdAsync(f.ContratoId) is not { } c) return Result.Failure<Fatura>("O contrato desta fatura não existe mais.");
        var quem = await QuemAsync();
        var mes = FaturamentoContrato.MesAno(f.Competencia);

        string? erro = etapa switch
        {
            "conferir" => Conferir(f, d),
            "devolver" => Devolver(f, d.Motivo),
            "reenviar" => f.Situacao == SituacaoFatura.Devolvida ? Mudar(f, SituacaoFatura.AConferir, () => f.Motivo = string.Empty) : "Só a fatura devolvida volta para a conferência.",
            "nf" => RegistrarNf(f, d.Numero, c.Condicoes.SemNotaFiscal),
            "boleto" => c.Condicoes.SemBoleto ? $"O contrato {c.Numero} não emite boleto (recebe por {c.Condicoes.FormaCobranca}): registre o recebimento."
                : f.Situacao == SituacaoFatura.NfEmitida ? Mudar(f, SituacaoFatura.BoletoEmitido, () => f.Boleto = (d.Numero ?? string.Empty).Trim()) : "O boleto vem depois da nota fiscal registrada.",
            "recebimento" => RegistrarRecebimento(f, d.Data),
            _ => "Etapa desconhecida.",
        };
        if (erro is not null) return Result.Failure<Fatura>(erro);

        var texto = etapa switch
        {
            "conferir" => "Conferência aprovada",
            "devolver" => $"Devolvida na conferência: {f.Motivo}",
            "reenviar" => "Atualizada a partir do contrato e reenviada para conferência",
            "nf" => c.Condicoes.SemNotaFiscal ? $"Fatura emitida sem nota fiscal: {f.Nf}" : $"Nota registrada: {f.Nf}",
            "boleto" => f.Boleto.Length > 0 ? $"Boleto registrado: {f.Boleto}" : "Boleto registrado",
            _ => $"Recebida em {DateOnly.Parse(f.RecebidaEm, CultureInfo.InvariantCulture):dd/MM/yyyy}",
        };
        f.Versoes.Add(new VersaoFatura { Em = Agora, Quem = quem, Texto = texto, Total = f.Total });

        // NF registrada: os extras desta fatura ficam faturados no contrato (não entram em outra).
        if (etapa == "nf")
            foreach (var x in c.Extras.Where(x => f.Extras.Any(e => e.Id == x.Id))) x.FaturadoEm = f.Competencia;
        // O que importa para a pasta (devolução, nota, recebimento) entra no histórico do contrato.
        var contaNaPasta = etapa is "devolver" or "reenviar" or "nf" or "recebimento";
        if (contaNaPasta)
            c.Eventos.Add(new EventoContrato { Em = Agora, Tipo = "fatura", Quem = quem, Texto = $"Fatura {f.Referencia} ({f.Total.ToString("C", PtBr)}): {texto.ToLowerInvariant()}" });

        await unidade.ExecutarAsync(async () =>
        {
            await faturas.UpdateAsync(f.Id, f);
            if (contaNaPasta) await contratos.UpdateAsync(c.Id, c);
        });
        return Result.Success(f);
    }

    public async Task<Result<int>> ConferirLoteAsync(IReadOnlyList<string> ids)
    {
        if (ids.Count == 0) return Result.Failure<int>("Escolha as faturas.");
        var quem = await QuemAsync();
        var aptas = (await faturas.ListarAsync(f => ids.Contains(f.Id)))
            .Where(f => f.Situacao is SituacaoFatura.Prevista or SituacaoFatura.AConferir).ToList();
        foreach (var f in aptas)
        {
            f.Situacao = SituacaoFatura.Conferida;
            f.Versoes.Add(new VersaoFatura { Em = Agora, Quem = quem, Texto = "Conferência aprovada (em lote)", Total = f.Total });
        }
        await faturas.SalvarLoteAsync([], aptas);
        return Result.Success(aptas.Count);
    }

    // ── etapas (null = ok; texto = por que não deu) ──

    private static string? Mudar(Fatura f, string situacao, Action? alem = null)
    {
        f.Situacao = situacao;
        alem?.Invoke();
        return null;
    }

    private static string? Conferir(Fatura f, EtapaFaturaDto d)
    {
        if (f.Situacao is not (SituacaoFatura.Prevista or SituacaoFatura.AConferir)) return "Esta fatura não está esperando conferência.";
        var fora = (d.ExtrasFora ?? []).Where(x => f.Extras.Any(e => e.Id == x)).ToList();
        var extras = f.Extras.Where(e => !fora.Contains(e.Id)).ToList();
        var bruto = f.Previsto + extras.Sum(e => e.Valor);
        var desconto = Math.Round(Math.Max(0, d.Descontos ?? f.Descontos), 2);
        if (desconto > bruto) return "O desconto passa do valor da fatura.";
        f.ExtrasFora = f.ExtrasFora.Union(fora).ToList();
        f.Extras = extras;
        f.Descontos = desconto;
        f.Total = Math.Round(bruto - desconto, 2);
        return Mudar(f, SituacaoFatura.Conferida);
    }

    private static string? Devolver(Fatura f, string? motivo)
    {
        if (f.Situacao is not (SituacaoFatura.Prevista or SituacaoFatura.AConferir or SituacaoFatura.Conferida)) return "Só dá para devolver fatura que ainda não foi emitida.";
        if (string.IsNullOrWhiteSpace(motivo)) return "Escreva o motivo da devolução: quem ajustar o contrato vai ler.";
        return Mudar(f, SituacaoFatura.Devolvida, () => f.Motivo = motivo.Trim());
    }

    /// <summary>
    /// Com CT-e (frete), a cobrança usa o documento da própria viagem: o número vem dele. Contrato sem nota fiscal
    /// (locação, reembolso): é a emissão da fatura, e o número é opcional.
    /// </summary>
    private static string? RegistrarNf(Fatura f, string? numero, bool semNotaFiscal = false)
    {
        if (f.Situacao != SituacaoFatura.Conferida) return "Confira a fatura antes de registrar a nota.";
        if (semNotaFiscal) return Mudar(f, SituacaoFatura.NfEmitida, () => f.Nf = (numero ?? string.Empty).Trim() is { Length: > 0 } n ? n : "sem nota fiscal");
        var ctes = f.Documentos.Where(d => d.Tipo == "CT-e").Select(d => d.Numero).ToList();
        var nf = (numero ?? string.Empty).Trim();
        if (nf.Length == 0 && ctes.Count > 0) nf = ctes.Count == 1 ? $"CT-e {ctes[0]}" : $"CT-e {ctes[0]} a {ctes[^1]}";
        if (nf.Length == 0) return "Informe o número da nota fiscal emitida.";
        return Mudar(f, SituacaoFatura.NfEmitida, () => f.Nf = nf);
    }

    private string? RegistrarRecebimento(Fatura f, string? data)
    {
        if (f.Situacao is not (SituacaoFatura.NfEmitida or SituacaoFatura.BoletoEmitido or SituacaoFatura.Atrasada)) return "Só fatura emitida pode ser recebida.";
        if (!DateOnly.TryParseExact(data ?? string.Empty, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia)) return "Informe a data do recebimento.";
        if (dia > Hoje) return "A data do recebimento não pode ser no futuro.";
        return Mudar(f, SituacaoFatura.Recebida, () => f.RecebidaEm = data!);
    }
}
