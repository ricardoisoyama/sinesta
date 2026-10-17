using System.Globalization;
using Elrond.Domain.Entities;

namespace Elrond.Domain.Regras;

/// <summary>
/// Faturamento do contrato (funções puras). A fatura é uma FOTOGRAFIA CALCULADA do contrato:
/// - recorrente com mensalidade: uma por mês (do "faturar desde" até o mês que vem);
/// - com documentos vinculados (fretes): uma por período de fechamento ou uma por documento;
/// - spot: uma só; extra "faturar separado": uma própria.
/// Enquanto não emitida, ela se recalcula do contrato; emitida a NF, trava.
/// </summary>
public static class FaturamentoContrato
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    private static readonly string[] Meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    public sealed record Previa(List<LinhaComposicao> Linhas, decimal Total);

    /// <summary>
    /// O que o contrato espera faturar (sem os extras: esses entram na sincronização).
    /// <paramref name="FechaEm"/> = último dia do período cobrado (extras até essa data entram nela);
    /// <paramref name="LiberaEm"/> = quando a fatura deixa de ser "prevista" e vai para conferência.
    /// </summary>
    public sealed record Esperada(
        string Chave, string Competencia, string Referencia, string Vencimento, string Descricao, bool Avulsa,
        decimal Previsto, List<LinhaComposicao> Composicao, List<DocumentoVinculado> Documentos, string FechaEm, string LiberaEm);

    private static decimal R2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static string Brl(decimal v) => v.ToString("C", PtBr);
    private static string Iso(DateOnly d) => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static DateOnly Data(string iso) => DateOnly.ParseExact(iso[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static DateOnly MesDe(string comp) => DateOnly.ParseExact(comp[..7] + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static string Comp(DateOnly d) => d.ToString("yyyy-MM", CultureInfo.InvariantCulture);
    private static DateOnly FimDoMes(DateOnly d) => new(d.Year, d.Month, DateTime.DaysInMonth(d.Year, d.Month));
    public static string MesAno(string comp) => $"{Meses[MesDe(comp).Month - 1]}/{comp[..4]}";

    /// <summary>
    /// Prévia de um período: os fixos do escopo (somados por apelido), as fórmulas (sobre os fixos,
    /// as características numéricas e "subtotal") e a cobrança única. Lançamento e documento entram
    /// "conforme lançado" (valor nulo).
    /// </summary>
    public static Previa Calcular(IEnumerable<ItemEscopo> itens, IEnumerable<ComponenteContrato> componentes, IEnumerable<CaracteristicaContrato> caracteristicas, bool primeiraFatura)
    {
        var vars = new Dictionary<string, decimal>();
        foreach (var c in caracteristicas)
            if (decimal.TryParse(c.Valor, NumberStyles.Number, CultureInfo.InvariantCulture, out var n)) vars[c.Apelido] = n;

        var linhas = new List<LinhaComposicao>();
        foreach (var i in itens.Where(x => !x.Tabela))
        {
            var t = R2(i.Quantidade * i.ValorUnitario);
            if (i.Apelido.Length > 0) vars[i.Apelido] = vars.GetValueOrDefault(i.Apelido) + t;
            linhas.Add(new LinhaComposicao { Apelido = i.Apelido, Nome = i.Descricao.Length > 0 ? i.Descricao : i.Servico, Regra = RegraComponente.Fixo, Valor = t, Detalhe = $"{i.Quantidade.ToString("0.##", PtBr)} × {Brl(i.ValorUnitario)}" });
        }
        vars["subtotal"] = linhas.Sum(l => l.Valor ?? 0);

        var ativos = componentes.Where(c => c.Ativo).ToList();
        foreach (var c in ativos.Where(x => x.Regra == RegraComponente.Formula))
        {
            var desconhecida = Formula.Referencias(c.Formula).FirstOrDefault(r => !vars.ContainsKey(r));
            var r = desconhecida is null ? Formula.Avaliar(c.Formula, vars) : new Formula.Resultado(null, $"Apelido desconhecido: {desconhecida}");
            decimal? v = r.Valor is { } x ? R2(x) : null;
            if (v is { } valor) vars[c.Apelido] = valor;
            linhas.Add(new LinhaComposicao { Apelido = c.Apelido, Nome = c.Nome, Regra = RegraComponente.Formula, Valor = v, Detalhe = c.Formula, Erro = r.Erro ?? string.Empty });
        }
        foreach (var c in ativos.Where(x => x.Regra == RegraComponente.Unico))
            linhas.Add(new LinhaComposicao { Apelido = c.Apelido, Nome = c.Nome, Regra = RegraComponente.Unico, Valor = primeiraFatura ? R2(Math.Max(1, c.Quantidade) * c.ValorUnitario) : null, Detalhe = primeiraFatura ? "só na primeira fatura" : "já cobrada na primeira fatura" });
        foreach (var c in ativos.Where(x => x.Regra == RegraComponente.Lancamento))
            linhas.Add(new LinhaComposicao { Apelido = c.Apelido, Nome = c.Nome, Regra = RegraComponente.Lancamento, Detalhe = $"conforme lançado · {Brl(c.ValorUnitario)}/{(c.Unidade.Length > 0 ? c.Unidade : "un.")}" });
        foreach (var c in ativos.Where(x => x.Regra == RegraComponente.Documento))
            linhas.Add(new LinhaComposicao { Apelido = c.Apelido, Nome = c.Nome, Regra = RegraComponente.Documento, Detalhe = $"soma dos {(c.Documento.Length > 0 ? c.Documento : "documentos")} do período" });

        return new Previa(linhas, R2(linhas.Sum(l => l.Valor ?? 0)));
    }

    /// <summary>Vencimento no dia útil: fim de semana antecipa para sexta ou adia para segunda.</summary>
    private static DateOnly DiaUtil(DateOnly d, bool antecipar) => d.DayOfWeek switch
    {
        DayOfWeek.Saturday => d.AddDays(antecipar ? -1 : 2),
        DayOfWeek.Sunday => d.AddDays(antecipar ? -2 : 1),
        _ => d,
    };

    private static DateOnly DiaDoMes(DateOnly mes, int dia) => new(mes.Year, mes.Month, Math.Clamp(dia, 1, DateTime.DaysInMonth(mes.Year, mes.Month)));

    /// <summary>Todas as faturas que o contrato espera, até o mês que vem.</summary>
    public static List<Esperada> Esperadas(Contrato c, DateOnly hoje)
    {
        var k = c.Condicoes;
        var lista = new List<Esperada>();
        var desde = k.FaturarDesde.Length >= 7 ? MesDe(k.FaturarDesde) : DateOnly.MinValue;
        var prazo = Math.Max(0, k.PrazoPagamentoDias);

        if (c.Spot)
        {
            var dia = Data(c.Inicio);
            var v = c.EscopoEm(c.Inicio);
            var previa = Calcular(v?.Itens ?? [], c.Componentes, c.Caracteristicas, primeiraFatura: true);
            var docs = c.Documentos.Where(d => d.Situacao != "cancelado").ToList();
            lista.Add(new Esperada("spot", Comp(dia), $"dia {dia:dd/MM}", Iso(DiaUtil(dia.AddDays(prazo), k.AnteciparFimDeSemana)),
                v?.Itens.FirstOrDefault()?.Descricao is { Length: > 0 } d1 ? d1 : "Serviço spot", false,
                docs.Count > 0 && previa.Total == 0 ? R2(docs.Sum(d => d.Valor)) : previa.Total, previa.Linhas, docs, Iso(dia), Iso(dia)));
        }
        else if (c.PorDocumento)
        {
            var docs = c.Documentos.Where(d => d.Situacao != "cancelado" && Data(d.Data) >= desde && Data(d.Data) <= hoje).ToList();
            if (k.Agrupamento == "por-documento")
            {
                foreach (var d in docs)
                {
                    var dia = Data(d.Data);
                    lista.Add(new Esperada($"doc-{d.Id}", Comp(dia), $"{d.Tipo} {d.Numero}", Iso(DiaUtil(dia.AddDays(prazo), k.AnteciparFimDeSemana)),
                        DescricaoDocs([d]), false, R2(d.Valor), [], [d], Iso(dia), Iso(dia)));
                }
            }
            else
            {
                foreach (var (chave, de, ate, rotulo) in docs.Select(d => Periodo(Data(d.Data), k.Fechamento)).Distinct())
                {
                    var doPeriodo = docs.Where(d => Data(d.Data) >= de && Data(d.Data) <= ate).OrderBy(d => d.Data).ToList();
                    lista.Add(new Esperada(chave, Comp(de), rotulo, Iso(DiaUtil(ate.AddDays(prazo), k.AnteciparFimDeSemana)),
                        DescricaoDocs(doPeriodo), false, R2(doPeriodo.Sum(d => d.Valor)), [], doPeriodo, Iso(ate), Iso(ate.AddDays(1))));
                }
            }
        }
        else if (c.Inicio.Length >= 10)
        {
            // Mês do serviço → mês da fatura: "mês anterior" fatura no mês seguinte ao serviço.
            var defasagem = k.Referencia == "mes-anterior" ? 1 : 0;
            var primeiroServico = MesDe(c.Inicio);
            var ultimoServico = c.Fim.Length >= 10 ? MesDe(c.Fim) : primeiroServico.AddYears(50);
            var limite = new DateOnly(hoje.Year, hoje.Month, 1).AddMonths(1);
            for (var servico = primeiroServico; servico <= ultimoServico; servico = servico.AddMonths(1))
            {
                var mes = servico.AddMonths(defasagem);
                if (mes > limite) break;
                if (mes < desde) continue;
                var v = c.EscopoEm(Iso(servico < Data(c.Inicio) ? Data(c.Inicio) : servico));
                var previa = Calcular(v?.Itens ?? [], c.Componentes, c.Caracteristicas, primeiraFatura: servico == primeiroServico);
                var n = v?.Itens.Count(i => !i.Tabela) ?? 0;
                lista.Add(new Esperada($"mes-{Comp(mes)}", Comp(mes), MesAno(Comp(servico)), Iso(DiaUtil(DiaDoMes(mes, k.DiaVencimento), k.AnteciparFimDeSemana)),
                    $"Mensalidade · {n} ite{(n == 1 ? "m" : "ns")}", false, previa.Total, previa.Linhas, [],
                    Iso(FimDoMes(servico)), Iso(DiaDoMes(mes, k.DiaFaturamento))));
            }
        }

        // Extras "faturar separado": uma fatura própria cada.
        foreach (var e in c.Extras.Where(x => x.FaturadoEm.Length == 0 && x.Cobranca == CobrancaExtra.Separado && x.Data.Length >= 10))
        {
            var dia = Data(e.Data);
            lista.Add(new Esperada($"extra-{e.Id}", Comp(dia), $"extra de {dia:dd/MM}", Iso(DiaUtil(dia.AddDays(prazo), k.AnteciparFimDeSemana)),
                e.Descricao, true, e.Valor, [], [], Iso(dia), Iso(dia)));
        }
        return lista;
    }

    private static string DescricaoDocs(List<DocumentoVinculado> docs) =>
        $"{docs.Count} frete(s) · {string.Join(", ", docs.Select(d => d.Descricao.Split(" · ")[0]).Where(x => x.Length > 0).Distinct())}".TrimEnd(' ', '·');

    /// <summary>Período de fechamento que contém o dia (chave, início, fim e rótulo).</summary>
    private static (string Chave, DateOnly De, DateOnly Ate, string Rotulo) Periodo(DateOnly dia, string fechamento)
    {
        var mes = new DateOnly(dia.Year, dia.Month, 1);
        var fim = FimDoMes(mes);
        var ma = MesAno(Comp(mes));
        return fechamento switch
        {
            "quinzenal" => dia.Day <= 15
                ? ($"q1-{Comp(mes)}", mes, mes.AddDays(14), $"1ª quinzena {ma}")
                : ($"q2-{Comp(mes)}", mes.AddDays(15), fim, $"2ª quinzena {ma}"),
            "semanal" => Semana(mes, fim, dia, ma),
            _ => ($"mes-{Comp(mes)}", mes, fim, ma),
        };
    }

    private static (string, DateOnly, DateOnly, string) Semana(DateOnly mes, DateOnly fim, DateOnly dia, string ma)
    {
        var s = Math.Min(4, (dia.Day - 1) / 7 + 1);
        var de = mes.AddDays((s - 1) * 7);
        return ($"s{s}-{Comp(mes)}", de, s == 4 ? fim : de.AddDays(6), $"sem. {s} {ma}");
    }

    /// <summary>
    /// Alinha as faturas gravadas com o que o contrato espera hoje. Devolve só as que mudaram
    /// (novas ou alteradas). Emitidas não mudam (só viram "em atraso" depois do vencimento); abertas
    /// se recalculam; as que deixaram de existir no contrato viram "cancelada" (nada é apagado).
    /// Extras "na próxima fatura" entram na primeira fatura aberta cujo período os alcança.
    /// </summary>
    public static List<Fatura> Sincronizar(Contrato c, IReadOnlyList<Fatura> gravadas, DateOnly hoje, string agora)
    {
        var mudaram = new List<Fatura>();
        var porChave = gravadas.ToDictionary(f => f.Chave);
        var esperadas = Esperadas(c, hoje).OrderBy(e => e.FechaEm, StringComparer.Ordinal).ToList();
        var pendentes = c.Extras.Where(e => e.FaturadoEm.Length == 0 && e.Cobranca == CobrancaExtra.ProximaFatura).OrderBy(e => e.Data, StringComparer.Ordinal).ToList();
        var usados = new HashSet<string>();
        var iso = Iso(hoje);

        foreach (var e in esperadas)
        {
            var nova = !porChave.TryGetValue(e.Chave, out var f);
            f ??= new Fatura { Id = Guid.NewGuid().ToString(), Chave = e.Chave, ContratoId = c.Id, EmpresaId = c.EmpresaId };
            var antes = Assinatura(f);
            if (f.Travada)
            {
                if (f.Situacao is SituacaoFatura.NfEmitida or SituacaoFatura.BoletoEmitido && string.CompareOrdinal(f.Vencimento, iso) < 0)
                    f.Situacao = SituacaoFatura.Atrasada;
            }
            else
            {
                if (f.Situacao == SituacaoFatura.Cancelada) f.Situacao = SituacaoFatura.Prevista;
                f.Competencia = e.Competencia;
                f.Referencia = e.Referencia;
                f.Vencimento = e.Vencimento;
                f.Descricao = e.Descricao;
                f.Avulsa = e.Avulsa;
                f.Previsto = e.Previsto;
                f.Composicao = e.Composicao;
                f.Documentos = e.Documentos;
                f.Extras = e.Avulsa ? [] : pendentes
                    .Where(x => !usados.Contains(x.Id) && !f.ExtrasFora.Contains(x.Id) && string.CompareOrdinal(x.Data, e.FechaEm) <= 0)
                    .ToList();
                foreach (var x in f.Extras) usados.Add(x.Id);
                f.Total = R2(f.Previsto + f.Extras.Sum(x => x.Valor) - f.Descontos);
                if (f.Situacao == SituacaoFatura.Prevista && string.CompareOrdinal(iso, e.LiberaEm) >= 0) f.Situacao = SituacaoFatura.AConferir;
            }
            if (nova || Assinatura(f) != antes)
            {
                if (!nova && !f.Travada && antes.Total != f.Total)
                {
                    // Já conferida e o valor mudou: volta para a conferência (ninguém aprovou este valor).
                    var volta = f.Situacao == SituacaoFatura.Conferida;
                    if (volta) f.Situacao = SituacaoFatura.AConferir;
                    f.Versoes.Add(new VersaoFatura { Em = agora, Quem = "sistema", Texto = $"Recalculada do contrato: {Brl(antes.Total)} → {Brl(f.Total)}{(volta ? "; volta para conferência" : string.Empty)}", Total = f.Total });
                }
                mudaram.Add(f);
            }
        }

        var chaves = esperadas.Select(e => e.Chave).ToHashSet();
        foreach (var f in gravadas.Where(f => !chaves.Contains(f.Chave) && !f.Travada && f.Situacao != SituacaoFatura.Cancelada))
        {
            f.Situacao = SituacaoFatura.Cancelada;
            f.Versoes.Add(new VersaoFatura { Em = agora, Quem = "sistema", Texto = "Saiu do contrato antes de ser emitida", Total = f.Total });
            mudaram.Add(f);
        }
        return mudaram;
    }

    private sealed record Marca(string Situacao, string Referencia, string Vencimento, string Descricao, decimal Previsto, decimal Total, string Extras, string Docs, string Composicao);

    private static Marca Assinatura(Fatura f) => new(f.Situacao, f.Referencia, f.Vencimento, f.Descricao, f.Previsto, f.Total,
        string.Join(',', f.Extras.Select(x => $"{x.Id}:{x.Valor}")), string.Join(',', f.Documentos.Select(d => $"{d.Id}:{d.Valor}")),
        string.Join(',', f.Composicao.Select(l => $"{l.Apelido}:{l.Valor}:{l.Erro}")));
}
