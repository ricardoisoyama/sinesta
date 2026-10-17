using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Tests;

/// <summary>A fatura como fotografia do contrato: o que se espera, como recalcula e quando trava.</summary>
public class FaturamentoContratoTests
{
    private static readonly DateOnly Hoje = new(2026, 10, 16);
    private const string Agora = "2026-10-16T12:00:00Z";

    /// <summary>Terceirização: 2 postos de R$ 7.250, adicional de 20% (opcional ligado) e implantação única.</summary>
    private static Contrato Terceirizacao() => new()
    {
        Id = "c1",
        EmpresaId = "emp",
        Modalidade = Modalidade.Recorrente,
        Situacao = "vigente",
        Inicio = "2026-09-01",
        Fim = "2027-08-31",
        Condicoes = new CondicoesContrato { FaturarDesde = "2026-10", DiaFaturamento = 1, DiaVencimento = 10, Referencia = "mes-anterior" },
        Escopo = [new VersaoEscopo { Versao = 1, VigenteDesde = "2026-09-01", Itens = [new ItemEscopo { Id = "i1", Apelido = "posto", Descricao = "Porteiro 12x36", Quantidade = 2, ValorUnitario = 7250 }] }],
        Componentes =
        [
            new ComponenteContrato { Id = "k1", Apelido = "adicional", Nome = "Adicional noturno", Regra = RegraComponente.Formula, Formula = "posto * 20%" },
            new ComponenteContrato { Id = "k2", Apelido = "implantacao", Nome = "Implantação", Regra = RegraComponente.Unico, Quantidade = 1, ValorUnitario = 1000 },
            new ComponenteContrato { Id = "k3", Apelido = "hora_extra", Nome = "Hora extra", Regra = RegraComponente.Lancamento, ValorUnitario = 38, Unidade = "hora" },
        ],
    };

    private static List<Fatura> Sincronizar(Contrato c, List<Fatura> gravadas, DateOnly? hoje = null)
    {
        var mudaram = FaturamentoContrato.Sincronizar(c, gravadas, hoje ?? Hoje, Agora);
        return gravadas.Union(mudaram).ToList();
    }

    [Fact]
    public void Mensalidade_cobra_o_mes_anterior_a_partir_do_faturar_desde()
    {
        var f = Sincronizar(Terceirizacao(), []);

        Assert.Equal(new[] { "2026-10", "2026-11" }, f.Select(x => x.Competencia));
        var outubro = f[0];
        Assert.Equal("set/2026", outubro.Referencia);
        Assert.Equal(SituacaoFatura.AConferir, outubro.Situacao); // dia 1 já passou
        Assert.Equal(SituacaoFatura.Prevista, f[1].Situacao);
        // 14.500 + 20% (2.900) + implantação (só na fatura do primeiro mês de serviço)
        Assert.Equal(18400m, outubro.Total);
        Assert.Equal(17400m, f[1].Total);
        Assert.Equal("2026-10-09", outubro.Vencimento); // dia 10 é sábado: antecipa para sexta
    }

    [Fact]
    public void Extra_entra_na_fatura_do_mes_do_servico_e_recalcula_a_aberta()
    {
        var c = Terceirizacao();
        var gravadas = Sincronizar(c, []);
        c.Extras.Add(new ExtraContrato { Id = "x1", Data = "2026-10-05", Quantidade = 6, ValorUnitario = 38, Descricao = "Cobertura" });

        var mudaram = FaturamentoContrato.Sincronizar(c, gravadas, Hoje, Agora);

        var novembro = Assert.Single(mudaram); // outubro cobra setembro: o extra de outubro vai para novembro
        Assert.Equal("2026-11", novembro.Competencia);
        Assert.Equal(17628m, novembro.Total);
        Assert.Contains(novembro.Versoes, v => v.Texto.Contains("Recalculada"));
    }

    [Fact]
    public void Emitida_nao_recalcula_e_fica_em_atraso_depois_do_vencimento()
    {
        var c = Terceirizacao();
        var f = Sincronizar(c, []);
        f[0].Situacao = SituacaoFatura.NfEmitida;
        c.Escopo[0].Itens[0].Quantidade = 3; // mudou o contrato

        Assert.DoesNotContain(f[0], FaturamentoContrato.Sincronizar(c, f, new DateOnly(2026, 10, 5), Agora));
        Assert.Equal(18400m, f[0].Total);

        var depois = FaturamentoContrato.Sincronizar(c, f, new DateOnly(2026, 10, 20), Agora);
        Assert.Equal(SituacaoFatura.Atrasada, depois.Single(x => x.Competencia == "2026-10").Situacao);
    }

    [Fact]
    public void Conferida_que_muda_de_valor_volta_para_a_conferencia()
    {
        var c = Terceirizacao();
        var f = Sincronizar(c, []);
        f[0].Situacao = SituacaoFatura.Conferida;
        c.Componentes[0].Ativo = false; // desligou o adicional

        FaturamentoContrato.Sincronizar(c, f, Hoje, Agora);

        Assert.Equal(SituacaoFatura.AConferir, f[0].Situacao);
        Assert.Equal(15500m, f[0].Total);
    }

    [Fact]
    public void Fatura_que_saiu_do_contrato_vira_cancelada_e_nao_some()
    {
        var c = Terceirizacao();
        var f = Sincronizar(c, []);
        c.Fim = "2026-09-30"; // encerrou em setembro: novembro (serviço de outubro) não existe mais

        FaturamentoContrato.Sincronizar(c, f, Hoje, Agora);

        Assert.Equal(SituacaoFatura.Cancelada, f.Single(x => x.Competencia == "2026-11").Situacao);
        Assert.Equal(SituacaoFatura.AConferir, f.Single(x => x.Competencia == "2026-10").Situacao);
    }

    [Fact]
    public void Fretes_fecham_por_quinzena_e_somam_os_ctes()
    {
        var c = new Contrato
        {
            Id = "c2",
            Modalidade = Modalidade.Recorrente,
            Situacao = "vigente",
            Inicio = "2026-01-01",
            Fim = "2027-01-01",
            Condicoes = new CondicoesContrato { FaturarDesde = "2026-10", Fechamento = "quinzenal", Agrupamento = "periodo", PrazoPagamentoDias = 15 },
            Componentes = [new ComponenteContrato { Id = "d", Apelido = "fretes", Regra = RegraComponente.Documento, Documento = "CT-e" }],
            Documentos =
            [
                new DocumentoVinculado { Id = "a", Numero = "23", Data = "2026-10-03", Valor = 2600, Descricao = "Santos → SP" },
                new DocumentoVinculado { Id = "b", Numero = "24", Data = "2026-10-10", Valor = 2600, Descricao = "Santos → SP" },
                new DocumentoVinculado { Id = "c", Numero = "25", Data = "2026-10-15", Valor = 2600, Situacao = "cancelado" },
                new DocumentoVinculado { Id = "d", Numero = "26", Data = "2026-10-16", Valor = 1610, Descricao = "Cubatão" },
                new DocumentoVinculado { Id = "e", Numero = "9", Data = "2026-09-20", Valor = 999 }, // antes do "faturar desde"
            ],
        };

        var f = Sincronizar(c, []);

        Assert.Equal(2, f.Count);
        var q1 = f.Single(x => x.Chave == "q1-2026-10");
        Assert.Equal(5200m, q1.Total);
        Assert.Equal(SituacaoFatura.AConferir, q1.Situacao); // a quinzena já fechou
        Assert.Equal("1ª quinzena out/2026", q1.Referencia);
        Assert.Equal(SituacaoFatura.Prevista, f.Single(x => x.Chave == "q2-2026-10").Situacao);
    }

    [Fact]
    public void Spot_tem_uma_fatura_e_extra_separado_ganha_a_sua()
    {
        var c = new Contrato
        {
            Id = "c3",
            Modalidade = Modalidade.Spot,
            Inicio = "2026-10-14",
            Fim = "2026-10-14",
            Condicoes = new CondicoesContrato { PrazoPagamentoDias = 15 },
            Escopo = [new VersaoEscopo { Versao = 1, VigenteDesde = "2026-10-14", Itens = [new ItemEscopo { Descricao = "Frete Cubatão → Sorocaba", Quantidade = 1, ValorUnitario = 3200 }] }],
            Extras = [new ExtraContrato { Id = "x9", Data = "2026-10-15", Quantidade = 1, ValorUnitario = 450, Descricao = "Diária parada", Cobranca = CobrancaExtra.Separado }],
        };

        var f = Sincronizar(c, []);

        Assert.Equal(2, f.Count);
        var spot = f.Single(x => !x.Avulsa);
        Assert.Equal(3200m, spot.Total);
        Assert.Equal("2026-10-29", spot.Vencimento);
        Assert.Equal(450m, f.Single(x => x.Avulsa).Total);
    }

    [Fact]
    public void Formula_com_apelido_desconhecido_aparece_como_erro_na_previa()
    {
        var p = FaturamentoContrato.Calcular(
            [new ItemEscopo { Apelido = "posto", Quantidade = 1, ValorUnitario = 100 }],
            [new ComponenteContrato { Apelido = "taxa", Nome = "Taxa", Regra = RegraComponente.Formula, Formula = "vigia * 10%" }],
            [], primeiraFatura: false);

        Assert.Contains("vigia", p.Linhas.Single(l => l.Apelido == "taxa").Erro);
        Assert.Equal(100m, p.Total);
    }
}
