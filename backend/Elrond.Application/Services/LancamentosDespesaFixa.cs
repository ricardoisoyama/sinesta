using System.Globalization;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>
/// O que aconteceu com os lançamentos da despesa (a tela mostra). Motivo: por que não gerou. JaLancados: meses
/// que não foram criados porque já havia lançamento equivalente feito à mão ("10/2026: nº 20 · André · R$ 2.000,00").
/// </summary>
public sealed record ResumoLancamentosDf(int Criados, int Atualizados, int Cancelados, int EmAberto, string Motivo, List<string>? JaLancados = null);

/// <summary>
/// Despesa fixa recorrente → lançamentos a pagar mensais nas Entradas e Saídas. Só gera com término de
/// verdade (sem término não há até quando lançar), dia de pagamento e conta que paga. Um lançamento por
/// mês, do mês atual (ou do início, se for depois) até o término, todos no mesmo grupo: aprovar um aprova
/// a recorrência inteira, pela regra que cobre o total. Alterar a despesa só mexe nos lançamentos em
/// aberto daqui para frente quando a pessoa pede (os pagos nunca); inativar ou encurtar o término cancela
/// os em aberto que sobraram.
/// </summary>
public sealed class LancamentosDespesaFixa(
    ICrudRepository<Movimento> movimentos,
    ICrudRepository<Fornecedor> fornecedores,
    IUsuarioRepository usuarios,
    IFinanceiroService financeiro,
    TimeProvider relogio)
{
    private static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private const string PrefixoFuncionario = "func-";
    private DateOnly Hoje => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(relogio.GetUtcNow(), Brasilia).DateTime);

    /// <summary>Por que esta despesa não gera lançamentos (null = gera).</summary>
    public static string? PorQueNaoGera(CustoFixo df)
    {
        if (df.Tipo != "recorrente") return "Despesa spot (única) não gera lançamentos mensais.";
        if (!df.TemTermino) return "Sem data de término: os lançamentos a pagar NÃO são criados automaticamente. Informe o término para criar.";
        if (df.DiaVencimento is < 1 or > 31) return "Informe o dia de pagamento para criar os lançamentos.";
        if (df.CarteiraId.Length == 0) return "Informe a conta que paga para criar os lançamentos.";
        if (df.ValorMensal <= 0) return "Informe o valor mensal para criar os lançamentos.";
        return null;
    }

    /// <summary>Os meses (vencimentos) que a despesa deve ter: do mês atual (ou do início) até o término.</summary>
    public static List<DateOnly> Vencimentos(CustoFixo df, DateOnly hoje)
    {
        if (PorQueNaoGera(df) is not null || !DateOnly.TryParse(df.DataFim, CultureInfo.InvariantCulture, out var fim)) return [];
        var inicio = DateOnly.TryParse(df.DataInicio, CultureInfo.InvariantCulture, out var i) ? i : hoje;
        var primeiro = Math.Max(inicio.Year * 12 + inicio.Month - 1, hoje.Year * 12 + hoje.Month - 1);
        var lista = new List<DateOnly>();
        for (var m = primeiro; m <= fim.Year * 12 + fim.Month - 1; m++)
        {
            var ano = m / 12;
            var numero = m % 12 + 1;
            var dia = Math.Min(df.DiaVencimento, DateTime.DaysInMonth(ano, numero));
            var venc = new DateOnly(ano, numero, dia);
            // No mês do início e no do término, só se o dia cai dentro da vigência.
            if (venc < inicio || venc > fim) continue;
            lista.Add(venc);
        }
        return lista;
    }

    /// <summary>Quantos lançamentos em aberto a despesa tem hoje (a tela pergunta se atualiza).</summary>
    public async Task<int> EmAbertoAsync(string dfId) =>
        (await movimentos.ListarAsync(m => m.Origem == CustoFixo.OrigemLancamentos && m.OrigemId == dfId)).Count(m => !m.Cancelado && m.PagoEm.Length == 0);

    /// <summary>
    /// Alinha os lançamentos com a despesa: cria os meses que faltam; com <paramref name="atualizarAbertos"/>,
    /// atualiza os em aberto (valor, dia, conta, plano, centro, fornecedor); despesa inativa, que deixou de
    /// gerar ou com término mais curto cancela os em aberto que não cabem mais.
    /// </summary>
    public async Task<Result<ResumoLancamentosDf>> SincronizarAsync(CustoFixo df, bool atualizarAbertos, UsuarioAtual quem)
    {
        var hoje = Hoje;
        var existentes = (await movimentos.ListarAsync(m => m.Origem == CustoFixo.OrigemLancamentos && m.OrigemId == df.Id)).Where(m => !m.Cancelado).ToList();
        var abertos = existentes.Where(m => m.PagoEm.Length == 0).ToList();
        var motivo = df.Status != "ativo" ? "inativa" : PorQueNaoGera(df);

        // Em aberto que não cabe mais (inativou, encurtou o término, deixou de gerar): cancela os que ainda
        // não venceram. Inativar cancela sempre; nos outros casos, só se a pessoa pediu para atualizar.
        // O vencido em aberto fica: é conta de verdade, que alguém precisa resolver.
        var meses = df.Status == "ativo" ? Vencimentos(df, hoje) : [];
        var competencias = meses.Select(v => v.ToString("yyyy-MM", CultureInfo.InvariantCulture)).ToHashSet();
        var hojeIso = hoje.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var sobrando = abertos.Where(m => string.CompareOrdinal(m.Vencimento, hojeIso) >= 0 && !competencias.Contains(m.Competencia)
            && (df.Status != "ativo" || atualizarAbertos)).ToList();
        var cancelados = 0;
        if (sobrando.Count > 0)
        {
            var r = await financeiro.CancelarAsync(new IdsDto(sobrando.Select(m => m.Id).ToList()), quem);
            if (r.IsSuccess) cancelados = r.Value;
        }
        if (motivo == "inativa")
            motivo = cancelados > 0 ? $"Despesa inativa: {cancelados} lançamento(s) em aberto que ainda não venceram foram cancelados." : "Despesa inativa: não gera lançamentos.";
        if (motivo is not null)
            return Result.Success(new ResumoLancamentosDf(0, 0, cancelados, abertos.Count - cancelados, motivo));

        var (parceiroId, parceiroNome, fantasia, forma) = await ParceiroAsync(df);
        Movimento Modelo(DateOnly venc) => new()
        {
            Tipo = "pagar",
            EmpresaId = df.UnidadeId,
            ParceiroId = parceiroId,
            ParceiroNome = parceiroNome,
            Descricao = $"{df.Descricao} · {venc:MM/yyyy}",
            PlanoContaId = df.PlanoContaId ?? string.Empty,
            CentroCustoId = df.CategoriaId,
            Documento = df.Numero > 0 ? $"Despesa fixa {df.Numero}" : "Despesa fixa",
            Competencia = venc.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            Vencimento = venc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Valor = df.ValorMensal,
            CarteiraId = df.CarteiraId,
            FormaPagamento = forma,
            GrupoId = $"df:{df.Id}",
            Origem = CustoFixo.OrigemLancamentos,
            OrigemId = df.Id,
        };

        // Meses que faltam: o pago ou em aberto do mês já conta, e o cancelado que já venceu também (alguém
        // decidiu que aquele mês não vale, ex. duplicado de um lançamento manual): não volta sozinho. O cancelado
        // que ainda vai vencer (encurtou o término, inativou) volta se a despesa voltar a cobrir o mês.
        var jaTem = existentes.Select(m => m.Competencia)
            .Concat((await movimentos.ListarAsync(m => m.Origem == CustoFixo.OrigemLancamentos && m.OrigemId == df.Id && m.Cancelado))
                .Where(m => string.CompareOrdinal(m.Vencimento, hojeIso) < 0).Select(m => m.Competencia))
            .ToHashSet();
        // Lançados à mão antes da despesa existir (ou fora dela): o mesmo pagamento não entra duas vezes.
        var manuais = (await movimentos.ListarAsync(m => m.Tipo == "pagar" && !m.Cancelado && m.Origem != CustoFixo.OrigemLancamentos)).ToList();
        var jaLancados = new List<string>();
        var criados = 0;
        foreach (var venc in meses.Where(v => !jaTem.Contains(v.ToString("yyyy-MM", CultureInfo.InvariantCulture))))
        {
            if (Equivalente(manuais, df, parceiroId, [parceiroNome, fantasia], venc) is { } igual)
            {
                jaLancados.Add($"{venc:MM/yyyy}: nº {igual.Numero} · {igual.ParceiroNome} · {igual.Valor.ToString("C", new CultureInfo("pt-BR"))} (venc. {Dia(igual.Vencimento)})");
                continue;
            }
            var r = await financeiro.CriarAsync(new NovoMovimentoDto(Modelo(venc)), quem);
            if (!r.IsSuccess) return Result.Failure<ResumoLancamentosDf>($"Não foi possível criar o lançamento de {venc:MM/yyyy}: {r.Error}");
            criados++;
        }

        var atualizados = 0;
        if (atualizarAbertos)
            foreach (var m in abertos.Where(m => competencias.Contains(m.Competencia) && string.CompareOrdinal(m.Vencimento, hojeIso) >= 0))
            {
                var venc = meses.First(v => v.ToString("yyyy-MM", CultureInfo.InvariantCulture) == m.Competencia);
                var novo = Modelo(venc);
                novo.Observacao = m.Observacao;
                // A parte variável que o financeiro incluiu fica: muda só a parte fixa.
                novo.ItensVariaveis = m.ItensVariaveis;
                novo.Valor = df.ValorMensal + m.ValorVariavel;
                var mudou = m.Valor != novo.Valor || m.Vencimento != novo.Vencimento || m.CarteiraId != novo.CarteiraId || m.PlanoContaId != novo.PlanoContaId
                    || m.CentroCustoId != novo.CentroCustoId || m.ParceiroNome != novo.ParceiroNome || m.Descricao != novo.Descricao;
                if (!mudou) continue;
                if ((await financeiro.AtualizarAsync(m.Id, novo)).IsSuccess) atualizados++;
            }

        var emAberto = await EmAbertoAsync(df.Id);
        return Result.Success(new ResumoLancamentosDf(criados, atualizados, cancelados, emAberto, string.Empty, jaLancados));
    }

    /// <summary>
    /// Lançamento manual que já é o pagamento deste mês da despesa: mesmo fornecedor/funcionário (pelo cadastro
    /// ou pelo nome, razão social ou fantasia), mesmo plano de contas quando os dois têm, valor até 2% de
    /// diferença e vencimento a até 10 dias. A empresa não precisa bater (o pagamento pode sair pela outra conta).
    /// </summary>
    public static Movimento? Equivalente(IEnumerable<Movimento> manuais, CustoFixo df, string parceiroId, IEnumerable<string> nomes, DateOnly venc)
    {
        var chaves = nomes.Select(PrimeiraPalavra).Where(p => p.Length > 0).ToHashSet();
        return manuais
            .Where(m => (parceiroId.Length > 0 && m.ParceiroId == parceiroId) || chaves.Contains(PrimeiraPalavra(m.ParceiroNome)))
            .Where(m => string.IsNullOrEmpty(df.PlanoContaId) || string.IsNullOrEmpty(m.PlanoContaId) || m.PlanoContaId == df.PlanoContaId)
            .Where(m => df.ValorMensal > 0 && Math.Abs(m.Valor - df.ValorMensal) <= df.ValorMensal * 0.02m)
            .Select(m => (m, dias: DateOnly.TryParse(m.Vencimento.Length >= 10 ? m.Vencimento[..10] : m.Vencimento, CultureInfo.InvariantCulture, out var d) ? Math.Abs(d.DayNumber - venc.DayNumber) : int.MaxValue))
            .Where(x => x.dias <= 10)
            .OrderBy(x => x.dias)
            .Select(x => x.m)
            .FirstOrDefault();
    }

    /// <summary>Primeira palavra "forte" do nome, sem acento e em caixa alta ("Fretebras" = "FRETEBRAS INTERNET LTDA").</summary>
    private static string PrimeiraPalavra(string? nome)
    {
        var limpo = new string((nome ?? string.Empty).Normalize(System.Text.NormalizationForm.FormD)
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray()).ToUpperInvariant();
        return limpo.Split((char[])[' ', '-', '.', ',', '&', '/'], StringSplitOptions.RemoveEmptyEntries).FirstOrDefault(p => p.Length >= 3) ?? string.Empty;
    }

    private static string Dia(string iso) => iso.Length >= 10 ? $"{iso[8..10]}/{iso[5..7]}" : iso;

    /// <summary>Quem recebe: o fornecedor ou o funcionário ("func-{id}") da despesa; sem nenhum, a própria despesa.</summary>
    private async Task<(string Id, string Nome, string Fantasia, string Forma)> ParceiroAsync(CustoFixo df)
    {
        if (df.FornecedorId.StartsWith(PrefixoFuncionario, StringComparison.Ordinal)
            && await usuarios.GetByIdAsync(df.FornecedorId[PrefixoFuncionario.Length..]) is { } u)
            return (df.FornecedorId, u.Name, string.Empty, "Pix");
        if (df.FornecedorId.Length > 0 && await fornecedores.GetByIdAsync(df.FornecedorId) is { } f)
            return (f.Id, f.Nome, f.NomeFantasia ?? string.Empty, string.Empty);
        return (string.Empty, df.Descricao, string.Empty, string.Empty);
    }
}
