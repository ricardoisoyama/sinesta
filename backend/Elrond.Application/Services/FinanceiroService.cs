using System.Globalization;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>
/// Regras do Financeiro: lançamentos (com parcelas), aprovação, baixa e conciliação bancária.
/// Nada é apagado: cancelar marca o lançamento; desfazer uma conciliação devolve a linha.
/// Aprovação: todo lançamento nasce pendente. A regra do tipo "movimento" (tela Aprovadores e
/// Regras) que cobre o valor do lançamento diz quem assina; todos precisam assinar. Sem regra
/// que cubra o valor, ninguém aprova (o gestor precisa criar a regra).
/// </summary>
public class FinanceiroService : IFinanceiroService
{
    private readonly ICrudRepository<Movimento> _movimentos;
    private readonly ICrudRepository<Carteira> _carteiras;
    private readonly ICrudRepository<RegraAprovacao> _regras;
    private readonly ICrudRepository<ExtratoLinha> _extrato;
    private readonly IUnidadeTrabalho _uow;
    private readonly IAuditoriaService _auditoria;
    private readonly INumerador _numerador;

    public FinanceiroService(ICrudRepository<Movimento> movimentos, ICrudRepository<Carteira> carteiras, ICrudRepository<RegraAprovacao> regras,
        ICrudRepository<ExtratoLinha> extrato, IUnidadeTrabalho uow, IAuditoriaService auditoria, INumerador numerador)
    {
        _numerador = numerador;
        _movimentos = movimentos;
        _carteiras = carteiras;
        _regras = regras;
        _extrato = extrato;
        _uow = uow;
        _auditoria = auditoria;
    }

    private static string Agora() => DateTime.UtcNow.ToString("o");
    private static decimal R2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static readonly Dictionary<string, int> MesesPorPeriodo = new()
    {
        ["mensal"] = 1, ["bimestral"] = 2, ["trimestral"] = 3, ["semestral"] = 6, ["anual"] = 12,
    };

    // ══════════════════════════ aprovação ══════════════════════════

    /// <summary>Regra de movimento que cobre o lançamento (o valor do lançamento inteiro, somando as parcelas).</summary>
    public static RegraAprovacao? RegraQueCobre(IEnumerable<RegraAprovacao> regras, string tipo, decimal valorTotal) =>
        regras.Where(r => r.CobreMovimento(tipo, valorTotal)).OrderByDescending(r => r.De).FirstOrDefault();

    private async Task<List<Movimento>> GrupoAsync(Movimento m) =>
        string.IsNullOrEmpty(m.GrupoId)
            ? new List<Movimento> { m }
            : (await _movimentos.ListarAsync(x => x.GrupoId == m.GrupoId)).Where(x => !x.Cancelado).ToList();

    public async Task<List<Movimento>> ListarAsync()
    {
        var lista = await _movimentos.GetAllAsync();
        // Pendente sem regra: mostra a regra que passou a cobrir (o gestor pode ter criado depois).
        var regras = await _regras.ListarAsync(r => r.Tipo == "movimento");
        foreach (var g in lista.Where(m => m.Aprovacao == "pendente" && m.RegraId.Length == 0).GroupBy(m => m.GrupoId))
        {
            var total = g.Sum(m => m.Valor);
            var regra = RegraQueCobre(regras, g.First().Tipo, total);
            if (regra is not null) foreach (var m in g) m.RegraId = regra.Id;
        }
        return lista.OrderBy(m => m.Vencimento).ToList();
    }

    public async Task<Result<Movimento>> AprovarAsync(string id, UsuarioAtual quem, bool podeAprovar)
    {
        var m = await _movimentos.GetByIdAsync(id);
        if (m is null || m.Cancelado) return Result.Failure<Movimento>("Lançamento não encontrado.");
        if (m.Aprovacao != "pendente") return Result.Failure<Movimento>($"Este lançamento já está {m.Aprovacao}.");
        if (!podeAprovar) return Result.Failure<Movimento>("Você não tem a permissão de aprovar lançamentos financeiros.");
        var grupo = await GrupoAsync(m);
        var (regra, erro) = await RegraDoGrupoAsync(grupo);
        if (regra is null) return Result.Failure<Movimento>(erro!);
        if (!regra.Aprovadores.Contains(quem.Id)) return Result.Failure<Movimento>($"Você não é aprovador da regra \"{regra.Nome}\".");
        if (m.Aprovacoes.Any(a => a.UsuarioId == quem.Id)) return Result.Failure<Movimento>("Você já aprovou este lançamento.");

        var assinatura = new AprovacaoMovimento { UsuarioId = quem.Id, Nome = quem.Nome, Em = Agora() };
        var assinaram = m.Aprovacoes.Select(a => a.UsuarioId).Append(quem.Id).ToHashSet();
        var completo = regra.Aprovadores.All(assinaram.Contains);
        foreach (var x in grupo)
        {
            x.RegraId = regra.Id;
            x.Aprovacoes = x.Aprovacoes.Where(a => a.UsuarioId != quem.Id).Append(assinatura).ToList();
            if (completo) x.Aprovacao = "aprovado";
        }
        await _uow.ExecutarAsync(() => _movimentos.SalvarLoteAsync(Array.Empty<Movimento>(), grupo));
        await _auditoria.RegistrarAsync(completo ? "aprovar" : "assinar", "Movimento", m.Id,
            $"{quem.Nome} {(completo ? "aprovou" : "assinou")} \"{m.Descricao}\" ({m.ParceiroNome}, {R2(grupo.Sum(x => x.Valor)):N2}){(completo ? "" : $" · faltam {regra.Aprovadores.Count - assinaram.Count} assinatura(s)")}");
        return Result.Success(grupo.First(x => x.Id == m.Id));
    }

    public async Task<Result<Movimento>> ReprovarAsync(string id, string motivo, UsuarioAtual quem, bool podeAprovar)
    {
        var m = await _movimentos.GetByIdAsync(id);
        if (m is null || m.Cancelado) return Result.Failure<Movimento>("Lançamento não encontrado.");
        if (m.Aprovacao != "pendente") return Result.Failure<Movimento>($"Este lançamento já está {m.Aprovacao}.");
        if (!podeAprovar) return Result.Failure<Movimento>("Você não tem a permissão de aprovar lançamentos financeiros.");
        if (string.IsNullOrWhiteSpace(motivo)) return Result.Failure<Movimento>("Escreva o motivo da reprovação.");
        var grupo = await GrupoAsync(m);
        var (regra, erro) = await RegraDoGrupoAsync(grupo);
        if (regra is null) return Result.Failure<Movimento>(erro!);
        if (!regra.Aprovadores.Contains(quem.Id)) return Result.Failure<Movimento>($"Você não é aprovador da regra \"{regra.Nome}\".");
        foreach (var x in grupo)
        {
            x.RegraId = regra.Id;
            x.Aprovacao = "reprovado";
            x.ReprovadoPor = quem.Nome;
            x.ReprovadoEm = Agora();
            x.MotivoReprovacao = motivo.Trim();
        }
        await _uow.ExecutarAsync(() => _movimentos.SalvarLoteAsync(Array.Empty<Movimento>(), grupo));
        await _auditoria.RegistrarAsync("reprovar", "Movimento", m.Id, $"{quem.Nome} reprovou \"{m.Descricao}\" ({m.ParceiroNome}): {motivo.Trim()}");
        return Result.Success(grupo.First(x => x.Id == m.Id));
    }

    private async Task<(RegraAprovacao? Regra, string? Erro)> RegraDoGrupoAsync(List<Movimento> grupo)
    {
        var regras = await _regras.ListarAsync(r => r.Tipo == "movimento");
        var atual = grupo.First();
        var regra = regras.FirstOrDefault(r => r.Id == atual.RegraId && r.Status == "ativo")
                    ?? RegraQueCobre(regras, atual.Tipo, grupo.Sum(x => x.Valor));
        return regra is null
            ? (null, $"Não existem regras ou aprovadores cadastrados para lançamentos {(atual.Tipo == "receber" ? "a receber" : "a pagar")} de {R2(grupo.Sum(x => x.Valor)):N2}. O gestor precisa criar a regra em Parametrizações › Aprovadores e Regras.")
            : (regra, null);
    }

    // ══════════════════════════ lançamentos ══════════════════════════

    private static string? Validar(Movimento m)
    {
        if (m.Tipo is not ("pagar" or "receber")) return "Escolha a pagar ou a receber.";
        if (string.IsNullOrWhiteSpace(m.Descricao)) return "Descreva o lançamento.";
        if (string.IsNullOrWhiteSpace(m.ParceiroNome)) return m.Tipo == "receber" ? "Escolha o cliente." : "Escolha o fornecedor ou funcionário.";
        if (!DateOnly.TryParse(m.Vencimento, CultureInfo.InvariantCulture, out _)) return "Informe o vencimento.";
        if (m.Valor <= 0) return "Informe o valor.";
        if (string.IsNullOrWhiteSpace(m.CarteiraId)) return "Escolha a carteira.";
        return null;
    }

    /// <summary>Cada CNPJ tem as suas contas: lançamento só entra em carteira da mesma empresa (ou compartilhada).</summary>
    private static string? CarteiraDeOutraEmpresa(Carteira c, string empresaId) =>
        c.EmpresaId.Length > 0 && empresaId.Length > 0 && c.EmpresaId != empresaId
            ? $"A carteira \"{c.Nome}\" é de outra empresa. Escolha uma carteira da empresa do lançamento."
            : null;

    public async Task<Result<List<Movimento>>> CriarAsync(NovoMovimentoDto dto, UsuarioAtual quem)
    {
        var b = dto.Movimento;
        if (Validar(b) is { } erro) return Result.Failure<List<Movimento>>(erro);
        var carteira = await _carteiras.GetByIdAsync(b.CarteiraId);
        if (carteira is null) return Result.Failure<List<Movimento>>("Carteira não encontrada.");
        // Sem empresa informada (ex.: criado na conciliação), vale a empresa da carteira.
        if (string.IsNullOrEmpty(b.EmpresaId)) b.EmpresaId = carteira.EmpresaId;
        if (CarteiraDeOutraEmpresa(carteira, b.EmpresaId) is { } outra) return Result.Failure<List<Movimento>>(outra);
        var qtd = Math.Clamp(dto.Parcelas, 1, 360);
        var meses = MesesPorPeriodo.GetValueOrDefault(dto.Periodicidade ?? "mensal", 1);
        var inicio = DateOnly.Parse(b.Vencimento, CultureInfo.InvariantCulture);
        var grupoId = string.IsNullOrWhiteSpace(b.GrupoId) ? Guid.NewGuid().ToString() : b.GrupoId;
        var centavos = (long)Math.Round(b.Valor * 100m);
        var cada = centavos / qtd;
        var regra = RegraQueCobre(await _regras.ListarAsync(r => r.Tipo == "movimento"), b.Tipo, b.Valor);
        // Cada parcela tem o seu número, em ordem (1532 é a 1/3, 1533 a 2/3...).
        var numeros = await _numerador.ProximosMovimentosAsync(qtd);

        var novos = Enumerable.Range(0, qtd).Select(i =>
        {
            var venc = inicio.AddMonths(i * meses);
            return new Movimento
            {
                Id = Guid.NewGuid().ToString(),
                Numero = numeros[i],
                Tipo = b.Tipo,
                EmpresaId = b.EmpresaId,
                ParceiroId = b.ParceiroId,
                ParceiroNome = b.ParceiroNome.Trim(),
                Descricao = b.Descricao.Trim(),
                PlanoContaId = b.PlanoContaId,
                CentroCustoId = b.CentroCustoId,
                Documento = b.Documento,
                Competencia = string.IsNullOrEmpty(b.Competencia) ? b.Vencimento[..7] : b.Competencia,
                Vencimento = venc.ToString("yyyy-MM-dd"),
                Valor = (i == qtd - 1 ? centavos - cada * (qtd - 1) : cada) / 100m,
                CarteiraId = b.CarteiraId,
                FormaPagamento = b.FormaPagamento,
                Parcela = i + 1,
                TotalParcelas = qtd,
                GrupoId = grupoId,
                Origem = string.IsNullOrEmpty(b.Origem) ? "manual" : b.Origem,
                OrigemId = b.OrigemId,
                Observacao = b.Observacao,
                // Só a conciliação cria lançamento já pago (é um fato do extrato).
                PagoEm = b.Origem == "conciliacao" ? b.PagoEm : string.Empty,
                ValorPago = b.Origem == "conciliacao" ? b.ValorPago : 0m,
                Aprovacao = "pendente",
                RegraId = regra?.Id ?? string.Empty,
            };
        }).ToList();

        await _uow.ExecutarAsync(() => _movimentos.SalvarLoteAsync(novos, Array.Empty<Movimento>()));
        await _auditoria.RegistrarAsync("criar", "Movimento", novos[0].Id,
            $"Lançamento {NumerosDe(novos)} {(b.Tipo == "receber" ? "a receber" : "a pagar")} \"{b.Descricao.Trim()}\" ({b.ParceiroNome.Trim()}, {b.Valor:N2}{(qtd > 1 ? $" em {qtd} parcelas" : "")}) · pendente de aprovação{(regra is null ? " (sem regra que cubra o valor)" : $" ({regra.Nome})")}");
        return Result.Success(novos);
    }

    /// <summary>"1532" ou, parcelado, "1532 a 1534".</summary>
    private static string NumerosDe(IReadOnlyList<Movimento> lote) =>
        lote.Count == 1 ? $"{lote[0].Numero}" : $"{lote[0].Numero} a {lote[^1].Numero}";

    public async Task<Result<Movimento>> AtualizarAsync(string id, Movimento dados)
    {
        var atual = await _movimentos.GetByIdAsync(id);
        if (atual is null) return Result.Failure<Movimento>("Lançamento não encontrado.");
        if (atual.Cancelado) return Result.Failure<Movimento>("Lançamento cancelado não pode ser alterado.");
        if (atual.PagoEm.Length > 0) return Result.Failure<Movimento>("Lançamento liquidado: estorne a baixa antes de alterar.");
        dados.Tipo = atual.Tipo;
        if (Validar(dados) is { } erro) return Result.Failure<Movimento>(erro);
        var carteira = await _carteiras.GetByIdAsync(dados.CarteiraId);
        if (carteira is null) return Result.Failure<Movimento>("Carteira não encontrada.");
        if (CarteiraDeOutraEmpresa(carteira, dados.EmpresaId) is { } outra) return Result.Failure<Movimento>(outra);

        // Mudou o que foi aprovado (valor, vencimento, quem recebe/paga): volta para aprovação.
        var mudouAprovado = atual.Valor != dados.Valor || atual.Vencimento != dados.Vencimento || atual.ParceiroNome != dados.ParceiroNome.Trim();
        var novo = new Movimento
        {
            Id = atual.Id, Numero = atual.Numero, Tipo = atual.Tipo, EmpresaId = dados.EmpresaId, ParceiroId = dados.ParceiroId, ParceiroNome = dados.ParceiroNome.Trim(),
            Descricao = dados.Descricao.Trim(), PlanoContaId = dados.PlanoContaId, CentroCustoId = dados.CentroCustoId, Documento = dados.Documento,
            Competencia = dados.Competencia, Vencimento = dados.Vencimento, Valor = dados.Valor, Desconto = dados.Desconto, Juros = dados.Juros, Multa = dados.Multa,
            CarteiraId = dados.CarteiraId, FormaPagamento = dados.FormaPagamento, Parcela = atual.Parcela, TotalParcelas = atual.TotalParcelas,
            GrupoId = atual.GrupoId, Origem = atual.Origem, OrigemId = atual.OrigemId, Observacao = dados.Observacao,
            Aprovacao = mudouAprovado ? "pendente" : atual.Aprovacao,
            RegraId = mudouAprovado ? string.Empty : atual.RegraId,
            Aprovacoes = mudouAprovado ? new() : atual.Aprovacoes,
            ReprovadoPor = mudouAprovado ? string.Empty : atual.ReprovadoPor,
            ReprovadoEm = mudouAprovado ? string.Empty : atual.ReprovadoEm,
            MotivoReprovacao = mudouAprovado ? string.Empty : atual.MotivoReprovacao,
        };
        if (mudouAprovado)
            novo.RegraId = RegraQueCobre(await _regras.ListarAsync(r => r.Tipo == "movimento"), novo.Tipo, novo.Valor)?.Id ?? string.Empty;
        await _movimentos.UpdateAsync(id, novo);
        await _auditoria.RegistrarAsync("editar", "Movimento", id, $"Lançamento \"{novo.Descricao}\" alterado{(mudouAprovado && atual.Aprovacao != "pendente" ? " · voltou para aprovação" : "")}", atual, novo);
        return Result.Success(novo);
    }

    public async Task<Result<int>> LiquidarAsync(BaixaDto dto, UsuarioAtual quem)
    {
        if (dto.Ids is not { Count: > 0 }) return Result.Failure<int>("Escolha ao menos um lançamento.");
        if (!DateOnly.TryParse(dto.PagoEm, CultureInfo.InvariantCulture, out _)) return Result.Failure<int>("Informe a data do pagamento.");
        var ids = dto.Ids.ToHashSet();
        var alvo = (await _movimentos.ListarAsync(m => ids.Contains(m.Id))).Where(m => !m.Cancelado && m.PagoEm.Length == 0).ToList();
        if (alvo.Count == 0) return Result.Failure<int>("Nenhum lançamento em aberto entre os escolhidos.");
        var naoAprovados = alvo.Where(m => m.Aprovacao != "aprovado").ToList();
        if (naoAprovados.Count > 0)
            return Result.Failure<int>($"{naoAprovados.Count} lançamento(s) ainda não aprovado(s): só lançamento aprovado pode ser baixado.");
        if (!string.IsNullOrEmpty(dto.CarteiraId))
        {
            var carteira = await _carteiras.GetByIdAsync(dto.CarteiraId);
            if (carteira is null) return Result.Failure<int>("Carteira não encontrada.");
            if (alvo.Select(m => CarteiraDeOutraEmpresa(carteira, m.EmpresaId)).FirstOrDefault(e => e is not null) is { } outra)
                return Result.Failure<int>(outra);
        }
        var um = alvo.Count == 1;
        foreach (var m in alvo)
        {
            if (um)
            {
                m.Desconto = dto.Desconto ?? m.Desconto;
                m.Juros = dto.Juros ?? m.Juros;
                m.Multa = dto.Multa ?? m.Multa;
            }
            m.PagoEm = dto.PagoEm;
            if (!string.IsNullOrEmpty(dto.CarteiraId)) m.CarteiraId = dto.CarteiraId;
            m.ValorPago = Math.Max(0, m.Valor - m.Desconto + m.Juros + m.Multa);
        }
        await _uow.ExecutarAsync(() => _movimentos.SalvarLoteAsync(Array.Empty<Movimento>(), alvo));
        await _auditoria.RegistrarAsync("liquidar", "Movimento", string.Join(",", alvo.Take(5).Select(m => m.Id)),
            $"{quem.Nome} liquidou {alvo.Count} lançamento(s) em {dto.PagoEm} ({R2(alvo.Sum(m => m.ValorPago)):N2})");
        return Result.Success(alvo.Count);
    }

    public async Task<Result<Movimento>> EstornarAsync(string id, UsuarioAtual quem)
    {
        var m = await _movimentos.GetByIdAsync(id);
        if (m is null || m.Cancelado) return Result.Failure<Movimento>("Lançamento não encontrado.");
        if (m.PagoEm.Length == 0) return Result.Failure<Movimento>("Este lançamento não está liquidado.");
        var antes = m.PagoEm;
        m.PagoEm = string.Empty;
        m.ValorPago = 0;
        await _movimentos.UpdateAsync(id, m);
        // A linha do extrato que apontava para ele volta a ficar pendente.
        var linhas = await _extrato.ListarAsync(l => l.MovimentoId == id);
        foreach (var l in linhas) { l.Situacao = "pendente"; l.MovimentoId = string.Empty; }
        if (linhas.Count > 0) await _extrato.SalvarLoteAsync(Array.Empty<ExtratoLinha>(), linhas);
        await _auditoria.RegistrarAsync("estornar", "Movimento", id, $"{quem.Nome} estornou a baixa de \"{m.Descricao}\" (pago em {antes})");
        return Result.Success(m);
    }

    public async Task<Result<int>> CancelarAsync(IdsDto dto, UsuarioAtual quem)
    {
        var ids = (dto.Ids ?? new()).ToHashSet();
        var alvo = (await _movimentos.ListarAsync(m => ids.Contains(m.Id))).Where(m => !m.Cancelado && m.PagoEm.Length == 0).ToList();
        if (alvo.Count == 0) return Result.Failure<int>("Nenhum lançamento em aberto entre os escolhidos (liquidado precisa ser estornado antes).");
        foreach (var m in alvo) m.Cancelado = true;
        await _uow.ExecutarAsync(() => _movimentos.SalvarLoteAsync(Array.Empty<Movimento>(), alvo));
        await _auditoria.RegistrarAsync("cancelar", "Movimento", string.Join(",", alvo.Take(5).Select(m => m.Id)), $"{quem.Nome} cancelou {alvo.Count} lançamento(s) (ficam no histórico)");
        return Result.Success(alvo.Count);
    }

    // ══════════════════════════ conciliação ══════════════════════════

    public async Task<List<ExtratoLinha>> ExtratoAsync(string carteiraId) =>
        (await _extrato.ListarAsync(l => l.CarteiraId == carteiraId)).OrderBy(l => l.Data).ThenBy(l => l.Fitid).ToList();

    public async Task<Result<ImportarExtratoResultado>> ImportarAsync(ImportarExtratoDto dto, UsuarioAtual quem)
    {
        if (await _carteiras.GetByIdAsync(dto.CarteiraId) is null) return Result.Failure<ImportarExtratoResultado>("Escolha a carteira do extrato.");
        var linhas = dto.Linhas ?? new();
        if (linhas.Count == 0) return Result.Failure<ImportarExtratoResultado>("O arquivo não tem transações.");
        if (linhas.Count > 5000) return Result.Failure<ImportarExtratoResultado>("Arquivo grande demais: importe no máximo 5.000 linhas por vez.");
        var existentes = (await _extrato.ListarAsync(l => l.CarteiraId == dto.CarteiraId)).Select(l => l.Fitid).ToHashSet();
        var novas = linhas
            .Where(l => !string.IsNullOrWhiteSpace(l.Fitid) && !existentes.Contains(l.Fitid.Trim()))
            .GroupBy(l => l.Fitid.Trim()).Select(g => g.First())
            .Select(l => new ExtratoLinha
            {
                Id = Guid.NewGuid().ToString(),
                CarteiraId = dto.CarteiraId,
                Fitid = l.Fitid.Trim(),
                Data = l.Data,
                Valor = l.Valor,
                Memo = (l.Memo ?? string.Empty).Trim(),
                Situacao = "pendente",
            }).ToList();
        if (novas.Count > 0) await _uow.ExecutarAsync(() => _extrato.SalvarLoteAsync(novas, Array.Empty<ExtratoLinha>()));
        await _auditoria.RegistrarAsync("importar", "ExtratoLinha", dto.CarteiraId, $"{quem.Nome} importou extrato: {novas.Count} linha(s) nova(s), {linhas.Count - novas.Count} já importada(s)");
        return Result.Success(new ImportarExtratoResultado(novas.Count, linhas.Count - novas.Count));
    }

    public async Task<Result<ExtratoLinha>> VincularAsync(VincularExtratoDto dto, UsuarioAtual quem)
    {
        var l = await _extrato.GetByIdAsync(dto.LinhaId);
        if (l is null) return Result.Failure<ExtratoLinha>("Linha do extrato não encontrada.");
        if (l.Situacao == "conciliado") return Result.Failure<ExtratoLinha>("Esta linha já está conciliada.");
        var m = await _movimentos.GetByIdAsync(dto.MovimentoId);
        if (m is null || m.Cancelado) return Result.Failure<ExtratoLinha>("Lançamento não encontrado.");
        if ((l.Valor >= 0) != (m.Tipo == "receber")) return Result.Failure<ExtratoLinha>("Entrada no extrato só casa com lançamento a receber, e saída com a pagar.");
        if (m.PagoEm.Length == 0)
        {
            // Lançamento em aberto: a conciliação é a baixa dele, na data do extrato.
            var baixa = await LiquidarAsync(new BaixaDto(new() { m.Id }, l.Data, l.CarteiraId), quem);
            if (!baixa.IsSuccess) return Result.Failure<ExtratoLinha>(baixa.Error!);
        }
        l.Situacao = "conciliado";
        l.MovimentoId = m.Id;
        await _extrato.UpdateAsync(l.Id, l);
        await _auditoria.RegistrarAsync("conciliar", "ExtratoLinha", l.Id, $"{quem.Nome} conciliou \"{l.Memo}\" ({l.Valor:N2}) com \"{m.Descricao}\" ({m.ParceiroNome})");
        return Result.Success(l);
    }

    public async Task<Result<ExtratoLinha>> CriarDoExtratoAsync(CriarDoExtratoDto dto, UsuarioAtual quem)
    {
        var l = await _extrato.GetByIdAsync(dto.LinhaId);
        if (l is null) return Result.Failure<ExtratoLinha>("Linha do extrato não encontrada.");
        if (l.Situacao == "conciliado") return Result.Failure<ExtratoLinha>("Esta linha já está conciliada.");
        var valor = Math.Abs(l.Valor);
        var r = await CriarAsync(new NovoMovimentoDto(new Movimento
        {
            Tipo = l.Valor >= 0 ? "receber" : "pagar",
            EmpresaId = dto.EmpresaId ?? string.Empty,
            ParceiroNome = dto.ParceiroNome ?? string.Empty,
            Descricao = dto.Descricao ?? string.Empty,
            PlanoContaId = dto.PlanoContaId ?? string.Empty,
            CentroCustoId = dto.CentroCustoId ?? string.Empty,
            Vencimento = l.Data,
            Competencia = l.Data.Length >= 7 ? l.Data[..7] : string.Empty,
            Valor = valor,
            CarteiraId = l.CarteiraId,
            FormaPagamento = dto.FormaPagamento ?? string.Empty,
            Origem = "conciliacao",
            OrigemId = l.Fitid,
            PagoEm = l.Data,
            ValorPago = valor,
            Observacao = $"Criado na conciliação · extrato {l.Fitid}",
        }), quem);
        if (!r.IsSuccess) return Result.Failure<ExtratoLinha>(r.Error!);
        l.Situacao = "conciliado";
        l.MovimentoId = r.Value![0].Id;
        await _extrato.UpdateAsync(l.Id, l);
        return Result.Success(l);
    }

    public async Task<Result<ExtratoLinha>> DesfazerAsync(string linhaId, UsuarioAtual quem)
    {
        var l = await _extrato.GetByIdAsync(linhaId);
        if (l is null) return Result.Failure<ExtratoLinha>("Linha do extrato não encontrada.");
        if (l.Situacao == "conciliado" && l.MovimentoId.Length > 0 && await _movimentos.GetByIdAsync(l.MovimentoId) is { } m)
        {
            if (m.Origem == "conciliacao")
            {
                // Lançamento nascido da linha: cancela (fica no histórico).
                m.Cancelado = true;
                await _movimentos.UpdateAsync(m.Id, m);
            }
            else if (m.PagoEm == l.Data)
            {
                // A baixa foi feita pela conciliação: estorna.
                m.PagoEm = string.Empty;
                m.ValorPago = 0;
                await _movimentos.UpdateAsync(m.Id, m);
            }
        }
        var antes = l.Situacao;
        l.Situacao = "pendente";
        l.MovimentoId = string.Empty;
        await _extrato.UpdateAsync(l.Id, l);
        await _auditoria.RegistrarAsync("desfazer", "ExtratoLinha", l.Id, $"{quem.Nome} desfez \"{l.Memo}\" ({antes})");
        return Result.Success(l);
    }

    public async Task<Result<ExtratoLinha>> IgnorarAsync(string linhaId, UsuarioAtual quem)
    {
        var l = await _extrato.GetByIdAsync(linhaId);
        if (l is null) return Result.Failure<ExtratoLinha>("Linha do extrato não encontrada.");
        if (l.Situacao == "conciliado") return Result.Failure<ExtratoLinha>("Desfaça a conciliação antes de ignorar a linha.");
        l.Situacao = "ignorado";
        await _extrato.UpdateAsync(l.Id, l);
        await _auditoria.RegistrarAsync("ignorar", "ExtratoLinha", l.Id, $"{quem.Nome} ignorou \"{l.Memo}\" ({l.Valor:N2})");
        return Result.Success(l);
    }
}
