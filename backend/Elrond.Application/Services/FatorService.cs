using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Pricing;

namespace Elrond.Application.Services;

/// <summary>
/// Motor do fator (markup) de uma empresa, a mesma conta da planilha "Matriz de Preço":
///   DF%    = custos fixos recorrentes ÷ base da meta (média mensal do ano ou meta do mês corrente)
///   Markup = DF% + impostos + comissão + despesa financeira + outras despesas + lucro
/// Os impostos são os do serviço do item (base × alíquota, só os que afetam o preço); sem serviço
/// com impostos, o total da empresa.
///   Fator  = 1 ÷ (1 − Markup)
/// Com a base "mês", o preço muda mês a mês, como na planilha (linha do mês, G58:G69).
/// Usado pela tela da empresa (ao vivo, com o rascunho do formulário) e pelo Pricing.
/// </summary>
public class FatorService : IFatorService
{
    private readonly ICrudRepository<Empresa> _empresas;
    private readonly ICrudRepository<CustoFixo> _custos;
    private readonly ICrudRepository<Meta> _metas;
    private readonly ICrudRepository<RegraAprovacao> _regras;
    private readonly ICrudRepository<Servico> _servicos;

    public FatorService(ICrudRepository<Empresa> empresas, ICrudRepository<CustoFixo> custos,
        ICrudRepository<Meta> metas, ICrudRepository<RegraAprovacao> regras, ICrudRepository<Servico> servicos)
    {
        _empresas = empresas;
        _custos = custos;
        _metas = metas;
        _regras = regras;
        _servicos = servicos;
    }

    public async Task<Result<FatorResultado>> CalcularAsync(CalcularFatorRequest req)
    {
        var empresa = req.Empresa;
        if (empresa is null)
        {
            if (string.IsNullOrWhiteSpace(req.EmpresaId)) return Result.Failure<FatorResultado>("Informe a empresa.");
            empresa = await _empresas.GetByIdAsync(req.EmpresaId);
            if (empresa is null) return Result.Failure<FatorResultado>("Empresa não encontrada.");
        }
        // O rascunho da tela pode não ter id ainda (empresa nova): DF e meta vêm do id informado.
        var id = string.IsNullOrWhiteSpace(empresa.Id) ? req.EmpresaId ?? string.Empty : empresa.Id;
        // Todas as ativas: uma despesa paga por outra empresa pode ter parte rateada para esta.
        var custos = id.Length == 0 ? new List<CustoFixo>() : await _custos.ListarAsync(c => c.Status == "ativo");
        var metas = id.Length == 0 ? new List<Meta>() : await _metas.ListarAsync(m => m.EmpresaId == id);

        // Comissão: a informada na precificação; senão a do vendedor (regra de comissão); senão a da empresa.
        var padrao = empresa.Dv.Comissoes;
        if (!string.IsNullOrWhiteSpace(req.VendedorId))
        {
            var regra = (await _regras.ListarAsync(r => r.Tipo == "comissao" && r.VendedorId == req.VendedorId && r.Status == "ativo"))
                .FirstOrDefault();
            if (regra is not null) padrao = regra.ComissaoPercentual;
        }

        var servico = string.IsNullOrWhiteSpace(req.ServicoId) ? null : await _servicos.GetByIdAsync(req.ServicoId);
        // Sem serviço (painéis da empresa: markup, dashboard, break-even): a média dos impostos dos serviços.
        var servicos = servico is null && !req.Precificar ? await _servicos.ListarAsync(s => s.Status == "ativo") : [];
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        return Result.Success(Calcular(empresa, id, custos, metas, hoje, padrao, req.Comissoes, req.Lucro, servico, req.Precificar, servicos));
    }

    /// <summary>
    /// A conta em si, sem banco (testável). <paramref name="comissoes"/> e <paramref name="lucro"/>
    /// são os da operação (linha do Pricing); nulos = os padrões (vendedor/empresa).
    /// </summary>
    public static FatorResultado Calcular(Empresa empresa, string empresaId, IEnumerable<CustoFixo> custos, IEnumerable<Meta> metas,
        DateOnly hoje, decimal comissaoPadrao, decimal? comissoes = null, decimal? lucro = null, Servico? servico = null,
        bool precificar = false, IEnumerable<Servico>? servicos = null)
    {
        // DF da empresa = a parte dela em cada despesa (inteira se for só dela; o percentual se rateada).
        var naDf = custos.Where(c => c.EntraNaDf(hoje) && c.PercentualDa(empresaId) > 0).ToList();
        var totalDf = naDf.Sum(c => c.ValorPara(empresaId));

        var (meta, avisoMeta) = MetaDoAno(metas, empresaId, hoje.Year);
        var metaAnual = meta?.TotalDoAno ?? 0m;
        // A meta escolhe a base: "media" = média mensal do ano (preço estável o ano todo);
        // "mes" = meta do mês corrente, igual à planilha (G58:G69), e o preço muda a cada mês.
        var faturamentoMensal = meta?.BaseDoMes(hoje.Month) ?? 0m;
        var semMeta = faturamentoMensal <= 0;
        var dfPct = semMeta ? 0m : PricingEngine.DfPercent(totalDf, faturamentoMensal);

        // Os impostos vêm do serviço: a tabela do regime da empresa em vigor hoje. Entram no markup só os que
        // afetam o preço (o ICMS fica fora: entra por dentro, depois, pela alíquota da Tabela de ICMS da rota).
        // Para precificar, o serviço com a tabela é obrigatório; nos painéis da empresa vale a média dos serviços.
        var regimeTabela = Servico.RegimeDaTabela(empresa.Regime);
        var vigentes = servico?.ImpostosVigentes(empresa.Regime, hoje) ?? new();
        var doServico = vigentes.Count > 0 ? vigentes : null;
        var detalhe = doServico?
            .Where(i => i.Imposto != ImpostoServico.Icms)
            .Select(i => new ImpostoCalculadoDto(i.Imposto, i.Nome, i.Base, i.Aliquota, Math.Round(i.Efetiva, 6), i.AfetaPreco))
            .ToList();
        var icmsDoServico = doServico?.FirstOrDefault(i => i.Imposto == ImpostoServico.Icms);
        string origem, notaImpostos;
        string? avisoImpostos = null;
        decimal impostos;
        if (detalhe is not null)
        {
            origem = "servico";
            impostos = detalhe.Where(i => i.AfetaPreco).Sum(i => i.Efetiva);
            notaImpostos = $"{regimeTabela}{(doServico![0].VigenteDesde.Length > 0 ? $", em vigor desde {DataBr(doServico[0].VigenteDesde)}" : string.Empty)}";
        }
        else if (servico is not null || precificar)
        {
            origem = "faltando";
            impostos = 0m;
            notaImpostos = servico is null ? "escolha o serviço" : $"o serviço {servico.Nome} não tem impostos do {regimeTabela} em vigor";
            avisoImpostos = servico is null
                ? "Escolha o serviço do item: os impostos vêm do cadastro do serviço."
                : $"O serviço \"{servico.Nome}\" não tem impostos do {regimeTabela} em vigor: cadastre em Cadastros › Serviços.";
        }
        else
        {
            // Média simples das tabelas em vigor dos serviços ativos (o que entra no preço, sem o ICMS).
            var tabelas = (servicos ?? []).Select(s => s.ImpostosVigentes(empresa.Regime, hoje)).Where(l => l.Count > 0).ToList();
            origem = "media";
            impostos = tabelas.Count == 0 ? 0m
                : Math.Round(tabelas.Average(l => l.Where(i => i.AfetaPreco && i.Imposto != ImpostoServico.Icms).Sum(i => i.Efetiva)), 6);
            notaImpostos = tabelas.Count == 0
                ? $"nenhum serviço tem impostos do {regimeTabela}"
                : $"média dos {tabelas.Count} serviço(s) com impostos do {regimeTabela}";
        }
        var destacados = detalhe?.Where(i => !i.AfetaPreco).Sum(i => i.Efetiva) ?? 0m;
        var comissao = Math.Max(0m, comissoes ?? comissaoPadrao);
        var despFin = empresa.Dv.DespFinanceira;
        var outras = empresa.Dv.OutrasTotal;
        var lucroPadrao = empresa.Dv.Lucro;
        // Lucro da linha: pode subir ou descer; abaixo do da empresa a proposta vai para aprovação.
        var lucroUsado = Math.Max(0m, lucro ?? lucroPadrao);
        var dvSemLucro = impostos + comissao + despFin + outras;
        var markup = PricingEngine.Markup(dfPct, dvSemLucro + lucroUsado);
        var viavel = markup < 1m;
        var fator = semMeta || !viavel ? 0m : PricingEngine.Fator(markup);

        var aviso = semMeta
            ? avisoMeta ?? (meta is null
                ? $"Cadastre a meta de faturamento de {hoje.Year} desta empresa em Comercial › Metas: ela compõe o fator."
                : $"A meta \"{meta.Nome}\" está sem valor em {NomeDoMes(hoje.Month)} de {hoje.Year}. Preencha o mês em Comercial › Metas: ele compõe o fator.")
            : !viavel ? "Despesas, impostos e lucro somam 100% ou mais da receita: não há preço que cubra. Revise os percentuais."
            : avisoImpostos;

        return new FatorResultado(
            EmpresaId: empresaId,
            Ano: hoje.Year,
            TotalDf: totalDf,
            CustosNaDf: naDf.Count,
            MetaId: meta?.Id ?? string.Empty,
            MetaNome: meta?.Nome ?? string.Empty,
            MetaAnual: metaAnual,
            FaturamentoMensal: faturamentoMensal,
            BasePreco: meta?.BasePreco ?? Meta.BaseMes,
            DfPct: dfPct,
            Impostos: impostos,
            ImpostosDoCadastro: false,
            Comissoes: comissao,
            ComissoesPadrao: comissaoPadrao,
            DespFinanceira: despFin,
            Outras: outras,
            DvSemLucro: dvSemLucro,
            Lucro: lucroUsado,
            LucroPadrao: lucroPadrao,
            Mes: hoje.Month,
            Markup: markup,
            Fator: fator,
            Pronto: !semMeta && viavel && avisoImpostos is null,
            Aviso: aviso,
            ImpostosOrigem: origem,
            ServicoNome: servico?.Nome ?? string.Empty,
            ImpostosDetalhe: detalhe,
            ImpostosDestacados: destacados,
            Icms: doServico is null ? null : new IcmsServicoDto(icmsDoServico is not null, 0m, icmsDoServico?.AfetaPreco ?? false),
            ImpostosNota: notaImpostos);
    }

    private static string DataBr(string iso) =>
        DateOnly.TryParseExact(iso, "yyyy-MM-dd", out var d) ? d.ToString("dd/MM/yyyy") : iso;

    private static readonly string[] Meses =
        { "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro" };

    private static string NomeDoMes(int mes) => Meses[mes - 1];

    /// <summary>
    /// Meta que compõe o markup: a única ativa da empresa no ano, ou a marcada como principal.
    /// Devolve o motivo quando não dá para escolher.
    /// </summary>
    public static (Meta? Meta, string? Aviso) MetaDoAno(IEnumerable<Meta> metas, string empresaId, int ano)
    {
        var doAno = metas.Where(m => m.EmpresaId == empresaId && m.Status != "inativo" && (m.Ano == ano || m.Ano == 0)).ToList();
        if (doAno.Count == 1) return (doAno[0], null);
        if (doAno.Count == 0) return (null, null);
        var principais = doAno.Where(m => m.Principal).ToList();
        return principais.Count == 1
            ? (principais[0], null)
            : (null, $"Há {doAno.Count} metas ativas de {ano} para esta empresa. Em Comercial › Metas, marque qual compõe o fator.");
    }
}
