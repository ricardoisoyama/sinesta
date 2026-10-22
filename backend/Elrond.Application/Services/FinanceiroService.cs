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
    private readonly ICrudRepository<Empresa>? _empresas;
    private readonly ICrudRepository<PagamentoBancario>? _pagamentos;

    public FinanceiroService(ICrudRepository<Movimento> movimentos, ICrudRepository<Carteira> carteiras, ICrudRepository<RegraAprovacao> regras,
        ICrudRepository<ExtratoLinha> extrato, IUnidadeTrabalho uow, IAuditoriaService auditoria, INumerador numerador,
        ICrudRepository<Empresa>? empresas = null, ICrudRepository<PagamentoBancario>? pagamentos = null)
    {
        _numerador = numerador;
        _empresas = empresas;
        _pagamentos = pagamentos;
        _movimentos = movimentos;
        _carteiras = carteiras;
        _regras = regras;
        _extrato = extrato;
        _uow = uow;
        _auditoria = auditoria;
    }

    private const string PixEmAndamentoMsg = "Tem Pix em andamento no banco para este lançamento (aguardando aprovação, agendado ou em processamento): espere o banco efetivar, ou cancele no app do banco, antes de baixar, alterar ou cancelar aqui.";

    /// <summary>Lançamentos com Pix em andamento no banco (id → o pagamento mais recente).</summary>
    private async Task<Dictionary<string, PagamentoBancario>> PixEmAndamentoAsync(IEnumerable<string> ids)
    {
        if (_pagamentos is null) return new();
        var set = ids.ToHashSet();
        if (set.Count == 0) return new();
        return (await _pagamentos.ListarAsync(p => set.Contains(p.MovimentoId)))
            .Where(p => p.EmAberto).GroupBy(p => p.MovimentoId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(p => p.CriadoEm).First());
    }

    /// <summary>Prefixo do UsuarioId da assinatura dada pela conciliação (o extrato prova que já saiu/entrou no banco).</summary>
    private const string PelaConciliacao = "conciliacao:";

    private static AprovacaoMovimento AssinaturaDaConciliacao(UsuarioAtual quem) =>
        new() { UsuarioId = PelaConciliacao + quem.Id, Nome = $"{quem.Nome} · pela conciliação", Em = Agora() };

    private static bool AprovadoSoPelaConciliacao(Movimento m) =>
        m.Aprovacao == "aprovado" && m.Aprovacoes.Count > 0 && m.Aprovacoes.All(a => a.UsuarioId.StartsWith(PelaConciliacao, StringComparison.Ordinal));

    private const string PagoPeloBancoMsg = "Pago por Pix pelo ELROND: o dinheiro já saiu do banco, então a baixa não é estornada nem o lançamento alterado. Se precisar devolver, lance um a receber.";

    private static string Agora() => DateTime.UtcNow.ToString("o");
    private static decimal R2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static readonly Dictionary<string, int> MesesPorPeriodo = new()
    {
        ["mensal"] = 1, ["bimestral"] = 2, ["trimestral"] = 3, ["semestral"] = 6, ["anual"] = 12,
    };

    // ══════════════════════════ aprovação ══════════════════════════

    /// <summary>Regra de movimento que cobre o lançamento (o valor do lançamento inteiro, somando as parcelas).</summary>
    /// <summary>Regra que cobre o lançamento; a da empresa vence a de "todas" na mesma faixa.</summary>
    public static RegraAprovacao? RegraQueCobre(IEnumerable<RegraAprovacao> regras, string tipo, decimal valorTotal, string empresaId = "") =>
        regras.Where(r => r.CobreMovimento(tipo, valorTotal, empresaId))
            .OrderByDescending(r => r.EmpresaId.Length > 0).ThenByDescending(r => r.De).FirstOrDefault();

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
            var (tipo, total, empresa) = ValorParaRegra(g.ToList());
            var regra = RegraQueCobre(regras, tipo, total, empresa);
            if (regra is not null) foreach (var m in g) m.RegraId = regra.Id;
        }
        var pix = await PixEmAndamentoAsync(lista.Where(m => !m.Cancelado && m.PagoEm.Length == 0).Select(m => m.Id));
        foreach (var m in lista)
            if (pix.TryGetValue(m.Id, out var p)) { m.PixSituacao = p.Situacao; m.PixData = p.Data; }
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
        // Transferência que já foi feita no banco: aprovada, as duas pernas entram baixadas na data dela.
        // A que ainda vai ser feita (pelo app ou pelo "Agendar pagamento") fica em aberto até a baixa.
        if (completo && grupo.All(x => x.Transferencia && x.BaixarAoAprovar))
            foreach (var x in grupo.Where(x => x.PagoEm.Length == 0)) { x.PagoEm = x.Vencimento; x.ValorPago = x.Valor; }
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
        var (tipo, total, empresa) = ValorParaRegra(grupo);
        var regra = regras.FirstOrDefault(r => r.Id == atual.RegraId && r.Status == "ativo")
                    ?? RegraQueCobre(regras, tipo, total, empresa);
        return regra is null
            ? (null, $"Não existem regras ou aprovadores cadastrados para lançamentos {(tipo == "receber" ? "a receber" : "a pagar")} de {R2(total):N2}. O gestor precisa criar a regra em Parametrizações › Aprovadores e Regras.")
            : (regra, null);
    }

    /// <summary>Tipo, valor e empresa que a regra de aprovação avalia: na transferência, a saída (dinheiro que sai da conta).</summary>
    private static (string Tipo, decimal Total, string EmpresaId) ValorParaRegra(List<Movimento> grupo) =>
        grupo.Any(m => m.Transferencia)
            ? ("pagar", grupo.Where(m => m.Tipo == "pagar").Sum(m => m.Valor), grupo.FirstOrDefault(m => m.Tipo == "pagar")?.EmpresaId ?? grupo.First().EmpresaId)
            : (grupo.First().Tipo, grupo.Sum(m => m.Valor), grupo.First().EmpresaId);

    /// <summary>A outra perna das transferências entre os lançamentos (para aprovar, baixar, estornar e cancelar juntas).</summary>
    private async Task<List<Movimento>> ComPernasAsync(List<Movimento> lista)
    {
        var grupos = lista.Where(m => m.Transferencia && m.GrupoId.Length > 0).Select(m => m.GrupoId).Distinct().ToList();
        if (grupos.Count == 0) return lista;
        var ids = lista.Select(m => m.Id).ToHashSet();
        var pernas = (await _movimentos.ListarAsync(x => grupos.Contains(x.GrupoId))).Where(x => !x.Cancelado && !ids.Contains(x.Id));
        return lista.Concat(pernas).ToList();
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
        var regra = RegraQueCobre(await _regras.ListarAsync(r => r.Tipo == "movimento"), b.Tipo, b.Valor, b.EmpresaId);
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
                Aprovacao = b.Origem == "conciliacao" ? "aprovado" : "pendente",
                Aprovacoes = b.Origem == "conciliacao" ? new() { AssinaturaDaConciliacao(quem) } : new(),
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

    public async Task<Result<List<Movimento>>> TransferirAsync(TransferenciaDto dto, UsuarioAtual quem)
    {
        if (string.IsNullOrWhiteSpace(dto.OrigemId) || string.IsNullOrWhiteSpace(dto.DestinoId)) return Result.Failure<List<Movimento>>("Escolha a conta de origem e a de destino.");
        if (dto.OrigemId == dto.DestinoId) return Result.Failure<List<Movimento>>("A conta de origem e a de destino precisam ser diferentes.");
        if (dto.Valor <= 0) return Result.Failure<List<Movimento>>("Informe o valor.");
        if (!DateOnly.TryParseExact(dto.Data ?? string.Empty, "yyyy-MM-dd", out _)) return Result.Failure<List<Movimento>>("Informe a data da transferência.");
        var origem = await _carteiras.GetByIdAsync(dto.OrigemId);
        var destino = await _carteiras.GetByIdAsync(dto.DestinoId);
        if (origem is null || destino is null) return Result.Failure<List<Movimento>>("Conta não encontrada.");
        if (origem.Status == "inativo" || destino.Status == "inativo") return Result.Failure<List<Movimento>>("Não dá para transferir de ou para uma conta inativa.");

        var descricao = string.IsNullOrWhiteSpace(dto.Descricao) ? "Transferência entre contas" : dto.Descricao.Trim();
        var regra = RegraQueCobre(await _regras.ListarAsync(r => r.Tipo == "movimento"), "pagar", dto.Valor, origem.EmpresaId);
        var numeros = await _numerador.ProximosMovimentosAsync(2);
        var grupoId = Guid.NewGuid().ToString();
        var idSaida = Guid.NewGuid().ToString();
        var idEntrada = Guid.NewGuid().ToString();
        // Contas de empresas diferentes costumam ter o mesmo nome ("077 - Banco Inter"): a empresa entra no nome.
        var nomeOrigem = origem.Nome;
        var nomeDestino = destino.Nome;
        if (origem.EmpresaId != destino.EmpresaId && _empresas is not null)
        {
            var eo = origem.EmpresaId.Length > 0 ? await _empresas.GetByIdAsync(origem.EmpresaId) : null;
            var ed = destino.EmpresaId.Length > 0 ? await _empresas.GetByIdAsync(destino.EmpresaId) : null;
            if (eo is not null) nomeOrigem = $"{eo.Nome} · {origem.Nome}";
            if (ed is not null) nomeDestino = $"{ed.Nome} · {destino.Nome}";
        }
        Movimento Perna(string id, long numero, string tipo, Carteira conta, Carteira outra, string outraId) => new()
        {
            Id = id, Numero = numero, Tipo = tipo, EmpresaId = conta.EmpresaId, ParceiroId = string.Empty,
            ParceiroNome = tipo == "pagar" ? $"Para {(outra == destino ? nomeDestino : nomeOrigem)}" : $"De {(outra == origem ? nomeOrigem : nomeDestino)}",
            Descricao = descricao, PlanoContaId = dto.PlanoContaId ?? string.Empty, CentroCustoId = dto.CentroCustoId ?? string.Empty,
            Documento = dto.Documento ?? string.Empty, Competencia = dto.Data[..7], Vencimento = dto.Data, Valor = Math.Round(dto.Valor, 2),
            CarteiraId = conta.Id, FormaPagamento = string.IsNullOrWhiteSpace(dto.FormaPagamento) ? "Pix" : dto.FormaPagamento, Parcela = 1, TotalParcelas = 1,
            GrupoId = grupoId, Origem = Movimento.OrigemTransferencia, OrigemId = outraId, Observacao = dto.Observacao ?? string.Empty,
            Aprovacao = "pendente", RegraId = regra?.Id ?? string.Empty, BaixarAoAprovar = dto.JaFeita,
        };
        var novos = new List<Movimento>
        {
            Perna(idSaida, numeros[0], "pagar", origem, destino, idEntrada),
            Perna(idEntrada, numeros[1], "receber", destino, origem, idSaida),
        };
        await _uow.ExecutarAsync(() => _movimentos.SalvarLoteAsync(novos, Array.Empty<Movimento>()));
        await _auditoria.RegistrarAsync("criar", "Movimento", idSaida,
            $"{quem.Nome} lançou a transferência {NumerosDe(novos)} de {dto.Valor:N2} de \"{origem.Nome}\" para \"{destino.Nome}\" em {dto.Data} · pendente de aprovação{(regra is null ? " (sem regra que cubra o valor)" : $" ({regra.Nome})")}");
        return Result.Success(novos);
    }

    public async Task<Result<Movimento>> AtualizarAsync(string id, Movimento dados)
    {
        var atual = await _movimentos.GetByIdAsync(id);
        if (atual is null) return Result.Failure<Movimento>("Lançamento não encontrado.");
        if (atual.Cancelado) return Result.Failure<Movimento>("Lançamento cancelado não pode ser alterado.");
        if (atual.PagoPeloBanco) return Result.Failure<Movimento>(PagoPeloBancoMsg);
        if ((await PixEmAndamentoAsync(new[] { atual.Id, atual.OrigemId })).Count > 0) return Result.Failure<Movimento>(PixEmAndamentoMsg);
        if (atual.PagoEm.Length > 0) return Result.Failure<Movimento>("Lançamento liquidado: estorne a baixa antes de alterar.");
        dados.Tipo = atual.Tipo;
        if (atual.Transferencia)
        {
            dados.CarteiraId = atual.CarteiraId;
            dados.EmpresaId = atual.EmpresaId;
            dados.ParceiroId = atual.ParceiroId;
            dados.ParceiroNome = atual.ParceiroNome;
        }
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
            GrupoId = atual.GrupoId, Origem = atual.Origem, OrigemId = atual.OrigemId, Observacao = dados.Observacao, BaixarAoAprovar = atual.BaixarAoAprovar,
            Aprovacao = mudouAprovado ? "pendente" : atual.Aprovacao,
            RegraId = mudouAprovado ? string.Empty : atual.RegraId,
            Aprovacoes = mudouAprovado ? new() : atual.Aprovacoes,
            ReprovadoPor = mudouAprovado ? string.Empty : atual.ReprovadoPor,
            ReprovadoEm = mudouAprovado ? string.Empty : atual.ReprovadoEm,
            MotivoReprovacao = mudouAprovado ? string.Empty : atual.MotivoReprovacao,
        };
        if (mudouAprovado)
        {
            // Na transferência a regra é da empresa da saída (a entrada é da outra empresa).
            var empresaDaRegra = novo.Transferencia && novo.Tipo == "receber"
                ? (await _movimentos.GetByIdAsync(novo.OrigemId))?.EmpresaId ?? novo.EmpresaId
                : novo.EmpresaId;
            novo.RegraId = RegraQueCobre(await _regras.ListarAsync(r => r.Tipo == "movimento"), novo.Transferencia ? "pagar" : novo.Tipo, novo.Valor, empresaDaRegra)?.Id ?? string.Empty;
        }
        await _movimentos.UpdateAsync(id, novo);
        if (atual.Transferencia && await _movimentos.GetByIdAsync(atual.OrigemId) is { Cancelado: false } perna)
        {
            perna.Valor = novo.Valor; perna.Vencimento = novo.Vencimento; perna.Competencia = novo.Competencia; perna.Descricao = novo.Descricao;
            perna.Documento = novo.Documento; perna.Observacao = novo.Observacao; perna.FormaPagamento = novo.FormaPagamento;
            perna.Aprovacao = novo.Aprovacao; perna.RegraId = novo.RegraId; perna.Aprovacoes = novo.Aprovacoes;
            perna.ReprovadoPor = novo.ReprovadoPor; perna.ReprovadoEm = novo.ReprovadoEm; perna.MotivoReprovacao = novo.MotivoReprovacao;
            await _movimentos.UpdateAsync(perna.Id, perna);
        }
        await _auditoria.RegistrarAsync("editar", "Movimento", id, $"Lançamento \"{novo.Descricao}\" alterado{(mudouAprovado && atual.Aprovacao != "pendente" ? " · voltou para aprovação" : "")}", atual, novo);
        return Result.Success(novo);
    }

    public async Task<Result<int>> LiquidarAsync(BaixaDto dto, UsuarioAtual quem)
    {
        if (dto.Ids is not { Count: > 0 }) return Result.Failure<int>("Escolha ao menos um lançamento.");
        if (!DateOnly.TryParse(dto.PagoEm, CultureInfo.InvariantCulture, out _)) return Result.Failure<int>("Informe a data do pagamento.");
        var ids = dto.Ids.ToHashSet();
        var alvo = (await ComPernasAsync(await _movimentos.ListarAsync(m => ids.Contains(m.Id)))).Where(m => !m.Cancelado && m.PagoEm.Length == 0).ToList();
        if (alvo.Count == 0) return Result.Failure<int>("Nenhum lançamento em aberto entre os escolhidos.");
        if (quem.Id != "sistema" && (await PixEmAndamentoAsync(alvo.Select(m => m.Id))).Count > 0) return Result.Failure<int>(PixEmAndamentoMsg);
        var naoAprovados = alvo.Where(m => m.Aprovacao != "aprovado").ToList();
        if (naoAprovados.Count > 0)
            return Result.Failure<int>($"{naoAprovados.Count} lançamento(s) ainda não aprovado(s): só lançamento aprovado pode ser baixado.");
        if (!string.IsNullOrEmpty(dto.CarteiraId))
        {
            var carteira = await _carteiras.GetByIdAsync(dto.CarteiraId);
            if (carteira is null) return Result.Failure<int>("Carteira não encontrada.");
            if (alvo.Where(m => !m.Transferencia).Select(m => CarteiraDeOutraEmpresa(carteira, m.EmpresaId)).FirstOrDefault(e => e is not null) is { } outra)
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
            // Cada perna da transferência fica na sua conta (a baixa não troca a carteira delas).
            if (!string.IsNullOrEmpty(dto.CarteiraId) && !m.Transferencia) m.CarteiraId = dto.CarteiraId;
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
        var alvo = (await ComPernasAsync(new List<Movimento> { m })).Where(x => x.PagoEm.Length > 0).ToList();
        if (alvo.Any(x => x.PagoPeloBanco)) return Result.Failure<Movimento>(PagoPeloBancoMsg);
        foreach (var x in alvo) { x.PagoEm = string.Empty; x.ValorPago = 0; }
        await _uow.ExecutarAsync(() => _movimentos.SalvarLoteAsync(Array.Empty<Movimento>(), alvo));
        // A linha do extrato que apontava para ele (ou para a outra perna) volta a ficar pendente.
        var idsAlvo = alvo.Select(x => x.Id).ToHashSet();
        var linhas = (await _extrato.ListarAsync(l => l.Situacao == "conciliado")).Where(l => l.Vinculados().Any(idsAlvo.Contains)).ToList();
        foreach (var l in linhas) { l.Situacao = "pendente"; l.MovimentoId = string.Empty; l.MovimentoIds = new(); }
        if (linhas.Count > 0) await _extrato.SalvarLoteAsync(Array.Empty<ExtratoLinha>(), linhas);
        await _auditoria.RegistrarAsync("estornar", "Movimento", id, $"{quem.Nome} estornou a baixa de \"{m.Descricao}\" (pago em {antes})");
        return Result.Success(m);
    }

    public async Task<Result<int>> CancelarAsync(IdsDto dto, UsuarioAtual quem)
    {
        var ids = (dto.Ids ?? new()).ToHashSet();
        var alvo = (await ComPernasAsync(await _movimentos.ListarAsync(m => ids.Contains(m.Id)))).Where(m => !m.Cancelado && m.PagoEm.Length == 0).ToList();
        if (alvo.Count == 0) return Result.Failure<int>("Nenhum lançamento em aberto entre os escolhidos (liquidado precisa ser estornado antes).");
        if ((await PixEmAndamentoAsync(alvo.Select(m => m.Id))).Count > 0) return Result.Failure<int>(PixEmAndamentoMsg);
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
        var ids = (dto.MovimentoIds is { Count: > 0 } lista ? lista : new List<string> { dto.MovimentoId }).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();
        if (ids.Count == 0) return Result.Failure<ExtratoLinha>("Escolha o lançamento.");
        var movs = new List<Movimento>();
        foreach (var id in ids)
        {
            var x = await _movimentos.GetByIdAsync(id);
            if (x is null || x.Cancelado) return Result.Failure<ExtratoLinha>("Lançamento não encontrado.");
            if ((l.Valor >= 0) != (x.Tipo == "receber")) return Result.Failure<ExtratoLinha>("Entrada no extrato só casa com lançamento a receber, e saída com a pagar.");
            movs.Add(x);
        }
        // Um lançamento não paga duas linhas do extrato.
        var jaLigados = (await _extrato.ListarAsync(x => x.Situacao == "conciliado" && x.Id != l.Id)).SelectMany(x => x.Vinculados()).ToHashSet();
        if (movs.FirstOrDefault(x => jaLigados.Contains(x.Id)) is { } usado)
            return Result.Failure<ExtratoLinha>($"O lançamento nº {usado.Numero} já está conciliado com outra linha do extrato.");
        if (movs.Count > 1)
        {
            // Vários lançamentos numa linha só: a soma precisa ser o valor do extrato.
            var soma = movs.Sum(x => x.PagoEm.Length > 0 && x.ValorPago > 0 ? x.ValorPago : Math.Max(0, x.Valor - x.Desconto + x.Juros + x.Multa));
            var diferenca = R2(Math.Abs(l.Valor) - soma);
            if (Math.Abs(diferenca) >= 0.005m)
                return Result.Failure<ExtratoLinha>($"A soma dos {movs.Count} lançamentos ({R2(soma):N2}) não bate com o extrato ({R2(Math.Abs(l.Valor)):N2}): {(diferenca > 0 ? "faltam" : "sobram")} {Math.Abs(diferenca):N2}.");
        }
        foreach (var m in movs)
        {
            var r = await BaixarPelaConciliacaoAsync(l, m, quem, corrigirValor: movs.Count == 1);
            if (!r.IsSuccess) return Result.Failure<ExtratoLinha>(r.Error!);
        }
        l.Situacao = "conciliado";
        l.MovimentoId = movs[0].Id;
        l.MovimentoIds = movs.Select(x => x.Id).ToList();
        await _extrato.UpdateAsync(l.Id, l);
        await _auditoria.RegistrarAsync("conciliar", "ExtratoLinha", l.Id,
            $"{quem.Nome} conciliou \"{l.Memo}\" ({l.Valor:N2}) com {string.Join(" + ", movs.Select(x => $"nº {x.Numero} \"{x.Descricao}\" ({x.ParceiroNome})"))}");
        return Result.Success(l);
    }

    /// <summary>A conciliação baixa o lançamento em aberto (aprovando o pendente: o extrato prova que já saiu/entrou).</summary>
    private async Task<Result> BaixarPelaConciliacaoAsync(ExtratoLinha l, Movimento m, UsuarioAtual quem, bool corrigirValor)
    {
        if (m.PagoEm.Length == 0)
        {
            var pernas = await ComPernasAsync(new List<Movimento> { m });
            if ((await PixEmAndamentoAsync(pernas.Select(x => x.Id))).Count > 0) return Result.Failure(PixEmAndamentoMsg);
            // O extrato prova que o dinheiro já saiu (ou entrou): o que estava pendente é aprovado pela conciliação.
            var pendentes = pernas.Where(x => x.Aprovacao != "aprovado").ToList();
            if (pendentes.Count > 0)
            {
                foreach (var x in pendentes)
                {
                    x.Aprovacao = "aprovado";
                    x.Aprovacoes = x.Aprovacoes.Append(AssinaturaDaConciliacao(quem)).ToList();
                }
                await _uow.ExecutarAsync(() => _movimentos.SalvarLoteAsync(Array.Empty<Movimento>(), pendentes));
                await _auditoria.RegistrarAsync("aprovar", "Movimento", m.Id,
                    $"{quem.Nome} aprovou pela conciliação \"{m.Descricao}\" ({m.ParceiroNome}, {R2(m.Valor):N2}): o extrato mostra que já saiu/entrou no banco");
            }
            // Lançamento em aberto: a conciliação é a baixa dele, na data do extrato.
            var baixa = await LiquidarAsync(new BaixaDto(new() { m.Id }, l.Data, l.CarteiraId), quem);
            if (!baixa.IsSuccess) return Result.Failure(baixa.Error!);
            // O valor que saiu (ou entrou) é o do banco: se o lançado difere (digitação), o valor pago fica o do extrato,
            // sem supor juros ou desconto. (Com vários lançamentos a soma já bate: cada um fica com o dele.)
            var doBanco = Math.Abs(l.Valor);
            if (corrigirValor && !m.Transferencia && await _movimentos.GetByIdAsync(m.Id) is { } baixado && Math.Abs(baixado.ValorPago - doBanco) >= 0.005m)
            {
                var lancado = baixado.ValorPago;
                baixado.ValorPago = doBanco;
                await _movimentos.UpdateAsync(baixado.Id, baixado);
                await _auditoria.RegistrarAsync("conciliar", "Movimento", baixado.Id,
                    $"{quem.Nome} conciliou com valor do extrato {doBanco:N2} (lançado {lancado:N2}): valor pago corrigido");
            }
        }
        return Result.Success();
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
        l.MovimentoIds = new() { l.MovimentoId };
        await _extrato.UpdateAsync(l.Id, l);
        return Result.Success(l);
    }

    public async Task<Result<ExtratoLinha>> DesfazerAsync(string linhaId, UsuarioAtual quem)
    {
        var l = await _extrato.GetByIdAsync(linhaId);
        if (l is null) return Result.Failure<ExtratoLinha>("Linha do extrato não encontrada.");
        foreach (var id in l.Situacao == "conciliado" ? l.Vinculados() : Array.Empty<string>())
        {
            if (await _movimentos.GetByIdAsync(id) is not { } m) continue;
            if (m.Origem == "conciliacao")
            {
                // Lançamento nascido da linha: cancela (fica no histórico).
                m.Cancelado = true;
                await _movimentos.UpdateAsync(m.Id, m);
            }
            else if (m.PagoEm == l.Data && !m.PagoPeloBanco)
            {
                // A baixa foi feita pela conciliação: estorna (Pix do ELROND fica baixado: só desvincula a linha).
                m.PagoEm = string.Empty;
                m.ValorPago = 0;
                // A aprovação também veio da conciliação: volta para pendente.
                if (AprovadoSoPelaConciliacao(m))
                {
                    m.Aprovacao = "pendente";
                    m.Aprovacoes = new();
                }
                await _movimentos.UpdateAsync(m.Id, m);
            }
        }
        var antes = l.Situacao;
        l.Situacao = "pendente";
        l.MovimentoId = string.Empty;
        l.MovimentoIds = new();
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
